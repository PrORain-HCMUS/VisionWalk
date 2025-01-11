import os, base64, google.generativeai as genai, asyncio, time, json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, Form
from functools import lru_cache
from io import BytesIO
from typing import Dict, Optional, List
from pydantic import BaseModel, ValidationError
from PIL import Image
from utils import GoogleCloudAPI, ImagePreprocessor, AudioPreprocessor, FirebaseLocation, FirebaseAdmin
from contextlib import asynccontextmanager
from RedisConfig import redis_config, get_redis
from redis import asyncio as aioredis

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
CREDENTIALS = r"D:\Documents\VisionWalk\VisionWalkServer\private\credentials.json"
FIREBASE_ADMIN_CREDENTIALS = r"D:\Documents\VisionWalk\VisionWalkServer\private\firebase-admin.json"

assert os.path.exists(CREDENTIALS), f"Credentials file not found at {CREDENTIALS}"
assert os.path.exists(FIREBASE_ADMIN_CREDENTIALS), f"firebase admin credentials file not found at {FIREBASE_ADMIN_CREDENTIALS}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize services
    try:
        # Initialize Redis connection
        await redis_config.init_redis_pool()
        # Start cleanup task for Firebase location
        cleanup_task = asyncio.create_task(firebase_location.cleanup_offline_users())
        print("Services initialized successfully")
        yield
    finally:
        # Shutdown: Cleanup services
        try:
            # Cancel cleanup task
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                pass
            
            # Close Redis connection
            await redis_config.close()
            print("Services shutdown completed")
        except Exception as e:
            print(f"Error during shutdown: {e}")

app = FastAPI(
    title="VisionWalk API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

googleCloudAPI = GoogleCloudAPI(CREDENTIALS)
firebase_admin = FirebaseAdmin(FIREBASE_ADMIN_CREDENTIALS)
firebase_location = FirebaseLocation()
imagePreprocessor = ImagePreprocessor()
audioPreprocessor = AudioPreprocessor()

genai.configure(api_key="AIzaSyBX9YVkHUxZCrXxq7AFALma6lZUEArtlb8")
generation_config = {
    "max_output_tokens": 150,  # Approximately 100-150 words
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 40
}
model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=generation_config
)

class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    profileImage: UploadFile


class TokenRefresh(BaseModel):
    refresh_token: str

