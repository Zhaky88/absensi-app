import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Sliders,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Save,
  LogOut,
  MapPin,
  MessageSquare,
  QrCode,
  Smartphone,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ChevronRight,
  ChevronLeft,
  Shield,
  Layers,
  Folder,
  FolderOpen,
  LayoutGrid,
  Grid,
  ListFilter,
  Menu,
  X,
  UserCheck,
  Clock,
  Award,
  Copy,
  Check,
  Key,
  Lock,
  Eye,
  EyeOff,
  Send,
  UserPlus,
  FileText,
  Database,
  ShieldCheck,
  MoreVertical,
  Shuffle,
  ArrowRight,
  UserX,
  HelpCircle,
  FolderInput,
  CheckSquare,
  Trophy,
  Flame,
  Sparkles,
  Activity,
  Crown,
  School,
  Medal,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import ClassAttendanceCalendar from '../components/ClassAttendanceCalendar';
import ClassAttendanceReportModal from '../components/ClassAttendanceReportModal';
import StudentAttendancePdfModal from '../components/StudentAttendancePdfModal';
import TeacherScheduleReportModal from '../components/TeacherScheduleReportModal';
import ClassScheduleReportModal from '../components/ClassScheduleReportModal';
import SchoolIdentitySettings from '../components/SchoolIdentitySettings';
import AdminLaporanCenter from '../components/AdminLaporanCenter';
import AdminAttendanceManager from '../components/AdminAttendanceManager';
import DatabaseCrudStudio from '../components/DatabaseCrudStudio';
import GpsLocationPicker from '../components/GpsLocationPicker';
import ParentAccountsManager from '../components/ParentAccountsManager';
import StudentAchievementModal from '../components/StudentAchievementModal';
import AdminQuestBuilderModal from '../components/AdminQuestBuilderModal';
import AdminProfileSettings from '../components/AdminProfileSettings';
import AdminActivityLogCenter from '../components/AdminActivityLogCenter';
import {
  calculateStudentAchievementsSummary,
  getMasterAchievements,
  getCustomMissions,
  calculateSemesterEffectiveDays,
  calculateElapsedEffectiveSchoolDays,
  calculateClassDisciplineLeaderboard,
  calculateGradeDisciplineComparison,
  sortAndRankStudentsByStreak,
  assignSharedRanks,
} from '../lib/achievementManager';
import {
  getInvalAssignments,
  saveInvalAssignment,
  removeInvalAssignment,
  getTodayDateString,
  fetchInvalAssignmentsFromCloud,
  getActiveInvalForSchedule,
} from '../lib/invalManager';
import { useToast } from '../context/ToastModalContext';

