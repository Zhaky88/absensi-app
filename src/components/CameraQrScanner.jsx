import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  ZapOff,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  Maximize2,
  Power
} from 'lucide-react';

export default function CameraQrScanner({
  scannerId = 'unified-camera-reader',
  onScanSuccess,
  onScanError,
  onClose,
  title = 'Arahkan Kamera ke QR Code',
  subTitle = 'Posisikan QR Code di dalam kotak pemindai',
  fps = 15,
  showTorchToggle = true,
  showCameraSwitch = true,
  initialCameraActive = true,
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraLabel, setCameraLabel] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(initialCameraActive);
  const [isStarting, setIsStarting] = useState(initialCameraActive);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [permissionError, setPermissionError] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastScanTimeRef = useRef(0);

  // Play audio chime saat scan berhasil
  function playSuccessFeedback() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 30, 40]);
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // Inisialisasi Deteksi Kamera
  useEffect(() => {
    isMountedRef.current = true;
    if (isCameraOn) {
      initCameraScanner();
    }

    return () => {
      isMountedRef.current = false;
      stopActiveScanner();
    };
  }, []);

  async function stopActiveScanner() {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState?.() || 0;
        // State 2 = SCANNING
        if (state === 2 || html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.warn('Scanner cleanup note:', e);
    }
  }

  async function initCameraScanner(preferredCameraId = null) {
    setIsStarting(true);
    setErrorMessage(null);
    setPermissionError(false);

    try {
      // 1. Dapatkan daftar perangkat video yang tersedia
      const availableCameras = await Html5Qrcode.getCameras();
      if (!isMountedRef.current) return;

      if (!availableCameras || availableCameras.length === 0) {
        setErrorMessage('Tidak ada kamera yang terdeteksi di perangkat ini.');
        setIsStarting(false);
        return;
      }

      setCameras(availableCameras);

      // 2. Pilih kamera ideal:
      // Di Handphone: Cari kamera belakang (label mengandung back/belakang/environment)
      // Di Laptop/PC: Gunakan kamera yang ada (webcam bawaan)
      let targetCamera = null;
      if (preferredCameraId) {
        targetCamera = availableCameras.find((c) => c.id === preferredCameraId) || availableCameras[0];
      } else {
        const backCamera = availableCameras.find((c) => {
          const lbl = (c.label || '').toLowerCase();
          return lbl.includes('back') || lbl.includes('belakang') || lbl.includes('rear') || lbl.includes('environment');
        });
        targetCamera = backCamera || availableCameras[0];
      }

      setSelectedCameraId(targetCamera.id);
      setCameraLabel(targetCamera.label || (availableCameras.length > 1 ? 'Kamera Utama' : 'Kamera Perangkat'));

      // 3. Mulai scanning dengan Html5Qrcode instance
      await startScanning(targetCamera.id);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Error getting cameras:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('not allowed')) {
        setPermissionError(true);
        setErrorMessage('Izin akses kamera belum diberikan. Mohon klik izin (Allow) pada browser Anda.');
      } else {
        setErrorMessage(`Gagal mengakses kamera: ${errMsg}`);
      }
      setIsStarting(false);
    }
  }

  async function startScanning(cameraId) {
    try {
      await stopActiveScanner();
      if (!isMountedRef.current) return;

      const scannerInstance = new Html5Qrcode(scannerId, { verbose: false });
      html5QrCodeRef.current = scannerInstance;

      const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const edgeSize = Math.max(180, Math.min(Math.floor(minEdge * 0.72), 270));
        return { width: edgeSize, height: edgeSize };
      };

      const config = {
        fps: fps || 15,
        qrbox: qrboxFunction,
        aspectRatio: 1.0,
      };

      await scannerInstance.start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          // Cegah spam/multiple scan berturut-turut dalam 1.5 detik
          const now = Date.now();
          if (now - lastScanTimeRef.current < 1500) return;
          lastScanTimeRef.current = now;

          playSuccessFeedback();
          if (onScanSuccess) {
            onScanSuccess(decodedText, decodedResult);
          }
        },
        (error) => {
          if (onScanError) {
            onScanError(error);
          }
        }
      );

      if (!isMountedRef.current) return;
      setIsScanning(true);
      setIsStarting(false);

      // Cek apakah kamera mendukung senter / torch (umum di ponsel)
      try {
        const capabilities = scannerInstance.getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }
      } catch (e) {
        setHasTorchSupport(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to start scanner:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('not allowed')) {
        setPermissionError(true);
        setErrorMessage('Akses kamera ditolak. Berikan izin kamera di pengaturan browser.');
      } else {
        setErrorMessage(`Gagal memulai kamera: ${errMsg}`);
      }
      setIsStarting(false);
      setIsScanning(false);
    }
  }

  // Ganti Kamera (Depan <-> Belakang)
  async function handleSwitchCamera() {
    if (cameras.length <= 1) return;
    const currentIdx = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    const nextCamera = cameras[nextIdx];

    setIsStarting(true);
    setSelectedCameraId(nextCamera.id);
    setCameraLabel(nextCamera.label || `Kamera ${nextIdx + 1}`);
    setTorchOn(false);

    await startScanning(nextCamera.id);
  }

  // Toggle Senter / Torch (Flash ponsel)
  async function handleToggleTorch() {
    if (!html5QrCodeRef.current || !hasTorchSupport) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  }

  // Toggle Nyalakan / Matikan Kamera (Power Control)
  async function handleToggleCameraPower() {
    if (isCameraOn) {
      // Matikan kamera & padamkan sensor
      await stopActiveScanner();
      setIsCameraOn(false);
      setIsScanning(false);
      setTorchOn(false);
      setIsStarting(false);
    } else {
      // Nyalakan kamera kembali
      setIsCameraOn(true);
      await initCameraScanner(selectedCameraId);
    }
  }

  return (
    <div className="w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 relative flex flex-col">
      {/* Header Bar Pemindai */}
      <div className="px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 text-white min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            {isCameraOn ? (
              <Camera className="w-4 h-4 text-blue-400" />
            ) : (
              <CameraOff className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-tight">{title}</h4>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {!isCameraOn
                ? 'Kamera dinonaktifkan (Standby)'
                : isStarting
                  ? 'Menyiapkan sensor kamera...'
                  : cameraLabel || subTitle}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tombol Nyalakan / Matikan Kamera */}
          <button
            type="button"
            onClick={handleToggleCameraPower}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
              isCameraOn
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-600 hover:text-white'
                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-emerald-500/30 active:scale-95'
            }`}
            title={isCameraOn ? 'Matikan Sensor Kamera' : 'Nyalakan Sensor Kamera'}
          >
            {isCameraOn ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Matikan Kamera</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Nyalakan Kamera</span>
              </>
            )}
          </button>

          {/* Senter / Flashlight (Hanya saat kamera aktif) */}
          {isCameraOn && hasTorchSupport && showTorchToggle && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Ganti Kamera (Bila ada > 1 Kamera dan aktif) */}
          {isCameraOn && cameras.length > 1 && showCameraSwitch && (
            <button
              type="button"
              disabled={isStarting}
              onClick={handleSwitchCamera}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
              title="Ganti Lensa Kamera"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Ganti Kamera</span>
            </button>
          )}

          {/* Tombol Tutup Scanner */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Tutup Jendela Pemindai"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Viewport Kontainer Kamera */}
      <div className="relative w-full aspect-square sm:aspect-[4/3] max-h-[360px] bg-black flex items-center justify-center overflow-hidden">
        {/* Elemen DOM Target Html5Qrcode */}
        <div
          id={scannerId}
          className="w-full h-full object-cover flex items-center justify-center"
        ></div>

        {/* Layar Saat Kamera Dimatikan (Standby Mode) */}
        {!isCameraOn && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center text-center p-6 text-white space-y-3.5 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
              <CameraOff className="w-8 h-8 text-slate-400" />
            </div>

            <div className="space-y-1 max-w-xs">
              <h4 className="text-sm font-bold text-slate-200">Kamera Dinonaktifkan</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sensor kamera sedang dimatikan untuk menghemat daya baterai & privasi.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleCameraPower}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Nyalakan Kamera Sekarang</span>
            </button>
          </div>
        )}

        {/* Laser Scanning Animation Overlay (Saat aktif) */}
        {isCameraOn && isScanning && !isStarting && !errorMessage && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {/* Viewfinder Target Borders */}
            <div className="w-[68%] h-[68%] max-w-[240px] max-h-[240px] border-2 border-blue-400/60 rounded-3xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

              {/* Scanning Cyan Laser Beam */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-pulse-laser" />
            </div>
          </div>
        )}

        {/* Loading Spinner State */}
        {isCameraOn && isStarting && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-15 flex flex-col items-center justify-center text-center p-6 text-white space-y-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-300">Menghubungkan ke sensor kamera...</p>
            <span className="text-[10px] text-slate-500">Mendukung Kamera HP & Webcam Laptop/PC</span>
          </div>
        )}

        {/* Error / Permission Denied State */}
        {isCameraOn && errorMessage && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center text-center p-6 text-white space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h4 className="text-xs font-bold text-rose-300">
                {permissionError ? 'Izin Kamera Dibutuhkan' : 'Kamera Tidak Dapat Diakses'}
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {errorMessage}
              </p>
              {permissionError && (
                <p className="text-[10px] text-slate-400 pt-1">
                  💡 <strong>Panduan:</strong> Di Chrome/Safari ponsel/laptop, klik ikon gembok 🔒 di samping kolom alamat URL, lalu ubah <em>Camera / Kamera</em> menjadi <strong>Allow / Izinkan</strong>.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => initCameraScanner()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Akses Kamera Lagi</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Instruksi */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          {isCameraOn ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-slate-300 font-medium">Sensor Kamera Aktif</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-400 font-medium">Kamera Dinonaktifkan</span>
            </>
          )}
        </span>
        <span className="text-[10px] text-slate-500">
          {cameras.length > 1 ? `${cameras.length} Kamera Terdeteksi` : 'Deteksi Otomatis'}
        </span>
      </div>

      {/* Custom Keyframe Animation for Laser Beam */}
      <style>{`
        @keyframes laserSweep {
          0% { top: 6%; opacity: 0.2; }
          50% { top: 92%; opacity: 1; }
          100% { top: 6%; opacity: 0.2; }
        }
        .animate-pulse-laser {
          animation: laserSweep 2s ease-in-out infinite;
        }
        #${scannerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
}
