from google.cloud import vision
import os
import io

def describe_image(image_path):
    # Đường dẫn đến tệp credentials.json
    credentials_path = "api/vision.json"  

    # Thiết lập biến môi trường GOOGLE_APPLICATION_CREDENTIALS
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    # Khởi tạo client Vision API
    client = vision.ImageAnnotatorClient()

    # Mở file hình ảnh
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    # Gửi yêu cầu đến Vision API để tạo mô tả
    response = client.label_detection(image=image)
    annotations = response.label_annotations

    # Phân tích kết quả trả về
    descriptions = []
    for annotation in annotations:
        descriptions.append(f"{annotation.description} (score: {annotation.score:.2f})")

    # Trả về danh sách mô tả
    return descriptions

image_path = "assets/img/vision test/test1.png" 
descriptions = describe_image(image_path)

print("Mô tả hình ảnh:")
for description in descriptions:
    print(f"- {description}")
