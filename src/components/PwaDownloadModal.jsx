import React, { useState } from 'react';
import {
  Download,
  X,
  Smartphone,
  Laptop,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function PwaDownloadModal({
  isOpen,
  onClose,
  deferredPrompt = null,
  isIos = false,
  isStandalone = false,
  onInstalled = null,
}) {
  const [activeTab, setActiveTab] = useState(isIos ? 'ios' : 'android');
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  async function handleDirectInstall() {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted' && onInstalled) {
          onInstalled();
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setInstalling(false);
        onClose();
      }
    } else if (isIos) {
      setActiveTab('ios');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in select-none">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-600 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Download className="w-6 h-6 text-emerald-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Pasang Aplikasi (PWA)</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-400 text-slate-900 uppercase">
                  V4.0
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                SMP Negeri 2 Kota Bangun • Akses Cepat Tanpa Kuota Berlebih
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer relative z-10"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Standalone atau Tombol 1-Klik Install */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          {isStandalone ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Aplikasi Sudah Terpasang!</span>
                <span className="text-[11px] text-emerald-700">
                  Aplikasi ini sudah berjalan di layar utama (mode PWA mandiri).
                </span>
              </div>
            </div>
          ) : deferredPrompt ? (
            <button
              type="button"
              onClick={handleDirectInstall}
              disabled={installing}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'Memproses Pemasangan...' : 'Pasang Sekarang (1-Klik Cepat)'}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-200">
              <span className="flex items-center gap-2 font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Pemasangan Mandiri PWA
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Gratis & Ringan</span>
            </div>
          )}
        </div>

        {/* Tab Pemilihan Perangkat */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5">
          {[
            { id: 'android', label: 'Android (Chrome/Edge)', icon: Smartphone },
            { id: 'ios', label: 'iPhone / iPad (Safari)', icon: Smartphone },
            { id: 'desktop', label: 'Komputer / Laptop', icon: Laptop },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Panduan Pemasangan Sesuai Perangkat */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700">
          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Buka melalui Browser Google Chrome atau Microsoft Edge</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <p>
                  Jika muncul pop-up banner di bawah layar <strong>"Tambahkan ke Layar Utama"</strong> atau{' '}
                  <strong>"Install Aplikasi"</strong>, cukup tekan tombol tersebut.
                </p>
                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700">Atau lewat Menu Browser:</span>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Tekan ikon <strong>Titik Tiga (⋮)</strong> di sudut kanan atas browser.</li>
                    <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                    <li>Konfirmasi pemasangan. Ikon SIAK akan langsung muncul di layar HP Anda!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                  🍏
                </span>
                <span>Langkah Pemasangan di iPhone / iPad (Safari)</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="block text-slate-800">Buka link web ini di browser Safari</strong>
                    <span className="text-[11px] text-slate-500">
                      Apple iOS mewajibkan pemasangan PWA dilakukan melalui browser bawaan Safari.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="block text-slate-800 flex items-center gap-1.5">
                      Tekan tombol Bagikan / Share <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Ikon kotak dengan panah ke atas yang terletak di bilah navigasi bawah Safari.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="block text-slate-800 flex items-center gap-1.5">
                      Pilih "Tambah ke Layar Utama" <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Gulir ke bawah pada menu opsi hingga menemukan "Add to Home Screen".
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <strong className="block text-slate-800">Tekan "Tambah / Add" di sudut kanan atas</strong>
                    <span className="text-[11px] text-slate-500">
                      Ikon aplikasi SIAK akan otomatis tampil di layar utama iPhone Anda seperti aplikasi App Store!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                  💻
                </span>
                <span>Pemasangan di PC / Laptop (Windows, Mac, Linux)</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
                <p className="text-slate-700 leading-relaxed">
                  Pada browser Chrome atau Edge di komputer, perhatikan <strong>Address Bar (bilah alamat URL)</strong> di sebelah kanan:
                </p>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono text-slate-800">
                  <span className="truncate">https://.../login</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center gap-1 shrink-0">
                    <Download className="w-3 h-3" /> [Install App]
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Klik ikon komputer kecil dengan panah unduh tersebut, lalu klik <strong>"Install"</strong>. Aplikasi akan terbuka di jendela independen tanpa bilah browser.
                </p>
              </div>
            </div>
          )}

          {/* Keunggulan PWA */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Keunggulan Menggunakan PWA:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-700">Ringan &lt; 2 MB</span>
              </div>
              <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700">Anti-Cheat Geofence</span>
              </div>
              <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="font-semibold text-slate-700">Bebas Iklan & PlayStore</span>
              </div>
              <div className="p-2 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold text-slate-700">Update Otomatis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            SIAK Anti-Cheat V4.0 • PWA Standard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
