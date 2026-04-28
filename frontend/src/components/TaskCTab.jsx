import React, { useState, useEffect, useRef } from 'react';
import MatchListViewer from './MatchListViewer.jsx';

export default function TaskCTab() {
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
  const [internalFiles, setInternalFiles] = useState([]);
  const [showInternalGridTarget, setShowInternalGridTarget] = useState(false);
  const [showInternalGridQuery, setShowInternalGridQuery] = useState(false);

  // Target Image State
  const [targetFile, setTargetFile] = useState(null);
  const [selectedTargetInternal, setSelectedTargetInternal] = useState('');
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const targetInputRef = useRef(null);

  // Query Image State
  const [queryFile, setQueryFile] = useState(null);
  const [selectedQueryInternal, setSelectedQueryInternal] = useState('');
  const [isDraggingQuery, setIsDraggingQuery] = useState(false);
  const queryInputRef = useRef(null);

  // Parameters
  const [algo, setAlgo] = useState('SIFT');
  const [nfeatures, setNfeatures] = useState(0);
  const [loweRatio, setLoweRatio] = useState(0.7);
  const [nOctaveLayers, setNOctaveLayers] = useState(3);
  const [contrastThreshold, setContrastThreshold] = useState(0.04);

  // Results
  const [resultImg, setResultImg] = useState(null);
  const [originalTarget, setOriginalTarget] = useState(null);
  const [originalQuery, setOriginalQuery] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [matchCount, setMatchCount] = useState(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/datasets/C`)
      .then(res => res.json())
      .then(data => {
        if (data.files) setInternalFiles(data.files);
      })
      .catch(err => console.error("Failed to load datasets:", err));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'target') {
        setTargetFile(e.target.files[0]);
        setSelectedTargetInternal('');
        setShowInternalGridTarget(false);
      } else {
        setQueryFile(e.target.files[0]);
        setSelectedQueryInternal('');
        setShowInternalGridQuery(false);
      }
      setError('');
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === 'target') setIsDraggingTarget(false);
    else setIsDraggingQuery(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'target') {
        setTargetFile(e.dataTransfer.files[0]);
        setSelectedTargetInternal('');
        setShowInternalGridTarget(false);
      } else {
        setQueryFile(e.dataTransfer.files[0]);
        setSelectedQueryInternal('');
        setShowInternalGridQuery(false);
      }
      setError('');
    }
  };

  const handleInternalFileSelect = (filename, type) => {
    if (type === 'target') {
      setSelectedTargetInternal(filename);
      setTargetFile(null);
      if (targetInputRef.current) targetInputRef.current.value = '';
    } else {
      setSelectedQueryInternal(filename);
      setQueryFile(null);
      if (queryInputRef.current) queryInputRef.current.value = '';
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMatchCount(null);
    setResultImg(null);
    setOriginalTarget(null);
    setOriginalQuery(null);
    setMatchData(null);

    if (!targetFile && !selectedTargetInternal) {
      showToast('Target 이미지를 업로드해주세요.');
      return;
    }
    if (!queryFile && !selectedQueryInternal) {
      showToast('Query 이미지를 업로드해주세요.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    if (targetFile) formData.append('target_file', targetFile);
    else if (selectedTargetInternal) formData.append('target_internal', selectedTargetInternal);

    if (queryFile) formData.append('query_file', queryFile);
    else if (selectedQueryInternal) formData.append('query_internal', selectedQueryInternal);

    formData.append('algo', algo);
    formData.append('nfeatures', nfeatures);
    formData.append('lowe_ratio', loweRatio);
    formData.append('nOctaveLayers', nOctaveLayers);
    formData.append('contrastThreshold', contrastThreshold);

    try {
      const response = await fetch(`${API_URL}/api/match`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '매칭 처리 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setResultImg(data.result_image);
      setOriginalTarget(data.original_target);
      setOriginalQuery(data.original_query);
      setMatchData(data.match_data);
      setMatchCount(data.match_count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderUploadZone = (type) => {
    const isTarget = type === 'target';
    const file = isTarget ? targetFile : queryFile;
    const isDragging = isTarget ? isDraggingTarget : isDraggingQuery;
    const setIsDragging = isTarget ? setIsDraggingTarget : setIsDraggingQuery;
    const inputRef = isTarget ? targetInputRef : queryInputRef;
    const selectedInternal = isTarget ? selectedTargetInternal : selectedQueryInternal;
    const showInternalGrid = isTarget ? showInternalGridTarget : showInternalGridQuery;
    const setShowInternalGrid = isTarget ? setShowInternalGridTarget : setShowInternalGridQuery;
    const title = isTarget ? 'Target Image (기준)' : 'Query Image (대상)';

    return (
      <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex-1">
        <label className="block text-sm font-semibold text-gray-300 mb-3">{title}</label>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => handleDrop(e, type)}
          onClick={() => inputRef.current?.click()}
          className={`w-full relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 group
            ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-indigo-400 hover:bg-white/5'}
            ${file ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, type)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className={`p-3 rounded-full transition-colors ${file ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            </div>
            <div>
              {file ? (
                <p className="text-indigo-300 font-medium text-sm">{file.name}</p>
              ) : (
                <p className="text-gray-300 font-medium text-sm">Upload or Drop</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">or Internal Dataset</span>
            <button
              type="button"
              onClick={() => setShowInternalGrid(!showInternalGrid)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium text-white transition-all"
            >
              {showInternalGrid ? "Close" : "Browse"}
            </button>
          </div>

          {selectedInternal && !showInternalGrid && (
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-xs text-indigo-200 font-medium truncate">{selectedInternal.split('/').pop()}</span>
            </div>
          )}

          {showInternalGrid && (
            <div className="max-h-[200px] overflow-y-auto bg-black/40 p-2 rounded-xl border border-white/5 grid grid-cols-3 sm:grid-cols-4 gap-2 custom-scrollbar">
              {internalFiles.length > 0 ? internalFiles.map((f, idx) => (
                <div
                  key={idx}
                  onClick={() => handleInternalFileSelect(f, type)}
                  className={`cursor-pointer overflow-hidden rounded-lg aspect-square bg-gray-900 flex items-center justify-center border transition-all group ${selectedInternal === f ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'border-transparent hover:border-indigo-400/50'}`}
                >
                  <img src={`${API_URL}/api/datasets/file/C/${f}`} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" loading="lazy" />
                </div>
              )) : (
                <div className="col-span-full text-center py-4 text-xs text-gray-500">No images in static/datasets/C</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-[#13131a]/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 transition-all relative">
      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium animate-slide-up z-50">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
          <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </span>
          지역 특징 비교 및 매칭
        </h2>
        <p className="text-gray-400 font-light">특징점 추출 및 매칭 알고리즘을 사용하여 두 이미지 간의 대응점을 찾습니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dual Upload Zone */}
        <div className="flex flex-col md:flex-row gap-6">
          {renderUploadZone('target')}
          {renderUploadZone('query')}
        </div>

        {/* Advanced Parameters */}
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            Advanced Controls
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Algorithm Selection */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-bold text-gray-200 mb-3">Algorithm</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${algo === 'SIFT' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'}`}>
                  <input type="radio" name="algo" value="SIFT" checked={algo === 'SIFT'} onChange={() => setAlgo('SIFT')} className="hidden" />
                  <span className="font-bold tracking-wider">SIFT</span>
                </label>
                <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${algo === 'ORB' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'}`}>
                  <input type="radio" name="algo" value="ORB" checked={algo === 'ORB'} onChange={() => setAlgo('ORB')} className="hidden" />
                  <span className="font-bold tracking-wider">ORB</span>
                </label>
              </div>
            </div>

            {/* nFeatures */}
            <div>
              <label className="block text-sm font-bold text-gray-200 mb-2 flex justify-between">
                <span>Max Features</span>
                <span className="text-indigo-400 font-mono">{nfeatures === 0 ? 'Auto' : nfeatures}</span>
              </label>
              <input
                type="number" min="0" max="5000"
                value={nfeatures} onChange={(e) => setNfeatures(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg text-white p-2 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">0 means unlimited (for SIFT).</p>
            </div>

            {/* Lowe's Ratio */}
            <div>
              <label className="block text-sm font-bold text-gray-200 mb-2 flex justify-between">
                <span>Lowe's Ratio</span>
                <span className="text-indigo-400 font-mono">{loweRatio}</span>
              </label>
              <input
                type="range" min="0.0" max="0.9" step="0.05"
                value={loweRatio} onChange={(e) => setLoweRatio(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-3"
              />
            </div>

            {/* nOctaveLayers (SIFT only) */}
            <div className={`${algo === 'ORB' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-bold text-gray-200 mb-2 flex justify-between">
                <span>Octave Layers</span>
                <span className="text-indigo-400 font-mono">{nOctaveLayers}</span>
              </label>
              <input
                type="number" min="3" max="6"
                value={nOctaveLayers} onChange={(e) => setNOctaveLayers(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg text-white p-2 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            {/* contrastThreshold (SIFT only) */}
            <div className={`${algo === 'ORB' ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-bold text-gray-200 mb-2 flex justify-between">
                <span>Contrast Threshold</span>
                <span className="text-indigo-400 font-mono">{contrastThreshold}</span>
              </label>
              <input
                type="number" min="0.01" max="0.1" step="0.01"
                value={contrastThreshold} onChange={(e) => setContrastThreshold(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg text-white p-2 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

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
          disabled={loading || (!targetFile && !selectedTargetInternal) || (!queryFile && !selectedQueryInternal)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              매칭 실행 중...
            </span>
          ) : '매칭 실행하기'}
        </button>
      </form>

      {/* Result Viewer */}
      {resultImg && (
        <div className="mt-12 pt-10 border-t border-white/10 animate-slide-up">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-2xl font-black text-white tracking-tight">Matching Results</h3>

            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-xl text-sm font-bold border backdrop-blur-md ${matchCount > 0 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                Good Matches: {matchCount}
              </div>
            </div>
          </div>

          <div className="w-full">
            {originalTarget && originalQuery && matchData ? (
              <MatchListViewer
                resultImage={resultImg}
                originalTarget={originalTarget}
                originalQuery={originalQuery}
                matchData={matchData}
              />
            ) : (
              <div className="rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.15)] border border-indigo-500/30 bg-black/50 w-full flex items-center justify-center min-h-[400px] relative p-4">
                <img src={resultImg} alt="Matching result" className="w-full h-auto object-contain max-h-[700px] rounded-lg" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
