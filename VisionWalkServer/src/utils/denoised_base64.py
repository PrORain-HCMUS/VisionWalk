import base64, os, librosa, soundfile as sf, noisereduce as nr, numpy as np

temp_audio_path = "temp_audio.wav"
output_audio_path = "processed_audio.wav"

def denoised_base64(audio_base64: str):
    try:
        audio_data = base64.b64decode(audio_base64)
        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)
        
        audio, sr = librosa.load(temp_audio_path, sr=None)

        reduced_noise_audio = nr.reduce_noise(y=audio, sr=sr)

        sf.write(output_audio_path, reduced_noise_audio, sr)

        with open(output_audio_path, "rb") as f:
            processed_audio_base64 = base64.b64encode(f.read()).decode()

        print("Base64 của âm thanh đã khử nhiễu:")

    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        if os.path.exists(output_audio_path):
            os.remove(output_audio_path)

