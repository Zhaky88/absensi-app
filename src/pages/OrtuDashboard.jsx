import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastModalContext';
import { supabase } from '../lib/supabase';
import {
  MessageSquare,
  Flame,
  Calendar,
  LogOut,
  Save,
  CheckCircle,
  Clock,
  BookOpen,
  UserCheck,
  Shield,
  Award,
  Printer,
  Download,
  Plus,
  ChevronRight,
  Phone,
  Send,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles,
  School,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
  Star,
  Check,
  Users,
  Compass,
  FileSpreadsheet,
  Smartphone,
  KeyRound,
} from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import StudentAttendancePdfModal from '../components/StudentAttendancePdfModal';

export default function OrtuDashboard() {
  const { userProfile, logout, setUserProfile } = useAuth();
  const { toast, showAlert, showConfirm } = useToast();
  const ortu = userProfile?.details;

  // Active Tab: 'hari_ini' | 'riwayat' | 'izin' | 'prestasi' | 'kontak' | 'pengaturan'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#tab=')) {
        const tabFromHash = decodeURIComponent(hash.replace('#tab=', ''));
        if (tabFromHash) return tabFromHash;
      }
      return localStorage.getItem('siak_active_tab_ortu') || 'hari_ini';
    } catch (e) {
      return 'hari_ini';
    }
  });

  useEffect(() => {
    if (activeTab) {
      try {
        localStorage.setItem('siak_active_tab_ortu', activeTab);
        window.history.replaceState(null, '', `#tab=${encodeURIComponent(activeTab)}`);
      } catch (e) {}
    }
  }, [activeTab]);

  // Daftar Anak yang Terhubung ke Akun Ortu (Multi-Anak Support)
  const [childrenList, setChildrenList] = useState([
    {
      nis: ortu?.nis || '202409001',
      nama: ortu?.nama_siswa || 'Budi Pratama',
      foto_wajah: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
      streak_sekarang: 14,
      streak_tertinggi: 28,
      kelas: { nama_kelas: ortu?.kelas || 'VII-A', tingkat: 7 },
      wali_kelas: {
        nama: 'Bpk. Ahmad Fauzi, S.Pd',
        nip: '198501152010011002',
        no_whatsapp: '6281234567890',
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    },
    {
      nis: '202409018',
      nama: 'Anisa Pratama',
      foto_wajah: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      streak_sekarang: 22,
      streak_tertinggi: 35,
      kelas: { nama_kelas: 'IX-B', tingkat: 9 },
      wali_kelas: {
        nama: 'Ibu Siti Nurhaliza, M.Pd',
        nip: '198802142011012003',
        no_whatsapp: '6281987654321',
        foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      },
    },
  ]);

  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = childrenList[selectedChildIndex] || childrenList[0];

  // Pengaturan Sekolah Bawaan
  const [schoolSettings, setSchoolSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      return {
        sekolah_nama: saved.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: saved.sekolah_logo || '',
        sekolah_alamat: saved.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_telepon: saved.sekolah_telepon || '(0541) 678901',
        kepala_sekolah_nama: saved.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: saved.kepala_sekolah_nip || '197003121995121001',
        tahun_ajaran_aktif: saved.tahun_ajaran_aktif || '2026/2027',
        semester_aktif: saved.semester_aktif || 'Ganjil',
        wa_notifikasi_aktif: saved.wa_notifikasi_aktif !== undefined ? saved.wa_notifikasi_aktif : 'true',
      };
    } catch (e) {
      return {
        sekolah_nama: 'SMP NEGERI 2 KOTA BANGUN',
        kepala_sekolah_nama: 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: '197003121995121001',
        tahun_ajaran_aktif: '2026/2027',
        semester_aktif: 'Ganjil',
        wa_notifikasi_aktif: 'true',
      };
    }
  });

  // Nomor WhatsApp Orang Tua
  const [noWaAyah, setNoWaAyah] = useState(ortu?.no_whatsapp || '6281234567890');
  const [noWaIbu, setNoWaIbu] = useState(ortu?.no_whatsapp_ibu || '6281345678901');
  const [savingWa, setSavingWa] = useState(false);

  // Form Ganti Kata Sandi
  const [passwordForm, setPasswordForm] = useState({
    passLama: '',
    passBaru: '',
    passKonfirmasi: '',
  });
  const [showPassLama, setShowPassLama] = useState(false);
  const [showPassBaru, setShowPassBaru] = useState(false);
  const [showPassKonfirmasi, setShowPassKonfirmasi] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Hari Libur Sekolah
  const [holidays, setHolidays] = useState([]);

  // Data Riwayat Kehadiran Siswa
  const [attendance, setAttendance] = useState([
    { id_absensi: '1', tanggal: '2026-10-17', waktu: '07:15', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Informatika' } } },
    { id_absensi: '2', tanggal: '2026-10-16', waktu: '07:10', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Matematika' } } },
    { id_absensi: '3', tanggal: '2026-10-15', waktu: '07:12', status: 'H', keterangan: 'Hadir', jadwal: { mata_pelajaran: { nama_mapel: 'B. Indonesia' } } },
    { id_absensi: '4', tanggal: '2026-10-14', waktu: '07:05', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'IPA Terpadu' } } },
    { id_absensi: '5', tanggal: '2026-10-13', waktu: '07:18', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Bahasa Inggris' } } },
    { id_absensi: '6', tanggal: '2026-10-10', waktu: '07:10', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Pendidikan Agama' } } },
    { id_absensi: '7', tanggal: '2026-10-09', waktu: '07:14', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Seni Budaya' } } },
    { id_absensi: '8', tanggal: '2026-10-08', waktu: '07:20', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Penjaskes' } } },
    { id_absensi: '9', tanggal: '2026-10-07', waktu: '-', status: 'I', keterangan: 'Izin acara keluarga', jadwal: { mata_pelajaran: { nama_mapel: 'PPKn' } } },
    { id_absensi: '10', tanggal: '2026-10-06', waktu: '07:08', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Matematika' } } },
    { id_absensi: '11', tanggal: '2026-10-03', waktu: '07:11', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Prakarya' } } },
    { id_absensi: '12', tanggal: '2026-10-02', waktu: '07:15', status: 'H', jadwal: { mata_pelajaran: { nama_mapel: 'Informatika' } } },
  ]);

  // Jadwal KBM Hari Ini untuk Anak yang Terpilih
  const [todayKbmSchedules, setTodayKbmSchedules] = useState([
    { jam_ke: 1, jam_mulai: '07:15', jam_selesai: '08:35', mapel: 'Matematika Wajib', guru: 'Bpk. Ahmad Fauzi, S.Pd', status_absen: 'Hadir', waktu_absen: '07:12 WITA' },
    { jam_ke: 2, jam_mulai: '08:35', jam_selesai: '09:55', mapel: 'Bahasa Indonesia', guru: 'Ibu Ratna Sari, M.Pd', status_absen: 'Sedang Berlangsung', waktu_absen: '08:32 WITA' },
    { jam_ke: 3, jam_mulai: '10:15', jam_selesai: '11:35', mapel: 'Ilmu Pengetahuan Alam (IPA)', guru: 'Bpk. Hendra Wijaya, S.Pd', status_absen: 'Akan Datang', waktu_absen: '-' },
    { jam_ke: 4, jam_mulai: '11:35', jam_selesai: '12:55', mapel: 'Pendidikan Pancasila & Kewarganegaraan', guru: 'Ibu Dra. Siti Aminah', status_absen: 'Akan Datang', waktu_absen: '-' },
  ]);

  // Jurnal Pembelajaran Hari Ini
  const [todayJurnalList, setTodayJurnalList] = useState(() => {
    try {
      const allJurnal = JSON.parse(localStorage.getItem('siak_jurnal_kbm') || '[]');
      if (allJurnal.length > 0) return allJurnal;
    } catch (e) {}
    return [
      {
        id: 'j1',
        mapel: 'Matematika Wajib',
        guru: 'Bpk. Ahmad Fauzi, S.Pd',
        materi: 'Bab 3: Aljabar Linier & Persamaan Satu Variabel',
        catatan: 'Anak-anak sangat antusias dan telah menyelesaikan latihan soal mandiri nomor 1-5.',
        jam: '07:15 - 08:35',
      },
    ];
  });

  // Pengajuan Izin / Sakit State (Tersinkron dengan siak_permohonan_izin)
  const [permitsList, setPermitsList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('siak_permohonan_izin') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [permitForm, setPermitForm] = useState({
    kategori: 'Sakit', // 'Sakit' | 'Izin' | 'Keperluan Keluarga'
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tanggal_selesai: new Date().toISOString().split('T')[0],
    alasan: '',
    foto_bukti: '',
  });
  const [savingPermit, setSavingPermit] = useState(false);
  const fileInputRef = useRef(null);

  // State Modal PDF Rapor Kehadiran
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filter Riwayat Absensi
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('semua');

  useEffect(() => {
    fetchHolidays();
    fetchChildAttendance();
  }, [selectedChild?.nis]);

  async function fetchHolidays() {
    try {
      const { data } = await supabase.from('kalender_akademik').select('*');
      if (data && data.length > 0) {
        setHolidays(data);
      } else {
        setHolidays([
          { tanggal: '2026-10-20', status_hari: 'kegiatan_khusus', keterangan: 'Classmeeting & Porseni', is_libur: false },
          { tanggal: '2026-10-28', status_hari: 'libur_nasional', keterangan: 'Hari Sumpah Pemuda', is_libur: true },
          { tanggal: '2026-12-25', status_hari: 'libur_nasional', keterangan: 'Hari Raya Natal', is_libur: true },
        ]);
      }
    } catch (e) {}
  }

  async function fetchChildAttendance() {
    if (!selectedChild?.nis) return;
    try {
      const { data } = await supabase
        .from('absensi')
        .select('id_absensi, tanggal, waktu, status, metode, keterangan, jadwal(mata_pelajaran(nama_mapel))')
        .eq('nis', selectedChild.nis)
        .order('tanggal', { ascending: false })
        .limit(60);
      if (data && data.length > 0) {
        setAttendance(data);
      }
    } catch (e) {}
  }

  // Hitung Ringkasan Statistik Presensi Semester Anak
  const summaryStats = (() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    attendance.forEach((r) => {
      if (r.status === 'H') hadir++;
      else if (r.status === 'S') sakit++;
      else if (r.status === 'I') izin++;
      else if (r.status === 'A') alpa++;
    });

    const totalHari = hadir + sakit + izin + alpa;
    const percentage = totalHari > 0 ? Math.round((hadir / totalHari) * 100) : 0;

    return {
      hadir,
      sakit,
      izin,
      alpa,
      totalHari,
      percentage,
    };
  })();

  // Handle Update Nomor WhatsApp
  async function handleUpdateWa(e) {
    e.preventDefault();
    setSavingWa(true);
    try {
      // 1. Simpan ke local storage agar tersimpan permanen
      const currentSaved = JSON.parse(localStorage.getItem('siak_ortu_profile') || '{}');
      const updatedProfile = {
        ...currentSaved,
        no_whatsapp: noWaAyah.trim(),
        no_whatsapp_ibu: noWaIbu.trim(),
        nama_ayah: ortu?.nama_ayah || 'Bpk. Bambang Sutrisno',
        nama_ibu: ortu?.nama_ibu || 'Ibu Siti Aminah',
      };
      localStorage.setItem('siak_ortu_profile', JSON.stringify(updatedProfile));

      // 2. Perbarui state userProfile di AuthContext agar langsung sinkron di UI
      if (setUserProfile && userProfile) {
        setUserProfile({
          ...userProfile,
          details: {
            ...userProfile.details,
            no_whatsapp: noWaAyah.trim(),
            no_whatsapp_ibu: noWaIbu.trim(),
          },
        });
      }

      // 3. Simpan juga ke siak_user_credentials untuk ortu
      try {
        const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        ['ortu', 'ortu_budi', 'ortu@siak.sekolah.id', `ortu_${selectedChild?.nis}`].forEach((key) => {
          if (creds[key]) {
            if (!creds[key].details) creds[key].details = {};
            creds[key].details.no_whatsapp = noWaAyah.trim();
            creds[key].details.no_whatsapp_ibu = noWaIbu.trim();
          }
        });
        localStorage.setItem('siak_user_credentials', JSON.stringify(creds));
      } catch (errCreds) {}

      // 4. Update ke Supabase (jika terhubung & aman)
      if (ortu?.id_ortu) {
        try {
          await supabase
            .from('orang_tua')
            .update({
              no_whatsapp: noWaAyah.trim(),
              no_whatsapp_ibu: noWaIbu.trim(),
            })
            .eq('id_ortu', ortu.id_ortu);
        } catch (dbErr) {
          console.warn('Supabase orang_tua update skipped:', dbErr);
        }
      }

      toast.success('Nomor WhatsApp orang tua berhasil disimpan! Notifikasi otomatis akan dikirim ke nomor ini.');
    } catch (err) {
      toast.error('Gagal menyimpan nomor WhatsApp: ' + err.message);
    } finally {
      setSavingWa(false);
    }
  }

  // Handle Ganti Kata Sandi Akun Ortu
  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (!passwordForm.passLama) {
      toast.warning('Silakan masukkan kata sandi saat ini / kata sandi lama.');
      return;
    }

    // Ambil kata sandi saat ini (default demo: 'password123')
    const currentPass = localStorage.getItem('siak_ortu_password') || 'password123';
    const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
    const ortuKey = `ortu_${selectedChild?.nis}`;
    const customPass = creds[ortuKey]?.password || creds['ortu']?.password || creds['ortu_budi']?.password;
    const validPass = customPass || currentPass;

    if (passwordForm.passLama !== validPass && passwordForm.passLama !== currentPass) {
      toast.error('Kata sandi saat ini salah. Silakan periksa kembali.');
      return;
    }

    if (!passwordForm.passBaru) {
      toast.warning('Silakan masukkan kata sandi baru.');
      return;
    }
    if (passwordForm.passBaru.length < 6) {
      toast.warning('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (passwordForm.passBaru !== passwordForm.passKonfirmasi) {
      toast.error('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Simpan password baru ke siak_ortu_password (digunakan oleh smartLogin & demo)
      localStorage.setItem('siak_ortu_password', passwordForm.passBaru);

      // 2. Simpan ke siak_user_credentials untuk semua alias akun ortu
      const keysToUpdate = ['ortu', 'ortu_budi', 'ortu@siak.sekolah.id'];
      if (selectedChild?.nis) keysToUpdate.push(`ortu_${selectedChild.nis}`);

      keysToUpdate.forEach((k) => {
        if (!creds[k]) {
          creds[k] = { role: 'ortu', username: k };
        }
        creds[k].password = passwordForm.passBaru;
      });
      localStorage.setItem('siak_user_credentials', JSON.stringify(creds));

      setPasswordForm({ passLama: '', passBaru: '', passKonfirmasi: '' });
      toast.success('Kata sandi akun Portal Orang Tua berhasil diperbarui!');
      showAlert({
        title: 'Kata Sandi Diperbarui',
        message: 'Kata sandi berhasil disimpan secara permanen. Gunakan kata sandi baru ini saat masuk berikutnya.',
        type: 'success',
      });
    } catch (err) {
      toast.error('Gagal memperbarui kata sandi: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  // Upload Foto Bukti Surat Dokter / Keterangan Sakit
  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

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
        setPermitForm((prev) => ({ ...prev, foto_bukti: compressedBase64 }));
        toast.success('Foto surat dokter / bukti berhasil dilampirkan!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Kirim Pengajuan Izin / Surat Sakit Resmi Ortu
  async function handleSubmitPermit(e) {
    e.preventDefault();
    if (!permitForm.alasan.trim()) {
      toast.error('Mohon isi alasan permohonan izin ananda.');
      return;
    }

    setSavingPermit(true);
    try {
      const newPermit = {
        id: `prm_ortu_${Date.now()}`,
        nis: selectedChild.nis,
        nama_siswa: selectedChild.nama,
        nama_kelas: selectedChild.kelas?.nama_kelas || 'VII-A',
        kategori: permitForm.kategori,
        tanggal_mulai: permitForm.tanggal_mulai,
        tanggal_selesai: permitForm.tanggal_selesai,
        alasan: permitForm.alasan.trim(),
        foto_bukti: permitForm.foto_bukti || '',
        pengaju: 'Orang Tua / Wali Murid',
        nama_ortu: ortu?.nama_ayah || ortu?.nama_ibu || 'Orang Tua Murid',
        status: 'Menunggu Konfirmasi', // 'Menunggu Konfirmasi' | 'Disetujui' | 'Ditolak'
        tanggal_pengajuan: new Date().toISOString().split('T')[0],
      };

      const allPermits = JSON.parse(localStorage.getItem('siak_permohonan_izin') || '[]');
      const updatedPermits = [newPermit, ...allPermits];
      localStorage.setItem('siak_permohonan_izin', JSON.stringify(updatedPermits));

      setPermitsList(updatedPermits);
      setPermitForm({
        kategori: 'Sakit',
        tanggal_mulai: new Date().toISOString().split('T')[0],
        tanggal_selesai: new Date().toISOString().split('T')[0],
        alasan: '',
        foto_bukti: '',
      });

      toast.success(
        `Surat ${newPermit.kategori} untuk ${selectedChild.nama} berhasil dikirimkan ke pihak sekolah!`,
        'Pengajuan Izin Terkirim'
      );
      showAlert({
        title: 'Permohonan Izin Dikirim',
        message: `Surat izin resmi dari orang tua untuk ananda ${selectedChild.nama} telah masuk ke sistem dan menunggu verifikasi Wali Kelas (${selectedChild.wali_kelas?.nama}).`,
        type: 'success',
      });
    } catch (err) {
      toast.error('Gagal mengirim permohonan izin: ' + err.message);
    } finally {
      setSavingPermit(false);
    }
  }

  // Konfirmasi Logout
  async function handleConfirmLogout() {
    const ok = await showConfirm({
      title: 'Keluar dari Portal Orang Tua',
      message: 'Apakah Anda yakin ingin keluar dari sesi pantau orang tua?',
      type: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Tetap di Sini',
    });
    if (ok) {
      logout();
    }
  }

  // Filtered Riwayat Kehadiran
  const filteredAttendance = attendance.filter((item) => {
    const mapel = item.jadwal?.mata_pelajaran?.nama_mapel || '';
    const matchSearch =
      mapel.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      item.tanggal.includes(historySearchTerm);
    const matchStatus =
      historyFilterStatus === 'semua' || item.status === historyFilterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-16 select-none font-sans">
      {/* ========================================================= */}
      {/* 1. TOP HEADER BRANDING & MULTI-ANAK SWITCHER              */}
      {/* ========================================================= */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo Sekolah */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 rounded-2xl p-1 flex items-center justify-center border border-white/15 shrink-0">
              <img
                src={schoolSettings.sekolah_logo || 'https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2'}
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-xs sm:text-sm tracking-tight leading-tight truncate">
                {schoolSettings.sekolah_nama}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-blue-400 font-medium truncate">
                Portal Resmi Orang Tua & Wali Murid
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Switcher Anak & Tombol Keluar */}
          <div className="flex items-center gap-2">
            {/* Multi-Anak Switcher Dropdown */}
            {childrenList.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChildIndex}
                  onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
                  className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {childrenList.map((c, idx) => (
                    <option key={c.nis} value={idx}>
                      {c.nama} ({c.kelas.nama_kelas})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="p-2 sm:px-3 sm:py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-400/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Keluar dari Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN CONTAINER & HERO PROFILE OVERVIEW                 */}
      {/* ========================================================= */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* HERO CARD: INFORMASI SISWA, STATUS MASUK & STREAK */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-700/70 relative overflow-hidden">
          {/* Background Glow Decor */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Foto & Identitas Anak */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="relative shrink-0">
                <img
                  src={selectedChild.foto_wajah}
                  alt={selectedChild.nama}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/20 shadow-lg ring-2 ring-blue-500/40"
                />
                <span
                  className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-1 -right-1 shadow-md flex items-center justify-center text-[10px] text-white font-black"
                  title="Siswa Terhubung"
                >
                  ✓
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Kelas {selectedChild.kelas.nama_kelas}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30">
                    NIS: {selectedChild.nis}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedChild.nama}
                </h2>

                <p className="text-xs text-slate-300">
                  Wali Kelas: <strong>{selectedChild.wali_kelas?.nama}</strong>
                </p>

                {/* Status Masuk Hari Ini */}
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sudah Hadir di Sekolah (07:12 WITA)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Streak Kehadiran Card */}
            <div className="flex items-center justify-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Flame className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                    Streak Kehadiran
                  </span>
                  <span className="text-base font-black text-white leading-tight">
                    {selectedChild.streak_sekarang} Hari Aktif
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Rekor: {selectedChild.streak_tertinggi} Hari
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. SUB-TAB NAVIGATION PILLS                               */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
          {[
            { id: 'hari_ini', label: 'Hari Ini & KBM', icon: Clock, color: 'text-blue-600' },
            { id: 'riwayat', label: 'Riwayat & Kaldik', icon: Calendar, color: 'text-emerald-600' },
            { id: 'izin', label: 'Ajukan Izin / Sakit', icon: FileText, color: 'text-amber-600' },
            { id: 'kontak', label: 'Hubungi Wali Kelas', icon: Phone, color: 'text-cyan-600' },
            { id: 'pengaturan', label: 'Pengaturan Akun', icon: Shield, color: 'text-rose-600' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
        {/* TAB 1: HARI INI & LIVE KBM MONITORING                     */}
        {/* ========================================================= */}
        {activeTab === 'hari_ini' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Status Kehadiran Hari Ini Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Jadwal Pelajaran & Kehadiran Hari Ini
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pantau aktivitas jam belajar dan kehadiran per mata pelajaran ananda
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Grid Jadwal KBM Hari Ini */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {todayKbmSchedules.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 hover:border-blue-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-black">
                          Jam Ke-{item.jam_ke}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 font-bold">
                          {item.jam_mulai} - {item.jam_selesai} WITA
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{item.mapel}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        {item.guru}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-block ${
                          item.status_absen === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.status_absen === 'Sedang Berlangsung'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.status_absen}
                      </span>
                      {item.waktu_absen !== '-' && (
                        <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                          {item.waktu_absen}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jurnal & Materi Pembelajaran Hari Ini */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Jurnal Materi Pembelajaran Kelas Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transparansi apa yang dipelajari ananda di kelas dari catatan guru
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {todayJurnalList.map((j) => (
                  <div key={j.id} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-900">{j.mapel}</span>
                      <span className="text-[11px] font-mono text-purple-700">{j.jam}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      📖 {j.materi}
                    </p>
                    <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-purple-100 italic">
                      "{j.catatan}"
                    </p>
                    <span className="text-[10px] text-slate-400 block text-right font-medium">
                      Guru Pengajar: {j.guru}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: RIWAYAT PRESENSI & KALDIK                          */}
        {/* ========================================================= */}
        {activeTab === 'riwayat' && (
          <div className="space-y-6 animate-in fade-in">
            {/* STATISTIK KEHADIRAN SEMESTER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Persentase Kehadiran
                </span>
                <span className="text-2xl font-black text-blue-600 mt-1 block">
                  {summaryStats.percentage}%
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  ✓ Di atas batas 85%
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Hadir / Tepat Waktu
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {summaryStats.hadir} <span className="text-xs text-slate-500 font-normal">Hari</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  Tepat Waktu & Hadir
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Sakit & Izin Resmi
                </span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {summaryStats.sakit + summaryStats.izin} <span className="text-xs text-slate-500 font-normal">Hari</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  S: {summaryStats.sakit} • I: {summaryStats.izin}
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Alpa (Tanpa Keterangan)
                </span>
                <span className={`text-2xl font-black mt-1 block ${summaryStats.alpa > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {summaryStats.alpa} <span className="text-xs text-slate-500 font-normal">Hari</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  {summaryStats.alpa === 0 ? 'Sempurna: 0 Alpa' : 'Perlu perhatian'}
                </span>
              </div>
            </div>

            {/* KALENDER PRESENSI & LIBUR SEKOLAH */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Kalender Presensi Ananda
                </h3>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rapor Kehadiran (PDF)</span>
                </button>
              </div>

              <AttendanceCalendar
                attendanceRecords={attendance}
                holidays={holidays}
                currentStreak={selectedChild.streak_sekarang}
              />
            </div>

            {/* TABEL CATATAN PRESENSI LENGKAP */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-800">
                  Daftar Catatan Kehadiran Terakhir
                </h3>

                {/* Filter Status */}
                <div className="flex items-center gap-2">
                  <select
                    value={historyFilterStatus}
                    onChange={(e) => setHistoryFilterStatus(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="H">Hadir</option>
                    <option value="S">Sakit</option>
                    <option value="I">Izin</option>
                    <option value="A">Alpa</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredAttendance.map((att) => (
                  <div
                    key={att.id_absensi}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {att.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Harian'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {att.tanggal} • {att.waktu}
                      </span>
                      {att.keterangan && (
                        <p className="text-[11px] text-amber-700 mt-0.5 italic">
                          Ket: {att.keterangan}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                        att.status === 'H'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : att.status === 'S'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : att.status === 'I'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {att.status === 'H'
                        ? 'Hadir'
                        : att.status === 'S'
                        ? 'Sakit'
                        : att.status === 'I'
                        ? 'Izin'
                        : 'Alpa'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LAYANAN PENGAJUAN IZIN & SURAT SAKIT ORTU          */}
        {/* ========================================================= */}
        {activeTab === 'izin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Form Pengajuan Izin Ortu (2 Kolom) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Formulir Surat Izin & Sakit Resmi dari Orang Tua
                    </h3>
                    <p className="text-xs text-slate-500">
                      Izin yang diajukan orang tua akan langsung diteruskan ke Wali Kelas & Guru Piket
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitPermit} className="space-y-4">
                {/* Kategori Izin */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kategori Permohonan <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['Sakit', 'Izin', 'Keperluan Keluarga'].map((kat) => (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => setPermitForm({ ...permitForm, kategori: kat })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                          permitForm.kategori === kat
                            ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {kat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rentang Tanggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Mulai Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={permitForm.tanggal_mulai}
                      onChange={(e) => setPermitForm({ ...permitForm, tanggal_mulai: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Sampai Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={permitForm.tanggal_selesai}
                      onChange={(e) => setPermitForm({ ...permitForm, tanggal_selesai: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Alasan / Keterangan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Alasan / Keterangan Sakit/Izin <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={permitForm.alasan}
                    onChange={(e) => setPermitForm({ ...permitForm, alasan: e.target.value })}
                    placeholder="Contoh: Ananda Budi demam tinggi sejak semalam dan disarankan dokter beristirahat 2 hari..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Lampiran Bukti / Surat Dokter */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Lampiran Foto Surat Dokter / Bukti Pendukung (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{permitForm.foto_bukti ? 'Ganti Foto Bukti' : 'Unggah Foto Surat'}</span>
                    </button>

                    {permitForm.foto_bukti && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Foto terlampir
                      </span>
                    )}
                  </div>

                  {permitForm.foto_bukti && (
                    <div className="w-32 h-24 rounded-xl overflow-hidden border border-slate-200 mt-2 relative">
                      <img src={permitForm.foto_bukti} alt="Bukti" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPermitForm((prev) => ({ ...prev, foto_bukti: '' }))}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg cursor-pointer"
                        title="Hapus Lampiran"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingPermit}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{savingPermit ? 'Mengirim Surat...' : 'Kirim Surat Permohonan Izin'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Riwayat Surat Permohonan Izin (1 Kolom) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Riwayat Surat Izin
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Status verifikasi dari pihak sekolah</p>
              </div>

              <div className="space-y-3">
                {permitsList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Belum ada pengajuan izin yang tercatat.
                  </div>
                ) : (
                  permitsList.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{p.kategori}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            p.status === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : p.status === 'Ditolak'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{p.alasan}</p>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {p.tanggal_mulai} s/d {p.tanggal_selesai}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}



        {/* ========================================================= */}
        {/* TAB 5: KONTAK SEKOLAH & WALI KELAS                        */}
        {/* ========================================================= */}
        {activeTab === 'kontak' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {/* KARTU WALI KELAS */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Wali Kelas {selectedChild.kelas.nama_kelas}
                  </h3>
                  <p className="text-xs text-slate-500">Guru pembimbing utama ananda di sekolah</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100">
                <img
                  src={selectedChild.wali_kelas?.foto}
                  alt={selectedChild.wali_kelas?.nama}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    {selectedChild.wali_kelas?.nama}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    NIP: {selectedChild.wali_kelas?.nip}
                  </p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                    Wali Kelas Aktif
                  </span>
                </div>
              </div>

              {/* Tombol Direct WhatsApp Wali Kelas */}
              <a
                href={`https://wa.me/${selectedChild.wali_kelas?.no_whatsapp}?text=${encodeURIComponent(
                  `Assalamu'alaikum wr. wb. Yth. Bpk/Ibu ${selectedChild.wali_kelas?.nama}, saya orang tua dari ananda ${selectedChild.nama} (Kelas ${selectedChild.kelas?.nama_kelas}). Ingin berkonsultasi mengenai...`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat WhatsApp Langsung dengan Wali Kelas</span>
              </a>
            </div>

            {/* KARTU LAYANAN BK & SEKOLAH */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Layanan Konseling & Informasi Sekolah
                  </h3>
                  <p className="text-xs text-slate-500">Saluran resmi komunikasi dengan pihak sekolah</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block">Guru Bimbingan Konseling (BK)</span>
                  <p className="text-slate-500 text-[11px]">
                    Konsultasi minat bakat, bimbingan belajar, dan pendampingan motivasi siswa.
                  </p>
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 text-[11px]"
                  >
                    <span>Hubungi Guru BK</span>
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block">Kantor Tata Usaha & Administrasi</span>
                  <p className="text-slate-500 text-[11px]">
                    {schoolSettings.sekolah_alamat} • Telp: {schoolSettings.sekolah_telepon}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PENGATURAN AKUN & WHATSAPP                         */}
        {/* ========================================================= */}
        {activeTab === 'pengaturan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Form Nomor WhatsApp Notifikasi (2 Kolom) */}
            <div className="lg:col-span-2 space-y-6">
              {/* STATUS LAYANAN WHATSAPP SEKOLAH */}
              {schoolSettings.wa_notifikasi_aktif === 'false' ? (
                <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-amber-900 text-xs shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">
                      Layanan Pengiriman Notifikasi WhatsApp Sedang Dinonaktifkan
                    </span>
                    <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                      Pihak administrator sekolah saat ini menonaktifkan sementara pengiriman notifikasi otomatis. Anda tetap dapat memperbarui nomor WhatsApp di bawah untuk digunakan saat layanan diaktifkan kembali.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-[11px] text-emerald-900">
                      Layanan Pengiriman Notifikasi WhatsApp Sekolah: AKTIF
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-md">
                    Otomatis Terhubung
                  </span>
                </div>
              )}

              {/* Form WhatsApp */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Nomor WhatsApp Penerima Notifikasi Otomatis
                      </h3>
                      <p className="text-xs text-slate-500">
                        Sistem sekolah otomatis mengirimkan laporan presensi dan pencapaian kehadiran siswa
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateWa} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Nomor WhatsApp Ayah / Wali 1 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={noWaAyah}
                        onChange={(e) => setNoWaAyah(e.target.value)}
                        placeholder="Contoh: 6281234567890"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Nomor WhatsApp Ibu / Wali 2
                      </label>
                      <input
                        type="text"
                        value={noWaIbu}
                        onChange={(e) => setNoWaIbu(e.target.value)}
                        placeholder="Contoh: 6281345678901"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingWa}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingWa ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Form Ganti Password Akun Ortu */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Keamanan & Kata Sandi Portal Orang Tua
                      </h3>
                      <p className="text-xs text-slate-500">
                        Perbarui kata sandi untuk melindungi akses informasi ananda
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* Kata Sandi Lama */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Kata Sandi Saat Ini / Lama <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassLama ? 'text' : 'password'}
                        required
                        value={passwordForm.passLama}
                        onChange={(e) => setPasswordForm({ ...passwordForm, passLama: e.target.value })}
                        placeholder="Masukkan kata sandi saat ini (default: password123)"
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassLama(!showPassLama)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassLama ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Kata Sandi Baru <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassBaru ? 'text' : 'password'}
                          required
                          value={passwordForm.passBaru}
                          onChange={(e) => setPasswordForm({ ...passwordForm, passBaru: e.target.value })}
                          placeholder="Minimal 6 karakter"
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassBaru(!showPassBaru)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                        <input
                          type={showPassKonfirmasi ? 'text' : 'password'}
                          required
                          value={passwordForm.passKonfirmasi}
                          onChange={(e) => setPasswordForm({ ...passwordForm, passKonfirmasi: e.target.value })}
                          placeholder="Ketik ulang sandi baru"
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassKonfirmasi(!showPassKonfirmasi)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassKonfirmasi ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{savingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Pratinjau Pesan Notifikasi WhatsApp (1 Kolom) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Pratinjau Format Pesan WA
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Contoh notifikasi yang dikirimkan sistem</p>
              </div>

              {/* Mockup Balon Chat WhatsApp */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#efeae2] p-3 shadow-inner space-y-2.5 text-xs">
                <div className="max-w-[90%] bg-white rounded-2xl rounded-tl-xs p-3 shadow-xs space-y-1 border border-slate-200/50">
                  <span className="text-[10px] font-bold text-emerald-700 block">🏫 BOT SIAK SMPN 2</span>
                  <p className="text-slate-800 text-[11px] leading-relaxed">
                    Yth. Orang Tua dari ananda <strong>{selectedChild.nama}</strong>,<br />
                    Kami menginformasikan bahwa ananda telah <strong>HADIR</strong> di sekolah dan mengikuti KBM hari ini pukul 07:12 WITA.
                  </p>
                  <span className="text-[9px] text-slate-400 block text-right font-mono">07:13 ✓✓</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 4. MODALS CETAK RAPOR PDF                                 */}
      {/* ========================================================= */}
      {isPdfModalOpen && (
        <StudentAttendancePdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          initialStudent={selectedChild}
          allStudents={childrenList}
          schoolSettings={schoolSettings}
          holidays={holidays}
        />
      )}


    </div>
  );
}
