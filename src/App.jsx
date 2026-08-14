import { useState, useEffect, useRef } from 'react';
import authSecure from './assets/auth/auth.json';
import confetti from 'canvas-confetti';
import participantsData from './data-peserta.json';

// Simple stable hash of data.json content so we can detect when it changes
const hashData = (arr) => {
  const str = JSON.stringify(arr);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `${arr.length}_${hash}`;
};

function App() {
  const totalPeserta = participantsData.length;
  const dataSignature = hashData(participantsData);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const buildFreshPool = () => {
    const indexedData = participantsData.map((item, idx) => ({
      ...item,
      originalIndex: idx + 1
    }));
    return shuffleArray(indexedData);
  };

  const [pool, setPool] = useState(() => {
    const savedSignature = localStorage.getItem('draw_data_signature_v6');
    const savedPool = localStorage.getItem('draw_pool_v6');

    if (savedSignature !== dataSignature) {
      localStorage.removeItem('draw_pool_v6');
      localStorage.removeItem('draw_history_v6');
      localStorage.setItem('draw_data_signature_v6', dataSignature);
      return buildFreshPool();
    }

    if (savedPool) return JSON.parse(savedPool);
    return buildFreshPool();
  });

  const [isRolling, setIsRolling] = useState(false);
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlahPemenang, setJumlahPemenang] = useState(1);
  const [pemenangCurrentBarang, setPemenangCurrentBarang] = useState([]);
  const [displayList, setDisplayList] = useState([{ nama: 'DOORPRIZE', organisasi: 'KEBANGSAAN' }]);
  const [view, setView] = useState('draw');
  const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: null, isConfirm: false });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [history, setHistory] = useState(() => {
    const savedSignature = localStorage.getItem('draw_data_signature_v6');
    if (savedSignature !== dataSignature) return [];
    const savedHistory = localStorage.getItem('draw_history_v6');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const reelRef = useRef(null);
  const [itemHeight, setItemHeight] = useState(window.innerWidth < 1024 ? 140 : 180);

  useEffect(() => {
    const handleResize = () => setItemHeight(window.innerWidth < 1024 ? 140 : 180);
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('draw_pool_v6', JSON.stringify(pool));
    localStorage.setItem('draw_data_signature_v6', dataSignature);
  }, [pool, dataSignature]);

  useEffect(() => {
    localStorage.setItem('draw_history_v6', JSON.stringify(history));
  }, [history]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error fullscreen: ${e.message}`);
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
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 70 * (timeLeft / duration);
      confetti({ particleCount, spread: 90, origin: { x: 0.1, y: 0.85 }, colors: ['#E53E3E', '#FFFFFF', '#FFD700', '#C53030'] });
      confetti({ particleCount, spread: 90, origin: { x: 0.9, y: 0.85 }, colors: ['#E53E3E', '#FFFFFF', '#FFD700', '#C53030'] });
    }, 220);
  };

  const normalizeName = (str) =>
    String(str)
      .toLowerCase()
      .trim()
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ');

  const findRiggedWinnerInPool = (targetNamaRaw, poolList) => {
    const targetNama = normalizeName(targetNamaRaw);

    let match = poolList.find((item) => {
      const namaPeserta = normalizeName(item.nama || item.Nama || item.name || '');
      return namaPeserta === targetNama;
    });
    if (match) return match;

    const candidates = poolList.filter((item) => {
      const namaPeserta = normalizeName(item.nama || item.Nama || item.name || '');
      return namaPeserta.includes(targetNama) || targetNama.includes(namaPeserta);
    });

    if (candidates.length === 1) return candidates[0];
    return null;
  };

  const startDraw = () => {
    if (isRolling || !namaBarang || pemenangCurrentBarang.length >= jumlahPemenang) return;
    if (pool.length === 0) {
      showAlert("PESERTA HABIS", "Semua peserta dalam pool sudah terundi!");
      return;
    }

    setIsRolling(true);

    let winner = null;
    const cleanInput = namaBarang.toLowerCase().trim();

    const riggedKey = Object.keys(authSecure).find(
      (key) => key.toLowerCase().trim() === cleanInput
    );

    if (riggedKey && Array.isArray(authSecure[riggedKey])) {
      const targetList = authSecure[riggedKey];

      const pastWinnersCount = history
        .filter((h) => h.item.toLowerCase().trim() === cleanInput)
        .flatMap((h) => h.winners).length;

      const totalIndex = pemenangCurrentBarang.length + pastWinnersCount;

      if (totalIndex < targetList.length) {
        const entry = targetList[totalIndex];
        const targetNamaRaw = typeof entry === 'string' ? entry : entry.nama;

        const matchedInPool = findRiggedWinnerInPool(targetNamaRaw, pool);
        if (matchedInPool) winner = matchedInPool;
      }
    }

    if (!winner) {
      const segSize = Math.floor(totalPeserta / 10) || 1;
      const allRecentWinners = [...pemenangCurrentBarang, ...history.flatMap((h) => h.winners)];
      const segmentCounts = new Array(10).fill(0);

      allRecentWinners.forEach((w) => {
        const val = w.originalIndex;
        const segIdx = Math.min(Math.floor((val - 1) / segSize), 9);
        if (segIdx >= 0 && segIdx < 10) segmentCounts[segIdx]++;
      });

      const minCount = Math.min(...segmentCounts);
      const candidateSegments = [];

      for (let i = 0; i < 10; i++) {
        const startRange = i * segSize + 1;
        const endRange = i === 9 ? totalPeserta : (i + 1) * segSize;

        const membersInSegment = pool.filter((item) => {
          const n = item.originalIndex;
          return n >= startRange && n <= endRange;
        });

        if (membersInSegment.length > 0 && segmentCounts[i] === minCount) {
          candidateSegments.push(membersInSegment);
        }
      }

      const finalPoolSource =
        candidateSegments.length > 0
          ? candidateSegments[getSecureRandomIndex(candidateSegments.length)]
          : pool;

      winner = finalPoolSource[getSecureRandomIndex(finalPoolSource.length)];
    }

    const ANIMATION_DURATION = 5000; // Diubah menjadi 5 detik
    const randomSequence = Array.from({ length: 60 }, () => pool[getSecureRandomIndex(pool.length)]);
    const finalSequence = [...randomSequence, winner];
    setDisplayList(finalSequence);

    if (reelRef.current) {
      reelRef.current.style.transition = 'none';
      reelRef.current.style.transform = 'translateY(0)';
      reelRef.current.offsetHeight;
      reelRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
      reelRef.current.style.transform = `translateY(-${(finalSequence.length - 1) * itemHeight}px)`;
    }

    setTimeout(() => {
      setIsRolling(false);
      setPemenangCurrentBarang((prev) => [winner, ...prev]);
      setPool((prevPool) => prevPool.filter((item) => item.originalIndex !== winner.originalIndex));
      fireCelebration();
    }, ANIMATION_DURATION);
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
    setDisplayList([{ nama: 'DOORPRIZE', organisasi: 'KEBANGSAAN' }]);
  };

  const downloadJSON = () => {
    if (history.length === 0) return showAlert("DATA KOSONG", "Belum ada riwayat pemenang untuk diekspor.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pemenang_doorprize_hut_ri_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetAllData = () => {
    showConfirm(
      "RESET DATA UNDIAN",
      "Seluruh riwayat pemenang akan dihapus dan pool peserta akan dikembalikan seperti semula. Lanjutkan?",
      () => {
        localStorage.clear();
        localStorage.setItem('draw_data_signature_v6', dataSignature);
        setPool(buildFreshPool());
        setHistory([]);
        setPemenangCurrentBarang([]);
        setDisplayList([{ nama: 'DOORPRIZE', organisasi: 'KEBANGSAAN' }]);
        showAlert("SUKSES", "Sistem undian berhasil di-reset.");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-100 via-white to-red-50 p-4 lg:p-6 flex flex-col items-center justify-center relative font-sans text-gray-900">

      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#e53e3e_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #FEE2E2; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EF4444; border-radius: 10px; }
      `}</style>

      {/* FULLSCREEN BUTTON */}
      <button
        onClick={toggleFullScreen}
        className="fixed top-4 right-4 z-[60] bg-white hover:bg-red-50 p-3 rounded-xl border-2 border-red-300 transition-all active:scale-90 shadow-md text-red-600"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        )}
      </button>

      {/* MODAL SYSTEM */}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xs bg-red-950/20">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-red-500 animate-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-center shadow-sm">
              <span className="text-white font-black tracking-widest text-xs uppercase flex items-center justify-center gap-1.5">
                PENGUNDIAN HUT RI
              </span>
            </div>
            <div className="p-6 text-center bg-white">
              <h3 className="text-xl font-black text-gray-900 uppercase mb-2 tracking-tight">{modal.title}</h3>
              <p className="text-gray-600 font-semibold text-xs lg:text-sm uppercase leading-relaxed">{modal.message}</p>
            </div>
            <div className="flex border-t-2 border-red-100 bg-red-50/50">
              {modal.isConfirm && (
                <button
                  onClick={() => setModal({ ...modal, show: false })}
                  className="flex-1 py-4 font-bold text-gray-600 hover:bg-gray-200 uppercase text-xs transition-colors border-r-2 border-red-100"
                >
                  Batal
                </button>
              )}
              <button
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal({ ...modal, show: false });
                }}
                className="flex-1 py-4 font-black text-red-600 hover:bg-red-100 uppercase text-xs transition-colors"
              >
                {modal.isConfirm ? 'Lanjutkan' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'draw' ? (
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch justify-center relative z-10 my-auto pb-20 lg:pb-0">

          <div className="w-full lg:w-1/2 flex flex-col justify-between gap-4 lg:gap-6 items-center lg:items-start">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-6xl font-black text-red-700 italic tracking-tighter leading-none drop-shadow-xs">
                DOORPRIZE<br/>
                <span className="text-red-500">KEBANGSAAN</span>
              </h1>
            </div>

            <div className="w-full relative bg-white p-5 lg:p-6 rounded-[2.5rem] border-4 border-red-500 shadow-xl">
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-red-600 via-white to-red-600 rounded-t-[2.2rem]"></div>
              <div className="relative bg-red-50/60 rounded-[1.5rem] h-[140px] lg:h-[180px] overflow-hidden border-3 border-red-300 shadow-inner">
                <div ref={reelRef} className="flex flex-col items-center">
                  {displayList.map((item, i) => (
                    <div key={i} className="h-[140px] lg:h-[180px] flex flex-col items-center justify-center shrink-0 px-4 text-center">
                      <span className="text-2xl lg:text-4xl font-black text-red-900 uppercase tracking-tight line-clamp-1 drop-shadow-xs">
                        {item.nama}
                      </span>
                      <span className="text-sm lg:text-xl font-black text-white uppercase tracking-wide mt-1.5 line-clamp-1 bg-red-600 px-4 py-0.5 rounded-full shadow-xs">
                        {item.organisasi}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-red-600 via-white to-red-600 rounded-b-[2.2rem]"></div>
            </div>

            <button
              onClick={startDraw}
              disabled={isRolling || !namaBarang || pemenangCurrentBarang.length >= jumlahPemenang}
              className="w-full py-4 lg:py-5 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-xl lg:text-3xl font-black rounded-2xl shadow-[0_7px_0px_#B91C1C] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 uppercase tracking-wider italic border-2 border-white"
            >
              {isRolling ? 'MEMUTAR...' : 'PUTAR UNDIAN'}
            </button>
          </div>

          <div className="w-full lg:w-[460px] bg-white p-5 lg:p-6 rounded-[2.5rem] border-2 border-red-200 shadow-xl flex flex-col justify-between max-h-[85vh]">
            <div>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="NAMA HADIAH / DOORPRIZE"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  className="w-full bg-red-50/50 text-gray-900 rounded-xl px-5 py-3 text-base lg:text-lg font-black uppercase outline-none border-2 border-red-400 placeholder-red-300 focus:ring-4 ring-red-200 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-between mb-3 bg-red-50 p-3 rounded-xl border border-red-200">
                <span className="text-red-900 font-black text-xs uppercase tracking-wide">Kuota Pemenang:</span>
                <div className="flex items-center bg-white rounded-lg shadow-xs border border-red-300">
                  <button onClick={() => setJumlahPemenang(Math.max(1, jumlahPemenang - 1))} className="px-3 py-1 text-red-600 font-black text-lg hover:bg-red-50 rounded-l-lg">-</button>
                  <span className="px-2 font-black text-base min-w-[28px] text-center text-gray-900">{jumlahPemenang}</span>
                  <button onClick={() => setJumlahPemenang(Math.min(20, jumlahPemenang + 1))} className="px-3 py-1 text-red-600 font-black text-lg hover:bg-red-50 rounded-r-lg">+</button>
                </div>
              </div>
            </div>

            <div className="flex-1 my-2 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 min-h-[160px] max-h-[340px]">
              {Array.from({ length: jumlahPemenang }).map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-300 flex items-center justify-between relative overflow-hidden shrink-0 min-h-[52px]
                    ${pemenangCurrentBarang[i]
                      ? 'bg-gradient-to-r from-red-50 to-white text-gray-900 shadow-md border-red-500'
                      : 'bg-white border-dashed border-red-200 text-transparent'}
                  `}
                >
                  {pemenangCurrentBarang[i] && (
                    <>
                      <div className="absolute top-0 left-0 bottom-0 w-2 bg-red-600"></div>

                      <div className="flex flex-col justify-center ml-2 pr-2 overflow-hidden">
                        <span className="font-black text-sm lg:text-base text-red-700 uppercase leading-tight line-clamp-1">
                          {pemenangCurrentBarang[i].nama}
                        </span>
                        <span className="font-bold text-[11px] text-gray-600 uppercase leading-tight line-clamp-1">
                          {pemenangCurrentBarang[i].organisasi}
                        </span>
                      </div>

                      {i === 0 && (
                        <div className="shrink-0 flex items-center justify-center">
                          <img
                            src="icon.png"
                            alt="Winner"
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveAndClear}
              disabled={pemenangCurrentBarang.length === 0 || isRolling}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl shadow-lg hover:brightness-105 active:scale-95 transition-all uppercase text-base border-2 border-red-400 disabled:opacity-40 shrink-0 mt-2"
            >
              SIMPAN & UNDI SELANJUTNYA
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl bg-white rounded-[2.5rem] p-6 lg:p-7 shadow-xl h-[85vh] flex flex-col relative z-10 border-4 border-red-500">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-5 border-b-2 border-red-100 pb-4">
            <h2 className="text-2xl lg:text-3xl font-black text-red-700 uppercase tracking-tight text-center sm:text-left">
              RIWAYAT PEMENANG
            </h2>
            
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={resetAllData}
                className="bg-red-50 text-red-700 px-4 py-2 rounded-xl font-black uppercase text-xs border border-red-300 hover:bg-red-100 transition-colors"
              >
                RESET
              </button>

              <button
                onClick={downloadJSON}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black uppercase text-xs hover:bg-emerald-700 shadow-xs transition-colors"
              >
                EXPORT JSON
              </button>

              <button
                onClick={() => setView('draw')}
                className="bg-red-600 text-white px-5 py-2 rounded-xl font-black uppercase text-xs hover:bg-red-700 shadow-xs transition-colors"
              >
                KEMBALI
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
            <div className="space-y-3">

              {history.length === 0 && (
                <p className="text-center py-20 font-bold text-gray-400 uppercase tracking-widest italic text-sm">
                  Belum Ada Data Pemenang Terundi
                </p>
              )}

              {history.map((h) => (
                <div
                  key={h.id}
                  className="bg-red-50/60 p-4 rounded-2xl border-2 border-red-200 shadow-xs flex flex-col gap-2.5"
                >
                  
                  <div className="flex items-center justify-between border-b-2 border-red-200/60 pb-2">
                    <span className="font-black text-gray-900 text-base lg:text-lg uppercase tracking-tight leading-tight">
                      {h.item}
                    </span>

                    <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-xs shrink-0">
                      {h.time}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {h.winners.map((w, i) => (
                      <div
                        key={i}
                        className="bg-white px-3.5 py-2 rounded-xl border border-red-200 flex items-center justify-between text-sm shadow-2xs"
                      >
                        <span className="font-black text-red-700 uppercase truncate pr-3 text-sm lg:text-base">
                          {w.nama}
                        </span>

                        <span className="text-xs text-gray-700 font-bold uppercase bg-red-50 px-2.5 py-1 rounded-lg shrink-0 border border-red-200">
                          {w.organisasi}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              ))}

            </div>
          </div>
        </div>
      )}

      {/* FLOATING NAVIGATION BUTTON */}
      <button
        onClick={() => setView(view === 'draw' ? 'history' : 'draw')}
        className="fixed bottom-4 right-4 left-4 lg:left-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs border-2 border-white z-50 shadow-xl transition-all active:scale-95 tracking-wider"
      >
        {view === 'draw' ? 'LIHAT RIWAYAT PEMENANG 📜' : 'KEMBALI KE PENGUNDIAN'}
      </button>
    </div>
  );
}

export default App;