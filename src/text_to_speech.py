from google.cloud import texttospeech
import os

# Thiết lập API Key
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "api/tts.json"

# Tạo client cho Text-to-Speech
client = texttospeech.TextToSpeechClient()

# Cấu hình đầu vào văn bản
text = """Thái độ quan trọng hơn quá khứ, hơn giáo dục, hơn tiền bạc, hơn hoàn cảnh, hơn những gì mọi người làm hoặc nói. Nó quan trọng hơn ngoại hình, năng khiếu hay kỹ năng. – Charles. Swindoll
Nghệ thuật không cần phải là ánh trăng lừa dối, nghệ thuật không nên là ánh trăng lừa dối, nghệ thuật có thể chỉ là tiếng đau khổ kia thoát ra từ những kiếp lầm than. - Nam Cao
Duy chỉ có gia đình, người ta mới tìm được chốn nương thân để chống lại tai ương của số phận. - Euripides
Hãy nhặt những chữ ở đời để viết nên trang. - Chế Lan Viên
Biểu hiện đầu tiên của tình yêu chân thật ở người con trai là sự rụt rè, còn ở người con gái là sự táo bạo. – Victor Hugo"""
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
