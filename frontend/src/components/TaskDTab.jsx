import React, { useState, useEffect, useRef } from 'react';

export default function TaskDTab() {
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

  // Canvas and Image references
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // File upload state
  const [file, setFile] = useState(null);
  const [internalFiles, setInternalFiles] = useState([]);
  const [selectedInternalFile, setSelectedInternalFile] = useState('');
  const [showInternalGrid, setShowInternalGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ROI Tracking state
  const [roi, setRoi] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [hasBox, setHasBox] = useState(false);

  // Advanced Tracker Parameters
  const [learningRate, setLearningRate] = useState(0.02);
  const [numScales, setNumScales] = useState(33);
  const [padding, setPadding] = useState(3.0);

  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [videoUrl, setVideoUrl] = useState(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState(null);

  // 1. Fetch Default Internal Datasets
  useEffect(() => {
    fetch(`${API_URL}/api/datasets/D`)
      .then(res => res.json())
      .then(data => {
        if (data.files) setInternalFiles(data.files);
      })
      .catch(err => console.error("Failed to load datasets:", err));
  }, []);

  // 2. 백엔드 연동 프레임 추출 로직
  const loadFirstFrameFromBackend = async (uploadedFile) => {
    setFrameLoaded(false);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(API_URL + '/api/get-first-frame', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('비디오에서 프레임을 읽을 수 없습니다.');
      }

      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.src = imgUrl;
      img.onload = () => {
        imgRef.current = img;
        setFrameLoaded(true);
        handleClear();
      };
    } catch (err) {
      setError(err.message || '프레임 추출 중 오류가 발생했습니다.');
    }
  };

  const loadInternalFrame = (filename) => {
    setFrameLoaded(false);
    setError('');

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = `${API_URL}/api/datasets/thumbnail/D/${filename}`;
    img.onload = () => {
      imgRef.current = img;
      setFrameLoaded(true);
      handleClear();
    };
    img.onerror = () => {
      setError('서버에서 썸네일을 불러오는 데 실패했습니다.');
    };
  };

  // 3. 업로드 핸들러
  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSelectedInternalFile('');
      setShowInternalGrid(false);
      loadFirstFrameFromBackend(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setSelectedInternalFile('');
      setShowInternalGrid(false);
      loadFirstFrameFromBackend(selectedFile);
    }
  };

  const handleInternalFileSelect = (filename) => {
    setSelectedInternalFile(filename);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowInternalGrid(false);
    loadInternalFrame(filename);
  };

  // 4. Canvas Drawing Logic
  const redrawCanvas = (box = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');

    canvas.width = imgRef.current.width;
    canvas.height = imgRef.current.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0);

    if (box) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!frameLoaded) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
    setHasBox(false);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);
    setCurrentPos(pos);

    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);

    redrawCanvas({ x, y, width, height });
  };

  const handleMouseUpOrLeave = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const x = Math.round(Math.min(startPos.x, currentPos.x));
    const y = Math.round(Math.min(startPos.y, currentPos.y));
    const width = Math.round(Math.abs(currentPos.x - startPos.x));
    const height = Math.round(Math.abs(currentPos.y - startPos.y));

    if (width > 10 && height > 10) {
      setRoi({ x, y, width, height });
      setHasBox(true);

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(imgRef.current, 0, 0);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fillRect(x, y, width, height);
    } else {
      handleClear();
    }
  };

  const handleClear = () => {
    setHasBox(false);
    setRoi({ x: 0, y: 0, width: 0, height: 0 });
    // setTimeout to ensure redraw uses correct imgRef timing
    setTimeout(() => redrawCanvas(), 0);
  };

  const handleStartTracking = async () => {
    setLoading(true);
    setError('');
    setVideoUrl(null);
    setOriginalVideoUrl(null);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (selectedInternalFile) formData.append('internal_file', selectedInternalFile);

      const trackingPayload = {
        roi: roi,
        params: {
          learning_rate: learningRate,
          num_scales: numScales,
          padding: padding
        }
      };
      formData.append('roi', JSON.stringify(trackingPayload));

      const response = await fetch(`${API_URL}/api/track-roi`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '비디오 추적 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setVideoUrl(`${API_URL}${data.video_url}`);
      setOriginalVideoUrl(`${API_URL}${data.original_video_url}`);

      setTimeout(() => {
        window.scrollBy({ top: 800, behavior: 'smooth' });
      }, 200);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#13131a]/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 transition-all flex flex-col gap-6 relative">

      <div className="mb-2 z-10 relative">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
          <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </span>
          영상 움직임 검출 및 추적
        </h2>
        <p className="text-gray-400 font-light">영상을 업로드하거나 기본 영상을 선택한 후, 첫 프레임에서 추적하고자 하는 객체 주위에 영역을 지정하세요.</p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 z-10 relative">
        <label className="block text-sm font-semibold text-gray-300 mb-4">Input Video Source</label>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 group
            ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-400 hover:bg-white/5'}
            ${file ? 'border-purple-500/50 bg-purple-500/5' : ''}`}
        >
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className={`p-3 rounded-full transition-colors ${file ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              {file ? <p className="text-purple-300 font-medium">{file.name}</p> : <p className="text-gray-300 font-medium">Click to upload video or drag & drop</p>}
              <p className="text-gray-500 text-sm mt-1">MP4, AVI format</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-400">Or use Internal Datasets</span>
            <button type="button" onClick={() => setShowInternalGrid(!showInternalGrid)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-all shadow-sm border border-white/5">
              {showInternalGrid ? "Collapse Grid" : "Browse Datasets"}
            </button>
          </div>

          {selectedInternalFile && !showInternalGrid && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-3 w-fit">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <span className="text-sm text-purple-200 font-medium">Selected: {selectedInternalFile.split('/').pop()}</span>
            </div>
          )}

          {showInternalGrid && (
            <div className="max-h-[300px] overflow-y-auto bg-black/40 p-4 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 custom-scrollbar mt-3">
              {internalFiles.length > 0 ? internalFiles.map((f, idx) => (
                <div key={idx} onClick={() => handleInternalFileSelect(f)} className={`cursor-pointer overflow-hidden rounded-xl aspect-square bg-gray-900 flex items-center justify-center border-2 transition-all group ${selectedInternalFile === f ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-transparent hover:border-purple-400/50'}`}>
                  <img src={`${API_URL}/api/datasets/thumbnail/D/${f}`} alt="Thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-100" loading="lazy" />
                </div>
              )) : <div className="col-span-full py-4 text-center text-sm text-gray-500">No videos found in datasets/D</div>}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          <span className="text-red-300 font-medium text-sm">{error}</span>
        </div>
      )}

      {/* 작업 영역 (Canvas) - 영상이 선택된 이후에만 렌더링되도록 처리할 수도 있지만, 가이드용으로 비워둠 */}
      <div className={`rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] border transition-all duration-500 bg-black flex items-center justify-center relative w-full select-none
        ${(!file && !selectedInternalFile) ? 'border-dashed border-gray-600 opacity-50 min-h-[300px]' : 'border-purple-500/30'}`}
      >
        {(!file && !selectedInternalFile) ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <span className="text-gray-400 font-medium text-sm">Please upload or select a video to extract the first frame.</span>
          </div>
        ) : !frameLoaded ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-4xl aspect-[16/9] justify-center">
            <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span className="text-purple-400 font-medium">Extracting First Frame...</span>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="w-full max-w-4xl h-auto object-contain cursor-crosshair block"
            />
            {/* Helper Badge */}
            {!hasBox && !isDrawing && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-purple-500/30 text-purple-200 text-sm font-medium pointer-events-none animate-bounce">
                영상을 업로드하거나, 기본 영상 선택 후 여기를 한번 클릭해주세요!
              </div>
            )}
          </>
        )}
      </div>

      {/* 상태 표시 패널 및 컨트롤 바 */}
      {frameLoaded && (
        <div className="flex flex-col gap-6 z-10 relative animate-slide-up">

          {/* Tracker Settings Panel */}
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-200 flex justify-between">
                <span>Learning Rate</span>
                <span className="text-purple-400 font-mono">{learningRate.toFixed(2)}</span>
              </label>
              <input type="range" min="0.01" max="0.10" step="0.01" value={learningRate} onChange={(e) => setLearningRate(Number(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-200 flex justify-between">
                <span>Number of Scales</span>
                <span className="text-purple-400 font-mono">{numScales}</span>
              </label>
              <input type="range" min="10" max="50" step="1" value={numScales} onChange={(e) => setNumScales(Number(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-200 flex justify-between">
                <span>Padding</span>
                <span className="text-purple-400 font-mono">{padding.toFixed(1)}</span>
              </label>
              <input type="range" min="1.0" max="5.0" step="0.5" value={padding} onChange={(e) => setPadding(Number(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></div>
              <div className="font-mono text-sm tracking-widest text-purple-300 bg-black/40 px-4 py-2 rounded-lg border border-purple-500/20">
                ROI 좌표: <span className="text-white">x: {roi.x}, y: {roi.y}, w: {roi.width}, h: {roi.height}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleClear}
                className="px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-all border border-gray-600 shadow-sm whitespace-nowrap"
              >
                초기화
              </button>
              <button
                onClick={handleStartTracking}
                disabled={!hasBox || loading}
                className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {loading ? '전송 중...' : '추적 시작'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tracking Results Viewer */}
      {(videoUrl || originalVideoUrl) && (
        <div className="mt-8 pt-8 border-t border-white/10 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-white tracking-tight">Tracking Results</h3>
            {videoUrl && (
              <a href={videoUrl} download className="px-5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                Export Result
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Original Video</span>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex-grow flex items-center justify-center min-h-[300px] relative">
                {originalVideoUrl ? (
                  <video src={originalVideoUrl} controls autoPlay loop muted className="max-h-[500px] w-full bg-black" />
                ) : (
                  <span className="text-gray-600 font-medium">No Video</span>
                )}
              </div>
            </div>

            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">Tracked Object</span>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-500/30 bg-black flex-grow flex items-center justify-center min-h-[300px] relative">
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop muted className="max-h-[500px] w-full bg-black" />
                ) : (
                  <span className="text-gray-600 font-medium">Processing...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
