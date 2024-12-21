from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import PIL.Image
import base64
import google.generativeai as genai
from io import BytesIO

# Khởi tạo FastAPI app
app = FastAPI()

# Khởi tạo mô hình GenerativeModel
genai.configure(api_key="AIzaSyDP4HLTC9pSCCdSCpB5DqmMbZMrOVoYF9I")
model = genai.GenerativeModel(model_name="gemini-1.5-pro")

def generate_text_of_img(img_path):
    img = PIL.Image.open(img_path)

    prompt = "Liệt kê các chướng ngại vật, các biển báo và các vật có thể gây nguy hiểm đến người đi bộ. Cho biết các vật thể đó nằm bên nào (trước mặt, trái, phải). Khoảng cách ước lượng đến vật thể đó khoảng bao nhiêu mét(cố gắng ước lượng chính xác, cho biết độ chính xác của ước lượng)? Trả về text không định dạng gì như xuống dòng hay in dậm,... và không thêm nội dung dư thừa."

    response = model.generate_content([img, prompt])

    return (response.text)

# Tích hợp với FastAPI
@app.post("/analyze-image/")
async def analyze_image(file: UploadFile = File(...)):
    """
    Endpoint nhận ảnh tải lên và trả về kết quả từ hàm generate_text_of_img.
    """
    try:
        # Đọc nội dung file ảnh từ UploadFile và lưu vào bộ nhớ
        img_path = BytesIO(await file.read())
        
        # Gọi hàm generate_text_of_img
        res_text = generate_text_of_img(img_path)

        return {"message": res_text}

    except Exception as e:
        return {"error": str(e)}

# How to run: uvicorn vision_api:app --reload
# Docs: http://127.0.0.1:8000/docs