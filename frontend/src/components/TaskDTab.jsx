import React, { useState, useEffect, useRef } from 'react';

export default function TaskDTab() {
  const [file, setFile] = useState(null);
  const [internalFiles, setInternalFiles] = useState([]);
  const [selectedInternalFile, setSelectedInternalFile] = useState('');
  const [showInternalGrid, setShowInternalGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [history, setHistory] = useState(500);
  const [varThreshold, setVarThreshold] = useState(16);
  const [detectShadows, setDetectShadows] = useState(true);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/datasets/D')
      .then(res => res.json())
      .then(data => {
        if (data.files) setInternalFiles(data.files);
      })
      .catch(err => console.error("Failed to load datasets:", err));
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit.');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setFile(selectedFile);
        setSelectedInternalFile('');
        setShowInternalGrid(false);
        setError('');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit.');
        setFile(null);
      } else {
        setFile(selectedFile);
        setSelectedInternalFile('');
        setShowInternalGrid(false);
        setError('');
      }
    }
  };

  const handleInternalFileSelect = (filename) => {
    setSelectedInternalFile(filename);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setVideoUrl(null);
    setOriginalVideoUrl(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else if (selectedInternalFile) {
      formData.append('internal_file', selectedInternalFile);
    }
    
    formData.append('history', history);
    formData.append('var_threshold', varThreshold);
    formData.append('detect_shadows', detectShadows);

    try {
      const response = await fetch('http://localhost:8000/api/track', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '처리 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setVideoUrl(`http://localhost:8000${data.video_url}`);
      if (data.original_video_url) {
        setOriginalVideoUrl(`http://localhost:8000${data.original_video_url}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#13131a]/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 transition-all">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
          <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </span>
          Vehicle Motion Tracking
        </h2>
        <p className="text-gray-400 font-light">Utilize MOG2 Background Subtraction to track moving objects in real-time. (Max 50MB)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Upload Zone */}
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <label className="block text-sm font-semibold text-gray-300 mb-4">Input Video Source</label>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group
              ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-400 hover:bg-white/5'}
              ${file ? 'border-purple-500/50 bg-purple-500/5' : ''}`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="video/*" 
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className={`p-3 rounded-full transition-colors ${file ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                {file ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                )}
              </div>
              <div>
                {file ? (
                  <p className="text-purple-300 font-medium">{file.name}</p>
                ) : (
                  <p className="text-gray-300 font-medium">Click to upload video or drag & drop</p>
                )}
                <p className="text-gray-500 text-sm mt-1">MP4, AVI up to 50MB</p>
              </div>
            </div>
          </div>
          
          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold tracking-widest uppercase">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-300">Internal Kaggle Datasets</span>
              <button 
                type="button" 
                onClick={() => setShowInternalGrid(!showInternalGrid)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-all shadow-sm"
              >
                {showInternalGrid ? "Collapse Grid" : "Browse Video Dataset"}
              </button>
            </div>
            
            {selectedInternalFile && !showInternalGrid && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span className="text-sm text-purple-200 font-medium truncate">Selected: {selectedInternalFile.split('/').pop()}</span>
              </div>
            )}

            {showInternalGrid && (
              <div className="max-h-[400px] overflow-y-auto bg-black/40 p-4 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 custom-scrollbar">
                {internalFiles.map((f, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleInternalFileSelect(f)}
                    className={`cursor-pointer overflow-hidden rounded-xl aspect-square bg-gray-900 flex items-center justify-center border-2 transition-all relative group ${selectedInternalFile === f ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-[1.02]' : 'border-transparent hover:border-purple-400/50 hover:scale-[1.02]'}`}
                  >
                    <img src={`http://localhost:8000/api/datasets/thumbnail/D/${f}`} alt="Video Thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`rounded-full p-3 backdrop-blur-md transition-all ${selectedInternalFile === f ? 'bg-purple-500/80 text-white' : 'bg-black/50 text-white/80 group-hover:scale-110 group-hover:bg-purple-500/50'}`}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <label className="block text-sm font-bold text-gray-200 mb-3 flex justify-between">
              <span>History Frames</span>
              <span className="text-purple-400 font-mono">{history}</span>
            </label>
            <input 
              type="range" min="10" max="1000" step="10" 
              value={history} onChange={(e) => setHistory(e.target.value)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-3 font-medium">Frames used for background modeling</p>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <label className="block text-sm font-bold text-gray-200 mb-3 flex justify-between">
              <span>Variance Threshold</span>
              <span className="text-purple-400 font-mono">{varThreshold}</span>
            </label>
            <input 
              type="range" min="16" max="100" step="1" 
              value={varThreshold} onChange={(e) => setVarThreshold(e.target.value)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-3 font-medium">Foreground detection sensitivity</p>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-center">
            <label className="flex items-center cursor-pointer justify-between w-full">
              <div className="text-sm font-bold text-gray-200">
                Detect Shadows
                <p className="text-xs text-gray-500 mt-1 font-medium font-normal">Filters out shadow noise</p>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={detectShadows}
                  onChange={(e) => setDetectShadows(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full shadow-inner transition-colors ${detectShadows ? 'bg-purple-600' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform shadow-md ${detectShadows ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
            <span className="text-red-300 font-medium">{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Video... (May take a while)
            </span>
          ) : 'Initialize Tracking Engine'}
        </button>
      </form>

      {(videoUrl || originalVideoUrl) && (
        <div className="mt-12 pt-10 border-t border-white/10 animate-slide-up">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-2xl font-black text-white tracking-tight">Tracking Results</h3>
            {videoUrl && (
              <a href={videoUrl} download className="px-5 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                Export Result Video
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Original Source</span>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex-grow flex items-center justify-center min-h-[300px] relative">
                {originalVideoUrl ? (
                  <video src={originalVideoUrl} controls autoPlay loop muted className="max-h-[500px] w-full bg-black">
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <span className="text-gray-600 font-medium">No Video</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">Motion Tracking Map</span>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-500/30 bg-black flex-grow flex items-center justify-center min-h-[300px] relative">
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop muted className="max-h-[500px] w-full bg-black">
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <span className="text-gray-600 font-medium">No Result</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
