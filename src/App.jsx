import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

function App() {
  const TOTAL_PESERTA = 10000;

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
    const initialPool = Array.from({ length: TOTAL_PESERTA }, (_, i) => String(i + 1));
    return shuffleArray(initialPool);
  });

  const [isRolling, setIsRolling] = useState(false);
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlahPemenang, setJumlahPemenang] = useState(1);
  const [pemenangCurrentBarang, setPemenangCurrentBarang] = useState([]);
  const [displayList, setDisplayList] = useState(['-']);
  
  const [view, setView] = useState('draw');
  const [activeTab, setActiveTab] = useState('history'); // State untuk tab menu baru

  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('draw_history_v4');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const reelRef = useRef(null);
  const itemHeight = 256;

  useEffect(() => {
    localStorage.setItem('draw_pool_v4', JSON.stringify(pool));
  }, [pool]);

  useEffect(() => {
    localStorage.setItem('draw_history_v4', JSON.stringify(history));
  }, [history]);

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
      if (pool.length === 0) return;

      setIsRolling(true);
      const allRecentWinners = [...pemenangCurrentBarang, ...history.flatMap(h => h.winners)].slice(0, 20);
      const segmentCounts = new Array(10).fill(0);
      allRecentWinners.forEach(w => {
        const val = parseInt(w);
        const segIdx = Math.floor((val - 1) / 1000);
        if (segIdx >= 0 && segIdx < 10) segmentCounts[segIdx]++;
      });

      const minCount = Math.min(...segmentCounts);
      const candidateSegments = [];

      for (let i = 0; i < 10; i++) {
        const startRange = i * 1000 + 1;
        const endRange = (i + 1) * 1000;
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
    if (history.length === 0) return alert("Belum ada data!");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pemenang_mayday_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetTotal = () => {
    if (confirm("Apakah Anda yakin ingin menghapus SEMUA data?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getDistributionData = () => {
    const allWinners = history.flatMap(h => h.winners);
    const total = allWinners.length;
    const counts = new Array(10).fill(0);
    allWinners.forEach(w => {
      const segIdx = Math.floor((parseInt(w) - 1) / 1000);
      if (segIdx >= 0 && segIdx < 10) counts[segIdx]++;
    });
    return counts.map((count, i) => ({
      range: `${i * 1000 + 1}-${(i + 1) * 1000}`,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
    }));
  };

  return (
    <div className="min-h-screen bg-[#FF3B30] p-8 flex items-center justify-center overflow-hidden relative font-sans custom-cursor-area">
      <style>{`
        .custom-cursor-area { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%23FFB800' stroke='%23000' stroke-width='1.5' d='M4.5 3h15a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3z'/%3E%3Cpath fill='%23fff' d='M12 7l1.5 3h3.5l-2.5 2.5 1 3.5-3.5-2-3.5 2 1-3.5-2.5-2.5h3.5z'/%3E%3C/svg%3E"), auto; }
        button, input, a { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23FF3B30' stroke-width='2' d='M12 2l3 6 7 1-5 5 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-5 7-1 3-6z'/%3E%3C/svg%3E"), pointer !important; }
        @keyframes led-chase { 0%, 100% { opacity: 1; transform: scale(1.2); background-color: #fff; box-shadow: 0 0 10px #fff; } 50% { opacity: 0.2; transform: scale(0.8); background-color: #ffd700; } }
        .led-dot { animation: led-chase 0.8s infinite; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>

      {view === 'draw' ? (
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-12 items-center justify-between">
          <div className="w-full lg:w-1/2 flex flex-col gap-8">
            <h1 className="text-8xl font-bold text-white italic tracking-tighter leading-none" style={{ textShadow: '6px 6px 0px #FFB800' }}>MAYDAY<br/>DOORPRIZE</h1>
            <div className="relative bg-[#FFB800] p-10 rounded-[3.5rem] border-4 border-[#e6a600] shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <div className="absolute top-3 left-10 right-10 flex justify-between">
                {[...Array(12)].map((_, i) => (<div key={i} className="led-dot w-4 h-4 rounded-full" style={{ animationDelay: `${i * 0.1}s` }}></div>))}
              </div>
              <div className="relative bg-white rounded-[2rem] h-64 overflow-hidden border-8 border-[#FFB800]">
                <div ref={reelRef} className="flex flex-col items-center">
                  {displayList.map((item, i) => (
                    <div key={i} className="h-64 flex items-center justify-center shrink-0">
                      <span className="text-9xl font-bold text-[#333] tracking-tighter tabular-nums">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-3 left-10 right-10 flex justify-between">
                {[...Array(12)].map((_, i) => (<div key={i} className="led-dot w-4 h-4 rounded-full" style={{ animationDelay: `${(12-i) * 0.1}s` }}></div>))}
              </div>
            </div>
            <button onClick={startDraw} disabled={isRolling || !namaBarang || pemenangCurrentBarang.length >= jumlahPemenang} className="w-full py-7 bg-white text-[#FF3B30] text-5xl font-bold rounded-3xl shadow-[0_12px_0px_#cc9300] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 uppercase italic">
              {isRolling ? 'MEMUTAR...' : 'PUTAR'}
            </button>
          </div>

          <div className="w-full lg:w-[480px] bg-white/10 backdrop-blur-xl p-8 rounded-[3.5rem] border-2 border-white/50 shadow-2xl flex flex-col">
            <input type="text" placeholder="NAMA BARANG" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} className="w-full bg-white rounded-2xl px-6 py-5 text-2xl font-bold mb-6 uppercase outline-none" />
            <div className="flex items-center justify-between mb-6 bg-black/20 p-4 rounded-2xl">
               <span className="text-white font-bold text-xs uppercase">Pemenang:</span>
               <div className="flex items-center bg-white rounded-xl">
                  <button onClick={() => setJumlahPemenang(Math.max(1, jumlahPemenang - 1))} className="px-4 py-1 text-red-600 font-bold text-2xl">-</button>
                  <span className="px-2 font-bold text-2xl w-8 text-center">{jumlahPemenang}</span>
                  <button onClick={() => setJumlahPemenang(Math.min(50, jumlahPemenang + 1))} className="px-4 py-1 text-green-600 font-bold text-2xl">+</button>
               </div>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-8">
              {Array.from({ length: jumlahPemenang }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${pemenangCurrentBarang[i] ? 'bg-white text-red-600 scale-110 shadow-xl' : 'bg-white/20 border-dashed border-2 border-white text-transparent'} font-bold text-xl`}>
                  {pemenangCurrentBarang[i] || ''}
                </div>
              ))}
            </div>
            <button onClick={saveAndClear} disabled={pemenangCurrentBarang.length === 0 || isRolling} className="w-full bg-[#FFB800] text-white font-bold py-5 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase text-xl">SIMPAN & NEXT</button>
          </div>
        </div>
      ) : (
        /* UI LOG PANEL (HISTORY) DENGAN SISTEM TAB */
        <div className="w-full max-w-4xl bg-white rounded-[3rem] p-10 shadow-2xl h-[85vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b-4 border-gray-100 pb-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-4xl font-bold text-gray-800 uppercase tracking-tighter">HISTORY & STATISTIK</h2>
              {/* MENU TAB TAMBAHAN */}
              <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveTab('history')} 
                  className={`px-6 py-2 rounded-xl font-bold text-[10px] uppercase transition-all ${activeTab === 'history' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                >
                  History
                </button>
                <button 
                  onClick={() => setActiveTab('stats')} 
                  className={`px-6 py-2 rounded-xl font-bold text-[10px] uppercase transition-all ${activeTab === 'stats' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                >
                  Statistik %
                </button>
              </div>
            </div>
            <div className="flex gap-4 self-start">
               <button onClick={resetTotal} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold uppercase text-xs hover:bg-red-600 hover:text-white transition-all border border-red-200">Reset</button>
               <button onClick={downloadJSON} className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs">JSON</button>
               <button onClick={() => setView('draw')} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs">Tutup</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {activeTab === 'history' ? (
              /* KONTEN HISTORY ASLI */
              <div className="space-y-4">
                {history.length === 0 && <p className="text-center py-20 font-bold text-gray-200 uppercase tracking-widest italic">Belum Ada Data</p>}
                {history.map((h) => (
                  <div key={h.id} className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100 flex items-center justify-between">
                    <div><h3 className="font-bold text-red-600 text-2xl uppercase italic">{h.item}</h3><p className="text-gray-400 text-xs font-bold uppercase">{h.time}</p></div>
                    <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">{h.winners.map((w, i) => (<span key={i} className="bg-white px-4 py-2 rounded-xl border-2 border-yellow-400 font-bold text-lg">{w}</span>))}</div>
                  </div>
                ))}
              </div>
            ) : (
              /* KONTEN STATISTIK (CHART BAR) */
              <div className="space-y-6 px-2">
                <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100 mb-8 flex justify-between items-center">
                   <span className="text-red-800 font-bold uppercase text-sm">Total Putaran</span>
                   <span className="text-3xl font-bold text-red-600 tabular-nums">{history.flatMap(h => h.winners).length}</span>
                </div>
                {getDistributionData().map((data, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-gray-400 uppercase tracking-widest">
                      <span>Range {data.range}</span>
                      <span className="text-gray-900">{data.count} ({data.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-10 rounded-2xl overflow-hidden border border-gray-100 p-1">
                      <div 
                        className="h-full bg-red-500 rounded-xl transition-all duration-1000 ease-out flex items-center justify-end px-3" 
                        style={{ width: `${Math.max(data.percentage, 5)}%` }}
                      >
                         {parseFloat(data.percentage) > 3 && <span className="text-[10px] text-white font-bold">{data.percentage}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setView(view === 'draw' ? 'history' : 'draw')} className="fixed bottom-6 right-6 bg-black/40 text-white px-6 py-4 rounded-2xl font-bold uppercase text-xs backdrop-blur-md border border-white/10">
        {view === 'draw' ? 'History' : 'KEMBALI'}
      </button>
    </div>
  );
}

export default App;