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
    def track_object_roi(input_path: str, output_path: str, roi: dict, params: dict = None) -> bool:
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return False
            
        ret, frame = cap.read()
        if not ret:
            cap.release()
            return False
            
        tracker = None
        try:
            tracker = cv2.TrackerCSRT_create()
        except AttributeError:
            try:
                tracker = cv2.TrackerKCF_create()
            except AttributeError:
                tracker = cv2.TrackerMIL_create()
                
        bbox = (int(roi['x']), int(roi['y']), int(roi['width']), int(roi['height']))
        tracker.init(frame, bbox)
        
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        p1 = (int(bbox[0]), int(bbox[1]))
        p2 = (int(bbox[0] + bbox[2]), int(bbox[1] + bbox[3]))
        cv2.rectangle(frame, p1, p2, (255, 0, 255), 2, 1)
        out.write(frame)
        
        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            success, bbox = tracker.update(frame)
            if success:
                p1 = (int(bbox[0]), int(bbox[1]))
                p2 = (int(bbox[0] + bbox[2]), int(bbox[1] + bbox[3]))
                cv2.rectangle(frame, p1, p2, (255, 0, 255), 2, 1)
                cv2.putText(frame, "Tracking", (p1[0], p1[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 0, 255), 2)
            else:
                cv2.putText(frame, "Lost", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)
                
            out.write(frame)
            frame_count += 1
            if frame_count > 450:
                break
                
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

class FeatureMatcher(BaseVisionProcessor):
    @staticmethod
    def match_features(img1: np.ndarray, img2: np.ndarray, algo: str = 'SIFT', nfeatures: int = 0, lowe_ratio: float = 0.7, nOctaveLayers: int = 3, contrastThreshold: float = 0.04) -> tuple:
        if algo == 'SIFT':
            detector = cv2.SIFT_create(nfeatures=nfeatures, nOctaveLayers=nOctaveLayers, contrastThreshold=contrastThreshold)
        else: # ORB
            detector = cv2.ORB_create(nfeatures=nfeatures if nfeatures > 0 else 500)
            
        kp1, des1 = detector.detectAndCompute(img1, None)
        kp2, des2 = detector.detectAndCompute(img2, None)
        
        if des1 is None or des2 is None:
            return np.hstack((img1, img2)), 0, []
            
        if algo == 'SIFT':
            FLANN_INDEX_KDTREE = 1
            index_params = dict(algorithm = FLANN_INDEX_KDTREE, trees = 5)
            search_params = dict(checks=50)
            matcher = cv2.FlannBasedMatcher(index_params, search_params)
            try:
                matches = matcher.knnMatch(des1, des2, k=2)
            except Exception:
                return np.hstack((img1, img2)), 0, []
        else:
            matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
            try:
                matches = matcher.knnMatch(des1, des2, k=2)
            except Exception:
                return np.hstack((img1, img2)), 0, []
                
        good_matches = []
        if len(matches) > 0 and len(matches[0]) >= 2:
            for m, n in matches:
                if m.distance < lowe_ratio * n.distance:
                    good_matches.append(m)
        elif len(matches) > 0 and len(matches[0]) == 1:
            good_matches = [m[0] for m in matches]
            
        match_data = []
        for i, m in enumerate(good_matches):
            pt1 = kp1[m.queryIdx].pt
            pt2 = kp2[m.trainIdx].pt
            match_data.append({
                "id": i,
                "x1": pt1[0],
                "y1": pt1[1],
                "x2": pt2[0],
                "y2": pt2[1],
                "distance": m.distance
            })
            
        draw_params = dict(matchColor=(0,255,0),
                           singlePointColor=(255,0,0),
                           flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                           
        result_img = cv2.drawMatches(img1, kp1, img2, kp2, good_matches, None, **draw_params)
        
        return result_img, len(good_matches), match_data
