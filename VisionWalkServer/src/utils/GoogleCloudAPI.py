import os, re
from typing import Optional
from functools import lru_cache
from google.cloud import texttospeech, speech

class GoogleCloudAPI:
    def __init__(self, credentials_file: str, language_code: str = "vi-VN"):
        self.setup(credentials_file)
        self._initialize_clients(language_code)
        
    def _initialize_clients(self, language_code: str):
        self.tts_client = texttospeech.TextToSpeechClient()
        self.stt_client = speech.SpeechClient()
        
        self.default_voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
            name="vi-VN-Wavenet-A"
        )

        self.default_audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,
            pitch=0.0,
            sample_rate_hertz=24000,
            effects_profile_id=['telephony-class-application']
        )

        self.default_stt_config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MP3,
            sample_rate_hertz=16000,
            language_code=language_code,
            enable_automatic_punctuation=True
        )

    @staticmethod
    def setup(credentials_file: str):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_file

    @staticmethod
    @lru_cache(maxsize=1000)
    def clean_text(text: str) -> str:
        text = text.lower()
        text = re.sub(r'[\n\r\t*]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _create_ssml(self, text: str) -> str:
        return f"""
            <speak>
                {text.replace('.', '.<break time="500ms"/>')}
            </speak>
        """
    
    def tts(self, text: str) -> Optional[bytes]:
        try:
            clean_text=self.clean_text(text)
            synthesis_input=texttospeech.SynthesisInput(
                ssml=self._create_ssml(clean_text)
            )

            response = self.tts_client.synthesize_speech(
                input=synthesis_input,
                voice=self.default_voice,
                audio_config=self.default_audio_config
            )

            return response.audio_content
        
        except Exception as e:
            print(f"TTS Error: {str(e)}")
            return None
        
    def stt(self, audio_content: bytes) -> str:
        try:
            audio = speech.RecognitionAudio(content=audio_content)
        
            response = self.stt_client.recognize(
                config=self.default_stt_config,
                audio=audio
            )

            return " ".join(
                result.alternatives[0].transcript
                for result in response.results
            )

        except Exception as e:
            print(f"STT Error: {str(e)}")
            return ""

