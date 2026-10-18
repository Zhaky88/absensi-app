import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import {
  QrCode,
  UserCheck,
  Lock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  Copy,
  Check,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
} from 'lucide-react';
import { useToast } from '../context/ToastModalContext';

export default function LoginPage() {
  const { smartLogin, loginAsDemoRole } = useAuth();
  const { toast, showAlert } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedRole, setCopiedRole] = useState(null);

  function handleQuickDemoLogin(role) {
    const res = loginAsDemoRole(role);
    if (res && res.success === false) {
      showAlert({
        title: 'Portal Dinonaktifkan',
        message: res.error,
        type: 'warning',
        confirmText: 'Mengerti',
      });
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await smartLogin(identifier, password);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message.includes('Invalid login')
          ? 'Identifier atau Password tidak cocok.'
          : err.message || 'Gagal login. Periksa koneksi Anda.'
      );
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(acc) {
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    setCopiedRole(acc.role);
    setTimeout(() => setCopiedRole(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      {/* Top Header Asli Proyek */}
      <header className="gradient-header text-white shadow-xl py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl p-1 flex items-center justify-center shadow-inner border border-white/20">
              <img
                src="https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2"
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-lg leading-tight tracking-wide">
                SMP NEGERI 2 KOTA BANGUN
              </h1>
              <p className="text-[11px] sm:text-xs text-cyan-200 flex items-center gap-1.5 font-medium">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" /> SIAK Anti-Cheat V4.0 + Gamifikasi
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-xs font-bold bg-white/15 px-3 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
            Sistem Absensi Digital
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-lg w-full mx-auto p-4 sm:p-6 my-auto space-y-5">
        {/* Login Card Glassmorphism */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Masuk ke SIAK
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan Akun Pengguna (NIS / NIP / Email) Anda
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Akun Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="NIS / NIP / Email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                Guru masukkan NIP, Siswa masukkan NIS, Admin/Ortu gunakan Email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </span>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* DEMO NOTE BOX (KOTAK CATATAN AKUN DEMO) - TEMA BIRU TERANG */}
        <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" /> Akun Demo Setiap Role (Klik untuk Pilih)
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Pass: password123
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Murid */}
            <div
              onClick={() => fillDemoAccount(DEMO_ACCOUNTS.murid)}
              className="group p-3 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Murid / Siswa
                </span>
                {copiedRole === 'murid' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">{DEMO_ACCOUNTS.murid.identifier}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">NIS: Budi Pratama (VII-A)</div>
            </div>

            {/* Guru */}
            <div
              onClick={() => fillDemoAccount(DEMO_ACCOUNTS.guru)}
              className="group p-3 rounded-2xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-teal-600 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Guru Pengajar
                </span>
                {copiedRole === 'guru' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">{DEMO_ACCOUNTS.guru.identifier}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">NIP: Bpk. Ahmad Fauzi, S.Pd</div>
            </div>

            {/* Admin */}
            <div
              onClick={() => fillDemoAccount(DEMO_ACCOUNTS.admin)}
              className="group p-3 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Administrator
                </span>
                {copiedRole === 'admin' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">{DEMO_ACCOUNTS.admin.identifier}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pengaturan GPS & Kartu QR</div>
            </div>

            {/* Ortu */}
            <div
              onClick={() => fillDemoAccount(DEMO_ACCOUNTS.ortu)}
              className="group p-3 rounded-2xl bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Orang Tua / Wali
                </span>
                {copiedRole === 'ortu' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                )}
              </div>
              <div className="text-xs font-bold text-slate-800">{DEMO_ACCOUNTS.ortu.identifier}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Portal Notifikasi WA</div>
            </div>
          </div>


          {/* Quick Jump Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Demo cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('murid')}
                className="px-2.5 py-1 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Masuk Murid
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guru')}
                className="px-2.5 py-1 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-700 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Masuk Guru
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Masuk Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ortu')}
                className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-[10px] transition-colors cursor-pointer"
              >
                Masuk Ortu
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200/60">
        © 2026 SMP NEGERI 2 KOTA BANGUN — SIAK Anti-Cheat V4.0 Jamstack
      </footer>
    </div>
  );
}
