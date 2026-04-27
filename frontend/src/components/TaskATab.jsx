import React, { useState, useEffect, useRef } from 'react';

export default function TaskATab() {
  const [file, setFile] = useState(null);
  const [internalFiles, setInternalFiles] = useState([]);
  const [selectedInternalFile, setSelectedInternalFile] = useState('');
  const [showInternalGrid, setShowInternalGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [gamma, setGamma] = useState(1.0);
  const [clipLimit, setClipLimit] = useState(2.0);
  const [gridSize, setGridSize] = useState(8);
  
  const [resultImg, setResultImg] = useState(null);
  const [originalImg, setOriginalImg] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/datasets/A')
      .then(res => res.json())
      .then(data => {
        if (data.files) setInternalFiles(data.files);
      })
      .catch(err => console.error("Failed to load datasets:", err));
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSelectedInternalFile('');
      setShowInternalGrid(false);
      setError('');
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
      setFile(e.dataTransfer.files[0]);
      setSelectedInternalFile('');
      setShowInternalGrid(false);
      setError('');
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
    setResultImg(null);
    setOriginalImg(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else if (selectedInternalFile) {
      formData.append('internal_file', selectedInternalFile);
    }
    
    formData.append('gamma', gamma);
    formData.append('clip_limit', clipLimit);
    formData.append('grid_size', gridSize);

    try {
      const response = await fetch('http://localhost:8000/api/preprocess', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '처리 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setResultImg(data.result_image);
      setOriginalImg(data.original_image);
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
          <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          </span>
          Low-Light Enhancement
        </h2>
        <p className="text-gray-400 font-light">Advanced CLAHE & Gamma Correction for poorly illuminated images.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Upload Zone */}
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <label className="block text-sm font-semibold text-gray-300 mb-4">Input Source</label>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group
              ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-400 hover:bg-white/5'}
              ${file ? 'border-blue-500/50 bg-blue-500/5' : ''}`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className={`p-3 rounded-full transition-colors ${file ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                {file ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                )}
              </div>
              <div>
                {file ? (
                  <p className="text-blue-300 font-medium">{file.name}</p>
                ) : (
                  <p className="text-gray-300 font-medium">Click to upload or drag & drop</p>
                )}
                <p className="text-gray-500 text-sm mt-1">PNG, JPG, JPEG up to 10MB</p>
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
                {showInternalGrid ? "Collapse Grid" : "Browse Dataset"}
              </button>
            </div>
            
            {selectedInternalFile && !showInternalGrid && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm text-blue-200 font-medium truncate">Selected: {selectedInternalFile.split('/').pop()}</span>
              </div>
            )}

            {showInternalGrid && (
              <div className="max-h-[400px] overflow-y-auto bg-black/40 p-4 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 custom-scrollbar">
                {internalFiles.map((f, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleInternalFileSelect(f)}
                    className={`cursor-pointer overflow-hidden rounded-xl aspect-square bg-gray-900 flex items-center justify-center border-2 transition-all group ${selectedInternalFile === f ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]' : 'border-transparent hover:border-blue-400/50 hover:scale-[1.02]'}`}
                  >
                    <img src={`http://localhost:8000/api/datasets/file/A/${f}`} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
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
              <span>Gamma Correction</span>
              <span className="text-blue-400 font-mono">{gamma}</span>
            </label>
            <input 
              type="range" min="0.1" max="3.0" step="0.1" 
              value={gamma} onChange={(e) => setGamma(e.target.value)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-3 font-medium">Adjusts overall brightness non-linearly</p>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <label className="block text-sm font-bold text-gray-200 mb-3 flex justify-between">
              <span>CLAHE Clip Limit</span>
              <span className="text-blue-400 font-mono">{clipLimit}</span>
            </label>
            <input 
              type="range" min="1.0" max="10.0" step="0.1" 
              value={clipLimit} onChange={(e) => setClipLimit(e.target.value)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-3 font-medium">Limits contrast amplification</p>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <label className="block text-sm font-bold text-gray-200 mb-3 flex justify-between">
              <span>Grid Size</span>
              <span className="text-blue-400 font-mono">{gridSize}x{gridSize}</span>
            </label>
            <input 
              type="range" min="2" max="16" step="2" 
              value={gridSize} onChange={(e) => setGridSize(e.target.value)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-3 font-medium">Number of tiles for histogram equalization</p>
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
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Image...
            </span>
          ) : 'Run Enhancement Engine'}
        </button>
      </form>

      {(resultImg || originalImg) && (
        <div className="mt-12 pt-10 border-t border-white/10 animate-slide-up">
          <h3 className="text-2xl font-black mb-6 text-white tracking-tight">Output Visualization</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Original</span>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 flex-grow flex items-center justify-center min-h-[300px] relative">
                {originalImg ? (
                  <img src={originalImg} alt="Original" className="w-full h-auto object-contain max-h-[500px]" />
                ) : (
                  <span className="text-gray-600 font-medium">No Image</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col group">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Enhanced Result</span>
                {resultImg && (
                  <a 
                    href={resultImg} 
                    download="enhanced_result.jpg"
                    className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-semibold hover:bg-blue-500/30 transition-colors"
                  >
                    Download
                  </a>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 bg-black/50 flex-grow flex items-center justify-center min-h-[300px] relative">
                {resultImg ? (
                  <img src={resultImg} alt="Processed" className="w-full h-auto object-contain max-h-[500px]" />
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
