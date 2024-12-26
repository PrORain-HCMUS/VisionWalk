import base64, os, librosa, soundfile as sf, noisereduce as nr, numpy as np

temp_audio_path = "temp_audio.wav"
output_audio_path = "processed_audio.wav"

def denoised_base64(audio_base64: str):
   try:
       # Giải mã base64 thành dữ liệu nhị phân 
       audio_data = base64.b64decode(audio_base64)
       
       # Lưu file tạm thời
       with open(temp_audio_path, "wb") as f:
           f.write(audio_data)
           
       # Đọc file âm thanh với librosa
       audio, sr = librosa.load(temp_audio_path, sr=None)
       
       # Khử nhiễu
       reduced_noise_audio = nr.reduce_noise(
           y=audio,
           sr=sr,
           prop_decrease=0.95,
           stationary=True,
           time_constant_s=2.0
       )
       
       # Chuẩn hóa âm thanh sau khi xử lý
       reduced_noise_audio = librosa.util.normalize(reduced_noise_audio)
       
       # Ghi file đã xử lý
       sf.write(output_audio_path, reduced_noise_audio, sr, subtype='PCM_16')
       
       # Đọc và mã hóa base64
       with open(output_audio_path, "rb") as f:
           processed_audio_base64 = base64.b64encode(f.read()).decode()
           
       return processed_audio_base64

   except Exception as e:
       print(f"Lỗi trong quá trình xử lý âm thanh: {str(e)}")
       return None
       
   finally:
       # Dọn dẹp file tạm
       if os.path.exists(temp_audio_path):
           os.remove(temp_audio_path)
       if os.path.exists(output_audio_path):
           os.remove(output_audio_path)