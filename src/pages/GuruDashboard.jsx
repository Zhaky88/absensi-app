import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  QrCode,
  Camera,
  Users,
  LogOut,
  Clock,
  RefreshCw,
  UserCheck,
  CheckCircle,
  Calendar,
  FileSpreadsheet,
  UserPlus,
  BookOpen,
  Sparkles,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  Maximize2,
  Minimize2,
  Shield,
  Layers,
  Award,
  CheckCircle2,
  AlertTriangle,
  Menu,
  GraduationCap,
  Save,
  Download,
  Filter,
  Search,
  Eye,
  FileText,
  HelpCircle,
  CheckSquare,
  Grid,
  List,
  Play,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  ArrowRight,
  User,
  Lock,
  Key,
  Phone,
  Mail,
  ShieldCheck,
  Camera as CameraIcon,
  Printer as PrinterIcon,
  School,
  Trophy,
  Flame,
} from 'lucide-react';
import QRCode from 'qrcode';
import CameraQrScanner from '../components/CameraQrScanner';
import ClassAttendanceCalendar from '../components/ClassAttendanceCalendar';
import ClassAttendanceReportModal from '../components/ClassAttendanceReportModal';
import JurnalKbmReportModal from '../components/JurnalKbmReportModal';
import TeacherScheduleReportModal from '../components/TeacherScheduleReportModal';
import StudentAchievementModal from '../components/StudentAchievementModal';
import SchoolCertificateModal from '../components/SchoolCertificateModal';
import { calculateStudentAchievementsSummary } from '../lib/achievementManager';
import {
  getInvalAssignments,
  saveInvalAssignment,
  getTodayDateString,
  fetchInvalAssignmentsFromCloud,
  getActiveInvalsForTeacher,
} from '../lib/invalManager';
import { useToast } from '../context/ToastModalContext';

