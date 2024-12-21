from google.cloud import speech
import io

def transcribe_audio_with_service_account(json_key_file, audio_file_path):
    # Tạo client với tệp JSON chứa service account
    client = speech.SpeechClient.from_service_account_file(json_key_file)

    # Đọc nội dung âm thanh
    with io.open(audio_file_path, "rb") as audio_file:
        content = audio_file.read()

    # Cấu hình yêu cầu
    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.MP3,  # Định dạng âm thanh
        sample_rate_hertz=16000,  # Tần số mẫu
        language_code="en-US",  # Ngôn ngữ (thay "vi-VN" nếu là tiếng Việt)
    )

    # Gửi yêu cầu tới API
    response = client.recognize(config=config, audio=audio)

    # Xử lý kết quả
    for result in response.results:
        print(f"Transcript: {result.alternatives[0].transcript}")
        print(f"Confidence: {result.alternatives[0].confidence}")

# Đường dẫn tới tệp JSON và tệp âm thanh
json_key_file = "api/stt.json"  # Tệp JSON service account
audio_file_path = "assets/audio/weather_forecast.mp3"  # Đường dẫn tới tệp âm thanh

# Gọi hàm
transcribe_audio_with_service_account(json_key_file, audio_file_path)
