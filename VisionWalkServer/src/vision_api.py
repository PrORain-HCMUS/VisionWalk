import os, base64, google.generativeai as genai, asyncio, time, json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from functools import lru_cache
from io import BytesIO
from firebase_admin import auth
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional
from pydantic import BaseModel
from PIL import Image
from utils import GoogleCloudAPI, ImagePreprocessor, AudioPreprocessor, FirebaseLocation



os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
CREDENTIALS = r"D:\Project\NLP\VisionWalk\VisionWalkServer\private\credentials.json"
FIREBASE_ADMIN_CREDENTIALS = r"D:\Project\NLP\VisionWalk\VisionWalkServer\private\firebase-admin.json"

assert os.path.exists(CREDENTIALS), f"Credentials file not found at {CREDENTIALS}"

app = FastAPI(title="VisionWalk API")

app.add_middleware(
    CORSMiddleware,
    all_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

googleCloudAPI = GoogleCloudAPI(CREDENTIALS)
genai.configure(api_key="AIzaSyBX9YVkHUxZCrXxq7AFALma6lZUEArtlb8")
model = genai.GenerativeModel(model_name="gemini-1.5-pro")
firebase_location_service = FirebaseLocation(FIREBASE_ADMIN_CREDENTIALS)
imagePreprocessor = ImagePreprocessor()
audioPreprocessor = AudioPreprocessor()


class Location(BaseModel):
    latitude: float
    longitude: float
    timestamp: Optional[str] = None

class UserLocation(BaseModel):
    user_id: str
    location: Location

async def verify_firebase_token(token: str) -> str:
    try:
        decoded_token = auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@app.websocket("/ws/location/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        user_id = await verify_firebase_token(token)

        await firebase_location_service.connect(websocket, user_id)

        await firebase_location_service.connect(websocket=websocket, user_id=user_id)

        try:
            while True:
                data = await websocket.receive_text()
                location_data = json.loads(data)
                await firebase_location_service.broadcast_location(user_id=user_id, location=location_data)

        except WebSocketDisconnect:
            firebase_location_service.disconnect(user_id=user_id)

    except Exception as e:
        await websocket.close()
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/nearby-users")
async def get_nearby_users(token: str):
    try:
        user_id = await verify_firebase_token(token)
        return await firebase_location_service.get_nearby_users(user_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

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
        """
        response = model.generate_content([img, prompt])
        return response.text
    except Exception as e:
        print(f"Image analysis error: {str(e)}")
        return " Không thể phân tích hình ảnh này"

@app.get("startup")
async def startup_event():
    asyncio.create_task(firebase_location_service.cleanup_offline_users())

@lru_cache(maxsize=100)
def generate_text_of_text(text: str) -> str:
    try:
        prompt = text
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Image analysis error: {str(e)}")
        return " Không thể trả lời câu hỏi này"


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
async def tts_endpoint(text: str):
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

if __name__ == '__main__':
    print(os.cpu_count())
    import uvicorn
    uvicorn.run(
        "vision_api:app",
        host="0.0.0.0",
        port=2701,
        reload=True
    )