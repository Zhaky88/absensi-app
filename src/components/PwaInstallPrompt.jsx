import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  X,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  School,
  ArrowUp,
  Info,
} from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah diinstall)
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // 2. Deteksi perangkat
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/.test(userAgent);
    setIsIos(isIosDevice);
    setIsMobile(isMobileDevice);

    // 3. Cek apakah pengguna baru saja menutup (dismiss) prompt dalam 2 hari terakhir
    const dismissedUntil = localStorage.getItem('siak_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 4. Listener event beforeinstallprompt untuk Android & Desktop Chrome/Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Tampilkan banner setelah jeda 1.2 detik agar pengalaman pengguna mulus
      setTimeout(() => {
        setIsVisible(true);
      }, 1200);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Untuk iOS Safari (yang tidak mendukung beforeinstallprompt otomatis)
    if (isIosDevice && !checkStandalone) {
      setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    }

    // Listener saat aplikasi berhasil diinstall
    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsStandalone(true);
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      localStorage.removeItem('siak_pwa_dismissed_until');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handler klik tombol install otomatis (Android / Chrome)
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Fallback manual browser
      alert(
        'Untuk memasang di perangkat ini, klik menu tiga titik browser (⋮) lalu pilih "Tambahkan ke Layar Utama" atau "Install Aplikasi".'
      );
    }
  };

  // Handler tutup sementara (tunda 3 hari)
  const handleDismiss = () => {
    setIsVisible(false);
    // Simpan waktu jeda 3 hari ke depan
    const threeDaysLater = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem('siak_pwa_dismissed_until', String(threeDaysLater));
  };

  // Jangan tampilkan jika sudah standalone
  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING BANNER NOTIFIKASI INSTALL (BOTTOM ON MOBILE)      */}
      {/* ========================================================= */}
      <aside aria-label="Notifikasi Pemasangan Aplikasi" className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-700/80 space-y-3.5">
          {/* Header Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Aplikasi HP
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Siap Pasang
                  </span>
                </div>
                <h2 className="text-sm font-black text-white mt-0.5">
                  Pasang SIAK di Layar Utama HP
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Deskripsi Manfaat */}
          <p className="text-xs text-slate-300 leading-relaxed">
            Pasang langsung di HP Anda untuk akses presensi instan satu sentuhan tanpa perlu mengingat atau mengetik tautan web lagi!
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isIos ? (
              <button
                type="button"
                onClick={() => setShowIosGuide(true)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Share className="w-3.5 h-3.5" />
                <span>Petunjuk Pasang di iPhone</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Sekarang (Install)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MODAL PANDUAN KHUSUS IPHONE (IOS SAFARI)                  */}
      {/* ========================================================= */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Cara Pasang di iPhone (Safari)
                  </h3>
                  <p className="text-xs text-slate-500">Hanya membutuhkan 3 langkah mudah</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step by Step Guide Visual */}
            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="space-y-1">
                  <span className="font-bold block text-slate-900">
                    Ketuk tombol Bagikan (Share)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Di bilah menu bagian bawah browser Safari, ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah ke atas <Share className="w-3.5 h-3.5 inline text-blue-600" />).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="space-y-1">
                  <span className="font-bold block text-slate-900">
                    Pilih "Tambahkan ke Layar Utama"
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Geser menu pilihan ke bawah lalu ketuk <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="space-y-1">
                  <span className="font-bold block text-slate-900">
                    Ketuk "Tambah" (Add)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Di pojok kanan atas layar iPhone Anda, ketuk tombol <strong>"Tambah"</strong>. Ikon SIAK akan langsung muncul di beranda HP Anda!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer text-center"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
