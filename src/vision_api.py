import os, base64, google.generativeai as genai
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image
from utils.GoogleCloudApi import GoogleCloudApi
from utils.types import QARequest, TTSRequest

CREDENTIALS = r"D:\Project\NLP\VisionWalkServer\private\credentials.json"

googleCloudApi = GoogleCloudApi(CREDENTIALS)

# Khởi tạo FastAPI app
app = FastAPI()

# Khởi tạo mô hình GenerativeModel
genai.configure(api_key="AIzaSyDP4HLTC9pSCCdSCpB5DqmMbZMrOVoYF9I")
model = genai.GenerativeModel(model_name="gemini-1.5-pro")

def generate_text_of_img(img_path):
    img = Image.open(img_path)

    prompt = "Liệt kê các chướng ngại vật, các biển báo và các vật có thể gây nguy hiểm đến người đi bộ. Cho biết các vật thể đó nằm bên nào (trước mặt, trái, phải). Khoảng cách ước lượng đến vật thể đó khoảng bao nhiêu mét(cố gắng ước lượng chính xác, cho biết độ chính xác của ước lượng)? Trả về text không định dạng gì như xuống dòng hay in dậm,... và không thêm nội dung dư thừa."

    response = model.generate_content([img, prompt])

    return (response.text)

def QA(question: str):
    response = model.generate_content(question)
    return response.text

# Tích hợp với FastAPI
# Test
@app.get("/ping", status_code=200)
async def ping():
    return {"message": "pong"}

# Tạo văn bản từ ảnh
@app.post("/analyze-image", status_code=200)
async def analyze_image(file: UploadFile = File(...)):
    """
    Endpoint nhận ảnh tải lên và trả về kết quả từ hàm generate_text_of_img.
    """
    try:
        # Đọc nội dung file ảnh từ UploadFile và lưu vào bộ nhớ
        img_content = await file.read()
        img_path = BytesIO(img_content)
        
        # Gọi hàm generate_text_of_img
        try:
            # Validate image
            img = Image.open(img_path)
            img.verify()
            img_path.seek(0)
            
            try:
                res_text = generate_text_of_img(img_path)
                if not res_text:
                    raise ValueError("Empty response from Gemini")
                
                # Convert text to audio
                audio_content = googleCloudApi.tts(res_text)
                # Encode audio content to base64
                audio_base64 = base64.b64encode(audio_content).decode('utf-8')
                return {"audio": audio_base64, "text": res_text}
                
            except Exception as gemini_error:
                print(f"Gemini API error: {str(gemini_error)}")
                default_text = "Tôi không thể phân tích hình ảnh này. Vui lòng thử lại với hình ảnh khác."
                audio_content = googleCloudApi.tts(default_text)
                audio_base64 = base64.b64encode(audio_content).decode('utf-8')
                return {"audio": audio_base64, "text": default_text}
                
        except Exception as img_error:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(img_error)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/qa", status_code=200)
def qa_endpoint(request: QARequest):
    """
    Endpoint nhận câu hỏi và trả về câu trả lời từ hàm QA.
    """
    try:
        answer = QA(request.question)
        return {"answer": answer}
    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))

@app.post("/stt", status_code=200)
async def stt_endpoint(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()
        text = googleCloudApi.stt(audio_content)
        return {"text": text}
    
    except Exception as e:
        return HTTPException(500, detail=str(e))
    
@app.post("/tts", status_code=200)
def tts_endpoint(request: TTSRequest):
    try:
        text = request.text
        audio_content = googleCloudApi.tts(text)
        return {"audio_content": audio_content}
    
    except Exception as e:
        return HTTPException(500, detail=str(e))

def main():
    import uvicorn
    uvicorn.run("vision_api:app", host="0.0.0.0", port=2701, reload=True)

if __name__ == '__main__':
    main()