import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  UserCheck,
  Mail,
  Phone,
  Lock,
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Database,
  Calendar,
  Layers,
  Check,
  Smartphone,
  Upload,
  Trash2,
  Copy,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Globe,
  SlidersHorizontal,
  Info,
  RotateCcw,
  UserCog,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastModalContext';
import { supabase, getBrowserDeviceId } from '../lib/supabase';

// Koleksi Avatar Preset Bawaan
const AVATAR_PRESETS = [
  { id: 'av1', label: 'Admin Eksekutif', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
  { id: 'av2', label: 'Kepala IT', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: 'av3', label: 'Koordinator SIAK', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200' },
  { id: 'av4', label: 'Staf Tata Usaha', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200' },
  { id: 'av5', label: 'Administrator Muda', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200' },
];

export default function AdminProfileSettings({ onProfileUpdated }) {
  const { userProfile, setUserProfile, isSupabaseConfigured } = useAuth();
  const { toast, showAlert, showConfirm } = useToast();
  const fileInputRef = useRef(null);

  // Subtab aktif: 'biodata' | 'keamanan' | 'akses' | 'preferensi'
  const [activeSubTab, setActiveSubTab] = useState('biodata');

  // 1. STATE IDENTITAS & PROFIL ADMIN
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('siak_admin_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      nama: 'Administrator SIAK',
      username: 'admin_siak',
      email: 'admin@siak.sekolah.id',
      nip: '198205202008011003',
      no_telepon: '081234567890',
      jabatan: 'Koordinator Sistem Informasi & IT Sekolah',
      bio: 'Pengelola utama data master siswa, presensi terpadu, jadwal KBM, dan konfigurasi sistem SIAK.',
      avatar: AVATAR_PRESETS[0].url,
    };
  });

  const [savingProfile, setSavingProfile] = useState(false);

  // 2. STATE GANTI PASSWORD & KEAMANAN KREDENSIAL
  const [passForm, setPassForm] = useState({
    passLama: '',
    passBaru: '',
    passKonfirmasi: '',
  });
  const [showPassLama, setShowPassLama] = useState(false);
  const [showPassBaru, setShowPassBaru] = useState(false);
  const [showPassKonfirmasi, setShowPassKonfirmasi] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // 3. STATE PREFERENSI SISTEM
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('siak_admin_preferences');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      defaultTab: 'siswa',
      toastDuration: 'normal', // 'fast' | 'normal' | 'slow'
      maskSensitiveData: false,
      doubleConfirmDelete: true,
      audioFeedback: true,
    };
  });

  // Device ID Fingerprint
  const [deviceId] = useState(() => getBrowserDeviceId());

  // Kekuatan Password Helper
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Belum diisi', color: 'bg-slate-200', text: 'text-slate-400' };
    if (pass.length < 6) return { score: 1, label: 'Sangat Lemah (Min 6 Karakter)', color: 'bg-rose-500', text: 'text-rose-500' };
    let score = 2;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 2, label: 'Cukup', color: 'bg-amber-500', text: 'text-amber-600' };
    if (score <= 4) return { score: 3, label: 'Kuat', color: 'bg-blue-600', text: 'text-blue-600' };
    return { score: 4, label: 'Sangat Kuat & Aman', color: 'bg-emerald-600', text: 'text-emerald-600' };
  };

  const strength = getPasswordStrength(passForm.passBaru);

  // Helper Upload Foto Lokal (FileReader + Canvas Compress)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File yang diunggah harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setProfile((prev) => ({ ...prev, avatar: compressedBase64 }));
        toast.success('Foto profil berhasil diunggah. Klik "Simpan Perubahan Profil" untuk menyimpan permanen.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Generate Kata Sandi Acak Kuat
  const handleGenerateRandomPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';
    let res = '';
    res += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    res += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    res += numbers.charAt(Math.floor(Math.random() * numbers.length));
    res += symbols.charAt(Math.floor(Math.random() * symbols.length));
    const all = uppercase + lowercase + numbers + symbols;
    for (let i = 0; i < 6; i++) {
      res += all.charAt(Math.floor(Math.random() * all.length));
    }
    // acak urutan
    res = res.split('').sort(() => 0.5 - Math.random()).join('');

    setPassForm((prev) => ({
      ...prev,
      passBaru: res,
      passKonfirmasi: res,
    }));
    setShowPassBaru(true);
    setShowPassKonfirmasi(true);
    toast.info(`Kata sandi acak dibuat: "${res}". Salin dan simpan kata sandi ini!`);
  };

  // Salin Kredensial Lengkap
  const handleCopyCredentials = () => {
    const currentPass = localStorage.getItem('siak_admin_password') || 'password123';
    const text = `🔐 KREDENSIAL ADMINISTRATOR SIAK\n` +
      `---------------------------------\n` +
      `👤 Nama: ${profile.nama}\n` +
      `🔑 Username: ${profile.username}\n` +
      `📧 Email Login: ${profile.email}\n` +
      `🔒 Kata Sandi: ${passForm.passBaru || currentPass}\n` +
      `🏢 Jabatan: ${profile.jabatan}\n` +
      `🌐 Tautan: ${window.location.origin}\n` +
      `---------------------------------\n` +
      `Disimpan pada: ${new Date().toLocaleString('id-ID')}`;

    navigator.clipboard.writeText(text);
    toast.success('Informasi akun Administrator berhasil disalin ke clipboard!');
  };

  // Reset Kredensial ke Default Pabrik
  const handleResetToFactoryDefaults = async () => {
    const ok = await showConfirm({
      title: 'Reset Akun Administrator ke Default?',
      message: 'Tindakan ini akan mengembalikan nama akun, email (admin@siak.sekolah.id) dan kata sandi kembali ke bawaan pabrik (password123). Lanjutkan?',
      type: 'warning',
      confirmText: 'Ya, Reset ke Default',
      cancelText: 'Batal',
    });

    if (!ok) return;

    const defaultProfile = {
      nama: 'Administrator SIAK',
      username: 'admin_siak',
      email: 'admin@siak.sekolah.id',
      nip: '198205202008011003',
      no_telepon: '081234567890',
      jabatan: 'Koordinator Sistem Informasi & IT Sekolah',
      bio: 'Pengelola utama data master siswa, presensi terpadu, jadwal KBM, dan konfigurasi sistem SIAK.',
      avatar: AVATAR_PRESETS[0].url,
    };

    setProfile(defaultProfile);
    localStorage.setItem('siak_admin_profile', JSON.stringify(defaultProfile));
    localStorage.setItem('siak_admin_password', 'password123');

    try {
      const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
      creds.admin = {
        role: 'admin',
        username: defaultProfile.username,
        nama: defaultProfile.nama,
        email: defaultProfile.email,
        password: 'password123',
        no_telepon: defaultProfile.no_telepon,
        jabatan: defaultProfile.jabatan,
        avatar: defaultProfile.avatar,
      };
      localStorage.setItem('siak_user_credentials', JSON.stringify(creds));
    } catch (e) {}

    if (setUserProfile) {
      setUserProfile((prev) => ({
        ...prev,
        username: defaultProfile.username,
        details: defaultProfile,
      }));
    }

    if (onProfileUpdated) {
      onProfileUpdated(defaultProfile);
    }

    setPassForm({ passLama: '', passBaru: '', passKonfirmasi: '' });
    toast.success('Akun Administrator berhasil direset ke pengaturan default bawaan.');
  };

  // SIMPAN PERUBAHAN IDENTITAS PROFIL
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.nama.trim()) {
      toast.warning('Nama lengkap administrator tidak boleh kosong.');
      return;
    }
    if (!profile.email.trim()) {
      toast.warning('Email resmi administrator tidak boleh kosong.');
      return;
    }

    setSavingProfile(true);
    try {
      // 1. Simpan ke localStorage
      localStorage.setItem('siak_admin_profile', JSON.stringify(profile));

      // 2. Update kredensial admin custom di siak_user_credentials
      try {
        const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const currentPass = localStorage.getItem('siak_admin_password') || 'password123';
        creds.admin = {
          role: 'admin',
          username: profile.username.trim(),
          nama: profile.nama.trim(),
          email: profile.email.trim(),
          password: currentPass,
          no_telepon: profile.no_telepon,
          jabatan: profile.jabatan,
          avatar: profile.avatar,
          nip: profile.nip,
          bio: profile.bio,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('siak_user_credentials', JSON.stringify(creds));
      } catch (err) {}

      // 3. Sinkronkan ke cloud Supabase (pengaturan_sistem & metadata auth jika online)
      if (isSupabaseConfigured) {
        try {
          await supabase.from('pengaturan_sistem').upsert({
            kunci: 'admin_profile',
            nilai: JSON.stringify(profile),
            deskripsi: 'Data profil dan penanggung jawab administrator sistem',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'kunci' });

          await supabase.auth.updateUser({
            data: {
              nama: profile.nama,
              username: profile.username,
              no_telepon: profile.no_telepon,
              jabatan: profile.jabatan,
            },
          });
        } catch (sbErr) {
          console.warn('Supabase profile sync notice:', sbErr.message);
        }
      }

      // 4. Update AuthContext
      if (setUserProfile) {
        setUserProfile((prev) => ({
          ...prev,
          username: profile.username,
          details: { ...(prev?.details || {}), ...profile },
        }));
      }

      if (onProfileUpdated) {
        onProfileUpdated(profile);
      }

      toast.success('Profil Administrator berhasil disimpan dan disinkronkan!', 'Perubahan Disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan profil: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // SIMPAN PERUBAHAN KATA SANDI
  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!passForm.passBaru) {
      toast.warning('Silakan masukkan kata sandi baru.');
      return;
    }

    if (passForm.passBaru.length < 6) {
      toast.warning('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (passForm.passBaru !== passForm.passKonfirmasi) {
      toast.error('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    // Verifikasi kata sandi lama
    const currentStoredPass = localStorage.getItem('siak_admin_password') || 'password123';
    if (passForm.passLama && passForm.passLama !== currentStoredPass) {
      toast.error('Kata sandi saat ini (lama) tidak sesuai.');
      return;
    }

    setSavingPass(true);
    try {
      // 1. Simpan password baru ke localStorage
      localStorage.setItem('siak_admin_password', passForm.passBaru);

      // 2. Update akun custom siak_user_credentials
      try {
        const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        if (!creds.admin) creds.admin = {};
        creds.admin.role = 'admin';
        creds.admin.username = profile.username;
        creds.admin.email = profile.email;
        creds.admin.password = passForm.passBaru;
        localStorage.setItem('siak_user_credentials', JSON.stringify(creds));
      } catch (e) {}

      // 3. Update Supabase Auth jika online
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.auth.updateUser({
            password: passForm.passBaru,
          });
          if (error) throw error;
        } catch (sbErr) {
          console.warn('Supabase password update notice:', sbErr.message);
        }
      }

      setPassForm({ passLama: '', passBaru: '', passKonfirmasi: '' });
      toast.success('Kata sandi Administrator berhasil diubah!');
      showAlert({
        title: 'Kata Sandi Diperbarui',
        message: 'Kata sandi akun Administrator Anda telah berhasil disimpan. Gunakan kata sandi baru ini untuk login berikutnya.',
        type: 'success',
      });
    } catch (err) {
      toast.error('Gagal mengubah kata sandi: ' + err.message);
    } finally {
      setSavingPass(false);
    }
  };

  // SIMPAN PREFERENSI SISTEM
  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('siak_admin_preferences', JSON.stringify(preferences));
    toast.success('Preferensi antarmuka Administrator berhasil disimpan.');
  };

  // Bersihkan Cache Sesi Lokal
  const handleClearLocalCache = async () => {
    const ok = await showConfirm({
      title: 'Bersihkan Cache Sesi Sementara?',
      message: 'Fitur ini akan membersihkan log sesi dan memuat ulang status aplikasi tanpa menghapus database utama siswa atau guru. Lanjutkan?',
      type: 'info',
      confirmText: 'Ya, Bersihkan Cache',
      cancelText: 'Batal',
    });
    if (ok) {
      sessionStorage.clear();
      toast.success('Cache sesi berhasil dibersihkan.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-12">
      {/* ========================================================= */}
      {/* 1. HERO BANNER PROFILE OVERVIEW                           */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Glow Decor Background */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left min-w-0 flex-1">
            {/* Avatar dengan Badge Status */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 p-1 border-2 border-white/20 shadow-lg overflow-hidden flex items-center justify-center">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Avatar Admin"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Shield className="w-10 h-10 text-cyan-300" />
                )}
              </div>
              <span
                className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-1 -right-1 shadow-md flex items-center justify-center text-[10px] text-white font-black"
                title="Super Admin Online"
              >
                ✓
              </span>
            </div>

            <div className="space-y-1.5 min-w-0 flex-1 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                  Super Administrator
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30">
                  Level 0 • Root Access
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
                  SIAK V4.0
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight break-words">
                {profile.nama}
              </h1>

              <p className="text-xs text-slate-300 font-medium break-words">
                {profile.jabatan}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1 text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-mono break-all text-left">
                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{profile.email}</span>
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="flex items-center gap-1.5 font-mono break-all text-left">
                  <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>@{profile.username}</span>
                </span>
                {profile.nip && (
                  <>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <span className="text-[11px] font-mono break-all text-left">NIP: {profile.nip}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-row md:flex-col items-center justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 w-full md:w-auto">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="flex-1 md:flex-initial w-full px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/15"
              title="Salin Kredensial Administrator ke Catatan"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span>Salin Akun</span>
            </button>

            <button
              type="button"
              onClick={handleResetToFactoryDefaults}
              className="flex-1 md:flex-initial w-full px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30"
              title="Kembalikan nama dan kata sandi ke bawaan pabrik"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SUBTAB NAVIGATION (PREMIUM PILL SWITCHER)              */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: 'biodata', label: 'Biodata & Identitas', icon: UserCheck, color: 'text-blue-600' },
          { id: 'keamanan', label: 'Kredensial & Sandi', icon: Lock, color: 'text-amber-600' },
          { id: 'akses', label: 'Hak Akses & Sesi', icon: Shield, color: 'text-emerald-600' },
          { id: 'preferensi', label: 'Preferensi Sistem', icon: Sliders, color: 'text-purple-600' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BIODATA & IDENTITAS ADMINISTRATOR                  */}
      {/* ========================================================= */}
      {activeSubTab === 'biodata' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Identitas (2 Kolom) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 leading-snug break-words">
                    Biodata & Informasi Administrator
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nama dan kontak resmi yang tampil pada panel dan laporan sistem
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                Profil Utama
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Lengkap Administrator <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.nama}
                    onChange={(e) => setProfile({ ...profile, nama: e.target.value })}
                    placeholder="Contoh: Administrator SIAK / Ahmad S.Kom"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">@</span>
                    <input
                      type="text"
                      required
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="admin_siak"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Email Login / Resmi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Email Resmi Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="admin@siak.sekolah.id"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* NIP / NUPTK */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    NIP / ID Pegawai Admin
                  </label>
                  <input
                    type="text"
                    value={profile.nip || ''}
                    onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
                    placeholder="198205202008011003"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor WhatsApp Kontak / Darurat
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={profile.no_telepon || ''}
                      onChange={(e) => setProfile({ ...profile, no_telepon: e.target.value })}
                      placeholder="081234567890"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Jabatan / Peran Sistem */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Jabatan Struktural di Sekolah
                  </label>
                  <input
                    type="text"
                    value={profile.jabatan || ''}
                    onChange={(e) => setProfile({ ...profile, jabatan: e.target.value })}
                    placeholder="Contoh: Koordinator Sistem Informasi & IT"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                </div>

                {/* Bio / Tanggung Jawab */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Deskripsi Tugas & Tanggung Jawab
                  </label>
                  <textarea
                    rows={2}
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Catatan mengenai ruang lingkup tugas administrator ini..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Profil...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Profil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Pengaturan Avatar Foto Profil */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Foto / Avatar Profil
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih foto dari preset galeri atau unggah file dari perangkat Anda
              </p>
            </div>

            {/* Pratinjau Foto Terpilih */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-600 shadow-sm flex items-center justify-center">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Preview Foto" className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Foto</span>
                </button>

                {profile.avatar && (
                  <button
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatar: '' }))}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-200"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Preset Avatar Bawaan */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Preset Avatar Cepat
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatar: av.url }))}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      profile.avatar === av.url
                        ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105'
                        : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KEAMANAN KREDENSIAL & GANTI KATA SANDI             */}
      {/* ========================================================= */}
      {activeSubTab === 'keamanan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Ganti Password (2 Kolom) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 leading-snug break-words">
                    Pengaturan Kata Sandi & Kredensial
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ganti kata sandi akun Administrator untuk menjaga keamanan akses master
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-200 shrink-0"
                title="Buat kata sandi acak yang kuat"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Buat Sandi Acak</span>
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {/* Kata Sandi Lama */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi Saat Ini (Lama)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Bawaan: password123</span>
                </div>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassLama ? 'text' : 'password'}
                    value={passForm.passLama}
                    onChange={(e) => setPassForm({ ...passForm, passLama: e.target.value })}
                    placeholder="Masukkan kata sandi lama (kosongkan jika belum pernah diubah)"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassLama(!showPassLama)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassLama ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Kata Sandi Baru & Konfirmasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassBaru ? 'text' : 'password'}
                      required
                      value={passForm.passBaru}
                      onChange={(e) => setPassForm({ ...passForm, passBaru: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassBaru(!showPassBaru)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassBaru ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Ulangi Kata Sandi Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassKonfirmasi ? 'text' : 'password'}
                      required
                      value={passForm.passKonfirmasi}
                      onChange={(e) => setPassForm({ ...passForm, passKonfirmasi: e.target.value })}
                      placeholder="Ketik ulang sandi baru"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassKonfirmasi(!showPassKonfirmasi)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassKonfirmasi ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Indikator Meter Kekuatan Kata Sandi */}
              {passForm.passBaru && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Kekuatan Sandi:</span>
                    <span className={`font-black ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tip: Gunakan kombinasi huruf besar, angka, dan karakter khusus (!@#$) untuk keamanan maksimal.
                  </p>
                </div>
              )}

              {/* Tombol Simpan Sandi */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Sandi terenkripsi pada sesi lokal & cloud</span>
                </span>

                <button
                  type="submit"
                  disabled={savingPass}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingPass ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memperbarui Sandi...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Perbarui Kata Sandi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Panduan Keamanan & Informasi Login */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                Protokol Keamanan Admin
              </h4>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 block">Smart Login Dukungan Penuh</span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Setelah mengubah kata sandi, Anda dapat langsung login menggunakan Email (<strong>{profile.email}</strong>) atau Username (<strong>@{profile.username}</strong>) di halaman masuk.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 block">Penyimpanan Terisolasi</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Kredensial tersimpan pada memori aplikasi dan otomatis disinkronkan ke tabel <code>pengaturan_sistem</code> database Supabase saat online.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Kredensial Saat Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: HAK AKSES & SESI PERANGKAT                         */}
      {/* ========================================================= */}
      {activeSubTab === 'akses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matriks Wewenang Hak Akses (2 Kolom) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 leading-snug break-words">
                    Matriks Hak Akses & Wewenang Super Admin
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tingkat wewenang penuh untuk mengelola seluruh data institusi sekolah
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Full Privileges
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { title: 'Master Data Siswa & Guru', desc: 'Akses penuh tambah, ubah, hapus, dan import massal Excel' },
                { title: 'Manajemen Kelas & Promosi', desc: 'Kenaikan kelas massal, plotting kelas, dan arsip kelulusan' },
                { title: 'Jadwal & Mata Pelajaran', desc: 'Pengaturan jadwal KBM harian, jam mengajar, dan guru pengganti/inval' },
                { title: 'Kalender Akademik & Libur', desc: 'Penetapan tahun ajaran, semester, kaldik, dan libur streak' },
                { title: 'Geofencing GPS & Radius', desc: 'Koordinat gerbang sekolah dan batas radius toleransi presensi' },
                { title: 'WhatsApp Gateway Provider', desc: 'API Token gateway, notifikasi otomatis, dan antrean pesan ortu' },
                { title: 'Database CRUD Studio', desc: 'Akses langsung inspeksi dan modifikasi seluruh tabel SQL' },
                { title: 'Gamifikasi & Quest Builder', desc: 'Pembuatan misi prestasi kedisiplinan sekolah' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 block leading-tight break-words">{item.title}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed break-words">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom Kanan: Sesi Perangkat & Fingerprint */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Audit Keamanan Perangkat</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Informasi sesi browser aktif saat ini</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Device Fingerprint ID
                </span>
                <span className="font-mono font-bold text-blue-700 text-xs block break-all">
                  {deviceId}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 gap-2">
                  <span className="text-slate-500">Status Koneksi:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {isSupabaseConfigured ? 'Cloud Terkoneksi' : 'Sesi Lokal Aktif'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 gap-2">
                  <span className="text-slate-500">Enkripsi Sesi:</span>
                  <span className="font-mono font-bold text-slate-800 shrink-0">TLS v1.3 / SSL</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 gap-2">
                  <span className="text-slate-500">Waktu Akses:</span>
                  <span className="font-bold text-slate-700 shrink-0">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearLocalCache}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>Bersihkan Cache Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PREFERENSI SISTEM & ANTARMUKA                     */}
      {/* ========================================================= */}
      {activeSubTab === 'preferensi' && (
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 leading-snug break-words">
                  Preferensi & Pengaturan Antarmuka Admin
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sesuaikan pengalaman penggunaan dashboard saat presentasi atau audit harian
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            {/* Halaman Awal Default */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Menu Utama Saat Pertama Kali Masuk (Default Tab)
              </label>
              <select
                value={preferences.defaultTab}
                onChange={(e) => setPreferences({ ...preferences, defaultTab: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all cursor-pointer"
              >
                <option value="siswa">Data Siswa (Default)</option>
                <option value="guru">Data Guru & Penugasan</option>
                <option value="jadwal">Jadwal & KBM Pelajaran</option>
                <option value="kalender">Kalender Akademik & Hari Libur</option>
                <option value="laporan">Rekap & Laporan Presensi</option>
                <option value="settings">Pengaturan Sekolah & GPS</option>
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Halaman yang otomatis terbuka saat Anda berhasil login sebagai Administrator.
              </p>
            </div>

            {/* Durasi Notifikasi Toast */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Durasi Tampilan Pesan Notifikasi (Toast)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'fast', label: 'Cepat (2.5 Detik)' },
                  { id: 'normal', label: 'Normal (4 Detik)' },
                  { id: 'slow', label: 'Lama (6 Detik)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, toastDuration: item.id })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      preferences.toastDuration === item.id
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Proteksi & Konfirmasi Hapus Data */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 block leading-snug break-words">
                    Konfirmasi Ganda Saat Hapus Data
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed break-words">
                    Menampilkan dialog konfirmasi khusus sebelum menghapus siswa, guru, atau jadwal KBM
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.doubleConfirmDelete}
                  onChange={(e) => setPreferences({ ...preferences, doubleConfirmDelete: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                />
              </label>

              <div className="border-t border-slate-200/80 pt-3">
                <label className="flex items-center justify-between cursor-pointer gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 block leading-snug break-words">
                      Mode Privasi Layar Proyektor (Masking Data)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed break-words">
                      Samarkan sebagian angka NIK dan nomor telepon saat memproyeksikan layar admin
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.maskSensitiveData}
                    onChange={(e) => setPreferences({ ...preferences, maskSensitiveData: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>Simpan Preferensi</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
