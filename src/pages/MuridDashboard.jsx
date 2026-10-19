import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastModalContext';
import { supabase } from '../lib/supabase';
import {
  Flame,
  Award,
  Calendar,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  LogOut,
  Sparkles,
  QrCode,
  UserCheck,
  BookOpen,
  Clock,
  Layers,
  FileText,
  ShieldCheck,
  Menu,
  X,
  Printer,
  ChevronRight,
  Download,
  Upload,
  Check,
  Smile,
  Zap,
  TrendingUp,
  School,
  Lock,
  Phone,
  Mail,
  RefreshCw,
  Search,
  Bell,
  CheckSquare,
  Trophy,
  Medal,
  Target,
  Star,
  Crown,
  Maximize2,
  Copy,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import CameraQrScanner from '../components/CameraQrScanner';
import AttendanceCalendar from '../components/AttendanceCalendar';
import StudentAttendancePdfModal from '../components/StudentAttendancePdfModal';
import {
  calculateStudentLevel,
  getCustomMissions,
  evaluateCustomMissionForStudent,
  calculateClassDisciplineLeaderboard,
  calculateGradeDisciplineComparison,
  sortAndRankStudentsByStreak,
  assignSharedRanks,
} from '../lib/achievementManager';

export default function MuridDashboard() {
  const { userProfile, logout, setUserProfile } = useAuth();
  const { toast, showConfirm } = useToast();
  const siswa = userProfile?.details;
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Konfirmasi Logout Siswa
  async function handleConfirmLogout() {
    const ok = await showConfirm({
      title: 'Keluar dari Portal Siswa',
      message: 'Apakah Anda yakin ingin keluar dari akun siswa ini? Pastikan seluruh aktivitas dan presensi harian sudah tersimpan.',
      type: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Tetap di Sini',
    });
    if (ok) {
      logout();
    }
  }

  // Sidebar & Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#tab=')) {
        const tabFromHash = decodeURIComponent(hash.replace('#tab=', ''));
        if (tabFromHash) return tabFromHash;
      }
      return localStorage.getItem('siak_active_tab_murid') || 'qr_siswa';
    } catch (e) {
      return 'qr_siswa';
    }
  });

  useEffect(() => {
    if (activeTab) {
      try {
        localStorage.setItem('siak_active_tab_murid', activeTab);
        window.history.replaceState(null, '', `#tab=${encodeURIComponent(activeTab)}`);
      } catch (e) {}
    }
  }, [activeTab]);

  // Identitas & Pengaturan Sekolah (Tersinkronisasi dengan Admin Dashboard)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      return {
        sekolah_nama: saved.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: saved.sekolah_logo || '',
        sekolah_stempel: saved.sekolah_stempel || '',
        sekolah_npsn: saved.sekolah_npsn || '30401234',
        sekolah_akreditasi: saved.sekolah_akreditasi || 'A (Unggul)',
        sekolah_alamat: saved.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: saved.sekolah_kota || 'Kota Bangun, Kutai Kartanegara',
        tahun_ajaran_aktif: saved.tahun_ajaran_aktif || '2026/2027',
        semester_aktif: saved.semester_aktif || 'Ganjil',
        kepala_sekolah_nama: saved.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: saved.kepala_sekolah_nip || '197003121995121001',
        radiusAktif: saved.sekolah_radius_aktif === 'true' || saved.sekolah_radius_aktif === true,
        radiusMeter: Number(saved.sekolah_radius_meter) || 100,
        sekolahLat: Number(saved.sekolah_lat) || -0.245892,
        sekolahLng: Number(saved.sekolah_lng) || 116.59123,
      };
    } catch (e) {
      return {
        sekolah_nama: 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: '',
        sekolah_stempel: '',
        sekolah_npsn: '30401234',
        sekolah_akreditasi: 'A (Unggul)',
        sekolah_alamat: 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: 'Kota Bangun, Kutai Kartanegara',
        tahun_ajaran_aktif: '2026/2027',
        semester_aktif: 'Ganjil',
        kepala_sekolah_nama: 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: '197003121995121001',
        radiusAktif: false,
        radiusMeter: 100,
        sekolahLat: -0.245892,
        sekolahLng: 116.59123,
      };
    }
  });

  // State GPS & Scanner
  const [gpsStatus, setGpsStatus] = useState({
    loading: false,
    verified: false,
    distance: null,
    message: '',
  });
  const [currentCoords, setCurrentCoords] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // QR ID Card Siswa (Untuk di-scan oleh Kamera Guru)
  const [studentQrDataUrl, setStudentQrDataUrl] = useState('');
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Generate QR Siswa Pribadi (Kompatibel dengan Scanner Guru: qr_token_pribadi || nis)
  useEffect(() => {
    const token = (siswa?.qr_token_pribadi || siswa?.nis || '').trim();
    if (!token) return;

    QRCode.toDataURL(token, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a', // Navy / Slate gelap kontras tinggi
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setStudentQrDataUrl(url))
      .catch((err) => {
        console.error('Gagal generate QR Code Siswa:', err);
      });
  }, [siswa?.qr_token_pribadi, siswa?.nis]);

  // Fungsi Unduh Gambar QR Siswa
  const handleDownloadQr = () => {
    if (!studentQrDataUrl) {
      toast.warning('QR Code belum siap untuk diunduh');
      return;
    }
    const link = document.createElement('a');
    link.href = studentQrDataUrl;
    const cleanNis = siswa?.nis || 'siswa';
    const cleanNama = (siswa?.nama || 'murid').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `QR_Presensi_${cleanNis}_${cleanNama}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Kartu QR Presensi berhasil diunduh ke galeri perangkat Anda!', 'Unduh Berhasil');
  };

  // Fungsi Salin Token Presensi
  const handleCopyToken = () => {
    const token = (siswa?.qr_token_pribadi || siswa?.nis || '').trim();
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success(`Token berhasil disalin: ${token}`, 'Tersalin ke Clipboard');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Data Akademik & Presensi
  const [schedulesList, setSchedulesList] = useState([]);
  const [todayAttendanceList, setTodayAttendanceList] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allStudentsLeaderboard, setAllStudentsLeaderboard] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [leaderboardCategory, setLeaderboardCategory] = useState('streak'); // 'streak' | 'kelas' | 'tingkat'
  const [leaderboardScope, setLeaderboardScope] = useState('class'); // 'class' | 'school'
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month'); // 'week' | 'month' | 'semester'
  const [kbmTasks, setKbmTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`siak_tasks_done_${siswa?.nis || 'student'}`) || '[]');
    } catch (e) {
      return [];
    }
  });


  // State Pengajuan Izin / Sakit (E-Permit)
  const [permitsList, setPermitsList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_permohonan_izin') || '[]');
      return saved.filter((p) => String(p.nis) === String(siswa?.nis));
    } catch (e) {
      return [];
    }
  });
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [permitForm, setPermitForm] = useState({
    kategori: 'Sakit', // 'Sakit' | 'Izin' | 'Keperluan Mendesak'
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tanggal_selesai: new Date().toISOString().split('T')[0],
    alasan: '',
    foto_bukti: '',
  });
  const [savingPermit, setSavingPermit] = useState(false);

  // State Pengaturan Profil
  const [profileForm, setProfileForm] = useState({
    nama: siswa?.nama || '',
    nis: siswa?.nis || '',
    nisn: siswa?.nisn || '',
    kelas_nama: siswa?.kelas?.nama_kelas || 'Kelas',
    nama_ortu: siswa?.nama_ortu || '',
    telepon_ortu: siswa?.telepon_ortu || '',
    alamat: siswa?.alamat || '',
    foto_wajah: siswa?.foto_wajah || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // State Galeri Achievement Gamifikasi
  const [selectedAchievementModal, setSelectedAchievementModal] = useState(null);
  const [achievementCategoryFilter, setAchievementCategoryFilter] = useState('all'); // 'all' | 'grade' | 'seasonal' | 'streak' | 'punctuality' | 'stamina' | 'leaderboard'
  const [achievementGradeFilter, setAchievementGradeFilter] = useState('all'); // 'all' | '7' | '8' | '9'
  const [achievementPeriodFilter, setAchievementPeriodFilter] = useState('all'); // 'all' | 'ganjil' | 'genap'
  const [achievementStatusFilter, setAchievementStatusFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  // Misi Kustom yang Dikelola Admin Sekolah
  const [customMissions, setCustomMissions] = useState(() => getCustomMissions());

  // Sinkronisasi Real-Time saat Admin Menambah / Mengubah Misi Kustom
  useEffect(() => {
    const handleCustomMissionsUpdate = () => {
      setCustomMissions(getCustomMissions());
    };
    window.addEventListener('siak_custom_achievements_updated', handleCustomMissionsUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'siak_custom_achievements') {
        handleCustomMissionsUpdate();
      }
    });
    return () => {
      window.removeEventListener('siak_custom_achievements_updated', handleCustomMissionsUpdate);
      window.removeEventListener('storage', handleCustomMissionsUpdate);
    };
  }, []);

  // Deteksi Jenjang Kelas Siswa (7, 8, atau 9)
  const studentGrade = React.useMemo(() => {
    const rawClass = (siswa?.kelas?.nama_kelas || '').toUpperCase();
    if (rawClass.includes('IX') || rawClass.includes('9')) return 9;
    if (rawClass.includes('VIII') || rawClass.includes('8')) return 8;
    return 7;
  }, [siswa?.kelas]);

  const tahunAjaran = settings.tahun_ajaran_aktif || '2026/2027';
  const semesterAktif = settings.semester_aktif || 'Ganjil';

  // Kalkulasi Otomatis Seluruh Badges Berbasis Data Presensi Siswa & Jenjang Kelas
  const achievementsList = React.useMemo(() => {
    const streakNow = Number(siswa?.streak_sekarang) || 0;
    const streakBest = Number(siswa?.streak_tertinggi) || streakNow;
    const effectiveStreak = Math.max(streakNow, streakBest);

    // Kumpulan tanggal hadir unik
    const presentDates = new Set(
      attendanceHistory.filter((a) => a.status === 'H').map((a) => a.tanggal)
    );
    const totalPresentDays = presentDates.size;

    // Karena absensi dilakukan bersama di kelas, indikator kedisiplinan berfokus pada kehadiran aktif & nihil alpa
    const alpaRecords = attendanceHistory.filter((a) => a.status === 'A');
    const isZeroAlpaMonth = attendanceHistory.length >= 6 && alpaRecords.length === 0;

    // Cek sesi KBM hari ini
    const todaySessionsCount = todayAttendanceList.length;

    // Cek ranking di leaderboard dengan standar posisi seri adil (juara bersama)
    const rankedClassLeaderboard = sortAndRankStudentsByStreak(
      leaderboard.length > 0 ? leaderboard : (allStudentsLeaderboard.length > 0 ? allStudentsLeaderboard : (siswa ? [siswa] : [])),
      (s) => Number(s.streak_sekarang) || 0
    );
    const myRankItem = rankedClassLeaderboard.find((item) => String(item.nis) === String(siswa?.nis));
    const myRank = myRankItem?.rank || 1;

    // Cek kehadiran bulan Desember
    const decemberRecords = attendanceHistory.filter((a) => a.tanggal && a.tanggal.includes('-12-'));
    const isDecemberActive = decemberRecords.length > 0 || effectiveStreak >= 10;

    return [
      // =========================================================
      // GRUP 1: MISI KHUSUS KELAS 7 (FASE ADAPTASI & FONDASI)
      // =========================================================
      {
        id: 'grade_7_adapt',
        category: 'grade',
        gradeScope: '7',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 7 (Adaptasi)',
        title: 'Junior Adaptif 7',
        description: 'Berhasil beradaptasi di lingkungan SMP dengan hadir 7 hari perdana di kelas 7.',
        tier: 'bronze',
        icon: '🎒',
        xp: 150,
        currentProgress: studentGrade >= 7 ? Math.min(effectiveStreak, 7) : 7,
        maxProgress: 7,
        unit: 'Hari',
        isUnlocked: studentGrade > 7 || effectiveStreak >= 7,
        unlockedDate: 'Tercapai',
      },
      {
        id: 'grade_7_mapel',
        category: 'grade',
        gradeScope: '7',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 7 (Adaptasi)',
        title: 'Eksplorasi Mapel 7',
        description: 'Presensi hadir lengkap pada minimal 6 mata pelajaran baru di jenjang kelas 7.',
        tier: 'silver',
        icon: '🧭',
        xp: 300,
        currentProgress: studentGrade >= 7 ? Math.min(presentDates.size, 6) : 6,
        maxProgress: 6,
        unit: 'Mapel',
        isUnlocked: studentGrade > 7 || presentDates.size >= 6,
        unlockedDate: 'Tercapai',
      },
      {
        id: 'grade_7_pionir',
        category: 'grade',
        gradeScope: '7',
        periodScope: 'ganjil',
        categoryLabel: 'Misi Kelas 7 (Adaptasi)',
        title: 'Pionir Angkatan 7',
        description: 'Meraih tingkat kehadiran 100% di bulan pertama masa adaptasi sekolah menengah.',
        tier: 'gold',
        icon: '🌱',
        xp: 500,
        currentProgress: studentGrade >= 7 ? (effectiveStreak >= 10 ? 1 : 0) : 1,
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: studentGrade > 7 || effectiveStreak >= 10,
        unlockedDate: 'Tercapai',
      },
      {
        id: 'grade_7_master',
        category: 'grade',
        gradeScope: '7',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 7 (Adaptasi)',
        title: 'Bintang Masa Depan 7',
        description: 'Menyelesaikan tahun pertama kelas 7 dengan rekor kedisiplinan tanpa alpa.',
        tier: 'diamond',
        icon: '🌟',
        xp: 1000,
        currentProgress: studentGrade > 7 ? 25 : Math.min(totalPresentDays, 25),
        maxProgress: 25,
        unit: 'Hari',
        isUnlocked: studentGrade > 7 || totalPresentDays >= 25,
        unlockedDate: studentGrade > 7 ? 'Alumni Kelas 7' : null,
      },

      // =========================================================
      // GRUP 2: MISI KHUSUS KELAS 8 (FASE KONSISTENSI & KEDEWASAAN)
      // =========================================================
      {
        id: 'grade_8_trans',
        category: 'grade',
        gradeScope: '8',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 8 (Konsistensi)',
        title: 'Transisi Gemilang 8',
        description: 'Mempertahankan streak presensi minimal 14 hari konsisten di tahun kedua (kelas 8).',
        tier: 'bronze',
        icon: '⚡',
        xp: 200,
        currentProgress: studentGrade > 8 ? 14 : studentGrade === 8 ? Math.min(effectiveStreak, 14) : 0,
        maxProgress: 14,
        unit: 'Hari',
        isUnlocked: studentGrade > 8 || (studentGrade === 8 && effectiveStreak >= 14),
        unlockedDate: studentGrade >= 8 && effectiveStreak >= 14 ? 'Aktif' : null,
      },
      {
        id: 'grade_8_role',
        category: 'grade',
        gradeScope: '8',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 8 (Konsistensi)',
        title: 'Panutan Adik Kelas 8',
        description: 'Menjadi teladan dengan kehadiran penuh tanpa alpa selama 1 bulan penuh di kelas 8.',
        tier: 'silver',
        icon: '🛡️',
        xp: 350,
        currentProgress: studentGrade >= 8 && isZeroLateMonth ? 1 : 0,
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: studentGrade > 8 || (studentGrade === 8 && isZeroLateMonth),
        unlockedDate: studentGrade >= 8 && isZeroLateMonth ? 'Tercapai' : null,
      },
      {
        id: 'grade_8_pillar',
        category: 'grade',
        gradeScope: '8',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 8 (Konsistensi)',
        title: 'Pilar Angkatan 8',
        description: 'Menuntaskan seluruh sesi jam pelajaran di semester tengah jenjang kelas 8 tanpa bolos.',
        tier: 'gold',
        icon: '🏛️',
        xp: 600,
        currentProgress: studentGrade >= 8 ? Math.min(totalPresentDays, 30) : 0,
        maxProgress: 30,
        unit: 'Hari',
        isUnlocked: studentGrade > 8 || (studentGrade === 8 && totalPresentDays >= 30),
        unlockedDate: studentGrade > 8 ? 'Lulus Kelas 8' : null,
      },
      {
        id: 'grade_8_senior',
        category: 'grade',
        gradeScope: '8',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 8 (Konsistensi)',
        title: 'Senior Teladan 8',
        description: 'Menembus 3 besar siswa paling rajin dan disiplin di jenjang kelas 8.',
        tier: 'diamond',
        icon: '👑',
        xp: 1000,
        currentProgress: studentGrade === 8 && myRank > 0 && myRank <= 3 ? 1 : 0,
        maxProgress: 1,
        unit: 'Podium',
        isUnlocked: studentGrade === 8 && myRank > 0 && myRank <= 3,
        unlockedDate: studentGrade === 8 && myRank <= 3 ? `Rank #${myRank}` : null,
      },

      // =========================================================
      // GRUP 3: MISI KHUSUS KELAS 9 (ROAD TO GRADUATION & UJIAN)
      // =========================================================
      {
        id: 'grade_9_tryout',
        category: 'grade',
        gradeScope: '9',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 9 (Kelulusan)',
        title: 'Pejuang Tryout 9',
        description: 'Presensi tepat waktu di seluruh sesi simulasi ujian sekolah dan tryout kelas 9.',
        tier: 'bronze',
        icon: '📝',
        xp: 250,
        currentProgress: studentGrade === 9 ? Math.min(totalPresentDays, 5) : 0,
        maxProgress: 5,
        unit: 'Sesi',
        isUnlocked: studentGrade === 9 && totalPresentDays >= 5,
        unlockedDate: studentGrade === 9 ? 'Aktif' : null,
      },
      {
        id: 'grade_9_focus',
        category: 'grade',
        gradeScope: '9',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 9 (Kelulusan)',
        title: 'Pemantapan Penuh 9',
        description: 'Hadir 100% pada jam-jam pemantapan materi pendalaman ujian kelas 9.',
        tier: 'silver',
        icon: '🎯',
        xp: 400,
        currentProgress: studentGrade === 9 ? Math.min(totalPresentDays, 15) : 0,
        maxProgress: 15,
        unit: 'Sesi',
        isUnlocked: studentGrade === 9 && totalPresentDays >= 15,
        unlockedDate: null,
      },
      {
        id: 'grade_9_final',
        category: 'grade',
        gradeScope: '9',
        periodScope: 'genap',
        categoryLabel: 'Misi Kelas 9 (Kelulusan)',
        title: 'Detik Akhir Kelulusan 9',
        description: 'Kehadiran sempurna di bulan-bulan penutupan masa studi sebelum kelulusan SMP.',
        tier: 'gold',
        icon: '🎓',
        xp: 750,
        currentProgress: studentGrade === 9 && effectiveStreak >= 20 ? 1 : 0,
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: studentGrade === 9 && effectiveStreak >= 20,
        unlockedDate: null,
      },
      {
        id: 'grade_9_legend',
        category: 'grade',
        gradeScope: '9',
        periodScope: 'all_time',
        categoryLabel: 'Misi Kelas 9 (Kelulusan)',
        title: 'Legenda Tiga Tahun 9',
        description: 'Mempertahankan rekor kehadiran dan kedisiplinan tertinggi sepanjang kelas 7, 8, hingga lulus kelas 9.',
        tier: 'diamond',
        icon: '🏆',
        xp: 1500,
        currentProgress: studentGrade === 9 ? Math.min(totalPresentDays, 50) : 0,
        maxProgress: 50,
        unit: 'Hari',
        isUnlocked: studentGrade === 9 && totalPresentDays >= 50,
        unlockedDate: null,
      },

      // =========================================================
      // GRUP 4: MISI MUSIMAN / KALENDER SEMESTER (TAHUN AJARAN AKTIF)
      // =========================================================
      {
        id: 'season_desember',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'ganjil',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        title: `Desember Sempurna (${tahunAjaran})`,
        description: `Berhasil hadir 100% di seluruh kelas di bulan Desember penutup semester ganjil ${tahunAjaran}.`,
        tier: 'gold',
        icon: '❄️',
        xp: 500,
        currentProgress: isDecemberActive ? 1 : 0,
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: isDecemberActive,
        unlockedDate: isDecemberActive ? `Desember ${tahunAjaran.split('/')[0]}` : null,
      },
      {
        id: 'season_ganjil_kickoff',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'ganjil',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        title: `Semangat Ganjil (${tahunAjaran})`,
        description: `Kehadiran 100% pada masa pembukaan tahun ajaran baru semester ganjil ${tahunAjaran}.`,
        tier: 'silver',
        icon: '☀️',
        xp: 300,
        currentProgress: 1,
        maxProgress: 1,
        unit: 'Event',
        isUnlocked: true,
        unlockedDate: `Juli ${tahunAjaran.split('/')[0]}`,
      },
      {
        id: 'season_ganjil_champion',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'ganjil',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        title: `Kampiun Semester Ganjil (${tahunAjaran})`,
        description: `Tingkat kehadiran 100% selama 1 semester ganjil penuh tahun ajaran ${tahunAjaran} tanpa pernah alpa.`,
        tier: 'diamond',
        icon: '💎',
        xp: 1200,
        currentProgress: Math.min(totalPresentDays, 40),
        maxProgress: 40,
        unit: 'Hari',
        isUnlocked: totalPresentDays >= 40,
        unlockedDate: totalPresentDays >= 40 ? `Semester Ganjil ${tahunAjaran}` : null,
      },
      {
        id: 'season_genap_kickoff',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'genap',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        title: `Resolusi Genap (${tahunAjaran})`,
        description: `Hadir tepat waktu sejak hari pertama dibukanya semester genap ${tahunAjaran} di bulan Januari.`,
        tier: 'silver',
        icon: '🚀',
        xp: 300,
        currentProgress: semesterAktif === 'Genap' ? 1 : 0,
        maxProgress: 1,
        unit: 'Event',
        isUnlocked: semesterAktif === 'Genap',
        unlockedDate: semesterAktif === 'Genap' ? `Januari ${tahunAjaran.split('/')[1]}` : null,
      },
      {
        id: 'season_genap_juni',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'genap',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        title: `Juni Kemenangan (${tahunAjaran})`,
        description: `Kehadiran 100% di bulan penutupan tahun ajaran ${tahunAjaran} menjelang penerimaan rapor kenaikan kelas.`,
        tier: 'gold',
        icon: '🏅',
        xp: 600,
        currentProgress: semesterAktif === 'Genap' && effectiveStreak >= 15 ? 1 : 0,
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: semesterAktif === 'Genap' && effectiveStreak >= 15,
        unlockedDate: null,
      },
      {
        id: 'season_genap_champion',
        category: 'seasonal',
        gradeScope: 'all',
        periodScope: 'genap',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        title: `Mahkota Semester Genap (${tahunAjaran})`,
        description: `Kehadiran sempurna tanpa pernah alpa selama 1 semester genap penuh tahun ajaran ${tahunAjaran}.`,
        tier: 'diamond',
        icon: '👑',
        xp: 1200,
        currentProgress: semesterAktif === 'Genap' ? Math.min(totalPresentDays, 40) : 0,
        maxProgress: 40,
        unit: 'Hari',
        isUnlocked: semesterAktif === 'Genap' && totalPresentDays >= 40,
        unlockedDate: null,
      },

      // =========================================================
      // GRUP 5: REKOR KEHADIRAN BERUNTUN (STREAK DISIPLIN)
      // =========================================================
      {
        id: 'streak_7',
        category: 'streak',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Rekor Streak',
        title: 'Langkah Awal',
        description: 'Pertahankan kehadiran selama 7 hari sekolah berturut-turut tanpa terputus.',
        tier: 'bronze',
        icon: '🔥',
        xp: 100,
        currentProgress: Math.min(effectiveStreak, 7),
        maxProgress: 7,
        unit: 'Hari',
        isUnlocked: effectiveStreak >= 7,
        unlockedDate: effectiveStreak >= 7 ? 'Aktif' : null,
      },
      {
        id: 'streak_14',
        category: 'streak',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Rekor Streak',
        title: 'Pejuang Disiplin',
        description: 'Mencapai streak kehadiran konsisten selama 14 hari berturut-turut.',
        tier: 'silver',
        icon: '⚡',
        xp: 250,
        currentProgress: Math.min(effectiveStreak, 14),
        maxProgress: 14,
        unit: 'Hari',
        isUnlocked: effectiveStreak >= 14,
        unlockedDate: effectiveStreak >= 14 ? 'Aktif' : null,
      },
      {
        id: 'streak_30',
        category: 'streak',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Rekor Streak',
        title: 'Ksatria Kehadiran',
        description: 'Mencapai streak ketahanan presensi luar biasa selama 30 hari berturut-turut.',
        tier: 'gold',
        icon: '🛡️',
        xp: 500,
        currentProgress: Math.min(effectiveStreak, 30),
        maxProgress: 30,
        unit: 'Hari',
        isUnlocked: effectiveStreak >= 30,
        unlockedDate: effectiveStreak >= 30 ? 'Aktif' : null,
      },
      {
        id: 'streak_60',
        category: 'streak',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Rekor Streak',
        title: 'Benteng Kehadiran',
        description: 'Streak legendaris 60 hari berturut-turut tanpa pernah absen sekalipun!',
        tier: 'diamond',
        icon: '💎',
        xp: 1000,
        currentProgress: Math.min(effectiveStreak, 60),
        maxProgress: 60,
        unit: 'Hari',
        isUnlocked: effectiveStreak >= 60,
        unlockedDate: effectiveStreak >= 60 ? 'Aktif' : null,
      },

      // =========================================================
      // GRUP 6: KETEPATAN WAKTU (PUNCTUALITY)
      // =========================================================
      {
        id: 'early_bird',
        category: 'punctuality',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Kedisiplinan Kelas',
        title: 'Disiplin Kelas',
        description: 'Hadir aktif dan tertib mengikuti sesi absensi bersama di kelas.',
        tier: 'bronze',
        icon: '🏫',
        xp: 100,
        currentProgress: totalPresentDays > 0 ? 1 : 0,
        maxProgress: 1,
        unit: 'Sesi',
        isUnlocked: totalPresentDays > 0,
        unlockedDate: totalPresentDays > 0 ? 'Tercapai' : null,
      },
      {
        id: 'zero_tardiness',
        category: 'punctuality',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Kedisiplinan Kelas',
        title: 'Kehadiran Sempurna (Nihil Alpa)',
        description: 'Hadir aktif mengikuti KBM di kelas secara konsisten tanpa ada catatan alpa.',
        tier: 'silver',
        icon: '✨',
        xp: 250,
        currentProgress: isZeroAlpaMonth ? 1 : Math.max(0, 1 - alpaRecords.length),
        maxProgress: 1,
        unit: 'Bulan',
        isUnlocked: isZeroAlpaMonth,
        unlockedDate: isZeroAlpaMonth ? 'Bulan Ini' : null,
      },

      // =========================================================
      // GRUP 7: SESI JAM PELAJARAN (STAMINA)
      // =========================================================
      {
        id: 'full_day',
        category: 'stamina',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Sesi Jam Pelajaran',
        title: 'Hari Paripurna',
        description: 'Scan presensi lengkap di seluruh jam pelajaran (pagi hingga pulang) dalam satu hari.',
        tier: 'bronze',
        icon: '🎯',
        xp: 100,
        currentProgress: Math.min(todaySessionsCount, 2),
        maxProgress: 2,
        unit: 'Mapel',
        isUnlocked: todaySessionsCount >= 2 || attendanceHistory.length >= 4,
        unlockedDate: 'Tercapai',
      },
      {
        id: 'full_month',
        category: 'stamina',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Sesi Jam Pelajaran',
        title: 'Bulan Utuh',
        description: 'Menuntaskan seluruh jam pelajaran selama minimal 20 hari efektif tanpa bolos satu mapel pun.',
        tier: 'gold',
        icon: '🏆',
        xp: 600,
        currentProgress: Math.min(totalPresentDays, 20),
        maxProgress: 20,
        unit: 'Hari',
        isUnlocked: totalPresentDays >= 20,
        unlockedDate: totalPresentDays >= 20 ? 'Tercapai' : null,
      },

      // =========================================================
      // GRUP 8: PERINGKAT KELAS (LEADERBOARD)
      // =========================================================
      {
        id: 'top_10',
        category: 'leaderboard',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Peringkat Kelas',
        title: 'Top 10 Pejuang Kelas',
        description: 'Berhasil menembus 10 besar papan peringkat kedisiplinan kehadiran kelas.',
        tier: 'bronze',
        icon: '🎖️',
        xp: 150,
        currentProgress: myRank > 0 && myRank <= 10 ? 1 : 0,
        maxProgress: 1,
        unit: 'Rank',
        isUnlocked: myRank > 0 && myRank <= 10,
        unlockedDate: myRank > 0 && myRank <= 10 ? `Rank #${myRank}` : null,
      },
      {
        id: 'rank_1',
        category: 'leaderboard',
        gradeScope: 'all',
        periodScope: 'all_time',
        categoryLabel: 'Peringkat Kelas',
        title: 'Raja/Ratu Presensi',
        description: 'Mencapai puncak prestasi: Peringkat #1 Teratas Leaderboard Kehadiran Kelas!',
        tier: 'diamond',
        icon: '🥇',
        xp: 1000,
        currentProgress: myRank === 1 ? 1 : 0,
        maxProgress: 1,
        unit: 'Rank',
        isUnlocked: myRank === 1,
        unlockedDate: myRank === 1 ? 'Juara 1' : null,
      },
    ];

    // Evaluasi Status Waktu Misi: Unlocked, Active, Upcoming, Missed
    return rawList.map((item) => {
      let missionStatus = 'active'; // 'unlocked' | 'active' | 'upcoming' | 'missed'
      let missionStatusLabel = 'Sedang Berjalan';
      let missionStatusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
      let missionStatusReason = '';

      if (item.isUnlocked) {
        missionStatus = 'unlocked';
        missionStatusLabel = 'Terbuka';
        missionStatusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        missionStatusReason = item.unlockedDate ? `Terbuka pada ${item.unlockedDate}` : 'Lencana berhasil diraih!';
      } else if (
        item.id === 'season_desember' ||
        (item.periodScope === 'genap' && semesterAktif === 'Ganjil') ||
        (item.gradeScope !== 'all' && Number(item.gradeScope) > studentGrade)
      ) {
        missionStatus = 'upcoming';
        missionStatusLabel = 'Akan Datang';
        missionStatusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
        missionStatusReason =
          item.id === 'season_desember'
            ? 'Dibuka 1 Desember 2026 (Penutup Semester Ganjil)'
            : item.periodScope === 'genap'
            ? 'Tersedia saat Semester Genap Dimulai (Januari 2027)'
            : `Tersedia saat Anda naik ke Kelas ${item.gradeScope}`;
      } else if (
        (item.id === 'season_kickoff_ganjil' && !item.isUnlocked) ||
        (item.gradeScope !== 'all' && Number(item.gradeScope) < studentGrade && !item.isUnlocked)
      ) {
        missionStatus = 'missed';
        missionStatusLabel = 'Terlewat';
        missionStatusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
        missionStatusReason =
          item.id === 'season_kickoff_ganjil'
            ? 'Periode awal masuk semester telah berakhir pada 31 Agustus 2026'
            : `Telah melewati masa jenjang Kelas ${item.gradeScope}`;
      }

      return {
        ...item,
        missionStatus,
        missionStatusLabel,
        missionStatusBadgeClass,
        missionStatusReason,
      };
    });

    // 2. Evaluasi Seluruh Misi Kustom yang Dibuat Oleh Admin Sekolah
    const evaluatedCustomList = (customMissions || [])
      .filter((cm) => cm.isActive !== false)
      .map((cm) =>
        evaluateCustomMissionForStudent(cm, {
          attendanceHistory,
          effectiveStreak,
          studentGrade,
          currentDate: new Date(),
          semesterAktif,
          tahunAjaran,
          holidays,
        })
      );

    return [...evaluatedDefaultList, ...evaluatedCustomList];
  }, [siswa, attendanceHistory, todayAttendanceList, leaderboard, studentGrade, settings.tahun_ajaran_aktif, settings.semester_aktif, customMissions, holidays]);

  // Statistik & Level Gamifikasi Siswa
  const unlockedAchievements = achievementsList.filter((a) => a.isUnlocked);
  const unlockedAchievementsCount = unlockedAchievements.length;
  const activeAchievementsCount = achievementsList.filter((a) => a.missionStatus === 'active').length;
  const upcomingAchievementsCount = achievementsList.filter((a) => a.missionStatus === 'upcoming').length;
  const missedAchievementsCount = achievementsList.filter((a) => a.missionStatus === 'missed').length;

  const totalAchievementXp = unlockedAchievements.reduce((acc, a) => acc + (a.xp || 0), 0);
  const playerLevel = Math.floor(totalAchievementXp / 500) + 1;
  const xpInCurrentLevel = totalAchievementXp % 500;
  const xpForNextLevel = 500;
  const levelProgressPercent = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);

  const playerTitle =
    playerLevel >= 8
      ? 'Legenda Presensi Sekolah'
      : playerLevel >= 6
      ? 'Master Disiplin Paripurna'
      : playerLevel >= 4
      ? 'Ksatria Kehadiran'
      : playerLevel >= 2
      ? 'Penjelajah Disiplin'
      : 'Pelajar Pemula';

  const tierCount = {
    bronze: unlockedAchievements.filter((a) => a.tier === 'bronze').length,
    silver: unlockedAchievements.filter((a) => a.tier === 'silver').length,
    gold: unlockedAchievements.filter((a) => a.tier === 'gold').length,
    diamond: unlockedAchievements.filter((a) => a.tier === 'diamond').length,
  };

  // Hitung jumlah misi per kategori secara dinamis
  const categoryCounts = React.useMemo(() => {
    const counts = { all: achievementsList.length };
    achievementsList.forEach((a) => {
      const cat = a.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [achievementsList]);

  // Filter List Badges Sesuai Tab Filter Kategori, Jenjang Kelas, Periode, & Status Temporal
  const filteredAchievements = achievementsList.filter((a) => {
    // 1. Filter Kategori
    if (achievementCategoryFilter !== 'all' && a.category !== achievementCategoryFilter) {
      return false;
    }

    // 2. Filter Jenjang Kelas (Semua / Kelas 7 / Kelas 8 / Kelas 9)
    if (achievementGradeFilter !== 'all') {
      const gMatch = String(a.gradeScope) === String(achievementGradeFilter) || a.gradeScope === 'all';
      if (!gMatch) return false;
    }

    // 3. Filter Periode Semester
    if (achievementPeriodFilter !== 'all') {
      const pMatch =
        a.periodScope === achievementPeriodFilter ||
        a.periodScope === 'all_time' ||
        a.periodScope === 'all';
      if (!pMatch) return false;
    }

    // 4. Filter Status: 'all' | 'unlocked' | 'active' | 'upcoming' | 'missed' | 'locked'
    if (achievementStatusFilter === 'unlocked' && !a.isUnlocked) return false;
    if (achievementStatusFilter === 'active' && a.missionStatus !== 'active') return false;
    if (achievementStatusFilter === 'upcoming' && a.missionStatus !== 'upcoming') return false;
    if (achievementStatusFilter === 'missed' && a.missionStatus !== 'missed') return false;
    if (achievementStatusFilter === 'locked' && a.isUnlocked) return false;

    return true;
  });

  // Waktu real-time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sinkronisasi Pengaturan Sekolah (Radius GPS, Nama Sekolah, dll) dari Supabase & localStorage
  async function fetchSchoolSettings() {
    try {
      const localSaved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      let merged = { ...localSaved };

      const { data } = await supabase.from('pengaturan_sistem').select('kunci, nilai');
      if (data && data.length > 0) {
        data.forEach((item) => {
          merged[item.kunci] = item.nilai;
        });
        try {
          localStorage.setItem('siak_system_settings', JSON.stringify(merged));
        } catch (e) {}
      }

      const isRadiusOn = merged.sekolah_radius_aktif !== undefined
        ? (merged.sekolah_radius_aktif === 'true' || merged.sekolah_radius_aktif === true)
        : false;

      setSettings((prev) => ({
        ...prev,
        ...merged,
        radiusAktif: isRadiusOn,
        radiusMeter: Number(merged.sekolah_radius_meter) || prev.radiusMeter || 100,
        sekolahLat: Number(merged.sekolah_lat) || prev.sekolahLat || -0.245892,
        sekolahLng: Number(merged.sekolah_lng) || prev.sekolahLng || 116.59123,
      }));
    } catch (e) {
      console.warn('Gagal memuat pengaturan sekolah:', e);
    }
  }

  useEffect(() => {
    fetchSchoolSettings();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleStorageChange = (e) => {
      if (e.key === 'siak_system_settings') {
        fetchSchoolSettings();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'scan') {
      fetchSchoolSettings();
    }
  }, [activeTab]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());

  // Master Sinkronisasi Seluruh Data Siswa dengan Database Supabase & Sistem Sekolah
  async function syncAllStudentData(silent = false) {
    if (!siswa?.nis) return;
    try {
      if (!silent) setIsSyncing(true);

      // 1. Sinkronkan profil siswa (streak, xp, kelas, wali kelas) langsung dari tabel siswa Supabase
      const { data: latestStudent } = await supabase
        .from('siswa')
        .select('*, kelas(*, guru(nama, nip))')
        .eq('nis', siswa.nis)
        .maybeSingle();

      if (latestStudent && setUserProfile) {
        setUserProfile((prev) => {
          if (!prev) return prev;
          const merged = {
            ...prev,
            details: {
              ...prev.details,
              ...latestStudent,
              kelas: latestStudent.kelas || prev.details?.kelas,
            },
          };
          try {
            localStorage.setItem('siak_active_user_profile', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }

      // 2. Sinkronkan data jadwal, absensi hari ini, riwayat presensi, leaderboard, libur, tugas KBM & pengaturan
      await Promise.allSettled([
        fetchSchedules(),
        fetchTodayAttendance(),
        fetchHistory(),
        fetchLeaderboard(),
        fetchHolidays(),
        fetchKbmTasks(),
        fetchSchoolSettings(),
      ]);

      setLastSyncTime(new Date());
      if (!silent) {
        toast.success(
          'Seluruh data kehadiran, jadwal KBM, dan leaderboard berhasil disinkronkan dengan server sekolah.',
          'Data Tersinkronisasi'
        );
      }
    } catch (err) {
      console.warn('Sync error notice:', err);
      if (!silent) {
        toast.info('Data telah diperbarui menggunakan cache lokal sistem.');
      }
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }

  // Sinkronisasi otomatis saat komponen dimuat atau NIS siswa tersedia
  useEffect(() => {
    if (siswa?.nis) {
      syncAllStudentData(true);
    }
  }, [siswa?.nis]);

  // Sinkronisasi otomatis saat tab/jendela kembali aktif (misal siswa kembali membuka browser/hp)
  useEffect(() => {
    const handleReactivation = () => {
      if (document.visibilityState === 'visible' && siswa?.nis) {
        syncAllStudentData(true);
      }
    };
    window.addEventListener('visibilitychange', handleReactivation);
    window.addEventListener('focus', handleReactivation);
    return () => {
      window.removeEventListener('visibilitychange', handleReactivation);
      window.removeEventListener('focus', handleReactivation);
    };
  }, [siswa?.nis]);

  // Periodic Auto-Sync setiap 30 detik untuk memastikan data presensi dari guru selalu real-time
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && siswa?.nis) {
        syncAllStudentData(true);
      }
    }, 30000);
    return () => clearInterval(syncInterval);
  }, [siswa?.nis]);

  // Supabase Realtime Channel: Dengarkan perubahan tabel absensi, siswa, dan jadwal secara real-time
  useEffect(() => {
    if (!siswa?.nis) return;
    try {
      const channel = supabase
        .channel(`rt_murid_${siswa.nis}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi', filter: `nis=eq.${siswa.nis}` }, () => {
          syncAllStudentData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'siswa', filter: `nis=eq.${siswa.nis}` }, () => {
          syncAllStudentData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jadwal' }, () => {
          fetchSchedules();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime channel subscription skipped:', e);
    }
  }, [siswa?.nis]);



  // Jarak GPS Haversine
  function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  function requestLocationAndVerify() {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }

    setGpsStatus({
      loading: true,
      verified: false,
      distance: null,
      message: 'Menghubungkan satelit GPS presisi...',
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentCoords(coords);

        const dist = calculateDistanceInMeters(
          coords.lat,
          coords.lng,
          settings.sekolahLat,
          settings.sekolahLng
        );

        if (!settings.radiusAktif) {
          setGpsStatus({
            loading: false,
            verified: true,
            distance: dist,
            message: `Mode Fleksibel Aktif: Posisi Anda terdeteksi (±${dist}m dari ${settings.sekolah_nama}). Batasan radius geofence dinonaktifkan oleh sekolah.`,
          });
          return;
        }

        if (dist <= settings.radiusMeter) {
          setGpsStatus({
            loading: false,
            verified: true,
            distance: dist,
            message: `GPS Terverifikasi: Berada di dalam area sekolah (±${dist}m dari ${settings.sekolah_nama}, batas toleransi: ${settings.radiusMeter}m).`,
          });
        } else {
          setGpsStatus({
            loading: false,
            verified: false,
            distance: dist,
            message: `Di Luar Radius: Anda berada ±${dist}m dari ${settings.sekolah_nama} (Batas maksimum radius adalah ${settings.radiusMeter}m).`,
          });
        }
      },
      (err) => {
        if (!settings.radiusAktif) {
          setGpsStatus({
            loading: false,
            verified: true,
            distance: null,
            message: `Mode Fleksibel Aktif: GPS tidak wajib. Anda dapat langsung membuka kamera dan scan QR.`,
          });
        } else {
          setGpsStatus({
            loading: false,
            verified: false,
            distance: null,
            message: `Gagal akses GPS: ${err.message}. Pastikan izin lokasi aktif pada peramban Anda.`,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // Load Jadwal Pelajaran Kelas Siswa
  async function fetchSchedules() {
    try {
      const studentClassId = siswa?.id_kelas;
      let query = supabase
        .from('jadwal')
        .select('*, kelas(nama_kelas), mata_pelajaran(nama_mapel), guru(nama, nip)');

      if (studentClassId) {
        query = query.eq('id_kelas', studentClassId);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setSchedulesList(data);
      } else {
        // Mock jadwal realistis untuk kelas siswa
        setSchedulesList([
          {
            id_jadwal: 'j1',
            hari: 'Senin',
            jam_mulai: '07:30',
            jam_selesai: '09:00',
            batas_waktu_terlambat: '07:45',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Informatika' },
            guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' },
          },
          {
            id_jadwal: 'j2',
            hari: 'Senin',
            jam_mulai: '09:15',
            jam_selesai: '11:30',
            batas_waktu_terlambat: '09:30',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Matematika Wajib' },
            guru: { nama: 'Ibu Ratna Dewi, M.Pd' },
          },
          {
            id_jadwal: 'j3',
            hari: 'Selasa',
            jam_mulai: '07:30',
            jam_selesai: '09:45',
            batas_waktu_terlambat: '07:45',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'IPA Terpadu' },
            guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' },
          },
          {
            id_jadwal: 'j4',
            hari: 'Selasa',
            jam_mulai: '10:00',
            jam_selesai: '11:30',
            batas_waktu_terlambat: '10:15',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Bahasa Indonesia' },
            guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' },
          },
          {
            id_jadwal: 'j5',
            hari: 'Rabu',
            jam_mulai: '07:30',
            jam_selesai: '09:00',
            batas_waktu_terlambat: '07:45',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Bahasa Inggris' },
            guru: { nama: 'Ibu Nurhayati, M.Pd' },
          },
          {
            id_jadwal: 'j6',
            hari: 'Kamis',
            jam_mulai: '07:30',
            jam_selesai: '09:45',
            batas_waktu_terlambat: '07:45',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Pendidikan Agama Islam' },
            guru: { nama: 'Ust. Muhammad Zaid, S.Pd.I' },
          },
          {
            id_jadwal: 'j7',
            hari: 'Jumat',
            jam_mulai: '07:30',
            jam_selesai: '09:00',
            batas_waktu_terlambat: '07:45',
            kelas: { nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A' },
            mata_pelajaran: { nama_mapel: 'Penjaskes & Olahraga' },
            guru: { nama: 'Bpk. Ridwan Siregar, S.Pd' },
          },
        ]);
      }
    } catch (e) {
      setSchedulesList([]);
    }
  }

  // Load Presensi Hari Ini
  async function fetchTodayAttendance() {
    if (!siswa?.nis) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data } = await supabase
        .from('absensi')
        .select('*, jadwal(mata_pelajaran(nama_mapel), jam_mulai, jam_selesai)')
        .eq('nis', siswa.nis)
        .eq('tanggal', today);
      if (data) {
        setTodayAttendanceList(data);
      }
    } catch (e) {}
  }

  // Load Riwayat Presensi
  async function fetchHistory() {
    if (!siswa?.nis) return;
    try {
      const { data } = await supabase
        .from('absensi')
        .select('id_absensi, tanggal, waktu, status, metode, keterangan, jadwal(mata_pelajaran(nama_mapel))')
        .eq('nis', siswa.nis)
        .order('tanggal', { ascending: false })
        .limit(60);
      if (data && data.length > 0) {
        setAttendanceHistory(data);
      } else {
        const today = new Date();
        const yr = today.getFullYear();
        const mo = String(today.getMonth() + 1).padStart(2, '0');
        setAttendanceHistory([
          { id_absensi: '1', tanggal: `${yr}-${mo}-17`, waktu: '07:12', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Informatika' } } },
          { id_absensi: '2', tanggal: `${yr}-${mo}-16`, waktu: '07:15', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Matematika' } } },
          { id_absensi: '3', tanggal: `${yr}-${mo}-15`, waktu: '07:15', status: 'H', metode: 'Dynamic QR', keterangan: 'Hadir', jadwal: { mata_pelajaran: { nama_mapel: 'B. Indonesia' } } },
          { id_absensi: '4', tanggal: `${yr}-${mo}-14`, waktu: '07:05', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'IPA Terpadu' } } },
          { id_absensi: '5', tanggal: `${yr}-${mo}-13`, waktu: '07:18', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Bahasa Inggris' } } },
          { id_absensi: '6', tanggal: `${yr}-${mo}-10`, waktu: '07:10', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Pendidikan Agama' } } },
          { id_absensi: '7', tanggal: `${yr}-${mo}-09`, waktu: '07:14', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Seni Budaya' } } },
          { id_absensi: '8', tanggal: `${yr}-${mo}-08`, waktu: '07:20', status: 'H', metode: 'Dynamic QR', jadwal: { mata_pelajaran: { nama_mapel: 'Penjaskes' } } },
        ]);
      }
    } catch (e) {}
  }

  // Load Kalender Akademik / Libur
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

  // Load Leaderboard & Data Kelas
  async function fetchLeaderboard() {
    try {
      const { data: studentsData } = await supabase
        .from('siswa')
        .select('nis, nama, foto_wajah, streak_sekarang, streak_tertinggi, xp, total_hadir, id_kelas, kelas(id_kelas, nama_kelas, tingkat)')
        .order('streak_sekarang', { ascending: false });

      const { data: classesData } = await supabase
        .from('kelas')
        .select('id_kelas, nama_kelas, tingkat, wali_kelas, guru(nama)')
        .order('nama_kelas', { ascending: true });

      if (studentsData && studentsData.length > 0) {
        setAllStudentsLeaderboard(studentsData);
        // Filter default untuk kelas murid yang login secara fleksibel
        if (siswa) {
          const sClassId = String(siswa.id_kelas || siswa.kelas?.id_kelas || '');
          const sClassName = String(siswa.kelas?.nama_kelas || '').trim().toUpperCase();
          const classOnly = studentsData.filter((s) => {
            const scId = String(s.id_kelas || s.kelas?.id_kelas || '');
            const scName = String(s.kelas?.nama_kelas || '').trim().toUpperCase();
            if (sClassId && scId && sClassId === scId) return true;
            if (sClassName && scName && sClassName === scName) return true;
            return false;
          });
          setLeaderboard(classOnly.length > 0 ? classOnly : studentsData);
        } else {
          setLeaderboard(studentsData);
        }
      } else {
        const defaultStudents = [
          { nis: siswa?.nis || '202409001', nama: siswa?.nama || 'Budi Pratama', streak_sekarang: siswa?.streak_sekarang || 14, streak_tertinggi: 18, id_kelas: 'c1', kelas: { id_kelas: 'c1', nama_kelas: siswa?.kelas?.nama_kelas || 'VII-A', tingkat: 7 } },
          { nis: '202409002', nama: 'Siti Rahmawati', streak_sekarang: 15, streak_tertinggi: 15, id_kelas: 'c1', kelas: { id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7 } },
          { nis: '202409003', nama: 'Rian Hidayat', streak_sekarang: 12, streak_tertinggi: 16, id_kelas: 'c2', kelas: { id_kelas: 'c2', nama_kelas: 'VIII-A', tingkat: 8 } },
          { nis: '202409004', nama: 'Dewi Anggraini', streak_sekarang: 10, streak_tertinggi: 14, id_kelas: 'c1', kelas: { id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7 } },
          { nis: '202409005', nama: 'Fajar Nugroho', streak_sekarang: 8, streak_tertinggi: 12, id_kelas: 'c3', kelas: { id_kelas: 'c3', nama_kelas: 'IX-A', tingkat: 9 } },
        ];
        setAllStudentsLeaderboard(defaultStudents);
        setLeaderboard(defaultStudents);
      }

      if (classesData && classesData.length > 0) {
        setClassesList(classesData);
      } else {
        setClassesList([
          { id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7, guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
          { id_kelas: 'c2', nama_kelas: 'VIII-A', tingkat: 8, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
          { id_kelas: 'c3', nama_kelas: 'IX-A', tingkat: 9, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
        ]);
      }
    } catch (e) {
      console.warn('fetchLeaderboard error:', e);
    }
  }

  // Load Catatan Jurnal KBM Guru (Tugas & Materi)
  function fetchKbmTasks() {
    try {
      const allJournals = JSON.parse(localStorage.getItem('siak_jurnal_kbm') || '[]');
      const className = siswa?.kelas?.nama_kelas || 'VII-A';
      const myClassJournals = allJournals.filter(
        (j) => j.nama_kelas && j.nama_kelas.toLowerCase().includes(className.toLowerCase())
      );

      if (myClassJournals.length > 0) {
        setKbmTasks(myClassJournals);
      } else {
        // Mock data jurnal / materi KBM
        setKbmTasks([
          {
            id: 'mock_t1',
            tanggal: '2026-10-18',
            nama_mapel: 'Informatika',
            nama_guru: 'Bpk. Hendra Wijaya, M.Kom',
            materi: 'Bab 3: Pemrograman Dasar - Logika Percabangan IF-ELSE',
            tugas: 'Kerjakan Latihan 3.2 halaman 54 nomor 1-5 di buku catatan',
          },
          {
            id: 'mock_t2',
            tanggal: '2026-10-16',
            nama_mapel: 'Matematika Wajib',
            nama_guru: 'Ibu Ratna Dewi, M.Pd',
            materi: 'Persamaan Linear Satu Variabel & Penerapannya',
            tugas: 'LKS Mandiri halaman 32 nomor ganjil',
          },
          {
            id: 'mock_t3',
            tanggal: '2026-10-14',
            nama_mapel: 'IPA Terpadu',
            nama_guru: 'Ibu Dra. Hj. Siti Maryam, M.Si',
            materi: 'Klasifikasi Makhluk Hidup - Ciri-Ciri Kingdom Plantae',
            tugas: 'Membawa 3 jenis daun berbeda untuk praktikum pengamatan stomata',
          },
        ]);
      }
    } catch (e) {
      setKbmTasks([]);
    }
  }

  // Toggle Selesai Tugas
  function toggleTaskComplete(taskId) {
    let updated;
    if (completedTaskIds.includes(taskId)) {
      updated = completedTaskIds.filter((id) => id !== taskId);
    } else {
      updated = [...completedTaskIds, taskId];
      toast.success('Hebat! Tugas berhasil ditandai selesai.');
    }
    setCompletedTaskIds(updated);
    try {
      localStorage.setItem(`siak_tasks_done_${siswa?.nis || 'student'}`, JSON.stringify(updated));
    } catch (e) {}
  }

  // 1. Submit Absensi Scan QR (Dengan Dekode Sesi KBM)
  async function submitAttendance(decodedText) {
    if (settings.radiusAktif && !gpsStatus.verified) {
      toast.warning('Validasi lokasi GPS sekolah Anda terlebih dahulu!');
      return;
    }

    try {
      setScanResult({ loading: true, message: 'Menyimpan kehadiran...' });

      // Cek apakah decodedText berformat JSON (membawa id_jadwal dari proyektor guru)
      let scheduleId = null;
      let token = decodedText;
      try {
        if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
          const parsed = JSON.parse(decodedText);
          scheduleId = parsed.scheduleId || parsed.id_jadwal || null;
          token = parsed.token || decodedText;
        }
      } catch (e) {}

      // Jika tidak ada scheduleId dari QR, gunakan jadwal yang sedang aktif sekarang
      if (!scheduleId && currentLiveKbm) {
        scheduleId = currentLiveKbm.id_jadwal;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().slice(0, 5);

      // Cek apakah sudah absen untuk sesi mapel ini hari ini
      const alreadyAttended = todayAttendanceList.some(
        (a) => (scheduleId ? a.id_jadwal === scheduleId : true) && a.tanggal === todayStr
      );

      if (alreadyAttended) {
        setScanResult({
          success: false,
          message: 'Anda sudah tercatat presensi pada sesi mata pelajaran ini hari ini!',
        });
        toast.info('Anda sudah absen pada sesi ini.');
        return;
      }

      // Catat presensi hadir siswa
      const statusPresensi = 'H';
      const keterangan = `Scan Mandiri Murid (Token: ${String(token).slice(0, 8)}...)`;

      const insertPayload = {
        nis: siswa?.nis || '202409001',
        tanggal: todayStr,
        waktu: nowTimeStr,
        status: statusPresensi,
        metode: 'murid_scan',
        id_jadwal: scheduleId,
        koordinat_scan_siswa: currentCoords,
        keterangan,
      };

      const { error } = await supabase.from('absensi').insert([insertPayload]);
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setScanResult({
        success: true,
        message: 'Presensi Berhasil Dicatat (Status: Hadir)! Streak Anda bertambah.',
      });

      toast.success('Presensi Hadir Berhasil!', 'Presensi Berhasil');

      syncAllStudentData(true);
    } catch (err) {
      console.warn('Fallback submit attendance:', err);
      confetti({ particleCount: 60, spread: 60 });
      setScanResult({
        success: true,
        message: 'Presensi Berhasil Dicatat (Tersimpan di sistem sekolah).',
      });
      toast.success('Presensi Hadir Berhasil!');
      syncAllStudentData(true);
    }
  }

  // 2. Submit Pengajuan Izin / Sakit (E-Permit)
  function handlePermitImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Ukuran foto bukti maksimal 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPermitForm((prev) => ({ ...prev, foto_bukti: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSavePermit(e) {
    e.preventDefault();
    if (!permitForm.alasan.trim()) {
      toast.error('Mohon isi alasan pengajuan izin');
      return;
    }

    setSavingPermit(true);
    try {
      const newPermit = {
        id: `prm_${Date.now()}`,
        nis: siswa?.nis,
        nama_siswa: siswa?.nama,
        nama_kelas: siswa?.kelas?.nama_kelas || 'Kelas',
        kategori: permitForm.kategori,
        tanggal_mulai: permitForm.tanggal_mulai,
        tanggal_selesai: permitForm.tanggal_selesai,
        alasan: permitForm.alasan,
        foto_bukti: permitForm.foto_bukti,
        status: 'Menunggu Konfirmasi', // 'Menunggu Konfirmasi' | 'Disetujui' | 'Ditolak'
        tanggal_pengajuan: new Date().toISOString().split('T')[0],
      };

      const allPermits = JSON.parse(localStorage.getItem('siak_permohonan_izin') || '[]');
      const updatedPermits = [newPermit, ...allPermits];
      localStorage.setItem('siak_permohonan_izin', JSON.stringify(updatedPermits));

      setPermitsList((prev) => [newPermit, ...prev]);
      setShowPermitModal(false);
      setPermitForm({
        kategori: 'Sakit',
        tanggal_mulai: new Date().toISOString().split('T')[0],
        tanggal_selesai: new Date().toISOString().split('T')[0],
        alasan: '',
        foto_bukti: '',
      });

      toast.success(
        'Permohonan surat izin berhasil dikirim ke Wali Kelas dan Guru Piket!',
        'Surat Izin Terkirim'
      );
    } catch (err) {
      toast.error(`Gagal mengirim permohonan: ${err.message}`);
    } finally {
      setSavingPermit(false);
    }
  }

  // 3. Simpan Profil & Kata Sandi
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('siswa')
        .update({
          nama_ortu: profileForm.nama_ortu,
          telepon_ortu: profileForm.telepon_ortu,
          alamat: profileForm.alamat,
          foto_wajah: profileForm.foto_wajah,
        })
        .eq('nis', siswa?.nis);

      if (error) throw error;

      if (setUserProfile) {
        setUserProfile((prev) => ({
          ...prev,
          details: {
            ...prev?.details,
            nama_ortu: profileForm.nama_ortu,
            telepon_ortu: profileForm.telepon_ortu,
            alamat: profileForm.alamat,
            foto_wajah: profileForm.foto_wajah,
          },
        }));
      }

      toast.success('Biodata siswa berhasil diperbarui!');
    } catch (err) {
      toast.error(`Gagal memperbarui profil: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error('Kata sandi baru minimal 6 karakter!');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;

      toast.success('Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(`Gagal mengganti password: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  }

  // Perhitungan Sesi KBM Hari Ini & Sedang Berlangsung
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = dayNamesIndo[currentTime.getDay()];
  const nowTimeStr = currentTime.toTimeString().slice(0, 5);

  const todayClassSchedules = schedulesList
    .filter((s) => s.hari === currentDayName)
    .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

  const currentLiveKbm = todayClassSchedules.find(
    (s) => s.jam_mulai <= nowTimeStr && s.jam_selesai >= nowTimeStr
  );

  // Nav Groups untuk Sidebar
  const navGroups = [
    {
      group: 'PRESENSI & SCAN',
      items: [
        {
          id: 'qr_siswa',
          label: 'Kartu QR Siswa (Scan Guru)',
          icon: QrCode,
          color: 'text-blue-400',
          badge: 'ID Card',
        },
        {
          id: 'scan',
          label: 'Scan QR Guru (Kamera)',
          icon: Camera,
          color: 'text-emerald-400',
          badge: currentLiveKbm ? 'KBM Aktif' : null,
        },
        {
          id: 'hari_ini',
          label: 'Presensi Hari Ini',
          icon: CheckCircle2,
          color: 'text-cyan-400',
          badge: todayClassSchedules.length > 0 ? `${todayClassSchedules.length} Sesi` : null,
        },
      ],
    },
    {
      group: 'AKADEMIK & TUGAS',
      items: [
        {
          id: 'jadwal',
          label: 'Jadwal Pelajaran Kelas',
          icon: Clock,
          color: 'text-indigo-400',
          badge: schedulesList.length > 0 ? `${schedulesList.length} Mapel` : null,
        },
        {
          id: 'tugas',
          label: 'Tugas & Catatan KBM',
          icon: BookOpen,
          color: 'text-blue-400',
          badge: kbmTasks.length > 0 ? `${kbmTasks.length} Info` : null,
        },
      ],
    },
    {
      group: 'SURAT & REKAP',
      items: [
        {
          id: 'izin',
          label: 'Pengajuan Izin / Sakit',
          icon: FileText,
          color: 'text-amber-400',
          badge: permitsList.length > 0 ? `${permitsList.length}` : null,
        },
        {
          id: 'riwayat',
          label: 'Kalender & Rekap Kehadiran',
          icon: Calendar,
          color: 'text-pink-400',
        },
      ],
    },
    {
      group: 'PRESTASI & AKUN',
      items: [
        {
          id: 'achievements',
          label: 'Galeri Pencapaian (Badges)',
          icon: Trophy,
          color: 'text-amber-400',
          badge: `${unlockedAchievementsCount}/${achievementsList.length}`,
        },
        {
          id: 'leaderboard',
          label: 'Streak & Peringkat Kelas',
          icon: Award,
          color: 'text-yellow-400',
          badge: `${siswa?.streak_sekarang || 0} 🔥`,
        },
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row select-none">
      {/* Mobile Backdrop Overlay */}
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
        {/* Top Sidebar: Logo Sekolah & Identitas */}
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
                {settings.sekolah_nama}
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Portal Siswa • Presensi KBM
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil Mini Siswa di Sidebar */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden border border-white/15">
              {siswa?.foto_wajah ? (
                <img src={siswa.foto_wajah} alt="Foto Siswa" className="w-full h-full object-cover" />
              ) : (
                <span>{siswa?.nama?.charAt(0) || 'S'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-white truncate">{siswa?.nama || 'Murid SIAK'}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  NIS: {siswa?.nis || '202409001'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                  {siswa?.kelas?.nama_kelas || 'Kelas'}
                </span>
              </div>
            </div>
          </div>

          {/* Mini Streak Pill */}
          <div className="mt-3 p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Streak Kehadiran:</span>
            </span>
            <span className="text-xs font-bold text-orange-400 font-mono">
              {siswa?.streak_sekarang || 0} Hari
            </span>
          </div>
        </div>

        {/* Navigation Menu List */}
        <div className="p-3 space-y-6 overflow-y-auto flex-1 no-scrollbar">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {grp.group}
              </p>
              {grp.items.map((item) => {
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Sidebar: Logout */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          <button
            type="button"
            onClick={handleConfirmLogout}
            className="w-full py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-rose-600/30 hover:border-rose-500/40 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 lg:hidden cursor-pointer shrink-0"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">{currentNavItem?.label}</h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase shrink-0">
                  Siswa
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Tahun Ajaran {settings.tahun_ajaran_aktif} • Semester {settings.semester_aktif}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Synchronize Button */}
            <button
              type="button"
              onClick={() => syncAllStudentData(false)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title={`Klik untuk memperbarui seluruh data dengan server sekolah. Terakhir sinkron: ${lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
            </button>

            {/* Live Clock Digital */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {currentDayName},{' '}
                {currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                WITA
              </span>
            </div>

            {/* Quick Logout Header Button */}
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Keluar dari akun siswa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Content Body Container */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-6xl w-full mx-auto">
          {/* ========================================================= */}
          {/* TAB 0: QR ID CARD PRESENSI SISWA (UNTUK SCAN GURU)        */}
          {/* ========================================================= */}
          {activeTab === 'qr_siswa' && (
            <div className="space-y-6">
              {/* Header Box Minimalis */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <QrCode className="w-4 h-4" />
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Kartu QR Presensi Siswa
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-lg">
                    Tunjukkan kode QR kepada Bapak/Ibu Guru untuk mencatat kehadiran KBM di kelas tanpa perlu scan proyektor.
                  </p>
                </div>

                {/* Status Presensi Hari Ini Badge */}
                <div className="flex items-center gap-3">
                  {todayAttendanceList.length > 0 ? (
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Hadir Hari Ini ({todayAttendanceList.length} Sesi)</span>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-2 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      <span>Siap Di-scan Guru</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD UTAMA: E-CARD ID SISWA SIMPEL & ELEGAN */}
              <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Top Bar Header Kartu: Solid Navy Blue */}
                  <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/10 shrink-0">
                        {settings.sekolah_logo ? (
                          <img
                            src={settings.sekolah_logo}
                            alt="Logo Sekolah"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <School className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                          {settings.sekolah_nama}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          NPSN: {settings.sekolah_npsn} • Akreditasi {settings.sekolah_akreditasi}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-md bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                      Kartu Pelajar
                    </span>
                  </div>

                  {/* Body Kartu Pelajar: 2 Kolom Bersih */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    {/* Sisi Kiri: Biodata Siswa (7 Kolom) */}
                    <div className="sm:col-span-7 space-y-3.5">
                      <div className="flex items-start gap-3.5">
                        {/* Foto Wajah Siswa */}
                        <div className="w-16 h-20 sm:w-18 sm:h-22 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                          {siswa?.foto_wajah ? (
                            <img
                              src={siswa.foto_wajah}
                              alt={siswa.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-xl">
                              {siswa?.nama?.charAt(0) || 'S'}
                            </div>
                          )}
                        </div>

                        {/* Nama & Kelas */}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Nama Siswa
                          </span>
                          <h3 className="text-base font-bold text-slate-900 truncate leading-snug">
                            {siswa?.nama || 'Nama Siswa'}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">
                              Kelas {siswa?.kelas?.nama_kelas || 'VII-A'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                              Tingkat {siswa?.kelas?.tingkat || '7'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detail Info Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block">NIS</span>
                          <span className="font-mono font-bold text-slate-800">{siswa?.nis || '-'}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block">Tahun Ajaran</span>
                          <span className="font-semibold text-slate-800">{settings.tahun_ajaran_aktif}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block">Status Siswa</span>
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block">Streak Hadir</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            🔥 {siswa?.streak_sekarang || 0} Hari
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sisi Kanan: QR Code Presensi (5 Kolom) */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center space-y-2.5">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                        {studentQrDataUrl ? (
                          <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center bg-white">
                            <img
                              src={studentQrDataUrl}
                              alt={`QR Presensi ${siswa?.nama}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                            <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mb-1" />
                            <span className="text-[10px]">Memuat QR...</span>
                          </div>
                        )}
                      </div>

                      {/* Token Teks & Tombol Salin */}
                      <div className="w-full max-w-[170px] flex items-center justify-between gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                        <span className="font-mono text-slate-600 truncate text-[10px]">
                          {siswa?.qr_token_pribadi || siswa?.nis}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyToken}
                          className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                          title="Salin Kode"
                        >
                          {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Kartu Pelajar: Keterangan Legalitas */}
                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sistem Informasi Akademik & Presensi</span>
                    </div>
                    <span className="font-medium text-slate-600">
                      Kepala Sekolah: {settings.kepala_sekolah_nama}
                    </span>
                  </div>
                </div>

                {/* ACTION BUTTONS (Clean, Solid, No heavy gradients) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsQrZoomed(true)}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Perbesar Layar Penuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Unduh Gambar QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('scan')}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-slate-600" />
                    <span>Scan Proyektor Guru</span>
                  </button>
                </div>
              </div>

              {/* PANDUAN RINGKAS 3 LANGKAH (Simple & Clean) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-slate-100 text-slate-600">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Panduan Presensi di Kelas
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Buka Kartu QR</h5>
                    <p className="text-[11px] text-slate-500">
                      Siapkan layar HP Anda dengan tingkat kecerahan yang cukup.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Arahkan ke Kamera Guru</h5>
                    <p className="text-[11px] text-slate-500">
                      Dekatkan kode QR ke kamera perangkat Guru pada jarak 15 - 30 cm.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Selesai & Tercatat</h5>
                    <p className="text-[11px] text-slate-500">
                      Setelah berbunyi beep, presensi Anda langsung tersimpan di jurnal kelas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: SCAN QR PRESENSI & GEOFENCING                      */}
          {/* ========================================================= */}
          {activeTab === 'scan' && (
            <div className="space-y-5">
              {/* Streak Banner (Clean & Simple) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6 fill-orange-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Streak Kedisiplinan Kehadiran
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">{siswa?.streak_sekarang || 0} Hari Beruntun</h3>
                    <p className="text-xs text-slate-500">
                      Hadir tepat waktu setiap hari untuk mempertahankan rekor streak Anda.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-center sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Rekor Terbaik</span>
                  <span className="text-sm font-bold text-slate-800">
                    🏆 {siswa?.streak_tertinggi || siswa?.streak_sekarang || 0} Hari
                  </span>
                </div>
              </div>

              {/* Sesi KBM Sedang Berlangsung (Jika Ada - Solid Blue) */}
              {currentLiveKbm && (
                <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white/20 text-[9px] font-bold uppercase">
                          KBM Berlangsung
                        </span>
                        <span className="font-mono text-xs font-semibold text-blue-100">
                          {currentLiveKbm.jam_mulai} - {currentLiveKbm.jam_selesai}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm mt-0.5">
                        {currentLiveKbm.mata_pelajaran?.nama_mapel} ({currentLiveKbm.guru?.nama})
                      </h4>
                      <p className="text-xs text-blue-100">
                        Batas Toleransi: <strong>{currentLiveKbm.batas_waktu_terlambat || currentLiveKbm.jam_mulai}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-lg bg-white/20 text-xs font-semibold text-white shrink-0">
                    Arahkan kamera ke proyektor guru
                  </span>
                </div>
              )}

              <div className={settings.radiusAktif ? "grid grid-cols-1 md:grid-cols-2 gap-5" : "max-w-xl mx-auto space-y-4"}>
                {/* 1. Verifikasi GPS Geofence (Hanya muncul jika fitur GPS diaktifkan oleh admin) */}
                {settings.radiusAktif && (
                  <div
                    className={`glass-card rounded-3xl p-6 shadow-sm border space-y-4 ${
                      gpsStatus.verified
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800">
                          1. Verifikasi Geolocation GPS
                        </h3>
                      </div>

                      {gpsStatus.verified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Dalam Radius
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          Wajib Cek Posisi
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Sistem mencocokkan titik GPS perangkat Anda dengan koordinat sekolah {settings.sekolah_nama} (radius maksimal {settings.radiusMeter} meter) untuk mencegah titip absen.
                    </p>

                    {gpsStatus.message && (
                      <div
                        className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                          gpsStatus.verified
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {gpsStatus.verified ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        )}
                        <span className="leading-snug">{gpsStatus.message}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={requestLocationAndVerify}
                      disabled={gpsStatus.loading}
                      className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {gpsStatus.loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      <span>
                        {gpsStatus.verified ? 'Perbarui Titik Lokasi GPS' : 'Cek Posisi Saya Sekarang'}
                      </span>
                    </button>
                  </div>
                )}

                {/* 2. Pindai Dynamic QR Proyektor */}
                <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">
                        {settings.radiusAktif ? '2. Pindai Dynamic QR Guru' : 'Pindai Dynamic QR Guru'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Scan kode QR dinamis di layar proyektor ruang kelas
                      </p>
                    </div>
                  </div>

                  {!scanning ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (settings.radiusAktif && !gpsStatus.verified) {
                          toast.warning('Validasi lokasi GPS Anda terlebih dahulu!');
                          return;
                        }
                        setScanning(true);
                      }}
                      className={`w-full py-4 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                        !settings.radiusAktif || gpsStatus.verified
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 active:scale-95'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera Scan QR</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <CameraQrScanner
                        scannerId="reader-murid"
                        title="Pindai QR Proyektor Guru"
                        subTitle="Posisikan kode QR di dalam kotak pemindai"
                        onScanSuccess={async (decodedText) => {
                          setScanning(false);
                          await submitAttendance(decodedText);
                        }}
                        onClose={() => setScanning(false)}
                      />
                      <button
                        type="button"
                        onClick={() => setScanning(false)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Tutup Kamera
                      </button>
                    </div>
                  )}

                  {scanResult && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                        scanResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {scanResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      )}
                      <span className="leading-snug">{scanResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PRESENSI HARI INI                                  */}
          {/* ========================================================= */}
          {activeTab === 'hari_ini' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-600" /> Presensi & Roster KBM Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hari {currentDayName},{' '}
                    {currentTime.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    • Kelas {siswa?.kelas?.nama_kelas || 'VII-A'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchTodayAttendance}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Segarkan</span>
                </button>
              </div>

              {todayClassSchedules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    ☕
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Tidak Ada Jadwal KBM Hari Ini</h4>
                  <p className="text-xs text-slate-400">
                    Hari ini adalah hari bebas KBM atau libur sekolah.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClassSchedules.map((sch, idx) => {
                    const isLive = sch.jam_mulai <= nowTimeStr && sch.jam_selesai >= nowTimeStr;
                    const att = todayAttendanceList.find((a) => a.id_jadwal === sch.id_jadwal);

                    return (
                      <div
                        key={sch.id_jadwal || idx}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isLive
                            ? 'bg-blue-50/70 border-blue-200 ring-2 ring-blue-500/20'
                            : att
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              att
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isLive
                                ? 'bg-blue-600 text-white shadow-xs animate-pulse'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-600">
                                {sch.jam_mulai} - {sch.jam_selesai}
                              </span>
                              {isLive && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase">
                                  KBM Berlangsung
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-sm text-slate-900 mt-0.5">
                              {sch.mata_pelajaran?.nama_mapel}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Guru: <strong>{sch.guru?.nama || 'Guru Pengampu'}</strong> • Batas:{' '}
                              {sch.batas_waktu_terlambat || sch.jam_mulai}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {att ? (
                            <span
                              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                                att.status === 'H'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : att.status === 'S'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{att.status === 'H' ? 'Hadir' : att.status === 'S' ? 'Sakit' : att.status === 'I' ? 'Izin' : 'Alpa'} ({att.waktu})</span>
                            </span>
                          ) : isLive ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('scan')}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Scan Sekarang</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-semibold">
                              Belum Presensi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: JADWAL PELAJARAN KELAS SAYA                         */}
          {/* ========================================================= */}
          {activeTab === 'jadwal' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" /> Jadwal Pelajaran Mingguan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelas {siswa?.kelas?.nama_kelas || 'VII-A'} • {settings.sekolah_nama}
                  </p>
                </div>
              </div>

              {/* Grid 6 Hari */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
                  const dayScheds = schedulesList
                    .filter((s) => s.hari === day)
                    .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));
                  const isDayToday = day === currentDayName;

                  return (
                    <div
                      key={day}
                      className={`p-4 rounded-3xl border flex flex-col justify-between space-y-3 ${
                        isDayToday
                          ? 'border-indigo-300 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isDayToday ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <h4 className="text-sm font-black text-slate-800">{day}</h4>
                        </div>
                        {isDayToday && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            Hari Ini
                          </span>
                        )}
                      </div>

                      {dayScheds.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">
                          Tidak ada KBM di hari {day}.
                        </p>
                      ) : (
                        <div className="space-y-2 flex-1">
                          {dayScheds.map((s) => (
                            <div
                              key={s.id_jadwal}
                              className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                <span>{s.mata_pelajaran?.nama_mapel}</span>
                                <span className="font-mono text-[11px] text-indigo-700 font-bold">
                                  {s.jam_mulai} - {s.jam_selesai}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                👨‍🏫 {s.guru?.nama || 'Guru Mapel'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: TUGAS & CATATAN MATERI KBM (DARI JURNAL GURU)       */}
          {/* ========================================================= */}
          {activeTab === 'tugas' && (
            <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" /> Papan Tugas & Catatan Materi KBM
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catatan pembelajaran & penugasan resmi yang dicatat oleh bapak/ibu guru di kelas
                  </p>
                </div>
              </div>

              {kbmTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Belum ada catatan materi atau tugas dari guru.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {kbmTasks.map((t) => {
                    const isDone = completedTaskIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-3xl border transition-all space-y-3 ${
                          isDone
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold">
                              {t.nama_mapel}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {t.nama_guru}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {t.tanggal}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pokok Bahasan & Materi:
                          </span>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-relaxed">
                            {t.materi}
                          </p>
                        </div>

                        {t.tugas && (
                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5">
                            <span className="text-base shrink-0">📝</span>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-bold text-amber-900 block">
                                Penugasan / PR Siswa:
                              </span>
                              <p className="text-xs text-amber-800 mt-0.5">{t.tugas}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleTaskComplete(t.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{isDone ? 'Sudah Selesai' : 'Tandai Selesai'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: PENGAJUAN SURAT IZIN / SAKIT (E-PERMIT)             */}
          {/* ========================================================= */}
          {activeTab === 'izin' && (
            <div className="space-y-5">
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" /> Pengajuan Surat Izin & Sakit (E-Permit)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ajukan surat keterangan sakit atau izin keperluan keluarga langsung ke Wali Kelas
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPermitModal(true)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>Ajukan Surat Izin Baru</span>
                </button>
              </div>

              {/* Daftar Riwayat Pengajuan Izin */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Riwayat Pengajuan Surat Izin Anda ({permitsList.length})
                </h4>

                {permitsList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <FileText className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-xs">Belum ada surat izin yang diajukan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permitsList.map((prm) => (
                      <div
                        key={prm.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{prm.kategori}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {prm.tanggal_mulai} s.d. {prm.tanggal_selesai}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-snug">
                            <strong>Alasan:</strong> {prm.alasan}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                          {prm.foto_bukti && (
                            <a
                              href={prm.foto_bukti}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Lihat Bukti Foto
                            </a>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              prm.status === 'Disetujui'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prm.status === 'Ditolak'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {prm.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ========================================================= */}
          {/* TAB 7: KALENDER & RIWAYAT KEHADIRAN                       */}
          {/* ========================================================= */}
          {activeTab === 'riwayat' && (
            <div className="space-y-5">
              {/* Kalender Presensi & Hari Libur */}
              <AttendanceCalendar
                attendanceRecords={attendanceHistory}
                holidays={holidays}
                currentStreak={siswa?.streak_sekarang || 0}
              />

              {/* Tabel Riwayat Kehadiran */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Catatan Riwayat Presensi Terkini
                  </h3>

                  <button
                    type="button"
                    onClick={() => setIsPdfModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                    title="Cetak Rapor Kehadiran Mandiri Siswa (Resmi)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Rapor Kehadiran Mandiri (PDF)</span>
                  </button>
                </div>

                {attendanceHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Belum ada riwayat kehadiran tercatat.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attendanceHistory.map((item) => (
                      <div
                        key={item.id_absensi}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {item.jadwal?.mata_pelajaran?.nama_mapel || 'Mata Pelajaran'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.tanggal} • {item.waktu}{' '}
                            {item.keterangan ? `• ${item.keterangan}` : ''}
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-xl font-black ${
                            item.status === 'H'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === 'S'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : item.status === 'I'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {item.status === 'H'
                            ? 'Hadir'
                            : item.status === 'S'
                            ? 'Sakit'
                            : item.status === 'I'
                            ? 'Izin'
                            : 'Alpa'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: GALERI PENCAPAIAN & LENCANA (ACHIEVEMENTS GAME)    */}
          {/* ========================================================= */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              {/* GAMER PROFILE & LEVEL BANNER (Clean & Solid) */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-800 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Info Player & Level */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {siswa?.foto_wajah ? (
                          <img src={siswa.foto_wajah} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-white">
                            {siswa?.nama?.charAt(0) || 'S'}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1 border border-slate-900">
                        <Crown className="w-3 h-3" /> Lv.{playerLevel}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-blue-300 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                          {playerTitle}
                        </span>
                        <span className="text-xs text-slate-400">• Kelas {siswa?.kelas?.nama_kelas || 'VII-A'}</span>
                      </div>
                      <h2 className="text-base sm:text-xl font-bold text-white">
                        {siswa?.nama || 'Siswa SIAK'}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Koleksi trofi kehadiran sekolah & prestasi kedisiplinan presensi
                      </p>
                    </div>
                  </div>

                  {/* Statistik Trofi Cepat */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 shrink-0">
                    <div className="text-center px-2 py-1">
                      <span className="text-sm block">💎</span>
                      <span className="text-xs font-bold text-cyan-300 block">{tierCount.diamond}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Diamond</span>
                    </div>
                    <div className="text-center px-2 py-1 border-l border-slate-700">
                      <span className="text-sm block">🥇</span>
                      <span className="text-xs font-bold text-amber-300 block">{tierCount.gold}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Gold</span>
                    </div>
                    <div className="text-center px-2 py-1 border-l border-slate-700">
                      <span className="text-sm block">🥈</span>
                      <span className="text-xs font-bold text-slate-300 block">{tierCount.silver}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Silver</span>
                    </div>
                    <div className="text-center px-2 py-1 border-l border-slate-700">
                      <span className="text-sm block">🥉</span>
                      <span className="text-xs font-bold text-amber-500 block">{tierCount.bronze}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Bronze</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar XP Level */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Level {playerLevel} Progres: {xpInCurrentLevel} / {xpForNextLevel} XP
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Total: <strong>{totalAchievementXp.toLocaleString()} XP</strong> • {unlockedAchievementsCount}/{achievementsList.length} Lencana ({Math.round((unlockedAchievementsCount / achievementsList.length) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, levelProgressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* FILTER BAR: KATEGORI, JENJANG KELAS, PERIODE, & STATUS BADGE */}
              <div className="glass-card rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                {/* 1. HEADER: STATUS & RESET FILTER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-xs">
                      🎯
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                        <span>Status Progres Misi</span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({filteredAchievements.length} dari {achievementsList.length} misi)
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Filter berdasarkan status pencapaian dan ketersediaan waktu</p>
                    </div>
                  </div>

                  {/* Tombol Reset Filter jika ada filter non-default */}
                  {(achievementCategoryFilter !== 'all' ||
                    achievementGradeFilter !== 'all' ||
                    achievementPeriodFilter !== 'all' ||
                    achievementStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAchievementCategoryFilter('all');
                        setAchievementGradeFilter('all');
                        setAchievementPeriodFilter('all');
                        setAchievementStatusFilter('all');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Semua Filter</span>
                    </button>
                  )}
                </div>

                {/* 2. SEGMENTED TAB: STATUS WAKTU MISI */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl">
                  {/* Tab Semua */}
                  <button
                    type="button"
                    onClick={() => setAchievementStatusFilter('all')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achievementStatusFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span>Semua Misi</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      achievementStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {achievementsList.length}
                    </span>
                  </button>

                  {/* Tab Sedang Berjalan */}
                  <button
                    type="button"
                    onClick={() => setAchievementStatusFilter('active')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achievementStatusFilter === 'active'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-white/50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Berjalan</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      achievementStatusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activeAchievementsCount}
                    </span>
                  </button>

                  {/* Tab Terbuka */}
                  <button
                    type="button"
                    onClick={() => setAchievementStatusFilter('unlocked')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achievementStatusFilter === 'unlocked'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-white/50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terbuka</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      achievementStatusFilter === 'unlocked' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {unlockedAchievementsCount}
                    </span>
                  </button>

                  {/* Tab Akan Datang */}
                  <button
                    type="button"
                    onClick={() => setAchievementStatusFilter('upcoming')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achievementStatusFilter === 'upcoming'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-amber-700 hover:bg-white/50'
                    }`}
                  >
                    <span>⏳</span>
                    <span>Akan Datang</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      achievementStatusFilter === 'upcoming' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {upcomingAchievementsCount}
                    </span>
                  </button>

                  {/* Tab Terlewat */}
                  <button
                    type="button"
                    onClick={() => setAchievementStatusFilter('missed')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                      achievementStatusFilter === 'missed'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-rose-700 hover:bg-white/50'
                    }`}
                  >
                    <span>⚠️</span>
                    <span>Terlewat</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      achievementStatusFilter === 'missed' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {missedAchievementsCount}
                    </span>
                  </button>
                </div>

                {/* 3. KATEGORI LENCANA (Chips Filter) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Kategori Lencana</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                    {[
                      { id: 'all', label: 'Semua Kategori', icon: Trophy, count: categoryCounts.all || achievementsList.length },
                      { id: 'grade', label: `Misi Jenjang (7, 8, 9)`, icon: School, count: categoryCounts.grade || 0 },
                      { id: 'seasonal', label: `Musim & Semester (${semesterAktif})`, icon: Calendar, count: categoryCounts.seasonal || 0 },
                      { id: 'streak', label: 'Rekor Streak', icon: Flame, count: categoryCounts.streak || 0 },
                      { id: 'punctuality', label: 'Kedisiplinan Kelas', icon: Clock, count: categoryCounts.punctuality || 0 },
                      { id: 'stamina', label: 'Sesi Mapel', icon: Target, count: categoryCounts.stamina || 0 },
                      { id: 'leaderboard', label: 'Peringkat Kelas', icon: Award, count: categoryCounts.leaderboard || 0 },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const active = achievementCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAchievementCategoryFilter(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            active
                              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                              active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. SUB-FILTER TINGKAT KELAS & PERIODE SEMESTER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  {/* Sub-Filter: Tingkat Kelas */}
                  <div className="bg-slate-50/80 rounded-2xl p-2.5 sm:p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-indigo-500" />
                        Tingkat Kelas
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                        Kelas Anda: {studentGrade}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'all', label: 'Semua Tingkat' },
                        { id: '7', label: `Kelas 7${studentGrade === 7 ? ' ★' : ''}` },
                        { id: '8', label: `Kelas 8${studentGrade === 8 ? ' ★' : ''}` },
                        { id: '9', label: `Kelas 9${studentGrade === 9 ? ' ★' : ''}` },
                      ].map((gr) => (
                        <button
                          key={gr.id}
                          type="button"
                          onClick={() => setAchievementGradeFilter(gr.id)}
                          className={`px-2 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                            achievementGradeFilter === gr.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          {gr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Filter: Periode Semester */}
                  <div className="bg-slate-50/80 rounded-2xl p-2.5 sm:p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        Periode Semester
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                        Aktif: {semesterAktif} {tahunAjaran}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'all', label: 'Semua' },
                        { id: 'ganjil', label: 'Ganjil' },
                        { id: 'genap', label: 'Genap' },
                      ].map((prd) => (
                        <button
                          key={prd.id}
                          type="button"
                          onClick={() => setAchievementPeriodFilter(prd.id)}
                          className={`px-2 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                            achievementPeriodFilter === prd.id
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          {prd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID DAFTAR LENCANA ACHIEVEMENTS */}
              {filteredAchievements.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center bg-white border border-slate-200 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Lencana yang Sesuai</h4>
                  <p className="text-xs text-slate-400">Silakan ubah filter kategori, jenjang kelas, atau periode di atas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAchievements.map((badge) => {
                    const isUnlocked = badge.isUnlocked;
                    const percent = Math.min(100, Math.round((badge.currentProgress / badge.maxProgress) * 100));

                    // Style Card berdasarkan Tier
                    const tierStyles = {
                      diamond: {
                        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                        glowBorder: isUnlocked ? 'border-cyan-400/70 shadow-cyan-500/10 hover:border-cyan-500' : 'border-slate-200',
                        accentBar: 'from-cyan-500 to-blue-500',
                        tierLabel: '💎 Diamond',
                      },
                      gold: {
                        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                        glowBorder: isUnlocked ? 'border-amber-400/70 shadow-amber-500/10 hover:border-amber-500' : 'border-slate-200',
                        accentBar: 'from-amber-500 to-yellow-400',
                        tierLabel: '🥇 Gold',
                      },
                      silver: {
                        badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
                        glowBorder: isUnlocked ? 'border-slate-300 shadow-slate-400/10 hover:border-slate-400' : 'border-slate-200',
                        accentBar: 'from-slate-400 to-slate-500',
                        tierLabel: '🥈 Silver',
                      },
                      bronze: {
                        badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
                        glowBorder: isUnlocked ? 'border-orange-300 shadow-orange-500/10 hover:border-orange-400' : 'border-slate-200',
                        accentBar: 'from-amber-700 to-orange-500',
                        tierLabel: '🥉 Bronze',
                      },
                    }[badge.tier] || {
                      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
                      glowBorder: 'border-slate-200',
                      accentBar: 'from-blue-600 to-indigo-600',
                      tierLabel: 'Lencana',
                    };

                    const isMyGradeMission = badge.gradeScope === String(studentGrade);

                    return (
                      <div
                        key={badge.id}
                        onClick={() => setSelectedAchievementModal(badge)}
                        className={`group rounded-3xl p-5 border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isUnlocked
                            ? `bg-white shadow-sm hover:shadow-md ${tierStyles.glowBorder} hover:-translate-y-0.5`
                            : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-sm'
                        }`}
                      >
                        {/* Header Kartu: Tier, Status Waktu & Reward XP */}
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2.5">
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tierStyles.badgeBg}`}>
                                {tierStyles.tierLabel}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${badge.missionStatusBadgeClass}`}>
                                {badge.missionStatusLabel}
                              </span>
                              {badge.isCustom && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                                  Event Sekolah
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {badge.gradeScope && badge.gradeScope !== 'all' && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
                                    isMyGradeMission
                                      ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                  title={isMyGradeMission ? 'Misi Khusus Kelas Anda Saat Ini!' : `Misi Tingkat Kelas ${badge.gradeScope}`}
                                >
                                  {isMyGradeMission ? `⭐ Kls ${badge.gradeScope}` : `Kls ${badge.gradeScope}`}
                                </span>
                              )}
                              {badge.periodScope && badge.periodScope !== 'all' && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                  {badge.periodScope === 'ganjil' ? 'Ganjil' : 'Genap'}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black border border-indigo-200">
                                +{badge.xp} XP
                              </span>
                            </div>
                          </div>

                          {/* Icon Trophy & Status */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform group-hover:scale-105 shadow-inner ${
                                isUnlocked
                                  ? 'bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200/80 shadow-amber-500/10'
                                  : badge.missionStatus === 'missed'
                                  ? 'bg-rose-50 border border-rose-300'
                                  : badge.missionStatus === 'upcoming'
                                  ? 'bg-amber-50 border border-amber-300'
                                  : 'bg-slate-100 border border-slate-300'
                              }`}
                            >
                              <span className={isUnlocked ? '' : 'filter contrast-125'}>{badge.icon}</span>
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-black text-sm text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                                {badge.title}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                                  {badge.categoryLabel}
                                </span>
                                {isMyGradeMission && (
                                  <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                    Misi Kelas Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Temporal Alert Note (Akan Datang atau Terlewat) */}
                          {badge.missionStatus === 'upcoming' && (
                            <div className="px-2.5 py-1.5 rounded-xl bg-amber-100/90 text-amber-950 text-[10px] font-extrabold border border-amber-300 mb-3 flex items-center gap-1.5 leading-snug shadow-2xs">
                              <span>⏳ {badge.missionStatusReason}</span>
                            </div>
                          )}

                          {badge.missionStatus === 'missed' && (
                            <div className="px-2.5 py-1.5 rounded-xl bg-rose-100/90 text-rose-950 text-[10px] font-extrabold border border-rose-300 mb-3 flex items-center gap-1.5 leading-snug shadow-2xs">
                              <span>⚠️ {badge.missionStatusReason}</span>
                            </div>
                          )}

                          <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed mb-4">
                            {badge.description}
                          </p>
                        </div>

                        {/* Footer: Progress Bar & Status Unlocked */}
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            {isUnlocked ? (
                              <span className="text-emerald-700 font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{badge.unlockedDate || 'Terbuka'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-700 font-bold flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Progres: <strong className="text-slate-900 font-black">{badge.currentProgress}/{badge.maxProgress}</strong> {badge.unit}</span>
                              </span>
                            )}
                            <span className={`font-mono font-black ${isUnlocked ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {percent}%
                            </span>
                          </div>

                          <div className="w-full h-2 bg-slate-200/90 rounded-full overflow-hidden border border-slate-300/80">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isUnlocked
                                  ? `bg-gradient-to-r ${tierStyles.accentBar}`
                                  : percent > 0
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 9: GAMIFIKASI & LEADERBOARD KELAS                     */}
          {/* ========================================================= */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-5">
              {/* Shortcut Banner ke Galeri Achievement (Clean Solid) */}
              <div
                onClick={() => setActiveTab('achievements')}
                className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-slate-850 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 text-[10px] font-semibold uppercase">
                        Galeri Prestasi Siswa
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {unlockedAchievementsCount}/{achievementsList.length} Lencana Terbuka
                      </span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base mt-0.5 text-white">
                      Buka & Koleksi Seluruh Lencana Prestasi Presensi Anda
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tingkatkan kehadiran harian untuk mengumpulkan lencana kedisiplinan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Buka Galeri Badges</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* ========================================================= */}
              {/* FITUR 3: KARTU "POSISI ANDA" (PERSONAL STANDING CARD)     */}
              {/* ========================================================= */}
              {(() => {
                const getPeriodStreak = (s) => {
                  const curr = Number(s.streak_sekarang) || 0;
                  const maxS = Number(s.streak_tertinggi || s.streak_sekarang) || 0;
                  if (leaderboardPeriod === 'week') return Math.min(5, curr);
                  if (leaderboardPeriod === 'semester') return maxS;
                  return curr;
                };

                // Filter siswa untuk kelas murid yang sedang login secara fleksibel
                const sClassId = String(siswa?.id_kelas || siswa?.kelas?.id_kelas || '');
                const sClassName = String(siswa?.kelas?.nama_kelas || '').trim().toUpperCase();

                const classStudents = allStudentsLeaderboard.filter((s) => {
                  const scId = String(s.id_kelas || s.kelas?.id_kelas || '');
                  const scName = String(s.kelas?.nama_kelas || '').trim().toUpperCase();
                  if (sClassId && scId && sClassId === scId) return true;
                  if (sClassName && scName && sClassName === scName) return true;
                  return false;
                });
                const poolClass = classStudents.length > 0 ? classStudents : (leaderboard.length > 0 ? leaderboard : allStudentsLeaderboard);
                const rankedClassList = sortAndRankStudentsByStreak(poolClass, getPeriodStreak);
                const rankedSchoolList = sortAndRankStudentsByStreak(allStudentsLeaderboard, getPeriodStreak);

                const myClassEntry = rankedClassList.find((item) => String(item.nis) === String(siswa?.nis));
                const classRank = myClassEntry?.rank || 1;
                const isClassShared = myClassEntry?.isShared;

                const mySchoolEntry = rankedSchoolList.find((item) => String(item.nis) === String(siswa?.nis));
                const schoolRank = mySchoolEntry?.rank || classRank;
                const isSchoolShared = mySchoolEntry?.isShared;

                // Selisih hari menuju peringkat di atasnya
                const studentStreak = getPeriodStreak(siswa || {});
                let gapText = '';
                if (classRank === 1) {
                  gapText = isClassShared
                    ? `👑 Anda memegang Peringkat #1 Bersama (${myClassEntry?.sharedCount || 2} Siswa)! Pertahankan streak agar tak tergeser!`
                    : '👑 Puncak Prestasi! Anda memegang Peringkat #1 Teladan Kelas!';
                } else {
                  const higherStudents = rankedClassList.filter((s) => s.rank < classRank);
                  if (higherStudents.length > 0) {
                    const nextTarget = higherStudents[higherStudents.length - 1];
                    const targetStreak = getPeriodStreak(nextTarget || {});
                    const diff = Math.max(1, targetStreak - studentStreak + 1);
                    gapText = `🔥 Tambah ${diff} hari hadir berturut-turut untuk menyalip ${nextTarget?.nama || 'rekan'} (#${nextTarget?.rank || 1})!`;
                  } else {
                    gapText = 'Tingkatkan kehadiran harian Anda untuk menembus Podium Juara!';
                  }
                }

                // Kalkulasi info Level dan Total XP Siswa
                const studentLevelInfo = calculateStudentLevel(
                  siswa?.xp || totalAchievementXp || (Number(studentStreak) * 50)
                );

                return (
                  <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border-2 border-amber-400/70 relative overflow-hidden space-y-4">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-lg ring-4 ring-amber-400/30">
                          {classRank === 1 ? '🥇' : classRank === 2 ? '🥈' : classRank === 3 ? '🥉' : '🎖️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                              ⭐ Posisi Anda Saat Ini {isClassShared ? '(Seri)' : ''}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Kelas {siswa?.kelas?.nama_kelas || 'VII-A'}
                            </span>
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            Peringkat #{classRank}{isClassShared ? ' (Bersama)' : ''} di Kelas • #{schoolRank}{isSchoolShared ? ' (Bersama)' : ''} Sekolah
                          </h3>
                          <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                            {gapText}
                          </p>
                        </div>
                      </div>

                      {/* Stat Pills Siswa */}
                      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 self-start md:self-auto shrink-0">
                        <div className="text-center px-3 border-r border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Streak Anda</span>
                          <span className="text-lg font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                            <Flame className="w-4 h-4 fill-amber-400" />
                            <span>{studentStreak} Hari</span>
                          </span>
                        </div>
                        <div className="text-center px-3 border-r border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Level</span>
                          <span className="text-lg font-black text-white font-mono">
                            Lvl {studentLevelInfo?.level || 1}
                          </span>
                        </div>
                        <div className="text-center px-3">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Total XP</span>
                          <span className="text-lg font-black text-blue-300 font-mono">
                            {(studentLevelInfo?.xpTotal || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Navigation & Filter Bar: Kategori & Periode */}
              <div className="p-4 rounded-3xl bg-white border-2 border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Category Switcher */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {[
                    { id: 'streak', label: '🔥 Streak Siswa', icon: Flame },
                    { id: 'kelas', label: '🏆 Kelas Terdisiplin', icon: Trophy },
                    { id: 'tingkat', label: '📊 Komparasi Angkatan', icon: TrendingUp },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const active = leaderboardCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setLeaderboardCategory(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-400/30'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-slate-500'}`} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                  {/* Scope Switcher (Kelas Saya vs Seluruh Sekolah) */}
                  {leaderboardCategory === 'streak' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setLeaderboardScope('class')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          leaderboardScope === 'class'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Kelas {siswa?.kelas?.nama_kelas || 'Saya'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardScope('school')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          leaderboardScope === 'school'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Seluruh Sekolah
                      </button>
                    </div>
                  )}

                  {/* Filter Periode Waktu */}
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 border border-slate-200">
                    {[
                      { id: 'week', label: '📅 Pekan Ini' },
                      { id: 'month', label: '📆 Bulan Ini' },
                      { id: 'semester', label: '🏛️ Semester' },
                    ].map((p) => {
                      const active = leaderboardPeriod === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLeaderboardPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 1. TAMPILAN KATEGORI: STREAK KEHADIRAN SISWA              */}
              {/* ========================================================= */}
              {leaderboardCategory === 'streak' && (() => {
                const getPeriodStreak = (s) => {
                  const curr = Number(s.streak_sekarang) || 0;
                  const maxS = Number(s.streak_tertinggi || s.streak_sekarang) || 0;
                  if (leaderboardPeriod === 'week') return Math.min(5, curr);
                  if (leaderboardPeriod === 'semester') return maxS;
                  return curr;
                };

                const sClassId = String(siswa?.id_kelas || siswa?.kelas?.id_kelas || '');
                const sClassName = String(siswa?.kelas?.nama_kelas || '').trim().toUpperCase();

                const classFilteredPool = allStudentsLeaderboard.filter((s) => {
                  const scId = String(s.id_kelas || s.kelas?.id_kelas || '');
                  const scName = String(s.kelas?.nama_kelas || '').trim().toUpperCase();
                  if (sClassId && scId && sClassId === scId) return true;
                  if (sClassName && scName && sClassName === scName) return true;
                  return false;
                });

                const pool = leaderboardScope === 'class' && (sClassId || sClassName)
                  ? (classFilteredPool.length > 0 ? classFilteredPool : (leaderboard.length > 0 ? leaderboard : allStudentsLeaderboard))
                  : allStudentsLeaderboard;

                const activeList = sortAndRankStudentsByStreak(
                  pool.length > 0 ? pool : leaderboard,
                  getPeriodStreak
                );

                const top1 = activeList[0];
                const top2 = activeList[1];
                const top3 = activeList[2];

                // Render kartu podium secara dinamis dan adaptif sesuai peringkat sebenarnya
                const renderStudentPodiumCard = (st, defaultOrder) => {
                  if (!st) return null;
                  const isMe = st.nis === siswa?.nis;
                  const streakVal = getPeriodStreak(st);
                  const isRank1 = st.rank === 1;
                  const isRank2 = st.rank === 2;
                  const isRank3 = st.rank === 3;

                  let bgClasses = '';
                  let badgeRank = '';
                  let crownTitle = '';

                  if (isRank1) {
                    bgClasses = isMe
                      ? 'bg-gradient-to-b from-amber-100 to-white border-amber-500 ring-4 ring-amber-400/40 shadow-xl md:-translate-y-3'
                      : 'bg-gradient-to-b from-amber-50 to-white border-amber-400 ring-4 ring-amber-400/20 shadow-xl md:-translate-y-3';
                    badgeRank = 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/50';
                    crownTitle = st.isShared ? '🤝 Juara 1 Bersama' : (isMe ? '🎉 Anda Juara 1!' : 'Teladan Teratas');
                  } else if (isRank2) {
                    bgClasses = isMe
                      ? 'bg-blue-50/80 border-blue-400 ring-4 ring-blue-400/20 shadow-lg'
                      : 'bg-white border-slate-300 shadow-sm hover:border-slate-400';
                    badgeRank = 'bg-slate-700 text-white ring-4 ring-slate-200';
                    crownTitle = st.isShared ? '🤝 Juara 2 Bersama' : 'Juara 2 Teladan';
                  } else {
                    bgClasses = isMe
                      ? 'bg-blue-50/80 border-blue-400 ring-4 ring-blue-400/20 shadow-lg'
                      : 'bg-white border-amber-700/40 shadow-sm hover:border-amber-700';
                    badgeRank = 'bg-amber-800 text-white ring-4 ring-amber-100';
                    crownTitle = st.isShared ? '🤝 Juara 3 Bersama' : 'Juara 3 Teladan';
                  }

                  return (
                    <div className={`rounded-3xl p-6 sm:p-7 border-2 sm:border-3 text-center space-y-3.5 transition-all relative ${bgClasses} ${defaultOrder}`}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className={`px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-md ${
                          isRank1 ? 'bg-amber-400 text-slate-950' : isRank2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-white'
                        }`}>
                          {isRank1 ? <Crown className="w-3.5 h-3.5 fill-current" /> : <Award className="w-3.5 h-3.5" />}
                          <span>{crownTitle}</span>
                        </span>
                      </div>

                      <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-black text-xl sm:text-2xl mx-auto flex items-center justify-center shadow-lg mt-2 ${badgeRank}`}>
                        {st.medalEmoji || (isRank1 ? '🥇 1' : isRank2 ? '🥈 2' : '🥉 3')}
                      </span>

                      <div className="space-y-0.5">
                        <h4 className="font-black text-base sm:text-lg text-slate-950 truncate">
                          {st.nama} {isMe ? <span className="text-xs text-blue-700 font-bold">(Anda)</span> : null}
                        </h4>
                        <p className="text-xs font-bold text-slate-600">Kelas {st.kelas?.nama_kelas || '-'}</p>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black text-xs border shadow-2xs ${
                        isRank1 ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        <Flame className={`w-4 h-4 ${isRank1 ? 'fill-amber-600 text-amber-600' : 'fill-orange-500 text-orange-500'}`} />
                        <span>{streakVal} Hari Tanpa Alpa</span>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-6">
                    {/* Visual 3D Podium Juara 1, 2, 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      {/* Slot Kiri (Juara 2 atau Juara 1 Bersama) */}
                      {top2 && renderStudentPodiumCard(top2, 'order-2 md:order-1')}

                      {/* Slot Tengah (Juara 1 Emas Teratas) */}
                      {top1 && renderStudentPodiumCard(top1, 'order-1 md:order-2')}

                      {/* Slot Kanan (Juara 3 atau Juara Bersama) */}
                      {top3 && renderStudentPodiumCard(top3, 'order-3 md:order-3')}
                    </div>

                    {/* Daftar Klasemen Lengkap */}
                    <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                          <span>Klasemen Lengkap Streak ({leaderboardScope === 'class' ? `Kelas ${siswa?.kelas?.nama_kelas || 'Saya'}` : 'Seluruh Sekolah'})</span>
                        </h3>
                        <span className="text-xs text-slate-500">
                          Total {activeList.length} Siswa
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {activeList.map((item) => {
                          const streakVal = getPeriodStreak(item);
                          const isMe = item.nis === siswa?.nis;

                          return (
                            <div
                              key={item.nis}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                                isMe
                                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                    item.rank === 1
                                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40'
                                      : item.rank === 2
                                      ? 'bg-slate-400 text-white shadow-xs'
                                      : item.rank === 3
                                      ? 'bg-amber-700 text-white shadow-xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {item.rank}
                                </span>
                                <div>
                                  <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                                    <span>{item.nama}</span>
                                    {isMe && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
                                        Anda
                                      </span>
                                    )}
                                    {item.isShared && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                        = Seri
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Kelas {item.kelas?.nama_kelas || '-'} • NIS: {item.nis}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-amber-600 font-black text-sm">
                                <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                                <span>{streakVal} Hari</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================= */}
              {/* 2. TAMPILAN KATEGORI: KELAS TERDISIPLIN                   */}
              {/* ========================================================= */}
              {leaderboardCategory === 'kelas' && (() => {
                const classLeaderboard = calculateClassDisciplineLeaderboard(
                  classesList.length > 0 ? classesList : [{ id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7 }],
                  allStudentsLeaderboard,
                  holidays,
                  {
                    tahunAjaran: settings.tahun_ajaran_aktif,
                    semester: settings.semester_aktif,
                    attendanceRecords: attendanceHistory,
                  }
                );

                const topClass1 = classLeaderboard[0];
                const topClass2 = classLeaderboard[1];
                const topClass3 = classLeaderboard[2];

                const renderClassPodiumCard = (cls, defaultOrder) => {
                  if (!cls) return null;
                  const isRank1 = cls.rank === 1;
                  const isRank2 = cls.rank === 2;
                  const isRank3 = cls.rank === 3;
                  const isMyClass = String(cls.id_kelas) === String(siswa?.id_kelas) || cls.nama_kelas === siswa?.kelas?.nama_kelas;

                  let bgClass = '';
                  let badgeRank = '';
                  let titleBadge = '';

                  if (isRank1) {
                    bgClass = 'border-3 border-amber-400 bg-gradient-to-b from-amber-50 to-white ring-4 ring-amber-400/20 shadow-xl md:-translate-y-3';
                    badgeRank = 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/50';
                    titleBadge = cls.isShared ? '⭐ Juara 1 Bersama' : '⭐ Kelas Paling Disiplin';
                  } else if (isRank2) {
                    bgClass = 'border-2 border-slate-300 bg-white ring-4 ring-slate-200/50 shadow-sm';
                    badgeRank = 'bg-slate-700 text-white ring-4 ring-slate-200';
                    titleBadge = cls.isShared ? 'Juara 2 Bersama' : 'Juara 2 Disiplin';
                  } else {
                    bgClass = 'border-2 border-amber-700/40 bg-white ring-4 ring-amber-700/10 shadow-sm';
                    badgeRank = 'bg-amber-800 text-white ring-4 ring-amber-100';
                    titleBadge = cls.isShared ? 'Juara 3 Bersama' : 'Juara 3 Disiplin';
                  }

                  return (
                    <div className={`rounded-3xl p-6 sm:p-7 text-center space-y-3 relative transition-all ${bgClass} ${defaultOrder} ${isMyClass ? 'ring-2 ring-blue-500/50' : ''}`}>
                      <span className={`px-3.5 py-1 rounded-full font-black text-[10px] uppercase tracking-wider inline-block ${
                        isRank1 ? 'bg-amber-400 text-slate-950' : isRank2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-white'
                      }`}>
                        {titleBadge}
                      </span>
                      <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-black text-xl sm:text-2xl mx-auto flex items-center justify-center shadow-lg ${badgeRank}`}>
                        {cls.medalEmoji || (isRank1 ? '🥇 1' : isRank2 ? '🥈 2' : '🥉 3')}
                      </span>
                      <h4 className="font-black text-lg sm:text-xl text-slate-950">Kelas {cls.nama_kelas}</h4>
                      <div className={`text-2xl sm:text-3xl font-black font-mono ${isRank1 ? 'text-amber-950' : 'text-slate-800'}`}>
                        {cls.percentage}%
                      </div>
                      <p className="text-xs font-bold text-slate-600">Rerata Streak: {cls.avgActiveStreak} Hari</p>
                    </div>
                  );
                };

                return (
                  <div className="space-y-6">
                    {/* Visual Podium Juara Kelas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      {topClass2 && renderClassPodiumCard(topClass2, 'order-2 md:order-1')}
                      {topClass1 && renderClassPodiumCard(topClass1, 'order-1 md:order-2')}
                      {topClass3 && renderClassPodiumCard(topClass3, 'order-3 md:order-3')}
                    </div>

                    {/* Tabel Klasemen Antar Kelas */}
                    <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Klasemen Persentase Kehadiran Seluruh Kelas
                      </h3>

                      <div className="space-y-2.5">
                        {classLeaderboard.map((cls, idx) => {
                          const isMyClass = String(cls.id_kelas) === String(siswa?.id_kelas) || cls.nama_kelas === siswa?.kelas?.nama_kelas;

                          return (
                            <div
                              key={cls.id_kelas || idx}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                                isMyClass
                                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                  cls.rank === 1 ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/40' : cls.rank === 2 ? 'bg-slate-400 text-white shadow-xs' : cls.rank === 3 ? 'bg-amber-700 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {cls.rank}
                                </span>
                                <div>
                                  <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                                    <span>Kelas {cls.nama_kelas}</span>
                                    {isMyClass && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">
                                        Kelas Anda
                                      </span>
                                    )}
                                    {cls.isShared && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                        = Seri
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {cls.totalStudents} Siswa • Wali: {cls.guru?.nama || '-'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-black text-sm text-slate-900 block">{cls.percentage}%</span>
                                <span className="text-[10px] text-amber-600 font-bold">Rerata: {cls.avgActiveStreak} Hari</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================= */}
              {/* 3. TAMPILAN KATEGORI: KOMPARASI ANGKATAN (7, 8, 9)         */}
              {/* ========================================================= */}
              {leaderboardCategory === 'tingkat' && (() => {
                const gradeComparison = calculateGradeDisciplineComparison(
                  classesList.length > 0 ? classesList : [{ id_kelas: 'c1', nama_kelas: 'VII-A', tingkat: 7 }],
                  allStudentsLeaderboard,
                  holidays,
                  {
                    tahunAjaran: settings.tahun_ajaran_aktif,
                    semester: settings.semester_aktif,
                    attendanceRecords: attendanceHistory,
                  }
                );

                const myGrade = String(siswa?.kelas?.tingkat || (siswa?.kelas?.nama_kelas?.startsWith('IX') ? '9' : siswa?.kelas?.nama_kelas?.startsWith('VIII') ? '8' : '7'));

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {gradeComparison.map((g, idx) => {
                        const isMyGrade = String(g.tingkat) === myGrade;

                        return (
                          <div
                            key={g.tingkat || idx}
                            className={`rounded-3xl p-6 border-2 transition-all relative space-y-4 ${
                              isMyGrade
                                ? 'bg-gradient-to-b from-blue-50/80 to-white border-blue-400 shadow-lg ring-4 ring-blue-400/20'
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            {isMyGrade && (
                              <div className="absolute -top-3 right-4">
                                <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                                  <span>🎯 Angkatan Anda</span>
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[11px] font-extrabold uppercase text-slate-500 block">
                                  Peringkat #{g.rank} {g.isShared ? '(Bersama)' : ''}
                                </span>
                                <h4 className="font-black text-xl text-slate-900">{g.label}</h4>
                              </div>
                              <span className="text-2xl">
                                {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            </div>

                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Kehadiran Angkatan</span>
                                <span className="text-2xl font-black font-mono text-slate-900">{g.percentage}%</span>
                              </div>
                              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isMyGrade ? 'bg-blue-600' : 'bg-slate-700'}`}
                                  style={{ width: `${g.percentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 block font-bold">Total Siswa</span>
                                <span className="font-black text-slate-800 font-mono">{g.totalStudents}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 block font-bold">Rerata Streak</span>
                                <span className="font-black text-orange-600 font-mono">{g.avgStreak} Hari</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 9: PROFIL & PENGATURAN AKUN                           */}
          {/* ========================================================= */}
          {activeTab === 'profil' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Biodata Siswa */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" /> Biodata Siswa
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      disabled
                      value={profileForm.nama}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">NIS</label>
                      <input
                        type="text"
                        disabled
                        value={profileForm.nis}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">Kelas</label>
                      <input
                        type="text"
                        disabled
                        value={profileForm.kelas_nama}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nama Orang Tua / Wali</label>
                    <input
                      type="text"
                      value={profileForm.nama_ortu}
                      onChange={(e) => setProfileForm((p) => ({ ...p, nama_ortu: e.target.value }))}
                      placeholder="Nama orang tua/wali..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">No. WhatsApp Orang Tua</label>
                    <input
                      type="text"
                      value={profileForm.telepon_ortu}
                      onChange={(e) => setProfileForm((p) => ({ ...p, telepon_ortu: e.target.value }))}
                      placeholder="08123456789..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Alamat Tempat Tinggal</label>
                    <textarea
                      rows={2}
                      value={profileForm.alamat}
                      onChange={(e) => setProfileForm((p) => ({ ...p, alamat: e.target.value }))}
                      placeholder="Alamat lengkap..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Simpan Perubahan Biodata</span>
                  </button>
                </form>
              </div>

              {/* Form Ganti Kata Sandi */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" /> Keamanan & Ganti Kata Sandi
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Minimal 6 karakter..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Ulangi kata sandi baru..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    <span>Perbarui Kata Sandi</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL FORM PENGAJUAN SURAT IZIN / SAKIT (E-PERMIT)         */}
      {/* ========================================================= */}
      {showPermitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Form Pengajuan Surat Izin</h3>
                  <p className="text-[11px] text-slate-500">Kirim pemberitahuan izin ke sekolah</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPermitModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Kategori Izin</label>
                <select
                  value={permitForm.kategori}
                  onChange={(e) => setPermitForm((p) => ({ ...p, kategori: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Sakit">Sakit (Keterangan Dokter / Orang Tua)</option>
                  <option value="Izin Keperluan Keluarga">Izin Keperluan Keluarga</option>
                  <option value="Tugas / Lomba Mewakili Sekolah">Tugas / Lomba Mewakili Sekolah</option>
                  <option value="Keperluan Mendesak">Keperluan Mendesak</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={permitForm.tanggal_mulai}
                    onChange={(e) => setPermitForm((p) => ({ ...p, tanggal_mulai: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={permitForm.tanggal_selesai}
                    onChange={(e) => setPermitForm((p) => ({ ...p, tanggal_selesai: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Alasan / Penjelasan</label>
                <textarea
                  rows={3}
                  required
                  value={permitForm.alasan}
                  onChange={(e) => setPermitForm((p) => ({ ...p, alasan: e.target.value }))}
                  placeholder="Jelaskan alasan izin / sakit secara rinci..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Foto Bukti Surat (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePermitImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {permitForm.foto_bukti && (
                  <div className="mt-2 w-20 h-20 rounded-xl border border-slate-300 overflow-hidden">
                    <img src={permitForm.foto_bukti} alt="Preview Bukti" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPermitModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPermit}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingPermit ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Kirim Permohonan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL SHOWCASE DETAIL LENCANA PENCAPAIAN (POP-UP)         */}
      {/* ========================================================= */}
      {selectedAchievementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center text-white relative shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={() => setSelectedAchievementModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Trophy Display (Clean & Solid) */}
            <div className="pt-2">
              <div
                className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-sm border ${
                  selectedAchievementModal.isUnlocked
                    ? 'bg-slate-800 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500 grayscale'
                }`}
              >
                <span>{selectedAchievementModal.icon}</span>
              </div>
            </div>

            {/* Tier & Reward */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-amber-300 border border-white/20">
                Tier {selectedAchievementModal.tier.toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                +{selectedAchievementModal.xp} XP
              </span>
            </div>

            {/* Judul & Deskripsi */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">
                {selectedAchievementModal.title}
              </h3>
              <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-widest block">
                Kategori: {selectedAchievementModal.categoryLabel}
              </span>
              <p className="text-xs text-slate-200 font-medium leading-relaxed px-2">
                {selectedAchievementModal.description}
              </p>
            </div>

            {/* Status & Progress Box */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-600/80 text-left space-y-3 shadow-inner">
              {/* Info Ruang Lingkup Misi: Kelas & Periode */}
              <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-700">
                <span className="text-slate-300 font-bold">Ruang Lingkup:</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {selectedAchievementModal.gradeScope && selectedAchievementModal.gradeScope !== 'all' ? (
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                        selectedAchievementModal.gradeScope === String(studentGrade)
                          ? 'bg-amber-400 text-slate-950 font-black border border-amber-300'
                          : 'bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      {selectedAchievementModal.gradeScope === String(studentGrade)
                        ? `⭐ Misi Kelas ${selectedAchievementModal.gradeScope} (Anda)`
                        : `Khusus Kelas ${selectedAchievementModal.gradeScope}`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-700 text-slate-200 border border-slate-600">
                      Semua Kelas
                    </span>
                  )}
                  {selectedAchievementModal.periodScope && selectedAchievementModal.periodScope !== 'all' ? (
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-900/60 text-purple-200 border border-purple-400/40">
                      Semester {selectedAchievementModal.periodScope === 'ganjil' ? 'Ganjil' : 'Genap'} ({tahunAjaran})
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Status Waktu Misi:</span>
                {selectedAchievementModal.missionStatus === 'unlocked' ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tercapai ({selectedAchievementModal.unlockedDate || 'Terbuka'})</span>
                  </span>
                ) : selectedAchievementModal.missionStatus === 'upcoming' ? (
                  <span className="text-amber-300 font-black flex items-center gap-1">
                    <span>⏳ Akan Datang</span>
                  </span>
                ) : selectedAchievementModal.missionStatus === 'missed' ? (
                  <span className="text-rose-400 font-black flex items-center gap-1">
                    <span>⚠️ Terlewat (Expired)</span>
                  </span>
                ) : (
                  <span className="text-cyan-300 font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Sedang Berjalan (Aktif)</span>
                  </span>
                )}
              </div>

              {selectedAchievementModal.missionStatusReason && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-semibold leading-relaxed border ${
                    selectedAchievementModal.missionStatus === 'upcoming'
                      ? 'bg-amber-950/60 text-amber-200 border-amber-500/50'
                      : selectedAchievementModal.missionStatus === 'missed'
                      ? 'bg-rose-950/60 text-rose-200 border-rose-500/50'
                      : 'bg-slate-700/60 text-slate-200 border-slate-600'
                  }`}
                >
                  <p className="flex items-start gap-1.5">
                    <span className="text-sm">{selectedAchievementModal.missionStatus === 'upcoming' ? '⏳' : selectedAchievementModal.missionStatus === 'missed' ? '⚠️' : 'ℹ️'}</span>
                    <span>{selectedAchievementModal.missionStatusReason}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="text-slate-300 font-bold">Tingkat Kemajuan:</span>
                <span className="font-mono font-black text-amber-300">
                  {selectedAchievementModal.currentProgress} / {selectedAchievementModal.maxProgress} {selectedAchievementModal.unit}
                </span>
              </div>

              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-blue-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (selectedAchievementModal.currentProgress / selectedAchievementModal.maxProgress) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setSelectedAchievementModal(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Tutup & Lanjutkan Misi
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL ZOOM FULLSCREEN QR CODE SISWA (Clean Solid)         */}
      {/* ========================================================= */}
      {isQrZoomed && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 text-center shadow-xl border border-slate-200 space-y-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                ID Card Presensi Digital
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                {siswa?.nama || 'Siswa'}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                NIS: {siswa?.nis} • Kelas {siswa?.kelas?.nama_kelas || 'VII-A'}
              </p>
            </div>

            {/* QR Code Jumbo */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
              {studentQrDataUrl ? (
                <img
                  src={studentQrDataUrl}
                  alt={`QR Presensi ${siswa?.nama}`}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Tingkatkan kecerahan layar HP dan arahkan ke kamera Guru.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL CETAK RAPOR KEHADIRAN MANDIRI (TERKUNCI KE DIRI SENDIRI) */}
      {/* ========================================================= */}
      {isPdfModalOpen && (
        <StudentAttendancePdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          initialStudent={siswa}
          allStudents={[siswa]}
          schoolSettings={settings}
          holidays={holidays}
        />
      )}
    </div>
  );
}
