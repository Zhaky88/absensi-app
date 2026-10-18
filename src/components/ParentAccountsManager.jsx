import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Send,
  Phone,
  Power,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Folder,
  Plus,
  Trash2,
  Lock,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '../context/ToastModalContext';
import { supabase } from '../lib/supabase';
import PublicAttendanceCheckerModal from './PublicAttendanceCheckerModal';

export default function ParentAccountsManager({ students = [], classes = [], onRefreshStudents }) {
  const { toast, showConfirm, showAlert } = useToast();

  // 1. State Saklar Master Global Portal Orang Tua
  const [parentPortalEnabled, setParentPortalEnabled] = useState(() => {
    return localStorage.getItem('siak_parent_portal_enabled') !== 'false';
  });

  // 2. Kredensial Akun yang tersimpan di LocalStorage / Sistem
  const [customCreds, setCustomCreds] = useState({});

  // 3. Filter & Pencarian
  const [selectedTingkat, setSelectedTingkat] = useState('semua');
  const [selectedKelasId, setSelectedKelasId] = useState('semua');
  const [filterAccountStatus, setFilterAccountStatus] = useState('semua'); // 'semua' | 'punya_akun' | 'belum_punya_akun'
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Modal Kelola Kredensial
  const [modalStudent, setModalStudent] = useState(null);
  const [accountFormData, setAccountFormData] = useState({
    username: '',
    password: '',
    status: 'aktif',
    nama_ortu: '',
    no_whatsapp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  // 5. Modal Cek Kehadiran Publik (Tanpa Login)
  const [publicCheckerOpen, setPublicCheckerOpen] = useState(false);
  const [publicCheckerNis, setPublicCheckerNis] = useState('');

  // Muat kredensial saat komponen dimuat
  useEffect(() => {
    loadCredentials();
  }, []);

  function loadCredentials() {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
      setCustomCreds(saved);
    } catch (e) {
      console.warn('Gagal membaca kredensial akun:', e);
    }
  }

  // Toggle Saklar Master Portal Ortu
  async function handleTogglePortal() {
    const nextState = !parentPortalEnabled;
    const ok = await showConfirm({
      title: nextState ? 'Aktifkan Portal Login Orang Tua?' : 'Nonaktifkan Portal Login Orang Tua?',
      message: nextState
        ? 'Orang tua yang telah memiliki akun akan dapat masuk kembali ke portal absensi.'
        : 'Akses login portal orang tua akan dimatikan sementara. Namun orang tua tetap dapat menerima laporan via WhatsApp atau mengecek via nomor NIS secara mandiri.',
      confirmText: nextState ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan Sementara',
      type: nextState ? 'info' : 'warning',
    });

    if (ok) {
      setParentPortalEnabled(nextState);
      localStorage.setItem('siak_parent_portal_enabled', nextState ? 'true' : 'false');
      toast.success(
        nextState
          ? 'Portal Login Orang Tua sekarang AKTIF.'
          : 'Portal Login Orang Tua DINONAKTIFKAN sementara (Cek mandiri via NIS tetap aktif).',
        'Status Portal Diperbarui'
      );
    }
  }

  // Salin Link Cek Mandiri Siswa
  function handleCopyPublicCheckLink() {
    const publicUrl = `${window.location.origin}/?cek_presensi=mandiri`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Tautan Cek Presensi Mandiri disalin ke clipboard! Bagikan tautan ini ke grup WhatsApp wali murid.', 'Tautan Disalin');
  }

  // Helper untuk mendapatkan kredensial akun orang tua siswa
  function getParentAccount(student) {
    if (!student) return null;
    const key = `ortu_${student.nis}`;
    return customCreds[key] || null;
  }

  // Buka Modal Buat / Edit Akun
  function openManageAccountModal(student) {
    setModalStudent(student);
    const existing = getParentAccount(student);
    const defaultUsername = `ortu_${student.nis}`;
    const defaultPassword = student.orang_tua?.no_whatsapp
      ? `ortu${student.orang_tua.no_whatsapp.slice(-4)}`
      : `ortu${student.nis.slice(-4) || '123'}`;

    setAccountFormData({
      username: existing?.username || defaultUsername,
      password: existing?.password || defaultPassword,
      status: existing?.status || 'aktif',
      nama_ortu: student.orang_tua?.nama_ayah || student.orang_tua?.nama_ibu || `Wali dari ${student.nama}`,
      no_whatsapp: student.orang_tua?.no_whatsapp || '',
    });
    setShowPassword(false);
    setCopiedText(false);
  }

  // Generate Password Acak
  function handleGeneratePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'ortu';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccountFormData((prev) => ({ ...prev, password: pass }));
  }

  // Simpan Kredensial Akun Ortu
  async function handleSaveAccount(e) {
    e.preventDefault();
    if (!modalStudent) return;

    setSavingAccount(true);
    try {
      const key = `ortu_${modalStudent.nis}`;
      const payload = {
        role: 'ortu',
        nis: modalStudent.nis,
        nama: accountFormData.nama_ortu || `Wali dari ${modalStudent.nama}`,
        username: accountFormData.username.trim(),
        email: `${accountFormData.username.trim()}@sekolah.id`,
        password: accountFormData.password.trim(),
        status: accountFormData.status,
        no_whatsapp: accountFormData.no_whatsapp.trim(),
        details: {
          nis: modalStudent.nis,
          nama_siswa: modalStudent.nama,
          nama_ayah: accountFormData.nama_ortu,
          no_whatsapp: accountFormData.no_whatsapp.trim(),
          kelas: modalStudent.kelas?.nama_kelas || '-',
        },
        updated_at: new Date().toISOString(),
      };

      const updated = { ...customCreds, [key]: payload };
      localStorage.setItem('siak_user_credentials', JSON.stringify(updated));
      setCustomCreds(updated);

      toast.success(`Akun login orang tua untuk "${modalStudent.nama}" berhasil disimpan!`, 'Akun Tersimpan');
      setModalStudent(null);
    } catch (err) {
      toast.error(`Gagal menyimpan akun: ${err.message}`);
    } finally {
      setSavingAccount(false);
    }
  }

  // Hapus Kredensial Akun Ortu
  async function handleDeleteAccount(student) {
    const ok = await showConfirm({
      title: 'Hapus Akun Login Orang Tua?',
      message: `Akun portal untuk wali dari siswa "${student.nama}" akan dihapus. Orang tua tetap bisa menerima notifikasi WhatsApp atau cek via NIS.`,
      confirmText: 'Hapus Akun',
      type: 'warning',
    });

    if (ok) {
      const key = `ortu_${student.nis}`;
      const updated = { ...customCreds };
      delete updated[key];
      localStorage.setItem('siak_user_credentials', JSON.stringify(updated));
      setCustomCreds(updated);
      toast.success(`Akun orang tua untuk ${student.nama} berhasil dihapus.`);
      if (modalStudent?.nis === student.nis) setModalStudent(null);
    }
  }

  // Format Pesan WhatsApp Kredensial
  function buildWhatsAppCredentialMessage(student, account) {
    const appUrl = window.location.origin;
    const namaWali = account?.nama || student.orang_tua?.nama_ayah || student.orang_tua?.nama_ibu || 'Bapak/Ibu Wali Siswa';
    const username = account?.username || `ortu_${student.nis}`;
    const password = account?.password || 'password123';
    const publicUrl = `${appUrl}/?cek_presensi=mandiri`;

    return `*INFORMASI AKSES PORTAL PRESENSI SISWA*\n*SMP NEGERI 2 KOTA BANGUN*\n\n` +
      `Yth. *${namaWali}*,\n` +
      `Wali dari ananda: *${student.nama}* (Kelas ${student.kelas?.nama_kelas || '-'})\n\n` +
      `Untuk memantau presensi dan kedisiplinan belajar ananda, sekolah menyediakan 2 opsi:\n\n` +
      `📌 *OPSI 1: MASUK KE PORTAL APLIKASI (OPSIONAL)*\n` +
      `🔗 Tautan: ${appUrl}\n` +
      `👤 Username: *${username}*\n` +
      `🔑 Password: *${password}*\n\n` +
      `📌 *OPSI 2: CEK MANDIRI TANPA LOGIN (PRAKTIS)*\n` +
      `Cukup buka tautan berikut dan masukkan NIS ananda (*${student.nis}*):\n` +
      `🔗 Tautan: ${publicUrl}\n\n` +
      `_Pesan ini dikirim otomatis oleh Sistem Administrasi Presensi SMPN 2 Kota Bangun._`;
  }

  // Kirim Kredensial ke WhatsApp
  function handleSendWhatsApp(student, account) {
    let isWaEnabled = true;
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      if (saved.wa_notifikasi_aktif === 'false') isWaEnabled = false;
    } catch (e) {}

    if (!isWaEnabled) {
      showAlert({
        title: 'Fitur Kirim WhatsApp Dinonaktifkan',
        message: 'Layanan pengiriman pesan WhatsApp saat ini sedang dimatikan oleh Administrator di menu Pengaturan Sistem. Anda tetap dapat menggunakan tombol "Salin Format Teks" untuk menyalin pesan ke clipboard secara mandiri.',
        type: 'warning',
        confirmText: 'Mengerti',
      });
      return;
    }

    const rawNo = (account?.no_whatsapp || student.orang_tua?.no_whatsapp || '').trim();
    if (!rawNo) {
      toast.warning('Nomor WhatsApp orang tua belum terdaftar. Silakan lengkapi nomor terlebih dahulu.');
      openManageAccountModal(student);
      return;
    }

    let cleanNo = rawNo.replace(/\D/g, '');
    if (cleanNo.startsWith('0')) cleanNo = '62' + cleanNo.slice(1);
    if (!cleanNo.startsWith('62')) cleanNo = '62' + cleanNo;

    const message = buildWhatsAppCredentialMessage(student, account);
    const waUrl = `https://wa.me/${cleanNo}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }

  // Salin Kredensial ke Clipboard
  function handleCopyCredentialText(student, account) {
    const message = buildWhatsAppCredentialMessage(student, account);
    navigator.clipboard.writeText(message);
    setCopiedText(true);
    toast.success('Format pesan kredensial disalin ke clipboard!');
    setTimeout(() => setCopiedText(false), 2000);
  }

  // Filter List Siswa
  const filteredList = students.filter((st) => {
    // 1. Filter Tingkat
    const matchTingkat =
      selectedTingkat === 'semua' ||
      (st.kelas && (st.kelas.tingkat === Number(selectedTingkat) || (st.kelas.nama_kelas || '').startsWith(selectedTingkat)));

    // 2. Filter Kelas
    const matchKelas =
      selectedKelasId === 'semua' ||
      st.id_kelas === selectedKelasId ||
      (st.kelas && st.kelas.nama_kelas === selectedKelasId);

    // 3. Filter Status Akun
    const acc = getParentAccount(st);
    const hasAccount = Boolean(acc);
    const matchAccountStatus =
      filterAccountStatus === 'semua' ||
      (filterAccountStatus === 'punya_akun' && hasAccount) ||
      (filterAccountStatus === 'belum_punya_akun' && !hasAccount);

    // 4. Pencarian
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      st.nama.toLowerCase().includes(q) ||
      st.nis.includes(q) ||
      (st.orang_tua?.nama_ayah || '').toLowerCase().includes(q) ||
      (st.orang_tua?.no_whatsapp || '').includes(q);

    return matchTingkat && matchKelas && matchAccountStatus && matchSearch;
  });

  // Hitung KPI ringkasan
  const totalStudents = students.length;
  const accountsCreatedCount = Object.keys(customCreds).filter((k) => k.startsWith('ortu_')).length;
  const accountsWithoutCount = Math.max(0, totalStudents - accountsCreatedCount);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Master Switch */}
      <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-slate-800">Manajemen Akun Orang Tua Siswa</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                Akses Bersifat Opsional
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pembuatan akun login portal orang tua ini <strong>tidak wajib bagi seluruh wali murid</strong>. Orang tua yang belum memiliki akun dapat tetap memantau absensi putra-putrinya melalui notifikasi WhatsApp sekolah atau layanan Cek Mandiri via NIS.
            </p>
          </div>

          {/* Saklar Master Portal & Aksi Cepat */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Master Toggle */}
            <div className={`p-2 rounded-2xl border flex items-center gap-3 transition-all ${
              parentPortalEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-300'
            }`}>
              <div className="text-left pl-1">
                <div className="text-[11px] font-bold text-slate-700">Status Portal Ortu:</div>
                <div className={`text-xs font-black ${parentPortalEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {parentPortalEnabled ? '✓ AKTIF DIBUKA' : '✕ DINONAKTIFKAN'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleTogglePortal}
                className={`p-2 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-xs ${
                  parentPortalEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                }`}
                title="Klik untuk mengubah status akses portal login orang tua"
              >
                <Power className="w-4 h-4" />
                <span>{parentPortalEnabled ? 'Matikan' : 'Aktifkan'}</span>
              </button>
            </div>

            {/* Tombol Cek Mandiri NIS */}
            <button
              type="button"
              onClick={() => {
                setPublicCheckerNis('');
                setPublicCheckerOpen(true);
              }}
              className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Buka tampilan cek kehadiran siswa mandiri tanpa akun"
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>Coba Cek Mandiri NIS</span>
            </button>

            {/* Salin Link Cek Mandiri */}
            <button
              type="button"
              onClick={handleCopyPublicCheckLink}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Salin tautan cek mandiri untuk disebarkan ke grup WhatsApp paguyuban wali murid"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              <span>Salin Tautan Cek NIS</span>
            </button>
          </div>
        </div>

        {/* Warning Banner jika Portal Dinonaktifkan */}
        {!parentPortalEnabled && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Halaman login portal orang tua saat ini sedang dinonaktifkan. Wali murid yang mencoba masuk akan diarahkan untuk memantau presensi lewat layanan Cek Mandiri NIS tanpa login.
            </span>
          </div>
        )}
      </div>

      {/* 2. KPI Ringkasan Akun */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 block">Total Siswa Terdaftar</span>
          <span className="text-2xl font-black text-slate-800">{totalStudents}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Siswa aktif di database</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-purple-200 bg-purple-50/40 shadow-2xs">
          <span className="text-xs font-bold text-purple-700 block">Akun Ortu Dibuat</span>
          <span className="text-2xl font-black text-purple-800">{accountsCreatedCount}</span>
          <p className="text-[10px] text-purple-600 mt-0.5">Memiliki akses login web</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-200 bg-blue-50/40 shadow-2xs">
          <span className="text-xs font-bold text-blue-700 block">Tanpa Akun (Opsional)</span>
          <span className="text-2xl font-black text-blue-800">{accountsWithoutCount}</span>
          <p className="text-[10px] text-blue-600 mt-0.5">Akses via WA / Cek NIS</p>
        </div>

        <div className={`glass-card rounded-2xl p-4 border shadow-2xs ${
          parentPortalEnabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
        }`}>
          <span className={`text-xs font-bold block ${parentPortalEnabled ? 'text-emerald-700' : 'text-rose-700'}`}>
            Fitur Login Portal
          </span>
          <span className={`text-xl font-black ${parentPortalEnabled ? 'text-emerald-800' : 'text-rose-800'}`}>
            {parentPortalEnabled ? 'Aktif Terbuka' : 'Dinonaktifkan'}
          </span>
          <p className={`text-[10px] mt-0.5 ${parentPortalEnabled ? 'text-emerald-600' : 'text-rose-600'}`}>
            {parentPortalEnabled ? 'Orang tua bisa login' : 'Hanya cek via NIS'}
          </p>
        </div>
      </div>

      {/* 3. Bar Filter & Pencarian */}
      <div className="glass-card rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tingkat */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Tingkat:</span>
              <select
                value={selectedTingkat}
                onChange={(e) => {
                  setSelectedTingkat(e.target.value);
                  setSelectedKelasId('semua');
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="semua">Semua Tingkat (VII, VIII, IX)</option>
                <option value="7">Kelas VII (Tujuh)</option>
                <option value="8">Kelas VIII (Delapan)</option>
                <option value="9">Kelas IX (Sembilan)</option>
              </select>
            </div>

            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Kelas:</span>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="semua">Semua Rombel ({classes.length})</option>
                {classes.map((c) => (
                  <option key={c.id_kelas} value={c.id_kelas}>
                    {c.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Akun */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Akun:</span>
              <select
                value={filterAccountStatus}
                onChange={(e) => setFilterAccountStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="semua">Semua Status</option>
                <option value="punya_akun">Sudah Punya Akun ({accountsCreatedCount})</option>
                <option value="belum_punya_akun">Belum Ada Akun ({accountsWithoutCount})</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Siswa / NIS / Wali / WA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Tabel Daftar Siswa & Akun Orang Tua */}
      <div className="glass-card rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Daftar Akun Orang Tua per Siswa</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
              {filteredList.length} Siswa
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            💡 Ortu tanpa akun tetap dapat menerima update via WhatsApp
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Tidak ada data siswa yang cocok dengan filter.</p>
            <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau reset filter kelas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Siswa & Kelas</th>
                  <th className="p-3">Data Kontak Wali Murid</th>
                  <th className="p-3">Status Akun Login Portal</th>
                  <th className="p-3 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((st, idx) => {
                  const acc = getParentAccount(st);
                  const hasAccount = Boolean(acc);
                  const isAccountActive = acc?.status === 'aktif';
                  const waNumber = acc?.no_whatsapp || st.orang_tua?.no_whatsapp || '';

                  return (
                    <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>

                      {/* Siswa & Kelas */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={st.foto_wajah || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
                            alt={st.nama}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{st.nama}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono">
                                {st.nis}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span className="text-blue-600 font-bold">Kelas {st.kelas?.nama_kelas || '-'}</span>
                              <span>•</span>
                              <span>Wali: {st.kelas?.guru?.nama || 'Bpk. Ahmad Fauzi'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Data Kontak Ortu */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-700">
                            {acc?.nama || st.orang_tua?.nama_ayah || st.orang_tua?.nama_ibu || 'Belum diisi'}
                          </div>
                          {waNumber ? (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{waNumber}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 italic">No. WA belum ada</span>
                          )}
                        </div>
                      </td>

                      {/* Status Akun Portal */}
                      <td className="p-3">
                        {hasAccount ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              isAccountActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {isAccountActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                              <span>{isAccountActive ? 'Akun Login Aktif' : 'Dinonaktifkan'}</span>
                            </span>
                            <div className="text-[10px] font-mono text-slate-500">
                              User: <strong className="text-slate-700">{acc.username}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span>Belum Ada Akun (Opsional)</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Tombol Buat / Edit Akun */}
                          {hasAccount ? (
                            <button
                              type="button"
                              onClick={() => openManageAccountModal(st)}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-purple-200/60"
                              title="Ubah username, password, atau status akun"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                              <span>Kelola Akun</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openManageAccountModal(st)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-blue-200/60"
                              title="Buatkan akun login khusus bagi orang tua ini"
                            >
                              <Plus className="w-3.5 h-3.5 text-blue-600" />
                              <span>+ Buat Akun</span>
                            </button>
                          )}

                          {/* Tombol Kirim WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(st, acc)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200/60"
                            title="Kirim pesan info login / cek presensi langsung ke WhatsApp orang tua"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kirim WA</span>
                          </button>

                          {/* Tombol Cek Mandiri Siswa Ini */}
                          <button
                            type="button"
                            onClick={() => {
                              setPublicCheckerNis(st.nis);
                              setPublicCheckerOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                            title="Cek tampilan presensi mandiri anak ini (tanpa login)"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Buat / Kelola Akun Login Orang Tua */}
      {modalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {getParentAccount(modalStudent) ? 'Kelola Akun Login Ortu' : 'Buat Akun Login Ortu (Opsional)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Siswa: <strong>{modalStudent.nama}</strong> ({modalStudent.nis})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              {/* Nama Wali & No WA */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    required
                    value={accountFormData.nama_ortu}
                    onChange={(e) => setAccountFormData({ ...accountFormData, nama_ortu: e.target.value })}
                    placeholder="Nama Ayah / Ibu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={accountFormData.no_whatsapp}
                    onChange={(e) => setAccountFormData({ ...accountFormData, no_whatsapp: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Username Login */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Username / ID Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountFormData.username}
                  onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value })}
                  placeholder="Misal: ortu_202409001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                />
                <span className="text-[10px] text-slate-400">
                  Orang tua dapat login menggunakan username ini atau menggunakan NIS ananda.
                </span>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Password / Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Acak Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={accountFormData.password}
                    onChange={(e) => setAccountFormData({ ...accountFormData, password: e.target.value })}
                    placeholder="Masukkan password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Status Akun */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Akses Akun</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountFormData({ ...accountFormData, status: 'aktif' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountFormData.status === 'aktif'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountFormData({ ...accountFormData, status: 'nonaktif' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      accountFormData.status === 'nonaktif'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Nonaktifkan
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {getParentAccount(modalStudent) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(modalStudent)}
                    className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer transition-colors"
                    title="Hapus akun login orang tua ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyCredentialText(modalStudent, accountFormData)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                  title="Salin teks informasi login untuk WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copiedText ? 'Tersalin' : 'Salin Info'}</span>
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 cursor-pointer transition-colors"
                >
                  {savingAccount ? 'Menyimpan...' : 'Simpan Akun Ortu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Cek Kehadiran Mandiri */}
      <PublicAttendanceCheckerModal
        isOpen={publicCheckerOpen}
        onClose={() => setPublicCheckerOpen(false)}
        initialNis={publicCheckerNis}
      />
    </div>
  );
}
