from google.cloud import texttospeech
import os

# Thiết lập API Key
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "api/tts.json"

# Tạo client cho Text-to-Speech
client = texttospeech.TextToSpeechClient()

# Cấu hình đầu vào văn bản
text = "chốt lại quy trình để code giao diện trước nhé: mở app lên, nếu muốn tắ thì app sẽ yêu cầu xác nhận kép bằng cách giữ màn hình 5s + giọng  nói. Như vậy sẽ tránh trường hợp người mù họ lỡ tay tắt app dẫn đến không dùng được nữa. Phần chính giao diện thì chỉ có lưu lại những detection của nó và route lại đường đi của người mù để làm dữ liệu, mỗi khi họ kích hoạt chức năng detect bằng nút vật lý (tăng hoặc giảm âm lượng)/ giọng nói (tùy các bạn chọn). Sau khi người mù kích hoạt chức năng thì app trả về thông tin text ở màn hình rồi giọng nói (text to speech) để người mù họ biết."
synthesis_input = texttospeech.SynthesisInput(text=text)

# Cấu hình giọng nói
voice = texttospeech.VoiceSelectionParams(
    language_code="vi-VN",  # Ngôn ngữ tiếng Việt
    ssml_gender=texttospeech.SsmlVoiceGender.FEMALE  # Giọng nữ
)

# Cấu hình audio output
audio_config = texttospeech.AudioConfig(
    audio_encoding=texttospeech.AudioEncoding.MP3  # Định dạng âm thanh
)

# Thực hiện gọi API
response = client.synthesize_speech(
    input=synthesis_input, voice=voice, audio_config=audio_config
)

# Ghi âm thanh vào file
with open("output.mp3", "wb") as out:
    out.write(response.audio_content)
    print("Đã tạo file âm thanh: output.mp3")
