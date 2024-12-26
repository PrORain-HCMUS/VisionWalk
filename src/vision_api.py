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
model = genai.GenerativeModel(model_name="gemini-1.5-flash")

def generate_text_of_img(img_path):
    img = PIL.Image.open(img_path)

    prompt = """Hãy mô tả môi trường xung quanh như đang hướng dẫn một người khiếm thị, tập trung vào:
    1. Các chướng ngại vật (ví dụ: đống cát, gạch đá, rãnh nước, cột điện, xe đạp...)
    2. Biển báo và biển chỉ dẫn
    3. Các vật có thể gây nguy hiểm
    4. Điều kiện mặt đường (ví dụ: trơn trượt, gồ ghề, có nước...)
    
    Cho mỗi vật thể/yếu tố, hãy:
    - Xác định vị trí tương đối (trước mặt, bên trái, bên phải)
    - Ước lượng khoảng cách từ vị trí người quan sát (càng chính xác càng tốt, nếu không chắc chắn thì cho biết khoảng)
    - Mức độ nguy hiểm hoặc ảnh hưởng đến việc di chuyển
    
    Trả lời bằng giọng điệu tự nhiên, như đang nói chuyện trực tiếp với người khiếm thị. 
    Nếu có yếu tố nguy hiểm cần đặc biệt chú ý, hãy nhấn mạnh điều đó.
    Không thêm định dạng văn bản hay nội dung không cần thiết."""

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