class Location(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = 0
    heading: Optional[float] = 0
    speed: Optional[float] = 0


class UserLocation(BaseModel):
    id: str
    location: Location

class UserStatus(BaseModel):
    online: bool
    last_seen: str

class NearbyUser(BaseModel):
    id: str
    info: dict
    location: dict
    distance: float
    last_updated: str
    status: UserStatus

class NearbyUsersResponse(BaseModel):
    users: List[NearbyUser]
    total_count: int

# Dependency for current user
async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = firebase_admin.verify_token(token)
        return payload['id']
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Auth routes
@app.post("/auth/register")
async def register(
    email: str = Form(...),
    password: str = Form(...),
    displayName: str = Form(...),
    phoneNumber: str = Form(...),
    profileImage: UploadFile = File(...)
):
    try:
        # Đọc nội dung file ảnh
        profile_image_content = await profileImage.read()
        
        # Chuẩn bị user data
        user_data = {
            "displayName": displayName,
            "phoneNumber": phoneNumber
        }
        
        # Gọi hàm register_user với file ảnh
        result = await firebase_admin.register_user(
            email=email,
            password=password,
            user_data=user_data,
            profile_image_file=profile_image_content
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login")
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    return await firebase_admin.login_user(
        email=email,
        password=password
    )


@app.post("/user/refresh-token")
async def refresh_token(token_data: TokenRefresh):
    return await firebase_admin.refresh_tokens(token_data.refresh_token)


@app.get("/user/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    return firebase_admin.get_user_profile(current_user)


@app.put("/user/profile")
async def update_profile(
    update_data: UserUpdate,
    profile_image: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    update_dict = update_data.model_dump(exclude_none=True)
    
    if profile_image:
        contents = await profile_image.read()
        update_dict['profile_image_file'] = contents

    return await firebase_admin.update_user_profile(
        uid=current_user,
        update_data=update_dict
    )


@app.delete("/user/profile")
async def delete_profile(current_user: str = Depends(get_current_user)):
    return await firebase_admin.delete_user(current_user)

@app.post("/location/update-location")
async def update_location(
    location: Location,
    current_user: str = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis)
):
    """
    Chỉ cập nhật vị trí hiện tại của người dùng
    """
    try:
        cache_key = f"location_update_{current_user}"
        print(f"[DEBUG] Processing request for user: {current_user}")
        print(f"[DEBUG] Using cache key: {cache_key}")

        try:
            last_update = await asyncio.wait_for(
                redis.get(cache_key),
                timeout=2.0
            )
            print(f"[DEBUG] Redis get result: {last_update}")
        except asyncio.TimeoutError:
            print("[ERROR] Redis get operation timed out")
            raise HTTPException(
                status_code=503,
                detail="Redis operation timed out"
            )
        except aioredis.RedisError as e:
            print(f"[ERROR] Redis operation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Redis operation failed: {str(e)}"
            )
        
        if last_update:
            time_since_last = time.time() - float(last_update)
            if time_since_last < 0.3:  # Minimum 0.3 seconds between updates
                raise HTTPException(
                    status_code=429,
                    detail="Too many location updates. Please wait."
                )

        # Validate location data
        if not (-90 <= location.latitude <= 90) or not (-180 <= location.longitude <= 180):
            raise HTTPException(
                status_code=400,
                detail="Invalid coordinates"
            )
        
        print("Updating location to Firebase")

        await firebase_location.update_location(
            id=current_user,
            location=location.dict()
        )

        print("Updating redis cache key:", cache_key)
        await redis.set(cache_key, str(time.time()), ex=30)

        return {"status": "success", "message": "Location updated successfully"}
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/location/broadcast-location")
async def broadcast_location(
    location: Location,
    current_user: str = Depends(get_current_user)
):
    """
    Cập nhật vị trí và broadcast cho nearby users
    """
    try:
        await firebase_location.broadcast_location(
            uid=current_user,
            location=location.dict()
        )
        return {"status": "success", "message": "Location broadcasted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/location/nearby-users")
async def get_nearby_users(
    current_user: str = Depends(get_current_user),
):
    """
    Lấy danh sách người dùng trong bán kính 1km
    """
    try:
        nearby_users = await firebase_location.get_nearby_users(current_user)
        print("Got nearby users successfully")

        response = NearbyUsersResponse(
            users=nearby_users,
            total_count=len(nearby_users)
        )

        print("Created response successfully:", response)

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/track")
async def websocket_location_tracking(
    websocket: WebSocket,
    token: str
):
    """
    WebSocket endpoint để theo dõi vị trí realtime
    """
    user_id = None
    try:
        try:
            payload = firebase_admin.verify_token(token)
            user_id = payload['id']
        except Exception as e:
            await websocket.close(code=4001, reason="Invalid authentication")
            return

        await firebase_location.connect(websocket, user_id)
        
        try:
            while True:
                try:
                    data = await asyncio.wait_for(
                        websocket.receive_text(), 
                        timeout=30.0
                    )
                except asyncio.TimeoutError:
                    await websocket.send_text('ping')
                    continue

                if data == 'pong':
                    continue

                try:
                    location_data = json.loads(data)
                    location = Location(**location_data)
                    
                    await firebase_location.broadcast_location(
                        uid=user_id,
                        location=location.dict()
                    )
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "error": "Invalid JSON format"
                    })
                except ValidationError as ve:
                    await websocket.send_json({
                        "error": "Invalid location data",
                        "details": str(ve)
                    })
                
        except WebSocketDisconnect:
            firebase_location.disconnect(user_id)
            
        except Exception as e:
            print(f"WebSocket error for user {user_id}: {str(e)}")
            await websocket.send_json({
                "error": "Internal server error",
                "details": str(e)
            })
    except Exception as e:
        print(f"Critical WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
    finally:
        if user_id:
            firebase_location.disconnect(user_id)


@lru_cache(maxsize=100)
def generate_text_of_img(img_content: bytes) -> str:
    try:
        img_io = BytesIO(img_content)
        img = Image.open(img_io)
        
        if img.mode != 'RGB':
            img = img.convert('RGB')

        prompt = """
        Hãy mô tả môi trường xung quanh như đang hướng dẫn một người khiếm thị, tập trung vào:
        1. Các chướng ngại vật
        2. Biển báo và biển chỉ dẫn
        3. Các vật có thể gây nguy hiểm
        4. Điều kiện mặt đường
        Hãy giới hạn trong 150 chữ và nói những thông tin quan trọng ảnh hưởng đến người mù.
        """
        response = model.generate_content([img, prompt])
        return response.text
    except Exception as e:
        print(f"Image analysis error: {str(e)}")
        return " Không thể phân tích hình ảnh này"

@app.get("startup")
async def startup_event():
    asyncio.create_task(firebase_location.cleanup_offline_users())

@lru_cache(maxsize=100)
def generate_text_of_text(text: str) -> str:
    try:
        prompt = f"""
        Hãy tóm tắt nội dung câu trả lời:
        {text}
        
        Yêu cầu:
        - Tổng hợp trong 60-80 từ
        - Chỉ lấy những thông tin quan trọng và cốt lõi nhất
        - Phải đảm bảo câu cuối được trọn vẹn, không bị cắt ngang
        - Nếu không đủ chỗ để nêu hết, hãy chọn lọc thông tin quan trọng nhất
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Text analysis error: {str(e)}")
        return "Không thể trả lời câu hỏi này"


@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)) -> JSONResponse:
    try:
        start_time = time.time()
        print("Reading file...")
        img_content = await file.read()
        print(f"Reading file took: {time.time() - start_time:.2f} seconds")


        start_time = time.time()
        print("Processing image...")
        processed_img, metadata = imagePreprocessor.process_image(img_content)
        print(f"Processing image took: {time.time() - start_time:.2f} seconds")

        start_time = time.time()
        print("Converting to bytes...")
        img_byte_arr = BytesIO()
        processed_img.save(img_byte_arr, format='JPEG')
        processed_bytes = img_byte_arr.getvalue()
        print(f"Converting to bytes took: {time.time() - start_time:.2f} seconds")


        start_time = time.time()
        print("Generating text...")
        text_result = generate_text_of_img(processed_bytes)
        print(f"Text generation took: {time.time() - start_time:.2f} seconds")
        print(f"Generated text: {text_result}")
        
        if not text_result or text_result == "Không thể phân tích hình ảnh này":
            raise HTTPException(status_code=400, detail="Failed to analyze image")

        start_time = time.time()
        print("Converting to speech...")
        loop = asyncio.get_event_loop()
        audio_future = loop.run_in_executor(
            None,
            googleCloudAPI.tts,
            text_result
        )
        audio_content = await audio_future
        print(f"Text to speech conversion took: {time.time() - start_time:.2f} seconds")

        if not audio_content:
            print("TTS conversion failed")
            raise HTTPException(status_code=500, detail="TTS conversion failed")
        

        start_time = time.time()
        print("Creating response...")
        response = JSONResponse({
            "audio": base64.b64encode(audio_content).decode('utf-8'),
            "text": text_result,
            "preprocessing_metadata": metadata
        })
        print(f"Creating response took: {time.time() - start_time:.2f} seconds")

        return response
    except Exception as e:
        print(f"Error in analyze_image: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qa")
async def qa_endpoint(audio: UploadFile = File(...)):
    try:
        start_time = time.time()
        print("Reading audio file...")
        audio_content = await audio.read()
        print(f"Reading audio took: {time.time() - start_time:.2f} seconds")

        start_time = time.time()
        print("Processing audio...")
        processed_audio, metadata = await audioPreprocessor.denoise_audio(audio_content)
        print(f"Audio processing took: {time.time() - start_time:.2f} seconds")


        start_time = time.time()
        print("Converting speech to text...")
        loop = asyncio.get_event_loop()
        text_future = loop.run_in_executor(
            None,
            googleCloudAPI.stt,
            processed_audio
        )
        text = await text_future
        print(f"Speech to text took: {time.time() - start_time:.2f} seconds")
        print(f"Recognized text: {text}")

        if not text:
            print("Speech recognition failed - no text returned")
            raise HTTPException(status_code=400, detail="Speech recognition failed - no text detected")
        
        start_time = time.time()
        print("Generating answer...")
        answer = generate_text_of_text(text)
        print(f"Answer generation took: {time.time() - start_time:.2f} seconds")

        if not answer or not answer:
            print("Failed to generate answer")
            raise HTTPException(status_code=500, detail="Failed to generate answer")

        print(f"Generated answer: {answer}")

        audio_future = loop.run_in_executor(
            None,
            googleCloudAPI.tts,
            answer
        )
        audio_response = await audio_future
        if not audio_response:
            raise HTTPException(status_code=500, detail="TTS conversion failed")
            

        start_time = time.time()
        print("Converting answer to speech...")

        audio_future = loop.run_in_executor(
            None,
            googleCloudAPI.tts,
            answer
        )
        audio_response = await audio_future
        print(f"Text to speech took: {time.time() - start_time:.2f} seconds")

        if not audio_response:
            print("TTS conversion failed")
            raise HTTPException(status_code=500, detail="TTS conversion failed")

        # Create response
        start_time = time.time()
        print("Creating response...")
        response = JSONResponse({
            "audio": base64.b64encode(audio_response).decode('utf-8'),
            "text": answer,
            "preprocessing_metadata": metadata
        })
        print(f"Response creation took: {time.time() - start_time:.2f} seconds")

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts")
async def tts_endpoint(text:str = Form(...)):
    try:
        start_time = time.time()
        print("Generating speech from text...")
        loop = asyncio.get_event_loop()
        audio_future = loop.run_in_executor(
            None,
            googleCloudAPI.tts,
            text
        )
        audio_content = await audio_future
        print(f"Text to speech conversion took: {time.time() - start_time:.2f} seconds")

        if not audio_content:
            print("TTS conversion failed")
            raise HTTPException(status_code=500, detail="Text to speech conversion failed")
        
        return JSONResponse({
            "audio": base64.b64encode(audio_content).decode('utf-8'),
            "text": text
        })

    except Exception as e:
        print(f"Error in TTS endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate-tts")
async def translate_tts_endpoint(text: str = Form(...)):
    try:
        start_time = time.time()
        print("Generating speech from text...")
        loop = asyncio.get_event_loop()
        audio_future = loop.run_in_executor(
            None,
            googleCloudAPI.translate_and_tts,
            text
        )
        audio_content = await audio_future
        print(f"Text to speech conversion took: {time.time() - start_time:.2f} seconds")

        if not audio_content:
            print("TTS conversion failed")
            raise HTTPException(status_code=500, detail="Text to speech conversion failed")
        
        return JSONResponse({
            "audio": base64.b64encode(audio_content).decode('utf-8'),
            "text": text
        })

    except Exception as e:
        print(f"Error in TTS endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    print(os.cpu_count())
    import uvicorn
    uvicorn.run(
        "vision_api:app",
        host="0.0.0.0",
        port=2701,
        reload=True
    )