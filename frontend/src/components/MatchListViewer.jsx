import React, { useState, useMemo } from 'react';

export default function MatchListViewer({ resultImage, originalTarget, originalQuery, matchData }) {
  const [showList, setShowList] = useState(false);
  const [topN, setTopN] = useState(20);

  // Filter matches
  const visibleMatches = useMemo(() => {
    if (!matchData) return [];
    // Sort by distance (best matches first)
    const sorted = [...matchData].sort((a, b) => a.distance - b.distance);
    return sorted.slice(0, topN);
  }, [matchData, topN]);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 1. Main Result Viewer */}
      <div className="rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.15)] border border-indigo-500/30 bg-black/80 w-full flex items-center justify-center p-4">
        <img 
          src={resultImage} 
          alt="Overall Matching Result" 
          className="w-full h-auto object-contain max-h-[600px] rounded-lg" 
        />
      </div>

      {/* 2. Control Panel */}
      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-gray-300 mb-2 flex justify-between">
            <span>추출할 상위 매칭 개수 (Top N)</span>
            <span className="text-indigo-400 font-mono">Top {topN}</span>
          </label>
          <input 
            type="range" min="5" max={Math.min(200, matchData ? matchData.length : 50)} step="5" 
            value={topN} onChange={(e) => setTopN(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <button 
          onClick={() => setShowList(!showList)}
          className={`px-6 py-3 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 ${
            showList 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
          }`}
        >
          {showList ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              리스트 닫기
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              Good Matches 추출하기
            </>
          )}
        </button>
      </div>

      {/* 3. Match List Grid */}
      {showList && visibleMatches.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 animate-slide-up">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-white font-bold tracking-wide">Top {visibleMatches.length} Matches</h4>
            <span className="text-xs text-gray-500 font-medium">Sorted by distance</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMatches.map((m, idx) => (
              <div 
                key={m.id || idx} 
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl p-3 flex flex-col transition-colors shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-black px-2 py-1 rounded-md">
                    #{idx + 1}
                  </span>
                  <span className="text-gray-400 font-mono text-xs font-semibold">
                    Dist: {m.distance.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-center gap-4">
                  {/* Target Thumbnail */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-[60px] h-[60px] rounded-lg border border-indigo-500/40 relative shadow-inner overflow-hidden"
                      style={{
                        backgroundImage: `url(${originalTarget})`,
                        backgroundPosition: `-${m.x1 - 30}px -${m.y1 - 30}px`,
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Crosshair */}
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,1)]"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">({Math.round(m.x1)}, {Math.round(m.y1)})</span>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-500 flex flex-col items-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>

                  {/* Query Thumbnail */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-[60px] h-[60px] rounded-lg border border-indigo-500/40 relative shadow-inner overflow-hidden"
                      style={{
                        backgroundImage: `url(${originalQuery})`,
                        backgroundPosition: `-${m.x2 - 30}px -${m.y2 - 30}px`,
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Crosshair */}
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,1)]"></div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">({Math.round(m.x2)}, {Math.round(m.y2)})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
