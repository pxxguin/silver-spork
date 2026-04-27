from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse, Response
import cv2
import uuid
import os
import shutil
import kagglehub
import base64
from typing import Optional
from functools import lru_cache
from core.processor import ImageEnhancer, ObjectDetector, MotionTracker

router = APIRouter()

OUTPUT_DIR = "static/outputs"
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

def validate_image(file: Optional[UploadFile]):
    if file and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 파일 형식입니다.")

def validate_video(file: Optional[UploadFile]):
    if file and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 파일 형식입니다.")

@lru_cache(maxsize=3)
def get_dataset_files(task: str):
    files_found = []
    try:
        if task == 'A':
            path = kagglehub.dataset_download("philmod/lol-low-light-dataset")
            exts = ['.png', '.jpg']
        elif task == 'B':
            path = kagglehub.dataset_download("balabaskar/count-coins-image-dataset")
            exts = ['.png', '.jpg']
        elif task == 'D':
            path = kagglehub.dataset_download("aryashah2k/highway-traffic-videos-dataset")
            exts = ['.mp4', '.avi']
        else:
            return [], ""
            
        for root, dirs, files in os.walk(path):
            for f in files:
                if any(f.endswith(ext) for ext in exts):
                    files_found.append(os.path.relpath(os.path.join(root, f), path))
                    if len(files_found) >= 100:  # Limit to 100 files for performance
                        break
            if len(files_found) >= 100:
                break
        return files_found, path
    except Exception as e:
        print(f"Error loading dataset {task}: {e}")
        return [], ""

@router.get("/datasets/{task}")
def list_datasets(task: str):
    if task not in ['A', 'B', 'D']:
        raise HTTPException(status_code=400, detail="Invalid task")
    files, _ = get_dataset_files(task)
    return {"files": files}

@router.get("/datasets/file/{task}/{file_path:path}")
def get_dataset_file(task: str, file_path: str):
    if task not in ['A', 'B', 'D']:
        raise HTTPException(status_code=400, detail="Invalid task")
    files, base_path = get_dataset_files(task)
    
    full_path = os.path.abspath(os.path.join(base_path, file_path))
    if not full_path.startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Forbidden path")
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(full_path)

@router.get("/datasets/thumbnail/{task}/{file_path:path}")
def get_dataset_thumbnail(task: str, file_path: str):
    if task not in ['A', 'B', 'D']:
        raise HTTPException(status_code=400, detail="Invalid task")
    files, base_path = get_dataset_files(task)
    
    full_path = os.path.abspath(os.path.join(base_path, file_path))
    if not full_path.startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Forbidden path")
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    if task in ['A', 'B']:
        return FileResponse(full_path)
    elif task == 'D':
        cap = cv2.VideoCapture(full_path)
        ret, frame = cap.read()
        cap.release()
        if not ret:
            raise HTTPException(status_code=500, detail="Could not read video frame")
        
        _, encoded_img = cv2.imencode('.jpg', frame)
        return Response(content=encoded_img.tobytes(), media_type="image/jpeg")

@router.post("/preprocess")
async def preprocess_image(
    file: Optional[UploadFile] = File(None),
    internal_file: Optional[str] = Form(None),
    gamma: float = Form(1.0),
    clip_limit: float = Form(2.0),
    grid_size: int = Form(8)
):
    validate_image(file)
    
    if file:
        contents = await file.read()
    elif internal_file:
        files, base_path = get_dataset_files('A')
        if internal_file not in files:
            raise HTTPException(status_code=400, detail="유효하지 않은 내장 파일입니다.")
        with open(os.path.join(base_path, internal_file), "rb") as f:
            contents = f.read()
    else:
        # Fallback to first
        files, base_path = get_dataset_files('A')
        if not files:
            raise HTTPException(status_code=404, detail="기본 파일을 찾을 수 없습니다.")
        with open(os.path.join(base_path, files[0]), "rb") as f:
            contents = f.read()

    img = ImageEnhancer.decode_image(contents)
    if img is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미지를 읽을 수 없습니다.")

    enhanced_img = ImageEnhancer.apply_gamma_correction(img, gamma)
    final_img = ImageEnhancer.apply_clahe(enhanced_img, clip_limit, grid_size)
    
    base64_str = ImageEnhancer.encode_image_base64(final_img)
    original_base64 = base64.b64encode(contents).decode('utf-8')
    
    return {
        "result_image": f"data:image/jpeg;base64,{base64_str}",
        "original_image": f"data:image/jpeg;base64,{original_base64}"
    }

