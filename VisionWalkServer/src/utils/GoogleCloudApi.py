import os, re
from google.cloud import texttospeech, speech

CREDENTIALS = r"D:\Project\NLP\VisionWalk\VisionWalkServer\private\credentials.json"

class GoogleCloudApi:
    def __init__(self, credentials_file):
        self.setup(credentials_file)
        
        self.ttsClient = texttospeech.TextToSpeechClient()
        self.synthesis = texttospeech.SynthesisInput
        self.ssml_gender = texttospeech.SsmlVoiceGender.FEMALE
        self.voice_selection_params = texttospeech.VoiceSelectionParams


        self.sttClient = speech.SpeechClient()
        self.recognition_audio = speech.RecognitionAudio
        self.recognition_config = speech.RecognitionConfig

    def setup(self, credentials_file):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_file

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = text.replace('\n', '.').replace('\r', '.').replace('\t', ' ').replace('*', '')
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text

    def tts(self, text: str, language_code="vi-VN"):
        text = self.clean_text(text)
        text_parts = text.split('.')
    
        audio_contents = []
        for part in text_parts:
            part = part.strip()
            if part:
                synthesis_input = texttospeech.SynthesisInput(text=part)
                voice = texttospeech.VoiceSelectionParams(
                    language_code=language_code,
                    ssml_gender=self.ssml_gender
                )
                
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )
                
                response = self.ttsClient.synthesize_speech(
                    input=synthesis_input, voice=voice, audio_config=audio_config
                )
                
                audio_contents.append(response.audio_content)
        
        audio_content = b''.join(audio_contents)

        return audio_content

    def stt(self, audio_content, language_code="vi-VN"):
        audio = self.recognition_audio(content=audio_content)
        config = self.recognition_config(
            encoding=self.recognition_config.AudioEncoding.MP3,
            sample_rate_hertz=16000,
            language_code=language_code
        )

        response = self.sttClient.recognize(config=config, audio=audio)
        
        text = ''

        for result in response.results:
            text = text + result.alternatives[0].transcript + ' '

        return text

# if __name__ == '__main__':
#     googleCloudApi = GoogleCloudApi(CREDENTIALS)
#     text = "Nếu nói lầm lẫn lần này thì lại nói lại. Nói lầm lẫn lần nữa thì lại nói lại. Nói cho đến lúc luôn luôn lưu loát hết lầm lẫn mới thôi.\nLàng nành, lợn nái năm nay lọt lòng, lúa non nắng lửa nản lòng, lão nông nức nở lấy nong nia về.\nHãy rủ ngay bạn bè, người thân cùng chơi với bạn để có những phút giây thư giãn và cải thiện phát âm chuẩn và giảm nói giọng từ đó cũng tốt cho việc hát giúp bạn có giọng nói chuẩn nhé."
#     audio_content = googleCloudApi.tts(text)
#     print(audio_content)
#     import pygame
#     from io import BytesIO
#     pygame.mixer.init()
#     audio_data = BytesIO(audio_content)
#     sound = pygame.mixer.Sound(audio_data)
#     sound.play()
#     while pygame.mixer.get_busy():
#         pygame.time.delay(100)
#     pygame.mixer.quit()
