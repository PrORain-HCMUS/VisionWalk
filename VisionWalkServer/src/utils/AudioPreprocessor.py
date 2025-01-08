import os, time, librosa, soundfile as sf, noisereduce as nr, numpy as np
from typing import Tuple

class AudioPreprocessor:
    def __init__(self):
        self.temp_dir = "temp_audio"
        os.makedirs(self.temp_dir, exist_ok=True)
        
    async def denoise_audio(self, audio_data: bytes) -> Tuple[bytes, dict]:
        temp_path = os.path.join(self.temp_dir, f"temp_{int(time.time())}.wav")
        output_path = os.path.join(self.temp_dir, f"processed_{int(time.time())}.wav")
        
        try:
            # Save temporary file
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            # Load and process audio
            audio, sr = librosa.load(temp_path, sr=None)
            
            # Apply noise reduction
            reduced_noise = nr.reduce_noise(
                y=audio,
                sr=sr,
                prop_decrease=0.95,
                stationary=True,
                time_constant_s=2.0
            )
            
            # Normalize audio
            normalized_audio = librosa.util.normalize(reduced_noise)
            
            # Save processed audio
            sf.write(output_path, normalized_audio, sr, subtype='PCM_16')
            
            # Read processed audio
            with open(output_path, "rb") as f:
                processed_audio = f.read()
            
            metadata = {
                "sample_rate": sr,
                "duration": len(audio) / sr,
                "original_size": len(audio_data),
                "processed_size": len(processed_audio)
            }
            
            return processed_audio, metadata
            
        finally:
            # Cleanup
            for path in [temp_path, output_path]:
                if os.path.exists(path):
                    os.remove(path)