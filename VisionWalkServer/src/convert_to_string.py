def mp3_to_ascii_string(file_path):
    """
    Chuyển đổi file MP3 sang chuỗi ASCII (mã hex).

    Args:
        file_path (str): Đường dẫn tới file MP3.

    Returns:
        str: Chuỗi ASCII biểu diễn nội dung của file MP3.
    """
    try:
        # Mở tệp MP3 ở chế độ nhị phân
        with open(file_path, "rb") as mp3_file:
            # Đọc toàn bộ nội dung của tệp
            binary_data = mp3_file.read()
            # Chuyển đổi dữ liệu nhị phân thành chuỗi mã hex (ASCII-friendly)
            ascii_string = binary_data.hex()
        return ascii_string
    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")
        return None

if __name__ == "__main__":
    file_path = r"D:\Project\NLP\VisionWalk\VisionWalkClient\assets\audios\ClearMind.mp3"
    ascii_content = mp3_to_ascii_string(file_path)
    if ascii_content:
        with open(r"D:\Project\NLP\VisionWalk\VisionWalkClient\assets\texts\audio_base64.txt", "w", encoding='utf-8') as f:
            f.write(ascii_content)