import cv2
import numpy as np

def preproccess(image_path):
    # Đọc ảnh
    image = cv2.imread(image_path)

    # Chuyển ảnh về ảnh xám
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Tính toán Laplacian của ảnh
    laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)

    # Tính độ biến thiên (variance) của Laplacian
    variance = laplacian.var()

    # Xác định ảnh có nét hay không
    threshold = 500 # Ngưỡng tùy chỉnh, bạn có thể điều chỉnh giá trị này
    if variance <= threshold:
        return True # Ảnh mờ (lỗi) 
    return False # Ảnh nét