export default function AdminDashboard() {
  const { userProfile, setUserProfile, logout } = useAuth();
  const { toast, showConfirm, showAlert } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#tab=')) {
        const tabFromHash = decodeURIComponent(hash.replace('#tab=', ''));
        if (tabFromHash) return tabFromHash;
      }
      return localStorage.getItem('siak_active_tab_admin') || 'siswa';
    } catch (e) {
      return 'siswa';
    }
  });

  useEffect(() => {
    if (activeTab) {
      try {
        localStorage.setItem('siak_active_tab_admin', activeTab);
        window.history.replaceState(null, '', `#tab=${encodeURIComponent(activeTab)}`);
      } catch (e) {}
    }
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State Profil Administrator
  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('siak_admin_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      nama: 'Administrator SIAK',
      username: 'admin_siak',
      email: 'admin@siak.sekolah.id',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };
  });

  // State Gamifikasi & Hall of Fame Admin
  const [selectedStudentForAchievement, setSelectedStudentForAchievement] = useState(null);
  const [gamifikasiSubTab, setGamifikasiSubTab] = useState('hall_of_fame'); // 'hall_of_fame' | 'misi_sekolah'
  const [hallOfFameCategory, setHallOfFameCategory] = useState('streak'); // 'streak' | 'kelas' | 'tingkat'
  const [hallOfFamePeriod, setHallOfFamePeriod] = useState('month'); // 'week' | 'month' | 'semester'
  const [gamifikasiFilterKelas, setGamifikasiFilterKelas] = useState('all');
  const [gamifikasiFilterTingkat, setGamifikasiFilterTingkat] = useState('all');
  const [isQuestBuilderModalOpen, setIsQuestBuilderModalOpen] = useState(false);
  const [customMissionsList, setCustomMissionsList] = useState(() => getCustomMissions());

  // Master Data State
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [waQueue, setWaQueue] = useState([]);

  // Kalender Akademik & Hari Libur State
  const [holidays, setHolidays] = useState([]);
  const [currentCalMonth, setCurrentCalMonth] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    id: null,
    tanggal: '',
    tanggal_selesai: '',
    status_hari: 'libur_nasional',
    keterangan: '',
    is_libur: true,
  });
  const [isEditingHoliday, setIsEditingHoliday] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [filterHolidayType, setFilterHolidayType] = useState('semua');
  const [searchHoliday, setSearchHoliday] = useState('');
  const [selectedClassForCalendar, setSelectedClassForCalendar] = useState(null);
  const [selectedClassForReport, setSelectedClassForReport] = useState(null);
  const [selectedStudentForPdf, setSelectedStudentForPdf] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // State untuk Tab Kelola Data Absensi (View Mode & Selected Class)
  const [attendanceManagerView, setAttendanceManagerView] = useState('table');
  const [attendanceManagerClassId, setAttendanceManagerClassId] = useState('all');

  // Sub-Tab di Halaman Kelas: 'kelas' | 'mapel'
  const [kelasSubTab, setKelasSubTab] = useState('kelas');
  const [kbmDaySchedule, setKbmDaySchedule] = useState(() => {
    const today = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
    return today === 'Ahad' ? 'Senin' : today;
  });
  const [kbmClassFilter, setKbmClassFilter] = useState('all');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [selectedTingkat, setSelectedTingkat] = useState('semua'); // 'semua' | number
  const [selectedKelasId, setSelectedKelasId] = useState('semua'); // 'semua' | id_kelas
  const [viewModeSiswa, setViewModeSiswa] = useState('per_kelas'); // 'per_kelas' | 'flat'

  // Modals & Forms
  const [modalType, setModalType] = useState(null); // 'add_siswa' | 'edit_siswa' | 'add_guru' | 'edit_guru' | 'add_kelas' | 'add_mapel' | 'add_jadwal'
  const [formData, setFormData] = useState({});
  const [paralelFormat, setParalelFormat] = useState('angka'); // 'angka' | 'huruf'
  const [paralelNumbers, setParalelNumbers] = useState(['1', '2', '3', '4', '5']);
  const [paralelLetters, setParalelLetters] = useState(['A', 'B', 'C', 'D', 'E']);
  const [customParalelInput, setCustomParalelInput] = useState('');
  const [savingMapel, setSavingMapel] = useState(false);
  const [searchSubject, setSearchSubject] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filterTeacherRole, setFilterTeacherRole] = useState('semua'); // 'semua' | 'pengajar' | 'wali_kelas' | 'bk'
  const [filterTeacherSubject, setFilterTeacherSubject] = useState('semua'); // 'semua' | 'tanpa_jadwal' | string (nama_mapel/id_mapel)
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState(null);
  const [selectedTeacherForSchedulePrint, setSelectedTeacherForSchedulePrint] = useState(null);
  const [schedulePrintModalOpen, setSchedulePrintModalOpen] = useState(false);
  const [schedulePrintMode, setSchedulePrintMode] = useState('single'); // 'single' | 'all_individual' | 'master_matrix'
  const [selectedClassForSchedulePrint, setSelectedClassForSchedulePrint] = useState(null);
  const [classSchedulePrintModalOpen, setClassSchedulePrintModalOpen] = useState(false);
  const [classSchedulePrintMode, setClassSchedulePrintMode] = useState('single_class'); // 'single_class' | 'all_classes'
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [copiedNip, setCopiedNip] = useState(null);
  const [jadwalSubTab, setJadwalSubTab] = useState('kelas'); // 'kelas' | 'guru' | 'mapel' | 'semua'
  const [selectedKelasForJadwal, setSelectedKelasForJadwal] = useState('');
  const [selectedGuruForJadwal, setSelectedGuruForJadwal] = useState('');
  const [searchJadwal, setSearchJadwal] = useState('');
  const [filterJadwalHari, setFilterJadwalHari] = useState('semua');
  const [selectedStudentForCard, setSelectedStudentForCard] = useState(null);
  const [idCardQrUrl, setIdCardQrUrl] = useState('');

  // Sync body class for print isolation
  useEffect(() => {
    if (selectedStudentForCard) {
      document.body.classList.add('print-modal-open');
    } else {
      document.body.classList.remove('print-modal-open');
    }
    return () => {
      document.body.classList.remove('print-modal-open');
    };
  }, [selectedStudentForCard]);

  // Inval / Guru Pengganti State
  const [invalAssignments, setInvalAssignments] = useState(() => getInvalAssignments());
  const [selectedJadwalForInval, setSelectedJadwalForInval] = useState(null);
  const [invalFormData, setInvalFormData] = useState({
    alasan: 'Sakit',
    id_guru_pengganti: '',
    catatan: '',
  });
  const [filterJadwalInvalOnly, setFilterJadwalInvalOnly] = useState(false);

  // Account Management State
  const [selectedAccountForManage, setSelectedAccountForManage] = useState(null);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [openActionMenuNis, setOpenActionMenuNis] = useState(null);

  // Kenaikan Kelas & Distribusi Kelas Wizard State
  const [promotionStep, setPromotionStep] = useState(1); // 1: Pengecualian Siswa, 2: Pilih Metode Distribusi, 3: Ringkasan & Eksekusi
  const [retainedStudentNis, setRetainedStudentNis] = useState([]); // Siswa 7 & 8 yang tinggal kelas (dikecualikan dari promosi)
  const [ungraduatedStudentNis, setUngraduatedStudentNis] = useState([]); // Siswa 9 yang tidak lulus / mengulang
  const [distributionMode, setDistributionMode] = useState('linear'); // 'linear' | 'shuffle' | 'manual' | 'unassigned'
  const [promotionSearch, setPromotionSearch] = useState('');
  const [promotionFilterTingkat, setPromotionFilterTingkat] = useState('semua'); // 'semua' | '7' | '8' | '9'
  const [processingPromotion, setProcessingPromotion] = useState(false);
  const [selectedUnassignedNis, setSelectedUnassignedNis] = useState([]);
  const [targetClassForUnassigned, setTargetClassForUnassigned] = useState('');
  const [manualPlacements, setManualPlacements] = useState({}); // { [nis]: target_id_kelas }
  const [selectedStudentForPlotting, setSelectedStudentForPlotting] = useState(null);
  const [isPlottingModalOpen, setIsPlottingModalOpen] = useState(false);
  const [plottingTargetKelas, setPlottingTargetKelas] = useState('');
  const [savingPlotting, setSavingPlotting] = useState(false);

  // Settings State & WhatsApp Templates
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      return {
        sekolah_nama: saved.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: saved.sekolah_logo || '',
        sekolah_stempel: saved.sekolah_stempel || '',
        sekolah_npsn: saved.sekolah_npsn || '30401234',
        sekolah_akreditasi: saved.sekolah_akreditasi || 'A (Unggul)',
        sekolah_dinas: saved.sekolah_dinas || 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN',
        sekolah_alamat: saved.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: saved.sekolah_kota || 'Kota Bangun, Kutai Kartanegara',
        sekolah_provinsi: saved.sekolah_provinsi || 'Kalimantan Timur',
        sekolah_telepon: saved.sekolah_telepon || '(0541) 678901',
        sekolah_email: saved.sekolah_email || 'smpn2kotabangun@sekolah.sch.id',
        sekolah_website: saved.sekolah_website || 'https://smpn2kotabangun.sch.id',
        kepala_sekolah_nama: saved.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: saved.kepala_sekolah_nip || '197003121995121001',
        kepala_sekolah_jabatan: saved.kepala_sekolah_jabatan || 'Kepala Sekolah',
        tahun_ajaran_aktif: saved.tahun_ajaran_aktif || '2026/2027',
        semester_aktif: saved.semester_aktif || 'Ganjil',
        semester_mulai: saved.semester_mulai || '2026-07-13',
        semester_selesai: saved.semester_selesai || '2026-12-19',
        tanggal_bagi_rapor: saved.tanggal_bagi_rapor || '2026-12-19',
        sekolah_lat: saved.sekolah_lat || '-0.245892',
        sekolah_lng: saved.sekolah_lng || '116.591230',
        sekolah_radius_meter: saved.sekolah_radius_meter || '100',
        sekolah_radius_aktif: saved.sekolah_radius_aktif !== undefined ? saved.sekolah_radius_aktif : 'true',
        wa_notifikasi_aktif: saved.wa_notifikasi_aktif !== undefined ? saved.wa_notifikasi_aktif : 'true',
        wa_gateway_api_url: saved.wa_gateway_api_url || 'https://api.fonnte.com/send',
        wa_gateway_api_key: saved.wa_gateway_api_key || 'SAMPLE_FONNTE_KEY_XYZ123',
        wa_template_alpa: saved.wa_template_alpa || 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nKami menginformasikan bahwa ananda *{{nama_siswa}}* (NIS: {{nis}}) tercatat *ALPA (Tanpa Keterangan)* pada hari {{tanggal}}.\n\nMohon konfirmasi jika ananda berhalangan hadir. Terima kasih.',
        wa_template_hadir: saved.wa_template_hadir || 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nAnanda *{{nama_siswa}}* (NIS: {{nis}}) telah *HADIR* di sekolah dan mengikuti KBM pada hari {{tanggal}} pukul {{waktu}}.',
        wa_template_izin_sakit: saved.wa_template_izin_sakit || 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nLaporan presensi ananda *{{nama_siswa}}* berstatus *{{status}}* pada {{tanggal}} telah dicatat oleh pihak sekolah.\nKeterangan: {{keterangan}}.',
        wa_template_akun: saved.wa_template_akun || '*INFORMASI AKSES LOGIN SIAK PRESENSI SEKOLAH*\n\nYth. {{role_label}} *{{nama}}*,\n\nBerikut akun akses untuk masuk ke aplikasi Presensi Sekolah:\n🔗 *Tautan Aplikasi:* {{app_url}}\n👤 *ID Login ({{id_label}}):* {{id_login}}\n📧 *Email:* {{email}}\n🔑 *Password:* {{password}}\n\n_Catatan: Harap simpan informasi ini dan segera ubah kata sandi setelah Anda berhasil masuk._',
      };
    } catch (e) {
      return {
        sekolah_nama: 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_logo: '',
        sekolah_stempel: '',
        sekolah_npsn: '30401234',
        sekolah_akreditasi: 'A (Unggul)',
        sekolah_dinas: 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN',
        sekolah_alamat: 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: 'Kota Bangun, Kutai Kartanegara',
        sekolah_provinsi: 'Kalimantan Timur',
        sekolah_telepon: '(0541) 678901',
        sekolah_email: 'smpn2kotabangun@sekolah.sch.id',
        sekolah_website: 'https://smpn2kotabangun.sch.id',
        kepala_sekolah_nama: 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: '197003121995121001',
        kepala_sekolah_jabatan: 'Kepala Sekolah',
        tahun_ajaran_aktif: '2026/2027',
        semester_aktif: 'Ganjil',
        semester_mulai: '2026-07-13',
        semester_selesai: '2026-12-19',
        tanggal_bagi_rapor: '2026-12-19',
        sekolah_lat: '-0.245892',
        sekolah_lng: '116.591230',
        sekolah_radius_meter: '100',
        sekolah_radius_aktif: 'true',
        wa_notifikasi_aktif: 'true',
        wa_gateway_api_url: 'https://api.fonnte.com/send',
        wa_gateway_api_key: 'SAMPLE_FONNTE_KEY_XYZ123',
        wa_template_alpa: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nKami menginformasikan bahwa ananda *{{nama_siswa}}* (NIS: {{nis}}) tercatat *ALPA (Tanpa Keterangan)* pada hari {{tanggal}}.\n\nMohon konfirmasi jika ananda berhalangan hadir. Terima kasih.',
        wa_template_hadir: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nAnanda *{{nama_siswa}}* (NIS: {{nis}}) telah *HADIR* di sekolah dan mengikuti KBM pada hari {{tanggal}} pukul {{waktu}}.',
        wa_template_izin_sakit: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nLaporan presensi ananda *{{nama_siswa}}* berstatus *{{status}}* pada {{tanggal}} telah dicatat oleh pihak sekolah.\nKeterangan: {{keterangan}}.',
        wa_template_akun: '*INFORMASI AKSES LOGIN SIAK PRESENSI SEKOLAH*\n\nYth. {{role_label}} *{{nama}}*,\n\nBerikut akun akses untuk masuk ke aplikasi Presensi Sekolah:\n🔗 *Tautan Aplikasi:* {{app_url}}\n👤 *ID Login ({{id_label}}):* {{id_login}}\n📧 *Email:* {{email}}\n🔑 *Password:* {{password}}\n\n_Catatan: Harap simpan informasi ini dan segera ubah kata sandi setelah Anda berhasil masuk._',
      };
    }
  });
  const [activeWaTemplateTab, setActiveWaTemplateTab] = useState('alpa'); // 'alpa' | 'izin_sakit' | 'hadir' | 'akun'
  const [savingSettings, setSavingSettings] = useState(false);

  // State & Helper Penetapan Periode Akademik & Semester Aktif
  const [isAcademicPeriodModalOpen, setIsAcademicPeriodModalOpen] = useState(false);
  const [academicPeriodForm, setAcademicPeriodForm] = useState({
    tahun_ajaran_aktif: '2026/2027',
    semester_aktif: 'Ganjil',
    semester_mulai: '2026-07-13',
    semester_selesai: '2026-12-19',
    tanggal_bagi_rapor: '2026-12-19',
  });
  const [savingAcademicPeriod, setSavingAcademicPeriod] = useState(false);

  function handleOpenAcademicPeriodModal() {
    setAcademicPeriodForm({
      tahun_ajaran_aktif: settings.tahun_ajaran_aktif || '2026/2027',
      semester_aktif: settings.semester_aktif || 'Ganjil',
      semester_mulai: settings.semester_mulai || (settings.semester_aktif === 'Genap' ? '2027-01-04' : '2026-07-13'),
      semester_selesai: settings.semester_selesai || (settings.semester_aktif === 'Genap' ? '2027-06-19' : '2026-12-19'),
      tanggal_bagi_rapor: settings.tanggal_bagi_rapor || (settings.semester_aktif === 'Genap' ? '2027-06-19' : '2026-12-19'),
    });
    setIsAcademicPeriodModalOpen(true);
  }

  async function handleSaveAcademicPeriod(e) {
    if (e) e.preventDefault();
    setSavingAcademicPeriod(true);
    try {
      const updatedSettings = {
        ...settings,
        ...academicPeriodForm,
      };
      setSettings(updatedSettings);

      // Simpan ke localStorage sistem settings
      localStorage.setItem('siak_system_settings', JSON.stringify(updatedSettings));

      // Sinkronkan juga ke siak_academic_settings untuk laporan rekap
      const isGanjil = academicPeriodForm.semester_aktif === 'Ganjil';
      const academicStorage = {
        academic_year: academicPeriodForm.tahun_ajaran_aktif,
        ganjil_start: isGanjil ? academicPeriodForm.semester_mulai : '2026-07-13',
        ganjil_end: isGanjil ? academicPeriodForm.semester_selesai : '2026-12-19',
        genap_start: !isGanjil ? academicPeriodForm.semester_mulai : '2027-01-04',
        genap_end: !isGanjil ? academicPeriodForm.semester_selesai : '2027-06-19',
      };
      localStorage.setItem('siak_academic_settings', JSON.stringify(academicStorage));

      // Upsert ke Supabase
      for (const [k, v] of Object.entries(academicPeriodForm)) {
        try {
          await supabase.from('pengaturan_sistem').upsert({ kunci: k, nilai: v }, { onConflict: 'kunci' });
        } catch (err) {}
      }

      toast.success(
        `Tahun Ajaran ${academicPeriodForm.tahun_ajaran_aktif} (Semester ${academicPeriodForm.semester_aktif}) berhasil ditetapkan!`,
        'Periode Akademik Aktif'
      );
      setIsAcademicPeriodModalOpen(false);
    } catch (err) {
      toast.error(`Gagal menyimpan periode: ${err.message}`);
    } finally {
      setSavingAcademicPeriod(false);
    }
  }

  function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function getSemesterProgress(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return { percent: 0, status: 'Belum Dimulai', text: '' };
    const start = new Date(startDateStr + 'T00:00:00').getTime();
    const end = new Date(endDateStr + 'T23:59:59').getTime();
    const now = new Date().getTime();
    if (now < start) {
      const daysToStart = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
      return { percent: 0, status: 'Akan Datang', text: `Dimulai dalam ${daysToStart} hari lagi` };
    }
    if (now > end) {
      return { percent: 100, status: 'Selesai', text: 'Semester ini telah selesai' };
    }
    const total = end - start;
    const current = now - start;
    const percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    const weeksLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24 * 7)));
    return { percent, status: 'Sedang Berjalan', text: `${percent}% Berjalan • Tersisa ±${weeksLeft} minggu KBM` };
  }

  // Initial Data Fetching
  useEffect(() => {
    loadAllMasterData();
  }, []);

  async function loadAllMasterData() {
    fetchSettings();
    fetchStudents();
    fetchTeachers();
    fetchClasses();
    fetchSubjects();
    fetchSchedules();
    fetchWaQueue();
    fetchHolidays();
    fetchInvalAssignmentsFromCloud().then((res) => {
      if (res) setInvalAssignments(res);
    });
  }

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('pengaturan_sistem').select('kunci, nilai');
      if (data && data.length > 0) {
        const mapped = {};
        data.forEach((item) => { mapped[item.kunci] = item.nilai; });
        setSettings((prev) => {
          const merged = { ...prev, ...mapped };
          localStorage.setItem('siak_system_settings', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (e) {}
  }

  async function fetchStudents() {
    try {
      const { data } = await supabase
        .from('siswa')
        .select('nis, nama, foto_wajah, qr_token_pribadi, streak_sekarang, status_siswa, id_kelas, id_user, id_ortu, kelas(nama_kelas, tingkat), orang_tua(id_ortu, no_whatsapp, nama_ayah)')
        .order('nama', { ascending: true });
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        // Fallback default
        setStudents([
          { nis: '202409001', nama: 'Budi Pratama', qr_token_pribadi: 'TOKEN-BUDI-202409001-SECURE', streak_sekarang: 14, status_siswa: 'aktif', kelas: { nama_kelas: 'VII-A', tingkat: 7 }, orang_tua: { no_whatsapp: '6281234567890', nama_ayah: 'Bambang' } },
          { nis: '202409002', nama: 'Siti Rahmawati', qr_token_pribadi: 'TOKEN-SITI-02', streak_sekarang: 12, status_siswa: 'aktif', kelas: { nama_kelas: 'VII-A', tingkat: 7 }, orang_tua: { no_whatsapp: '6281987654321', nama_ayah: 'Suryono' } },
          { nis: '202409003', nama: 'Rian Hidayat', qr_token_pribadi: 'TOKEN-RIAN-03', streak_sekarang: 9, status_siswa: 'aktif', kelas: { nama_kelas: 'VIII-A', tingkat: 8 }, orang_tua: { no_whatsapp: '6285211223344', nama_ayah: 'Gunawan' } },
        ]);
      }
    } catch (e) {}
  }

  const DEFAULT_TEACHERS = [
    { nip: '198501152010011002', nama: 'Bpk. Ahmad Fauzi, S.Pd', is_bk: false, foto_profil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { nip: '198802202012022001', nama: 'Ibu Ratna Dewi, M.Pd', is_bk: false, foto_profil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { nip: '199203152018011003', nama: 'Bpk. Hendra Wijaya, M.Kom', is_bk: false, foto_profil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { nip: '197905102005012004', nama: 'Ibu Dra. Hj. Siti Maryam, M.Si', is_bk: true, foto_profil: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { nip: '199008122019031005', nama: 'Bpk. Denny Prasetyo, S.Pd', is_bk: false, foto_profil: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { nip: '199411052020122006', nama: 'Ibu Amanda Putri, S.Pd', is_bk: false, foto_profil: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
  ];

  const DEFAULT_CLASSES = [
    { id_kelas: 'c0000000-0000-0000-0000-000000000001', nama_kelas: 'VII-A', tingkat: 7, jurusan: 'IPA', wali_kelas: '198501152010011002', guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
    { id_kelas: 'c0000000-0000-0000-0000-000000000002', nama_kelas: 'VIII-A', tingkat: 8, jurusan: 'IPA', wali_kelas: '198802202012022001', guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_kelas: 'c0000000-0000-0000-0000-000000000003', nama_kelas: 'IX-A', tingkat: 9, jurusan: 'IPS', wali_kelas: '199203152018011003', guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
  ];

  const DEFAULT_SUBJECTS = [
    { id_mapel: 'd0000000-0000-0000-0000-000000000001', nama_mapel: 'Informatika & Pemrograman Web' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000002', nama_mapel: 'Matematika Wajib' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000003', nama_mapel: 'Bahasa Indonesia' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000004', nama_mapel: 'Bahasa Inggris' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000005', nama_mapel: 'Fisika' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000006', nama_mapel: 'Pendidikan Jasmani & Olahraga' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000007', nama_mapel: 'Biologi' },
    { id_mapel: 'd0000000-0000-0000-0000-000000000008', nama_mapel: 'Pendidikan Agama & Budi Pekerti' },
  ];

  const DEFAULT_SCHEDULES = [
    // === KELAS X-IPA-1 ===
    { id_jadwal: 'j101', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000001', id_guru: '199203152018011003', hari: 'Senin', jam_mulai: '07:30', jam_selesai: '09:00', batas_terlambat: '07:45', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Informatika & Pemrograman Web' }, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
    { id_jadwal: 'j102', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000003', id_guru: '198501152010011002', hari: 'Senin', jam_mulai: '09:15', jam_selesai: '11:30', batas_terlambat: '09:30', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Bahasa Indonesia' }, guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
    { id_jadwal: 'j103', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Selasa', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j104', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000008', id_guru: '198501152010011002', hari: 'Selasa', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Pendidikan Agama & Budi Pekerti' }, guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
    { id_jadwal: 'j105', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000005', id_guru: '197905102005012004', hari: 'Rabu', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Fisika' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j106', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000004', id_guru: '199411052020122006', hari: 'Rabu', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Bahasa Inggris' }, guru: { nama: 'Ibu Amanda Putri, S.Pd' } },
    { id_jadwal: 'j107', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000006', id_guru: '199008122019031005', hari: 'Kamis', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Pendidikan Jasmani & Olahraga' }, guru: { nama: 'Bpk. Denny Prasetyo, S.Pd' } },
    { id_jadwal: 'j108', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000007', id_guru: '197905102005012004', hari: 'Kamis', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Biologi' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j109', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Jumat', jam_mulai: '07:30', jam_selesai: '09:00', batas_terlambat: '07:45', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j110', id_kelas: 'c0000000-0000-0000-0000-000000000001', id_mapel: 'd0000000-0000-0000-0000-000000000001', id_guru: '199203152018011003', hari: 'Jumat', jam_mulai: '09:15', jam_selesai: '11:00', batas_terlambat: '09:30', kelas: { nama_kelas: 'X-IPA-1' }, mata_pelajaran: { nama_mapel: 'Informatika & Pemrograman Web' }, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },

    // === KELAS XI-IPA-2 ===
    { id_jadwal: 'j201', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000005', id_guru: '197905102005012004', hari: 'Senin', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Fisika' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j202', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000004', id_guru: '199411052020122006', hari: 'Senin', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Bahasa Inggris' }, guru: { nama: 'Ibu Amanda Putri, S.Pd' } },
    { id_jadwal: 'j203', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000001', id_guru: '199203152018011003', hari: 'Selasa', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Informatika & Pemrograman Web' }, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
    { id_jadwal: 'j204', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Selasa', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j205', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000003', id_guru: '198501152010011002', hari: 'Rabu', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Bahasa Indonesia' }, guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
    { id_jadwal: 'j206', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000007', id_guru: '197905102005012004', hari: 'Rabu', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Biologi' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j207', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Kamis', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j208', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000005', id_guru: '197905102005012004', hari: 'Kamis', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Fisika' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j209', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000006', id_guru: '199008122019031005', hari: 'Jumat', jam_mulai: '07:30', jam_selesai: '09:00', batas_terlambat: '07:45', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Pendidikan Jasmani & Olahraga' }, guru: { nama: 'Bpk. Denny Prasetyo, S.Pd' } },
    { id_jadwal: 'j210', id_kelas: 'c0000000-0000-0000-0000-000000000002', id_mapel: 'd0000000-0000-0000-0000-000000000004', id_guru: '199411052020122006', hari: 'Jumat', jam_mulai: '09:15', jam_selesai: '11:00', batas_terlambat: '09:30', kelas: { nama_kelas: 'XI-IPA-2' }, mata_pelajaran: { nama_mapel: 'Bahasa Inggris' }, guru: { nama: 'Ibu Amanda Putri, S.Pd' } },

    // === KELAS XII-IPA-1 ===
    { id_jadwal: 'j301', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Senin', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j302', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000005', id_guru: '197905102005012004', hari: 'Senin', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Fisika' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j303', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000004', id_guru: '199411052020122006', hari: 'Selasa', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Bahasa Inggris' }, guru: { nama: 'Ibu Amanda Putri, S.Pd' } },
    { id_jadwal: 'j304', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000006', id_guru: '199008122019031005', hari: 'Selasa', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Pendidikan Jasmani & Olahraga' }, guru: { nama: 'Bpk. Denny Prasetyo, S.Pd' } },
    { id_jadwal: 'j305', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000001', id_guru: '199203152018011003', hari: 'Rabu', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Informatika & Pemrograman Web' }, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
    { id_jadwal: 'j306', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000002', id_guru: '198802202012022001', hari: 'Rabu', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Matematika Wajib' }, guru: { nama: 'Ibu Ratna Dewi, M.Pd' } },
    { id_jadwal: 'j307', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000003', id_guru: '198501152010011002', hari: 'Kamis', jam_mulai: '07:30', jam_selesai: '09:45', batas_terlambat: '07:45', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Bahasa Indonesia' }, guru: { nama: 'Bpk. Ahmad Fauzi, S.Pd' } },
    { id_jadwal: 'j308', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000007', id_guru: '197905102005012004', hari: 'Kamis', jam_mulai: '10:00', jam_selesai: '11:30', batas_terlambat: '10:15', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Biologi' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j309', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000005', id_guru: '197905102005012004', hari: 'Jumat', jam_mulai: '07:30', jam_selesai: '09:00', batas_terlambat: '07:45', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Fisika' }, guru: { nama: 'Ibu Dra. Hj. Siti Maryam, M.Si' } },
    { id_jadwal: 'j310', id_kelas: 'c0000000-0000-0000-0000-000000000003', id_mapel: 'd0000000-0000-0000-0000-000000000001', id_guru: '199203152018011003', hari: 'Jumat', jam_mulai: '09:15', jam_selesai: '11:00', batas_terlambat: '09:30', kelas: { nama_kelas: 'XII-IPA-1' }, mata_pelajaran: { nama_mapel: 'Informatika & Pemrograman Web' }, guru: { nama: 'Bpk. Hendra Wijaya, M.Kom' } },
  ];

  async function fetchTeachers() {
    try {
      const { data, error } = await supabase.from('guru').select('*').order('nama', { ascending: true });
      const localCustom = JSON.parse(localStorage.getItem('siak_custom_teachers') || '[]');
      let baseList = (data && data.length > 0) ? data : DEFAULT_TEACHERS;

      // Merge localCustom teachers so locally added/edited teachers are NEVER lost
      const merged = [...baseList];
      for (const ct of localCustom) {
        const existingIdx = merged.findIndex((t) => t.nip === ct.nip);
        if (existingIdx >= 0) {
          merged[existingIdx] = { ...merged[existingIdx], ...ct };
        } else {
          merged.push(ct);
        }
      }
      setTeachers(merged);
    } catch (e) {
      console.warn('fetchTeachers error:', e);
      const localCustom = JSON.parse(localStorage.getItem('siak_custom_teachers') || '[]');
      const merged = [...DEFAULT_TEACHERS];
      for (const ct of localCustom) {
        const existingIdx = merged.findIndex((t) => t.nip === ct.nip);
        if (existingIdx >= 0) {
          merged[existingIdx] = { ...merged[existingIdx], ...ct };
        } else {
          merged.push(ct);
        }
      }
      setTeachers(merged);
    }
  }

  function getTingkat(c) {
    if (c?.tingkat) return Number(c.tingkat);
    const name = (c?.nama_kelas || '').toUpperCase();
    if (name.startsWith('IX') || name.startsWith('9')) return 9;
    if (name.startsWith('VIII') || name.startsWith('8')) return 8;
    if (name.startsWith('VII') || name.startsWith('7')) return 7;
    return 7;
  }

  function sortClasses(classList) {
    if (!classList || !Array.isArray(classList)) return [];
    return [...classList].sort((a, b) => {
      const tA = getTingkat(a);
      const tB = getTingkat(b);
      if (tA !== tB) {
        return tA - tB;
      }
      return (a.nama_kelas || '').localeCompare(b.nama_kelas || '', undefined, { numeric: true });
    });
  }

  async function fetchClasses() {
    try {
      let { data, error } = await supabase
        .from('kelas')
        .select('id_kelas, nama_kelas, tingkat, jurusan, wali_kelas, guru(nama)')
        .order('tingkat', { ascending: true })
        .order('nama_kelas', { ascending: true });

      if (error && error.code === '42703') {
        // Fallback jika kolom jurusan belum dibuat di skema Supabase
        const res = await supabase
          .from('kelas')
          .select('id_kelas, nama_kelas, tingkat, wali_kelas, guru(nama)')
          .order('tingkat', { ascending: true })
          .order('nama_kelas', { ascending: true });
        data = res.data;
      }

      if (data && data.length > 0) {
        setClasses(sortClasses(data));
      } else {
        setClasses(sortClasses(DEFAULT_CLASSES));
      }
    } catch (e) {
      setClasses(sortClasses(DEFAULT_CLASSES));
    }
  }

  async function fetchSubjects() {
    try {
      const { data, error } = await supabase.from('mata_pelajaran').select('*').order('nama_mapel', { ascending: true });
      if (data && data.length > 0) {
        setSubjects(data);
      } else {
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch (e) {
      console.warn('fetchSubjects error:', e);
      setSubjects(DEFAULT_SUBJECTS);
    }
  }

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('jadwal')
        .select('id_jadwal, id_kelas, id_mapel, id_guru, hari, jam_mulai, jam_selesai, batas_waktu_terlambat, kelas(nama_kelas), mata_pelajaran(nama_mapel), guru(nama)')
        .order('hari', { ascending: true });
      if (data && data.length >= 5) {
        const normalized = data.map((d) => ({
          ...d,
          batas_terlambat: d.batas_waktu_terlambat ? d.batas_waktu_terlambat.slice(0, 5) : (d.batas_terlambat || '07:45'),
        }));
        setSchedules(normalized);
      } else {
        setSchedules(DEFAULT_SCHEDULES);
      }
    } catch (e) {
      console.warn('fetchSchedules error:', e);
      setSchedules(DEFAULT_SCHEDULES);
    }
  }

  async function handleLoadSampleSchedule() {
    const ok = await showConfirm({
      title: 'Muat Template Jadwal Lengkap?',
      message: 'Apakah Anda ingin memuat template jadwal kurikulum lengkap untuk kelas X-IPA-1, XI-IPA-2, dan XII-IPA-1 (total 30 sesi KBM Senin-Jumat bebas bentrok)?',
      type: 'info',
      confirmText: 'Muat Jadwal',
      cancelText: 'Batal',
    });
    if (!ok) return;
    setTeachers(DEFAULT_TEACHERS);
    setClasses(DEFAULT_CLASSES);
    setSubjects(DEFAULT_SUBJECTS);
    setSchedules(DEFAULT_SCHEDULES);
    toast.success('Jadwal kelas berhasil dimuat dengan 30 sesi KBM mingguan lengkap bebas bentrok!', 'Template Berhasil Dimuat');
  }

  async function fetchWaQueue() {
    try {
      const { data } = await supabase.from('antrean_whatsapp').select('*').order('created_at', { ascending: false }).limit(20);
      if (data && data.length > 0) {
        setWaQueue(data);
      } else {
        setWaQueue([
          { id: '1', no_tujuan: '6281234567890', pesan: 'Apresiasi: Selamat! Ananda Budi Pratama telah mencapai Attendance Streak 14 Hari!', status_kirim: 'sukses', created_at: new Date().toISOString() },
        ]);
      }
    } catch (e) {}
  }

  // ==========================================
  // KALENDER AKADEMIK & HARI LIBUR HANDLERS
  // ==========================================
  async function fetchHolidays() {
    try {
      const { data, error } = await supabase
        .from('kalender_akademik')
        .select('*')
        .order('tanggal', { ascending: true });
      if (data && data.length > 0) {
        setHolidays(data);
      } else {
        setHolidays([
          { id: '1', tanggal: '2026-10-20', status_hari: 'kegiatan_khusus', keterangan: 'Classmeeting & Porseni Sekolah', is_libur: false },
          { id: '2', tanggal: '2026-10-28', status_hari: 'libur_nasional', keterangan: 'Hari Sumpah Pemuda (Upacara)', is_libur: false },
          { id: '3', tanggal: '2026-12-25', status_hari: 'libur_nasional', keterangan: 'Hari Raya Natal', is_libur: true },
          { id: '4', tanggal: '2026-12-31', status_hari: 'libur_sekolah', keterangan: 'Libur Akhir Semester Ganjil', is_libur: true },
          { id: '5', tanggal: '2027-01-01', status_hari: 'libur_nasional', keterangan: 'Tahun Baru Masehi', is_libur: true },
        ]);
      }
    } catch (e) {
      console.error('Error fetchHolidays:', e);
    }
  }

  async function handleSaveHoliday(e) {
    e.preventDefault();
    if (!holidayForm.tanggal) {
      toast.warning('Mohon tentukan tanggal kegiatan atau libur!', 'Tanggal Diperlukan');
      return;
    }

    setSavingHoliday(true);
    try {
      const startDate = new Date(holidayForm.tanggal);
      const endDate = holidayForm.tanggal_selesai
        ? new Date(holidayForm.tanggal_selesai)
        : startDate;

      if (endDate < startDate) {
        toast.error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai!', 'Rentang Tanggal Salah');
        setSavingHoliday(false);
        return;
      }

      // Generate array record tanggal jika rentang tanggal dipilih
      const recordsToInsert = [];
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const tglStr = `${y}-${m}-${d}`;

        recordsToInsert.push({
          tanggal: tglStr,
          status_hari: holidayForm.status_hari,
          keterangan: holidayForm.keterangan,
          is_libur: holidayForm.is_libur,
        });
        cur.setDate(cur.getDate() + 1);
      }

      if (isEditingHoliday && holidayForm.id) {
        const { error } = await supabase
          .from('kalender_akademik')
          .update({
            tanggal: holidayForm.tanggal,
            status_hari: holidayForm.status_hari,
            keterangan: holidayForm.keterangan,
            is_libur: holidayForm.is_libur,
          })
          .eq('id', holidayForm.id);
        if (error) throw error;
        toast.success('Data agenda/libur berhasil diperbarui!', 'Tersimpan');
      } else {
        const { error } = await supabase
          .from('kalender_akademik')
          .upsert(recordsToInsert, { onConflict: 'tanggal' });
        if (error) throw error;
        toast.success(`Berhasil menyimpan ${recordsToInsert.length} tanggal ke Kalender Akademik!`, 'Tersimpan');
      }

      setHolidayForm({
        id: null,
        tanggal: '',
        tanggal_selesai: '',
        status_hari: 'libur_nasional',
        keterangan: '',
        is_libur: true,
      });
      setIsEditingHoliday(false);
      fetchHolidays();
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(item) {
    const ok = await showConfirm({
      title: 'Hapus Agenda Kalender?',
      message: `Hapus agenda "${item.keterangan}" (${item.tanggal}) dari kalender akademik sekolah?`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('kalender_akademik')
        .delete()
        .eq('tanggal', item.tanggal);
      if (error) throw error;
      toast.success(`Agenda "${item.keterangan}" berhasil dihapus.`);
      fetchHolidays();
    } catch (err) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  }

  async function handleSyncNationalHolidays() {
    const ok = await showConfirm({
      title: 'Sinkronkan Hari Libur Nasional?',
      message: 'Muat dan sinkronkan daftar Hari Libur Nasional & Kalender Akademik standar ke database sekolah?',
      type: 'info',
      confirmText: 'Mulai Sinkronisasi',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const nationalHolidays = [
        { tanggal: '2026-01-01', status_hari: 'libur_nasional', keterangan: 'Tahun Baru 2026 Masehi', is_libur: true },
        { tanggal: '2026-02-17', status_hari: 'libur_nasional', keterangan: 'Tahun Baru Imlek 2577 Kongzili', is_libur: true },
        { tanggal: '2026-03-20', status_hari: 'libur_nasional', keterangan: 'Hari Raya Idul Fitri 1447 H', is_libur: true },
        { tanggal: '2026-03-21', status_hari: 'libur_nasional', keterangan: 'Cuti Bersama Idul Fitri 1447 H', is_libur: true },
        { tanggal: '2026-05-01', status_hari: 'libur_nasional', keterangan: 'Hari Buruh Internasional', is_libur: true },
        { tanggal: '2026-05-14', status_hari: 'libur_nasional', keterangan: 'Kenaikan Yesus Kristus', is_libur: true },
        { tanggal: '2026-05-27', status_hari: 'libur_nasional', keterangan: 'Hari Raya Idul Adha 1447 H', is_libur: true },
        { tanggal: '2026-06-01', status_hari: 'libur_nasional', keterangan: 'Hari Lahir Pancasila', is_libur: true },
        { tanggal: '2026-08-17', status_hari: 'libur_nasional', keterangan: 'Hari Kemerdekaan RI ke-81', is_libur: true },
        { tanggal: '2026-10-20', status_hari: 'kegiatan_khusus', keterangan: 'Porseni & Classmeeting Antar Kelas', is_libur: false },
        { tanggal: '2026-10-28', status_hari: 'kegiatan_khusus', keterangan: 'Upacara Peringatan Hari Sumpah Pemuda', is_libur: false },
        { tanggal: '2026-12-25', status_hari: 'libur_nasional', keterangan: 'Hari Raya Natal', is_libur: true },
        { tanggal: '2026-12-28', status_hari: 'libur_sekolah', keterangan: 'Libur Akhir Semester Ganjil', is_libur: true },
        { tanggal: '2026-12-29', status_hari: 'libur_sekolah', keterangan: 'Libur Akhir Semester Ganjil', is_libur: true },
        { tanggal: '2026-12-30', status_hari: 'libur_sekolah', keterangan: 'Libur Akhir Semester Ganjil', is_libur: true },
        { tanggal: '2026-12-31', status_hari: 'libur_sekolah', keterangan: 'Libur Akhir Semester Ganjil', is_libur: true },
      ];

      const { error } = await supabase
        .from('kalender_akademik')
        .upsert(nationalHolidays, { onConflict: 'tanggal' });
      if (error) throw error;
      toast.success(`Sebanyak ${nationalHolidays.length} hari libur nasional telah berhasil disinkronkan.`, 'Sinkronisasi Berhasil');
      fetchHolidays();
    } catch (err) {
      toast.error(`Gagal sinkronisasi: ${err.message}`);
    }
  }

  // ==========================================
  // 1. SISWA CRUD, AKUN & UNBIND DEVICE
  // ==========================================
  async function handleSaveSiswa(e) {
    e.preventDefault();
    try {
      // 1. Simpan / Perbarui Data Orang Tua & Nomor WhatsApp
      let ortuId = formData.id_ortu || null;
      const rawWa = (formData.no_whatsapp_ortu || '').trim();
      let cleanWa = rawWa.replace(/[^0-9]/g, '');
      if (cleanWa.startsWith('0')) {
        cleanWa = '62' + cleanWa.slice(1);
      }
      const parentName = (formData.nama_orang_tua || '').trim();

      if (cleanWa) {
        if (ortuId) {
          try {
            await supabase.from('orang_tua').update({
              no_whatsapp: cleanWa,
              nama_ayah: parentName || 'Orang Tua Murid',
            }).eq('id_ortu', ortuId);
          } catch (e) {
            console.warn('Update orang tua:', e);
          }
        } else {
          try {
            const { data: newOrtu, error: ortuErr } = await supabase
              .from('orang_tua')
              .insert([{
                no_whatsapp: cleanWa,
                nama_ayah: parentName || 'Orang Tua Murid',
              }])
              .select('id_ortu')
              .single();
            if (!ortuErr && newOrtu) {
              ortuId = newOrtu.id_ortu;
            }
          } catch (e) {
            console.warn('Insert orang tua:', e);
          }
        }
      }

      const payload = {
        nis: formData.nis,
        nama: formData.nama,
        id_kelas: formData.id_kelas || null,
        status_siswa: formData.status_siswa || 'aktif',
        qr_token_pribadi: formData.qr_token_pribadi || `TOKEN-${formData.nis}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      };
      if (ortuId) {
        payload.id_ortu = ortuId;
      }

      let dbSaveSuccess = true;
      let dbErrorMsg = '';

      if (modalType === 'add_siswa') {
        const { error } = await supabase.from('siswa').insert([payload]);
        if (error) {
          console.warn('Supabase insert siswa notice:', error.message);
          // Jika gagal karena foreign key id_kelas belum ada di tabel kelas Supabase, coba simpan tanpa id_kelas
          if (error.message?.includes('foreign key') || error.code === '23503') {
            const { id_kelas, ...safePayload } = payload;
            const retryRes = await supabase.from('siswa').insert([safePayload]);
            if (retryRes.error) {
              dbSaveSuccess = false;
              dbErrorMsg = retryRes.error.message;
            } else {
              dbSaveSuccess = true;
            }
          } else {
            dbSaveSuccess = false;
            dbErrorMsg = error.message;
          }
        }
      } else {
        const { error } = await supabase.from('siswa').update(payload).eq('nis', payload.nis);
        if (error) {
          console.warn('Supabase update siswa notice:', error.message);
          if (error.message?.includes('foreign key') || error.code === '23503') {
            const { id_kelas, ...safePayload } = payload;
            const retryRes = await supabase.from('siswa').update(safePayload).eq('nis', payload.nis);
            if (retryRes.error) {
              dbSaveSuccess = false;
              dbErrorMsg = retryRes.error.message;
            } else {
              dbSaveSuccess = true;
            }
          } else {
            dbSaveSuccess = false;
            dbErrorMsg = error.message;
          }
        }
      }

      // Perbarui local state students agar langsung tampil di UI tabel tanpa menunggu cloud
      setStudents((prev) => {
        const existingIdx = prev.findIndex((s) => s.nis === payload.nis);
        const kelasObj = classes.find((c) => c.id_kelas === payload.id_kelas);
        const updatedStudent = {
          ...(existingIdx >= 0 ? prev[existingIdx] : {}),
          ...payload,
          kelas: kelasObj || (existingIdx >= 0 ? prev[existingIdx].kelas : null),
          orang_tua: cleanWa ? { id_ortu: ortuId, no_whatsapp: cleanWa, nama_ayah: parentName } : (existingIdx >= 0 ? prev[existingIdx].orang_tua : null),
        };
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = updatedStudent;
          return next;
        } else {
          return [...prev, updatedStudent];
        }
      });

      // Sinkronisasi Kredensial Login Akun Siswa (siak_user_credentials)
      try {
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const userKey = payload.nis;
        const existingCred = customCreds[userKey] || {};
        customCreds[userKey] = {
          ...existingCred,
          role: 'murid',
          nis: payload.nis,
          nama: payload.nama,
          id_kelas: payload.id_kelas,
          email: formData.account_email?.trim() || existingCred.email || `${payload.nis}@siswa.sekolah.id`,
          password: formData.account_password?.trim() || existingCred.password || 'password123',
          status: formData.account_status || existingCred.status || 'aktif',
          details: {
            nis: payload.nis,
            nama: payload.nama,
            id_kelas: payload.id_kelas,
            status_siswa: payload.status_siswa,
            qr_token_pribadi: payload.qr_token_pribadi,
            no_whatsapp_ortu: cleanWa,
            nama_orang_tua: parentName,
          },
        };
        localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
      } catch (credErr) {
        console.warn('Gagal simpan akun siswa ke siak_user_credentials:', credErr);
      }

      setModalType(null);

      if (!dbSaveSuccess) {
        if (dbErrorMsg.includes('row-level security') || dbErrorMsg.includes('policy')) {
          toast.warning(
            `Data siswa tersimpan di dashboard lokal! Catatan Cloud: RLS Supabase membatasi simpan ke database cloud. Silakan jalankan script 'fix_siswa_dan_seluruh_rls.sql' di SQL Editor Supabase Anda.`,
            'Tersimpan di Sesi Lokal'
          );
        } else {
          toast.warning(
            `Data siswa tersimpan di dashboard lokal (Catatan database cloud: ${dbErrorMsg})`,
            'Tersimpan (Catatan Cloud)'
          );
        }
      } else {
        toast.success(
          modalType === 'add_siswa'
            ? `Siswa ${payload.nama} berhasil ditambahkan ke database!`
            : `Data siswa ${payload.nama} berhasil diperbarui!`,
          'Berhasil Tersimpan'
        );
      }

      fetchStudents();
    } catch (err) {
      toast.error(`Gagal: ${err.message}`);
    }
  }

  // ==========================================
  // PENGATURAN KREDENSIAL AKUN (GURU & SISWA)
  // ==========================================
  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  function handleOpenManageAccount(person, role) {
    const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
    const idKey = role === 'guru' ? person.nip : person.nis;
    const existing = creds[idKey] || {};

    setSelectedAccountForManage({
      role: role, // 'guru' | 'murid'
      id: idKey,
      nama: person.nama,
      email: existing.email || (role === 'guru' ? `${idKey}@guru.sekolah.id` : `${idKey}@siswa.sekolah.id`),
      password: existing.password || 'password123',
      status: existing.status || 'aktif',
      device_id: person.device_id || null,
      raw: person,
    });
    setShowAccountPassword(false);
    setCopiedWaText(false);
    setModalType('manage_account');
  }

  function handleSaveManagedAccount(e) {
    e.preventDefault();
    if (!selectedAccountForManage) return;

    try {
      const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
      const userKey = selectedAccountForManage.id;
      const existing = customCreds[userKey] || {};

      customCreds[userKey] = {
        ...existing,
        role: selectedAccountForManage.role,
        nip: selectedAccountForManage.role === 'guru' ? selectedAccountForManage.id : undefined,
        nis: selectedAccountForManage.role === 'murid' ? selectedAccountForManage.id : undefined,
        nama: selectedAccountForManage.nama,
        email: selectedAccountForManage.email?.trim() || `${selectedAccountForManage.id}@sekolah.id`,
        password: selectedAccountForManage.password?.trim() || 'password123',
        status: selectedAccountForManage.status || 'aktif',
        details: {
          ...(existing.details || {}),
          nama: selectedAccountForManage.nama,
          nip: selectedAccountForManage.role === 'guru' ? selectedAccountForManage.id : undefined,
          nis: selectedAccountForManage.role === 'murid' ? selectedAccountForManage.id : undefined,
        },
      };

      localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
      toast.success(
        `Kredensial login ${selectedAccountForManage.nama} berhasil diperbarui! Password siap digunakan.`,
        'Akun Disimpan'
      );
      setModalType(null);
      setSelectedAccountForManage(null);
    } catch (err) {
      toast.error(`Gagal menyimpan akun: ${err.message}`);
    }
  }

  function copyCredentialWhatsApp(acc) {
    const appUrl = window.location.origin;
    const roleLabel = acc.role === 'guru' ? 'Bpk/Ibu Guru' : 'Siswa / Wali Siswa';
    const idLabel = acc.role === 'guru' ? 'NIP' : 'NIS';
    
    const template = settings.wa_template_akun || `*INFORMASI AKSES LOGIN SIAK PRESENSI SEKOLAH*\n\nYth. {{role_label}} *{{nama}}*,\n\nBerikut akun akses untuk masuk ke aplikasi Presensi Sekolah:\n🔗 *Tautan Aplikasi:* {{app_url}}\n👤 *ID Login ({{id_label}}):* {{id_login}}\n📧 *Email:* {{email}}\n🔑 *Password:* {{password}}\n\n_Catatan: Harap simpan informasi ini dan segera ubah kata sandi setelah Anda berhasil masuk._`;

    const text = template
      .replace(/{{app_url}}/g, appUrl)
      .replace(/{{role_label}}/g, roleLabel)
      .replace(/{{id_label}}/g, idLabel)
      .replace(/{{nama}}/g, acc.nama || '')
      .replace(/{{id_login}}/g, acc.id || '')
      .replace(/{{email}}/g, acc.email || '-')
      .replace(/{{password}}/g, acc.password || '');

    navigator.clipboard.writeText(text);
    setCopiedWaText(true);
    toast.success('Pesan kredensial login berhasil disalin! Silakan tempelkan langsung ke WhatsApp.', 'Salin WA Sukses');
    setTimeout(() => setCopiedWaText(false), 3000);
  }

  async function handleDeleteSiswa(nis, nama) {
    const ok = await showConfirm({
      title: 'Hapus Data Siswa?',
      message: `Yakin ingin menghapus siswa ${nama} (${nis})?\nSeluruh riwayat presensi siswa ini akan ikut terhapus.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Siswa',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('siswa').delete().eq('nis', nis);
      if (error) {
        console.warn('Supabase delete error notice:', error.message);
      }
      setStudents((prev) => prev.filter((s) => s.nis !== nis));
      toast.success(`Siswa ${nama} berhasil dihapus.`);
    } catch (err) {
      setStudents((prev) => prev.filter((s) => s.nis !== nis));
      toast.info(`Siswa ${nama} telah dihapus dari tampilan.`);
    }
  }

  function handleStartEditSiswa(st) {
    const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
    const existing = creds[st.nis] || {};
    setFormData({
      ...st,
      id_ortu: st.id_ortu || st.orang_tua?.id_ortu || null,
      no_whatsapp_ortu: st.orang_tua?.no_whatsapp || existing.details?.no_whatsapp_ortu || '',
      nama_orang_tua: st.orang_tua?.nama_ayah || st.orang_tua?.nama_ibu || existing.details?.nama_orang_tua || '',
      account_email: existing.email || `${st.nis}@siswa.sekolah.id`,
      account_password: existing.password || 'password123',
      account_status: existing.status || 'aktif',
    });
    setModalType('edit_siswa');
    setOpenActionMenuNis(null);
  }

  async function handleUnbindDevice(st) {
    const ok = await showConfirm({
      title: 'Reset Device Binding?',
      message: `Reset Device Binding untuk siswa ${st.nama}?\n\nSiswa akan diizinkan login ulang dari perangkat/HP baru.`,
      type: 'warning',
      confirmText: 'Reset Device',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      if (st.id_user) {
        const { error } = await supabase.from('users_metadata').update({ device_id: null }).eq('id', st.id_user);
        if (error) throw error;
      }
      toast.success(`Device Binding untuk ${st.nama} berhasil di-reset! Siswa kini dapat login di HP barunya.`, 'Device Di-reset');
    } catch (err) {
      toast.error(`Gagal reset device: ${err.message}`);
    }
  }

  async function handleResetStreak(nis, nama) {
    const ok = await showConfirm({
      title: 'Reset Streak Kehadiran?',
      message: `Reset streak kehadiran untuk siswa ${nama} menjadi 0 hari?`,
      type: 'warning',
      confirmText: 'Reset Streak',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('siswa').update({ streak_sekarang: 0 }).eq('nis', nis);
      if (error) throw error;
      toast.success(`Streak ${nama} berhasil direset.`);
      fetchStudents();
    } catch (err) {
      toast.error(`Gagal: ${err.message}`);
    }
  }

  // ==========================================
  // 2. GURU CRUD & PENUGASAN
  // ==========================================
  async function handleSaveGuru(e) {
    e.preventDefault();
    const nip = (formData.nip || '').trim();
    const nama = (formData.nama || '').trim();

    if (!nip || !nama) {
      toast.warning('NIP dan Nama Guru wajib diisi!', 'Data Belum Lengkap');
      return;
    }

    if (modalType === 'add_guru') {
      const isDuplicate = teachers.some((t) => t.nip === nip);
      if (isDuplicate) {
        toast.error(`Guru dengan NIP ${nip} sudah terdaftar dalam sistem!`, 'Duplikasi NIP');
        return;
      }
    }

    setSavingTeacher(true);
    try {
      const mapelList = formData.mapel_list || [];
      const mapelStr = mapelList.join(', ');

      const payload = {
        nip: nip,
        nama: nama,
        is_bk: Boolean(formData.is_bk),
        mapel_utama: mapelStr,
        foto_profil:
          formData.foto_profil?.trim() ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nama)}`,
      };

      let dbSaveSuccess = true;
      let dbErrorMessage = '';
      if (modalType === 'add_guru') {
        const { error } = await supabase.from('guru').insert([payload]);
        if (error) {
          console.warn('Supabase insert guru notice:', error.message);
          dbErrorMessage = error.message;
          // Jika kolom mapel_utama belum ada di database, coba simpan tanpa kolom tersebut
          if (error.message?.includes('mapel_utama') || error.code === '42703') {
            const { mapel_utama, ...safePayload } = payload;
            const retry = await supabase.from('guru').insert([safePayload]);
            if (retry.error) {
              dbSaveSuccess = false;
              dbErrorMessage = retry.error.message;
            } else {
              dbSaveSuccess = true;
            }
          } else {
            dbSaveSuccess = false;
          }
        }
      } else {
        const { error } = await supabase.from('guru').update(payload).eq('nip', nip);
        if (error) {
          console.warn('Supabase update guru notice:', error.message);
          dbErrorMessage = error.message;
          if (error.message?.includes('mapel_utama') || error.code === '42703') {
            const { mapel_utama, ...safePayload } = payload;
            const retry = await supabase.from('guru').update(safePayload).eq('nip', nip);
            if (retry.error) {
              dbSaveSuccess = false;
              dbErrorMessage = retry.error.message;
            } else {
              dbSaveSuccess = true;
            }
          } else {
            dbSaveSuccess = false;
          }
        }
      }

      // Sinkronisasi penugasan Wali Kelas pada tabel kelas
      const selectedKelasWali = formData.id_kelas_wali; // string id_kelas atau ''
      if (selectedKelasWali !== undefined) {
        try {
          // 1. Kosongkan kelas lama yang sebelumnya diampu guru ini (jika ada dan berubah)
          await supabase
            .from('kelas')
            .update({ wali_kelas: null })
            .eq('wali_kelas', nip);

          // 2. Jika memilih kelas baru, tetapkan guru ini sebagai wali kelas
          if (selectedKelasWali) {
            await supabase
              .from('kelas')
              .update({ wali_kelas: nip })
              .eq('id_kelas', selectedKelasWali);
          }
        } catch (clsErr) {
          console.warn('Update wali_kelas notice:', clsErr);
        }

        // Perbarui local state classes
        setClasses((prev) =>
          prev.map((c) => {
            if (c.wali_kelas === nip && c.id_kelas !== selectedKelasWali) {
              return { ...c, wali_kelas: null, guru: null };
            }
            if (c.id_kelas === selectedKelasWali) {
              return { ...c, wali_kelas: nip, guru: { nama: nama } };
            }
            return c;
          })
        );
      }

      // Perbarui local state teachers & localStorage agar tidak hilang saat re-fetch
      const fullTeacherRecord = { ...payload, mapel_list: mapelList, mapel_utama: mapelStr };
      const localCustom = JSON.parse(localStorage.getItem('siak_custom_teachers') || '[]');
      const filteredLocal = localCustom.filter((t) => t.nip !== nip);
      filteredLocal.push(fullTeacherRecord);
      localStorage.setItem('siak_custom_teachers', JSON.stringify(filteredLocal));

      setTeachers((prev) => {
        if (modalType === 'add_guru') {
          return [...prev.filter((t) => t.nip !== nip), fullTeacherRecord];
        } else {
          return prev.map((t) => (t.nip === nip ? { ...t, ...fullTeacherRecord } : t));
        }
      });

      // Sinkronisasi Kredensial Login Akun Guru (siak_user_credentials)
      try {
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const userKey = nip;
        const existingCred = customCreds[userKey] || {};
        customCreds[userKey] = {
          ...existingCred,
          role: 'guru',
          nip: nip,
          nama: nama,
          email: formData.account_email?.trim() || existingCred.email || `${nip}@guru.sekolah.id`,
          password: formData.account_password?.trim() || existingCred.password || 'password123',
          status: formData.account_status || existingCred.status || 'aktif',
          details: {
            nip: nip,
            nama: nama,
            foto_profil: fullTeacherRecord.foto_profil,
            mapel_utama: fullTeacherRecord.mapel_utama,
            is_bk: fullTeacherRecord.is_bk,
          },
        };
        localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
      } catch (credErr) {
        console.warn('Gagal simpan akun guru ke siak_user_credentials:', credErr);
      }

      if (!dbSaveSuccess) {
        toast.info(
          `Guru ${nama} berhasil disimpan ke sistem! Jalankan skrip fix_guru_rls.sql di Supabase SQL Editor agar tersimpan permanen di cloud.`,
          'Tersimpan (Mode Lokal)'
        );
      } else {
        toast.success(
          modalType === 'add_guru'
            ? `Guru ${nama} berhasil ditambahkan!`
            : `Data guru ${nama} berhasil diperbarui!`,
          'Berhasil'
        );
      }
      setModalType(null);
      setFormData({});
      fetchTeachers();
      fetchClasses();
    } catch (err) {
      console.error('handleSaveGuru error:', err);
      // Fallback update jika Supabase offline
      const mapelList = formData.mapel_list || [];
      const mapelStr = mapelList.join(', ');
      const payload = {
        nip: nip,
        nama: nama,
        is_bk: Boolean(formData.is_bk),
        mapel_utama: mapelStr,
        mapel_list: mapelList,
        foto_profil:
          formData.foto_profil?.trim() ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nama)}`,
      };

      const localCustom = JSON.parse(localStorage.getItem('siak_custom_teachers') || '[]');
      const filteredLocal = localCustom.filter((t) => t.nip !== nip);
      filteredLocal.push(payload);
      localStorage.setItem('siak_custom_teachers', JSON.stringify(filteredLocal));

      setTeachers((prev) => {
        if (modalType === 'add_guru') {
          return [...prev.filter((t) => t.nip !== nip), payload];
        } else {
          return prev.map((t) => (t.nip === nip ? { ...t, ...payload } : t));
        }
      });

      try {
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
        const userKey = nip;
        const existingCred = customCreds[userKey] || {};
        customCreds[userKey] = {
          ...existingCred,
          role: 'guru',
          nip: nip,
          nama: nama,
          email: formData.account_email?.trim() || existingCred.email || `${nip}@guru.sekolah.id`,
          password: formData.account_password?.trim() || existingCred.password || 'password123',
          status: formData.account_status || existingCred.status || 'aktif',
          details: {
            nip: nip,
            nama: nama,
            foto_profil: payload.foto_profil,
            mapel_utama: payload.mapel_utama,
            is_bk: payload.is_bk,
          },
        };
        localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
      } catch (e) {
        console.warn('Gagal simpan akun guru fallback:', e);
      }

      toast.success(`Data guru ${nama} berhasil disimpan!`);
      setModalType(null);
      setFormData({});
    } finally {
      setSavingTeacher(false);
    }
  }

  async function handleDeleteGuru(nip, nama) {
    const assignedClass = classes.find((c) => c.wali_kelas === nip);
    const teachingSchedules = schedules.filter(
      (j) => j.id_guru === nip || j.guru?.nama === nama
    );

    let warningText = `Hapus data guru ${nama} (${nip})?`;
    if (assignedClass || teachingSchedules.length > 0) {
      const parts = [];
      if (assignedClass) parts.push(`Wali Kelas ${assignedClass.nama_kelas}`);
      if (teachingSchedules.length > 0) parts.push(`Mengajar di ${teachingSchedules.length} sesi jadwal KBM`);
      warningText = `PERINGATAN: Guru ${nama} tercatat aktif sebagai ${parts.join(' & ')}.\n\nMenghapus guru ini akan mengosongkan status wali kelas dan menghapus jadwal KBM terkait. Tetap lanjutkan?`;
    }

    const ok = await showConfirm({
      title: 'Hapus Data Guru?',
      message: warningText,
      type: 'danger',
      confirmText: 'Ya, Hapus Guru',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      // 1. Kosongkan wali kelas pada kelas yang diampu
      if (assignedClass) {
        await supabase
          .from('kelas')
          .update({ wali_kelas: null })
          .eq('wali_kelas', nip);
      }

      // 2. Hapus data guru dari Supabase & localStorage
      const { error } = await supabase.from('guru').delete().eq('nip', nip);
      if (error) console.warn('Supabase delete guru error:', error.message);

      const localCustom = JSON.parse(localStorage.getItem('siak_custom_teachers') || '[]');
      const filteredLocal = localCustom.filter((t) => t.nip !== nip);
      localStorage.setItem('siak_custom_teachers', JSON.stringify(filteredLocal));

      setTeachers((prev) => prev.filter((t) => t.nip !== nip));
      setClasses((prev) =>
        prev.map((c) => (c.wali_kelas === nip ? { ...c, wali_kelas: null, guru: null } : c))
      );
      setSchedules((prev) => prev.filter((j) => j.id_guru !== nip && j.guru?.nama !== nama));

      toast.success(`Guru ${nama} berhasil dihapus.`);
    } catch (err) {
      setTeachers((prev) => prev.filter((t) => t.nip !== nip));
      toast.success(`Guru ${nama} berhasil dihapus.`);
    }
  }

  async function handleToggleBk(teacher) {
    const newStatus = !teacher.is_bk;
    try {
      await supabase.from('guru').update({ is_bk: newStatus }).eq('nip', teacher.nip);
    } catch (e) {
      console.warn('Toggle BK error:', e);
    }
    setTeachers((prev) =>
      prev.map((t) => (t.nip === teacher.nip ? { ...t, is_bk: newStatus } : t))
    );
  }

  function handleExportGuruExcel() {
    const exportData = teachers.map((t, idx) => {
      const assignedClass = classes.find((c) => c.wali_kelas === t.nip);
      const teachingCount = schedules.filter(
        (j) => j.id_guru === t.nip || j.guru?.nama === t.nama
      ).length;
      return {
        No: idx + 1,
        NIP: t.nip,
        'Nama Lengkap & Gelar': t.nama,
        'Penugasan Wali Kelas': assignedClass ? assignedClass.nama_kelas : 'Bukan Wali Kelas',
        'Guru BK (Konseling)': t.is_bk ? 'Ya (Aktif)' : 'Tidak',
        'Beban Mengajar (Sesi KBM)': `${teachingCount} Sesi`,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
    XLSX.writeFile(wb, `Data_Guru_SMPN2_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleCopyNip(nip) {
    navigator.clipboard.writeText(nip);
    setCopiedNip(nip);
    setTimeout(() => {
      setCopiedNip(null);
    }, 2000);
  }

  // ==========================================
  // 3. KELAS, MAPEL, & JADWAL CRUD
  // ==========================================
  async function handleSaveKelas(e) {
    e.preventDefault();
    try {
      const payload = {
        nama_kelas: (formData.nama_kelas || '').trim(),
        tingkat: parseInt(formData.tingkat) || 7,
        jurusan: formData.jurusan || 'IPA',
        wali_kelas: formData.wali_kelas && formData.wali_kelas !== '' ? formData.wali_kelas : null,
      };

      if (!payload.nama_kelas) {
        toast.warning('Nama kelas tidak boleh kosong!', 'Input Diperlukan');
        return;
      }

      const isEdit = Boolean(formData.id_kelas);
      const selGuru = teachers.find((t) => t.nip === payload.wali_kelas);

      if (isEdit) {
        let { error } = await supabase
          .from('kelas')
          .update(payload)
          .eq('id_kelas', formData.id_kelas);

        if (error && error.code === '42703') {
          // Fallback tanpa kolom jurusan jika skema database belum diperbarui
          const { jurusan, ...fallbackPayload } = payload;
          const retry = await supabase
            .from('kelas')
            .update(fallbackPayload)
            .eq('id_kelas', formData.id_kelas);
          error = retry.error;
        }

        if (error) console.warn('Supabase update kelas error:', error.message);

        // Update local state immediately
        setClasses((prev) =>
          sortClasses(
            prev.map((c) =>
              c.id_kelas === formData.id_kelas
                ? {
                    ...c,
                    ...payload,
                    guru: selGuru ? { nama: selGuru.nama } : null,
                  }
                : c
            )
          )
        );
        toast.success(`Kelas "${payload.nama_kelas}" berhasil diperbarui!`, 'Kelas Diperbarui');
      } else {
        let { data, error } = await supabase
          .from('kelas')
          .insert([payload])
          .select();

        if (error && error.code === '42703') {
          // Fallback tanpa kolom jurusan jika skema database belum diperbarui
          const { jurusan, ...fallbackPayload } = payload;
          const retry = await supabase
            .from('kelas')
            .insert([fallbackPayload])
            .select();
          data = retry.data;
          error = retry.error;
        }

        if (error) console.warn('Supabase insert kelas error:', error.message);

        const newId = (data && data[0]?.id_kelas) || 'c_' + Date.now();
        const newClassObj = {
          id_kelas: newId,
          ...payload,
          guru: selGuru ? { nama: selGuru.nama } : null,
        };
        setClasses((prev) => sortClasses([...prev, newClassObj]));
        toast.success(`Kelas "${payload.nama_kelas}" berhasil ditambahkan!`, 'Kelas Tersimpan');
      }

      setModalType(null);
      setFormData({});
      fetchClasses();
    } catch (err) {
      toast.error(`Gagal: ${err.message}`);
    }
  }

  async function handleDeleteKelas(id, nama) {
    const ok = await showConfirm({
      title: 'Hapus Kelas?',
      message: `Hapus kelas "${nama}"?\nSeluruh jadwal pelajaran pada kelas ini juga akan ikut terhapus.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Kelas',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('kelas').delete().eq('id_kelas', id);
      if (error) console.warn('Supabase delete kelas notice:', error.message);
      setClasses((prev) => prev.filter((c) => c.id_kelas !== id));
      setSchedules((prev) => prev.filter((j) => j.id_kelas !== id));
      toast.success(`Kelas "${nama}" berhasil dihapus.`);
    } catch (err) {
      setClasses((prev) => prev.filter((c) => c.id_kelas !== id));
      setSchedules((prev) => prev.filter((j) => j.id_kelas !== id));
      toast.success(`Kelas "${nama}" berhasil dihapus.`);
    }
  }

  async function handleSaveMapel(e) {
    e.preventDefault();
    const nama = (formData.nama_mapel || '').trim();
    if (!nama) {
      toast.warning('Nama mata pelajaran tidak boleh kosong!', 'Input Diperlukan');
      return;
    }

    // Cek duplikasi nama mata pelajaran (case-insensitive)
    const isDuplicate = subjects.some(
      (s) => s.nama_mapel?.toLowerCase() === nama.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Mata pelajaran "${nama}" sudah terdaftar dalam kurikulum.`, 'Duplikasi Mapel');
      return;
    }

    setSavingMapel(true);
    try {
      const { data, error } = await supabase
        .from('mata_pelajaran')
        .insert([{ nama_mapel: nama }])
        .select();

      if (error) {
        console.warn('Supabase insert notice (fallback lokal aktif):', error.message);
        const fallbackMapel = {
          id_mapel: 'm_' + Date.now(),
          nama_mapel: nama,
        };
        setSubjects((prev) => [...prev, fallbackMapel]);
        toast.success(`Mata pelajaran "${nama}" berhasil ditambahkan!`);
      } else {
        if (data && data.length > 0) {
          setSubjects((prev) => {
            const filtered = prev.filter((s) => s.id_mapel !== data[0].id_mapel);
            return [...filtered, data[0]];
          });
        } else {
          fetchSubjects();
        }
        toast.success(`Mata pelajaran "${nama}" berhasil ditambahkan!`);
      }
      setModalType(null);
      setFormData({});
    } catch (err) {
      console.error('Error handleSaveMapel:', err);
      const fallbackMapel = {
        id_mapel: 'm_' + Date.now(),
        nama_mapel: nama,
      };
      setSubjects((prev) => [...prev, fallbackMapel]);
      toast.success(`Mata pelajaran "${nama}" berhasil ditambahkan!`);
      setModalType(null);
      setFormData({});
    } finally {
      setSavingMapel(false);
    }
  }

  async function handleDeleteMapel(id_mapel, nama_mapel) {
    const isUsed = schedules.some(
      (j) => j.id_mapel === id_mapel || j.mata_pelajaran?.nama_mapel === nama_mapel
    );
    const confirmMsg = isUsed
      ? `Mata pelajaran "${nama_mapel}" saat ini masih digunakan dalam jadwal KBM aktif.\n\nTetap ingin menghapusnya dari bank mapel?`
      : `Hapus mata pelajaran "${nama_mapel}" dari daftar kurikulum?`;

    const ok = await showConfirm({
      title: 'Hapus Mata Pelajaran?',
      message: confirmMsg,
      type: isUsed ? 'warning' : 'danger',
      confirmText: 'Ya, Hapus Mapel',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('mata_pelajaran').delete().eq('id_mapel', id_mapel);
      if (error) {
        console.warn('Supabase delete mapel warning:', error.message);
      }
      setSubjects((prev) => prev.filter((s) => s.id_mapel !== id_mapel));
      toast.success(`Mata pelajaran "${nama_mapel}" berhasil dihapus.`);
    } catch (err) {
      setSubjects((prev) => prev.filter((s) => s.id_mapel !== id_mapel));
      toast.success(`Mata pelajaran "${nama_mapel}" berhasil dihapus.`);
    }
  }

  async function handleSaveJadwal(e) {
    e.preventDefault();
    const payload = {
      id_kelas: formData.id_kelas,
      id_mapel: formData.id_mapel,
      id_guru: formData.id_guru,
      hari: formData.hari || 'Senin',
      jam_mulai: formData.jam_mulai || '07:30',
      jam_selesai: formData.jam_selesai || '09:00',
      batas_terlambat: formData.batas_terlambat || '07:45',
    };

    if (!payload.id_kelas || !payload.id_mapel || !payload.id_guru) {
      toast.warning('Mohon pilih Kelas, Mata Pelajaran, dan Guru Pengajar!', 'Data Belum Lengkap');
      return;
    }

    if (payload.jam_selesai <= payload.jam_mulai) {
      toast.error('Jam selesai KBM harus lebih akhir dari jam mulai!', 'Jam Tidak Valid');
      return;
    }

    // Helper cek irisan waktu (format HH:MM)
    function isTimeOverlap(s1, e1, s2, e2) {
      return s1 < e2 && s2 < e1;
    }

    // 1. Cek bentrok guru (apakah guru yang sama mengajar di kelas lain pada jam & hari yang sama)
    const teacherConflict = schedules.find((j) => {
      if (formData.id_jadwal && j.id_jadwal === formData.id_jadwal) return false;
      const isSameTeacher = j.id_guru === payload.id_guru;
      const isSameDay = j.hari === payload.hari;
      const isOverlap = isTimeOverlap(payload.jam_mulai, payload.jam_selesai, j.jam_mulai, j.jam_selesai);
      return isSameTeacher && isSameDay && isOverlap;
    });

    if (teacherConflict) {
      const guruName = teachers.find((t) => t.nip === payload.id_guru)?.nama || 'Guru ini';
      const conflictClassName = teacherConflict.kelas?.nama_kelas || 'kelas lain';
      const proceed = await showConfirm({
        title: '⚠️ Peringatan Bentrok Guru!',
        message: `${guruName} sudah memiliki jadwal mengajar di ${conflictClassName} pada hari ${payload.hari} pukul ${teacherConflict.jam_mulai} - ${teacherConflict.jam_selesai}.\n\nTetap simpan jadwal ini?`,
        type: 'warning',
        confirmText: 'Tetap Simpan',
        cancelText: 'Batal',
      });
      if (!proceed) return;
    }

    // 2. Cek bentrok kelas (apakah kelas ini sudah ada mapel lain di jam yang sama)
    const classConflict = schedules.find((j) => {
      if (formData.id_jadwal && j.id_jadwal === formData.id_jadwal) return false;
      const isSameClass = j.id_kelas === payload.id_kelas;
      const isSameDay = j.hari === payload.hari;
      const isOverlap = isTimeOverlap(payload.jam_mulai, payload.jam_selesai, j.jam_mulai, j.jam_selesai);
      return isSameClass && isSameDay && isOverlap;
    });

    if (classConflict) {
      const className = classes.find((c) => c.id_kelas === payload.id_kelas)?.nama_kelas || 'Kelas ini';
      const conflictMapel = classConflict.mata_pelajaran?.nama_mapel || 'mapel lain';
      const proceed = await showConfirm({
        title: '⚠️ Peringatan Bentrok Kelas!',
        message: `Kelas ${className} sudah memiliki jadwal mapel "${conflictMapel}" pada hari ${payload.hari} pukul ${classConflict.jam_mulai} - ${classConflict.jam_selesai}.\n\nTetap simpan jadwal ini?`,
        type: 'warning',
        confirmText: 'Tetap Simpan',
        cancelText: 'Batal',
      });
      if (!proceed) return;
    }

    try {
      const isEdit = Boolean(formData.id_jadwal);
      const dbPayload = {
        id_kelas: payload.id_kelas,
        id_mapel: payload.id_mapel,
        id_guru: payload.id_guru,
        hari: payload.hari,
        jam_mulai: payload.jam_mulai,
        jam_selesai: payload.jam_selesai,
        batas_waktu_terlambat: payload.batas_terlambat,
      };
      if (isEdit) {
        const { error } = await supabase.from('jadwal').update(dbPayload).eq('id_jadwal', formData.id_jadwal);
        if (error) console.warn('Supabase update notice:', error.message);
      } else {
        const { error } = await supabase.from('jadwal').insert([dbPayload]);
        if (error) console.warn('Supabase insert notice:', error.message);
      }

      const selClass = classes.find((c) => c.id_kelas === payload.id_kelas);
      const selSubject = subjects.find((s) => s.id_mapel === payload.id_mapel);
      const selTeacher = teachers.find((t) => t.nip === payload.id_guru);
      const newOrUpdatedSched = {
        id_jadwal: formData.id_jadwal || 'j_' + Date.now(),
        ...payload,
        kelas: { nama_kelas: selClass?.nama_kelas || 'Kelas' },
        mata_pelajaran: { nama_mapel: selSubject?.nama_mapel || 'Mapel' },
        guru: { nama: selTeacher?.nama || 'Guru' },
      };

      setSchedules((prev) => {
        if (isEdit) {
          return prev.map((j) => (j.id_jadwal === formData.id_jadwal ? newOrUpdatedSched : j));
        } else {
          return [...prev, newOrUpdatedSched];
        }
      });

      toast.success(
        isEdit ? 'Jadwal pelajaran berhasil diperbarui!' : 'Jadwal pelajaran berhasil ditambahkan!',
        'Jadwal Tersimpan'
      );
      setModalType(null);
      setFormData({});
      fetchSchedules();
    } catch (err) {
      toast.error(`Gagal: ${err.message}`);
    }
  }

  async function handleDeleteJadwal(id) {
    const ok = await showConfirm({
      title: 'Hapus Jadwal KBM?',
      message: 'Apakah Anda yakin ingin menghapus sesi jadwal pelajaran ini?',
      type: 'danger',
      confirmText: 'Ya, Hapus Jadwal',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('jadwal').delete().eq('id_jadwal', id);
      if (error) throw error;
      setSchedules((prev) => prev.filter((j) => j.id_jadwal !== id));
      toast.success('Jadwal pelajaran berhasil dihapus.');
      fetchSchedules();
    } catch (err) {
      toast.error(`Gagal: ${err.message}`);
    }
  }

  // ==========================================
  // HANDLER PENUGASAN GURU INVAL / PENGGANTI
  // ==========================================
  function handleOpenInvalModal(jadwal) {
    setSelectedJadwalForInval(jadwal);
    const existing = getActiveInvalForSchedule(jadwal.id_jadwal);
    if (existing) {
      setInvalFormData({
        alasan: existing.alasan_utama || 'Sakit',
        id_guru_pengganti: existing.id_guru_pengganti || '',
        catatan: existing.catatan || '',
      });
    } else {
      const defaultSub = teachers.find((t) => t.nip !== jadwal.id_guru);
      setInvalFormData({
        alasan: 'Sakit',
        id_guru_pengganti: defaultSub ? defaultSub.nip : '',
        catatan: '',
      });
    }
    setModalType('assign_inval');
  }

  async function handleSaveInval(e) {
    e.preventDefault();
    if (!selectedJadwalForInval) return;
    if (!invalFormData.id_guru_pengganti) {
      toast.warning('Pilih guru pengganti terlebih dahulu!', 'Data Belum Lengkap');
      return;
    }

    const substituteTeacher = teachers.find((t) => t.nip === invalFormData.id_guru_pengganti);
    const mainTeacher = teachers.find((t) => t.nip === selectedJadwalForInval.id_guru) || { nama: selectedJadwalForInval.guru?.nama };

    const assignment = {
      id_jadwal: selectedJadwalForInval.id_jadwal,
      tanggal: getTodayDateString(),
      id_kelas: selectedJadwalForInval.id_kelas,
      nama_kelas: selectedJadwalForInval.kelas?.nama_kelas || '',
      nama_mapel: selectedJadwalForInval.mata_pelajaran?.nama_mapel || '',
      id_guru_utama: selectedJadwalForInval.id_guru,
      nama_guru_utama: mainTeacher?.nama || 'Guru Pengampu',
      alasan_utama: invalFormData.alasan,
      id_guru_pengganti: invalFormData.id_guru_pengganti,
      nama_guru_pengganti: substituteTeacher?.nama || 'Guru Pengganti',
      catatan: invalFormData.catatan,
      created_by: 'admin',
    };

    const updated = await saveInvalAssignment(assignment);
    setInvalAssignments(updated);
    setModalType(null);
    toast.success(
      `Guru ${substituteTeacher?.nama} berhasil ditugaskan menggantikan ${mainTeacher?.nama} di kelas ${assignment.nama_kelas}!`,
      'Penugasan Inval Berhasil'
    );
  }

  async function handleCancelInval(invalId) {
    const ok = await showConfirm({
      title: 'Batalkan Penugasan Inval?',
      message: 'Penugasan guru pengganti ini akan dicabut dan sesi KBM dikembalikan ke guru pengampu asli.',
      type: 'warning',
      confirmText: 'Ya, Batalkan Inval',
      cancelText: 'Tutup',
    });
    if (!ok) return;

    const updated = await removeInvalAssignment(invalId);
    setInvalAssignments(updated);
    toast.success('Penugasan guru pengganti berhasil dibatalkan.', 'Inval Dibatalkan');
  }

  // ==========================================
  // 4. IMPORT MASSAL EXCEL / CSV
  // ==========================================
  function downloadTemplateSiswa(isSample = false) {
    const dataToExport = isSample
      ? [
          { NIS: '202409010', Nama: 'Ahmad Santoso', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567801', Nama_Ortu: 'Bpk. Joko Santoso' },
          { NIS: '202409011', Nama: 'Siti Nurhaliza', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567802', Nama_Ortu: 'Ibu Maryam' },
          { NIS: '202409012', Nama: 'Dimas Anggara', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567803', Nama_Ortu: 'Bpk. Bambang' },
          { NIS: '202409013', Nama: 'Annisa Rahma', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567804', Nama_Ortu: 'Ibu Fitri' },
          { NIS: '202409014', Nama: 'Muhammad Rizky', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567805', Nama_Ortu: 'Bpk. Hendro' },
          { NIS: '202409015', Nama: 'Dewi Lestari', Kelas: 'XI-IPA-2', Status: 'aktif', No_WA_Ortu: '6281234567806', Nama_Ortu: 'Bpk. Suryadi' },
          { NIS: '202409016', Nama: 'Fajar Nugraha', Kelas: 'XI-IPA-2', Status: 'aktif', No_WA_Ortu: '6281234567807', Nama_Ortu: 'Bpk. Gunawan' },
          { NIS: '202409017', Nama: 'Nabila Syakieb', Kelas: 'XI-IPA-2', Status: 'aktif', No_WA_Ortu: '6281234567808', Nama_Ortu: 'Ibu Ratna' },
          { NIS: '202409018', Nama: 'Reza Rahadian', Kelas: 'XI-IPA-2', Status: 'aktif', No_WA_Ortu: '6281234567809', Nama_Ortu: 'Bpk. Darmawan' },
          { NIS: '202409019', Nama: 'Zahra Amelia', Kelas: 'XI-IPA-2', Status: 'aktif', No_WA_Ortu: '6281234567810', Nama_Ortu: 'Ibu Sri Astuti' },
          { NIS: '202409020', Nama: 'Bayu Pratama', Kelas: 'XII-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567811', Nama_Ortu: 'Bpk. Supardi' },
          { NIS: '202409021', Nama: 'Cantika Putri', Kelas: 'XII-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567812', Nama_Ortu: 'Ibu Wahyuni' },
          { NIS: '202409022', Nama: 'Daffa Wardhana', Kelas: 'XII-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567813', Nama_Ortu: 'Bpk. Teguh' },
          { NIS: '202409023', Nama: 'Fitriani Indah', Kelas: 'XII-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567814', Nama_Ortu: 'Ibu Sulastri' },
          { NIS: '202409024', Nama: 'Gilang Ramadhan', Kelas: 'XII-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567815', Nama_Ortu: 'Bpk. Rudi Hartono' }
        ]
      : [
          { NIS: '202409010', Nama: 'Ahmad Santoso', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567800', Nama_Ortu: 'Orang Tua Ahmad' },
          { NIS: '202409011', Nama: 'Dewi Lestari', Kelas: 'X-IPA-1', Status: 'aktif', No_WA_Ortu: '6281234567801', Nama_Ortu: 'Orang Tua Dewi' },
        ];

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 22 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa');
    XLSX.writeFile(wb, isSample ? 'Data_Siswa_Contoh_15_Siswa.xlsx' : 'Template_Import_Siswa_SIAK.xlsx');
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.warning('File Excel kosong atau format tidak sesuai.', 'Format Salah');
          return;
        }

        let insertedCount = 0;
        const newStudentsForState = [];
        const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');

        for (const row of data) {
          const nis = String(row.NIS || row.nis || '').trim();
          const nama = String(row.Nama || row.nama || '').trim();
          if (!nis || !nama) continue;

          // Cari id_kelas
          const namaKelas = String(row.Kelas || row.kelas || '').trim();
          const matchedKelas = classes.find((c) => c.nama_kelas.toLowerCase() === namaKelas.toLowerCase());

          // Data orang tua jika ada
          const rawWa = String(row.No_WA_Ortu || row.no_wa_ortu || row.WhatsApp || row.no_hp || '').trim();
          let cleanWa = rawWa.replace(/[^0-9]/g, '');
          if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
          const parentName = String(row.Nama_Ortu || row.nama_ortu || row.Orang_Tua || '').trim();

          let ortuId = null;
          if (cleanWa) {
            try {
              const { data: newOrtu } = await supabase
                .from('orang_tua')
                .insert([{
                  no_whatsapp: cleanWa,
                  nama_ayah: parentName || 'Orang Tua Murid',
                }])
                .select('id_ortu')
                .single();
              if (newOrtu) ortuId = newOrtu.id_ortu;
            } catch (oe) {}
          }

          const studentObj = {
            nis,
            nama,
            id_kelas: matchedKelas ? matchedKelas.id_kelas : null,
            status_siswa: String(row.Status || row.status || 'aktif').toLowerCase(),
            qr_token_pribadi: `TOKEN-${nis}-SECURE`,
          };
          if (ortuId) studentObj.id_ortu = ortuId;

          try {
            const { error } = await supabase.from('siswa').upsert([studentObj]);
            if (!error) insertedCount++;
          } catch (se) {}

          // Kumpulkan untuk local state & credential
          newStudentsForState.push({
            ...studentObj,
            kelas: matchedKelas || null,
            orang_tua: cleanWa ? { id_ortu: ortuId, no_whatsapp: cleanWa, nama_ayah: parentName } : null,
          });

          // Daftarkan akun login
          customCreds[nis] = {
            role: 'murid',
            nis,
            nama,
            id_kelas: matchedKelas ? matchedKelas.id_kelas : null,
            email: `${nis}@siswa.sekolah.id`,
            password: 'password123',
            status: 'aktif',
            details: {
              nis,
              nama,
              id_kelas: matchedKelas ? matchedKelas.id_kelas : null,
              status_siswa: 'aktif',
              qr_token_pribadi: studentObj.qr_token_pribadi,
              no_whatsapp_ortu: cleanWa,
              nama_orang_tua: parentName,
            },
          };
        }

        try {
          localStorage.setItem('siak_user_credentials', JSON.stringify(customCreds));
        } catch (ce) {}

        // Sinkronkan ke local state students agar langsung tampil di UI tabel
        setStudents((prev) => {
          const map = new Map();
          prev.forEach((s) => map.set(s.nis, s));
          newStudentsForState.forEach((s) => map.set(s.nis, { ...map.get(s.nis), ...s }));
          return Array.from(map.values());
        });

        toast.success(`Import Berhasil! Sebanyak ${newStudentsForState.length} data siswa berhasil diproses dan dapat login.`, 'Import Sukses');
        fetchStudents();
      } catch (err) {
        toast.error(`Gagal membaca file Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  }

  // ==========================================
  // 5. KENAIKAN KELAS & KELULUSAN (PROMOSI MASSAL DENGAN 3 OPSI DISTRIBUSI)
  // ==========================================
  function handleToggleRetained(nis, tingkat) {
    if (tingkat === 9) {
      setUngraduatedStudentNis((prev) =>
        prev.includes(nis) ? prev.filter((id) => id !== nis) : [...prev, nis]
      );
    } else {
      setRetainedStudentNis((prev) =>
        prev.includes(nis) ? prev.filter((id) => id !== nis) : [...prev, nis]
      );
    }
  }

  function handleResetPromotionWizard() {
    setPromotionStep(1);
    setRetainedStudentNis([]);
    setUngraduatedStudentNis([]);
    setDistributionMode('linear');
    setPromotionSearch('');
    setPromotionFilterTingkat('semua');
    setManualPlacements({});
  }

  async function executePromotion() {
    const modeDesc =
      distributionMode === 'linear'
        ? 'Paralel Linier (Kelas Padanan)'
        : distributionMode === 'shuffle'
        ? 'Acak Otomatis (Merata)'
        : distributionMode === 'manual'
        ? 'Pilih Kelas Langsung (Plotting Saat Ini)'
        : 'Kosongkan Kelas (Isi Nanti / Tunda)';

    const ok = await showConfirm({
      title: 'Konfirmasi Eksekusi Promosi Kelas?',
      message: `PERINGATAN AKADEMIK TAHUN AJARAN BARU:\n\nSistem akan memproses:\n• Kelulusan Siswa Kelas 9 (kecuali ${ungraduatedStudentNis.length} siswa mengulang)\n• Promosi Siswa Kelas 8 & 7 ke jenjang berikutnya (kecuali ${retainedStudentNis.length} siswa tinggal kelas)\n• Distribusi Kelas: Mode ${modeDesc}\n\nApakah Anda yakin ingin mengeksekusi sekarang? Tindakan ini akan memperbarui database siswa.`,
      type: 'warning',
      confirmText: 'Eksekusi Sekarang',
      cancelText: 'Periksa Kembali',
    });
    if (!ok) return;

    setProcessingPromotion(true);
    try {
      const kelas7 = classes.filter((c) => getTingkat(c) === 7);
      const kelas8 = classes.filter((c) => getTingkat(c) === 8);
      const kelas9 = classes.filter((c) => getTingkat(c) === 9);

      const activeStudents = students.filter((s) => s.status_siswa === 'aktif');

      // 1. SISWA KELAS 9 -> ALUMNI (Kecuali yang ditandai tidak lulus)
      const students9ToGraduate = activeStudents.filter((s) => {
        const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
        return t === 9 && !ungraduatedStudentNis.includes(s.nis);
      });

      let countLulus = 0;
      if (students9ToGraduate.length > 0) {
        const nisList = students9ToGraduate.map((s) => s.nis);
        const { error: err9 } = await supabase
          .from('siswa')
          .update({ status_siswa: 'alumni' })
          .in('nis', nisList);
        if (err9) throw err9;
        countLulus = nisList.length;
      }

      // 2. SISWA KELAS 8 -> NAIK KE TINGKAT 9
      const students8ToPromote = activeStudents.filter((s) => {
        const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
        return t === 8 && !retainedStudentNis.includes(s.nis);
      });

      let countNaik9 = 0;
      if (students8ToPromote.length > 0) {
        if (distributionMode === 'unassigned') {
          // Opsi 4: Kosongkan kelas untuk isi nanti
          const nisList = students8ToPromote.map((s) => s.nis);
          const { error } = await supabase.from('siswa').update({ id_kelas: null }).in('nis', nisList);
          if (error) throw error;
          countNaik9 = nisList.length;
        } else if (distributionMode === 'manual') {
          // Opsi 3: Tentukan langsung sekarang (per siswa), atau isi nanti bagi yang belum dipilih
          const mapClassToNis = {};
          const unassignedNis = [];
          for (const st of students8ToPromote) {
            const targetId = manualPlacements[st.nis];
            if (targetId) {
              if (!mapClassToNis[targetId]) mapClassToNis[targetId] = [];
              mapClassToNis[targetId].push(st.nis);
            } else {
              unassignedNis.push(st.nis);
            }
          }
          for (const [clsId, nisList] of Object.entries(mapClassToNis)) {
            const { error } = await supabase.from('siswa').update({ id_kelas: clsId }).in('nis', nisList);
            if (error) throw error;
          }
          if (unassignedNis.length > 0) {
            const { error } = await supabase.from('siswa').update({ id_kelas: null }).in('nis', unassignedNis);
            if (error) throw error;
          }
          countNaik9 = students8ToPromote.length;
        } else if (distributionMode === 'shuffle') {
          // Opsi 2: Acak round-robin merata ke seluruh kelas 9
          if (kelas9.length === 0) {
            throw new Error('Tidak ditemukan Kelas 9 aktif sebagai kelas tujuan promosi.');
          }
          const shuffled = [...students8ToPromote].sort(() => Math.random() - 0.5);
          const targetMap = {};
          shuffled.forEach((st, idx) => {
            const targetCls = kelas9[idx % kelas9.length];
            if (!targetMap[targetCls.id_kelas]) targetMap[targetCls.id_kelas] = [];
            targetMap[targetCls.id_kelas].push(st.nis);
          });
          for (const [id_kelas, nisBatch] of Object.entries(targetMap)) {
            const { error } = await supabase.from('siswa').update({ id_kelas }).in('nis', nisBatch);
            if (error) throw error;
          }
          countNaik9 = students8ToPromote.length;
        } else {
          // Opsi 1: Linier (Paralel kelas sama)
          if (kelas9.length === 0) throw new Error('Tidak ditemukan Kelas 9.');
          for (const c8 of kelas8) {
            const targetClass = kelas9.find(
              (c9) => c9.nama_kelas.replace(/^[^\s-]+[-_ ]?/, '').trim().toLowerCase() ===
                      c8.nama_kelas.replace(/^[^\s-]+[-_ ]?/, '').trim().toLowerCase()
            ) || kelas9[0];

            const c8Students = students8ToPromote.filter((s) => s.id_kelas === c8.id_kelas);
            if (c8Students.length > 0 && targetClass) {
              const nisBatch = c8Students.map((s) => s.nis);
              const { error } = await supabase.from('siswa').update({ id_kelas: targetClass.id_kelas }).in('nis', nisBatch);
              if (error) throw error;
              countNaik9 += nisBatch.length;
            }
          }
        }
      }

      // 3. SISWA KELAS 7 -> NAIK KE TINGKAT 8
      const students7ToPromote = activeStudents.filter((s) => {
        const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
        return t === 7 && !retainedStudentNis.includes(s.nis);
      });

      let countNaik8 = 0;
      if (students7ToPromote.length > 0) {
        if (distributionMode === 'unassigned') {
          // Opsi 4: Kosongkan kelas untuk isi nanti
          const nisList = students7ToPromote.map((s) => s.nis);
          const { error } = await supabase.from('siswa').update({ id_kelas: null }).in('nis', nisList);
          if (error) throw error;
          countNaik8 = nisList.length;
        } else if (distributionMode === 'manual') {
          // Opsi 3: Tentukan langsung sekarang (per siswa), atau isi nanti bagi yang belum dipilih
          const mapClassToNis = {};
          const unassignedNis = [];
          for (const st of students7ToPromote) {
            const targetId = manualPlacements[st.nis];
            if (targetId) {
              if (!mapClassToNis[targetId]) mapClassToNis[targetId] = [];
              mapClassToNis[targetId].push(st.nis);
            } else {
              unassignedNis.push(st.nis);
            }
          }
          for (const [clsId, nisList] of Object.entries(mapClassToNis)) {
            const { error } = await supabase.from('siswa').update({ id_kelas: clsId }).in('nis', nisList);
            if (error) throw error;
          }
          if (unassignedNis.length > 0) {
            const { error } = await supabase.from('siswa').update({ id_kelas: null }).in('nis', unassignedNis);
            if (error) throw error;
          }
          countNaik8 = students7ToPromote.length;
        } else if (distributionMode === 'shuffle') {
          // Opsi 2: Acak round-robin merata ke seluruh kelas 8
          if (kelas8.length === 0) {
            throw new Error('Tidak ditemukan Kelas 8 aktif sebagai kelas tujuan promosi.');
          }
          const shuffled = [...students7ToPromote].sort(() => Math.random() - 0.5);
          const targetMap = {};
          shuffled.forEach((st, idx) => {
            const targetCls = kelas8[idx % kelas8.length];
            if (!targetMap[targetCls.id_kelas]) targetMap[targetCls.id_kelas] = [];
            targetMap[targetCls.id_kelas].push(st.nis);
          });
          for (const [id_kelas, nisBatch] of Object.entries(targetMap)) {
            const { error } = await supabase.from('siswa').update({ id_kelas }).in('nis', nisBatch);
            if (error) throw error;
          }
          countNaik8 = students7ToPromote.length;
        } else {
          // Opsi 1: Linier (Paralel kelas sama)
          if (kelas8.length === 0) throw new Error('Tidak ditemukan Kelas 8.');
          for (const c7 of kelas7) {
            const targetClass = kelas8.find(
              (c8) => c8.nama_kelas.replace(/^[^\s-]+[-_ ]?/, '').trim().toLowerCase() ===
                      c7.nama_kelas.replace(/^[^\s-]+[-_ ]?/, '').trim().toLowerCase()
            ) || kelas8[0];

            const c7Students = students7ToPromote.filter((s) => s.id_kelas === c7.id_kelas);
            if (c7Students.length > 0 && targetClass) {
              const nisBatch = c7Students.map((s) => s.nis);
              const { error } = await supabase.from('siswa').update({ id_kelas: targetClass.id_kelas }).in('nis', nisBatch);
              if (error) throw error;
              countNaik8 += nisBatch.length;
            }
          }
        }
      }

      const modeNames = {
        linear: 'Paralel Linier (Kelas Padanan)',
        shuffle: 'Acak Otomatis (Pemerataan Kelas)',
        manual: 'Plotting Interaktif (Pilih Kelas Sekarang)',
        unassigned: 'Kosongkan Kelas (Isi Nanti / Tunda)',
      };

      toast.success(
        `Kenaikan Kelas Berhasil Diproses!\n• Metode: ${modeNames[distributionMode]}\n• Siswa Lulus (Alumni): ${countLulus}\n• Siswa Naik ke Kelas IX: ${countNaik9}\n• Siswa Naik ke Kelas VIII: ${countNaik8}\n• Siswa Tinggal Kelas / Mengulang: ${retainedStudentNis.length + ungraduatedStudentNis.length}`,
        'Promosi Massal Sukses'
      );

      handleResetPromotionWizard();
      await fetchStudents();
    } catch (err) {
      toast.error(`Gagal memproses promosi: ${err.message}`, 'Terjadi Kesalahan');
    } finally {
      setProcessingPromotion(false);
    }
  }

  // Helper untuk menempatkan siswa antrean (unassigned) ke kelas pilihan secara massal
  async function handleAssignUnassignedStudents(targetClassId) {
    if (!targetClassId) {
      toast.warning('Pilih kelas tujuan terlebih dahulu!');
      return;
    }
    const targetNisList = selectedUnassignedNis.length > 0
      ? selectedUnassignedNis
      : students.filter((s) => !s.id_kelas && s.status_siswa === 'aktif').map((s) => s.nis);

    if (targetNisList.length === 0) {
      toast.info('Tidak ada siswa antrean yang perlu ditempatkan.');
      return;
    }

    try {
      const { error } = await supabase
        .from('siswa')
        .update({ id_kelas: targetClassId })
        .in('nis', targetNisList);
      if (error) throw error;

      toast.success(`Berhasil menempatkan ${targetNisList.length} siswa ke kelas tujuan!`, 'Penempatan Berhasil');
      setSelectedUnassignedNis([]);
      setTargetClassForUnassigned('');
      await fetchStudents();
    } catch (err) {
      toast.error(`Gagal menempatkan siswa: ${err.message}`);
    }
  }

  // Helper khusus Plotting / Penempatan Kelas Siswa (Terpisah dari Edit Siswa)
  function handleOpenPlottingModal(student) {
    setSelectedStudentForPlotting(student);
    setPlottingTargetKelas(student.id_kelas || '');
    setIsPlottingModalOpen(true);
  }

  async function handleSavePlotting(e) {
    if (e) e.preventDefault();
    if (!selectedStudentForPlotting) return;

    setSavingPlotting(true);
    try {
      const newClassId = plottingTargetKelas ? plottingTargetKelas : null;
      const { error } = await supabase
        .from('siswa')
        .update({ id_kelas: newClassId })
        .eq('nis', selectedStudentForPlotting.nis);
      if (error) throw error;

      const targetClassName = classes.find((c) => c.id_kelas === newClassId)?.nama_kelas || 'Antrean (Belum Ada Kelas)';
      toast.success(
        `Kelas untuk ${selectedStudentForPlotting.nama} berhasil diatur ke: ${targetClassName}!`,
        'Penempatan Kelas Tersimpan'
              );
      setIsPlottingModalOpen(false);
      setSelectedStudentForPlotting(null);
      await fetchStudents();
    } catch (err) {
      toast.error(`Gagal menyimpan kelas: ${err.message}`);
    } finally {
      setSavingPlotting(false);
    }
  }

  // ==========================================
  // 6. EXPORT LAPORAN REKAP ABSENSI KE EXCEL (.XLSX)
  // ==========================================
  async function handleExportExcel() {
    try {
      // Tarik rekap data absensi
      const { data: attList } = await supabase
        .from('absensi')
        .select('tanggal, waktu, status, metode, nis, siswa(nama, kelas(nama_kelas)), jadwal(mata_pelajaran(nama_mapel))')
        .order('tanggal', { ascending: false })
        .limit(500);

      const rows = (attList && attList.length > 0 ? attList : []).map((item, idx) => ({
        No: idx + 1,
        Tanggal: item.tanggal,
        Waktu: item.waktu,
        NIS: item.nis,
        Nama_Siswa: item.siswa?.nama || '-',
        Kelas: item.siswa?.kelas?.nama_kelas || '-',
        Mata_Pelajaran: item.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Umum',
        Status: item.status === 'H' ? 'Hadir' : item.status === 'S' ? 'Sakit' : item.status === 'I' ? 'Izin' : 'Alpa',
        Keterangan: item.keterangan || '-',
        Metode: item.metode,
      }));

      if (rows.length === 0) {
        toast.info('Belum ada data riwayat presensi untuk diekspor.', 'Data Kosong');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Presensi_Siswa');
      XLSX.writeFile(wb, `Rekap_Absensi_SIAK_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('File Excel rekap absensi berhasil diunduh.');
    } catch (err) {
      toast.error(`Gagal ekspor: ${err.message}`);
    }
  }

  // ==========================================
  // 7. CETAK ID CARD QR FISIK
  // ==========================================
  async function generateIdCard(st) {
    setSelectedStudentForCard(st);
    try {
      const url = await QRCode.toDataURL(st.qr_token_pribadi || st.nis, {
        width: 190,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setIdCardQrUrl(url);
    } catch (err) {}
  }

  function downloadExcelKelas(kelasObj, studentsOfClass) {
    const rows = studentsOfClass.map((st, idx) => ({
      No: idx + 1,
      NIS: st.nis,
      Nama_Siswa: st.nama,
      Kelas: kelasObj?.nama_kelas || '-',
      Tingkat: kelasObj?.tingkat ? `Tingkat ${kelasObj.tingkat}` : '-',
      Status: st.status_siswa,
      Streak_Kehadiran: `${st.streak_sekarang || 0} Hari`,
      No_WA_Ortu: st.orang_tua?.no_whatsapp || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Siswa_${kelasObj?.nama_kelas || 'Kelas'}`);
    XLSX.writeFile(wb, `Data_Siswa_${kelasObj?.nama_kelas || 'Kelas'}.xlsx`);
  }

  // Dapatkan daftar tingkat unik secara dinamis dari kelas, terurut konsisten (7 -> 8 -> 9)
  const tingkatList = Array.from(
    new Set(classes.map((c) => getTingkat(c)).filter(Boolean))
  ).sort((a, b) => a - b);

  // Filter Siswa Terpisah per Tingkat & Kelas
  const filteredStudents = students.filter((st) => {
    const matchSearch =
      st.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.nis.includes(searchTerm);
    const matchTingkat =
      selectedTingkat === 'semua' ||
      (st.kelas && getTingkat(st.kelas) === Number(selectedTingkat));
    const matchKelas =
      selectedKelasId === 'semua'
        ? !filterKelas || (st.kelas && st.kelas.nama_kelas === filterKelas)
        : selectedKelasId === 'unassigned'
          ? (!st.id_kelas || st.id_kelas === null) && st.status_siswa === 'aktif'
          : st.id_kelas === selectedKelasId ||
            (st.kelas && (st.kelas.id_kelas === selectedKelasId || st.kelas.nama_kelas === selectedKelasId));
    const matchStatus =
      filterStatus === 'semua' || st.status_siswa === filterStatus;
    return matchSearch && matchTingkat && matchKelas && matchStatus;
  });

  // Kelas yang aktif sesuai Tingkat yang dipilih (selalu terurut konsisten)
  const displayedClasses = sortClasses(
    (selectedTingkat === 'semua'
      ? classes
      : classes.filter((c) => getTingkat(c) === Number(selectedTingkat))
    ).filter((c) => {
      if (selectedKelasId === 'semua') return true;
      if (selectedKelasId === 'unassigned') return false;
      return c.id_kelas === selectedKelasId || c.nama_kelas === selectedKelasId;
    })
  );

  // Kalender Helpers
  const adminCalYear = currentCalMonth.getFullYear();
  const adminCalMonth = currentCalMonth.getMonth();
  const adminMonthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const adminFirstDayIndex = new Date(adminCalYear, adminCalMonth, 1).getDay();
  const adminTotalDays = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();

  function adminFormatDateKey(d) {
    const mm = String(adminCalMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${adminCalYear}-${mm}-${dd}`;
  }

  const filteredHolidays = holidays.filter((h) => {
    const matchType =
      filterHolidayType === 'semua' || h.status_hari === filterHolidayType;
    const matchSearch =
      (h.keterangan || '').toLowerCase().includes(searchHoliday.toLowerCase()) ||
      (h.tanggal || '').includes(searchHoliday);
    return matchType && matchSearch;
  });

  const navGroups = [
    {
      group: 'DATA MASTER',
      items: [
        { id: 'siswa', label: 'Data Siswa', icon: Users, color: 'text-amber-400', count: students.length },
        { id: 'guru', label: 'Data Guru', icon: GraduationCap, color: 'text-cyan-400', count: teachers.length },
        { id: 'kelas', label: 'Kelas', icon: Layers, color: 'text-purple-400', count: classes.length },
        { id: 'akun_ortu', label: 'Akun Orang Tua', icon: ShieldCheck, color: 'text-pink-400', badge: 'Opsional' },
      ],
    },
    {
      group: 'PEMBELAJARAN & KBM',
      items: [
        { id: 'data_absensi', label: 'Kelola Data Absensi', icon: CheckSquare, color: 'text-sky-400', badge: 'Operasional' },
        { id: 'jadwal', label: 'Jadwal & Mata Pelajaran', icon: BookOpen, color: 'text-emerald-400', count: schedules.length },
        { id: 'kalender', label: 'Kalender Akademik & Libur', icon: Calendar, color: 'text-pink-400', badge: 'Baru' },
      ],
    },
    {
      group: 'ADMINISTRASI & SISTEM',
      items: [
        { id: 'laporan', label: 'Rekap & Laporan Presensi', icon: Download, color: 'text-sky-400' },
        { id: 'log_aktivitas', label: 'Log Aktivitas & Audit', icon: Activity, color: 'text-amber-400', badge: 'Audit Trail' },
        { id: 'gamifikasi', label: 'Hall of Fame & Badges', icon: Trophy, color: 'text-amber-400', badge: 'Prestasi' },
        { id: 'import', label: 'Import Massal Siswa', icon: FileSpreadsheet, color: 'text-emerald-400' },
        { id: 'promosi', label: 'Kenaikan Kelas Massal', icon: TrendingUp, color: 'text-amber-400' },
        { id: 'settings', label: 'Pengaturan Sekolah & GPS', icon: Sliders, color: 'text-rose-400' },
        { id: 'database_crud', label: 'Database CRUD Studio', icon: Database, color: 'text-violet-400', badge: 'All DB' },
        { id: 'profil_admin', label: 'Profil & Akun Admin', icon: UserCheck, color: 'text-indigo-400' },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const currentNavItem = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

  // Konfirmasi sebelum logout
  async function handleConfirmLogout() {
    const ok = await showConfirm({
      title: 'Konfirmasi Keluar Sistem',
      message: 'Apakah Anda yakin ingin keluar dari sesi Administrator SIAK? Anda perlu login kembali untuk mengakses panel kontrol.',
      type: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Tetap di Sini',
    });
    if (ok) {
      logout();
    }
  }

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
      {/* SIDEBAR NAVIGATION (DESKTOP PERSISTENT + MOBILE DRAWER)  */}
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
                src="https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2"
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">
                {settings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN'}
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Admin Panel • SIAK Presensi
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
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.count !== undefined ? (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      ) : item.badge ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-pink-500/30 text-pink-300 border border-pink-400/30">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar: User Profile Card & Logout */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profil_admin');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer group"
              title="Buka Pengaturan Profil & Akun Administrator"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={adminProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Admin"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate group-hover:text-blue-300">
                  {adminProfile.nama || 'Administrator'}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Super Admin Online
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleConfirmLogout}
              className="p-2 rounded-xl text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-colors cursor-pointer"
              title="Keluar dari Panel Admin"
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
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 text-white cursor-pointer shrink-0"
              title="Buka Menu Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black leading-tight truncate">SMPN 2 KOTA BANGUN</h2>
              <button
                type="button"
                onClick={handleOpenAcademicPeriodModal}
                className="text-[10px] text-cyan-200 hover:text-white font-bold flex items-center gap-1 underline underline-offset-2 cursor-pointer mt-0.5 max-w-full"
                title="Ubah Tahun Ajaran / Semester"
              >
                <span className="truncate">T.A. {settings.tahun_ajaran_aktif || '2026/2027'} ({settings.semester_aktif || 'Ganjil'})</span>
                <ChevronRight className="w-2.5 h-2.5 shrink-0" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('profil_admin')}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer border ${
                activeTab === 'profil_admin'
                  ? 'bg-white text-blue-900 border-white shadow-xs'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
              title="Profil & Akun Admin"
            >
              <div className="w-5 h-5 rounded-lg overflow-hidden shrink-0">
                <img
                  src={adminProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
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
              {React.createElement(currentNavItem?.icon || LayoutGrid, { className: 'w-4 h-4' })}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 leading-tight">
                {currentNavItem?.label}
              </h2>
              <p className="text-[11px] text-slate-500">
                SIAK Presensi • Sistem Informasi & Presensi Digital Sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Switcher Badge Tahun Ajaran & Semester */}
            <button
              type="button"
              onClick={handleOpenAcademicPeriodModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs flex items-center gap-2.5 transition-colors cursor-pointer group"
              title="Klik untuk menetapkan Tahun Ajaran, Semester & Rentang Tanggal"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                🎓
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                    T.A. {settings.tahun_ajaran_aktif || '2026/2027'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <span>Semester {settings.semester_aktif || 'Ganjil'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all" />
                </div>
              </div>
            </button>

            {/* Quick Profile Button */}
            <button
              type="button"
              onClick={() => setActiveTab('profil_admin')}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'profil_admin'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Buka Pengaturan Profil & Akun Admin"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-300 shrink-0">
                <img
                  src={adminProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Admin Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left hidden xl:block leading-tight">
                <span className="text-xs font-bold block truncate max-w-[120px]">
                  {adminProfile.nama?.split(' ')[0] || 'Admin'}
                </span>
                <span className={`text-[10px] block font-medium ${activeTab === 'profil_admin' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Super Admin
                </span>
              </div>
            </button>

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
        <main className="p-4 sm:p-6 lg:p-8 w-full flex-1 pb-20">
        {/* ========================================================= */}
        {/* TAB 1: MASTER DATA SISWA (TERPISAH PER TINGKAT & KELAS)   */}
        {/* ========================================================= */}
        {activeTab === 'siswa' && (
          <div className="space-y-4">
            {/* Header Manajemen Siswa */}
            <div className="glass-card rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> Data Siswa Terpisah per Tingkat & Kelas
                </h2>
                <p className="text-xs text-slate-500">
                  Data murid dipisahkan otomatis per jenjang tingkat dan kelas untuk mempermudah pemantauan, presensi, dan pengelolaan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Switcher Mode Tampilan */}
                <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setViewModeSiswa('per_kelas')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewModeSiswa === 'per_kelas' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-800'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" /> Terpisah Per Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeSiswa('flat')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewModeSiswa === 'flat' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-800'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" /> Semua Tabel
                  </button>
                </div>

                <button
                  onClick={() => {
                    setFormData({
                      nis: '',
                      nama: '',
                      id_kelas: '',
                      status_siswa: 'aktif',
                      no_whatsapp_ortu: '',
                      nama_orang_tua: '',
                      account_password: 'password123',
                      account_status: 'aktif',
                    });
                    setModalType('add_siswa');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Siswa
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Import Excel
                </button>
              </div>
            </div>

            {/* LEVEL 1: FILTER PILIH TINGKAT (GRADE LEVEL) */}
            <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" /> 1. Pilih Tingkat Jenjang:
                </span>
                <span className="text-[11px] text-slate-400">
                  Total Terfilter: <strong className="text-blue-600">{filteredStudents.length}</strong> Siswa
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedTingkat('semua'); setSelectedKelasId('semua'); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTingkat === 'semua'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Tingkat ({students.length})
                </button>

                {tingkatList.map((t) => {
                  const countInTingkat = students.filter((s) => s.kelas && getTingkat(s.kelas) === t).length;
                  const labelTingkat =
                    t === 7 ? 'Kelas VII (Tujuh)' :
                    t === 8 ? 'Kelas VIII (Delapan)' :
                    t === 9 ? 'Kelas IX (Sembilan)' :
                    `Tingkat ${t}`;

                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setSelectedTingkat(t); setSelectedKelasId('semua'); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedTingkat === t
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                      }`}
                    >
                      <span>{labelTingkat}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedTingkat === t ? 'bg-purple-800 text-purple-100' : 'bg-purple-200 text-purple-800'
                      }`}>
                        {countInTingkat}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* LEVEL 2: FILTER PILIH KELAS */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-blue-600" /> 2. Pilih Rombongan Belajar (Kelas):
                </span>
                
                {/* Search & Status Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari NIS / Nama Siswa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="alumni">Alumni / Lulus</option>
                    <option value="pindah">Pindah</option>
                  </select>
                </div>
              </div>

              {/* Pills Kelas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedKelasId('semua')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedKelasId === 'semua'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Kelas ({displayedClasses.length} Kelas)
                </button>

                {displayedClasses.map((c) => {
                  const studentCount = students.filter(
                    (s) => s.id_kelas === c.id_kelas || (s.kelas && s.kelas.nama_kelas === c.nama_kelas)
                  ).length;

                  return (
                    <button
                      key={c.id_kelas}
                      type="button"
                      onClick={() => setSelectedKelasId(c.id_kelas)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedKelasId === c.id_kelas
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50/80 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                      }`}
                    >
                      <span>{c.nama_kelas}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedKelasId === c.id_kelas ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'
                      }`}>
                        {studentCount}
                      </span>
                    </button>
                  );
                })}

                {/* Antrean Kelas Pill */}
                {(() => {
                  const unassignedCount = students.filter(
                    (s) => (!s.id_kelas || s.id_kelas === null) && s.status_siswa === 'aktif'
                  ).length;
                  if (unassignedCount === 0) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedKelasId('unassigned')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedKelasId === 'unassigned'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
                      }`}
                    >
                      <span>⚠️ Antrean Plotting</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-800">
                        {unassignedCount}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* ========================================================= */}
            {/* TAMPILAN 1: TERKELOMPOK PER KELAS (GROUPED CARD SECTIONS) */}
            {/* ========================================================= */}
            {viewModeSiswa === 'per_kelas' ? (
              <div className="space-y-6">
                {/* KARTU ANTREAN SISWA (BELUM DITEMPATKAN KE KELAS) */}
                {(() => {
                  const unassignedStudents = filteredStudents.filter(
                    (s) => (!s.id_kelas || s.id_kelas === null) && s.status_siswa === 'aktif'
                  );
                  if (unassignedStudents.length === 0) return null;
                  if (selectedKelasId !== 'semua' && selectedKelasId !== 'unassigned') return null;

                  return (
                    <div className="glass-card rounded-3xl p-5 shadow-sm border border-amber-300 bg-amber-50/30 space-y-4">
                      {/* Header Antrean */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/80 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-800">Antrean Siswa (Belum Ada Kelas)</h3>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                {unassignedStudents.length} Siswa Perlu Diplot
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Siswa aktif hasil promosi mandiri atau siswa baru yang belum dimasukkan ke kelas.
                            </p>
                          </div>
                        </div>

                        {/* Batch Plotting Toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={targetClassForUnassigned}
                            onChange={(e) => setTargetClassForUnassigned(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="">-- Pilih Kelas Tujuan --</option>
                            {classes.map((c) => (
                              <option key={c.id_kelas} value={c.id_kelas}>
                                {c.nama_kelas} (Tingkat {c.tingkat})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleAssignUnassignedStudents(targetClassForUnassigned)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Tempatkan Siswa ke Kelas</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabel Siswa Antrean */}
                      <div className="overflow-x-auto pb-1">
                        <table className="w-full min-w-[550px] text-left text-xs">
                          <thead className="bg-amber-100/60 text-amber-900 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Siswa</th>
                              <th className="p-2.5">NIS</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-200/50">
                            {unassignedStudents.map((st) => (
                              <tr key={st.nis} className="hover:bg-amber-50/60 transition-colors">
                                <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                                  <img
                                    src={st.foto_wajah || 'https://placehold.co/80x80/1e3a8a/ffffff?text=Siswa'}
                                    alt="Foto"
                                    className="w-7 h-7 rounded-xl object-cover ring-1 ring-slate-200"
                                  />
                                  <span>{st.nama}</span>
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">{st.nis}</td>
                                <td className="p-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    ⚠️ Belum Ada Kelas
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPlottingModal(st)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-all"
                                  >
                                    <FolderInput size={13} />
                                    Tentukan Kelas
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {displayedClasses.map((cls) => {
                  const classStudents = filteredStudents.filter(
                    (s) => s.id_kelas === cls.id_kelas || (s.kelas && s.kelas.nama_kelas === cls.nama_kelas)
                  );

                  return (
                    <div
                      key={cls.id_kelas}
                      className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4"
                    >
                      {/* Class Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-800">{cls.nama_kelas}</h3>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                                Tingkat {cls.tingkat}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Wali Kelas: <strong className="text-slate-700">{cls.guru?.nama || cls.wali_kelas || 'Belum Ditentukan'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Class Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                            {classStudents.length} Siswa Terdaftar
                          </span>

                          <button
                            type="button"
                            onClick={() => downloadExcelKelas(cls, classStudents)}
                            disabled={classStudents.length === 0}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                            title="Unduh format Excel khusus kelas ini"
                          >
                            <Download className="w-3.5 h-3.5" /> Export Excel
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                nis: '',
                                nama: '',
                                id_kelas: cls.id_kelas,
                                status_siswa: 'aktif',
                                no_whatsapp_ortu: '',
                                nama_orang_tua: '',
                                account_password: 'password123',
                                account_status: 'aktif',
                              });
                              setModalType('add_siswa');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Siswa ke Kelas Ini
                          </button>
                        </div>
                      </div>

                      {/* Class Table */}
                      {classStudents.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">Belum ada siswa di kelas {cls.nama_kelas}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Klik tombol <strong>+ Tambah Siswa ke Kelas Ini</strong> untuk memasukkan siswa pertama.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto pb-1">
                          <table className="w-full min-w-[700px] text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                              <tr>
                                <th className="p-3">Siswa</th>
                                <th className="p-3">NIS</th>
                                <th className="p-3">Kontak Ortu (WhatsApp)</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Aksi & Anti-Joki</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classStudents.map((st) => (
                                <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 font-bold text-slate-800 flex items-center gap-2.5">
                                    <img
                                      src={st.foto_wajah || 'https://placehold.co/80x80/1e3a8a/ffffff?text=Siswa'}
                                      alt="Wajah"
                                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200"
                                    />
                                    <span>{st.nama}</span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 font-semibold">{st.nis}</td>
                                  <td className="p-3 font-mono text-slate-600">{st.orang_tua?.no_whatsapp || '-'}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      st.status_siswa === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {st.status_siswa}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="inline-flex items-center gap-1.5 relative">
                                      <button
                                        onClick={() => generateIdCard(st)}
                                        title="Cetak ID Card QR Fisik"
                                        className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleStartEditSiswa(st)}
                                        title="Edit Siswa"
                                        className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Menu Opsi Tambahan (Dropdown) */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setOpenActionMenuNis(openActionMenuNis === st.nis ? null : st.nis)}
                                          title="Opsi Akun, Anti-Joki & Lainnya"
                                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                            openActionMenuNis === st.nis
                                              ? 'bg-slate-800 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </button>

                                        {openActionMenuNis === st.nis && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-20 cursor-default"
                                              onClick={() => setOpenActionMenuNis(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenActionMenuNis(null);
                                                  handleOpenManageAccount(st, 'murid');
                                                }}
                                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors"
                                              >
                                                <Key className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Akses Login & Password</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenActionMenuNis(null);
                                                  handleUnbindDevice(st);
                                                }}
                                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 cursor-pointer transition-colors"
                                              >
                                                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                                                <span>Reset HP (Anti-Joki)</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenActionMenuNis(null);
                                                  handleOpenPlottingModal(st);
                                                }}
                                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer transition-colors"
                                              >
                                                <FolderInput className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Plotting / Pindah Kelas</span>
                                              </button>

                                              <div className="border-t border-slate-100 my-1" />

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenActionMenuNis(null);
                                                  handleDeleteSiswa(st.nis, st.nama);
                                                }}
                                                className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                              >
                                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                                <span>Hapus Data Siswa</span>
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================= */
              /* TAMPILAN 2: TABEL UTUH SEMUA SISWA                        */
              /* ========================================================= */
              <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto pb-1">
                  <table className="w-full min-w-[750px] text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                      <tr>
                        <th className="p-3">Siswa</th>
                        <th className="p-3">NIS</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3">Tingkat</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi & Anti-Joki</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((st) => (
                        <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-800 flex items-center gap-2.5">
                            <img
                              src={st.foto_wajah || 'https://placehold.co/80x80/1e3a8a/ffffff?text=Siswa'}
                              alt="Wajah"
                              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200"
                            />
                            <div>
                              <span>{st.nama}</span>
                              <span className="block text-[10px] text-slate-400 font-normal">WA Ortu: {st.orang_tua?.no_whatsapp || '-'}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-600 font-semibold">{st.nis}</td>
                          <td className="p-3 font-semibold text-blue-700">{st.kelas?.nama_kelas || '-'}</td>
                          <td className="p-3 text-purple-700 font-bold">{st.kelas?.tingkat ? `Tingkat ${st.kelas.tingkat}` : '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              st.status_siswa === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {st.status_siswa}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1.5 relative">
                              <button
                                onClick={() => generateIdCard(st)}
                                title="Cetak ID Card QR Fisik"
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartEditSiswa(st)}
                                title="Edit Siswa"
                                className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Menu Opsi Tambahan (Dropdown) */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenActionMenuNis(openActionMenuNis === `flat-${st.nis}` ? null : `flat-${st.nis}`)}
                                  title="Opsi Akun, Anti-Joki & Lainnya"
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    openActionMenuNis === `flat-${st.nis}`
                                      ? 'bg-slate-800 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {openActionMenuNis === `flat-${st.nis}` && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20 cursor-default"
                                      onClick={() => setOpenActionMenuNis(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuNis(null);
                                          handleOpenManageAccount(st, 'murid');
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Akses Login & Password</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuNis(null);
                                          handleUnbindDevice(st);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Reset HP (Anti-Joki)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuNis(null);
                                          handleOpenPlottingModal(st);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <FolderInput className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Plotting / Pindah Kelas</span>
                                      </button>

                                      <div className="border-t border-slate-100 my-1" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuNis(null);
                                          handleDeleteSiswa(st.nis, st.nama);
                                        }}
                                        className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Hapus Data Siswa</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MASTER DATA GURU (CRUD)                            */}
        {/* ========================================================= */}
        {activeTab === 'guru' && (() => {
          const countWaliKelas = classes.filter((c) => c.wali_kelas).length;
          const countPengajar = teachers.filter((t) => {
            const hasSchedule = schedules.some((j) => j.id_guru === t.nip || j.guru?.nama === t.nama);
            const hasExplicitMapel = (t.mapel_list && t.mapel_list.length > 0) || Boolean(t.mapel_utama);
            return hasSchedule || hasExplicitMapel;
          }).length;
          const countBk = teachers.filter((t) => t.is_bk).length;
          const countTanpaJadwal = teachers.filter((t) => {
            const hasSchedule = schedules.some((j) => j.id_guru === t.nip || j.guru?.nama === t.nama);
            const hasExplicitMapel = (t.mapel_list && t.mapel_list.length > 0) || Boolean(t.mapel_utama);
            return !hasSchedule && !hasExplicitMapel;
          }).length;

          const filteredTeachers = teachers.filter((t) => {
            if (searchTeacher) {
              const q = searchTeacher.toLowerCase();
              const matchName = t.nama?.toLowerCase().includes(q);
              const matchNip = t.nip?.toLowerCase().includes(q);
              if (!matchName && !matchNip) return false;
            }
            if (filterTeacherRole === 'wali_kelas') {
              if (!classes.some((c) => c.wali_kelas === t.nip)) return false;
            } else if (filterTeacherRole === 'pengajar') {
              const isTeaching = (t.mapel_list && t.mapel_list.length > 0) || Boolean(t.mapel_utama) || schedules.some((j) => j.id_guru === t.nip || j.guru?.nama === t.nama);
              if (!isTeaching) return false;
            } else if (filterTeacherRole === 'bk') {
              if (!t.is_bk) return false;
            }

            if (filterTeacherSubject !== 'semua') {
              const teachingSchedules = schedules.filter(
                (j) => j.id_guru === t.nip || j.guru?.nama === t.nama
              );
              const teacherMapelList = [
                ...(t.mapel_list || []),
                ...(t.mapel_utama ? t.mapel_utama.split(',').map((s) => s.trim()).filter(Boolean) : []),
                ...teachingSchedules.map((j) => j.mata_pelajaran?.nama_mapel).filter(Boolean),
              ];
              if (filterTeacherSubject === 'tanpa_jadwal') {
                if (teacherMapelList.length > 0) return false;
              } else {
                const matchMapel =
                  teacherMapelList.includes(filterTeacherSubject) ||
                  teachingSchedules.some(
                    (j) =>
                      j.mata_pelajaran?.nama_mapel === filterTeacherSubject ||
                      j.id_mapel === filterTeacherSubject
                  );
                if (!matchMapel) return false;
              }
            }

            return true;
          });

          return (
            <div className="space-y-6">
              {/* HEADER UTAMA TAB GURU */}
              <div className="glass-card rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" /> Data Pendidik & Tenaga Kependidikan ({teachers.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola data NIP guru, mata pelajaran yang diampu, penetapan wali kelas, serta jadwal KBM.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportGuruExcel}
                    className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Export seluruh data guru ke spreadsheet Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        nip: '',
                        nama: '',
                        is_bk: false,
                        id_kelas_wali: '',
                        foto_profil: '',
                        mapel_list: [],
                      });
                      setModalType('add_guru');
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Guru</span>
                  </button>
                </div>
              </div>

              {/* 4 STAT CARDS RINGKASAN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Total Guru</span>
                    <span className="text-xl font-black text-slate-800">{teachers.length}</span>
                    <span className="text-[10px] text-slate-400 block">Orang pendidik</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Wali Kelas</span>
                    <span className="text-xl font-black text-emerald-700">{countWaliKelas}</span>
                    <span className="text-[10px] text-slate-400 block">dari {classes.length} kelas</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Pengajar Mapel</span>
                    <span className="text-xl font-black text-indigo-700">{countPengajar}</span>
                    <span className="text-[10px] text-slate-400 block">Aktif mengampu KBM</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Guru BK</span>
                    <span className="text-xl font-black text-purple-700">{countBk}</span>
                    <span className="text-[10px] text-slate-400 block">Konseling & streak</span>
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTER BAR */}
              <div className="glass-card rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterTeacherRole('semua')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterTeacherRole === 'semua'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua Guru ({teachers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTeacherRole('pengajar')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterTeacherRole === 'pengajar'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Pengajar Mapel ({countPengajar})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTeacherRole('wali_kelas')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterTeacherRole === 'wali_kelas'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Wali Kelas ({countWaliKelas})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTeacherRole('bk')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterTeacherRole === 'bk'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Guru BK ({countBk})
                    </button>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* Dropdown Filter Mata Pelajaran */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 h-9 rounded-xl shrink-0 w-full sm:w-auto">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Filter Mapel:</span>
                      <select
                        value={filterTeacherSubject}
                        onChange={(e) => setFilterTeacherSubject(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[200px] truncate"
                      >
                        <option value="semua">Semua Mata Pelajaran</option>
                        <option value="tanpa_jadwal">⚠️ Belum Ada Jadwal KBM ({countTanpaJadwal})</option>
                        <optgroup label="Berdasarkan Mata Pelajaran">
                          {subjects.map((m) => {
                            const count = teachers.filter((t) =>
                              schedules.some(
                                (j) =>
                                  (j.id_guru === t.nip || j.guru?.nama === t.nama) &&
                                  (j.id_mapel === m.id_mapel || j.mata_pelajaran?.nama_mapel === m.nama_mapel)
                              )
                            ).length;
                            return (
                              <option key={m.id_mapel} value={m.nama_mapel}>
                                {m.nama_mapel} ({count} guru)
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTeacher}
                        onChange={(e) => setSearchTeacher(e.target.value)}
                        placeholder="Cari guru / NIP..."
                        className="w-full h-9 pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                      {searchTeacher && (
                        <button
                          type="button"
                          onClick={() => setSearchTeacher('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Active Pill Indicator */}
                {filterTeacherSubject !== 'semua' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">Menampilkan guru pengampu:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      {filterTeacherSubject === 'tanpa_jadwal' ? 'Belum Ada Jadwal KBM' : filterTeacherSubject}
                      <button
                        type="button"
                        onClick={() => setFilterTeacherSubject('semua')}
                        className="hover:text-rose-600 ml-1 text-slate-400 cursor-pointer"
                        title="Hapus filter mapel"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* TABEL DATA GURU */}
              <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 overflow-hidden">
                {filteredTeachers.length === 0 ? (
                  <div className="p-12 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data guru yang cocok.</p>
                    <p className="text-[11px] text-slate-400">
                      {searchTeacher || filterTeacherSubject !== 'semua' || filterTeacherRole !== 'semua' ? (
                        <>
                          Kombinasi pencarian atau filter mata pelajaran tidak menemukan data guru.
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTeacher('');
                              setFilterTeacherRole('semua');
                              setFilterTeacherSubject('semua');
                            }}
                            className="ml-1 text-blue-600 font-bold underline cursor-pointer"
                          >
                            Reset Semua Filter
                          </button>
                        </>
                      ) : (
                        'Belum ada data guru terdaftar dalam sistem.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto pb-1">
                    <table className="w-full min-w-[750px] text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="p-3">Guru & Gelar</th>
                          <th className="p-3">NIP / NUPTK</th>
                          <th className="p-3">Peran & Penugasan</th>
                          <th className="p-3">Beban KBM</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTeachers.map((t) => {
                          const assignedClass = classes.find((c) => c.wali_kelas === t.nip);
                          const teachingList = schedules.filter(
                            (j) => j.id_guru === t.nip || j.guru?.nama === t.nama
                          );
                          const explicitMapel = [
                            ...(t.mapel_list || []),
                            ...(t.mapel_utama ? t.mapel_utama.split(',').map((s) => s.trim()).filter(Boolean) : [])
                          ];
                          const taughtSubjects = Array.from(
                            new Set([...explicitMapel, ...teachingList.map((j) => j.mata_pelajaran?.nama_mapel).filter(Boolean)])
                          );

                          return (
                            <tr key={t.nip} className="hover:bg-slate-50/80 transition-colors">
                              {/* Kolom Guru & Mapel */}
                              <td className="p-3">
                                <div className="flex items-start gap-3">
                                  <img
                                    src={
                                      t.foto_profil ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(t.nama)}`
                                    }
                                    alt={t.nama}
                                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 bg-slate-100 shrink-0 mt-0.5"
                                  />
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-800 block text-xs leading-tight">{t.nama}</span>
                                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Pendidik Tetap</span>
                                    {/* Subject Tags */}
                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                      {taughtSubjects.length > 0 ? (
                                        taughtSubjects.map((sName) => (
                                          <button
                                            key={sName}
                                            type="button"
                                            onClick={() => setFilterTeacherSubject(sName)}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                              filterTeacherSubject === sName
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80'
                                            }`}
                                            title={`Klik untuk filter guru yang mengajar ${sName}`}
                                          >
                                            <BookOpen className="w-2.5 h-2.5 opacity-70" />
                                            <span>{sName}</span>
                                          </button>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                                          Belum ada jadwal mapel
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Kolom NIP dengan Tombol Salin */}
                              <td className="p-3">
                                <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <span className="font-mono text-slate-700 font-semibold text-[11px]">{t.nip}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyNip(t.nip)}
                                    title="Salin NIP"
                                    className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded cursor-pointer"
                                  >
                                    {copiedNip === t.nip ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Kolom Peran & Penugasan */}
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Badge Wali Kelas */}
                                  {assignedClass ? (
                                    <span
                                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      title={`Wali Kelas untuk ${assignedClass.nama_kelas}`}
                                    >
                                      Wali Kelas: {assignedClass.nama_kelas}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-50 border border-slate-200/60">
                                      Bukan Wali Kelas
                                    </span>
                                  )}

                                  {/* Quick Toggle Guru BK */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBk(t)}
                                    title="Klik untuk ubah status Guru BK"
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                      t.is_bk
                                        ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                  >
                                    {t.is_bk ? '🌟 BK (Aktif)' : 'BK: Off'}
                                  </button>
                                </div>
                              </td>

                              {/* Kolom Beban KBM */}
                              <td className="p-3">
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTeacherForSchedule(t)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                                    title="Lihat rincian jadwal KBM guru ini"
                                  >
                                    <Calendar className="w-3 h-3 text-blue-600" />
                                    <span>{teachingList.length} Sesi KBM</span>
                                  </button>
                                  {teachingList.length > 0 && (
                                    <span className="block text-[10px] text-slate-400 font-medium pl-1">
                                      di {new Set(teachingList.map((j) => j.kelas?.nama_kelas || j.id_kelas)).size} Kelas
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Kolom Aksi */}
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTeacherForSchedule(t)}
                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                    title="Lihat Jadwal Mengajar Guru"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTeacherForSchedule(null);
                                      setSelectedTeacherForSchedulePrint(t);
                                      setSchedulePrintMode('single');
                                      setSchedulePrintModalOpen(true);
                                    }}
                                    className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                    title="Buka Lembar Jadwal Guru Resmi (PDF & Excel)"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenManageAccount(t, 'guru')}
                                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                    title="Kelola Akun & Login Guru (Password, Status, Salin WA)"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const curWali = classes.find((c) => c.wali_kelas === t.nip);
                                      const creds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
                                      const existing = creds[t.nip] || {};
                                      setFormData({
                                        ...t,
                                        id_kelas_wali: curWali ? curWali.id_kelas : '',
                                        mapel_list: taughtSubjects,
                                        account_email: existing.email || `${t.nip}@guru.sekolah.id`,
                                        account_password: existing.password || 'password123',
                                        account_status: existing.status || 'aktif',
                                      });
                                      setModalType('edit_guru');
                                    }}
                                    className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Data Guru & Penugasan"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteGuru(t.nip, t.nama)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Data Guru"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* TAB 3: KELAS & TINGKAT (WALI KELAS & MAPEL)       */}
        {/* ========================================================= */}
        {activeTab === 'kelas' && (
          <div className="space-y-4">
            {/* HEADER UTAMA KELAS */}
            <div className="glass-card rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" /> Data Rombongan Belajar / Kelas ({classes.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola data kelas, jenjang tingkat kelas VII–IX, penetapan wali kelas, serta wizard kenaikan kelas massal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('promosi')}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Buka Wizard Kenaikan Kelas & Distribusi Kelas"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kenaikan Kelas</span>
                </button>

                <button
                  onClick={() => {
                    setFormData({
                      tingkat: 7,
                      jurusan: 'IPA',
                      paralel: '1',
                      nama_kelas: 'VII-IPA-1',
                      wali_kelas: '',
                    });
                    setParalelFormat('angka');
                    setCustomParalelInput('');
                    setModalType('add_kelas');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {classes.map((c) => {
                    const curTingkat = c.tingkat || 7;
                    const curJurusan = c.jurusan || (c.nama_kelas?.toUpperCase().includes('IPS') ? 'IPS' : 'IPA');
                    const parts = (c.nama_kelas || '').split('-');
                    const curParalel = parts.length > 2 ? parts[2] : (parts.length === 2 ? parts[1] : '1');

                    const handleOpenEdit = () => {
                      const isLetter = /^[A-Za-z]$/.test(curParalel);
                      setParalelFormat(isLetter ? 'huruf' : 'angka');
                      setCustomParalelInput('');
                      if (!isLetter && Number(curParalel) > 5) {
                        const max = Number(curParalel);
                        const newNums = Array.from({ length: max }, (_, i) => (i + 1).toString());
                        setParalelNumbers(newNums);
                      } else if (isLetter && curParalel.toUpperCase().charCodeAt(0) > 69) {
                        const count = curParalel.toUpperCase().charCodeAt(0) - 64;
                        const newLetters = Array.from({ length: Math.min(26, count) }, (_, i) => String.fromCharCode(65 + i));
                        setParalelLetters(newLetters);
                      }
                      setFormData({
                        id_kelas: c.id_kelas,
                        nama_kelas: c.nama_kelas,
                        tingkat: curTingkat,
                        jurusan: curJurusan,
                        paralel: curParalel,
                        wali_kelas: c.wali_kelas || '',
                      });
                      setModalType('add_kelas');
                    };
                    
                    return (
                    <div key={c.id_kelas} className="glass-card rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {curTingkat === 7 ? 'Kelas VII (Tujuh)' : curTingkat === 8 ? 'Kelas VIII (Delapan)' : curTingkat === 9 ? 'Kelas IX (Sembilan)' : `Tingkat ${curTingkat}`}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              curJurusan === 'IPS'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {curJurusan}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleOpenEdit}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded-lg cursor-pointer transition-colors"
                              title="Edit Kelas & Wali Kelas"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKelas(c.id_kelas, c.nama_kelas)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer transition-colors"
                              title="Hapus Kelas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-800">{c.nama_kelas}</h3>
                        <div className="flex items-center justify-between text-xs mt-1.5 gap-2">
                          <p className="text-slate-500 truncate">
                            Wali Kelas:{' '}
                            <strong className={c.wali_kelas ? 'text-slate-700' : 'text-amber-600'}>
                              {c.guru?.nama || c.wali_kelas || 'Belum Ditentukan'}
                            </strong>
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenEdit}
                            className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${
                              c.wali_kelas
                                ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200'
                                : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                            }`}
                            title="Tentukan / ubah guru wali kelas"
                          >
                            {c.wali_kelas ? 'Ubah Wali' : '+ Pilih Wali'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKelasForJadwal(c.id_kelas);
                            setJadwalSubTab('kelas');
                            setActiveTab('jadwal');
                          }}
                          className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Atur Jadwal KBM Kelas</span>
                        </button>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>ID: {c.id_kelas.slice(0, 8)}...</span>
                          <span className="text-slate-500 font-medium">Data Kelas Aktif</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* ========================================================= */}
        {/* TAB 4: JADWAL & MAPEL (CRUD)                              */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* TAB 4: JADWAL & KURIKULUM KBM (TERPADU & MULTI-VIEW)      */}
        {/* ========================================================= */}
        {activeTab === 'jadwal' && (() => {
          const currentClassId = selectedKelasForJadwal || (classes.length > 0 ? classes[0].id_kelas : '');
          const currentClass = classes.find((c) => String(c.id_kelas) === String(currentClassId)) || (classes.length > 0 ? classes[0] : null);
          const currentTeacher =
            teachers.find((t) => String(t.nip || t.id_guru || '').trim() === String(selectedGuruForJadwal || '').trim()) ||
            teachers.find((t) => (t.nama || '').toLowerCase().trim() === String(selectedGuruForJadwal || '').toLowerCase().trim()) ||
            (teachers.length > 0 ? teachers[0] : null);
          const currentTeacherNip = currentTeacher ? (currentTeacher.nip || currentTeacher.id_guru || '') : '';

          const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

          return (
            <div className="space-y-6">
              {/* HEADER UTAMA PUSAT JADWAL & KBM */}
              <div className="glass-card rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" /> Pusat Jadwal Pelajaran & Kurikulum KBM
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola jadwal mingguan per kelas, pantau beban mengajar guru, dan kelola mata pelajaran dengan deteksi bentrok otomatis.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleSchedule}
                    className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Muat 30 sesi jadwal KBM kurikulum lengkap (Senin-Jumat) untuk semua kelas"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-600" /> Muat Template Jadwal Lengkap
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormData({}); setModalType('add_jadwal'); }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Jadwal KBM
                  </button>
                </div>
              </div>

              {/* NAVIGASI SUB-TAB SUDUT PANDANG */}
              <div className="glass-card rounded-2xl p-2 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setJadwalSubTab('kelas')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      jadwalSubTab === 'kelas'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>1. Matriks Jadwal per Kelas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJadwalSubTab('guru')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      jadwalSubTab === 'guru'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>2. Jadwal per Guru Pengampu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJadwalSubTab('distribusi')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      jadwalSubTab === 'distribusi'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>3. Distribusi Harian KBM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJadwalSubTab('mapel')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      jadwalSubTab === 'mapel'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>4. Bank Mata Pelajaran ({subjects.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJadwalSubTab('semua')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      jadwalSubTab === 'semua'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>5. Semua Jadwal ({schedules.length})</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-medium px-2">
                  Total Jadwal Aktif: <strong className="text-blue-600">{schedules.length} Sesi KBM</strong>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SUB-TAB 1: MATRIKS JADWAL PER KELAS                       */}
              {/* ========================================================= */}
              {jadwalSubTab === 'kelas' && (
                <div className="space-y-4">
                  {/* Selector Kelas */}
                  <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-blue-600" /> Pilih Rombongan Belajar / Kelas:
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Klik kelas untuk melihat dan menyusun jadwal mingguan kelas tersebut.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassForSchedulePrint(null);
                          setClassSchedulePrintMode('all_classes');
                          setClassSchedulePrintModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                        title="Buka dialog cetak jadwal untuk seluruh kelas"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cetak Seluruh Kelas</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {classes.map((c) => {
                        const countInClass = schedules.filter((j) => j.id_kelas === c.id_kelas).length;
                        const isSelected = (currentClassId === c.id_kelas);
                        return (
                          <button
                            key={c.id_kelas}
                            type="button"
                            onClick={() => setSelectedKelasForJadwal(c.id_kelas)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm scale-102'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                          >
                            <span>{c.nama_kelas}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {countInClass} sesi
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner Info Kelas Terpilih */}
                  {currentClass && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            Tingkat {currentClass.tingkat}
                          </span>
                          <h3 className="text-base font-black text-slate-800">
                            Jadwal KBM Kelas: {currentClass.nama_kelas}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Wali Kelas: <strong className="text-slate-700">{currentClass.guru?.nama || currentClass.wali_kelas || 'Belum Ditentukan'}</strong>
                          {' • '}Total: <strong>{schedules.filter((j) => j.id_kelas === currentClass.id_kelas).length} Sesi Pelajaran</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassForSchedulePrint(currentClass);
                            setClassSchedulePrintMode('single_class');
                            setClassSchedulePrintModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          title={`Cetak Lembar Resmi Jadwal Pelajaran Kelas ${currentClass.nama_kelas} (PDF, Tab Baru, HTML, & Excel)`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Jadwal Kelas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ id_kelas: currentClass.id_kelas, hari: 'Senin' });
                            setModalType('add_jadwal');
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Jadwal di {currentClass.nama_kelas}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kisi-kisi Matriks Jadwal 6 Hari (Senin - Sabtu) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daysList.map((dayName) => {
                      const daySchedules = schedules
                        .filter((j) => j.id_kelas === currentClassId && j.hari === dayName)
                        .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

                      return (
                        <div key={dayName} className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>{dayName}</span>
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {daySchedules.length} Mapel
                              </span>
                            </div>

                            {daySchedules.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                <p className="text-[11px]">Tidak ada KBM pada hari {dayName}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {daySchedules.map((j) => {
                                  const activeInval = invalAssignments.find(
                                    (inv) => inv.id_jadwal === j.id_jadwal && inv.status === 'aktif' && inv.tanggal === getTodayDateString()
                                  );

                                  return (
                                    <div
                                      key={j.id_jadwal}
                                      className={`p-2.5 rounded-xl border transition-all shadow-2xs space-y-1.5 group ${
                                        activeInval
                                          ? 'bg-amber-50/70 border-amber-300'
                                          : 'bg-slate-50 hover:bg-white border-slate-200/80 hover:border-blue-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                                          {j.jam_mulai} - {j.jam_selesai}
                                        </span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenInvalModal(j)}
                                            className={`p-1 rounded cursor-pointer transition-colors ${
                                              activeInval ? 'text-amber-700 bg-amber-100' : 'text-slate-400 hover:text-amber-600'
                                            }`}
                                            title={activeInval ? `Inval: ${activeInval.nama_guru_pengganti}` : 'Tugaskan Guru Inval / Pengganti'}
                                          >
                                            <UserPlus className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormData(j);
                                              setModalType('add_jadwal');
                                            }}
                                            className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                            title="Edit Jadwal"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteJadwal(j.id_jadwal)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                            title="Hapus Jadwal"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <h5 className="font-bold text-xs text-slate-800 leading-tight">
                                        {j.mata_pelajaran?.nama_mapel}
                                      </h5>

                                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                        <span className="truncate pr-1">👨‍🏫 {j.guru?.nama}</span>
                                        <span className="font-mono text-rose-600 text-[10px] shrink-0" title="Batas toleransi hadir">
                                          Max: {j.batas_terlambat}
                                        </span>
                                      </div>

                                      {activeInval && (
                                        <div className="mt-1.5 p-1.5 rounded-lg bg-amber-100/80 border border-amber-300 flex items-center justify-between text-[10px]">
                                          <div className="flex items-center gap-1 text-amber-900 font-medium truncate">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                            <span className="truncate">
                                              <strong>Inval:</strong> {activeInval.nama_guru_pengganti} ({activeInval.alasan_utama})
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleCancelInval(activeInval.id)}
                                            className="text-amber-800 hover:text-rose-600 font-bold ml-1 shrink-0 px-1 rounded cursor-pointer"
                                            title="Batalkan penugasan guru pengganti ini"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ id_kelas: currentClassId, hari: dayName });
                              setModalType('add_jadwal');
                            }}
                            className="w-full py-1.5 text-center text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-dashed border-blue-200"
                          >
                            + Tambah Mapel Hari {dayName}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SUB-TAB 2: JADWAL PER GURU PENGAMPU (BEBAN MENGAJAR)      */}
              {/* ========================================================= */}
              {jadwalSubTab === 'guru' && (
                <div className="space-y-4">
                  {/* Selector Guru */}
                  <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-blue-600" /> Pilih Guru Pengampu:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Pantau seluruh jadwal mengajar guru dalam sepekan & periksa bentrok waktu.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherForSchedulePrint(null);
                            setSchedulePrintMode('all_individual');
                            setSchedulePrintModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                          title="Cetak lembar jadwal untuk seluruh guru sekaligus (1 lembar per guru dengan auto page-break)"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Cetak Massal Seluruh Guru</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherForSchedulePrint(null);
                            setSchedulePrintMode('master_matrix');
                            setSchedulePrintModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-200 transition-all cursor-pointer shadow-2xs"
                          title="Cetak Master Matriks Rekapitulasi Jadwal Seluruh Guru (A4 Landscape & Excel)"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Master Matriks</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {teachers.map((t) => {
                        const countTeaching = schedules.filter(
                          (j) => j.id_guru === t.nip || j.guru?.nama === t.nama
                        ).length;
                        const isSelected = (currentTeacherNip === t.nip);
                        return (
                          <button
                            key={t.nip}
                            type="button"
                            onClick={() => setSelectedGuruForJadwal(t.nip)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm scale-102'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                          >
                            <span>{t.nama}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {countTeaching} sesi
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner Guru Terpilih */}
                  {currentTeacher && (() => {
                    const assignedWali = classes.find((c) => c.wali_kelas === currentTeacher.nip);
                    const teacherSchedules = schedules.filter(
                      (j) => j.id_guru === currentTeacher.nip || j.guru?.nama === currentTeacher.nama
                    );

                    return (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              currentTeacher.foto_profil ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentTeacher.nama)}`
                            }
                            alt={currentTeacher.nama}
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-purple-200 bg-white shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-base font-black text-slate-800">{currentTeacher.nama}</h3>
                              <span className="font-mono text-xs text-slate-500">({currentTeacher.nip})</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              {assignedWali && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  Wali Kelas {assignedWali.nama_kelas}
                                </span>
                              )}
                              {currentTeacher.is_bk && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                                  Guru BK
                                </span>
                              )}
                              <span className="font-semibold text-slate-600">
                                Total Beban: {teacherSchedules.length} Sesi KBM Terjadwal
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacherForSchedulePrint(currentTeacher);
                              setSchedulePrintMode('single');
                              setSchedulePrintModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Cetak Lembar Jadwal Resmi Guru Ini (PDF & Excel)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Jadwal Guru</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ id_guru: currentTeacher.nip });
                              setModalType('add_jadwal');
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Jadwal
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Rincian Hari untuk Guru Terpilih */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daysList.map((dayName) => {
                      const daySchedules = schedules
                        .filter(
                          (j) =>
                            (j.id_guru === currentTeacherNip || j.guru?.nama === currentTeacher?.nama) &&
                            j.hari === dayName
                        )
                        .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

                      return (
                        <div key={dayName} className="glass-card rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                              <span>{dayName}</span>
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {daySchedules.length} Kelas
                            </span>
                          </div>

                          {daySchedules.length === 0 ? (
                            <p className="py-4 text-center text-slate-400 text-[11px]">
                              Tidak ada jadwal mengajar pada hari {dayName}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {daySchedules.map((j) => (
                                <div
                                  key={j.id_jadwal}
                                  className="p-2.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1 group"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[10px] border border-purple-200/60">
                                      {j.jam_mulai} - {j.jam_selesai}
                                    </span>
                                    <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                      {j.kelas?.nama_kelas}
                                    </span>
                                  </div>

                                  <h5 className="font-bold text-xs text-slate-800">
                                    {j.mata_pelajaran?.nama_mapel}
                                  </h5>

                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px] text-slate-400">
                                    <span>Batas Masuk: <strong className="text-rose-600 font-mono">{j.batas_terlambat}</strong></span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormData(j);
                                          setModalType('add_jadwal');
                                        }}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Edit
                                      </button>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteJadwal(j.id_jadwal)}
                                        className="text-rose-600 hover:underline"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </div>
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
              {/* SUB-TAB 3: DISTRIBUSI HARIAN KBM (MAPEL & GURU PENGAJAR)   */}
              {/* ========================================================= */}
              {jadwalSubTab === 'distribusi' && (
                <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>Daftar Mata Pelajaran & Guru Pengajar</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold">
                            Hari {kbmDaySchedule}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Distribusi mata pelajaran yang diajarkan guru pengampu di setiap kelas pada hari {kbmDaySchedule}.
                        </p>
                      </div>
                    </div>

                    {/* Filter Hari, Filter Kelas & Aksi */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Selector Hari KBM */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setKbmDaySchedule(h)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              kbmDaySchedule === h
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>

                      {/* Filter Kelas */}
                      <select
                        value={kbmClassFilter}
                        onChange={(e) => setKbmClassFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="all">Semua Kelas ({classes.length})</option>
                        {classes.map((cls) => (
                          <option key={cls.id_kelas} value={cls.id_kelas}>
                            Kelas {cls.nama_kelas}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData({});
                          setModalType('add_jadwal');
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Sesi KBM</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid Sesi KBM per Kelas pada Hari Terpilih */}
                  {(() => {
                    const daySchedules = schedules.filter(
                      (s) => (s.hari || '').toLowerCase() === kbmDaySchedule.toLowerCase()
                    );
                    const displayClasses = kbmClassFilter === 'all'
                      ? classes
                      : classes.filter((c) => c.id_kelas === kbmClassFilter);

                    if (daySchedules.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                          Tidak ada sesi mata pelajaran terjadwal pada hari {kbmDaySchedule}.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {displayClasses.map((cls) => {
                          const classScheds = daySchedules
                            .filter((s) => s.id_kelas === cls.id_kelas)
                            .sort((a, b) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

                          return (
                            <div
                              key={cls.id_kelas}
                              className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 space-y-2.5 flex flex-col justify-between hover:bg-indigo-50/50 transition-colors"
                            >
                              <div>
                                <div className="flex items-center justify-between border-b border-indigo-100/70 pb-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                    <h4 className="text-xs font-black text-slate-800">
                                      Kelas {cls.nama_kelas}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                                    {classScheds.length} Sesi KBM
                                  </span>
                                </div>

                                {classScheds.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic py-2">
                                    Tidak ada jadwal mata pelajaran di hari {kbmDaySchedule}.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {classScheds.map((sch) => {
                                      const teacherObj = sch.guru || teachers.find((t) => t.nip === sch.id_guru);
                                      const subjectName = sch.mata_pelajaran?.nama_mapel || sch.nama_mapel || 'Mata Pelajaran';

                                      return (
                                        <div
                                          key={sch.id_jadwal}
                                          className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition-all space-y-1"
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold text-slate-800 truncate" title={subjectName}>
                                              📚 {subjectName}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                              {sch.jam_mulai?.slice(0, 5)} - {sch.jam_selesai?.slice(0, 5)}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="text-indigo-700 font-medium truncate">
                                              👨‍🏫 {teacherObj?.nama || 'Guru Pengampu'}
                                            </span>
                                            {sch.batas_waktu_terlambat && (
                                              <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                Toleransi {sch.batas_waktu_terlambat.slice(0, 5)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKelasForJadwal(cls.id_kelas);
                                  setJadwalSubTab('kelas');
                                }}
                                className="w-full mt-2 py-1.5 px-2 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-200 hover:border-indigo-600 shadow-2xs"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Atur Jadwal Kelas Ini</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================= */}
              {/* SUB-TAB 4: BANK MATA PELAJARAN                            */}
              {/* ========================================================= */}
              {jadwalSubTab === 'mapel' && (
                <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Bank Mata Pelajaran Resmi ({subjects.length})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Mata pelajaran yang aktif diajarkan oleh guru dan dijadwalkan di setiap kelas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchSubject}
                          onChange={(e) => setSearchSubject(e.target.value)}
                          placeholder="Cari mapel..."
                          className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFormData({}); setModalType('add_mapel'); }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Mapel
                      </button>
                    </div>
                  </div>

                  {subjects.filter((s) => !searchSubject || s.nama_mapel?.toLowerCase().includes(searchSubject.toLowerCase())).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      Tidak ada mata pelajaran yang cocok dengan pencarian "{searchSubject}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
                      {subjects
                        .filter((s) => !searchSubject || s.nama_mapel?.toLowerCase().includes(searchSubject.toLowerCase()))
                        .map((m) => {
                          const mapelSchedules = schedules.filter(
                            (j) => j.id_mapel === m.id_mapel || j.mata_pelajaran?.nama_mapel === m.nama_mapel
                          );
                          const countJadwal = mapelSchedules.length;
                          const assignedTeachers = Array.from(
                            new Set([
                              ...teachers
                                .filter((t) => {
                                  const explicitList = [
                                    ...(t.mapel_list || []),
                                    ...(t.mapel_utama ? t.mapel_utama.split(',').map((s) => s.trim()).filter(Boolean) : [])
                                  ];
                                  return explicitList.includes(m.nama_mapel);
                                })
                                .map((t) => t.nama),
                              ...mapelSchedules
                                .map((j) => j.guru?.nama || teachers.find((t) => t.nip === j.id_guru)?.nama)
                                .filter(Boolean)
                            ])
                          );

                          return (
                            <div
                              key={m.id_mapel}
                              className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs space-y-3 flex flex-col justify-between group"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-800 leading-snug" title={m.nama_mapel}>
                                      {m.nama_mapel}
                                    </h4>
                                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-1 border border-blue-200/60">
                                      {countJadwal > 0 ? `${countJadwal} Sesi Terjadwal` : 'Belum Ada Jadwal'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMapel(m.id_mapel, m.nama_mapel)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                                    title={`Hapus ${m.nama_mapel}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Guru Pengampu Mapel */}
                                <div className="pt-2 border-t border-slate-100 space-y-1">
                                  <span className="text-[10px] text-slate-400 block font-medium">Guru Pengampu:</span>
                                  {assignedTeachers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {assignedTeachers.map((tName) => (
                                        <button
                                          key={tName}
                                          type="button"
                                          onClick={() => {
                                            setActiveTab('guru');
                                            setSearchTeacher(tName);
                                          }}
                                          className="text-[10px] font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer truncate max-w-full text-left"
                                          title={`Buka data guru ${tName}`}
                                        >
                                          👨‍🏫 {tName}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block">
                                      Belum ada guru pengampu
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tombol Cepat Jadwalkan */}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ id_mapel: m.id_mapel });
                                  setModalType('add_jadwal');
                                }}
                                className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-blue-200 hover:border-blue-600 shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Jadwalkan KBM</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* SUB-TAB 5: TABEL GLOBAL SEMUA JADWAL                      */}
              {/* ========================================================= */}
              {jadwalSubTab === 'semua' && (
                <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Tabel Rekapitulasi Seluruh Jadwal KBM ({schedules.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Daftar lengkap seluruh jadwal KBM di semua jenjang kelas dan guru pengampu.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacherForSchedulePrint(null);
                          setSchedulePrintMode('master_matrix');
                          setSchedulePrintModalOpen(true);
                        }}
                        className="h-9 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Cetak Master Matriks Jadwal Seluruh Guru (A4 Landscape & Excel)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Master Jadwal</span>
                      </button>

                      <select
                        value={filterJadwalHari}
                        onChange={(e) => setFilterJadwalHari(e.target.value)}
                        className="h-9 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="semua">Semua Hari</option>
                        {daysList.map((d) => (
                          <option key={d} value={d}>Hari {d}</option>
                        ))}
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchJadwal}
                          onChange={(e) => setSearchJadwal(e.target.value)}
                          placeholder="Cari mapel / kelas / guru..."
                          className="w-56 h-9 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 pb-1">
                    <table className="w-full min-w-[750px] text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="p-3">Hari & Jam KBM</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Mata Pelajaran</th>
                          <th className="p-3">Guru Pengajar</th>
                          <th className="p-3">Batas Terlambat</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedules
                          .filter((j) => {
                            if (filterJadwalHari !== 'semua' && j.hari !== filterJadwalHari) return false;
                            if (searchJadwal) {
                              const q = searchJadwal.toLowerCase();
                              const matchMapel = j.mata_pelajaran?.nama_mapel?.toLowerCase().includes(q);
                              const matchKelas = j.kelas?.nama_kelas?.toLowerCase().includes(q);
                              const matchGuru = j.guru?.nama?.toLowerCase().includes(q);
                              if (!matchMapel && !matchKelas && !matchGuru) return false;
                            }
                            return true;
                          })
                          .map((j) => (
                            <tr key={j.id_jadwal} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-bold text-slate-800">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px] mr-1.5">
                                  {j.hari}
                                </span>
                                {j.jam_mulai} - {j.jam_selesai}
                              </td>
                              <td className="p-3 font-bold text-blue-700">{j.kelas?.nama_kelas}</td>
                              <td className="p-3 font-medium text-slate-700">{j.mata_pelajaran?.nama_mapel}</td>
                              <td className="p-3 text-slate-600">{j.guru?.nama}</td>
                              <td className="p-3 font-mono text-rose-600 font-bold">{j.batas_terlambat}</td>
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(j);
                                      setModalType('add_jadwal');
                                    }}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                    title="Edit Jadwal"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJadwal(j.id_jadwal)}
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB 5: IMPORT MASSAL EXCEL                                */}
        {/* ========================================================= */}
        {activeTab === 'import' && (
          <div className="max-w-2xl mx-auto glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Import Massal Data Siswa (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Unggah berkas Excel berisi data ratusan siswa untuk dimasukkan secara serentak ke database Supabase.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Format Kolom Excel Yang Dibutuhkan:
              </span>
              <p className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-emerald-200">
                NIS | Nama | Kelas | Status | No_WA_Ortu
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadTemplateSiswa(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Unduh Berkas Contoh Siap Pakai (15 Siswa .xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => downloadTemplateSiswa(false)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Template Kosong (.xlsx)
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center space-y-3 bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700">Pilih Berkas Excel dari Komputer</p>
                <p className="text-[11px] text-slate-400">Mendukung format .xlsx, .xls, atau .csv</p>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: KENAIKAN KELAS & KELULUSAN (PROMOSI MASSAL)        */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* TAB 6: WIZARD KENAIKAN KELAS & DISTRIBUSI KELAS (3 OPSI) */}
        {/* ========================================================= */}
        {activeTab === 'promosi' && (() => {
          const activePromoStudents = students.filter((s) => s.status_siswa === 'aktif');
          
          const filteredPromoStudents = activePromoStudents.filter((st) => {
            const t = st.kelas?.tingkat || (classes.find((c) => c.id_kelas === st.id_kelas)?.tingkat) || 7;
            const matchSearch =
              st.nama.toLowerCase().includes(promotionSearch.toLowerCase()) ||
              st.nis.includes(promotionSearch);
            const matchTingkat =
              promotionFilterTingkat === 'semua' || String(t) === String(promotionFilterTingkat);
            return matchSearch && matchTingkat;
          });

          const totalSiswa9 = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 9;
          }).length;

          const totalSiswa8 = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 8;
          }).length;

          const totalSiswa7 = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 7;
          }).length;

          const previewLulus = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 9 && !ungraduatedStudentNis.includes(s.nis);
          }).length;

          const previewNaik9 = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 8 && !retainedStudentNis.includes(s.nis);
          }).length;

          const previewNaik8 = activePromoStudents.filter((s) => {
            const t = s.kelas?.tingkat || (classes.find((c) => c.id_kelas === s.id_kelas)?.tingkat);
            return t === 7 && !retainedStudentNis.includes(s.nis);
          }).length;

          const previewTinggalTotal = retainedStudentNis.length + ungraduatedStudentNis.length;

          return (
            <div className="max-w-4xl mx-auto glass-card rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              {/* HEADER WIZARD */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Wizard Kenaikan Kelas & Distribusi Kelas Baru
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sistem Promosi Siswa SMP (Tingkat 7 ➔ 8 ➔ 9 ➔ Alumni) dengan opsi Siswa Tinggal Kelas & Distribusi Kelas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPromotionWizard}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Reset Pilihan
                </button>
              </div>

              {/* STEPPER PROGRESS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPromotionStep(1)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
                    promotionStep === 1
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    promotionStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>1</span>
                  <span>1. Pengecualian / Tinggal Kelas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPromotionStep(2)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
                    promotionStep === 2
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    promotionStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>2</span>
                  <span>2. Opsi Distribusi Kelas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPromotionStep(3)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
                    promotionStep === 3
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    promotionStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>3</span>
                  <span>3. Ringkasan & Eksekusi</span>
                </button>
              </div>

              {/* ========================================================= */}
              {/* STEP 1: SELEKSI SISWA TINGGAL KELAS / TIDAK LULUS         */}
              {/* ========================================================= */}
              {promotionStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" /> Aturan Kenaikan Kelas & Pengecualian:
                    </span>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Secara default, <strong>seluruh siswa aktif</strong> Kelas 7 & 8 akan dinaikkan ke jenjang berikutnya, dan Kelas 9 akan diluluskan menjadi Alumni. Jika ada siswa yang diputuskan <strong>Tinggal Kelas (Tidak Naik)</strong> atau <strong>Mengulang</strong>, cukup tandai siswa tersebut di daftar bawah ini. Siswa yang ditandai akan dipertahankan pada kelas & tingkatnya saat ini.
                    </p>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Siswa Aktif</span>
                      <strong className="text-base text-slate-800">{activePromoStudents.length}</strong>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <span className="text-emerald-600 block text-[10px] font-bold uppercase">Siap Lulus (Kls 9)</span>
                      <strong className="text-base text-emerald-700">{previewLulus}</strong>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl">
                      <span className="text-purple-600 block text-[10px] font-bold uppercase">Siap Naik Jenjang</span>
                      <strong className="text-base text-purple-700">{previewNaik9 + previewNaik8}</strong>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                      <span className="text-rose-600 block text-[10px] font-bold uppercase">Tinggal Kelas</span>
                      <strong className="text-base text-rose-700">{previewTinggalTotal}</strong>
                    </div>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Cari nama atau NIS siswa..."
                        value={promotionSearch}
                        onChange={(e) => setPromotionSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPromotionFilterTingkat('semua')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          promotionFilterTingkat === 'semua'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Semua ({activePromoStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromotionFilterTingkat('7')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          promotionFilterTingkat === '7'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tingkat VII ({totalSiswa7})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromotionFilterTingkat('8')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          promotionFilterTingkat === '8'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tingkat VIII ({totalSiswa8})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromotionFilterTingkat('9')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          promotionFilterTingkat === '9'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tingkat IX ({totalSiswa9})
                      </button>
                    </div>
                  </div>

                  {/* Student Checklist Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[420px] overflow-y-auto pb-1">
                    <table className="w-full min-w-[650px] text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-3">Siswa</th>
                          <th className="p-3">NIS</th>
                          <th className="p-3">Kelas Saat Ini</th>
                          <th className="p-3">Status Rencana Promosi</th>
                          <th className="p-3 text-right">Tandai Pengecualian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPromoStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Tidak ada siswa yang sesuai kriteria pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredPromoStudents.map((st) => {
                            const t = st.kelas?.tingkat || (classes.find((c) => c.id_kelas === st.id_kelas)?.tingkat) || 7;
                            const isTingkat9 = t === 9;
                            const isRetained = isTingkat9
                              ? ungraduatedStudentNis.includes(st.nis)
                              : retainedStudentNis.includes(st.nis);

                            return (
                              <tr
                                key={st.nis}
                                className={`transition-colors ${
                                  isRetained ? 'bg-rose-50/70 hover:bg-rose-50' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="p-3 font-bold text-slate-800 flex items-center gap-2.5">
                                  <img
                                    src={st.foto_wajah || 'https://placehold.co/80x80/1e3a8a/ffffff?text=Siswa'}
                                    alt="Foto"
                                    className="w-7 h-7 rounded-xl object-cover ring-1 ring-slate-200"
                                  />
                                  <span>{st.nama}</span>
                                </td>
                                <td className="p-3 font-mono text-slate-600">{st.nis}</td>
                                <td className="p-3">
                                  <span className="font-semibold text-blue-700">
                                    {st.kelas?.nama_kelas || (classes.find((c) => c.id_kelas === st.id_kelas)?.nama_kelas) || 'Belum Ada Kelas'}
                                  </span>
                                  <span className="text-[10px] text-purple-600 block">Tingkat {t}</span>
                                </td>
                                <td className="p-3">
                                  {isRetained ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                      <UserX className="w-3 h-3" />
                                      {isTingkat9 ? 'Mengulang (Tidak Lulus)' : 'Tinggal Kelas (Tidak Naik)'}
                                    </span>
                                  ) : isTingkat9 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                      <Check className="w-3 h-3" /> Lulus (Alumni)
                                    </span>
                                  ) : t === 8 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                      <TrendingUp className="w-3 h-3" /> Naik ke Tingkat IX
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                      <TrendingUp className="w-3 h-3" /> Naik ke Tingkat VIII
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRetained(st.nis, t)}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                                      isRetained
                                        ? 'bg-rose-600 text-white shadow-xs hover:bg-rose-700'
                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
                                    }`}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>{isRetained ? 'Batalkan Pengecualian' : isTingkat9 ? 'Tandai Mengulang' : 'Tandai Tinggal Kelas'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* STEP 1 NAVIGATION */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Ditandai: <strong className="text-rose-600">{previewTinggalTotal} siswa</strong> tinggal kelas / mengulang
                    </span>

                    <button
                      type="button"
                      onClick={() => setPromotionStep(2)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Lanjut: Pilih Metode Distribusi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: PILIH METODE DISTRIBUSI KELAS (4 PILIHAN)        */}
              {/* ========================================================= */}
              {promotionStep === 2 && (() => {
                const studentsToPromoteList = activePromoStudents.filter((st) => {
                  const t = st.kelas?.tingkat || (classes.find((c) => c.id_kelas === st.id_kelas)?.tingkat) || 7;
                  if (t === 9) return false;
                  return !retainedStudentNis.includes(st.nis);
                });

                const totalFilledManual = Object.keys(manualPlacements).filter((k) => manualPlacements[k]).length;
                const totalLaterManual = studentsToPromoteList.length - totalFilledManual;

                return (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Pilih Strategi Penempatan / Distribusi Kelas Siswa yang Naik Kelas
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tentukan bagaimana siswa yang naik ke Tingkat 8 dan 9 akan didistribusikan ke kelas baru.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* OPSI 1: LINIER */}
                      <div
                        onClick={() => setDistributionMode('linear')}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          distributionMode === 'linear'
                            ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                              distributionMode === 'linear' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              Linier
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-800">1. Paralel Kelas Sama</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Siswa langsung naik ke kelas padanan (contoh: <strong>VII-A ➔ VIII-A</strong>, <strong>VIII-A ➔ IX-A</strong>). Komposisi teman sekelas tetap.
                          </p>
                        </div>
                        <div className="text-[10px] text-blue-700 font-semibold pt-1 border-t border-slate-100">
                          ✓ Kelas tetap sama
                        </div>
                      </div>

                      {/* OPSI 2: SHUFFLE */}
                      <div
                        onClick={() => setDistributionMode('shuffle')}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          distributionMode === 'shuffle'
                            ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                              distributionMode === 'shuffle' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Shuffle className="w-4 h-4" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Acak Merata
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-800">2. Acak Otomatis (Merata)</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Siswa yang naik diacak secara otomatis dan dibagikan secara <strong>seimbang (round-robin)</strong> ke seluruh kelas tujuan.
                          </p>
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold pt-1 border-t border-slate-100">
                          ✓ Kapasitas kelas adil
                        </div>
                      </div>

                      {/* OPSI 3: MANUAL PLOTTING SEKARANG */}
                      <div
                        onClick={() => setDistributionMode('manual')}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          distributionMode === 'manual'
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                              distributionMode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <FolderInput className="w-4 h-4" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Pilih Sekarang
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-800">3. Pilih Kelas Sekarang</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Pilih langsung kelas baru untuk tiap siswa di tabel bawahnya, atau biarkan opsi <strong>Isi Nanti</strong> jika belum pasti.
                          </p>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                          ✓ Interaktif per siswa
                        </div>
                      </div>

                      {/* OPSI 4: KOSONGKAN & ISI NANTI */}
                      <div
                        onClick={() => setDistributionMode('unassigned')}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          distributionMode === 'unassigned'
                            ? 'border-purple-600 bg-purple-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                              distributionMode === 'unassigned' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Users className="w-4 h-4" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                              Isi Nanti (Tunda)
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-800">4. Kosongkan & Isi Nanti</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Siswa dinaikkan jenjangnya, namun kelas dikosongkan. Kelas baru diisi nanti via <strong>Studio Penempatan Kelas</strong>.
                          </p>
                        </div>
                        <div className="text-[10px] text-purple-700 font-semibold pt-1 border-t border-slate-100">
                          ✓ Bebas tunda penempatan
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE TABLE JIKA OPSI 3 (MANUAL) DIPILIH */}
                    {distributionMode === 'manual' && (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                          <div>
                            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <FolderInput className="w-4 h-4 text-emerald-700" /> Plotting Interaktif Kelas Baru Siswa ({studentsToPromoteList.length} Siswa Naik):
                            </span>
                            <p className="text-[11px] text-emerald-800">
                              Tentukan kelas baru di dropdown masing-masing siswa. Siswa yang belum dipilih kelasnya akan otomatis berstatus <strong>Isi Nanti / Tunda</strong>.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setManualPlacements({})}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Tandai Semua Isi Nanti
                            </button>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              {totalFilledManual} Ditentukan • {totalLaterManual} Isi Nanti
                            </span>
                          </div>
                        </div>

                        <div className="border border-emerald-200 rounded-xl overflow-x-auto max-h-[350px] overflow-y-auto bg-white pb-1">
                          <table className="w-full min-w-[520px] text-left text-xs">
                            <thead className="bg-emerald-100/70 text-emerald-900 uppercase font-bold sticky top-0 z-10 text-[10px]">
                              <tr>
                                <th className="p-2.5">Siswa</th>
                                <th className="p-2.5">Jenjang Asal ➔ Target</th>
                                <th className="p-2.5">Pilih Kelas Baru</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100">
                              {studentsToPromoteList.map((st) => {
                                const t = st.kelas?.tingkat || (classes.find((c) => c.id_kelas === st.id_kelas)?.tingkat) || 7;
                                const targetTingkat = t === 7 ? 8 : 9;
                                const availableTargetClasses = classes.filter((c) => getTingkat(c) === targetTingkat);

                                return (
                                  <tr key={st.nis} className="hover:bg-emerald-50/40 transition-colors">
                                    <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                                      <img
                                        src={st.foto_wajah || 'https://placehold.co/80x80/1e3a8a/ffffff?text=Siswa'}
                                        alt="Foto"
                                        className="w-6 h-6 rounded-lg object-cover ring-1 ring-slate-200"
                                      />
                                      <div>
                                        <span>{st.nama}</span>
                                        <span className="block text-[10px] text-slate-400 font-normal font-mono">NIS: {st.nis}</span>
                                      </div>
                                    </td>
                                    <td className="p-2.5">
                                      <span className="text-slate-500">Tingkat {t}</span>
                                      <span className="mx-1 text-slate-400">➔</span>
                                      <span className="font-bold text-emerald-700">Tingkat {targetTingkat}</span>
                                    </td>
                                    <td className="p-2.5">
                                      <select
                                        value={manualPlacements[st.nis] || ''}
                                        onChange={(e) =>
                                          setManualPlacements((prev) => ({
                                            ...prev,
                                            [st.nis]: e.target.value,
                                          }))
                                        }
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                          manualPlacements[st.nis]
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                            : 'bg-slate-50 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        <option value="">⏱️ Isi Nanti / Tunda Penempatan</option>
                                        {availableTargetClasses.map((c) => (
                                          <option key={c.id_kelas} value={c.id_kelas}>
                                            Kelas {c.nama_kelas}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 NAVIGATION */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setPromotionStep(1)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        ⬅️ Kembali ke Langkah 1
                      </button>

                      <button
                        type="button"
                        onClick={() => setPromotionStep(3)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Lanjut: Ringkasan & Konfirmasi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================= */}
              {/* STEP 3: RINGKASAN PRATINJAU & EKSEKUSI FINAL              */}
              {/* ========================================================= */}
              {promotionStep === 3 && (
                <div className="space-y-5">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Ringkasan Simulasi Promosi Kelas:
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Periksa kembali rincian data di bawah ini sebelum mengeksekusi kenaikan kelas. Data absensi historis dan riwayat streak siswa akan tetap terjaga di database.
                    </p>
                  </div>

                  {/* Executive Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Lulus (Alumni)</span>
                      <strong className="text-xl font-black text-emerald-600">{previewLulus}</strong>
                      <span className="text-[10px] text-slate-500 block">Siswa Tingkat IX</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">2. Naik ke Tingkat IX</span>
                      <strong className="text-xl font-black text-purple-600">{previewNaik9}</strong>
                      <span className="text-[10px] text-slate-500 block">Dari Tingkat VIII</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Naik ke Tingkat VIII</span>
                      <strong className="text-xl font-black text-blue-600">{previewNaik8}</strong>
                      <span className="text-[10px] text-slate-500 block">Dari Tingkat VII</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">4. Tinggal / Mengulang</span>
                      <strong className="text-xl font-black text-rose-600">{previewTinggalTotal}</strong>
                      <span className="text-[10px] text-slate-500 block">Dikecualikan dari Promosi</span>
                    </div>
                  </div>

                  {/* Strategy Info Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Strategi Distribusi Kelas Terpilih:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700">
                        {distributionMode === 'linear'
                          ? '1. Paralel Kelas Sama (Linier)'
                          : distributionMode === 'shuffle'
                          ? '2. Acak Otomatis (Merata / Round-Robin)'
                          : distributionMode === 'manual'
                          ? '3. Plotting Interaktif (Pilih Kelas Sekarang)'
                          : '4. Kosongkan Kelas (Isi Nanti / Tunda)'}
                      </span>
                    </div>

                    {distributionMode === 'manual' && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Sebanyak <strong>{Object.keys(manualPlacements).filter((k) => manualPlacements[k]).length} siswa</strong> langsung ditempatkan ke kelas pilihan Anda, dan <strong>{previewNaik8 + previewNaik9 - Object.keys(manualPlacements).filter((k) => manualPlacements[k]).length} siswa</strong> berstatus <em>Isi Nanti (Antrean)</em> yang dapat Anda tentukan kelasnya kapan saja via Studio Penempatan Kelas.
                      </p>
                    )}

                    {distributionMode === 'shuffle' && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Siswa tingkat 7 dan 8 yang naik akan disebar secara acak dan berimbang ke {classes.filter((c) => getTingkat(c) === 8).length} kelas 8 dan {classes.filter((c) => getTingkat(c) === 9).length} kelas 9 yang aktif.
                      </p>
                    )}

                    {distributionMode === 'unassigned' && (
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Seluruh siswa yang naik kelas akan masuk ke antrean <em>Isi Nanti / Belum Ada Kelas</em>. Di Tab Data Siswa, Anda dapat menempatkan siswa secara kelompok ke kelas pilihan menggunakan fitur <strong>Studio Penempatan Kelas</strong>.
                      </p>
                    )}
                  </div>

                  {/* List of Retained Students if any */}
                  {previewTinggalTotal > 0 && (
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2 text-xs">
                      <span className="font-bold text-rose-800 flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-rose-600" /> Daftar Siswa Yang Dikecualikan (Tinggal Kelas / Mengulang):
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[...ungraduatedStudentNis, ...retainedStudentNis].map((nis) => {
                          const st = students.find((s) => s.nis === nis);
                          return (
                            <span
                              key={nis}
                              className="px-2.5 py-1 bg-white border border-rose-300 rounded-xl font-semibold text-rose-800 text-[11px] flex items-center gap-1 shadow-2xs"
                            >
                              <span>{st ? st.nama : nis}</span>
                              <span className="text-[10px] text-slate-400">({nis})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 3 NAVIGATION & EXECUTE */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPromotionStep(2)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      ⬅️ Kembali ke Langkah 2
                    </button>

                    <button
                      type="button"
                      disabled={processingPromotion}
                      onClick={executePromotion}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingPromotion ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Memproses Database...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          <span>Eksekusi Kenaikan Kelas Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB KHUSUS: KELOLA DATA ABSENSI (CRUD & OPERASIONAL)      */}
        {/* ========================================================= */}
        {activeTab === 'data_absensi' && (
          <AdminAttendanceManager
            students={students}
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            schedules={schedules}
            settings={settings}
            initialView={attendanceManagerView}
            initialClassId={attendanceManagerClassId}
            onOpenStudentPdfReport={(student) => {
              setSelectedStudentForPdf(student);
              setIsPdfModalOpen(true);
            }}
            onOpenClassReport={(kelas) => {
              setSelectedClassForReport(kelas);
            }}
            onManageSchedule={(clsId) => {
              setSelectedKelasForJadwal(clsId);
              setJadwalSubTab('kelas');
              setActiveTab('jadwal');
            }}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 7: PUSAT REKAPITULASI & LAPORAN PRESENSI EKSEKUTIF    */}
        {/* ========================================================= */}
        {activeTab === 'laporan' && (
          <AdminLaporanCenter
            students={students}
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            schedules={schedules}
            settings={settings}
            invalAssignments={invalAssignments}
            onOpenClassReport={(cls) => setSelectedClassForReport(cls)}
            onOpenStudentPdf={(student) => {
              setSelectedStudentForPdf(student);
              setIsPdfModalOpen(true);
            }}
            onOpenTeacherSchedule={(teacher, mode = 'single') => {
              setSelectedTeacherForSchedulePrint(teacher);
              setSchedulePrintMode(mode);
              setSchedulePrintModalOpen(true);
            }}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 8: PENGATURAN GPS, WA GATEWAY & LOG ANTREAN           */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* TAB 8: PENGATURAN GPS, WA GATEWAY & TEMPLATE PESAN WA      */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (() => {
          const WA_TEMPLATE_CONFIGS = [
            {
              id: 'alpa',
              label: '🔴 Notifikasi Alpa',
              settingKey: 'wa_template_alpa',
              title: 'Format Pesan Saat Siswa Alpa (Tanpa Keterangan)',
              desc: 'Pesan otomatis dikirim ke nomor WhatsApp orang tua ketika siswa terdata Alpa pada KBM hari tersebut.',
              vars: ['{{nama_ortu}}', '{{nama_siswa}}', '{{nis}}', '{{tanggal}}'],
            },
            {
              id: 'izin_sakit',
              label: '🔵 Notifikasi Izin / Sakit',
              settingKey: 'wa_template_izin_sakit',
              title: 'Format Konfirmasi Presensi Izin & Sakit Siswa',
              desc: 'Pesan konfirmasi yang dikirimkan ke orang tua saat pengajuan surat sakit atau izin siswa dicatat.',
              vars: ['{{nama_ortu}}', '{{nama_siswa}}', '{{status}}', '{{tanggal}}', '{{keterangan}}'],
            },
            {
              id: 'hadir',
              label: '🟢 Notifikasi Hadir',
              settingKey: 'wa_template_hadir',
              title: 'Format Notifikasi Kehadiran Siswa di Sekolah',
              desc: 'Pesan konfirmasi saat siswa berhasil scan presensi masuk di sekolah.',
              vars: ['{{nama_ortu}}', '{{nama_siswa}}', '{{nis}}', '{{tanggal}}', '{{waktu}}'],
            },
            {
              id: 'akun',
              label: '🔑 Pembagian Akun & Login',
              settingKey: 'wa_template_akun',
              title: 'Format Teks Pembagian Akun & Password Login',
              desc: 'Format pesan yang otomatis tersalin ke clipboard saat Anda menekan tombol "Salin Format Kredensial WhatsApp" di menu Kelola Akun.',
              vars: ['{{role_label}}', '{{nama}}', '{{id_label}}', '{{id_login}}', '{{email}}', '{{password}}', '{{app_url}}'],
            },
          ];

          const activeConfig = WA_TEMPLATE_CONFIGS.find((c) => c.id === activeWaTemplateTab) || WA_TEMPLATE_CONFIGS[0];

          function getPreviewWaText(tabKey) {
            const dummy = {
              nama_ortu: 'Bpk. Bambang Sutrisno',
              nama_siswa: 'Ahmad Fauzan',
              nis: '202409015',
              tanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              waktu: '07:35 WITA',
              mapel: 'Matematika Wajib',
              status: 'Izin (Acara Keluarga)',
              keterangan: 'Menghadiri khitanan keluarga di Samarinda',
              role_label: 'Siswa / Wali Siswa',
              nama: 'Ahmad Fauzan',
              id_label: 'NIS',
              id_login: '202409015',
              email: '202409015@siswa.sekolah.id',
              password: 'password123',
              app_url: window.location.origin,
            };

            const settingKey = activeConfig.settingKey;
            let templateStr = settings[settingKey] || '';
            if (!templateStr) return '';

            let res = templateStr;
            Object.entries(dummy).forEach(([k, v]) => {
              res = res.replaceAll(`{{${k}}}`, v);
            });
            return res;
          }

          function resetWaTemplateToDefault(tabKey) {
            const defaults = {
              alpa: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nKami menginformasikan bahwa ananda *{{nama_siswa}}* (NIS: {{nis}}) tercatat *ALPA (Tanpa Keterangan)* pada hari {{tanggal}}.\n\nMohon konfirmasi jika ananda berhalangan hadir. Terima kasih.',
              hadir: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nAnanda *{{nama_siswa}}* (NIS: {{nis}}) telah *HADIR* di sekolah dan mengikuti KBM pada hari {{tanggal}} pukul {{waktu}}.',
              izin_sakit: 'Pemberitahuan Presensi:\nYth. Bpk/Ibu {{nama_ortu}},\n\nLaporan presensi ananda *{{nama_siswa}}* berstatus *{{status}}* pada {{tanggal}} telah dicatat oleh pihak sekolah.\nKeterangan: {{keterangan}}.',
              akun: '*INFORMASI AKSES LOGIN SIAK PRESENSI SEKOLAH*\n\nYth. {{role_label}} *{{nama}}*,\n\nBerikut akun akses untuk masuk ke aplikasi Presensi Sekolah:\n🔗 *Tautan Aplikasi:* {{app_url}}\n👤 *ID Login ({{id_label}}):* {{id_login}}\n📧 *Email:* {{email}}\n🔑 *Password:* {{password}}\n\n_Catatan: Harap simpan informasi ini dan segera ubah kata sandi setelah Anda berhasil masuk._',
            };

            const keyMap = {
              alpa: 'wa_template_alpa',
              hadir: 'wa_template_hadir',
              izin_sakit: 'wa_template_izin_sakit',
              akun: 'wa_template_akun',
            };

            const settingKey = keyMap[tabKey];
            if (settingKey && defaults[tabKey]) {
              setSettings((prev) => ({
                ...prev,
                [settingKey]: defaults[tabKey],
              }));
              toast.success('Template pesan berhasil dikembalikan ke format bawaan!');
            }
          }

          function insertVariable(tag) {
            const settingKey = activeConfig.settingKey;
            setSettings((prev) => ({
              ...prev,
              [settingKey]: (prev[settingKey] || '') + ` ${tag}`,
            }));
          }

          async function handleSaveAllSettings(e) {
            e.preventDefault();
            setSavingSettings(true);
            try {
              localStorage.setItem('siak_system_settings', JSON.stringify(settings));
              for (const [k, v] of Object.entries(settings)) {
                try {
                  const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
                  await supabase.from('pengaturan_sistem').upsert({
                    kunci: k,
                    nilai: valStr,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'kunci' });
                } catch (e) {}
              }
              toast.success('Seluruh pengaturan sekolah, GPS & template pesan WhatsApp berhasil disimpan!', 'Pengaturan Tersimpan');
            } catch (err) {
              toast.success('Pengaturan berhasil disimpan di memori aplikasi.', 'Pengaturan Tersimpan');
            } finally {
              setSavingSettings(false);
            }
          }

          return (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* BANNER PROFIL ADMIN LINK */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-300 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Pengaturan Profil & Kredensial Administrator
                    </h3>
                    <p className="text-xs text-blue-200 mt-0.5">
                      Ingin mengganti nama pengelola, email login resmi, foto avatar, atau kata sandi akun Admin?
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('profil_admin')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-blue-400/30"
                >
                  <span>Buka Profil Admin</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CARD 0: IDENTITAS RESMI SEKOLAH, LOGO & KEPALA SEKOLAH */}
              <SchoolIdentitySettings
                settings={settings}
                onChangeSettings={(newFields) => setSettings((prev) => ({ ...prev, ...newFields }))}
                onSaveAll={handleSaveAllSettings}
                saving={savingSettings}
              />

              <form onSubmit={handleSaveAllSettings} className="space-y-6">
                {/* SAKELAR MASTER: MODE PENGIRIMAN PESAN WHATSAPP */}
                <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                        settings.wa_notifikasi_aktif !== 'false'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-rose-50 border-rose-200 text-rose-500'
                      }`}>
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-base font-bold text-slate-800">
                            Mode Pengiriman Notifikasi WhatsApp
                          </h2>
                          {settings.wa_notifikasi_aktif !== 'false' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              AKTIF (ON)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              NONAKTIF (OFF)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                          {settings.wa_notifikasi_aktif !== 'false'
                            ? 'Layanan kirim notifikasi presensi otomatis dan pesan langsung ke WhatsApp orang tua berjalan aktif. Pengguna dapat mengirim pesan secara langsung.'
                            : 'Layanan pengiriman pesan WhatsApp sedang dimatikan. Semua tombol kirim WA di sistem akan diblokir dengan pemberitahuan resmi.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={async () => {
                          const nextState = settings.wa_notifikasi_aktif === 'false';
                          const strVal = String(nextState);
                          setSettings((prev) => {
                            const updated = { ...prev, wa_notifikasi_aktif: strVal };
                            localStorage.setItem('siak_system_settings', JSON.stringify(updated));
                            return updated;
                          });
                          try {
                            await supabase.from('pengaturan_sistem').upsert({
                              kunci: 'wa_notifikasi_aktif',
                              nilai: strVal,
                              deskripsi: 'Status mode pengiriman pesan WhatsApp (true = aktif, false = nonaktif)',
                              updated_at: new Date().toISOString(),
                            }, { onConflict: 'kunci' });
                            toast.success(
                              nextState
                                ? 'Mode WhatsApp Diaktifkan: Pesan dapat dikirimkan kembali.'
                                : 'Mode WhatsApp Dinonaktifkan: Seluruh pengiriman pesan ditangguhkan.',
                              'Pengaturan WhatsApp'
                            );
                          } catch (err) {
                            console.warn('Gagal simpan wa_notifikasi_aktif ke Supabase:', err);
                            toast.warning('Status disimpan ke memori lokal.');
                          }
                        }}
                        className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                          settings.wa_notifikasi_aktif !== 'false' ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={settings.wa_notifikasi_aktif !== 'false' ? 'Klik untuk mematikan mode kirim WhatsApp' : 'Klik untuk mengaktifkan mode kirim WhatsApp'}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                            settings.wa_notifikasi_aktif !== 'false' ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-slate-700 min-w-[50px]">
                        {settings.wa_notifikasi_aktif !== 'false' ? 'Aktif' : 'Mati'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 1: FORMAT & TEMPLATE PESAN WHATSAPP */}
                <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        <span>Format & Template Pesan WhatsApp</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Sesuaikan kata-kata pesan otomatis yang dikirimkan ke nomor WhatsApp orang tua, siswa, dan guru.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resetWaTemplateToDefault(activeWaTemplateTab)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Kembalikan template ini ke format bawaan sistem"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Format Default</span>
                      </button>
                    </div>
                  </div>

                  {/* NAV TABS TEMPLATE */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {WA_TEMPLATE_CONFIGS.map((cfg) => (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => setActiveWaTemplateTab(cfg.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeWaTemplateTab === cfg.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{cfg.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* ACTIVE TEMPLATE EDITOR & LIVE PREVIEW */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                    {/* LEFT: TEXTAREA EDITOR */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{activeConfig.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{activeConfig.desc}</p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          Teks Format Pesan:
                        </label>
                        <textarea
                          rows={8}
                          value={settings[activeConfig.settingKey] || ''}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [activeConfig.settingKey]: e.target.value,
                            })
                          }
                          placeholder="Ketik format template pesan WhatsApp..."
                          className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
                        />
                      </div>

                      {/* VARIABEL DINAMIS TAGS */}
                      <div>
                        <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          Klik untuk Menyisipkan Variabel Otomatis:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeConfig.vars.map((vTag) => (
                            <button
                              key={vTag}
                              type="button"
                              onClick={() => insertVariable(vTag)}
                              title={`Klik untuk menambahkan ${vTag} ke teks pesan`}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                            >
                              + {vTag}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Gunakan simbol bintang <code className="bg-slate-100 px-1 py-0.5 rounded">*teks*</code> untuk huruf tebal (bold), dan garis bawah <code className="bg-slate-100 px-1 py-0.5 rounded">_teks_</code> untuk huruf miring (italics).
                        </p>
                      </div>
                    </div>

                    {/* RIGHT: LIVE WHATSAPP CHAT PREVIEW */}
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pratinjau Tampilan Pesan di WhatsApp:</span>
                      </span>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#efeae2] shadow-inner flex flex-col h-[320px]">
                        {/* WhatsApp Header Mockup */}
                        <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
                              🏫
                            </div>
                            <div>
                              <div className="text-xs font-bold leading-tight">SMPN 2 KOTA BANGUN</div>
                              <div className="text-[9px] text-emerald-100 opacity-90">Bot Notifikasi Resmi</div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full font-bold">Online</span>
                        </div>

                        {/* WhatsApp Message Body */}
                        <div className="p-3.5 flex-1 overflow-y-auto space-y-2">
                          <div className="flex justify-center">
                            <span className="px-2.5 py-0.5 bg-white/80 backdrop-blur-xs text-[10px] text-slate-600 rounded-lg shadow-2xs font-semibold">
                              HARI INI
                            </span>
                          </div>

                          <div className="flex justify-start">
                            <div className="max-w-[92%] bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm border border-slate-200/50 space-y-1">
                              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                                {getPreviewWaText(activeWaTemplateTab)}
                              </p>
                              <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
                                <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-blue-500 font-bold">✓✓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: PENGATURAN GEOLOCATION GPS INTERAKTIF 2D & 3D */}
                <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5 bg-white">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span>Pengaturan Geolocation GPS & Radius Presensi Sekolah</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Tentukan koordinat titik {settings.sekolah_nama || 'sekolah'} dan batas radius toleransi buffer secara interaktif menggunakan peta 2D (Satelit/Street) atau visualizer radar geofence 3D.
                    </p>
                  </div>

                  <GpsLocationPicker
                    initialLat={settings.sekolah_lat}
                    initialLng={settings.sekolah_lng}
                    initialRadius={settings.sekolah_radius_meter}
                    initialRadiusActive={settings.sekolah_radius_aktif !== 'false'}
                    schoolName={settings.sekolah_nama}
                    onAutoSaveToggle={async (newRadiusActive) => {
                      const strVal = String(newRadiusActive);
                      setSettings((prev) => {
                        const updated = { ...prev, sekolah_radius_aktif: strVal };
                        localStorage.setItem('siak_system_settings', JSON.stringify(updated));
                        return updated;
                      });
                      try {
                        await supabase.from('pengaturan_sistem').upsert({
                          kunci: 'sekolah_radius_aktif',
                          nilai: strVal,
                          deskripsi: 'Status batasan radius GPS absensi (true = aktif/wajib radius, false = nonaktif/bebas lokasi)',
                          updated_at: new Date().toISOString(),
                        }, { onConflict: 'kunci' });
                        toast.success(
                          newRadiusActive
                            ? 'Radius GPS Diaktifkan: Siswa wajib berada di area sekolah.'
                            : 'Mode Bebas Lokasi Diaktifkan: Batasan GPS dinonaktifkan (tersimpan ke database).',
                          'Pengaturan GPS Diperbarui'
                        );
                      } catch (err) {
                        console.error('Gagal update status radius ke Supabase:', err);
                        toast.warning('Status disimpan lokal, koneksi database gagal.');
                      }
                    }}
                    onSaveGpsSettings={async (gpsData) => {
                      try {
                        const toSave = {
                          sekolah_lat: String(gpsData.lat),
                          sekolah_lng: String(gpsData.lng),
                          sekolah_radius_meter: String(gpsData.radius),
                          sekolah_radius_aktif: String(gpsData.radiusActive),
                        };
                        setSettings((prev) => {
                          const updated = { ...prev, ...toSave };
                          localStorage.setItem('siak_system_settings', JSON.stringify(updated));
                          return updated;
                        });
                        for (const [k, v] of Object.entries(toSave)) {
                          await supabase.from('pengaturan_sistem').upsert({
                            kunci: k,
                            nilai: v,
                            updated_at: new Date().toISOString(),
                          }, { onConflict: 'kunci' });
                        }
                        toast.success('Koordinat, radius, dan status bebas lokasi berhasil disimpan ke database!', 'GPS Tersimpan');
                      } catch (err) {
                        toast.error(`Gagal menyimpan GPS: ${err.message}`);
                      }
                    }}
                    onChange={({ lat: newLat, lng: newLng, radius: newRad, radiusActive: newRadActive }) => {
                      setSettings((prev) => ({
                        ...prev,
                        sekolah_lat: newLat,
                        sekolah_lng: newLng,
                        sekolah_radius_meter: String(newRad),
                        sekolah_radius_aktif: String(newRadActive),
                      }));
                    }}
                  />
                </div>

                {/* CARD 3: KONEKSI WHATSAPP GATEWAY PROVIDER */}
                <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 bg-white">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Send className="w-5 h-5 text-emerald-600" />
                      <span>Koneksi WhatsApp Gateway Provider (API)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Konfigurasi server bot WA untuk pengiriman notifikasi otomatis (misal: Fonnte, Wablas, atau Gateway kustom).
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Gateway API URL</label>
                      <input
                        type="text"
                        value={settings.wa_gateway_api_url}
                        onChange={(e) => setSettings({ ...settings, wa_gateway_api_url: e.target.value })}
                        placeholder="Contoh: https://api.fonnte.com/send"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Gateway Token / API Key</label>
                      <input
                        type="password"
                        value={settings.wa_gateway_api_key}
                        onChange={(e) => setSettings({ ...settings, wa_gateway_api_key: e.target.value })}
                        placeholder="Masukkan token API WhatsApp Gateway"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* TOMBOL SIMPAN PENGATURAN */}
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan & Template'}</span>
                </button>
              </form>

              {/* CARD 4: MONITOR LOG ANTREAN WHATSAPP */}
              <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <span>Log Antrean Pesan WhatsApp</span>
                  </h2>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                    {waQueue.length} Pesan Tercatat
                  </span>
                </div>

                <div className="space-y-2">
                  {waQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">Tujuan: {item.no_tujuan}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{item.pesan}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status_kirim === 'sukses' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status_kirim}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB 8: KALENDER AKADEMIK & HARI LIBUR SEKOLAH             */}
        {/* ========================================================= */}
        {activeTab === 'kalender' && (
          <div className="space-y-4">
            {/* Header Kalender Akademik */}
            <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                Kalender Akademik & Hari Libur Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kelola hari libur nasional, libur semester (freeze streak gamifikasi siswa), serta agenda kegiatan sekolah.
              </p>
            </div>

            {/* MASTER CARD: PERIODE TAHUN AJARAN & SEMESTER AKTIF */}
            {(() => {
              const semProgress = getSemesterProgress(settings.semester_mulai, settings.semester_selesai);
              return (
                <div className="rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                        🎓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Periode Berjalan
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Status: <strong className="text-emerald-600">{semProgress.status}</strong>
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-0.5">
                          Tahun Ajaran {settings.tahun_ajaran_aktif || '2026/2027'} • Semester {settings.semester_aktif || 'Ganjil'}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAcademicPeriodModal}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Tetapkan Tahun Ajaran & Tanggal</span>
                    </button>
                  </div>

                  {/* Grid Info Rentang Tanggal & Progress */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mulai Semester
                      </span>
                      <p className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{formatDateIndo(settings.semester_mulai)}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Akhir Semester (KBM)
                      </span>
                      <p className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>{formatDateIndo(settings.semester_selesai)}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pembagian Rapor & Rekap
                      </span>
                      <p className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{formatDateIndo(settings.tanggal_bagi_rapor)}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Estimasi Progress KBM
                      </span>
                      <p className="text-xs font-bold text-slate-700 mt-1 truncate" title={semProgress.text}>
                        {semProgress.text || 'Siap berjalan'}
                      </p>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${semProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4">
                {/* Action Bar / Seeder Button */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black">
                      🇮🇩
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        Sinkronisasi Kalender Nasional Otomatis
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Muat 16+ daftar hari libur resmi nasional & cuti bersama dalam 1 klik.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncNationalHolidays}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Muat Libur Nasional Otomatis</span>
                  </button>
                </div>

                {/* 2-Column: Mini Visual Calendar & Form Input Agenda/Libur */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Visual Calendar Admin (7 cols) */}
                  <div className="lg:col-span-7 glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Visual Kalender Bulan
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Klik tanggal untuk mengisi otomatis form di samping.
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl px-2 py-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentCalMonth(
                              new Date(adminCalYear, adminCalMonth - 1, 1)
                            )
                          }
                          className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-slate-800 px-2 min-w-[125px] text-center">
                          {adminMonthNames[adminCalMonth]} {adminCalYear}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentCalMonth(
                              new Date(adminCalYear, adminCalMonth + 1, 1)
                            )
                          }
                          className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bar Hari */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
                      <span className="text-rose-500">Ahad</span>
                      <span>Sen</span>
                      <span>Sel</span>
                      <span>Rab</span>
                      <span>Kam</span>
                      <span>Jum</span>
                      <span className="text-slate-500">Sab</span>
                    </div>

                    {/* Grid Slot Tanggal */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const slots = [];
                        for (let i = 0; i < adminFirstDayIndex; i++) {
                          slots.push(
                            <div key={`empty-${i}`} className="h-14 bg-slate-50/50 rounded-2xl border border-transparent" />
                          );
                        }
                        for (let d = 1; d <= adminTotalDays; d++) {
                          const dateKey = adminFormatDateKey(d);
                          const hol = holidays.find((h) => h.tanggal === dateKey);
                          const isWeekend = new Date(adminCalYear, adminCalMonth, d).getDay() === 0;

                          slots.push(
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setSelectedCalDay({ day: d, dateKey, hol, isWeekend });
                                if (hol) {
                                  setHolidayForm({
                                    id: hol.id,
                                    tanggal: hol.tanggal,
                                    tanggal_selesai: '',
                                    status_hari: hol.status_hari,
                                    keterangan: hol.keterangan,
                                    is_libur: hol.is_libur,
                                  });
                                  setIsEditingHoliday(true);
                                } else {
                                  setHolidayForm((prev) => ({
                                    ...prev,
                                    id: null,
                                    tanggal: dateKey,
                                    tanggal_selesai: '',
                                  }));
                                  setIsEditingHoliday(false);
                                }
                              }}
                              className={`h-14 p-1.5 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative ${
                                selectedCalDay?.dateKey === dateKey
                                  ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/80 shadow-xs'
                                  : hol && hol.is_libur
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                                  : hol && !hol.is_libur
                                  ? 'bg-sky-50/80 border-sky-200 text-sky-800'
                                  : isWeekend
                                  ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs font-black ${isWeekend || (hol && hol.is_libur) ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {d}
                                </span>
                                {hol && (
                                  <span className={`w-2 h-2 rounded-full ${hol.is_libur ? 'bg-rose-500' : 'bg-sky-500'}`} />
                                )}
                              </div>

                              {hol ? (
                                <span className="text-[9px] font-bold line-clamp-1 leading-tight">
                                  {hol.keterangan}
                                </span>
                              ) : isWeekend ? (
                                <span className="text-[9px] text-slate-400">Ahad</span>
                              ) : null}
                            </button>
                          );
                        }
                        return slots;
                      })()}
                    </div>

                    {/* Legenda */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-bold text-slate-500 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Libur Aktif (Streak Freeze)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Kegiatan Khusus (Tetap Aktif)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Akhir Pekan
                      </span>
                    </div>
                  </div>

                  {/* Form Input / Edit Hari Libur & Agenda (5 cols) */}
                  <div className="lg:col-span-5 glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-pink-600" />
                        {isEditingHoliday ? 'Edit Hari Libur / Agenda' : 'Tambah Hari Libur / Agenda'}
                      </h3>
                      {isEditingHoliday && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingHoliday(false);
                            setHolidayForm({
                              id: null,
                              tanggal: '',
                              tanggal_selesai: '',
                              status_hari: 'libur_nasional',
                              keterangan: '',
                              is_libur: true,
                            });
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕ Batal Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveHoliday} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Tanggal Mulai <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={holidayForm.tanggal || ''}
                          onChange={(e) =>
                            setHolidayForm({ ...holidayForm, tanggal: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>

                      {!isEditingHoliday && (
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Tanggal Selesai (Opsional Rentang Hari)
                          </label>
                          <input
                            type="date"
                            value={holidayForm.tanggal_selesai || ''}
                            onChange={(e) =>
                              setHolidayForm({ ...holidayForm, tanggal_selesai: e.target.value })
                            }
                            placeholder="Biarkan kosong jika hanya 1 hari"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Isi jika libur berlangsung beruntun (contoh: Libur Semester dari tgl A s/d B).
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Kategori Hari
                        </label>
                        <select
                          value={holidayForm.status_hari || 'libur_nasional'}
                          onChange={(e) =>
                            setHolidayForm({ ...holidayForm, status_hari: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="libur_nasional">Libur Nasional (Tanggal Merah Resmi)</option>
                          <option value="libur_sekolah">Libur Khusus Sekolah (Cuti/Akhir Semester)</option>
                          <option value="kegiatan_khusus">Kegiatan Khusus (Upacara, Porseni, Ujian)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Nama Agenda / Keterangan <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={holidayForm.keterangan || ''}
                          onChange={(e) =>
                            setHolidayForm({ ...holidayForm, keterangan: e.target.value })
                          }
                          placeholder="Contoh: Hari Raya Idul Fitri 1447 H"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>

                      <div className="p-3 bg-pink-50/70 rounded-2xl border border-pink-200/80 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="is_libur_toggle"
                          checked={holidayForm.is_libur}
                          onChange={(e) =>
                            setHolidayForm({ ...holidayForm, is_libur: e.target.checked })
                          }
                          className="w-4 h-4 mt-0.5 accent-pink-600 rounded cursor-pointer"
                        />
                        <label htmlFor="is_libur_toggle" className="text-xs text-slate-700 cursor-pointer">
                          <span className="font-bold block">Tandai Sebagai Hari Libur Sekolah</span>
                          <span className="text-[11px] text-slate-500 block leading-tight">
                            Siswa tidak dihitung alpa, streak gamifikasi di-freeze, dan bot WA alpa dimatikan.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={savingHoliday}
                        className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingHoliday ? 'Menyimpan...' : isEditingHoliday ? 'Perbarui Agenda' : 'Simpan ke Kalender'}</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Tabel Rekap Seluruh Agenda & Hari Libur */}
                <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Daftar Lengkap Agenda & Hari Libur ({filteredHolidays.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Data ini aktif dipakai pada aplikasi murid, orang tua, dan server presensi.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari keterangan..."
                          value={searchHoliday}
                          onChange={(e) => setSearchHoliday(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Filter Kategori */}
                      <select
                        value={filterHolidayType}
                        onChange={(e) => setFilterHolidayType(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="semua">Semua Kategori</option>
                        <option value="libur_nasional">Libur Nasional</option>
                        <option value="libur_sekolah">Libur Sekolah</option>
                        <option value="kegiatan_khusus">Kegiatan Khusus</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase">
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Kategori</th>
                          <th className="py-2.5 px-3">Keterangan Agenda</th>
                          <th className="py-2.5 px-3">Dampak Sistem</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredHolidays.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                              Belum ada agenda atau hari libur pada filter ini.
                            </td>
                          </tr>
                        ) : (
                          filteredHolidays.map((item) => (
                            <tr key={item.id || item.tanggal} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-800">
                                {item.tanggal}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                    item.status_hari === 'libur_nasional'
                                      ? 'bg-rose-100 text-rose-700'
                                      : item.status_hari === 'libur_sekolah'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {item.status_hari.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {item.keterangan}
                              </td>
                              <td className="py-3 px-3">
                                {item.is_libur ? (
                                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Libur (Streak Pause)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Hari Masuk Sekolah
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHolidayForm({
                                        id: item.id,
                                        tanggal: item.tanggal,
                                        tanggal_selesai: '',
                                        status_hari: item.status_hari,
                                        keterangan: item.keterangan,
                                        is_libur: item.is_libur,
                                      });
                                      setIsEditingHoliday(true);
                                      window.scrollTo({ top: 400, behavior: 'smooth' });
                                    }}
                                    className="p-1.5 rounded-xl hover:bg-slate-100 text-blue-600 transition-colors cursor-pointer"
                                    title="Edit Agenda"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHoliday(item)}
                                    className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                                    title="Hapus Agenda"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ========================================================= */}
        {/* TAB: HALL OF FAME & GAMIFIKASI PRESTASI SISWA             */}
        {/* ========================================================= */}
        {activeTab === 'gamifikasi' && (
          <div className="space-y-6">
            {/* Header Hero Gamifikasi Admin (Kontras Tinggi & Mewah) */}
            <div
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e1b4b 100%)',
                color: '#ffffff',
              }}
              className="rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-400/80 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden"
            >
              {/* Background Glow Effect */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-3xl font-black shrink-0 shadow-lg shadow-amber-400/40 ring-4 ring-amber-400/30">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      style={{ backgroundColor: '#fbbf24', color: '#020617' }}
                      className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md inline-flex items-center gap-1.5"
                    >
                      <span>⭐ SIAK Hall of Fame</span>
                    </span>
                    <span
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#fef08a' }}
                      className="text-xs font-mono font-black px-3 py-1 rounded-full border border-white/20"
                    >
                      T.A. {settings.tahun_ajaran_aktif} • Semester {settings.semester_aktif}
                    </span>
                  </div>
                  <h2
                    style={{ color: '#ffffff' }}
                    className="text-xl sm:text-2xl font-black drop-shadow-md tracking-tight mt-1"
                  >
                    Pusat Apresiasi Kedisiplinan & Gamifikasi Siswa
                  </h2>
                  <p
                    style={{ color: '#e2e8f0' }}
                    className="text-xs sm:text-sm font-medium mt-1 max-w-xl leading-relaxed"
                  >
                    Evaluasi komparasi kedisiplinan antar tingkat kelas 7, 8, dan 9 serta pantau pencapaian misi kalender sekolah.
                  </p>
                </div>
              </div>

              {/* Quick Summary Pill */}
              <div
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(51, 65, 85, 1)' }}
                className="flex items-center gap-3 border-2 p-4 rounded-2xl shadow-xl relative z-10 shrink-0"
              >
                <div className="text-center px-3 border-r border-slate-700">
                  <span style={{ color: '#cbd5e1' }} className="text-[10px] uppercase font-extrabold block">Total Murid</span>
                  <span style={{ color: '#ffffff' }} className="text-xl font-black">{students.length} Siswa</span>
                </div>
                <div className="text-center px-3">
                  <span style={{ color: '#fde047' }} className="text-[10px] uppercase font-extrabold block">Total Misi</span>
                  <span style={{ color: '#facc15' }} className="text-xl font-black">28+ Badges</span>
                </div>
              </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="rounded-2xl p-2.5 bg-white border-2 border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                {[
                  { id: 'hall_of_fame', label: '🥇 Hall of Fame & Klasemen', icon: Trophy },
                  { id: 'misi_sekolah', label: '🎯 Katalog & Monitoring Misi', icon: Sparkles },
                ].map((st) => {
                  const Icon = st.icon;
                  const active = gamifikasiSubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setGamifikasiSubTab(st.id)}
                      className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-filter Kelas / Jenjang */}
              <div className="flex items-center gap-2 px-2 text-xs">
                <span className="text-slate-700 font-extrabold text-xs">Filter:</span>
                <select
                  value={gamifikasiFilterTingkat}
                  onChange={(e) => setGamifikasiFilterTingkat(e.target.value)}
                  className="bg-white border-2 border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Semua Jenjang</option>
                  <option value="7">Khusus Tingkat 7</option>
                  <option value="8">Khusus Tingkat 8</option>
                  <option value="9">Khusus Tingkat 9</option>
                </select>

                <select
                  value={gamifikasiFilterKelas}
                  onChange={(e) => setGamifikasiFilterKelas(e.target.value)}
                  className="bg-white border-2 border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id_kelas} value={c.id_kelas}>
                      Kelas {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SUB-TAB 1: HALL OF FAME & KLASEMEN SEKOLAH */}
            {gamifikasiSubTab === 'hall_of_fame' && (
              <div className="space-y-6">
                {/* Secondary Controls Bar: Kategori Leaderboard & Periode Waktu */}
                <div className="p-4 rounded-3xl bg-white border-2 border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Category Switcher */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    {[
                      { id: 'streak', label: '🔥 Streak Kehadiran Siswa', icon: Flame, desc: 'Rekor konsistensi siswa individu' },
                      { id: 'kelas', label: '🏆 Kelas Terdisiplin (% Hadir)', icon: Trophy, desc: 'Peringkat persentase kehadiran kelas' },
                      { id: 'tingkat', label: '📊 Komparasi Angkatan (7, 8, 9)', icon: TrendingUp, desc: 'Perbandingan kedisiplinan jenjang' },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const active = hallOfFameCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setHallOfFameCategory(cat.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-400/40'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-slate-500'}`} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Periode Waktu (Pekan Ini, Bulan Ini, Semester) */}
                  <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Periode:
                    </span>
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 border border-slate-200">
                      {[
                        { id: 'week', label: '📅 Pekan Ini' },
                        { id: 'month', label: '📆 Bulan Ini' },
                        { id: 'semester', label: '🏛️ Semester Ini' },
                      ].map((p) => {
                        const active = hallOfFamePeriod === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setHallOfFamePeriod(p.id)}
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
                {/* 1. KATEGORI: STREAK KEHADIRAN SISWA INDIVIDU              */}
                {/* ========================================================= */}
                {hallOfFameCategory === 'streak' && (() => {
                  const getPeriodStreak = (s) => {
                    const curr = Number(s.streak_sekarang) || 0;
                    const maxS = Number(s.streak_tertinggi || s.streak_sekarang) || 0;
                    if (hallOfFamePeriod === 'week') return Math.min(5, curr);
                    if (hallOfFamePeriod === 'semester') return maxS;
                    return curr;
                  };

                  const targetClass = classes.find((c) => String(c.id_kelas) === String(gamifikasiFilterKelas));
                  const filteredStudents = [...students].filter((s) => {
                    if (gamifikasiFilterKelas !== 'all') {
                      const sClassId = String(s.id_kelas || s.kelas?.id_kelas || '');
                      const sClassName = String(s.kelas?.nama_kelas || '').trim().toUpperCase();
                      const directMatch = sClassId === String(gamifikasiFilterKelas);
                      const nameMatch = targetClass && sClassName === String(targetClass.nama_kelas || '').trim().toUpperCase();
                      const idMatch = targetClass && sClassId === String(targetClass.nama_kelas || '').trim().toUpperCase();
                      if (!directMatch && !nameMatch && !idMatch) return false;
                    }
                    if (gamifikasiFilterTingkat !== 'all') {
                      const t = getTingkat(s.kelas);
                      if (String(t) !== String(gamifikasiFilterTingkat)) return false;
                    }
                    return true;
                  });

                  const sortedStudents = sortAndRankStudentsByStreak(filteredStudents, getPeriodStreak);

                  const top1 = sortedStudents[0];
                  const top2 = sortedStudents[1];
                  const top3 = sortedStudents[2];

                  const renderAdminStudentPodiumCard = (st, defaultOrder) => {
                    if (!st) return null;
                    const streakVal = getPeriodStreak(st);
                    const isRank1 = st.rank === 1;
                    const isRank2 = st.rank === 2;
                    const isRank3 = st.rank === 3;

                    let bgClass = '';
                    let badgeClass = '';
                    let titleLabel = '';

                    if (isRank1) {
                      bgClass = 'border-3 border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-xl relative md:-translate-y-3 hover:border-amber-500 ring-4 ring-amber-400/20';
                      badgeClass = 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/50';
                      titleLabel = st.isShared ? '🤝 Juara 1 Bersama' : 'Teladan Utama Sekolah';
                    } else if (isRank2) {
                      bgClass = 'border-2 border-slate-300 bg-white shadow-md hover:border-slate-400 hover:shadow-lg ring-4 ring-slate-200/40';
                      badgeClass = 'bg-slate-700 text-white ring-4 ring-slate-200';
                      titleLabel = st.isShared ? '🤝 Juara 2 Bersama' : 'Juara 2 Teladan';
                    } else {
                      bgClass = 'border-2 border-amber-700/40 bg-white shadow-md hover:border-amber-700 hover:shadow-lg ring-4 ring-amber-700/10';
                      badgeClass = 'bg-amber-800 text-white ring-4 ring-amber-100';
                      titleLabel = st.isShared ? '🤝 Juara 3 Bersama' : 'Juara 3 Teladan';
                    }

                    return (
                      <div className={`rounded-3xl p-6 sm:p-7 text-center space-y-3.5 transition-all relative ${bgClass} ${defaultOrder}`}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className={`px-4 py-1 rounded-full font-black text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow-md ${
                            isRank1 ? 'bg-amber-400 text-slate-950' : isRank2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-white'
                          }`}>
                            {isRank1 ? <Crown className="w-3.5 h-3.5 fill-current" /> : <Award className="w-3.5 h-3.5" />}
                            <span>{titleLabel}</span>
                          </span>
                        </div>
                        <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-black text-xl sm:text-2xl mx-auto flex items-center justify-center shadow-lg mt-2 ${badgeClass}`}>
                          {st.medalEmoji || (isRank1 ? '🥇 1' : isRank2 ? '🥈 2' : '🥉 3')}
                        </span>
                        <div className="space-y-0.5">
                          <h4 className="font-black text-lg text-slate-950 truncate">{st.nama}</h4>
                          <p className="text-xs font-bold text-slate-600">Kelas {st.kelas?.nama_kelas || '-'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</p>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs border shadow-xs ${
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
                      {/* Banner Info Kategori */}
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>
                            <strong>Klasemen Siswa:</strong> Menampilkan rekor kehadiran berturut-turut tanpa jeda alpa untuk periode <strong>{hallOfFamePeriod === 'week' ? 'Pekan Ini (Maks. 5 Hari Sekolah)' : hallOfFamePeriod === 'semester' ? 'Akumulasi Rekor Semester' : 'Bulan Berjalan'}</strong>.
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-800 shrink-0">
                          {sortedStudents.length} Siswa Terdaftar
                        </span>
                      </div>

                      {/* 3 Top Card Podium Kehormatan Siswa (Mewah & Kontras) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {top2 && renderAdminStudentPodiumCard(top2, 'order-2 md:order-1')}
                        {top1 && renderAdminStudentPodiumCard(top1, 'order-1 md:order-2')}
                        {top3 && renderAdminStudentPodiumCard(top3, 'order-3 md:order-3')}
                      </div>

                      {/* Tabel Lengkap Top Siswa Terdisiplin */}
                      <div className="rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Klasemen Lengkap Siswa Terdisiplin
                          </h3>
                          <span className="text-xs text-slate-500">
                            Menampilkan siswa dengan akumulasi rekor kehadiran tertinggi
                          </span>
                        </div>

                        <div className="overflow-x-auto pb-1">
                          <table className="w-full min-w-[700px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-3 text-center">Rank</th>
                                <th className="py-3 px-3">Nama Siswa</th>
                                <th className="py-3 px-3">NIS</th>
                                <th className="py-3 px-3">Kelas</th>
                                <th className="py-3 px-3">Streak Kehadiran</th>
                                <th className="py-3 px-3">Level & XP</th>
                                <th className="py-3 px-3 text-center">Aksi Administrator</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortedStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                                    Tidak ada data siswa yang cocok dengan filter yang dipilih.
                                  </td>
                                </tr>
                              ) : (
                                sortedStudents.slice(0, 50).map((st) => {
                                  const summ = calculateStudentAchievementsSummary(st, {
                                    tahunAjaran: settings.tahun_ajaran_aktif,
                                    semesterAktif: settings.semester_aktif,
                                  });
                                  const streakVal = getPeriodStreak(st);

                                  return (
                                    <tr key={st.nis} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-3 px-3 text-center">
                                        <span
                                          className={`w-7 h-7 rounded-xl text-xs font-black inline-flex items-center justify-center shadow-2xs ${
                                            st.rank === 1
                                              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400/30'
                                              : st.rank === 2
                                              ? 'bg-slate-300 text-slate-900 font-black border border-slate-400'
                                              : st.rank === 3
                                              ? 'bg-amber-800 text-white font-black'
                                              : 'bg-slate-100 text-slate-700 font-bold border border-slate-200'
                                          }`}
                                        >
                                          {st.rank}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 font-extrabold text-slate-900">
                                        <div className="flex items-center gap-1.5">
                                          <span>{st.nama}</span>
                                          {st.isShared && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                              = Seri
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 font-mono font-bold text-slate-600">{st.nis}</td>
                                      <td className="py-3 px-3 font-bold text-blue-700">
                                        Kelas {st.kelas?.nama_kelas || '-'}
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs">
                                          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                          <span>{streakVal} Hari</span>
                                        </span>
                                      </td>
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black text-[10px] border border-indigo-200 shadow-2xs">
                                            Lvl {summ.level}
                                          </span>
                                          <span className="font-mono text-slate-800 font-black text-xs">{summ.totalXp.toLocaleString()} XP</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedStudentForAchievement(st)}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                          >
                                            <Trophy className="w-3.5 h-3.5" />
                                            <span>Detail Badges</span>
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
                    </div>
                  );
                })()}

                {/* ========================================================= */}
                {/* 2. KATEGORI: KELAS TERDISIPLIN (% KEHADIRAN TERTINGGI)     */}
                {/* ========================================================= */}
                {hallOfFameCategory === 'kelas' && (() => {
                  const classLeaderboard = calculateClassDisciplineLeaderboard(classes, students, holidays, {
                    tahunAjaran: settings.tahun_ajaran_aktif,
                    semester: settings.semester_aktif,
                  });

                  const topClass1 = classLeaderboard[0];
                  const topClass2 = classLeaderboard[1];
                  const topClass3 = classLeaderboard[2];

                  return (
                    <div className="space-y-6">
                      {/* Banner Info Kategori Kelas */}
                      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-300 text-blue-950 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <School className="w-5 h-5 text-blue-600 shrink-0" />
                          <span>
                            <strong>Klasemen Antar Kelas:</strong> Peringkat dihitung dari persentase kehadiran rata-rata dan rerata streak seluruh siswa di kelas tersebut.
                          </span>
                        </div>
                        <span className="font-mono font-bold text-blue-800 shrink-0">
                          {classLeaderboard.length} Kelas Aktif
                        </span>
                      </div>

                      {/* 3 Top Card Podium Kehormatan Kelas */}
                      {(() => {
                        const renderAdminClassPodiumCard = (cls, defaultOrder) => {
                          if (!cls) return null;
                          const isRank1 = cls.rank === 1;
                          const isRank2 = cls.rank === 2;
                          const isRank3 = cls.rank === 3;

                          let bgClass = '';
                          let badgeClass = '';
                          let titleText = '';

                          if (isRank1) {
                            bgClass = 'border-3 border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-xl relative md:-translate-y-3 hover:border-amber-500 transition-all ring-4 ring-amber-400/20';
                            badgeClass = 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/50';
                            titleText = cls.isShared ? '🤝 Juara 1 Bersama' : 'Kelas Terdisiplin Utama';
                          } else if (isRank2) {
                            bgClass = 'border-2 border-slate-300 bg-white shadow-md hover:border-slate-400 hover:shadow-lg transition-all ring-4 ring-slate-200/40';
                            badgeClass = 'bg-slate-700 text-white ring-4 ring-slate-200';
                            titleText = cls.isShared ? '🤝 Juara 2 Bersama' : 'Juara 2 Disiplin';
                          } else {
                            bgClass = 'border-2 border-amber-700/40 bg-white shadow-md hover:border-amber-700 hover:shadow-lg transition-all ring-4 ring-amber-700/10';
                            badgeClass = 'bg-amber-800 text-white ring-4 ring-amber-100';
                            titleText = cls.isShared ? '🤝 Juara 3 Bersama' : 'Juara 3 Disiplin';
                          }

                          return (
                            <div className={`rounded-3xl p-6 sm:p-7 text-center space-y-3.5 transition-all relative ${bgClass} ${defaultOrder}`}>
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span className={`px-4 py-1 rounded-full font-black text-[11px] uppercase tracking-wider inline-flex items-center gap-1 shadow-md ${
                                  isRank1 ? 'bg-amber-400 text-slate-950' : isRank2 ? 'bg-slate-700 text-white' : 'bg-amber-800 text-white'
                                }`}>
                                  {isRank1 ? <Trophy className="w-3.5 h-3.5 fill-current" /> : <Award className="w-3.5 h-3.5" />}
                                  <span>{titleText}</span>
                                </span>
                              </div>
                              <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-black text-xl sm:text-2xl mx-auto flex items-center justify-center shadow-lg mt-2 ${badgeClass}`}>
                                {cls.medalEmoji || (isRank1 ? '🥇 1' : isRank2 ? '🥈 2' : '🥉 3')}
                              </span>
                              <div className="space-y-0.5">
                                <h4 className="font-black text-2xl text-slate-950">Kelas {cls.nama_kelas}</h4>
                                <p className="text-xs font-bold text-slate-600">Wali: {cls.guru?.nama || '-'}</p>
                                <p className="text-[10px] text-slate-400">{cls.totalStudents} Siswa Terdaftar</p>
                              </div>
                              <div className="space-y-1">
                                <div className={`text-3xl font-black font-mono ${isRank1 ? 'text-amber-950' : 'text-slate-800'}`}>
                                  {cls.percentage}%
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                                  isRank1 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}>
                                  <Flame className={`w-3.5 h-3.5 ${isRank1 ? 'fill-amber-600 text-amber-600' : 'fill-orange-500 text-orange-500'}`} />
                                  <span>Rerata Streak: {cls.avgActiveStreak} Hari</span>
                                </span>
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            {topClass2 && renderAdminClassPodiumCard(topClass2, 'order-2 md:order-1')}
                            {topClass1 && renderAdminClassPodiumCard(topClass1, 'order-1 md:order-2')}
                            {topClass3 && renderAdminClassPodiumCard(topClass3, 'order-3 md:order-3')}
                          </div>
                        );
                      })()}

                      {/* Tabel Klasemen Seluruh Kelas */}
                      <div className="rounded-3xl p-6 shadow-sm border border-slate-200 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Klasemen Lengkap Kedisiplinan Seluruh Kelas
                          </h3>
                          <span className="text-xs text-slate-500">
                            Diperbarui berdasarkan akumulasi kehadiran siswa per kelas
                          </span>
                        </div>

                        <div className="overflow-x-auto pb-1">
                          <table className="w-full min-w-[700px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-3 text-center">Rank</th>
                                <th className="py-3 px-3">Nama Kelas</th>
                                <th className="py-3 px-3">Wali Kelas</th>
                                <th className="py-3 px-3">Total Siswa</th>
                                <th className="py-3 px-3">Persentase Kehadiran</th>
                                <th className="py-3 px-3">Rerata Streak</th>
                                <th className="py-3 px-3">Siswa Hadir Sempurna</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classLeaderboard.map((cls) => (
                                <tr key={cls.id_kelas} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`w-7 h-7 rounded-xl text-xs font-black inline-flex items-center justify-center shadow-2xs ${
                                        cls.rank === 1
                                          ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-400/30'
                                          : cls.rank === 2
                                          ? 'bg-slate-300 text-slate-900 font-black border border-slate-400'
                                          : cls.rank === 3
                                          ? 'bg-amber-800 text-white font-black'
                                          : 'bg-slate-100 text-slate-700 font-bold border border-slate-200'
                                      }`}
                                    >
                                      {cls.rank}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-extrabold text-slate-900 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <span>Kelas {cls.nama_kelas}</span>
                                      {cls.isShared && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                          = Seri
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-bold text-slate-700">
                                    {cls.guru?.nama || '-'}
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-600">
                                    {cls.totalStudents} Siswa
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs font-black">
                                        <span className="text-slate-800">{cls.percentage}%</span>
                                        <span className="text-[10px] text-slate-400 font-mono">Kehadiran</span>
                                      </div>
                                      <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            cls.percentage >= 95
                                              ? 'bg-emerald-500'
                                              : cls.percentage >= 85
                                              ? 'bg-blue-500'
                                              : cls.percentage >= 75
                                              ? 'bg-amber-500'
                                              : 'bg-rose-500'
                                          }`}
                                          style={{ width: `${cls.percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                      <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                                      <span>{cls.avgActiveStreak} Hari</span>
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                    {cls.perfectStreakCount} Siswa
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ========================================================= */}
                {/* 3. KATEGORI: KOMPARASI ANGKATAN (TINGKAT 7, 8, 9)          */}
                {/* ========================================================= */}
                {hallOfFameCategory === 'tingkat' && (() => {
                  const gradeComparison = calculateGradeDisciplineComparison(classes, students, holidays, {
                    tahunAjaran: settings.tahun_ajaran_aktif,
                    semester: settings.semester_aktif,
                  });

                  return (
                    <div className="space-y-6">
                      {/* Banner Info Kategori Tingkat */}
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-300 text-indigo-950 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0" />
                          <span>
                            <strong>Komparasi Angkatan:</strong> Evaluasi perbandingan tingkat kedisiplinan dan persentase kehadiran antara Tingkat 7, 8, dan 9 secara menyeluruh.
                          </span>
                        </div>
                        <span className="font-mono font-bold text-indigo-800 shrink-0">
                          3 Angkatan Sekolah
                        </span>
                      </div>

                      {/* Visual Cards Komparasi Tingkat */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {gradeComparison.map((g, idx) => (
                          <div
                            key={g.tingkat}
                            className={`rounded-3xl p-6 border-2 transition-all relative space-y-4 ${
                              g.isChampion
                                ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-400 shadow-lg ring-4 ring-amber-400/20'
                                : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                            }`}
                          >
                            {g.isChampion && (
                              <div className="absolute -top-3 right-4">
                                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                                  <Trophy className="w-3 h-3" />
                                  <span>Angkatan Terdisiplin 🏆</span>
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                  Peringkat #{g.rank} {g.isShared ? '(Bersama)' : ''}
                                </span>
                                <h4 className="font-black text-xl text-slate-900">{g.label}</h4>
                              </div>
                              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black ${
                                g.rank === 1 ? 'bg-amber-400 text-slate-950' : g.rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-800 text-white'
                              }`}>
                                {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            </div>

                            {/* Persentase Kehadiran Angkatan */}
                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Rerata Kehadiran</span>
                                <span className="text-2xl font-black font-mono text-slate-900">{g.percentage}%</span>
                              </div>
                              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    g.isChampion ? 'bg-amber-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${g.percentage}%` }}
                                />
                              </div>
                            </div>

                            {/* Rincian Angka */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 block font-bold">Rombel</span>
                                <span className="font-black text-slate-800 font-mono text-sm">{g.classesCount} Kelas</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 block font-bold">Total Siswa</span>
                                <span className="font-black text-slate-800 font-mono text-sm">{g.totalStudents}</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[10px] text-slate-500 block font-bold">Rerata Streak</span>
                                <span className="font-black text-orange-600 font-mono text-sm">{g.avgStreak} Hari</span>
                              </div>
                            </div>

                            {/* Daftar Kelas di Angkatan */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                              <span className="text-[11px] font-bold text-slate-500 block">Rincian Performa Kelas:</span>
                              <div className="space-y-1">
                                {g.classes.map((cls) => (
                                  <div key={cls.id_kelas} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                                    <span className="font-bold text-slate-700">Kelas {cls.nama_kelas}</span>
                                    <span className="font-mono font-black text-slate-900">{cls.percentage}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}


            {/* SUB-TAB 2: KATALOG & MONITORING MISI SEKOLAH */}
            {gamifikasiSubTab === 'misi_sekolah' && (
              <div className="space-y-6">
                {/* Header Sub-Tab dengan Call-to-Action Quest Builder */}
                <div className="rounded-3xl p-6 shadow-sm border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Katalog & Pengaturan Misi Presensi Siswa
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                        Total {28 + customMissionsList.length} Misi
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                      Kelola misi kehadiran siswa, sesuaikan target bulan kalender berjalan (misal: Tantangan November/Desember), kickoff awal semester, maupun event khusus sekolah.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQuestBuilderModalOpen(true)}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Kelola & Buat Misi Kustom</span>
                  </button>
                </div>

                {/* Section 1: Misi Kustom yang Ditambahkan Admin (Jika Ada) */}
                {customMissionsList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>🎯 Misi Kustom Tambahan Admin ({customMissionsList.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsQuestBuilderModalOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Buka Quest Builder →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customMissionsList.map((m) => (
                        <div
                          key={m.id}
                          className="p-4 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                                Misi Kustom
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono text-[10px] font-black border border-slate-200">
                                +{m.xp} XP
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                                <span>{m.icon || '🎯'}</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-slate-900 leading-snug">{m.title}</h4>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block mt-0.5">
                                  {m.categoryLabel || 'Misi Khusus'}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                              {m.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>Target: {m.maxProgress || m.target} {m.unit || 'Hari'}</span>
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              {m.gradeScope === 'all' ? 'Semua Jenjang' : `Kelas ${m.gradeScope}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Katalog 28 Misi Master Bawaan Sekolah */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>🏆 Katalog 28 Misi Master Bawaan Sistem</span>
                    </h4>
                    <span className="text-[11px] text-slate-600 font-bold">
                      Misi otomatis aktif menyesuaikan kalender dan jenjang siswa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getMasterAchievements({
                      studentGrade: 7,
                      tahunAjaran: settings.tahun_ajaran_aktif,
                      semesterAktif: settings.semester_aktif,
                      studentStreak: 30,
                      studentTotalHadir: 50,
                    }).map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-3xl border border-slate-300 bg-white shadow-2xs space-y-3 flex flex-col justify-between hover:border-blue-400 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                              Tier {m.tier}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black border border-indigo-200">
                              +{m.xp} XP
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                              <span>{m.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-xs text-slate-900 leading-snug">{m.title}</h4>
                              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mt-0.5">
                                {m.categoryLabel}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-700 font-medium mt-2 leading-relaxed">
                            {m.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-extrabold text-slate-700">
                          <span>Ruang Lingkup:</span>
                          <span className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 font-black">
                            {m.gradeScope === 'all' ? 'Semua Jenjang' : `Khusus Kelas ${m.gradeScope}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: DATABASE CRUD STUDIO (SELURUH DATA TABEL DATABASE) */}
        {/* ========================================================= */}
        {activeTab === 'database_crud' && (
          <DatabaseCrudStudio />
        )}

        {/* ========================================================= */}
        {/* TAB 10: MANAJEMEN AKUN ORANG TUA SISWA (OPSIONAL)         */}
        {/* ========================================================= */}
        {activeTab === 'akun_ortu' && (
          <ParentAccountsManager
            students={students}
            classes={classes}
            onRefreshStudents={fetchStudents}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 11: LOG AKTIVITAS & AUDIT KEAMANAN SISTEM (ADMIN)     */}
        {/* ========================================================= */}
        {activeTab === 'log_aktivitas' && (
          <AdminActivityLogCenter />
        )}

        {/* ========================================================= */}
        {/* TAB 12: PENGATURAN PROFIL & AKUN ADMINISTRATOR             */}
        {/* ========================================================= */}
        {activeTab === 'profil_admin' && (
          <AdminProfileSettings
            onProfileUpdated={(updated) => {
              setAdminProfile(updated);
              if (setUserProfile) {
                setUserProfile((prev) => ({
                  ...prev,
                  username: updated.username || prev?.username,
                  details: { ...(prev?.details || {}), ...updated },
                }));
              }
            }}
          />
        )}

        {/* ========================================================= */}
        {/* MODAL PREVIEW CETAK ID CARD QR FISIK                      */}
        {/* ========================================================= */}
        {selectedStudentForCard && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:static print:bg-transparent print:p-0 print:overflow-visible print:inset-auto">
            {/* Scoped Media Print Stylesheet */}
            <style>{`
              @media print {
                @page {
                  size: auto;
                  margin: 10mm;
                }
                body {
                  background: #ffffff !important;
                }
                body * {
                  visibility: hidden;
                }
                #printArea, #printArea * {
                  visibility: visible;
                }
                #printArea {
                  position: relative !important;
                  margin: 20mm auto !important;
                  width: 85.6mm !important;
                  max-width: 85.6mm !important;
                  box-shadow: none !important;
                  border: 1.5px solid #0f172a !important;
                  border-radius: 12px !important;
                  overflow: hidden !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
                .no-print, [data-no-print="true"] {
                  display: none !important;
                }
              }
            `}</style>
            <div className="max-w-md w-full bg-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-300 space-y-4 relative my-auto animate-in zoom-in-95 duration-200 print:bg-transparent print:border-none print:shadow-none print:p-0 print:m-0 print:w-auto print:max-w-none">
              {/* Header Modal & Tombol Tutup */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      Cetak ID Card QR Fisik Siswa
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Standar kartu pelajar fisik & scanner presensi KBM
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForCard(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AREA KARTU FISIK ASLI (PRINTABLE CARD) */}
              <div className="flex justify-center">
                <div
                  id="printArea"
                  className="printable-id-card w-full max-w-[320px] bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden text-slate-800 text-center relative"
                >
                  {/* Header Kartu Biru Navy */}
                  <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 relative overflow-hidden">
                    <div className="relative z-10 flex items-center justify-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/10 p-0.5 border border-white/20 shrink-0 flex items-center justify-center">
                        <img
                          src={settings.sekolah_logo || 'https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2'}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain rounded-md"
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="text-[11px] font-black uppercase tracking-wider leading-tight text-white truncate">
                          {settings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN'}
                        </h4>
                        <p className="text-[9px] text-cyan-200 font-bold tracking-wide uppercase">
                          KARTU TANDA PELAJAR & PRESENSI
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Kartu */}
                  <div className="p-4 space-y-3 bg-white">
                    {/* Foto Siswa */}
                    <div className="relative mx-auto w-20 h-24 rounded-xl overflow-hidden border-2 border-blue-600 shadow-xs bg-slate-100 flex items-center justify-center">
                      <img
                        src={selectedStudentForCard.foto_wajah || 'https://placehold.co/100x100/1e3a8a/ffffff?text=Murid'}
                        alt={selectedStudentForCard.nama}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Identitas Siswa */}
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-slate-900 leading-snug break-words">
                        {selectedStudentForCard.nama}
                      </h4>
                      <p className="text-[11px] font-bold text-blue-700 font-mono">
                        NIS: {selectedStudentForCard.nis}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold border border-slate-200">
                          Kelas: {selectedStudentForCard.kelas?.nama_kelas || '-'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold border border-emerald-200">
                          T.A. {settings.tahun_ajaran_aktif || '2026/2027'}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Presensi Dinamis */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      {idCardQrUrl ? (
                        <img
                          src={idCardQrUrl}
                          alt="QR Presensi Siswa"
                          className="w-36 h-36 mx-auto rounded-lg border border-slate-300/80 bg-white p-1"
                        />
                      ) : (
                        <div className="w-36 h-36 mx-auto bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
                          Membuat QR...
                        </div>
                      )}
                      <p className="text-[9px] font-mono text-slate-500 tracking-tight">
                        Token: {selectedStudentForCard.qr_token_pribadi || selectedStudentForCard.nis}
                      </p>
                    </div>

                    {/* Footer Kartu */}
                    <p className="text-[8px] text-slate-400 leading-tight">
                      Scan QR ini pada kamera guru untuk validasi presensi harian KBM SIAK Anti-Cheat.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Print & Download & Close) */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 border-t border-slate-200 no-print">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedStudentForCard) {
                      toast.error('Pilih siswa terlebih dahulu.');
                      return;
                    }
                    if (!idCardQrUrl) {
                      toast.warning('Sedang memproses QR code kartu presensi, mohon tunggu beberapa detik...');
                      return;
                    }
                    setTimeout(() => window.print(), 150);
                  }}
                  className="w-full sm:flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Kartu Fisik</span>
                </button>

                {idCardQrUrl && (
                  <a
                    href={idCardQrUrl}
                    download={`QR_Presensi_${selectedStudentForCard.nis}_${(selectedStudentForCard.nama || '').replace(/\s+/g, '_')}.png`}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    title="Unduh QR Code sebagai file gambar PNG"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh QR</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedStudentForCard(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH / EDIT SISWA                            */}
        {/* ========================================================= */}
        {(modalType === 'add_siswa' || modalType === 'edit_siswa') && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
              {/* STICKY HEADER */}
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {modalType === 'add_siswa' ? 'Tambah Siswa Baru' : 'Edit Data Siswa'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {modalType === 'add_siswa' ? 'Daftarkan siswa baru ke kelas' : `Perbarui data NIS: ${formData.nis}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* FORM WITH SCROLLABLE BODY & STICKY FOOTER */}
              <form onSubmit={handleSaveSiswa} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Nomor Induk Siswa (NIS) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={modalType === 'edit_siswa'}
                      value={formData.nis || ''}
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                      placeholder="Contoh: 202409015"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Nama Lengkap Siswa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Contoh: Muhammad Al-Fatih"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Kelas</label>
                    <select
                      value={formData.id_kelas || ''}
                      onChange={(e) => setFormData({ ...formData, id_kelas: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id_kelas} value={c.id_kelas}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status Keaktifan</label>
                    <select
                      value={formData.status_siswa || 'aktif'}
                      onChange={(e) => setFormData({ ...formData, status_siswa: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="lulus">Lulus</option>
                      <option value="alumni">Alumni</option>
                      <option value="pindah">Pindah</option>
                    </select>
                  </div>

                  {/* KONTAK & DATA ORANG TUA / WALI (WHATSAPP NOTIFIKASI) */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kontak Orang Tua / Wali (Notifikasi WhatsApp)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Notifikasi Otomatis
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nomor WhatsApp Ortu
                        </label>
                        <input
                          type="tel"
                          value={formData.no_whatsapp_ortu || ''}
                          onChange={(e) => setFormData({ ...formData, no_whatsapp_ortu: e.target.value })}
                          placeholder="Contoh: 081234567890"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 08xxx atau 628xxx</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nama Orang Tua / Wali
                        </label>
                        <input
                          type="text"
                          value={formData.nama_orang_tua || ''}
                          onChange={(e) => setFormData({ ...formData, nama_orang_tua: e.target.value })}
                          placeholder="Contoh: Bpk. Bambang"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Nama ayah / ibu / wali murid</span>
                      </div>
                    </div>
                  </div>

                  {/* PENGATURAN AKUN & AKSES LOGIN */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pengaturan Akun & Akses Login Siswa</span>
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        Login ID: {formData.nis || 'Sesuai NIS'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-600">Password Login</label>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, account_password: generateRandomPassword() })}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                          >
                            Acak
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.account_password ?? 'password123'}
                          onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                          placeholder="Contoh: siswa123"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Akses Akun</label>
                        <select
                          value={formData.account_status || 'aktif'}
                          onChange={(e) => setFormData({ ...formData, account_status: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                        >
                          <option value="aktif">🟢 Aktif (Bisa Login)</option>
                          <option value="nonaktif">🔴 Nonaktif (Diblokir)</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Siswa dapat login menggunakan <strong>NIS</strong> dan password ini.
                    </p>
                  </div>
                </div>

                {/* STICKY FOOTER */}
                <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Simpan Siswa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH / EDIT GURU                             */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH / EDIT GURU                             */}
        {/* ========================================================= */}
        {(modalType === 'add_guru' || modalType === 'edit_guru') && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
              {/* STICKY HEADER */}
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {modalType === 'add_guru' ? 'Tambah Guru Baru' : 'Edit Data Guru & Penugasan'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {modalType === 'add_guru' ? 'Daftarkan pendidik baru ke database sekolah' : `Perbarui data untuk NIP: ${formData.nip}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  disabled={savingTeacher}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              {/* FORM WITH SCROLLABLE BODY & STICKY FOOTER */}
              <form onSubmit={handleSaveGuru} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor Induk Pegawai (NIP / NUPTK) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={modalType === 'edit_guru' || savingTeacher}
                      value={formData.nip || ''}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      placeholder="Contoh: 198501152010011002"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {modalType === 'edit_guru' && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">NIP tidak dapat diubah (primary key).</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={savingTeacher}
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Contoh: Bpk. Bambang Wijaya, S.Pd"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* PENUGASAN WALI KELAS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penugasan Wali Kelas
                  </label>
                  <select
                    disabled={savingTeacher}
                    value={formData.id_kelas_wali || ''}
                    onChange={(e) => setFormData({ ...formData, id_kelas_wali: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">-- Bukan Wali Kelas (Guru Pengajar Saja) --</option>
                    {classes.map((c) => {
                      const isOtherTeacherWali = c.wali_kelas && c.wali_kelas !== formData.nip;
                      return (
                        <option key={c.id_kelas} value={c.id_kelas}>
                          {c.nama_kelas} (Tingkat {c.tingkat}) {isOtherTeacherWali ? `[Wali Saat Ini: ${c.guru?.nama || c.wali_kelas}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Menetapkan guru ini sebagai wali kelas akan otomatis mengaktifkan fitur pantau presensi kelas di GuruDashboard.
                  </span>
                </div>

                {/* MATA PELAJARAN YANG DIAJAR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Mata Pelajaran yang Diajar / Spesialisasi</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Bisa pilih lebih dari satu</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-300 rounded-2xl space-y-2.5">
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {subjects.map((m) => {
                        const isSelected = (formData.mapel_list || []).includes(m.nama_mapel);
                        return (
                          <button
                            key={m.id_mapel}
                            type="button"
                            disabled={savingTeacher}
                            onClick={() => {
                              const currentList = formData.mapel_list || [];
                              const nextList = isSelected
                                ? currentList.filter((s) => s !== m.nama_mapel)
                                : [...currentList, m.nama_mapel];
                              setFormData({ ...formData, mapel_list: nextList });
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-500/20'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <Plus className="w-3 h-3 text-slate-400" />
                            )}
                            <span>{m.nama_mapel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Ringkasan Mapel Terpilih */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">
                        {(formData.mapel_list || []).length > 0 ? (
                          <>
                            Dipilih ({(formData.mapel_list || []).length}): <strong className="text-blue-700 font-bold">{(formData.mapel_list || []).join(', ')}</strong>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada mapel yang dipilih (opsional)</span>
                        )}
                      </span>
                      {(formData.mapel_list || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, mapel_list: [] })}
                          className="text-rose-600 hover:underline text-[10px] font-bold cursor-pointer shrink-0 ml-2"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mapel ini akan otomatis direkomendasikan saat admin mengatur jadwal KBM di Tab Jadwal Pelajaran.
                  </p>
                </div>

                {/* CHECKBOX TUGAS TAMBAHAN */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tugas Tambahan & Hak Akses Khusus
                  </label>

                  {/* Toggle Guru BK */}
                  <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      disabled={savingTeacher}
                      checked={Boolean(formData.is_bk)}
                      onChange={(e) => setFormData({ ...formData, is_bk: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>Guru Bimbingan Konseling (BK)</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Memberikan akses pemantauan alpa siswa berulang, rekap kehadiran bermasalah, dan pencatatan konseling.
                      </p>
                    </div>
                  </label>
                </div>

                {/* FOTO PROFIL URL (OPSIONAL) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Foto Profil (Opsional)
                  </label>
                  <input
                    type="url"
                    disabled={savingTeacher}
                    value={formData.foto_profil || ''}
                    onChange={(e) => setFormData({ ...formData, foto_profil: e.target.value })}
                    placeholder="https://... (Biarkan kosong untuk avatar default otomatis)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* PENGATURAN AKUN & AKSES LOGIN PENDIDIK */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pengaturan Akun & Akses Login Pendidik</span>
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      Login ID: {formData.nip || 'Sesuai NIP'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600">Password Akun</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, account_password: generateRandomPassword() })}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          Acak
                        </button>
                      </div>
                      <input
                        type="text"
                        disabled={savingTeacher}
                        value={formData.account_password ?? 'password123'}
                        onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                        placeholder="Contoh: guru123 / password"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Akses Akun</label>
                      <select
                        disabled={savingTeacher}
                        value={formData.account_status || 'aktif'}
                        onChange={(e) => setFormData({ ...formData, account_status: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      >
                        <option value="aktif">🟢 Aktif (Dapat Masuk)</option>
                        <option value="nonaktif">🔴 Nonaktif (Diblokir)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Guru dapat login ke aplikasi menggunakan <strong>NIP</strong> dan password ini.
                  </p>
                </div>
              </div>

              {/* STICKY FOOTER */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex gap-2.5">
                <button
                  type="button"
                  disabled={savingTeacher}
                  onClick={() => setModalType(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTeacher}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {savingTeacher ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{modalType === 'add_guru' ? 'Simpan Guru' : 'Perbarui Guru'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* ========================================================= */}
        {/* MODAL LIHAT JADWAL MENGAJAR GURU                          */}
        {/* ========================================================= */}
        {selectedTeacherForSchedule && (() => {
          const t = selectedTeacherForSchedule;
          const assignedClass = classes.find((c) => c.wali_kelas === t.nip);
          const teacherSchedules = schedules.filter(
            (j) => j.id_guru === t.nip || j.guru?.nama === t.nama
          );

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        t.foto_profil ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(t.nama)}`
                      }
                      alt={t.nama}
                      className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-100 bg-slate-100 shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{t.nama}</h3>
                      <p className="text-xs text-slate-500 font-mono">NIP: {t.nip}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeacherForSchedule(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Status Penugasan Guru */}
                <div className="flex flex-wrap items-center gap-2">
                  {assignedClass ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Wali Kelas: {assignedClass.nama_kelas}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs text-slate-500 bg-slate-100">
                      Bukan Wali Kelas
                    </span>
                  )}
                  {t.is_bk && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
                      🌟 Guru Bimbingan Konseling (BK)
                    </span>
                  )}
                </div>

                {/* Tabel Jadwal Mengajar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Jadwal Mengajar KBM ({teacherSchedules.length} Sesi)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherForSchedule(null);
                        setFormData({ id_guru: t.nip });
                        setModalType('add_jadwal');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Jadwal Guru Ini
                    </button>
                  </div>

                  {teacherSchedules.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Belum ada jadwal mengajar terdaftar.</p>
                      <p className="text-[11px] text-slate-400">Guru ini belum dijadwalkan mengajar di kelas manapun.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60 overflow-y-auto pb-1">
                      <table className="w-full min-w-[550px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] sticky top-0">
                          <tr>
                            <th className="p-2.5">Hari & Jam</th>
                            <th className="p-2.5">Kelas</th>
                            <th className="p-2.5">Mata Pelajaran</th>
                            <th className="p-2.5">Batas Hadir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teacherSchedules.map((j) => (
                            <tr key={j.id_jadwal} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-800">
                                {j.hari}, {j.jam_mulai} - {j.jam_selesai}
                              </td>
                              <td className="p-2.5 font-bold text-blue-700">{j.kelas?.nama_kelas}</td>
                              <td className="p-2.5 font-medium text-slate-700">{j.mata_pelajaran?.nama_mapel}</td>
                              <td className="p-2.5 font-mono text-rose-600 font-bold">{j.batas_terlambat}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacherForSchedule(null);
                      setSelectedTeacherForSchedulePrint(t);
                      setSchedulePrintMode('single');
                      setSchedulePrintModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    title="Buka Dokumen Resmi Jadwal Guru (PDF & Excel)"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Buka Lembar Jadwal (PDF & Excel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTeacherForSchedule(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH KELAS                                   */}
        {/* ========================================================= */}
        {modalType === 'add_kelas' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {formData.id_kelas ? 'Edit Kelas & Wali Kelas' : 'Tambah Kelas Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {formData.id_kelas ? 'Perbarui tingkat jenjang, peminatan (IPA/IPS), atau guru wali kelas' : 'Pilih tingkat (VII, VIII, IX), jurusan (IPA/IPS), dan tentukan wali kelas'}
                  </p>
                </div>
                <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleSaveKelas} className="space-y-4">
                {/* 1. PILIHAN TINGKAT JENJANG KELAS: VII, VIII, IX */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Pilih Tingkat Kelas <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 7, roman: 'VII', label: 'Tujuh' },
                      { val: 8, roman: 'VIII', label: 'Delapan' },
                      { val: 9, roman: 'IX', label: 'Sembilan' },
                    ].map((t) => {
                      const isSelected = (parseInt(formData.tingkat) || 7) === t.val;
                      return (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => {
                            const curJurusan = formData.jurusan || 'IPA';
                            const curParalel = formData.paralel || '1';
                            const newNama = `${t.roman}-${curJurusan}-${curParalel}`;
                            setFormData((prev) => ({
                              ...prev,
                              tingkat: t.val,
                              nama_kelas: newNama,
                            }));
                          }}
                          className={`py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 font-black ring-2 ring-blue-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium'
                          }`}
                        >
                          <div className="text-sm font-extrabold">{t.roman}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>({t.label})</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. PILIHAN JURUSAN / PEMINATAN: IPA / IPS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Pilih Peminatan / Jurusan <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'IPA', name: 'Ilmu Pengetahuan Alam' },
                      { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' },
                    ].map((j) => {
                      const isSelected = (formData.jurusan || 'IPA') === j.code;
                      const romanMap = { 7: 'VII', 8: 'VIII', 9: 'IX' };
                      return (
                        <button
                          key={j.code}
                          type="button"
                          onClick={() => {
                            const curTingkat = parseInt(formData.tingkat) || 7;
                            const roman = romanMap[curTingkat] || 'VII';
                            const curParalel = formData.paralel || '1';
                            const newNama = `${roman}-${j.code}-${curParalel}`;
                            setFormData((prev) => ({
                              ...prev,
                              jurusan: j.code,
                              nama_kelas: newNama,
                            }));
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? j.code === 'IPA'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-300'
                                : 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200 ring-2 ring-amber-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black tracking-wide">{j.code}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isSelected ? '✓ Terpilih' : 'Pilih'}
                            </span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {j.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. NOMOR / KODE PARALEL KELAS CEPAT */}
                {/* 3. NOMOR / KODE PARALEL KELAS (PILIHAN ANGKA / HURUF + DINAMIS) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      3. Kode / Nomor Paralel Kelas <span className="text-rose-500">*</span>
                    </label>
                    {/* Toggle format: Angka vs Huruf */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setParalelFormat('angka');
                          const curTingkat = parseInt(formData.tingkat) || 7;
                          const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' }[curTingkat] || 'VII';
                          const curJurusan = formData.jurusan || 'IPA';
                          const defaultNum = paralelNumbers[0] || '1';
                          setFormData((prev) => ({
                            ...prev,
                            paralel: defaultNum,
                            nama_kelas: `${roman}-${curJurusan}-${defaultNum}`,
                          }));
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          paralelFormat === 'angka'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        🔢 Angka (1, 2, 3...)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setParalelFormat('huruf');
                          const curTingkat = parseInt(formData.tingkat) || 7;
                          const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' }[curTingkat] || 'VII';
                          const curJurusan = formData.jurusan || 'IPA';
                          const defaultLetter = paralelLetters[0] || 'A';
                          setFormData((prev) => ({
                            ...prev,
                            paralel: defaultLetter,
                            nama_kelas: `${roman}-${curJurusan}-${defaultLetter}`,
                          }));
                        }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          paralelFormat === 'huruf'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        🔤 Huruf (A, B, C...)
                      </button>
                    </div>
                  </div>

                  {/* List of buttons according to active format */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(paralelFormat === 'angka' ? paralelNumbers : paralelLetters).map((code) => {
                        const isSelected = (formData.paralel || '').toString().toUpperCase() === code.toString().toUpperCase();
                        const romanMap = { 7: 'VII', 8: 'VIII', 9: 'IX' };
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              const curTingkat = parseInt(formData.tingkat) || 7;
                              const roman = romanMap[curTingkat] || 'VII';
                              const curJurusan = formData.jurusan || 'IPA';
                              const newNama = `${roman}-${curJurusan}-${code}`;
                              setCustomParalelInput('');
                              setFormData((prev) => ({
                                ...prev,
                                paralel: code,
                                nama_kelas: newNama,
                              }));
                            }}
                            className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800 text-white shadow-sm ring-2 ring-blue-500 ring-offset-1 scale-105'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {code}
                          </button>
                        );
                      })}

                      {/* Tombol Tambah Pilihan Paralel Kelas berikutnya jika kelas ada lebih banyak */}
                      {paralelFormat === 'angka' ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextNum = (paralelNumbers.length + 1).toString();
                            if (!paralelNumbers.includes(nextNum)) {
                              setParalelNumbers((prev) => [...prev, nextNum]);
                              const curTingkat = parseInt(formData.tingkat) || 7;
                              const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' }[curTingkat] || 'VII';
                              const curJurusan = formData.jurusan || 'IPA';
                              setFormData((prev) => ({
                                ...prev,
                                paralel: nextNum,
                                nama_kelas: `${roman}-${curJurusan}-${nextNum}`,
                              }));
                            }
                          }}
                          className="h-9 px-3 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-dashed border-blue-300 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Tambah pilihan nomor kelas berikutnya"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah {paralelNumbers.length + 1}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (paralelLetters.length < 26) {
                              const nextChar = String.fromCharCode(65 + paralelLetters.length);
                              if (!paralelLetters.includes(nextChar)) {
                                setParalelLetters((prev) => [...prev, nextChar]);
                                const curTingkat = parseInt(formData.tingkat) || 7;
                                const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' }[curTingkat] || 'VII';
                                const curJurusan = formData.jurusan || 'IPA';
                                setFormData((prev) => ({
                                  ...prev,
                                  paralel: nextChar,
                                  nama_kelas: `${roman}-${curJurusan}-${nextChar}`,
                                }));
                              }
                            }
                          }}
                          className="h-9 px-3 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-dashed border-blue-300 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Tambah pilihan huruf kelas berikutnya"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah {String.fromCharCode(65 + paralelLetters.length)}</span>
                        </button>
                      )}
                    </div>

                    {/* Input manual kode paralel kelas kustom */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 shrink-0">Atau ketik kustom:</span>
                      <input
                        type="text"
                        value={customParalelInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomParalelInput(val);
                          if (val.trim()) {
                            const curTingkat = parseInt(formData.tingkat) || 7;
                            const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' }[curTingkat] || 'VII';
                            const curJurusan = formData.jurusan || 'IPA';
                            setFormData((prev) => ({
                              ...prev,
                              paralel: val.trim(),
                              nama_kelas: `${roman}-${curJurusan}-${val.trim()}`,
                            }));
                          }
                        }}
                        placeholder="Misal: 6, F, Unggulan, Tahfidz..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. NAMA KELAS (INPUT & LIVE PREVIEW) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Nama Kelas</label>
                    <span className="text-[10px] text-slate-400">Bisa diedit manual jika perlu</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.nama_kelas || ''}
                    onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                    placeholder="Contoh: VII-IPA-1, VIII-IPS-2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {formData.nama_kelas && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400">Preview:</span>
                      <strong className="text-blue-700">{formData.nama_kelas}</strong>
                      <span className="text-slate-300">•</span>
                      <span>Kelas {(parseInt(formData.tingkat) || 7) === 7 ? 'VII (Tujuh)' : (parseInt(formData.tingkat) || 7) === 8 ? 'VIII (Delapan)' : 'IX (Sembilan)'}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`font-semibold ${(formData.jurusan || 'IPA') === 'IPA' ? 'text-emerald-700' : 'text-amber-700'}`}>{formData.jurusan || 'IPA'}</span>
                    </div>
                  )}
                </div>

                {/* 5. GURU WALI KELAS */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Guru Wali Kelas</label>
                    {formData.wali_kelas && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, wali_kelas: '' })}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Kosongkan Wali Kelas
                      </button>
                    )}
                  </div>
                  <select
                    value={formData.wali_kelas || ''}
                    onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  >
                    <option value="">-- Belum Ada Wali Kelas (Bisa Ditentukan Nanti) --</option>
                    {teachers.map((t) => (
                      <option key={t.nip} value={t.nip}>{t.nama} ({t.nip})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pilih guru yang bertanggung jawab sebagai wali kelas ini, atau kosongkan jika belum ditentukan.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 cursor-pointer transition-colors"
                  >
                    {formData.id_kelas ? 'Perbarui Kelas' : 'Simpan Kelas'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH MAPEL                                   */}
        {/* ========================================================= */}
        {modalType === 'add_mapel' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Tambah Mata Pelajaran</h3>
                    <p className="text-[11px] text-slate-400">Masukkan nama mata pelajaran baru</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  disabled={savingMapel}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMapel} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    disabled={savingMapel}
                    value={formData.nama_mapel || ''}
                    onChange={(e) => setFormData({ ...formData, nama_mapel: e.target.value })}
                    placeholder="Contoh: Fisika / Bahasa Inggris / Seni Budaya"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mapel yang disimpan akan langsung tersedia di menu pembuatan jadwal dan kalender presensi kelas.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={savingMapel}
                    onClick={() => setModalType(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingMapel}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {savingMapel ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Mapel</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL FORM TAMBAH JADWAL                                  */}
        {/* ========================================================= */}
        {modalType === 'add_jadwal' && (() => {
          // 1. Rekomendasi Guru berdasarkan Mapel yang dipilih
          const selectedMapelObj = subjects.find((m) => m.id_mapel === formData.id_mapel);
          const mapelName = selectedMapelObj?.nama_mapel;

          const recommendedTeachers = teachers.filter((t) => {
            if (!formData.id_mapel) return false;
            const explicitList = [
              ...(t.mapel_list || []),
              ...(t.mapel_utama ? t.mapel_utama.split(',').map((s) => s.trim()).filter(Boolean) : [])
            ];
            const hasInExplicit = mapelName && explicitList.includes(mapelName);
            const hasInSchedules = schedules.some(
              (j) =>
                (j.id_guru === t.nip || j.guru?.nama === t.nama) &&
                (j.id_mapel === formData.id_mapel || j.mata_pelajaran?.nama_mapel === mapelName)
            );
            return hasInExplicit || hasInSchedules;
          });
          const otherTeachers = teachers.filter((t) => !recommendedTeachers.some((rt) => rt.nip === t.nip));

          // 2. Deteksi Bentrok Live Preview
          const curHari = formData.hari || 'Senin';
          const curStart = formData.jam_mulai || '07:30';
          const curEnd = formData.jam_selesai || '09:00';

          function isOverlapping(s1, e1, s2, e2) {
            return s1 < e2 && s2 < e1;
          }

          let conflictWarning = null;
          if (curStart && curEnd && curStart >= curEnd) {
            conflictWarning = {
              type: 'time',
              message: 'Jam selesai KBM harus lebih akhir dari jam mulai!'
            };
          } else if (formData.id_guru && curStart && curEnd) {
            const conflictTeacher = schedules.find((j) => {
              if (formData.id_jadwal && j.id_jadwal === formData.id_jadwal) return false;
              return (
                (j.id_guru === formData.id_guru || j.guru?.nama === teachers.find(t => t.nip === formData.id_guru)?.nama) &&
                j.hari === curHari &&
                isOverlapping(curStart, curEnd, j.jam_mulai, j.jam_selesai)
              );
            });
            if (conflictTeacher) {
              const teacherName = teachers.find((t) => t.nip === formData.id_guru)?.nama || 'Guru ini';
              const targetClass = conflictTeacher.kelas?.nama_kelas || 'kelas lain';
              conflictWarning = {
                type: 'guru',
                message: `Bentrok Jadwal Guru: ${teacherName} sudah mengajar di ${targetClass} pada hari ${curHari} pukul ${conflictTeacher.jam_mulai} - ${conflictTeacher.jam_selesai}.`
              };
            }
          }

          if (!conflictWarning && formData.id_kelas && curStart && curEnd && curStart < curEnd) {
            const conflictClass = schedules.find((j) => {
              if (formData.id_jadwal && j.id_jadwal === formData.id_jadwal) return false;
              return (
                j.id_kelas === formData.id_kelas &&
                j.hari === curHari &&
                isOverlapping(curStart, curEnd, j.jam_mulai, j.jam_selesai)
              );
            });
            if (conflictClass) {
              const mapelConflict = conflictClass.mata_pelajaran?.nama_mapel || 'mapel lain';
              conflictWarning = {
                type: 'kelas',
                message: `Bentrok Jadwal: Kelas ini sudah ada KBM "${mapelConflict}" pada hari ${curHari} pukul ${conflictClass.jam_mulai} - ${conflictClass.jam_selesai}.`
              };
            }
          }

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        {formData.id_jadwal ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
                      </h3>
                      <p className="text-[11px] text-slate-400">Atur alokasi kelas, mapel, & guru pengampu</p>
                    </div>
                  </div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">✕</button>
                </div>

                <form onSubmit={handleSaveJadwal} className="space-y-3.5">
                  {/* Pilihan Kelas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kelas <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={formData.id_kelas || ''}
                      onChange={(e) => setFormData({ ...formData, id_kelas: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((c) => (
                        <option key={c.id_kelas} value={c.id_kelas}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
                      ))}
                    </select>
                  </div>

                  {/* Pilihan Mata Pelajaran */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Mata Pelajaran <span className="text-rose-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({});
                          setModalType('add_mapel');
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        + Buat Mapel Baru
                      </button>
                    </div>
                    <select
                      required
                      value={formData.id_mapel || ''}
                      onChange={(e) => {
                        const newMapelId = e.target.value;
                        const newMapel = subjects.find(s => s.id_mapel === newMapelId);
                        // Cek jika ada guru yang sudah mengajar mapel ini, kita sarankan
                        const autoTeacher = teachers.find(t =>
                          schedules.some(j => (j.id_guru === t.nip || j.guru?.nama === t.nama) && (j.id_mapel === newMapelId || j.mata_pelajaran?.nama_mapel === newMapel?.nama_mapel))
                        );
                        setFormData({
                          ...formData,
                          id_mapel: newMapelId,
                          id_guru: autoTeacher ? autoTeacher.nip : formData.id_guru
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {subjects.map((m) => (
                        <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pilihan Guru Pengajar dengan Smart Grouping & Rekomendasi */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Guru Pengajar <span className="text-rose-500">*</span></label>
                      {recommendedTeachers.length > 0 && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {recommendedTeachers.length} Guru Spesialis
                        </span>
                      )}
                    </div>
                    <select
                      required
                      value={formData.id_guru || ''}
                      onChange={(e) => setFormData({ ...formData, id_guru: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Pilih Guru Pengajar --</option>
                      {recommendedTeachers.length > 0 && (
                        <optgroup label="⭐ Guru Pengampu Mapel Ini (Direkomendasikan)">
                          {recommendedTeachers.map((t) => (
                            <option key={t.nip} value={t.nip}>
                              ⭐ {t.nama}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={recommendedTeachers.length > 0 ? "👥 Guru Pendidik Lainnya" : "Daftar Seluruh Guru"}>
                        {otherTeachers.map((t) => (
                          <option key={t.nip} value={t.nip}>{t.nama}</option>
                        ))}
                      </optgroup>
                    </select>

                    {/* Hint Rekomendasi Guru */}
                    {formData.id_mapel && recommendedTeachers.length > 0 && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 mt-1.5 flex items-center justify-between">
                        <span>💡 Rekomendasi: <strong>{recommendedTeachers.map(t => t.nama).join(', ')}</strong></span>
                        {formData.id_guru !== recommendedTeachers[0].nip && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, id_guru: recommendedTeachers[0].nip })}
                            className="text-[10px] font-bold underline hover:text-emerald-900 cursor-pointer"
                          >
                            Pilih
                          </button>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Hari & Batas Terlambat */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hari KBM</label>
                      <select
                        value={formData.hari || 'Senin'}
                        onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      >
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Batas Terlambat</label>
                      <input
                        type="time"
                        value={formData.batas_terlambat || '07:45'}
                        onChange={(e) => setFormData({ ...formData, batas_terlambat: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Jam Mulai & Jam Selesai */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai KBM</label>
                      <input
                        type="time"
                        value={formData.jam_mulai || '07:30'}
                        onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai KBM</label>
                      <input
                        type="time"
                        value={formData.jam_selesai || '09:00'}
                        onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* LIVE CONFLICT INDICATOR */}
                  {conflictWarning ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block">Peringatan Bentrok Waktu KBM</span>
                        <span className="text-[11px] leading-tight block">{conflictWarning.message}</span>
                      </div>
                    </div>
                  ) : formData.id_kelas && formData.id_mapel && formData.id_guru ? (
                    <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Jadwal KBM bebas bentrok dan aman disimpan!</span>
                    </div>
                  ) : null}

                  {/* Tombol Aksi */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {formData.id_jadwal ? 'Perbarui Jadwal' : 'Simpan Jadwal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL KELOLA AKUN & KREDENSIAL LOGIN (GURU & SISWA)       */}
        {/* ========================================================= */}
        {modalType === 'manage_account' && selectedAccountForManage && (() => {
          const acc = selectedAccountForManage;
          const isGuru = acc.role === 'guru';
          const idLabel = isGuru ? 'NIP' : 'NIS';

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
                {/* STICKY HEADER */}
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Kelola Akun & Login</h3>
                      <p className="text-[11px] text-slate-400">
                        Atur akses login untuk {isGuru ? 'Bpk/Ibu Guru' : 'Siswa'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null);
                      setSelectedAccountForManage(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* FORM WITH SCROLLABLE BODY & STICKY FOOTER */}
                <form onSubmit={handleSaveManagedAccount} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                    {/* Profile Snapshot Card */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isGuru ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isGuru ? 'Pendidik / Guru' : 'Siswa / Murid'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {acc.status === 'aktif' ? '🟢 Akses Aktif' : '🔴 Diblokir'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{acc.nama}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 font-mono">
                          <span>{idLabel}: {acc.id}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(acc.id);
                              toast.success(`${idLabel} berhasil disalin!`);
                            }}
                            title={`Salin ${idLabel}`}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Akun (Opsional)
                      </label>
                      <input
                        type="email"
                        value={acc.email || ''}
                        onChange={(e) =>
                          setSelectedAccountForManage({ ...acc, email: e.target.value })
                        }
                        placeholder={`contoh: ${acc.id}@sekolah.id`}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Password Baru</label>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAccountForManage({
                              ...acc,
                              password: generateRandomPassword(),
                            })
                          }
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          Generate Acak
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showAccountPassword ? 'text' : 'password'}
                          required
                          value={acc.password || ''}
                          onChange={(e) =>
                            setSelectedAccountForManage({ ...acc, password: e.target.value })
                          }
                          placeholder="Masukkan password login baru"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountPassword(!showAccountPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showAccountPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Status Keaktifan Akun
                      </label>
                      <select
                        value={acc.status || 'aktif'}
                        onChange={(e) =>
                          setSelectedAccountForManage({ ...acc, status: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                      >
                        <option value="aktif">🟢 Aktif (Bisa Login ke Aplikasi)</option>
                        <option value="nonaktif">🔴 Nonaktif / Diblokir (Dilarang Masuk)</option>
                      </select>
                    </div>

                    {/* Device Binding Status (Khusus Murid) */}
                    {!isGuru && (
                      <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-600" />
                          <span className="text-[11px] font-bold text-purple-900">
                            {acc.device_id ? 'Perangkat Terikat (HP Siswa)' : 'Belum Terikat ke HP'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnbindDevice(acc.raw)}
                          className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Reset Binding
                        </button>
                      </div>
                    )}

                    {/* Tombol Salin Kredensial WhatsApp */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kirim Akses ke Pengguna</span>
                        </span>
                        {copiedWaText && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold animate-in fade-in flex items-center gap-1">
                            <Check className="w-3 h-3" /> Tersalin!
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCredentialWhatsApp(acc)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Salin Format Kredensial WhatsApp</span>
                      </button>
                      <p className="text-[10px] text-emerald-800 leading-tight">
                        Teks berisi nama, ID ({idLabel}), password, dan link web aplikasi otomatis siap di-paste ke chat WA.
                      </p>
                    </div>
                  </div>

                  {/* STICKY FOOTER */}
                  <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalType(null);
                        setSelectedAccountForManage(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Kredensial</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL PENUGASAN GURU INVAL / PENGGANTI (ADMIN)            */}
        {/* ========================================================= */}
        {modalType === 'assign_inval' && selectedJadwalForInval && (() => {
          const j = selectedJadwalForInval;
          const activeInval = invalAssignments.find(
            (inv) => inv.id_jadwal === j.id_jadwal && inv.status === 'aktif' && inv.tanggal === getTodayDateString()
          );

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in">
                {/* HEADER */}
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Tugaskan Guru Inval / Pengganti</h3>
                      <p className="text-[11px] text-slate-500">
                        Atur guru pengganti saat pengampu utama berhalangan hadir
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalType(null);
                      setSelectedJadwalForInval(null);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSaveInval} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1">
                    {/* Ringkasan Sesi KBM */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                          {j.hari}, {j.jam_mulai} - {j.jam_selesai}
                        </span>
                        <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          Kelas {j.kelas?.nama_kelas}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {j.mata_pelajaran?.nama_mapel}
                      </h4>
                      <p className="text-slate-500 flex items-center gap-1">
                        <span>Guru Pengampu Asli:</span>
                        <strong className="text-slate-700">{j.guru?.nama}</strong>
                      </p>
                    </div>

                    {activeInval && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-800">
                        <div>
                          <p className="font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Sesi ini sedang di-inval oleh:
                          </p>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {activeInval.nama_guru_pengganti} ({activeInval.alasan_utama})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelInval(activeInval.id)}
                          className="px-2.5 py-1 bg-white text-rose-600 border border-rose-200 rounded-lg font-bold hover:bg-rose-50 text-[11px] cursor-pointer"
                        >
                          Cabut Inval
                        </button>
                      </div>
                    )}

                    {/* 1. Alasan Guru Utama Berhalangan */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Alasan Guru Utama Tidak Masuk
                      </label>
                      <select
                        value={invalFormData.alasan}
                        onChange={(e) => setInvalFormData((prev) => ({ ...prev, alasan: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Sakit">Sakit (S)</option>
                        <option value="Izin">Izin Keperluan Keluarga (I)</option>
                        <option value="Tugas Dinas Luar">Tugas Dinas Luar / Pelatihan (DL)</option>
                        <option value="Keperluan Mendesak">Keperluan Mendesak</option>
                        <option value="Cuti">Cuti Resmi</option>
                      </select>
                    </div>

                    {/* 2. Pilih Guru Pengganti */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pilih Guru Pengganti (Inval)
                      </label>
                      <select
                        value={invalFormData.id_guru_pengganti}
                        onChange={(e) => setInvalFormData((prev) => ({ ...prev, id_guru_pengganti: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">-- Pilih Bpk/Ibu Guru Pengganti --</option>
                        {teachers.map((t) => (
                          <option key={t.nip} value={t.nip} disabled={t.nip === j.id_guru}>
                            {t.nama} {t.nip === j.id_guru ? '(Guru Asli Sesi Ini)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Guru pengganti akan otomatis menerima penugasan kelas ini di portal Guru Dashboard mereka.
                      </p>
                    </div>

                    {/* 3. Catatan / Lembar Tugas KBM */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Catatan Materi / Instruksi Tugas (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={invalFormData.catatan}
                        onChange={(e) => setInvalFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                        placeholder="Contoh: Kerjakan LKS Bab 3 hal 45, kumpulkan ke meja guru..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalType(null);
                        setSelectedJadwalForInval(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{activeInval ? 'Perbarui Inval' : 'Tugaskan Guru Inval'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL REKAPITULASI PRESENSI KELAS (EXCEL & PDF)           */}
        {/* ========================================================= */}
        <ClassAttendanceReportModal
          isOpen={Boolean(selectedClassForReport)}
          onClose={() => setSelectedClassForReport(null)}
          kelas={selectedClassForReport}
          schoolSettings={settings}
          isAdmin={true}
        />

        {/* ========================================================= */}
        {/* MODAL REKAPITULASI PRESENSI INDIVIDU SISWA (PDF DOKUMEN)   */}
        {/* ========================================================= */}
        <StudentAttendancePdfModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false);
            setSelectedStudentForPdf(null);
          }}
          initialStudent={selectedStudentForPdf}
          allStudents={students}
          classes={classes}
          teachers={teachers}
          schoolSettings={settings}
          holidays={holidays}
        />

        {/* ========================================================= */}
        {/* MODAL ADMIN QUEST BUILDER (KELOLA & TAMBAH MISI KUSTOM)   */}
        {/* ========================================================= */}
        <AdminQuestBuilderModal
          isOpen={isQuestBuilderModalOpen}
          onClose={() => setIsQuestBuilderModalOpen(false)}
          schoolSettings={settings}
          onMissionsUpdated={(updated) => setCustomMissionsList(updated)}
        />

        {/* ========================================================= */}
        {/* MODAL PLOTTING & PENEMPATAN KELAS SISWA (DEDIKASI)        */}
        {/* ========================================================= */}
        {isPlottingModalOpen && selectedStudentForPlotting && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <FolderInput className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Plotting & Penempatan Kelas</h3>
                    <p className="text-xs text-slate-400">
                      Penetapan kelas siswa tanpa merubah identitas profil
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlottingModalOpen(false);
                    setSelectedStudentForPlotting(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSavePlotting} className="p-5 sm:p-6 space-y-5">
                {/* Kartu Profil Singkat Siswa */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                    {selectedStudentForPlotting.nama?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {selectedStudentForPlotting.nama}
                    </h4>
                    <p className="text-xs font-mono text-slate-500">
                      NIS: {selectedStudentForPlotting.nis} {selectedStudentForPlotting.nisn ? `• NISN: ${selectedStudentForPlotting.nisn}` : ''}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Kelas Saat Ini:</span>
                      {selectedStudentForPlotting.kelas?.nama_kelas ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Kelas {selectedStudentForPlotting.kelas.nama_kelas}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          ⚠️ Belum Ada Kelas (Isi Nanti)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pilihan Kelas Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tentukan Kelas Baru / Status Penempatan
                  </label>
                  <select
                    value={plottingTargetKelas}
                    onChange={(e) => setPlottingTargetKelas(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="">⏱️ Tunda Penempatan / Kosongkan Kelas (Isi Nanti)</option>
                    {/* Kelompokkan kelas terurut */}
                    {classes.map((cls) => {
                      const count = students.filter((st) => st.id_kelas === cls.id_kelas).length;
                      return (
                        <option key={cls.id_kelas} value={cls.id_kelas}>
                          Kelas {cls.nama_kelas} (Tingkat {cls.tingkat || '-'}) • Saat ini {count} siswa
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Penjelasan Informatif */}
                {plottingTargetKelas === '' ? (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>⏱️ Mode Penundaan (Isi Nanti)</span>
                    </p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Siswa akan tetap berstatus aktif namun tidak terafiliasi dengan kelas manapun. Cocok jika pembagian kelas baru masih dalam proses musyawarah atau seleksi peminatan.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>✓ Penempatan Langsung</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Siswa akan langsung dipindahkan ke <strong>Kelas {classes.find((c) => String(c.id_kelas) === String(plottingTargetKelas))?.nama_kelas || ''}</strong> dan presensi/jadwalnya akan otomatis mengikuti kelas tersebut.
                    </p>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlottingModalOpen(false);
                      setSelectedStudentForPlotting(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPlotting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {savingPlotting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Simpan Penempatan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ========================================================= */}
        {/* MODAL PENETAPAN TAHUN AJARAN & SEMESTER AKTIF (DEDIKASI)  */}
        {/* ========================================================= */}
        {isAcademicPeriodModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header Modal */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shadow-xs">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Tetapkan Tahun Ajaran & Semester
                    </h3>
                    <p className="text-xs text-slate-400">
                      Konfigurasi periode akademik dan rentang tanggal KBM aktif
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAcademicPeriodModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Modal */}
              <form onSubmit={handleSaveAcademicPeriod} className="p-5 sm:p-6 space-y-4">
                {/* Preset Cepat */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pilihan Cepat Standar Kalender Pendidikan (Kaldik)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAcademicPeriodForm({
                          tahun_ajaran_aktif: '2026/2027',
                          semester_aktif: 'Ganjil',
                          semester_mulai: '2026-07-13',
                          semester_selesai: '2026-12-19',
                          tanggal_bagi_rapor: '2026-12-19',
                        })
                      }
                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-left transition-all cursor-pointer text-xs font-semibold"
                    >
                      <span className="font-bold block text-blue-700">2026/2027 Ganjil</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">13 Jul - 19 Des 2026</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAcademicPeriodForm({
                          tahun_ajaran_aktif: '2026/2027',
                          semester_aktif: 'Genap',
                          semester_mulai: '2027-01-04',
                          semester_selesai: '2027-06-19',
                          tanggal_bagi_rapor: '2027-06-19',
                        })
                      }
                      className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-left transition-all cursor-pointer text-xs font-semibold"
                    >
                      <span className="font-bold block text-indigo-700">2026/2027 Genap</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">04 Jan - 19 Jun 2027</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAcademicPeriodForm({
                          tahun_ajaran_aktif: '2027/2028',
                          semester_aktif: 'Ganjil',
                          semester_mulai: '2027-07-12',
                          semester_selesai: '2027-12-18',
                          tanggal_bagi_rapor: '2027-12-18',
                        })
                      }
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left transition-all cursor-pointer text-xs font-semibold"
                    >
                      <span className="font-bold block text-slate-700">2027/2028 Ganjil</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">12 Jul - 18 Des 2027</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 my-1" />

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tahun Ajaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={academicPeriodForm.tahun_ajaran_aktif}
                      onChange={(e) =>
                        setAcademicPeriodForm((prev) => ({ ...prev, tahun_ajaran_aktif: e.target.value }))
                      }
                      placeholder="Contoh: 2026/2027"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={academicPeriodForm.semester_aktif}
                      onChange={(e) =>
                        setAcademicPeriodForm((prev) => ({ ...prev, semester_aktif: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Ganjil">Semester Ganjil (Semester 1)</option>
                      <option value="Genap">Semester Genap (Semester 2)</option>
                    </select>
                  </div>
                </div>

                {/* Rentang Tanggal Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Mulai Semester <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={academicPeriodForm.semester_mulai}
                      onChange={(e) =>
                        setAcademicPeriodForm((prev) => ({ ...prev, semester_mulai: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Akhir Semester (KBM) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={academicPeriodForm.semester_selesai}
                      onChange={(e) =>
                        setAcademicPeriodForm((prev) => ({ ...prev, semester_selesai: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Titimangsa Rapor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pembagian Rapor / Titimangsa Rekap Absensi
                  </label>
                  <input
                    type="date"
                    value={academicPeriodForm.tanggal_bagi_rapor}
                    onChange={(e) =>
                      setAcademicPeriodForm((prev) => ({ ...prev, tanggal_bagi_rapor: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tanggal ini dicetak otomatis pada tanda tangan Kepala Sekolah di lembar rekapitulasi presensi.
                  </p>
                </div>

                {/* Catatan Dampak Sistem */}
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>💡 Dampak Penetapan Ini:</span>
                  </p>
                  <ul className="text-[11px] text-blue-800 list-disc list-inside space-y-0.5 leading-relaxed">
                    <li>Otomatis menjadi rentang filter default saat mencetak Laporan Rekap Presensi.</li>
                    <li>Ditampilkan di kop surat resmi PDF/Excel dan identitas dashboard seluruh role.</li>
                    <li>Tersinkronisasi langsung ke database dan memori sistem.</li>
                  </ul>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAcademicPeriodModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingAcademicPeriod}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {savingAcademicPeriod ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Terapkan Periode Aktif</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL SHOWCASE ACHIEVEMENT & RAPOR SIKAP SISWA            */}
        {/* ========================================================= */}
        <StudentAchievementModal
          isOpen={Boolean(selectedStudentForAchievement)}
          onClose={() => setSelectedStudentForAchievement(null)}
          student={selectedStudentForAchievement}
          tahunAjaran={settings.tahun_ajaran_aktif}
          semesterAktif={settings.semester_aktif}
        />

        {/* ========================================================= */}
        {/* MODAL QUEST BUILDER (MISI KUSTOM KALENDER ADMIN)          */}
        {/* ========================================================= */}
        <AdminQuestBuilderModal
          isOpen={isQuestBuilderModalOpen}
          onClose={() => setIsQuestBuilderModalOpen(false)}
          schoolSettings={settings}
          holidays={holidays}
          onMissionsUpdated={(updatedList) => {
            setCustomMissionsList(updatedList);
          }}
        />

        {/* ========================================================= */}
        {/* MODAL CETAK JADWAL MENGAJAR GURU RESMI (PDF & EXCEL)      */}
        {/* ========================================================= */}
        <TeacherScheduleReportModal
          isOpen={schedulePrintModalOpen || Boolean(selectedTeacherForSchedulePrint)}
          onClose={() => {
            setSelectedTeacherForSchedulePrint(null);
            setSchedulePrintModalOpen(false);
          }}
          teacher={selectedTeacherForSchedulePrint}
          teachers={teachers}
          schedules={schedules}
          classes={classes}
          subjects={subjects}
          schoolSettings={settings}
          initialMode={schedulePrintMode}
        />

        {/* ========================================================= */}
        {/* MODAL CETAK JADWAL PELAJARAN KELAS RESMI (PDF & EXCEL)    */}
        {/* ========================================================= */}
        <ClassScheduleReportModal
          isOpen={classSchedulePrintModalOpen || Boolean(selectedClassForSchedulePrint)}
          onClose={() => {
            setSelectedClassForSchedulePrint(null);
            setClassSchedulePrintModalOpen(false);
          }}
          selectedClass={
            selectedClassForSchedulePrint ||
            classes.find((c) => String(c.id_kelas) === String(selectedKelasForJadwal)) ||
            (classes.length > 0 ? classes[0] : null)
          }
          classes={classes}
          schedules={schedules}
          teachers={teachers}
          subjects={subjects}
          schoolSettings={settings}
          initialMode={classSchedulePrintMode}
        />
        </main>
      </div>
    </div>
  );
}
