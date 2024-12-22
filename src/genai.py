from google.cloud import vision
import openai
import os
import io

# Khởi tạo Vision API
def analyze_image_with_vision(image_path):
    client = vision.ImageAnnotatorClient()

    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    response = client.label_detection(image=image)
    objects = response.localized_object_annotations

    # Tạo danh sách phân tích
    descriptions = []
    for obj in objects:
        descriptions.append(f"{obj.name} (độ chính xác: {obj.score:.2f})")
    return descriptions

# Dùng Generative AI để tạo mô tả phong phú
def generate_detailed_description(labels):
    openai.api_key = "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"

    prompt = (
        "Dựa trên những thông tin sau, hãy tạo một mô tả chi tiết và phong phú về hình ảnh: \n\n"
        + "\n".join(labels)
    )

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
    )
    return response['choices'][0]['message']['content']


# Đường dẫn hình ảnh
image_path = "assets/img/vision test/test1.png"

# Phân tích hình ảnh với Vision API
labels = analyze_image_with_vision(image_path)

# Tạo mô tả phong phú với Generative AI
description = generate_detailed_description(labels)

print("Mô tả chi tiết về hình ảnh:")
print(description)
