import React, { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastModalContext';
import LoginPage from './pages/LoginPage';
import MuridDashboard from './pages/MuridDashboard';
import GuruDashboard from './pages/GuruDashboard';
import OrtuDashboard from './pages/OrtuDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldAlert } from 'lucide-react';

import PwaInstallPrompt from './components/PwaInstallPrompt';

export default function App() {
  const { session, userProfile, loading, logout } = useAuth() || {};
  const { showConfirm } = useToast() || {};

  // Intersep tombol Back pada browser / gesture swipe back di HP saat user sedang login
  useEffect(() => {
    if (!session || !userProfile) return;

    // Tambahkan riwayat state agar event popstate bisa ditangkap tanpa mereset hash tab
    window.history.pushState({ inAppSession: true }, '', window.location.href);

    let isPrompting = false;

    const handlePopState = async () => {
      // Jika modal konfirmasi sedang terbuka, abaikan penekanan berulang
      if (isPrompting) {
        window.history.pushState({ inAppSession: true }, '', window.location.href);
        return;
      }

      isPrompting = true;
      // Pertahankan riwayat state agar aplikasi tidak keluar otomatis saat user membatalkan
      window.history.pushState({ inAppSession: true }, '', window.location.href);

      try {
        const confirmed = await showConfirm({
          title: 'Konfirmasi Keluar Aplikasi',
          message: 'Anda menekan tombol kembali (Back) pada browser. Apakah Anda yakin ingin keluar dari sesi akun dan melakukan log out?',
          type: 'warning',
          confirmText: 'Ya, Log Out',
          cancelText: 'Tetap di Aplikasi',
        });

        if (confirmed) {
          await logout();
        }
      } finally {
        isPrompting = false;
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [session, userProfile, showConfirm, logout]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wide">Memuat Sesi SIAK Anti-Cheat...</span>
      </div>
    );
  }

  const renderContent = () => {
    // Jika belum login, tampilkan Smart Login
    if (!session || !userProfile) {
      return <LoginPage />;
    }

    // Router Berdasarkan Role
    switch (userProfile.role) {
      case 'murid':
        return <MuridDashboard />;
      case 'guru':
        return <GuruDashboard />;
      case 'ortu':
        return <OrtuDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
            <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
            <h2 className="text-base font-bold text-white">Role Pengguna Tidak Dikenal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Akun Anda terdaftar tetapi belum memiliki peranan (role) yang valid di sistem.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      {renderContent()}
      <PwaInstallPrompt />
    </>
  );
}
