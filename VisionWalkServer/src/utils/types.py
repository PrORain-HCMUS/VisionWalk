from pydantic import BaseModel

class QARequest(BaseModel):
    audio_base64: str

class TTSRequest(BaseModel):
    text: str