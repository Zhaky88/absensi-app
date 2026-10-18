import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MuridDashboard from './pages/MuridDashboard';
import GuruDashboard from './pages/GuruDashboard';
import OrtuDashboard from './pages/OrtuDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { ShieldAlert } from 'lucide-react';

import PwaInstallPrompt from './components/PwaInstallPrompt';

export default function App() {
  const { session, userProfile, loading } = useAuth();

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
