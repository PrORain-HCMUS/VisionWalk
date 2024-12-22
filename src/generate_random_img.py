from diffusers import StableDiffusionPipeline
import torch
import os

# Tải mô hình
pipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5", torch_dtype=torch.float32)

# Tạo thư mục nếu chưa tồn tại
output_dir = "assets/img/test_generate_img/"
os.makedirs(output_dir, exist_ok=True)

# Sinh ảnh
prompt = "a pedestrian way with obstacles, this image can be either covered by fingers or at perfect quality (50-50 chance)"
for i in range(100):  # Tạo 100 ảnh
    try:
        image = pipe(prompt).images[0]
        image.save(f"{output_dir}/image_{i}.png")
    except Exception as e:
        print(f"Lỗi khi tạo ảnh {i}: {e}")