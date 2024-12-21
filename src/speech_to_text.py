import requests
import base64

def transcribe_audio(api_key, audio_file_path):
    # Đọc tệp âm thanh và mã hóa base64
    with open(audio_file_path, "rb") as audio_file:
        audio_content = base64.b64encode(audio_file.read()).decode("utf-8")

    # URL endpoint của Google Speech-to-Text API
    url = f"https://speech.googleapis.com/v1/speech:recognize?key={api_key}"

    # Cấu hình yêu cầu
    headers = {"Content-Type": "application/json"}
    data = {
        "config": {
            "encoding": "MP3",  # Định dạng tệp âm thanh là MP3
            "sampleRateHertz": 16000,  # Tần số mẫu (thường dùng 16 kHz)
            "languageCode": "en-US"  # Ngôn ngữ (thay "vi-VN" nếu là tiếng Việt) en-US
        },
        "audio": {
            "content": audio_content  # Nội dung âm thanh đã mã hóa base64
        }
    }


    # Gửi yêu cầu POST tới API
    response = requests.post(url, headers=headers, json=data)

    # Xử lý kết quả
    if response.status_code == 200:
        results = response.json().get("results", [])
        for result in results:
            transcript = result["alternatives"][0]["transcript"]
            confidence = result["alternatives"][0]["confidence"]
            print(f"Transcript: {transcript}")
            print(f"Confidence: {confidence}")
    else:
        print(f"Error: {response.status_code}")
        print(response.json())

# API key và tệp âm thanh
api_key = "AIzaSyAAxFwP7gtAcf77YbyuyX_mFq3KfnmH7-8"  
audio_file_path = "assets/audio/weather_forecast.mp3" 

# Gọi hàm
transcribe_audio(api_key, audio_file_path)