@router.post("/detect")
async def detect_objects(
    file: Optional[UploadFile] = File(None),
    internal_file: Optional[str] = Form(None),
    dp: float = Form(1.2),
    min_dist: float = Form(30.0),
    param1: float = Form(50.0),
    param2: float = Form(30.0),
    min_radius: int = Form(10),
    max_radius: int = Form(50)
):
    validate_image(file)
    
    if file:
        contents = await file.read()
    elif internal_file:
        files, base_path = get_dataset_files('B')
        if internal_file not in files:
            raise HTTPException(status_code=400, detail="유효하지 않은 내장 파일입니다.")
        with open(os.path.join(base_path, internal_file), "rb") as f:
            contents = f.read()
    else:
        files, base_path = get_dataset_files('B')
        if not files:
            raise HTTPException(status_code=404, detail="기본 파일을 찾을 수 없습니다.")
        with open(os.path.join(base_path, files[0]), "rb") as f:
            contents = f.read()
            
    img = ObjectDetector.decode_image(contents)
    if img is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미지를 읽을 수 없습니다.")
        
    result_img, count = ObjectDetector.count_coins(
        img, dp, min_dist, param1, param2, min_radius, max_radius
    )
    
    base64_str = ObjectDetector.encode_image_base64(result_img)
    original_base64 = base64.b64encode(contents).decode('utf-8')
    
    message = "성공적으로 검출되었습니다."
    if count == 0:
        message = "현재 파라미터 설정으로는 검출된 객체가 없습니다."
        
    return {
        "result_image": f"data:image/jpeg;base64,{base64_str}",
        "original_image": f"data:image/jpeg;base64,{original_base64}",
        "count": count,
        "message": message
    }

@router.post("/track")
async def track_motion(
    file: Optional[UploadFile] = File(None),
    internal_file: Optional[str] = Form(None),
    history: int = Form(500),
    var_threshold: float = Form(16.0),
    detect_shadows: bool = Form(True)
):
    validate_video(file)
    
    orig_filename = f"orig_{uuid.uuid4()}.mp4"
    orig_filepath = os.path.join(OUTPUT_DIR, orig_filename)
    
    if file:
        contents = await file.read()
        if len(contents) > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="파일 용량이 50MB를 초과합니다.")
            
        temp_filename = f"temp_{uuid.uuid4()}.mp4"
        temp_filepath = os.path.join(OUTPUT_DIR, temp_filename)
        
        with open(temp_filepath, "wb") as f:
            f.write(contents)
            
        MotionTracker.transcode_video(temp_filepath, orig_filepath)
    elif internal_file:
        files, base_path = get_dataset_files('D')
        if internal_file not in files:
            raise HTTPException(status_code=400, detail="유효하지 않은 내장 파일입니다.")
        temp_filepath = os.path.join(base_path, internal_file)
        MotionTracker.transcode_video(temp_filepath, orig_filepath)
    else:
        files, base_path = get_dataset_files('D')
        if not files:
            raise HTTPException(status_code=404, detail="기본 파일을 찾을 수 없습니다.")
        temp_filepath = os.path.join(base_path, files[0])
        MotionTracker.transcode_video(temp_filepath, orig_filepath)
        
    out_filename = f"tracked_{uuid.uuid4()}.mp4"
    out_filepath = os.path.join(OUTPUT_DIR, out_filename)
    
    success = MotionTracker.track_motion(temp_filepath, out_filepath, history, var_threshold, detect_shadows)
    
    if file and os.path.exists(temp_filepath):
        os.remove(temp_filepath)
        
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="비디오 처리 중 오류가 발생했습니다.")
        
    download_url = f"/static/outputs/{out_filename}"
    original_url = f"/static/outputs/{orig_filename}"
    return {
        "video_url": download_url,
        "original_video_url": original_url
    }
