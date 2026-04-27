import cv2
import numpy as np
import base64
from typing import Tuple, List, Optional
import os

class BaseVisionProcessor:
    @staticmethod
    def decode_image(file_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    
    @staticmethod
    def encode_image_base64(img: np.ndarray) -> str:
        _, buffer = cv2.imencode('.jpg', img)
        return base64.b64encode(buffer).decode('utf-8')

class ImageEnhancer(BaseVisionProcessor):
    @staticmethod
    def apply_clahe(img: np.ndarray, clip_limit: float = 2.0, grid_size: int = 8) -> np.ndarray:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(grid_size, grid_size))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        final = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return final

    @staticmethod
    def apply_gamma_correction(img: np.ndarray, gamma: float = 1.0) -> np.ndarray:
        invGamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(img, table)

class ObjectDetector(BaseVisionProcessor):
    @staticmethod
    def count_coins(img: np.ndarray, dp: float, min_dist: float, param1: float, param2: float, min_radius: int, max_radius: int) -> Tuple[np.ndarray, int]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.medianBlur(gray, 5)
        circles = cv2.HoughCircles(
            blurred, 
            cv2.HOUGH_GRADIENT, 
            dp=dp, 
            minDist=min_dist,
            param1=param1, 
            param2=param2, 
            minRadius=min_radius, 
            maxRadius=max_radius
        )
        
        count = 0
        result_img = img.copy()
        if circles is not None:
            circles = np.uint16(np.around(circles))
            count = len(circles[0, :])
            for i in circles[0, :]:
                cv2.circle(result_img, (i[0], i[1]), i[2], (0, 255, 0), 2)
                cv2.circle(result_img, (i[0], i[1]), 2, (0, 0, 255), 3)
                
        return result_img, count

class MotionTracker(BaseVisionProcessor):
    @staticmethod
    def track_motion(video_path: str, output_path: str, history: int, var_threshold: float, detect_shadows: bool) -> bool:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return False
            
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps    = cap.get(cv2.CAP_PROP_FPS)
        
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        backSub = cv2.createBackgroundSubtractorMOG2(
            history=history, 
            varThreshold=var_threshold, 
            detectShadows=detect_shadows
        )
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            fgMask = backSub.apply(frame)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            fgMask = cv2.morphologyEx(fgMask, cv2.MORPH_OPEN, kernel)
            
            contours, _ = cv2.findContours(fgMask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                if cv2.contourArea(contour) > 500:
                    x, y, w, h = cv2.boundingRect(contour)
                    cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            out.write(frame)
            
        cap.release()
        out.release()
        return True

    @staticmethod
    def transcode_video(input_path: str, output_path: str) -> bool:
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return False
            
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps    = cap.get(cv2.CAP_PROP_FPS)
        
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            
        cap.release()
        out.release()
        return True
