import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

function App() {
  const [totalPeserta, setTotalPeserta] = useState(() => {
    const savedTotal = localStorage.getItem('draw_total_peserta_v4');
    return savedTotal ? parseInt(savedTotal) : 10000;
  });

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [pool, setPool] = useState(() => {
    const savedPool = localStorage.getItem('draw_pool_v4');
    if (savedPool) return JSON.parse(savedPool);
    const initialPool = Array.from({ length: totalPeserta }, (_, i) => String(i + 1));
    return shuffleArray(initialPool);
  });

  const [isRolling, setIsRolling] = useState(false);
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlahPemenang, setJumlahPemenang] = useState(1);
  const [pemenangCurrentBarang, setPemenangCurrentBarang] = useState([]);
  const [displayList, setDisplayList] = useState(['-']);
  const [view, setView] = useState('draw');
  const [activeTab, setActiveTab] = useState('history'); 
  const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: null, isConfirm: false });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('draw_history_v4');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const reelRef = useRef(null);
  const [itemHeight, setItemHeight] = useState(window.innerWidth < 1024 ? 160 : 256);

  useEffect(() => {
    const handleResize = () => setItemHeight(window.innerWidth < 1024 ? 160 : 256);
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('draw_total_peserta_v4', totalPeserta.toString());
  }, [totalPeserta]);

  useEffect(() => {
    localStorage.setItem('draw_pool_v4', JSON.stringify(pool));
  }, [pool]);

  useEffect(() => {
    localStorage.setItem('draw_history_v4', JSON.stringify(history));
  }, [history]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const showAlert = (title, message) => {
    setModal({ show: true, title, message, isConfirm: false, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModal({ show: true, title, message, isConfirm: true, onConfirm });
  };

  const getSecureRandomIndex = (max) => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  };

  const fireCelebration = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ particleCount, spread: 70, origin: { x: 0, y: 0.9 }, colors: ['#FFB800', '#FFFFFF', '#FF3B30'] });
      confetti({ particleCount, spread: 70, origin: { x: 1, y: 0.9 }, colors: ['#FFB800', '#FFFFFF', '#FF3B30'] });
    }, 250);

    const balloonInterval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(balloonInterval);
      confetti({
        particleCount: 3, 
        angle: 270,
        spread: 120,
        origin: { x: Math.random(), y: -0.2 },
        colors: [['#FFB800', '#FF3B30', '#FFFFFF', '#60A5FA', '#4ADE80'][Math.floor(Math.random() * 5)]],
        shapes: ['circle'],
        scalar: Math.random() * 2 + 2, 
        gravity: 0.35,
        drift: Math.random() * 4 - 2,
        ticks: 500
      });
    }, 300);
  };

  const startDraw = () => {
      if (isRolling || !namaBarang || pemenangCurrentBarang.length >= jumlahPemenang) return;
      if (pool.length === 0) {
        showAlert("POOL HABIS", "Semua nomor kupon sudah terundi!");
        return;
      }

      setIsRolling(true);
      
      const segSize = Math.floor(totalPeserta / 10);
      const allRecentWinners = [...pemenangCurrentBarang, ...history.flatMap(h => h.winners)].slice(0, 20);
      const segmentCounts = new Array(10).fill(0);
      
      allRecentWinners.forEach(w => {
        const val = parseInt(w);
        const segIdx = Math.min(Math.floor((val - 1) / segSize), 9);
        if (segIdx >= 0 && segIdx < 10) segmentCounts[segIdx]++;
      });

      const minCount = Math.min(...segmentCounts);
      const candidateSegments = [];

      for (let i = 0; i < 10; i++) {
        const startRange = i * segSize + 1;
        const endRange = (i === 9) ? totalPeserta : (i + 1) * segSize;
        const membersInSegment = pool.filter(num => {
          const n = parseInt(num);
          return n >= startRange && n <= endRange;
        });
        if (membersInSegment.length > 0 && segmentCounts[i] === minCount) {
          candidateSegments.push(membersInSegment);
        }
      }

      const finalPoolSource = candidateSegments.length > 0 
        ? candidateSegments[getSecureRandomIndex(candidateSegments.length)]
        : pool;

      const winnerCode = finalPoolSource[getSecureRandomIndex(finalPoolSource.length)];
      const randomSequence = Array.from({ length: 60 }, () => pool[getSecureRandomIndex(pool.length)]);
      const finalSequence = [...randomSequence, winnerCode];
      setDisplayList(finalSequence);

      if (reelRef.current) {
        reelRef.current.style.transition = 'none';
        reelRef.current.style.transform = 'translateY(0)';
        reelRef.current.offsetHeight; 
        reelRef.current.style.transition = 'transform 4.5s cubic-bezier(0.1, 0, 0.05, 1)';
        reelRef.current.style.transform = `translateY(-${(finalSequence.length - 1) * itemHeight}px)`;
      }

      setTimeout(() => {
        setIsRolling(false);
        setPemenangCurrentBarang(prev => [...prev, winnerCode]);
        setPool(prevPool => prevPool.filter(num => num !== winnerCode));
        fireCelebration();
      }, 4500);
  };

  const saveAndClear = () => {
    if (pemenangCurrentBarang.length === 0) return;
    const newEntry = {
      id: Date.now(),
      item: namaBarang,
      winners: [...pemenangCurrentBarang],
      time: new Date().toLocaleString('id-ID')
    };
    setHistory([newEntry, ...history]);
    setNamaBarang('');
    setPemenangCurrentBarang([]);
    setJumlahPemenang(1);
    setDisplayList(['-']);
  };

  const downloadJSON = () => {
    if (history.length === 0) return showAlert("DATA KOSONG", "Belum ada riwayat pemenang untuk diekspor.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pemenang_mayday_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetTotal = () => {
    showConfirm(
      "RESET SEMUA DATA", 
      "Ini akan menghapus riwayat pemenang, pool undian, dan pengaturan peserta secara permanen. Lanjutkan?",
      () => {
        localStorage.clear();
        window.location.reload();
      }
    );
  };

  const handleUpdateTotal = (val) => {
    const newTotal = parseInt(val);
    if (isNaN(newTotal) || newTotal < 10) return showAlert("INPUT TIDAK VALID", "Jumlah peserta minimal adalah 10 orang.");
    
    showConfirm(
      "UPDATE PESERTA",
      `Mengubah total ke ${newTotal} akan me-reset daftar pool undian (Nomor yang belum keluar). History pemenang tetap tersimpan. Lanjutkan?`,
      () => {
        setTotalPeserta(newTotal);
        const newPool = Array.from({ length: newTotal }, (_, i) => String(i + 1));
        setPool(shuffleArray(newPool));
        showAlert("BERHASIL", "Total peserta dan daftar pool telah diperbarui.");
      }
    );
  };

  const getDistributionData = () => {
    const allWinners = history.flatMap(h => h.winners);
    const total = allWinners.length;
    const segSize = Math.floor(totalPeserta / 10);
    const counts = new Array(10).fill(0);
    
    allWinners.forEach(w => {
      const segIdx = Math.min(Math.floor((parseInt(w) - 1) / segSize), 9);
      if (segIdx >= 0 && segIdx < 10) counts[segIdx]++;
    });
    
    return counts.map((count, i) => {
      const startRange = i * segSize + 1;
      const endRange = (i === 9) ? totalPeserta : (i + 1) * segSize;
      return {
        range: `${startRange}-${endRange}`,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#FF3B30] p-4 lg:p-8 flex flex-col items-center justify-center overflow-x-hidden relative font-sans custom-cursor-area">
      <style>{`
        .custom-cursor-area { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%23FFB800' stroke='%23000' stroke-width='1.5' d='M4.5 3h15a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3z'/%3E%3Cpath fill='%23fff' d='M12 7l1.5 3h3.5l-2.5 2.5 1 3.5-3.5-2-3.5 2 1-3.5-2.5-2.5h3.5z'/%3E%3C/svg%3E"), auto; }
        button, input, a { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23FF3B30' stroke-width='2' d='M12 2l3 6 7 1-5 5 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-5 7-1 3-6z'/%3E%3C/svg%3E"), pointer !important; }
        @keyframes led-chase { 0%, 100% { opacity: 1; transform: scale(1.2); background-color: #fff; box-shadow: 0 0 10px #fff; } 50% { opacity: 0.2; transform: scale(0.8); background-color: #ffd700; } }
        .led-dot { animation: led-chase 0.8s infinite; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>

      {/* FULLSCREEN BUTTON */}
      <button 
        onClick={toggleFullScreen}
        className="fixed top-4 right-4 lg:top-8 lg:right-8 z-[60] bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-90"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        )}
      </button>

      {/* CUSTOM MODAL SYSTEM */}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xs bg-black/40">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-[#FFB800] animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <h3 className="text-xl lg:text-2xl font-black text-red-600 uppercase mb-4 tracking-tight">{modal.title}</h3>
              <p className="text-gray-500 font-bold text-xs lg:text-sm uppercase leading-relaxed">{modal.message}</p>
            </div>
            <div className="flex border-t-4 border-gray-100">
              {modal.isConfirm && (
                <button 
                  onClick={() => setModal({ ...modal, show: false })}
                  className="flex-1 py-5 font-bold text-gray-400 hover:bg-gray-50 uppercase text-[10px] lg:text-xs transition-colors border-r-4 border-gray-100"
                >
                  Batal
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal({ ...modal, show: false });
                }}
                className="flex-1 py-5 font-bold text-red-600 hover:bg-red-50 uppercase text-[10px] lg:text-xs transition-colors"
              >
                {modal.isConfirm ? 'Ya, Lanjutkan' : 'Mengerti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'draw' ? (
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-center">
          <div className="w-full lg:w-1/2 flex flex-col gap-6 lg:gap-8">
            <h1 className="text-5xl lg:text-8xl font-bold text-white italic tracking-tighter leading-none text-center lg:text-left" style={{ textShadow: '4px 4px 0px #FFB800' }}>MAYDAY<br/>DOORPRIZE</h1>
            
            <div className="relative bg-[#FFB800] p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border-4 border-[#e6a600] shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <div className="absolute top-2 lg:top-3 left-6 lg:left-10 right-6 lg:right-10 flex justify-between">
                {[...Array(window.innerWidth < 1024 ? 8 : 12)].map((_, i) => (<div key={i} className="led-dot w-2 h-2 lg:w-4 lg:h-4 rounded-full" style={{ animationDelay: `${i * 0.1}s` }}></div>))}
              </div>
              
              <div className="relative bg-white rounded-[1.5rem] lg:rounded-[2rem] h-[160px] lg:h-[256px] overflow-hidden border-4 lg:border-8 border-[#FFB800]">
                <div ref={reelRef} className="flex flex-col items-center">
                  {displayList.map((item, i) => (
                    <div key={i} className="h-[160px] lg:h-[256px] flex items-center justify-center shrink-0">
                      <span className="text-7xl lg:text-9xl font-bold text-[#333] tracking-tighter tabular-nums">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-2 lg:bottom-3 left-6 lg:left-10 right-6 lg:right-10 flex justify-between">
                {[...Array(window.innerWidth < 1024 ? 8 : 12)].map((_, i) => (<div key={i} className="led-dot w-2 h-2 lg:w-4 lg:h-4 rounded-full" style={{ animationDelay: `${(12-i) * 0.1}s` }}></div>))}
              </div>
            </div>

            <button onClick={startDraw} disabled={isRolling || !namaBarang || pemenangCurrentBarang.length >= jumlahPemenang} className="relative z-10 w-full py-5 lg:py-7 bg-white text-[#FF3B30] text-3xl lg:text-5xl font-bold rounded-2xl lg:rounded-3xl shadow-[0_8px_0px_#cc9300] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 uppercase italic">
              {isRolling ? 'MEMUTAR...' : 'PUTAR'}
            </button>
          </div>

          <div className="w-full lg:w-[480px] bg-white/10 backdrop-blur-xl p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3.5rem] border-2 border-white/50 shadow-2xl flex flex-col mb-20 lg:mb-0">
            <input type="text" placeholder="NAMA BARANG" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} className="w-full bg-white rounded-xl lg:rounded-2xl px-6 py-4 lg:py-5 text-xl lg:text-2xl font-bold mb-4 lg:mb-6 uppercase outline-none" />
            
            <div className="flex items-center justify-between mb-4 lg:mb-6 bg-black/20 p-4 rounded-xl">
               <span className="text-white font-bold text-[10px] lg:text-xs uppercase">Pemenang:</span>
               <div className="flex items-center bg-white rounded-lg lg:rounded-xl">
                  <button onClick={() => setJumlahPemenang(Math.max(1, jumlahPemenang - 1))} className="px-3 lg:px-4 py-1 text-red-600 font-bold text-xl lg:text-2xl">-</button>
                  <span className="px-2 font-bold text-lg lg:text-2xl min-w-[30px] text-center">{jumlahPemenang}</span>
                  <button onClick={() => setJumlahPemenang(Math.min(50, jumlahPemenang + 1))} className="px-3 lg:px-4 py-1 text-green-600 font-bold text-xl lg:text-2xl">+</button>
               </div>
            </div>

            <div className="grid grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3 mb-6 lg:mb-8 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {Array.from({ length: jumlahPemenang }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-xl lg:rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${pemenangCurrentBarang[i] ? 'bg-white text-red-600 scale-105 shadow-lg' : 'bg-white/20 border-dashed border-2 border-white text-transparent'} font-bold text-sm lg:text-xl`}>
                  {pemenangCurrentBarang[i] || ''}
                </div>
              ))}
            </div>
            
            <button onClick={saveAndClear} disabled={pemenangCurrentBarang.length === 0 || isRolling} className="w-full bg-[#FFB800] text-white font-bold py-4 lg:py-5 rounded-xl lg:rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-lg lg:text-xl">SIMPAN & NEXT</button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 shadow-2xl h-[90vh] lg:h-[85vh] flex flex-col">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 border-b-4 border-gray-100 pb-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl lg:text-4xl font-bold text-gray-800 uppercase tracking-tighter text-center lg:text-left">DATA & STATISTICS</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl lg:rounded-2xl w-full lg:w-fit overflow-x-auto">
                <button onClick={() => setActiveTab('history')} className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg lg:rounded-xl font-bold text-[8px] lg:text-[10px] uppercase transition-all ${activeTab === 'history' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>History</button>
                <button onClick={() => setActiveTab('stats')} className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg lg:rounded-xl font-bold text-[8px] lg:text-[10px] uppercase transition-all ${activeTab === 'stats' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Statistik %</button>
                <button onClick={() => setActiveTab('settings')} className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg lg:rounded-xl font-bold text-[8px] lg:text-[10px] uppercase transition-all ${activeTab === 'settings' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Peserta</button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:flex gap-2 lg:gap-4">
               <button onClick={resetTotal} className="bg-red-50 text-red-600 px-2 lg:px-6 py-2 rounded-lg lg:rounded-xl font-bold uppercase text-[8px] lg:text-xs border border-red-200">RESET DATA</button>
               <button onClick={downloadJSON} className="bg-green-500 text-white px-2 lg:px-6 py-2 rounded-lg lg:rounded-xl font-bold uppercase text-[8px] lg:text-xs">EXPORT JSON</button>
               <button onClick={() => setView('draw')} className="col-span-2 bg-red-600 text-white px-6 py-2 rounded-lg lg:rounded-xl font-bold uppercase text-[8px] lg:text-xs">KEMBALI</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
            {activeTab === 'history' ? (
              <div className="space-y-3 lg:space-y-4">
                {history.length === 0 && <p className="text-center py-20 font-bold text-gray-200 uppercase tracking-widest italic">Belum Ada Data</p>}
                {history.map((h) => (
                  <div key={h.id} className="bg-gray-50 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl border-2 border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div><h3 className="font-bold text-red-600 text-xl lg:text-2xl uppercase italic leading-tight">{h.item}</h3><p className="text-gray-400 text-[8px] lg:text-xs font-bold uppercase">{h.time}</p></div>
                    <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[60%]">{h.winners.map((w, i) => (<span key={i} className="bg-white px-3 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border-2 border-yellow-400 font-bold text-sm lg:text-lg">{w}</span>))}</div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'stats' ? (
              <div className="space-y-4 lg:space-y-6 px-1 lg:px-2">
                <div className="bg-red-50 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-red-100 flex justify-between items-center">
                   <span className="text-red-800 font-bold uppercase text-[10px] lg:text-sm">Total Putaran</span>
                   <span className="text-2xl lg:text-3xl font-bold text-red-600 tabular-nums">{history.flatMap(h => h.winners).length}</span>
                </div>
                {getDistributionData().map((data, idx) => (
                  <div key={idx} className="space-y-1 lg:space-y-2">
                    <div className="flex justify-between text-[8px] lg:text-sm font-bold text-gray-400 uppercase tracking-widest">
                      <span>Range {data.range}</span>
                      <span className="text-gray-900">{data.count} ({data.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-8 lg:h-10 rounded-lg lg:rounded-2xl overflow-hidden border border-gray-100 p-1">
                      <div className="h-full bg-red-500 rounded-md lg:rounded-xl transition-all duration-1000 ease-out flex items-center justify-end px-3" style={{ width: `${Math.max(data.percentage, 5)}%` }}>
                         {parseFloat(data.percentage) > 5 && <span className="text-[8px] lg:text-[10px] text-white font-bold">{data.percentage}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-md mx-auto py-6 lg:py-10 space-y-6 lg:space-y-8">
                <div className="bg-gray-50 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-gray-100">
                  <label className="block text-gray-400 font-bold uppercase text-[8px] lg:text-[10px] tracking-widest mb-4">Total Peserta / Kupon</label>
                  <div className="flex flex-col gap-4">
                    <input 
                      type="number" 
                      defaultValue={totalPeserta}
                      id="total_input"
                      className="w-full bg-white border-2 border-gray-200 rounded-xl lg:rounded-2xl px-6 py-3 lg:py-4 text-2xl lg:text-3xl font-bold outline-none focus:border-red-500 transition-all"
                    />
                    <button 
                      onClick={() => handleUpdateTotal(document.getElementById('total_input').value)}
                      className="w-full bg-red-600 text-white font-bold py-3 lg:py-4 rounded-xl lg:rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase text-[10px] lg:text-sm"
                    >
                      Update & Reset Pool
                    </button>
                  </div>
                </div>
                <div className="px-4 lg:px-6">
                  <h4 className="text-red-600 font-bold uppercase text-[10px] lg:text-xs mb-2 text-center lg:text-left">💡 Info Settings</h4>
                  <ul className="text-gray-400 text-[8px] lg:text-[10px] font-medium uppercase space-y-2 leading-relaxed">
                    <li>• History pemenang tidak akan hilang saat update total.</li>
                    <li>• Daftar nomor yang belum keluar (Pool) akan di-reset sesuai total baru.</li>
                    <li>• Angka otomatis dibagi menjadi 10 segmen untuk pemerataan statistik.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view !== 'draw' && (
        <div className="fixed bottom-24 lg:bottom-6 left-4 lg:left-8 flex flex-col gap-1 z-40">
          <span className="text-white text-[7px] lg:text-[9px] font-bold uppercase tracking-widest">
            Documentation & Source Code
          </span>
          <a 
            href="https://github.com/mrezadit/mayday-doorprize" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white text-[10px] lg:text-sm font-medium hover:text-[#FFB800] transition-colors opacity-80 hover:opacity-100"
          >
            github.com/mrezadit/mayday-doorprize
          </a>
        </div>
      )}

      <button onClick={() => setView(view === 'draw' ? 'history' : 'draw')} className="fixed bottom-6 right-6 left-6 lg:left-auto bg-black/60 lg:bg-black/40 text-white px-6 py-4 rounded-2xl font-bold uppercase text-[10px] lg:text-xs backdrop-blur-md border border-white/10 z-50 shadow-2xl transition-all active:scale-95">
        {view === 'draw' ? 'HISTORY' : 'KEMBALI'}
      </button>
    </div>
  );
}

export default App;