export default function GuruDashboard() {
  const { userProfile, logout, setUserProfile } = useAuth();
  const { toast, showConfirm } = useToast();
  const guru = userProfile?.details;

  // State Modal Achievement & Piagam Siswa
  const [selectedStudentForAchievement, setSelectedStudentForAchievement] = useState(null);
  const [selectedStudentForCert, setSelectedStudentForCert] = useState(null);
  const [certSummary, setCertSummary] = useState(null);
  const [radarFilterKelas, setRadarFilterKelas] = useState('all');

  // Sidebar & Navigation State (Mirrors Admin Dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dynamic-qr'); // 'dynamic-qr' | 'scanner' | 'manual' | 'jurnal' | 'jadwal' | 'kalender' | 'wali_kelas' | 'inval' | 'profil'

  // Identitas & Pengaturan Sekolah (Tersinkronisasi dengan Admin Dashboard)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      return {
        sekolah_nama: saved.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: saved.sekolah_logo || '',
        sekolah_stempel: saved.sekolah_stempel || '',
        tahun_ajaran_aktif: saved.tahun_ajaran_aktif || '2026/2027',
        semester_aktif: saved.semester_aktif || 'Ganjil',
        kepala_sekolah_nama: saved.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: saved.kepala_sekolah_nip || '197003121995121001',
      };
    } catch (e) {
      return {
        sekolah_nama: 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: '',
        sekolah_stempel: '',
        tahun_ajaran_aktif: '2026/2027',
        semester_aktif: 'Ganjil',
        kepala_sekolah_nama: 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: '197003121995121001',
      };
    }
  });

  // Master Data State
  const [studentsList, setStudentsList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({});

  // Sesi KBM Mengajar Aktif
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [manualFilterKelasId, setManualFilterKelasId] = useState('');
  const [isFullscreenProjector, setIsFullscreenProjector] = useState(false);

  // Dynamic QR Code State
  const [sessionToken, setSessionToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [scannedStudent, setScannedStudent] = useState(null);

  // Inval / Guru Pengganti State
  const [invalAssignments, setInvalAssignments] = useState(() => getInvalAssignments());
  const [activeInvalSession, setActiveInvalSession] = useState(null);
  const [showInvalPickerModal, setShowInvalPickerModal] = useState(false);
  const [invalManualForm, setInvalManualForm] = useState({
    id_jadwal: '',
    alasan: 'Izin / Sakit',
    catatan: '',
  });

  // Jurnal KBM Harian
  const [jurnalMateri, setJurnalMateri] = useState('');
  const [jurnalTugas, setJurnalTugas] = useState('');
  const [savingJurnal, setSavingJurnal] = useState(false);
  const [jurnalHistory, setJurnalHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('siak_jurnal_kbm') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Status Wali Kelas Guru ini
  const waliKelasOf = classesList.find(
    (c) => c.wali_kelas === guru?.nip || c.wali_kelas === guru?.nama
  );
  const [selectedReportClass, setSelectedReportClass] = useState(null);
  const [showJurnalReportModal, setShowJurnalReportModal] = useState(false);
  const [showScheduleReportModal, setShowScheduleReportModal] = useState(false);

  // Penugasan Inval yang ditugaskan admin kepada guru ini hari ini
  const myAssignedInvals = getActiveInvalsForTeacher(guru?.nip);

  // Jadwal Guru ini
  const mySchedules = schedulesList.filter(
    (s) => s.id_guru === guru?.nip || s.guru?.nama === guru?.nama
  );

  // Kelas Lain yang Diajar oleh Guru ini (Guru Mapel) - tidak termasuk kelas binaan
  const otherTaughtClasses = classesList.filter((c) => {
    const isWali = waliKelasOf && String(c.id_kelas) === String(waliKelasOf.id_kelas);
    if (isWali) return false;
    return mySchedules.some(
      (s) => String(s.id_kelas) === String(c.id_kelas) || s.kelas?.nama_kelas === c.nama_kelas
    );
  });

  // State Pengaturan Tampilan Halaman Jadwal Guru
  const [scheduleViewMode, setScheduleViewMode] = useState('grid'); // 'grid' | 'table'
  const [scheduleFilterDay, setScheduleFilterDay] = useState('all'); // 'all' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'
  const [scheduleScope, setScheduleScope] = useState('my'); // 'my' | 'all'

  // State & Form Profil Guru
  const [profileSubTab, setProfileSubTab] = useState('biodata'); // 'biodata' | 'keamanan' | 'kartu' | 'preferensi'
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nama: guru?.nama || '',
    nip: guru?.nip || '',
    email: guru?.email || userProfile?.username || '',
    no_telepon: guru?.no_telepon || guru?.no_hp || '',
    mata_pelajaran: guru?.mata_pelajaran || guru?.mapel || guru?.mapel_utama || '',
    foto_profil: guru?.foto_profil || '',
    alamat: guru?.alamat || '',
  });

  // Sinkronkan form saat data guru tersedia/berubah
  useEffect(() => {
    if (guru) {
      setProfileForm({
        nama: guru.nama || '',
        nip: guru.nip || '',
        email: guru.email || userProfile?.username || '',
        no_telepon: guru.no_telepon || guru.no_hp || '',
        mata_pelajaran: guru.mata_pelajaran || guru.mapel || guru.mapel_utama || '',
        foto_profil: guru.foto_profil || '',
        alamat: guru.alamat || '',
      });
    }
  }, [guru, userProfile]);

  // Form Ganti Kata Sandi Guru
  const [passOld, setPassOld] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const avatarFileRef = useRef(null);

  // Upload Avatar Guru
  function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran berkas foto maksimal 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result;
      if (base64Url) {
        setProfileForm((prev) => ({ ...prev, foto_profil: base64Url }));
        toast.info('Foto baru dipilih! Klik "Simpan Perubahan Profil" untuk menyimpan permanen.');
      }
    };
    reader.readAsDataURL(file);
  }

  // Generate Avatar Dicebear Acak
  function handleRandomizeAvatar() {
    const randomSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    setProfileForm((prev) => ({ ...prev, foto_profil: newAvatar }));
    toast.info('Avatar kartun acak diterapkan! Klik simpan untuk menggunakan.');
  }

  // Simpan Perubahan Biodata Guru
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const updatedDetails = {
        ...(guru || {}),
        nama: profileForm.nama,
        email: profileForm.email,
        no_telepon: profileForm.no_telepon,
        no_hp: profileForm.no_telepon,
        mata_pelajaran: profileForm.mata_pelajaran,
        mapel_utama: profileForm.mata_pelajaran,
        foto_profil: profileForm.foto_profil,
        alamat: profileForm.alamat,
      };

      // 1. Update ke Supabase tabel guru
      if (guru?.nip) {
        try {
          await supabase
            .from('guru')
            .update({
              nama: profileForm.nama,
              foto_profil: profileForm.foto_profil,
              mapel_utama: profileForm.mata_pelajaran,
            })
            .eq('nip', guru.nip);
        } catch (dbErr) {
          console.warn('Update supabase guru notice:', dbErr);
        }
      }

      // 2. Update credentials kustom di localStorage jika akun terdaftar di sana
      try {
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const userKey = Object.keys(customCreds).find(
          (k) =>
            k === guru?.nip ||
            customCreds[k].nip === guru?.nip ||
            customCreds[k].email === userProfile?.username
        );
        if (userKey) {
          customCreds[userKey].nama = profileForm.nama;
          customCreds[userKey].foto_profil = profileForm.foto_profil;
          customCreds[userKey].details = updatedDetails;
          localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
        }
      } catch (storageErr) {}

      // 3. Update State AuthContext agar reaktif seketika
      if (userProfile && setUserProfile) {
        setUserProfile({
          ...userProfile,
          details: updatedDetails,
        });
      }

      toast.success('Profil dan biodata guru berhasil diperbarui!', 'Simpan Sukses');
    } catch (err) {
      toast.error(`Gagal menyimpan profil: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  // Ganti Kata Sandi Guru
  async function handleChangePassword(e) {
    e.preventDefault();
    if (!passNew || passNew.length < 6) {
      toast.error('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (passNew !== passConfirm) {
      toast.error('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Update Supabase Auth jika ada session resmi
      try {
        await supabase.auth.updateUser({ password: passNew });
      } catch (authErr) {}

      // 2. Update ke siak_user_credentials di localStorage
      try {
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const userKey = Object.keys(customCreds).find(
          (k) =>
            k === guru?.nip ||
            customCreds[k].nip === guru?.nip ||
            customCreds[k].email === userProfile?.username
        );
        if (userKey) {
          customCreds[userKey].password = passNew;
          localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
        }
      } catch (storeErr) {}

      toast.success(
        'Kata sandi Anda berhasil diperbarui! Silakan gunakan kata sandi baru untuk sesi login berikutnya.',
        'Keamanan Diperbarui'
      );
      setPassOld('');
      setPassNew('');
      setPassConfirm('');
    } catch (err) {
      toast.error(`Gagal memperbarui kata sandi: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  }

  // State Pengingat Jam Mengajar Guru Real-Time
  const [currentRealTime, setCurrentRealTime] = useState(new Date());
  const [soundReminderEnabled, setSoundReminderEnabled] = useState(true);
  const [dismissedReminderId, setDismissedReminderId] = useState(null);

  // Interval Update Jam Real-Time (Setiap 10 Detik)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRealTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Audio Chime Ramah saat waktu KBM mendekati
  function playChimeReminder() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  // Kalkulasi Cerdas: Sesi Mengajar Saat Ini & Sesi Mengajar Selanjutnya
  const scheduleReminderInfo = (() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDayName = dayNames[currentRealTime.getDay()];
    const nowH = currentRealTime.getHours();
    const nowM = currentRealTime.getMinutes();
    const nowMinutesTotal = nowH * 60 + nowM;
    const nowTimeStr = `${String(nowH).padStart(2, '0')}:${String(nowM).padStart(2, '0')}`;

    const effectiveSchedules = mySchedules.length > 0 ? mySchedules : schedulesList;

    // A. Cari sesi hari ini
    const todaySchedules = effectiveSchedules
      .filter((s) => s.hari === currentDayName)
      .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

    // 1. Apakah sedang ada sesi aktif saat ini?
    const currentActiveSession = todaySchedules.find(
      (s) => s.jam_mulai <= nowTimeStr && s.jam_selesai >= nowTimeStr
    );

    if (currentActiveSession) {
      const [endH, endM] = (currentActiveSession.jam_selesai || '00:00').split(':').map(Number);
      const remainingMinutes = Math.max(0, (endH * 60 + endM) - nowMinutesTotal);
      return {
        type: 'ongoing',
        id: currentActiveSession.id_jadwal,
        schedule: currentActiveSession,
        title: 'Sedang Mengajar (KBM Aktif)',
        badgeText: 'KBM BERLANGSUNG',
        countdownText: remainingMinutes > 0 ? `${remainingMinutes} Menit Tersisa` : 'Selesai Sekarang',
        detailText: `Kelas ${currentActiveSession.kelas?.nama_kelas || '-'} • ${currentActiveSession.mata_pelajaran?.nama_mapel || '-'}`,
        isUrgent: false,
        timeRange: `${currentActiveSession.jam_mulai} - ${currentActiveSession.jam_selesai}`,
      };
    }

    // 2. Apakah ada sesi selanjutnya HARI INI?
    const nextSessionToday = todaySchedules.find((s) => s.jam_mulai > nowTimeStr);
    if (nextSessionToday) {
      const [startH, startM] = (nextSessionToday.jam_mulai || '00:00').split(':').map(Number);
      const diffMinutes = Math.max(0, (startH * 60 + startM) - nowMinutesTotal);

      let countdownText = '';
      if (diffMinutes <= 1) {
        countdownText = 'Segera Dimulai (< 1 Menit)';
      } else if (diffMinutes < 60) {
        countdownText = `${diffMinutes} Menit Lagi`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        countdownText = `${hours} Jam ${mins > 0 ? `${mins} Menit` : ''} Lagi`;
      }

      return {
        type: 'upcoming_today',
        id: nextSessionToday.id_jadwal,
        schedule: nextSessionToday,
        title: 'Jam Mengajar Selanjutnya Hari Ini',
        badgeText: diffMinutes <= 15 ? 'STANDBY / SEGERA MASUK' : 'SESI BERIKUTNYA',
        countdownText,
        diffMinutes,
        isUrgent: diffMinutes <= 15,
        detailText: `Kelas ${nextSessionToday.kelas?.nama_kelas || '-'} • ${nextSessionToday.mata_pelajaran?.nama_mapel || '-'}`,
        timeRange: `${nextSessionToday.jam_mulai} - ${nextSessionToday.jam_selesai}`,
      };
    }

    // 3. Tidak ada sesi lagi hari ini, cari jadwal di hari mengajar berikutnya
    const schoolDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDayIdx = schoolDays.indexOf(currentDayName);

    let nextDaySchedule = null;
    let nextDayLabel = '';

    for (let i = 1; i <= 6; i++) {
      const checkDay = schoolDays[(currentDayIdx + i) % schoolDays.length];
      const matchDay = effectiveSchedules
        .filter((s) => s.hari === checkDay)
        .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''))[0];
      if (matchDay) {
        nextDaySchedule = matchDay;
        nextDayLabel = i === 1 ? 'Besok (' + checkDay + ')' : checkDay;
        break;
      }
    }

    if (nextDaySchedule) {
      return {
        type: 'upcoming_next_day',
        id: nextDaySchedule.id_jadwal,
        schedule: nextDaySchedule,
        title: `Jadwal Mengajar Berikutnya: ${nextDayLabel}`,
        badgeText: 'KBM HARI INI SELESAI',
        countdownText: `${nextDaySchedule.hari}, Pukul ${nextDaySchedule.jam_mulai} WITA`,
        detailText: `Kelas ${nextDaySchedule.kelas?.nama_kelas || '-'} • ${nextDaySchedule.mata_pelajaran?.nama_mapel || '-'}`,
        isUrgent: false,
        timeRange: `${nextDaySchedule.hari} ${nextDaySchedule.jam_mulai} - ${nextDaySchedule.jam_selesai}`,
      };
    }

    return {
      type: 'none',
      id: null,
      schedule: null,
      title: 'Tidak Ada Jadwal Mengajar Aktif',
      badgeText: 'BEBAS KBM',
      countdownText: 'Semua alokasi KBM telah selesai',
      detailText: 'Tidak ada sesi mengajar yang terdaftar untuk guru ini.',
      isUrgent: false,
      timeRange: '-',
    };
  })();

  // Sesi Jadwal yang Sedang Aktif Dipilih
  const currentActiveSchedule = activeInvalSession
    ? {
        id_jadwal: activeInvalSession.id_jadwal,
        id_kelas: activeInvalSession.id_kelas,
        kelas: { nama_kelas: activeInvalSession.nama_kelas },
        mata_pelajaran: { nama_mapel: activeInvalSession.nama_mapel },
        guru: { nama: activeInvalSession.nama_guru_utama },
        isInval: true,
      }
    : schedulesList.find((s) => s.id_jadwal === selectedScheduleId) || mySchedules[0] || null;

  // Initial Data Fetching
  useEffect(() => {
    fetchSettings();
    fetchStudents();
    fetchClasses();
    fetchSchedules();
    fetchTodayAttendance();
    fetchInvalAssignmentsFromCloud().then((res) => {
      if (res) setInvalAssignments(res);
    });
  }, []);

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('pengaturan_sistem').select('kunci, nilai');
      if (data && data.length > 0) {
        const mapped = {};
        data.forEach((item) => { mapped[item.kunci] = item.nilai; });
        setSettings((prev) => ({ ...prev, ...mapped }));
      }
    } catch (e) {}
  }

  async function fetchSchedules() {
    try {
      const { data } = await supabase
        .from('jadwal')
        .select('id_jadwal, id_kelas, id_mapel, id_guru, hari, jam_mulai, jam_selesai, batas_waktu_terlambat, kelas(nama_kelas), mata_pelajaran(nama_mapel), guru(nama)')
        .order('jam_mulai', { ascending: true });
      if (data && data.length > 0) {
        setSchedulesList(data);
      } else {
        const myNip = guru?.nip || '198501152010011002';
        const myName = guru?.nama || 'Bpk. Ahmad Fauzi, S.Pd';
        setSchedulesList([
          { id_jadwal: 'j101', id_kelas: 'c1', hari: 'Senin', jam_mulai: '07:30', jam_selesai: '09:00', kelas: { nama_kelas: 'VII-A' }, mata_pelajaran: { nama_mapel: 'Matematika' }, guru: { nama: myName }, id_guru: myNip },
          { id_jadwal: 'j102', id_kelas: 'c2', hari: 'Selasa', jam_mulai: '08:30', jam_selesai: '10:00', kelas: { nama_kelas: 'VII-B' }, mata_pelajaran: { nama_mapel: 'Matematika' }, guru: { nama: myName }, id_guru: myNip },
          { id_jadwal: 'j103', id_kelas: 'c3', hari: 'Rabu', jam_mulai: '07:30', jam_selesai: '09:45', kelas: { nama_kelas: 'VIII-A' }, mata_pelajaran: { nama_mapel: 'Bahasa Indonesia' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' }, id_guru: '198802202012022001' },
          { id_jadwal: 'j104', id_kelas: 'c4', hari: 'Kamis', jam_mulai: '10:00', jam_selesai: '11:30', kelas: { nama_kelas: 'IX-A' }, mata_pelajaran: { nama_mapel: 'IPA Terpadu' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' }, id_guru: '197905102005012004' },
        ]);
      }
    } catch (e) {
      setSchedulesList([]);
    }
  }

  async function fetchClasses() {
    try {
      const { data } = await supabase
        .from('kelas')
        .select('id_kelas, nama_kelas, tingkat, wali_kelas, guru(nama)')
        .order('tingkat', { ascending: true })
        .order('nama_kelas', { ascending: true });
      if (data && data.length > 0) {
        setClassesList(data);
      } else {
        setClassesList([
          { id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7, wali_kelas: guru?.nip || '198501152010011002' },
          { id_kelas: 'c2', nama_kelas: 'VII-B', tingkat: 7, wali_kelas: '198802202012022001' },
          { id_kelas: 'c3', nama_kelas: 'VIII-A', tingkat: 8, wali_kelas: null },
          { id_kelas: 'c4', nama_kelas: 'IX-A', tingkat: 9, wali_kelas: null },
        ]);
      }
    } catch (e) {
      setClassesList([]);
    }
  }

  async function fetchStudents() {
    try {
      const { data } = await supabase
        .from('siswa')
        .select('nis, nama, foto_wajah, qr_token_pribadi, id_kelas, status_siswa, kelas(nama_kelas)');
      if (data && data.length > 0) {
        setStudentsList(data);
      } else {
        setStudentsList([
          { nis: '202409001', nama: 'Budi Pratama', qr_token_pribadi: 'TOKEN-BUDI-202409001-SECURE', id_kelas: 'c1', status_siswa: 'aktif' },
          { nis: '202409002', nama: 'Siti Rahmawati', qr_token_pribadi: 'TOKEN-SITI', id_kelas: 'c1', status_siswa: 'aktif' },
          { nis: '202409003', nama: 'Ahmad Dahlan', qr_token_pribadi: 'TOKEN-AHMAD', id_kelas: 'c1', status_siswa: 'aktif' },
        ]);
      }
    } catch (e) {}
  }

  async function fetchTodayAttendance() {
    try {
      const today = getTodayDateString();
      const { data } = await supabase.from('absensi').select('*').eq('tanggal', today);
      if (data) {
        const map = {};
        data.forEach((item) => {
          map[item.nis] = item;
        });
        setTodayAttendanceMap(map);
      }
    } catch (err) {}
  }

  // 1. OTOMATIS DETEKSI JAM KBM MENGAJAR SAAT INI
  useEffect(() => {
    if (schedulesList.length === 0 || selectedScheduleId || activeInvalSession) return;

    const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = dayNamesIndo[new Date().getDay()];
    const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

    // Cek jadwal guru hari ini yang cocok dengan jam sekarang
    const teacherScheds = schedulesList.filter(
      (s) => s.id_guru === guru?.nip || s.guru?.nama === guru?.nama
    );
    const matchedToday = teacherScheds.find(
      (s) => s.hari === currentDay && s.jam_mulai <= nowTime && s.jam_selesai >= nowTime
    );

    if (matchedToday) {
      setSelectedScheduleId(matchedToday.id_jadwal);
      setManualFilterKelasId(matchedToday.id_kelas);
    } else {
      // Fallback: Jadwal pertama hari ini atau jadwal pertama guru
      const firstToday = teacherScheds.find((s) => s.hari === currentDay);
      if (firstToday) {
        setSelectedScheduleId(firstToday.id_jadwal);
        setManualFilterKelasId(firstToday.id_kelas);
      } else if (teacherScheds[0]) {
        setSelectedScheduleId(teacherScheds[0].id_jadwal);
        setManualFilterKelasId(teacherScheds[0].id_kelas);
      }
    }
  }, [schedulesList, guru]);

  // Sinkronkan filter kelas manual saat sesi jadwal berubah
  useEffect(() => {
    if (currentActiveSchedule?.id_kelas) {
      setManualFilterKelasId(currentActiveSchedule.id_kelas);
    }
  }, [currentActiveSchedule]);

  // Dynamic QR Code Generator (Terkoneksi ke Sesi KBM)
  useEffect(() => {
    generateDynamicToken();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          generateDynamicToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeInvalSession, selectedScheduleId, currentActiveSchedule]);

  async function generateDynamicToken() {
    const timestamp = Math.floor(Date.now() / 10000);
    const schedId = currentActiveSchedule?.id_jadwal || 'GENERAL';
    const classId = currentActiveSchedule?.id_kelas || 'ALL';
    const teacherId = guru?.nip || 'GURU';

    const sessionPrefix = activeInvalSession
      ? `SIAK-INVAL-${activeInvalSession.id_jadwal}-${teacherId}`
      : `SIAK-KBM-${schedId}-${classId}-${teacherId}`;

    const token = `${sessionPrefix}-${timestamp}-${Math.random().toString(36).substring(7)}`;
    setSessionToken(token);

    try {
      const url = await QRCode.toDataURL(token, {
        width: 320,
        margin: 2,
        color: activeInvalSession
          ? { dark: '#b45309', light: '#ffffff' }
          : { dark: '#1e3a8a', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err) {}
  }

  // Callback saat Guru berhasil scan QR Siswa
  function handleGuruScanSuccess(decodedText) {
    const cleanToken = (decodedText || '').trim();
    const match = studentsList.find(
      (s) => s.qr_token_pribadi === cleanToken || s.nis === cleanToken
    );
    if (match) {
      setScannedStudent(match);
      toast.success(`ID Card Terverifikasi: ${match.nama} (${match.nis})`, 'Siswa Ditemukan');
    } else {
      toast.error(`QR Siswa tidak terdaftar di sistem: ${cleanToken}`, 'QR Tidak Dikenali');
    }
  }

  // Submit Presensi (Tersambung ke Sesi KBM)
  async function submitAttendance(nis, status) {
    try {
      const targetSched = currentActiveSchedule;
      const payload = {
        nis,
        status,
        tanggal: getTodayDateString(),
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        metode: activeTab === 'scanner' ? 'guru_scan' : 'manual',
        keterangan: activeInvalSession
          ? `Hadir KBM (Guru Inval: ${guru?.nama || ''} menggantikan ${activeInvalSession.nama_guru_utama})`
          : `Dicatat oleh Guru ${guru?.nama || ''}`,
      };

      if (targetSched?.id_jadwal) {
        payload.id_jadwal = targetSched.id_jadwal;
      }

      await supabase.from('absensi').insert([payload]);

      // Update map lokal seketika
      setTodayAttendanceMap((prev) => ({
        ...prev,
        [nis]: { status, waktu: payload.waktu, metode: payload.metode },
      }));

      const statusLabels = { H: 'Hadir', T: 'Terlambat', I: 'Izin', S: 'Sakit', A: 'Alpa' };
      toast.success(
        `Absensi NIS ${nis} berhasil dicatat sebagai "${statusLabels[status] || status}"!`,
        'Presensi Berhasil'
      );
      setScannedStudent(null);
    } catch (err) {
      // Fallback lokal
      setTodayAttendanceMap((prev) => ({
        ...prev,
        [nis]: { status, waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) },
      }));
      toast.success(`Absensi dicatat: ${status}`, 'Presensi Berhasil');
      setScannedStudent(null);
    }
  }

  // Tandai Sisa Siswa Hadir Sekaligus
  async function handleMarkRemainingPresent(classStudents) {
    const unrecorded = classStudents.filter((st) => !todayAttendanceMap[st.nis]);
    if (unrecorded.length === 0) {
      toast.info('Semua siswa di kelas ini sudah memiliki catatan presensi hari ini.');
      return;
    }

    const ok = await showConfirm({
      title: 'Tandai Sisa Siswa Hadir?',
      message: `Ada ${unrecorded.length} siswa yang belum presensi. Apakah ingin menandai mereka semua sebagai HADIR (H)?`,
      type: 'question',
      confirmText: 'Ya, Tandai Hadir Semua',
      cancelText: 'Batal',
    });
    if (!ok) return;

    for (const st of unrecorded) {
      await submitAttendance(st.nis, 'H');
    }
    toast.success(`Berhasil menandai ${unrecorded.length} siswa sebagai Hadir!`);
  }

  // Simpan Jurnal KBM Harian
  function handleSaveJurnal(e) {
    e.preventDefault();
    if (!jurnalMateri.trim()) {
      toast.warning('Tuliskan ringkasan materi pembelajaran yang diajarkan hari ini!');
      return;
    }

    setSavingJurnal(true);
    const newEntry = {
      id: 'jrn_' + Date.now(),
      tanggal: getTodayDateString(),
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      id_jadwal: currentActiveSchedule?.id_jadwal,
      nama_kelas: currentActiveSchedule?.kelas?.nama_kelas || 'Kelas',
      nama_mapel: currentActiveSchedule?.mata_pelajaran?.nama_mapel || 'Mata Pelajaran',
      materi: jurnalMateri,
      tugas: jurnalTugas,
      nama_guru: guru?.nama || 'Guru Pengampu',
    };

    const updated = [newEntry, ...jurnalHistory];
    setJurnalHistory(updated);
    localStorage.setItem('siak_jurnal_kbm', JSON.stringify(updated));

    setTimeout(() => {
      setSavingJurnal(false);
      setJurnalMateri('');
      setJurnalTugas('');
      toast.success(
        `Jurnal KBM Kelas ${newEntry.nama_kelas} (${newEntry.nama_mapel}) berhasil disimpan!`,
        'Jurnal KBM Tersimpan'
      );
    }, 400);
  }

  // Inval Mandiri
  async function handleStartInvalMandiri(e) {
    e.preventDefault();
    if (!invalManualForm.id_jadwal) {
      toast.warning('Pilih sesi jadwal yang ingin digantikan!');
      return;
    }

    const targetSched = schedulesList.find((s) => s.id_jadwal === invalManualForm.id_jadwal);
    if (!targetSched) return;

    const assignment = {
      id_jadwal: targetSched.id_jadwal,
      tanggal: getTodayDateString(),
      id_kelas: targetSched.id_kelas,
      nama_kelas: targetSched.kelas?.nama_kelas || 'Kelas',
      nama_mapel: targetSched.mata_pelajaran?.nama_mapel || 'Mata Pelajaran',
      id_guru_utama: targetSched.id_guru,
      nama_guru_utama: targetSched.guru?.nama || 'Guru Pengampu',
      alasan_utama: invalManualForm.alasan || 'Izin / Sakit',
      id_guru_pengganti: guru?.nip || 'GURU_INVAL',
      nama_guru_pengganti: guru?.nama || 'Guru Pengganti',
      catatan: invalManualForm.catatan || '',
      created_by: 'guru',
    };

    const updated = await saveInvalAssignment(assignment);
    setInvalAssignments(updated);
    setActiveInvalSession(assignment);
    setShowInvalPickerModal(false);
    toast.success(
      `Mode Guru Pengganti Aktif: Anda kini mengajar di Kelas ${assignment.nama_kelas} (${assignment.nama_mapel})!`,
      'Inval Mandiri Aktif'
    );
  }

  // Konfirmasi Logout Pop-up
  async function handleConfirmLogout() {
    const ok = await showConfirm({
      title: 'Konfirmasi Keluar Portal Guru',
      message: 'Apakah Anda yakin ingin keluar dari sesi Guru? Pastikan presensi KBM kelas Anda telah tersimpan.',
      type: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Tetap di Sini',
    });
    if (ok) {
      logout();
    }
  }

  // Navigasi Sidebar Menu Items
  const navGroups = [
    {
      group: 'KBM & PRESENSI',
      items: [
        {
          id: 'dynamic-qr',
          label: 'Sesi QR Proyektor',
          icon: QrCode,
          color: 'text-emerald-400',
          badge: currentActiveSchedule ? currentActiveSchedule.kelas?.nama_kelas : null,
        },
        { id: 'scanner', label: 'Scan Kartu Murid', icon: Camera, color: 'text-cyan-400' },
        { id: 'manual', label: 'Presensi Manual Rombel', icon: Users, color: 'text-amber-400' },
        { id: 'jurnal', label: 'Jurnal Materi KBM', icon: BookOpen, color: 'text-blue-400' },
      ],
    },
    {
      group: 'AKADEMIK & WALI KELAS',
      items: [
        {
          id: 'jadwal',
          label: 'Jadwal Mengajar Saya',
          icon: Clock,
          color: 'text-indigo-400',
          badge: mySchedules.length > 0 ? `${mySchedules.length} Sesi` : null,
        },
        { id: 'kalender', label: 'Kalender Kehadiran & Jadwal', icon: Calendar, color: 'text-pink-400' },
        {
          id: 'wali_kelas',
          label: waliKelasOf ? `Hub Wali Kelas (${waliKelasOf.nama_kelas})` : 'Hub Wali Kelas',
          icon: Award,
          color: 'text-purple-400',
          badge: waliKelasOf ? 'Wali Kelas' : 'Info',
        },
        {
          id: 'radar_prestasi',
          label: 'Radar Prestasi & Badges Siswa',
          icon: Trophy,
          color: 'text-amber-400',
          badge: 'Prestasi',
        },
        {
          id: 'inval',
          label: 'Sesi Inval / Pengganti',
          icon: UserPlus,
          color: 'text-amber-400',
          badge: myAssignedInvals.length > 0 ? `${myAssignedInvals.length} Tugas` : null,
        },
      ],
    },
    {
      group: 'AKUN & PENGATURAN',
      items: [
        {
          id: 'profil',
          label: 'Profil & Pengaturan Akun',
          icon: UserCheck,
          color: 'text-teal-400',
        },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const currentNavItem = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

  // Siswa untuk Presensi Manual (Tersaring per Kelas Terpilih)
  const currentClassObj = classesList.find((c) => String(c.id_kelas) === String(manualFilterKelasId));
  const filteredClassStudents = studentsList.filter(
    (st) => String(st.id_kelas) === String(manualFilterKelasId) && st.status_siswa !== 'lulus' && st.status_siswa !== 'pindah'
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row select-none">
      {/* Mobile Backdrop Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* ========================================================= */}
      {/* SIDEBAR NAVIGATION (PERSISTENT DESKTOP + MOBILE DRAWER)   */}
      {/* ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Sidebar: Logo & School Branding */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl p-1 flex items-center justify-center border border-white/15 shrink-0">
              <img
                src={settings.sekolah_logo || 'https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2'}
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-white leading-tight truncate">
                {settings.sekolah_nama || 'SMPN 2 KOTA BANGUN'}
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Portal Guru • Presensi KBM
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middle Sidebar: Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-500/30 text-cyan-200 border border-blue-400/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar: Teacher Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => {
                setActiveTab('profil');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 -m-1 rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
              title="Buka Pengaturan Profil Saya"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                {profileForm.foto_profil ? (
                  <img src={profileForm.foto_profil} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-cyan-300" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  {profileForm.nama || guru?.nama || 'Bpk. Ahmad Fauzi, S.Pd'}
                </span>
                <span className="text-[10px] text-cyan-200 block truncate font-mono">
                  NIP: {guru?.nip || '198501152010011002'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="p-2 rounded-xl text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-colors cursor-pointer shrink-0"
              title="Keluar dari Portal Guru"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* RIGHT MAIN CONTENT AREA                                   */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Header (Hidden on Desktop) */}
        <header className="lg:hidden gradient-header text-white shadow-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 text-white cursor-pointer"
              title="Buka Menu Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xs font-black leading-tight">
                {settings.sekolah_nama || 'SMPN 2 KOTA BANGUN'}
              </h2>
              <p className="text-[10px] text-cyan-200 font-medium">{currentNavItem?.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {scheduleReminderInfo.schedule && (
              <button
                type="button"
                onClick={() => {
                  if (scheduleReminderInfo.type === 'ongoing') {
                    setSelectedScheduleId(scheduleReminderInfo.schedule.id_jadwal);
                    setManualFilterKelasId(scheduleReminderInfo.schedule.id_kelas);
                    setActiveTab('dynamic-qr');
                  } else {
                    setActiveTab('jadwal');
                  }
                }}
                className={`p-2 rounded-xl text-white transition-all cursor-pointer relative ${
                  scheduleReminderInfo.isUrgent
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-white/15 hover:bg-white/25'
                }`}
                title={`Kelas Selanjutnya: ${scheduleReminderInfo.schedule.kelas?.nama_kelas || ''} (${scheduleReminderInfo.countdownText})`}
              >
                <BellRing className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900" />
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Desktop Top Header Bar (Hidden on Mobile) */}
        <header className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-3.5 items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              {React.createElement(currentNavItem?.icon || Clock, { className: 'w-4 h-4' })}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 leading-tight">
                {currentNavItem?.label}
              </h2>
              <p className="text-[11px] text-slate-500">
                Portal Guru • {guru?.nama || 'Pendidik'} {waliKelasOf ? `(Wali Kelas ${waliKelasOf.nama_kelas})` : ''}
              </p>
            </div>
          </div>

          {/* Right Header: Academic Period Badge & Logout */}
          <div className="flex items-center gap-3">
            {/* Quick Next Schedule Reminder Pill (Desktop) */}
            {scheduleReminderInfo.schedule && (
              <button
                type="button"
                onClick={() => {
                  if (scheduleReminderInfo.type === 'ongoing') {
                    setSelectedScheduleId(scheduleReminderInfo.schedule.id_jadwal);
                    setManualFilterKelasId(scheduleReminderInfo.schedule.id_kelas);
                    setActiveTab('dynamic-qr');
                  } else {
                    setActiveTab('jadwal');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-2xl border shadow-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                  scheduleReminderInfo.type === 'ongoing'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : scheduleReminderInfo.isUrgent
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 animate-pulse'
                    : 'bg-indigo-50/70 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                }`}
                title="Klik untuk membuka jadwal / sesi KBM"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    scheduleReminderInfo.type === 'ongoing'
                      ? 'bg-emerald-600 text-white'
                      : scheduleReminderInfo.isUrgent
                      ? 'bg-amber-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {scheduleReminderInfo.isUrgent ? (
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      {scheduleReminderInfo.type === 'ongoing'
                        ? 'Sedang KBM'
                        : scheduleReminderInfo.isUrgent
                        ? 'Segera Masuk'
                        : 'Sesi Selanjutnya'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      ({scheduleReminderInfo.countdownText})
                    </span>
                  </div>
                  <span className="text-xs font-bold truncate block max-w-[190px]">
                    Kelas {scheduleReminderInfo.schedule.kelas?.nama_kelas} • {scheduleReminderInfo.schedule.jam_mulai}
                  </span>
                </div>
              </button>
            )}

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 shadow-xs flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                🎓
              </div>
              <div className="text-left leading-tight">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  T.A. {settings.tahun_ajaran_aktif || '2026/2027'}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Semester {settings.semester_aktif || 'Ganjil'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Main Content View Container */}
        <main className="p-4 sm:p-6 lg:p-8 w-full flex-1 max-w-6xl mx-auto space-y-6">

          {/* ========================================================= */}
          {/* BANNER 0: PENGINGAT JAM MENGAJAR SELANJUTNYA (SMART REMINDER) */}
          {/* ========================================================= */}
          {scheduleReminderInfo.schedule && dismissedReminderId !== scheduleReminderInfo.id && (
            <div
              className={`p-4 sm:p-5 rounded-2xl shadow-xs border transition-all text-left animate-in fade-in flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                scheduleReminderInfo.type === 'ongoing'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : scheduleReminderInfo.isUrgent
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-900 text-white border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    scheduleReminderInfo.isUrgent
                      ? 'bg-white text-amber-600 animate-bounce'
                      : 'bg-white/15 backdrop-blur-md text-white'
                  }`}
                >
                  {scheduleReminderInfo.type === 'ongoing' ? (
                    <Play className="w-6 h-6 fill-current" />
                  ) : scheduleReminderInfo.isUrgent ? (
                    <BellRing className="w-6 h-6" />
                  ) : (
                    <Bell className="w-6 h-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        scheduleReminderInfo.isUrgent
                          ? 'bg-white text-rose-700 shadow-2xs font-black'
                          : scheduleReminderInfo.type === 'ongoing'
                          ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/40'
                          : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40'
                      }`}
                    >
                      {scheduleReminderInfo.badgeText}
                    </span>

                    <span className="text-xs font-mono font-bold text-cyan-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scheduleReminderInfo.timeRange}
                    </span>

                    <span className="text-[11px] font-bold text-amber-200 bg-black/20 px-2 py-0.5 rounded-md">
                      ⏱️ {scheduleReminderInfo.countdownText}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black leading-snug truncate">
                    {scheduleReminderInfo.detailText}
                  </h3>

                  <p className="text-xs text-slate-200/90 mt-0.5">
                    {scheduleReminderInfo.type === 'ongoing'
                      ? 'KBM sedang berlangsung. Pastikan presensi siswa dan jurnal harian telah terisi.'
                      : scheduleReminderInfo.isUrgent
                      ? 'Waktu masuk kelas kurang dari 15 menit. Silakan persiapkan perangkat dan materi KBM Anda!'
                      : scheduleReminderInfo.type === 'upcoming_today'
                      ? 'Jadwal tatap muka selanjutnya hari ini. Presensi dibuka tepat pada jam mulai kelas.'
                      : 'Seluruh jam mengajar hari ini telah selesai. Jadwal di atas merupakan sesi Anda berikutnya.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons & Chime Control */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
                {/* Audio Bell Test / Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    playChimeReminder();
                    setSoundReminderEnabled(!soundReminderEnabled);
                    toast.info(
                      soundReminderEnabled
                        ? 'Nada pengingat dibisukan.'
                        : 'Nada pengingat jam mengajar diaktifkan! (Terdengar nada bel)'
                    );
                  }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/15"
                  title={soundReminderEnabled ? 'Nada pengingat aktif (Klik untuk tes/mute)' : 'Nada pengingat senyap'}
                >
                  {soundReminderEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Primary Action Button */}
                {scheduleReminderInfo.type === 'ongoing' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScheduleId(scheduleReminderInfo.schedule.id_jadwal);
                      setManualFilterKelasId(scheduleReminderInfo.schedule.id_kelas);
                      setActiveTab('dynamic-qr');
                      toast.success(`Sesi QR Proyektor Kelas ${scheduleReminderInfo.schedule.kelas?.nama_kelas} diaktifkan!`);
                    }}
                    className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Buka QR Presensi Sekarang</span>
                  </button>
                ) : scheduleReminderInfo.type === 'upcoming_today' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScheduleId(scheduleReminderInfo.schedule.id_jadwal);
                      setManualFilterKelasId(scheduleReminderInfo.schedule.id_kelas);
                      setActiveTab('dynamic-qr');
                      toast.success(`Mempersiapkan Sesi Kelas ${scheduleReminderInfo.schedule.kelas?.nama_kelas}...`);
                    }}
                    className={`px-4 py-2.5 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                      scheduleReminderInfo.isUrgent
                        ? 'bg-white hover:bg-amber-50 text-rose-900 shadow-rose-950/20'
                        : 'bg-blue-500 hover:bg-blue-400 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Siapkan KBM & Buka QR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('jadwal')}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Lihat Jadwal Lengkap</span>
                  </button>
                )}

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setDismissedReminderId(scheduleReminderInfo.id)}
                  className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  title="Sembunyikan Pengingat Ini"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* BANNER 1: PENUGASAN INVAL DARI ADMIN (JIKA ADA)           */}
          {/* ========================================================= */}
          {myAssignedInvals.length > 0 && !activeInvalSession && (
            <div className="p-4 sm:p-5 bg-amber-600 text-white rounded-2xl shadow-xs border border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-md bg-white/20 inline-block mb-1">
                    Tugas Inval dari Admin Hari Ini
                  </span>
                  <h4 className="text-sm sm:text-base font-bold">
                    Menggantikan {myAssignedInvals[0].nama_guru_utama} di Kelas {myAssignedInvals[0].nama_kelas}
                  </h4>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Mapel: <strong>{myAssignedInvals[0].nama_mapel}</strong> ({myAssignedInvals[0].alasan_utama})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveInvalSession(myAssignedInvals[0]);
                  toast.success(`Sesi Inval Kelas ${myAssignedInvals[0].nama_kelas} diaktifkan!`);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-amber-900 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Mulai Mengajar Inval Ini →
              </button>
            </div>
          )}

          {/* BANNER 2: MODE GURU INVAL SEDANG AKTIF */}
          {activeInvalSession && (
            <div className="p-4 sm:p-5 bg-amber-50 rounded-2xl border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-in fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black tracking-wider">
                      MODE GURU INVAL AKTIF
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      Kelas {activeInvalSession.nama_kelas}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>{activeInvalSession.nama_mapel}</strong> • Menggantikan {activeInvalSession.nama_guru_utama} ({activeInvalSession.alasan_utama})
                  </p>
                  {activeInvalSession.catatan && (
                    <p className="text-[11px] text-amber-900 italic mt-0.5 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
                      📝 Catatan KBM: {activeInvalSession.catatan}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveInvalSession(null);
                  toast.info('Kembali ke sesi kelas pengajaran Anda sendiri.');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              >
                Kembali ke Kelas Sendiri
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* CARD KONTROL: PEMILIH SESI KBM MENGAJAR AKTIF             */}
          {/* ========================================================= */}
          <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Sesi KBM Terpilih
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    {currentActiveSchedule?.kelas?.nama_kelas
                      ? `Kelas ${currentActiveSchedule.kelas.nama_kelas} • ${currentActiveSchedule.mata_pelajaran?.nama_mapel || 'Mapel'}`
                      : 'Pilih Sesi Mengajar Hari Ini'}
                  </h3>
                </div>
              </div>

              {/* Dropdown Ganti Sesi Mengajar Cepat */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedScheduleId}
                  onChange={(e) => {
                    setSelectedScheduleId(e.target.value);
                    const sched = schedulesList.find((s) => s.id_jadwal === e.target.value);
                    if (sched) setManualFilterKelasId(sched.id_kelas);
                    setActiveInvalSession(null);
                  }}
                  className="h-9 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-xs max-w-xs"
                >
                  <optgroup label="⭐ Jadwal Mengajar Anda">
                    {mySchedules.map((s) => (
                      <option key={s.id_jadwal} value={s.id_jadwal}>
                        {s.hari} ({s.jam_mulai} - {s.jam_selesai}) : Kelas {s.kelas?.nama_kelas} - {s.mata_pelajaran?.nama_mapel}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👥 Jadwal Sesi Kelas Lainnya">
                    {schedulesList
                      .filter((s) => s.id_guru !== guru?.nip)
                      .map((s) => (
                        <option key={s.id_jadwal} value={s.id_jadwal}>
                          {s.hari} {s.jam_mulai} : Kelas {s.kelas?.nama_kelas} - {s.mata_pelajaran?.nama_mapel} ({s.guru?.nama})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setShowInvalPickerModal(true)}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  title="Ambil Alih Kelas Rekan Guru (Inval Mandiri)"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: SESI QR PROYEKTOR (DYNAMIC SESSION QR)             */}
          {/* ========================================================= */}
          {activeTab === 'dynamic-qr' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Visual QR Box (Center/Left) */}
                <div className="lg:col-span-7 glass-card rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4 bg-white">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold pb-2 border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <QrCode className="w-4 h-4" /> Dynamic Session QR Code
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-mono">
                      <Clock className="w-3.5 h-3.5" /> Refresh: {countdown}s
                    </span>
                  </div>

                  {/* QR Image Box */}
                  <div className="p-4 bg-white rounded-3xl inline-block shadow-md border border-slate-200">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Dynamic QR" className="w-64 h-64 mx-auto" />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-base font-black text-slate-900">
                      Tampilkan di Layar Proyektor / Smart TV Kelas
                    </h2>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Siswa membuka aplikasi di ponsel masing-masing dan memindai QR dinamis ini yang diperbarui otomatis setiap 10 detik untuk mencegah kecurangan.
                    </p>
                  </div>

                  {/* Button Mode Layar Penuh (Fullscreen Projector Mode) */}
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFullscreenProjector(true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Mode Proyektor Layar Penuh</span>
                    </button>
                  </div>
                </div>

                {/* Sisi Kanan: Live Monitoring Kehadiran Kelas Ini */}
                <div className="lg:col-span-5 glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Live Monitor Kehadiran
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Kelas {currentActiveSchedule?.kelas?.nama_kelas || '-'} hari ini
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                      {filteredClassStudents.filter((st) => todayAttendanceMap[st.nis]?.status === 'H').length} / {filteredClassStudents.length} Hadir
                    </span>
                  </div>

                  {/* Mini List Siswa yang Sudah Scan vs Belum */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {filteredClassStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        Pilih rombel jadwal mengajar untuk memuat daftar siswa.
                      </p>
                    ) : (
                      filteredClassStudents.map((st) => {
                        const att = todayAttendanceMap[st.nis];
                        return (
                          <div
                            key={st.nis}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                              att?.status === 'H'
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : att?.status === 'T'
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-slate-50 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center text-[10px] shrink-0 ${
                                  att?.status === 'H'
                                    ? 'bg-emerald-600 text-white'
                                    : att?.status === 'T'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {att?.status || '—'}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block truncate">{st.nama}</span>
                                <span className="text-[10px] text-slate-500 font-mono">NIS: {st.nis}</span>
                              </div>
                            </div>

                            <div>
                              {att ? (
                                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                  {att.waktu || 'Tercatat'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 italic">
                                  Belum scan
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Form Presensi Manual Lengkap</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SCANNER KAMERA GURU                                */}
          {/* ========================================================= */}
          {activeTab === 'scanner' && (
            <div className="max-w-xl mx-auto glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" /> Pindai ID Card Siswa Fisik
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gunakan kamera ponsel/laptop Anda untuk scan barcode/QR pada ID Card siswa
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                  {currentActiveSchedule?.kelas?.nama_kelas || 'Umum'}
                </span>
              </div>

              <CameraQrScanner
                scannerId="reader-guru"
                title="Pindai ID Card Siswa"
                subTitle="Arahkan lensa ke barcode/QR ID Card siswa"
                onScanSuccess={handleGuruScanSuccess}
              />

              {scannedStudent && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={scannedStudent.foto_wajah || 'https://placehold.co/100x100/1e3a8a/ffffff?text=Murid'}
                      alt="Wajah"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] text-blue-700 font-black uppercase tracking-wider block">
                        Siswa Teridentifikasi
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{scannedStudent.nama}</h3>
                      <p className="text-xs text-slate-600 font-mono">NIS: {scannedStudent.nis}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { code: 'H', label: 'Hadir', bg: 'bg-emerald-600 hover:bg-emerald-700' },
                      { code: 'T', label: 'Terlambat', bg: 'bg-amber-500 hover:bg-amber-600' },
                      { code: 'I', label: 'Izin', bg: 'bg-sky-600 hover:bg-sky-700' },
                      { code: 'S', label: 'Sakit', bg: 'bg-blue-600 hover:bg-blue-700' },
                      { code: 'A', label: 'Alpa', bg: 'bg-rose-600 hover:bg-rose-700' },
                    ].map((btn) => (
                      <button
                        key={btn.code}
                        type="button"
                        onClick={() => submitAttendance(scannedStudent.nis, btn.code)}
                        className={`py-2 rounded-xl text-white font-black text-xs transition-colors shadow-xs ${btn.bg} cursor-pointer`}
                      >
                        {btn.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: PRESENSI MANUAL CERDAS (TERFILTER PER KELAS KBM)   */}
          {/* ========================================================= */}
          {activeTab === 'manual' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" /> Presensi Manual Rombel Kelas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catat kehadiran siswa secara langsung dan monitor status absensi hari ini
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector Filter Kelas */}
                  <select
                    value={manualFilterKelasId}
                    onChange={(e) => setManualFilterKelasId(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Rombel Kelas --</option>
                    {classesList.map((c) => (
                      <option key={c.id_kelas} value={c.id_kelas}>
                        Kelas {c.nama_kelas} (Tingkat {c.tingkat || '-'})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleMarkRemainingPresent(filteredClassStudents)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Tandai Sisa Siswa Hadir</span>
                  </button>
                </div>
              </div>

              {/* Tabel Siswa */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">NIS</th>
                      <th className="p-3">Status Hari Ini</th>
                      <th className="p-3 text-right">Ubah Status Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          Tidak ada siswa yang terdaftar di kelas ini atau belum ada kelas terpilih.
                        </td>
                      </tr>
                    ) : (
                      filteredClassStudents.map((st, idx) => {
                        const att = todayAttendanceMap[st.nis];
                        return (
                          <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-800 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                                {st.nama?.charAt(0) || 'S'}
                              </div>
                              <span>{st.nama}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{st.nis}</td>
                            <td className="p-3">
                              {att ? (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                    att.status === 'H'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : att.status === 'T'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : att.status === 'I'
                                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                      : att.status === 'S'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {att.status === 'H' && '✓ HADIR'}
                                  {att.status === 'T' && '⏱️ TERLAMBAT'}
                                  {att.status === 'I' && '📝 IZIN'}
                                  {att.status === 'S' && '💊 SAKIT'}
                                  {att.status === 'A' && '❌ ALPA'}
                                  {att.waktu && <span className="opacity-75">({att.waktu})</span>}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  Belum Presensi
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex gap-1">
                                {[
                                  { code: 'H', label: 'H', title: 'Hadir', color: 'hover:bg-emerald-600 hover:text-white text-emerald-700 border-emerald-200' },
                                  { code: 'T', label: 'T', title: 'Terlambat', color: 'hover:bg-amber-500 hover:text-white text-amber-700 border-amber-200' },
                                  { code: 'I', label: 'I', title: 'Izin', color: 'hover:bg-sky-600 hover:text-white text-sky-700 border-sky-200' },
                                  { code: 'S', label: 'S', title: 'Sakit', color: 'hover:bg-blue-600 hover:text-white text-blue-700 border-blue-200' },
                                  { code: 'A', label: 'A', title: 'Alpa', color: 'hover:bg-rose-600 hover:text-white text-rose-700 border-rose-200' },
                                ].map((b) => (
                                  <button
                                    key={b.code}
                                    type="button"
                                    onClick={() => submitAttendance(st.nis, b.code)}
                                    title={b.title}
                                    className={`w-7 h-7 rounded-lg border font-black text-xs transition-colors cursor-pointer flex items-center justify-center ${
                                      att?.status === b.code
                                        ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-blue-500/30'
                                        : `bg-white ${b.color}`
                                    }`}
                                  >
                                    {b.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: JURNAL MATERI KBM HARIAN GURU                      */}
          {/* ========================================================= */}
          {activeTab === 'jurnal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input Jurnal Hari Ini */}
              <div className="lg:col-span-6 glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" /> Tulis Jurnal Materi KBM Hari Ini
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Catat materi yang diajarkan untuk dokumentasi pembelajaran dan pengawasan kurikulum
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowJurnalReportModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Cetak Buku Agenda (PDF/Excel)</span>
                  </button>
                </div>

                <form onSubmit={handleSaveJurnal} className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">
                        Kelas: {currentActiveSchedule?.kelas?.nama_kelas || 'Pilih Sesi'}
                      </span>
                      <span className="text-[11px] text-blue-700">
                        Mapel: {currentActiveSchedule?.mata_pelajaran?.nama_mapel || 'Pilih Sesi'}
                      </span>
                    </div>
                    <span className="font-bold text-[11px] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                      {getTodayDateString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Topik / Materi Pembelajaran <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={jurnalMateri}
                      onChange={(e) => setJurnalMateri(e.target.value)}
                      placeholder="Contoh: Bab 2 Aljabar - Membahas operasi perkalian dan pembagian suku banyak (LKS hal 45-48)..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tugas / Lembar Kerja Siswa (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={jurnalTugas}
                      onChange={(e) => setJurnalTugas(e.target.value)}
                      placeholder="Contoh: PR Latihan 2.3 nomor 1-5 dikumpulkan pertemuan berikutnya..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingJurnal}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {savingJurnal ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan Jurnal...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Jurnal KBM Hari Ini</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Riwayat Jurnal Sebelumnya */}
              <div className="lg:col-span-6 glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Riwayat Jurnal Guru
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {jurnalHistory.length} Catatan Tersimpan
                  </span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {jurnalHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">
                      Belum ada catatan jurnal KBM yang tersimpan.
                    </p>
                  ) : (
                    jurnalHistory.map((jrn) => (
                      <div
                        key={jrn.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-1.5 text-xs text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                            Kelas {jrn.nama_kelas} • {jrn.nama_mapel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            {jrn.tanggal} {jrn.waktu}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          <strong>Materi:</strong> {jrn.materi}
                        </p>
                        {jrn.tugas && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                            📝 <strong>Tugas:</strong> {jrn.tugas}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4.5: JADWAL PELAJARAN & ALOKASI MENGAJAR GURU        */}
          {/* ========================================================= */}
          {activeTab === 'jadwal' && (() => {
            const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const currentDay = dayNamesIndo[new Date().getDay()];
            const nowTime = new Date().toTimeString().slice(0, 5);

            const targetSchedules =
              scheduleScope === 'all' || (mySchedules.length === 0 && schedulesList.length > 0)
                ? schedulesList
                : mySchedules;

            const filteredSchedules =
              scheduleFilterDay === 'all'
                ? targetSchedules
                : targetSchedules.filter((s) => s.hari === scheduleFilterDay);

            const currentLiveKbm = mySchedules.find(
              (s) => s.hari === currentDay && s.jam_mulai <= nowTime && s.jam_selesai >= nowTime
            );

            const todayMySchedules = mySchedules.filter((s) => s.hari === currentDay);
            const uniqueClasses = Array.from(
              new Set(mySchedules.map((s) => s.kelas?.nama_kelas).filter(Boolean))
            );

            return (
              <div className="space-y-6">
                {/* 1. Header Jadwal & Mode Tampilan */}
                <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 bg-white space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Jadwal KBM Aktif
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Semester {settings.semester_aktif || 'Ganjil'} • T.A. {settings.tahun_ajaran_aktif || '2026/2027'}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-0.5">
                          Jadwal Pelajaran & Alokasi Mengajar Guru
                        </h2>
                        <p className="text-xs text-slate-600">
                          Tenaga Pendidik: <strong>{guru?.nama || 'Guru Pengampu'}</strong> (NIP: {guru?.nip || '-'})
                        </p>
                      </div>
                    </div>

                    {/* Toolbar Aksi & Tampilan */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Toggle Cakupan: Jadwal Saya vs Semua Rombel */}
                      {schedulesList.length > 0 && (
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setScheduleScope('my')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              scheduleScope === 'my'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Jadwal Saya ({mySchedules.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduleScope('all')}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              scheduleScope === 'all'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Semua Rombel ({schedulesList.length})
                          </button>
                        </div>
                      )}

                      {/* Toggle View: Grid vs Table */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setScheduleViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            scheduleViewMode === 'grid'
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Tampilan Grid Mingguan"
                        >
                          <Grid className="w-4 h-4" />
                          <span className="hidden sm:inline">Grid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleViewMode('table')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            scheduleViewMode === 'table'
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Tampilan Tabel Lengkap"
                        >
                          <List className="w-4 h-4" />
                          <span className="hidden sm:inline">Tabel</span>
                        </button>
                      </div>

                      {/* Tombol Cetak Dokumen Jadwal Resmi */}
                      <button
                        type="button"
                        onClick={() => setShowScheduleReportModal(true)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        title="Cetak Lembar Jadwal Mengajar Resmi (PDF & Excel)"
                      >
                        <PrinterIcon className="w-3.5 h-3.5" />
                        <span>Cetak Jadwal (PDF)</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Kartu Metrik Ringkas Alokasi Mengajar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Total Sesi Mengajar
                      </span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">
                        {mySchedules.length} Sesi
                      </span>
                      <span className="text-[10px] text-slate-500">Pertemuan per minggu</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Beban Jam Tatap Muka
                      </span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">
                        {mySchedules.length * 2} JP
                      </span>
                      <span className="text-[10px] text-slate-500">Jam Pelajaran terstruktur</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Rombel / Kelas Diampu
                      </span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">
                        {uniqueClasses.length} Kelas
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {uniqueClasses.length > 0 ? uniqueClasses.join(', ') : 'Belum Terpetakan'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Jadwal Hari Ini ({currentDay})
                      </span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">
                        {todayMySchedules.length} Sesi
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {todayMySchedules.length > 0 ? 'Ada KBM terjadwal hari ini' : 'Bebas KBM tatap muka hari ini'}
                      </span>
                    </div>
                  </div>

                  {/* 3. Banner KBM Aktif Real-time (Highlight jika sedang berlangsung jam ini) */}
                  {currentLiveKbm && (
                    <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-white/20 font-black text-[10px] uppercase tracking-wider">
                              Sedang Berlangsung Sekarang
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-100">
                              {currentLiveKbm.jam_mulai} - {currentLiveKbm.jam_selesai}
                            </span>
                          </div>
                          <h3 className="text-base font-black mt-0.5">
                            Kelas {currentLiveKbm.kelas?.nama_kelas} • {currentLiveKbm.mata_pelajaran?.nama_mapel}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedScheduleId(currentLiveKbm.id_jadwal);
                            setManualFilterKelasId(currentLiveKbm.id_kelas);
                            setActiveTab('dynamic-qr');
                            toast.success(`Sesi QR Proyektor untuk Kelas ${currentLiveKbm.kelas?.nama_kelas} diaktifkan!`);
                          }}
                          className="px-4 py-2 bg-white text-emerald-900 font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Buka Presensi QR Sekarang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedScheduleId(currentLiveKbm.id_jadwal);
                            setManualFilterKelasId(currentLiveKbm.id_kelas);
                            setActiveTab('jurnal');
                          }}
                          className="px-3.5 py-2 bg-black/20 hover:bg-black/30 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Tulis Jurnal KBM</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. Filter Cepat Hari */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                    <span className="text-xs font-bold text-slate-500 mr-1.5 shrink-0">Filter Hari:</span>
                    {['all', ...daysList].map((d) => {
                      const count =
                        d === 'all'
                          ? targetSchedules.length
                          : targetSchedules.filter((s) => s.hari === d).length;
                      const isToday = d === currentDay;

                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setScheduleFilterDay(d)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            scheduleFilterDay === d
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : isToday
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{d === 'all' ? 'Semua Hari' : d}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              scheduleFilterDay === d
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                          {isToday && d !== 'all' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Hari Ini" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. TAMPILAN GRID MINGGUAN (PER HARI) */}
                {scheduleViewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {daysList
                      .filter((day) => scheduleFilterDay === 'all' || scheduleFilterDay === day)
                      .map((day) => {
                        const dayScheds = targetSchedules.filter((s) => s.hari === day);
                        const isDayToday = day === currentDay;

                        return (
                          <div
                            key={day}
                            className={`rounded-3xl border transition-all flex flex-col bg-white overflow-hidden shadow-xs ${
                              isDayToday
                                ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                                : 'border-slate-200'
                            }`}
                          >
                            {/* Header Kartu Hari */}
                            <div
                              className={`px-5 py-3 border-b flex items-center justify-between ${
                                isDayToday
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm uppercase tracking-wide">
                                  {day}
                                </span>
                                {isDayToday && (
                                  <span className="px-2 py-0.5 rounded-full bg-white text-blue-700 text-[10px] font-black uppercase shadow-2xs">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                  isDayToday ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {dayScheds.length} Sesi
                              </span>
                            </div>

                            {/* Daftar Sesi KBM di Hari Tersebut */}
                            <div className="p-4 space-y-3 flex-1 flex flex-col justify-start">
                              {dayScheds.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 italic text-xs flex flex-col items-center justify-center my-auto">
                                  <Clock className="w-8 h-8 text-slate-300 mb-1.5 opacity-60" />
                                  <span>Tidak ada jadwal mengajar pada hari {day}</span>
                                </div>
                              ) : (
                                dayScheds.map((s, idx) => {
                                  const isLiveNow =
                                    isDayToday && s.jam_mulai <= nowTime && s.jam_selesai >= nowTime;
                                  const isPast = isDayToday && s.jam_selesai < nowTime;

                                  return (
                                    <div
                                      key={s.id_jadwal || idx}
                                      className={`p-3.5 rounded-2xl border transition-all text-left space-y-2.5 ${
                                        isLiveNow
                                          ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                      }`}
                                    >
                                      {/* Header Jam & Status */}
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono font-bold text-slate-700 flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                                          {s.jam_mulai} - {s.jam_selesai}
                                        </span>
                                        {isLiveNow ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                            Berlangsung
                                          </span>
                                        ) : isPast ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                            Selesai
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                            Terjadwal
                                          </span>
                                        )}
                                      </div>

                                      {/* Info Rombel & Mapel */}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-xs">
                                            Kelas {s.kelas?.nama_kelas || s.id_kelas}
                                          </span>
                                          <span className="text-[11px] text-slate-500 font-medium">
                                            Batas: {s.batas_waktu_terlambat || s.jam_mulai}
                                          </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                                          {s.mata_pelajaran?.nama_mapel || 'Mata Pelajaran'}
                                        </h4>
                                        {scheduleScope === 'all' && s.guru?.nama && (
                                          <p className="text-[11px] text-slate-500 mt-0.5">
                                            Guru: <strong>{s.guru.nama}</strong>
                                          </p>
                                        )}
                                      </div>

                                      {/* Tombol Aksi Cepat Sesi Ini */}
                                      <div className="pt-1 flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedScheduleId(s.id_jadwal);
                                            setManualFilterKelasId(s.id_kelas);
                                            setActiveTab('dynamic-qr');
                                            toast.success(
                                              `Sesi QR Proyektor diaktifkan untuk Kelas ${s.kelas?.nama_kelas || ''}!`
                                            );
                                          }}
                                          className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                        >
                                          <QrCode className="w-3.5 h-3.5" />
                                          <span>Buka QR</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedScheduleId(s.id_jadwal);
                                            setManualFilterKelasId(s.id_kelas);
                                            setActiveTab('jurnal');
                                          }}
                                          className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                          title="Tulis Jurnal Materi KBM"
                                        >
                                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Jurnal</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 6. TAMPILAN TABEL TERPERINCI */}
                {scheduleViewMode === 'table' && (
                  <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">
                          Daftar Tabel Terperinci Sesi Mengajar
                        </h4>
                        <p className="text-xs text-slate-500">
                          Menampilkan {filteredSchedules.length} sesi pertemuan KBM
                        </p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                            <th className="py-3 px-3 text-center w-10">No</th>
                            <th className="py-3 px-3">Hari</th>
                            <th className="py-3 px-3">Jam Belajar</th>
                            <th className="py-3 px-3">Rombel / Kelas</th>
                            <th className="py-3 px-3">Mata Pelajaran</th>
                            <th className="py-3 px-3">Toleransi Terlambat</th>
                            {scheduleScope === 'all' && <th className="py-3 px-3">Guru Pengampu</th>}
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 text-center w-36">Aksi Cepat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredSchedules.length === 0 ? (
                            <tr>
                              <td
                                colSpan={scheduleScope === 'all' ? 9 : 8}
                                className="py-8 text-center text-slate-400 italic"
                              >
                                Tidak ada jadwal yang sesuai dengan filter yang dipilih.
                              </td>
                            </tr>
                          ) : (
                            filteredSchedules.map((s, idx) => {
                              const isToday = s.hari === currentDay;
                              const isLive = isToday && s.jam_mulai <= nowTime && s.jam_selesai >= nowTime;
                              const isPast = isToday && s.jam_selesai < nowTime;

                              return (
                                <tr
                                  key={s.id_jadwal || idx}
                                  className={`hover:bg-slate-50/70 transition-colors ${
                                    isLive ? 'bg-emerald-50/40' : ''
                                  }`}
                                >
                                  <td className="py-3 px-3 text-center font-mono text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-slate-800">
                                    <span className="flex items-center gap-1.5">
                                      {s.hari}
                                      {isToday && (
                                        <span className="w-2 h-2 rounded-full bg-blue-500" title="Hari Ini" />
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-700 font-bold">
                                    {s.jam_mulai} - {s.jam_selesai}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-blue-700">
                                    Kelas {s.kelas?.nama_kelas || s.id_kelas}
                                  </td>
                                  <td className="py-3 px-3 font-medium text-slate-900">
                                    {s.mata_pelajaran?.nama_mapel || 'Mata Pelajaran'}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-500">
                                    {s.batas_waktu_terlambat || s.jam_mulai}
                                  </td>
                                  {scheduleScope === 'all' && (
                                    <td className="py-3 px-3 text-slate-700">
                                      {s.guru?.nama || '-'}
                                    </td>
                                  )}
                                  <td className="py-3 px-3 text-center">
                                    {isLive ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                        Berlangsung
                                      </span>
                                    ) : isPast ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                        Selesai
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                        Terjadwal
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedScheduleId(s.id_jadwal);
                                          setManualFilterKelasId(s.id_kelas);
                                          setActiveTab('dynamic-qr');
                                          toast.success(
                                            `Sesi QR Proyektor Kelas ${s.kelas?.nama_kelas} diaktifkan!`
                                          );
                                        }}
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                                        title="Buka Sesi QR Proyektor"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedScheduleId(s.id_jadwal);
                                          setManualFilterKelasId(s.id_kelas);
                                          setActiveTab('jurnal');
                                        }}
                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                                        title="Tulis Jurnal KBM"
                                      >
                                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================= */}
          {/* TAB 5: KALENDER KEHADIRAN & JADWAL KBM                     */}
          {/* ========================================================= */}
          {activeTab === 'kalender' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-600" /> Kalender Presensi & Kehadiran Kelas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pantau kalender presensi harian siswa dan jadwal KBM
                  </p>
                </div>
              </div>

              <ClassAttendanceCalendar
                classes={classesList}
                initialKelasId={waliKelasOf ? waliKelasOf.id_kelas : classesList[0]?.id_kelas}
                isWaliKelas={!!waliKelasOf}
                allowEdit={true}
                activeTeacher={guru}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: HUB WALI KELAS (DEDIKASI KEPENGURUSAN ROMBEL)       */}
          {/* ========================================================= */}
          {activeTab === 'wali_kelas' && (
            <div className="space-y-6">
              {waliKelasOf ? (
                <>
                  {/* Hero Wali Kelas */}
                  <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                          👑
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                              Wali Kelas Resmi
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Tingkat {waliKelasOf.tingkat || '-'}
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-slate-900 mt-0.5">
                            Kepengurusan Rombel Kelas {waliKelasOf.nama_kelas}
                          </h2>
                          <p className="text-xs text-slate-600">
                            Wali Kelas: <strong>{guru?.nama}</strong> (NIP: {guru?.nip})
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReportClass(waliKelasOf)}
                        className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Cetak Rekap Presensi Resmi (PDF/Excel)</span>
                      </button>
                    </div>

                    {/* Ringkasan Presensi Hari Ini di Kelas Wali */}
                    {(() => {
                      const waliStudents = studentsList.filter(
                        (s) => String(s.id_kelas) === String(waliKelasOf.id_kelas)
                      );
                      const presentCount = waliStudents.filter(
                        (s) => todayAttendanceMap[s.nis]?.status === 'H'
                      ).length;
                      const lateCount = waliStudents.filter(
                        (s) => todayAttendanceMap[s.nis]?.status === 'T'
                      ).length;
                      const sickCount = waliStudents.filter(
                        (s) => todayAttendanceMap[s.nis]?.status === 'S'
                      ).length;
                      const permCount = waliStudents.filter(
                        (s) => todayAttendanceMap[s.nis]?.status === 'I'
                      ).length;
                      const alpaCount = waliStudents.filter(
                        (s) => todayAttendanceMap[s.nis]?.status === 'A'
                      ).length;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Siswa</span>
                            <p className="text-lg font-black text-slate-800 mt-0.5">{waliStudents.length}</p>
                          </div>
                          <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Hadir</span>
                            <p className="text-lg font-black text-emerald-700 mt-0.5">{presentCount}</p>
                          </div>
                          <div className="p-3.5 bg-white rounded-2xl border border-amber-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-amber-600 uppercase">Terlambat</span>
                            <p className="text-lg font-black text-amber-700 mt-0.5">{lateCount}</p>
                          </div>
                          <div className="p-3.5 bg-white rounded-2xl border border-sky-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-sky-600 uppercase">Izin</span>
                            <p className="text-lg font-black text-sky-700 mt-0.5">{permCount}</p>
                          </div>
                          <div className="p-3.5 bg-white rounded-2xl border border-blue-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Sakit</span>
                            <p className="text-lg font-black text-blue-700 mt-0.5">{sickCount}</p>
                          </div>
                          <div className="p-3.5 bg-white rounded-2xl border border-rose-200 shadow-2xs text-center">
                            <span className="text-[10px] font-bold text-rose-600 uppercase">Alpa</span>
                            <p className="text-lg font-black text-rose-700 mt-0.5">{alpaCount}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* DAFTAR SISWA KELAS BINAAN: PRESTASI & SIKAP RAPOR */}
                    <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" /> Prestasi Kehadiran & Gamifikasi Siswa Binaan
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Pantau perolehan XP, level, streak, serta generate catatan rapor sikap kedisiplinan murid Anda.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-3">No</th>
                              <th className="py-3 px-3">Siswa</th>
                              <th className="py-3 px-3">Level & XP</th>
                              <th className="py-3 px-3">Streak</th>
                              <th className="py-3 px-3">Status Hari Ini</th>
                              <th className="py-3 px-3 text-center">Aksi Apresiasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const waliStudents = studentsList.filter(
                                (s) => String(s.id_kelas) === String(waliKelasOf.id_kelas)
                              );
                              if (waliStudents.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                      Belum ada siswa terdaftar di rombel kelas ini.
                                    </td>
                                  </tr>
                                );
                              }
                              return waliStudents.map((st, idx) => {
                                const summ = calculateStudentAchievementsSummary(st, {
                                  tahunAjaran: settings.tahun_ajaran_aktif,
                                  semesterAktif: settings.semester_aktif,
                                });
                                const todayAtt = todayAttendanceMap[st.nis];
                                return (
                                  <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3 px-3 font-mono text-slate-500 font-bold">{idx + 1}</td>
                                    <td className="py-3 px-3">
                                      <span className="font-bold text-slate-900 block">{st.nama}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                                          Lvl {summ.level}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-slate-700">
                                          {summ.totalXp} XP
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                        <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                        <span>{st.streak_sekarang || 0} Hari</span>
                                      </span>
                                    </td>
                                    <td className="py-3 px-3">
                                      {todayAtt ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {todayAtt.status === 'H' ? 'Hadir' : todayAtt.status === 'T' ? 'Terlambat' : todayAtt.status} ({todayAtt.waktu})
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Belum Presensi</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedStudentForAchievement(st)}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                          title="Buka Koleksi Badges & Salin Catatan Rapor"
                                        >
                                          <Trophy className="w-3.5 h-3.5" />
                                          <span>Badges & Sikap Rapor</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedStudentForCert(st);
                                            setCertSummary(summ);
                                          }}
                                          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                                          title="Cetak Piagam Penghargaan"
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* SEKSI 2: KELAS LAIN YANG DIAJAR (GURU MAPEL) */}
                  <div className="glass-card rounded-2xl p-6 shadow-xs border border-slate-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                          <span>Kelas Lain yang Anda Ajar (Guru Mapel)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Akses rekapitulasi presensi khusus untuk rombel lain tempat Anda mengajar sesuai jadwal resmi
                        </p>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl">
                        {otherTaughtClasses.length} Rombel Lain Terdaftar
                      </span>
                    </div>

                    {otherTaughtClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center italic">
                        Anda tidak memiliki jadwal mengajar di rombel lain di luar kelas binaan Anda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherTaughtClasses.map((cls) => {
                          const classStudentsCount = studentsList.filter(
                            (s) => String(s.id_kelas) === String(cls.id_kelas)
                          ).length;
                          const myMapelInClass = mySchedules.find(
                            (s) => String(s.id_kelas) === String(cls.id_kelas) || s.kelas?.nama_kelas === cls.nama_kelas
                          )?.mata_pelajaran?.nama_mapel || guru?.mata_pelajaran || 'Mata Pelajaran';

                          return (
                            <div
                              key={cls.id_kelas}
                              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                    Tingkat {cls.tingkat}
                                  </span>
                                  <h4 className="text-base font-black text-slate-900 mt-1">
                                    Kelas {cls.nama_kelas}
                                  </h4>
                                  <span className="text-xs text-slate-500 block">
                                    Mapel: <strong className="text-slate-700">{myMapelInClass}</strong>
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                  {classStudentsCount} Siswa
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedReportClass(cls)}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Cetak Rekap Kelas {cls.nama_kelas}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">
                        Peran: Guru Pengajar Mata Pelajaran
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Anda tidak bertindak sebagai wali kelas rombel. Berikut adalah daftar rombel yang Anda ampu dan berhak Anda akses rekap presensinya.
                      </p>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 shadow-xs border border-slate-200 bg-white space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>Rekapitulasi Kelas yang Anda Ajar ({otherTaughtClasses.length} Rombel)</span>
                    </h4>

                    {otherTaughtClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center italic">
                        Belum ada jadwal rombel mengajar yang terdaftar atas NIP Anda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherTaughtClasses.map((cls) => {
                          const classStudentsCount = studentsList.filter(
                            (s) => String(s.id_kelas) === String(cls.id_kelas)
                          ).length;

                          return (
                            <div
                              key={cls.id_kelas}
                              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                    Tingkat {cls.tingkat}
                                  </span>
                                  <h4 className="text-base font-black text-slate-900 mt-1">
                                    Kelas {cls.nama_kelas}
                                  </h4>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                  {classStudentsCount} Siswa
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedReportClass(cls)}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Cetak Rekap Kelas {cls.nama_kelas}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: RADAR PRESTASI & LEADERBOARD KEDISIPLINAN SISWA       */}
          {/* ========================================================= */}
          {activeTab === 'radar_prestasi' && (
            <div className="space-y-6">
              {/* Header Hero Radar Prestasi */}
              <div className="rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-800 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                      Radar Prestasi & Apresiasi Guru
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">
                      Klasemen & Rekor Kehadiran Siswa
                    </h2>
                    <p className="text-xs text-slate-100/90 mt-0.5">
                      Pantau siswa paling disiplin, cetak piagam penghargaan, dan salin narasi rapor sikap secara instan.
                    </p>
                  </div>
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-300 font-bold pl-2">Filter Rombel:</span>
                  <select
                    value={radarFilterKelas}
                    onChange={(e) => setRadarFilterKelas(e.target.value)}
                    className="h-8 bg-white text-slate-800 text-xs font-bold rounded-lg px-3 border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Kelas Sekolah</option>
                    {classesList.map((c) => (
                      <option key={c.id_kelas} value={c.id_kelas}>
                        Kelas {c.nama_kelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabel Leaderboard Siswa */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                    Peringkat Siswa Terdisiplin
                  </h3>
                  <span className="text-xs text-slate-500">
                    Diurutkan berdasarkan rekor streak kehadiran tanpa alpa
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 text-center">Rank</th>
                        <th className="py-3 px-3">Nama Siswa</th>
                        <th className="py-3 px-3">Kelas</th>
                        <th className="py-3 px-3">Rekor Streak</th>
                        <th className="py-3 px-3">Level & XP</th>
                        <th className="py-3 px-3 text-center">Aksi Wali Kelas / Guru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const targetList = studentsList
                          .filter((st) => radarFilterKelas === 'all' || String(st.id_kelas) === String(radarFilterKelas))
                          .sort((a, b) => (b.streak_sekarang || 0) - (a.streak_sekarang || 0));

                        if (targetList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                                Tidak ada data siswa untuk kelas ini.
                              </td>
                            </tr>
                          );
                        }

                        return targetList.slice(0, 30).map((st, idx) => {
                          const summ = calculateStudentAchievementsSummary(st, {
                            tahunAjaran: settings.tahun_ajaran_aktif,
                            semesterAktif: settings.semester_aktif,
                          });
                          const isTop3 = idx < 3;
                          return (
                            <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`w-7 h-7 rounded-xl text-xs font-black inline-flex items-center justify-center ${
                                    idx === 0
                                      ? 'bg-amber-400 text-white shadow-xs'
                                      : idx === 1
                                      ? 'bg-slate-400 text-white shadow-xs'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 block">{st.nama}</span>
                                <span className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</span>
                              </td>
                              <td className="py-3 px-3 font-bold text-blue-700">
                                Kelas {st.kelas?.nama_kelas || st.id_kelas || '-'}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-200">
                                  <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                  <span>{st.streak_sekarang || 0} Hari</span>
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-black text-[10px] border border-indigo-200 mr-1.5">
                                  Lvl {summ.level}
                                </span>
                                <span className="font-mono text-slate-600 font-bold">{summ.totalXp} XP</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForAchievement(st)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span>Lihat Prestasi & Catatan Rapor</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudentForCert(st);
                                      setCertSummary(summ);
                                    }}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Piagam</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: SESI INVAL / GURU PENGGANTI                        */}
          {/* ========================================================= */}
          {activeTab === 'inval' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-amber-600" /> Sesi Guru Pengganti (Inval)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola sesi penugasan menggantikan rekan guru yang berhalangan hadir (sakit, izin, dinas)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInvalPickerModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ambil Alih Kelas Inval Mandiri</span>
                </button>
              </div>

              {/* Daftar Inval Hari Ini */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">Penugasan Inval untuk Anda Hari Ini:</h4>
                {myAssignedInvals.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400">
                    Tidak ada penugasan guru pengganti aktif hari ini. Anda mengajar sesuai jadwal kelas Anda sendiri.
                  </div>
                ) : (
                  myAssignedInvals.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                            INVAL KELAS {inv.nama_kelas}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {inv.nama_mapel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Menggantikan: <strong>{inv.nama_guru_utama}</strong> ({inv.alasan_utama})
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveInvalSession(inv);
                          setActiveTab('dynamic-qr');
                          toast.success(`Sesi Inval Kelas ${inv.nama_kelas} diaktifkan!`);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Buka Sesi QR Inval Ini →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: PROFIL & PENGATURAN AKUN GURU                    */}
          {/* ========================================================= */}
          {activeTab === 'profil' && (
            <div className="space-y-6 animate-in fade-in">
              {/* 1. HERO PROFILE SUMMARY CARD */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    {/* Foto Profil dengan Aksi Ganti Foto */}
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-600 p-1 shadow-xs overflow-hidden flex items-center justify-center text-white">
                        {profileForm.foto_profil ? (
                          <img
                            src={profileForm.foto_profil}
                            alt="Foto Profil"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <GraduationCap className="w-12 h-12 text-white" />
                        )}
                      </div>

                      {/* Tombol Kamera Mengganti Foto */}
                      <button
                        type="button"
                        onClick={() => avatarFileRef.current?.click()}
                        className="absolute -bottom-1.5 -right-1.5 p-2 bg-blue-600 hover:bg-blue-700 active:scale-90 text-white rounded-2xl shadow-md border-2 border-white transition-all cursor-pointer"
                        title="Unggah Foto Profil Baru"
                      >
                        <CameraIcon className="w-4 h-4" />
                      </button>

                      <input
                        type="file"
                        ref={avatarFileRef}
                        onChange={handleAvatarFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    {/* Identitas Guru */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          Tenaga Pendidik Aktif
                        </span>
                        {waliKelasOf && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            Wali Kelas {waliKelasOf.nama_kelas}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        {profileForm.nama || guru?.nama || 'Nama Guru'}
                      </h2>

                      <p className="text-xs sm:text-sm font-mono text-slate-500 font-bold">
                        NIP: {guru?.nip || 'Belum Terdaftar'}
                      </p>

                      <p className="text-xs text-slate-600 font-medium">
                        Mata Pelajaran: <strong>{profileForm.mata_pelajaran || 'Guru Mata Pelajaran'}</strong> • {settings.sekolah_nama}
                      </p>
                    </div>
                  </div>

                  {/* Quick Card Stats */}
                  <div className="grid grid-cols-2 gap-3 shrink-0 sm:w-64">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Beban Jadwal
                      </span>
                      <span className="text-lg font-black text-slate-800 mt-0.5 block">
                        {mySchedules.length * 2} JP
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Rombel Binaan
                      </span>
                      <span className="text-lg font-black text-slate-800 mt-0.5 block">
                        {new Set(mySchedules.map((s) => s.id_kelas)).size || 1} Kelas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'biodata', label: 'Identitas & Biodata', icon: User },
                    { id: 'keamanan', label: 'Kata Sandi & Keamanan', icon: Lock },
                    { id: 'preferensi', label: 'Preferensi Portal', icon: Layers },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = profileSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileSubTab(tab.id)}
                        className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <TabIcon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. SUB-TAB 1: IDENTITAS & BIODATA GURU */}
              {profileSubTab === 'biodata' && (
                <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" /> Informasi Data Pribadi & Kepegawaian
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Perbarui nama lengkap, gelar akademik, kontak komunikasi, dan foto profil resmi Anda
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Acak Avatar Kartun</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nama Lengkap & Gelar */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Nama Lengkap & Gelar Akademik <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={profileForm.nama}
                          onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                          placeholder="Contoh: Bpk. Hendra Wijaya, M.Kom"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* NIP / NUPTK (Read-Only) */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">NIP / NUPTK Resmi</label>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Dikunci Dapodik
                          </span>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={profileForm.nip}
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-all"
                        />
                      </div>

                      {/* Mata Pelajaran Diampu */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Mata Pelajaran Spesialisasi
                        </label>
                        <input
                          type="text"
                          value={profileForm.mata_pelajaran}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, mata_pelajaran: e.target.value })
                          }
                          placeholder="Contoh: Informatika / Komputer"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Nomor WhatsApp / Telepon */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Nomor WhatsApp Aktif
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={profileForm.no_telepon}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, no_telepon: e.target.value })
                            }
                            placeholder="08xxxxxxxxxx"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Email Akun */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">Email Sekolah</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            placeholder="nama.guru@sekolah.sch.id"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Alamat Domisili */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">Alamat Tempat Tinggal</label>
                        <input
                          type="text"
                          value={profileForm.alamat}
                          onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                          placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Tombol Simpan */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Simpan Perubahan Profil</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. SUB-TAB 2: KATA SANDI & KEAMANAN */}
              {profileSubTab === 'keamanan' && (
                <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white space-y-6 max-w-2xl">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-600" /> Perbarui Kata Sandi Akun
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gunakan kombinasi kata sandi yang aman untuk melindungi akun mengajar Anda
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Kata Sandi Baru</label>
                      <div className="relative">
                        <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={passNew}
                          onChange={(e) => setPassNew(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Konfirmasi Kata Sandi Baru
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={passConfirm}
                          onChange={(e) => setPassConfirm(e.target.value)}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="showPassToggle"
                        checked={showPass}
                        onChange={(e) => setShowPass(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="showPassToggle"
                        className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                      >
                        Tampilkan Kata Sandi
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingPassword ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menyimpan Sandi...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Perbarui Kata Sandi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. SUB-TAB 3: PREFERENSI PORTAL */}
              {profileSubTab === 'preferensi' && (
                <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white space-y-6 max-w-2xl">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-600" /> Preferensi & Pengalaman Portal Guru
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sesuaikan pengaturan antarmuka dan notifikasi sesuai kenyamanan mengajar Anda
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Toggle Nada Dering Bel Pengingat */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          Nada Bel Pengingat Jam Mengajar (Chime Sound)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Membunyikan nada pengingat lonceng lembut ketika sesi mengajar berikutnya mendekati 15 menit
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playChimeReminder();
                          setSoundReminderEnabled(!soundReminderEnabled);
                        }}
                        className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                          soundReminderEnabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            soundReminderEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Pilihan Format Tampilan Jadwal Default */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          Format Tampilan Default Jadwal Mengajar
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tentukan tata letak awal saat Anda membuka halaman jadwal
                        </p>
                      </div>

                      <select
                        value={scheduleViewMode}
                        onChange={(e) => setScheduleViewMode(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <option value="grid">Grid Mingguan (Hari)</option>
                        <option value="table">Tabel Terperinci</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* OVERLAY: MODE PROYEKTOR LAYAR PENUH (FULLSCREEN CLEAN)     */}
      {/* ========================================================= */}
      {isFullscreenProjector && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-6 sm:p-10 animate-in fade-in duration-200">
          {/* Header Fullscreen */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 p-1 flex items-center justify-center">
                <img
                  src={settings.sekolah_logo || 'https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2'}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">{settings.sekolah_nama}</h2>
                <p className="text-xs text-cyan-300 font-bold">
                  Kelas {currentActiveSchedule?.kelas?.nama_kelas} • {currentActiveSchedule?.mata_pelajaran?.nama_mapel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreenProjector(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Tutup Layar Penuh</span>
            </button>
          </div>

          {/* Center Huge QR Box */}
          <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="p-6 bg-white rounded-3xl shadow-2xl ring-4 ring-white/20">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Fullscreen QR" className="w-80 h-80 sm:w-96 sm:h-96 mx-auto" />
              ) : (
                <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
              )}
            </div>

            <div className="space-y-1 text-white">
              <p className="text-sm font-bold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>QR Otomatis Diperbarui Dalam: <strong className="text-amber-400 text-base">{countdown} Detik</strong></span>
              </p>
              <p className="text-xs text-slate-400">
                Arahkan kamera ponsel Anda langsung ke layar proyektor untuk mencatat presensi.
              </p>
            </div>
          </div>

          {/* Footer Fullscreen */}
          <div className="text-center text-xs text-slate-500">
            Guru Pengampu: {guru?.nama || 'Pendidik'} • SIAK Enterprise Presence System
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL REKAPITULASI PRESENSI KELAS WALI KELAS / MAPEL       */}
      {/* ========================================================= */}
      {selectedReportClass && (
        <ClassAttendanceReportModal
          isOpen={!!selectedReportClass}
          onClose={() => setSelectedReportClass(null)}
          kelas={selectedReportClass}
          schoolSettings={settings}
          isAdmin={false}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL AMBIL ALIH KELAS INVAL MANDIRI                       */}
      {/* ========================================================= */}
      {showInvalPickerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Ambil Alih Kelas Inval</h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih kelas rekan guru yang berhalangan hadir untuk Anda gantikan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvalPickerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartInvalMandiri} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Jadwal KBM yang Ingin Digantikan
                </label>
                <select
                  value={invalManualForm.id_jadwal}
                  onChange={(e) => setInvalManualForm((prev) => ({ ...prev, id_jadwal: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Sesi KBM Kelas Lain --</option>
                  {schedulesList
                    .filter((s) => s.id_guru !== guru?.nip)
                    .map((s) => (
                      <option key={s.id_jadwal} value={s.id_jadwal}>
                        [{s.hari} {s.jam_mulai}] Kelas {s.kelas?.nama_kelas} - {s.mata_pelajaran?.nama_mapel} ({s.guru?.nama})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Rekan Guru Tidak Hadir
                </label>
                <select
                  value={invalManualForm.alasan}
                  onChange={(e) => setInvalManualForm((prev) => ({ ...prev, alasan: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="Sakit">Sakit</option>
                  <option value="Izin">Izin Keperluan Keluarga</option>
                  <option value="Tugas Dinas Luar">Tugas Dinas Luar</option>
                  <option value="Keperluan Mendesak">Keperluan Mendesak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Materi / Instruksi Tugas (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={invalManualForm.catatan}
                  onChange={(e) => setInvalManualForm((prev) => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Contoh: Mengisi materi latihan soal Bab 3..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvalPickerModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Mulai Sesi Inval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL REKAPITULASI JURNAL KBM & AGENDA GURU (PDF & EXCEL) */}
      {/* ========================================================= */}
      <JurnalKbmReportModal
        isOpen={showJurnalReportModal}
        onClose={() => setShowJurnalReportModal(false)}
        initialTeacher={guru}
        allTeachers={[]}
        schoolSettings={settings}
        isAdmin={false}
      />

      {/* ========================================================= */}
      {/* MODAL CETAK JADWAL PELAJARAN GURU (PDF & EXCEL)           */}
      {/* ========================================================= */}
      <TeacherScheduleReportModal
        isOpen={showScheduleReportModal}
        onClose={() => setShowScheduleReportModal(false)}
        teacher={guru}
        schedules={mySchedules.length > 0 ? mySchedules : schedulesList}
        schoolSettings={settings}
      />

      {/* ========================================================= */}
      {/* MODAL SHOWCASE ACHIEVEMENT & RAPOR SIKAP SISWA            */}
      {/* ========================================================= */}
      <StudentAchievementModal
        isOpen={Boolean(selectedStudentForAchievement)}
        onClose={() => setSelectedStudentForAchievement(null)}
        student={selectedStudentForAchievement}
        tahunAjaran={settings.tahun_ajaran_aktif}
        semesterAktif={settings.semester_aktif}
        onOpenCertificate={(st, sum) => {
          setSelectedStudentForCert(st);
          setCertSummary(sum);
        }}
      />

      {/* ========================================================= */}
      {/* MODAL PIAGAM PENGHARGAAN RESMI SEKOLAH                    */}
      {/* ========================================================= */}
      <SchoolCertificateModal
        isOpen={Boolean(selectedStudentForCert)}
        onClose={() => {
          setSelectedStudentForCert(null);
          setCertSummary(null);
        }}
        student={selectedStudentForCert}
        summary={certSummary}
        settings={settings}
      />
    </div>
  );
}
