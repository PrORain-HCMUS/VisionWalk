import cv2, numpy as np, numpy.typing as npt
from typing import Tuple
from io import BytesIO
from PIL import Image

class ImagePreprocessor:
    def __init__(self, target_height: int = 1024):
        self.target_height = target_height
        self.min_brightness = 80
        self.max_brightness = 200
        
    def process_image(self, image_bytes: bytes) -> Tuple[Image.Image, dict]:
        """
        Process image with advanced enhancement techniques
        """
        metadata = {'original_size': None, 'enhancements': []}
        
        # Convert bytes to PIL Image
        img = Image.open(BytesIO(image_bytes))
        metadata['original_size'] = img.size
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
            metadata['enhancements'].append('rgb_conversion')
            
        # Resize maintaining aspect ratio
        w, h = img.size
        if h != self.target_height:
            ratio = self.target_height / h
            new_width = int(w * ratio)
            img = img.resize((new_width, self.target_height), Image.Resampling.LANCZOS)
            metadata['enhancements'].append('resized')
            
        # Convert to numpy array for OpenCV operations
        img_array = np.array(img)
        
        # Apply enhancements
        img_array = self._enhance_image(img_array, metadata)
        
        # Convert back to PIL Image
        enhanced_img = Image.fromarray(img_array)
        
        return enhanced_img, metadata
    
    def _enhance_image(self, img_array: npt.NDArray, metadata: dict) -> npt.NDArray:
        """
        Apply various image enhancement techniques
        """
        try:
            # Denoise
            img_array = cv2.fastNlMeansDenoisingColored(
                img_array, None, 10, 10, 7, 21
            )
            metadata['enhancements'].append('denoised')
            
            # Adaptive histogram equalization for better contrast
            lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            l = clahe.apply(l)
            lab = cv2.merge((l, a, b))
            img_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            metadata['enhancements'].append('contrast_enhanced')
            
            # Edge preservation and sharpening
            img_array = cv2.edgePreservingFilter(
                img_array, flags=1, sigma_s=60, sigma_r=0.4
            )
            metadata['enhancements'].append('edge_preserved')

            # Adaptive brightness adjustment
            mean_brightness = np.mean(cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY))
            if mean_brightness < self.min_brightness:
                alpha = 1.3
                beta = 30
                img_array = cv2.convertScaleAbs(img_array, alpha=alpha, beta=beta)
                metadata['enhancements'].append('brightness_increased')
            elif mean_brightness > self.max_brightness:
                alpha = 0.8
                beta = -10
                img_array = cv2.convertScaleAbs(img_array, alpha=alpha, beta=beta)
                metadata['enhancements'].append('brightness_decreased')
            
            return img_array
            
        except Exception as e:
            print(f"Error in image enhancement: {str(e)}")
            metadata['enhancement_error'] = str(e)
            return img_array


