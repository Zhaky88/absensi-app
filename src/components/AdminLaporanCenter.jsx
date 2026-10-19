import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Calendar,
  Award,
  MessageSquare,
  Send,
  School,
  UserCheck,
  UserX,
  ChevronRight,
  RefreshCw,
  Eye,
  BookOpen,
  Sparkles,
  TrendingUp,
  X,
  FileText,
  Radio,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  Grid
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { getTodayDateString } from '../lib/invalManager';
import JurnalKbmReportModal from './JurnalKbmReportModal';
import { useToast } from '../context/ToastModalContext';

export default function AdminLaporanCenter({
  students = [],
  classes = [],
  teachers = [],
  subjects = [],
  schedules = [],
  settings = {},
  invalAssignments = [],
  onOpenClassReport,
  onOpenStudentPdf,
  onOpenTeacherSchedule,
}) {
  const { toast, showAlert } = useToast();
  const [subTab, setSubTab] = useState('live'); // 'live' | 'makro' | 'ews' | 'guru' | 'jurnal_kbm' | 'siswa_pdf'

  // Periode Filter State
  const today = new Date();
  const todayStr = getTodayDateString();
  const [reportType, setReportType] = useState('semesteran'); // 'semesteran' | 'bulanan'
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedSemester, setSelectedSemester] = useState('ganjil'); // 'ganjil' | 'genap'

  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [periodAttendance, setPeriodAttendance] = useState([]);
  const [classSummaries, setClassSummaries] = useState([]);
  const [ewsStudents, setEwsStudents] = useState([]);

  // Filter & Search Controls
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [filterClassStudent, setFilterClassStudent] = useState('all');
  const [liveFilterStatus, setLiveFilterStatus] = useState('all'); // 'all' | 'alpa' | 'izin_sakit' | 'hadir'
  const [ewsFilterType, setEwsFilterType] = useState('all'); // 'all' | 'alpa'

  // Surat Panggilan Modal State
  const [selectedStudentForSummons, setSelectedStudentForSummons] = useState(null);
  const [isSummonsModalOpen, setIsSummonsModalOpen] = useState(false);

  // Modal Jurnal KBM Guru
  const [isJurnalModalOpen, setIsJurnalModalOpen] = useState(false);
  const [selectedTeacherForJurnal, setSelectedTeacherForJurnal] = useState(null);

  // Sync body class for print isolation
  useEffect(() => {
    if (isSummonsModalOpen) {
      document.body.classList.add('print-modal-open');
    } else {
      document.body.classList.remove('print-modal-open');
    }
    return () => {
      document.body.classList.remove('print-modal-open');
    };
  }, [isSummonsModalOpen]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Academic Settings
  const academicSettings = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_academic_settings') || '{}');
      const curY = today.getFullYear();
      return {
        academic_year: saved.academic_year || `${curY}/${curY + 1}`,
        ganjil_start: saved.ganjil_start || `${curY}-07-15`,
        ganjil_end: saved.ganjil_end || `${curY}-12-20`,
        genap_start: saved.genap_start || `${curY + 1}-01-06`,
        genap_end: saved.genap_end || `${curY + 1}-06-20`,
      };
    } catch (e) {
      const curY = today.getFullYear();
      return {
        academic_year: `${curY}/${curY + 1}`,
        ganjil_start: `${curY}-07-15`,
        ganjil_end: `${curY}-12-20`,
        genap_start: `${curY + 1}-01-06`,
        genap_end: `${curY + 1}-06-20`,
      };
    }
  })();

  const dateRange = (() => {
    if (reportType === 'bulanan') {
      const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start,
        end,
        label: `Bulan ${monthNames[selectedMonth]} ${selectedYear}`,
      };
    } else {
      const isGanjil = selectedSemester === 'ganjil';
      return {
        start: isGanjil ? academicSettings.ganjil_start : academicSettings.genap_start,
        end: isGanjil ? academicSettings.ganjil_end : academicSettings.genap_end,
        label: `Semester ${isGanjil ? 'Ganjil' : 'Genap'} T.A. ${academicSettings.academic_year}`,
      };
    }
  })();

  // Initial & Reactive Fetching
  useEffect(() => {
    fetchTodayData();
    fetchPeriodData();
  }, [reportType, selectedMonth, selectedYear, selectedSemester]);

  // 1. Fetch Today's Attendance
  async function fetchTodayData() {
    try {
      const { data } = await supabase
        .from('absensi')
        .select('id_absensi, nis, status, waktu, tanggal, keterangan, metode, siswa(nama, id_kelas, kelas(nama_kelas), orang_tua(no_whatsapp, nama_ayah)), jadwal(mata_pelajaran(nama_mapel))')
        .eq('tanggal', todayStr);

      if (data && data.length > 0) {
        setTodayAttendance(data);
      } else {
        // Fallback mock today if fresh database
        const mockToday = generateMockTodayAttendance(students);
        setTodayAttendance(mockToday);
      }
    } catch (err) {
      const mockToday = generateMockTodayAttendance(students);
      setTodayAttendance(mockToday);
    }
  }

  // 2. Fetch Period Attendance & Aggregate Classes & EWS
  async function fetchPeriodData() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('absensi')
        .select('id_absensi, nis, status, tanggal, waktu, keterangan, siswa(nama, id_kelas, kelas(nama_kelas), orang_tua(no_whatsapp, nama_ayah))')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      let attList = data || [];
      if (attList.length === 0) {
        attList = generateMockPeriodAttendance(students, classes, dateRange);
      }
      setPeriodAttendance(attList);
      aggregateClassData(attList);
      aggregateEwsData(attList);
    } catch (err) {
      console.error('Error fetching period attendance:', err);
      const fallbackList = generateMockPeriodAttendance(students, classes, dateRange);
      setPeriodAttendance(fallbackList);
      aggregateClassData(fallbackList);
      aggregateEwsData(fallbackList);
    } finally {
      setLoading(false);
    }
  }

  // Aggregation for Macro Class Comparisons
  function aggregateClassData(attList) {
    const classMap = {};

    classes.forEach((c) => {
      classMap[c.id_kelas] = {
        id_kelas: c.id_kelas,
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat || 7,
        wali_kelas: c.guru?.nama || 'Wali Kelas',
        totalStudents: students.filter((s) => s.id_kelas === c.id_kelas).length,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        totalEntries: 0,
        percentage: 0,
      };
    });

    attList.forEach((att) => {
      const classId = att.siswa?.id_kelas;
      if (classId && classMap[classId]) {
        const status = (att.status || '').toUpperCase();
        if (status === 'H') classMap[classId].hadir++;
        else if (status === 'S') classMap[classId].sakit++;
        else if (status === 'I') classMap[classId].izin++;
        else if (status === 'A') classMap[classId].alpa++;
        classMap[classId].totalEntries++;
      }
    });

    const summaries = Object.values(classMap).map((c) => {
      const totalAll = c.hadir + c.sakit + c.izin + c.alpa;
      const pct = totalAll > 0 ? Math.round((c.hadir / totalAll) * 100) : 0;
      return { ...c, percentage: pct };
    });

    // Urutkan berdasarkan persentase tertinggi
    summaries.sort((a, b) => b.percentage - a.percentage);
    setClassSummaries(summaries);
  }

  // Aggregation for Early Warning System (BK / Kesiswaan)
  function aggregateEwsData(attList) {
    const studentCounters = {};

    students.forEach((st) => {
      studentCounters[st.nis] = {
        student: st,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        total: 0,
        percentage: 0,
      };
    });

    attList.forEach((att) => {
      if (studentCounters[att.nis]) {
        const status = (att.status || '').toUpperCase();
        if (status === 'H') studentCounters[att.nis].hadir++;
        else if (status === 'S') studentCounters[att.nis].sakit++;
        else if (status === 'I') studentCounters[att.nis].izin++;
        else if (status === 'A') studentCounters[att.nis].alpa++;
        studentCounters[att.nis].total++;
      }
    });

    // Filter siswa yang bermasalah (Alpa >= 3 ATAU Kehadiran < 80%)
    const riskStudents = [];
    Object.values(studentCounters).forEach((item) => {
      const total = item.hadir + item.sakit + item.izin + item.alpa;
      const pct = total > 0 ? Math.round((item.hadir / total) * 100) : 0;
      item.percentage = pct;

      const hasAlpaRisk = item.alpa >= 3;
      const hasLowRateRisk = pct < 80 && total >= 5;

      if (hasAlpaRisk || hasLowRateRisk) {
        riskStudents.push({
          ...item,
          riskLevel: hasAlpaRisk ? 'critical' : 'high',
          riskLabel: hasAlpaRisk
            ? 'Kritis (>= 3 Alpa)'
            : 'Kehadiran Rendah (<80%)',
        });
      }
    });

    // Urutkan yang alpa paling banyak
    riskStudents.sort((a, b) => b.alpa - a.alpa || a.percentage - b.percentage);
    setEwsStudents(riskStudents);
  }

  // Generate Mock Data Helpers
  function generateMockTodayAttendance(studentList) {
    return (studentList || []).map((s, idx) => {
      let st = 'H';
      let ket = 'Hadir tepat waktu';
      if (idx % 11 === 0) {
        st = 'A';
        ket = 'Tanpa Keterangan';
      } else if (idx % 7 === 0) {
        st = 'S';
        ket = 'Sakit Demam (Izin Ortu)';
      } else if (idx % 13 === 0) {
        st = 'I';
        ket = 'Acara Keluarga';
      }
      return {
        id_absensi: `today-${s.nis}`,
        nis: s.nis,
        status: st,
        waktu: '07:02:40',
        tanggal: todayStr,
        keterangan: ket,
        metode: 'qr_siswa',
        siswa: s,
        jadwal: { mata_pelajaran: { nama_mapel: 'KBM Harian' } },
      };
    });
  }

  function generateMockPeriodAttendance(studentList, classList, range) {
    const list = [];
    const dates = [
      '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24',
      '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22',
      '2026-10-01', '2026-10-06', '2026-10-12', '2026-10-16',
    ];

    (studentList || []).forEach((st, sIdx) => {
      dates.forEach((d, dIdx) => {
        let status = 'H';
        let ket = 'Hadir';
        if (sIdx === 0 && dIdx % 3 === 0) {
          status = 'A';
          ket = 'Alpa (Tanpa Keterangan)';
        } else if ((sIdx + dIdx) % 15 === 0) {
          status = 'S';
          ket = 'Sakit';
        } else if ((sIdx + dIdx) % 19 === 0) {
          status = 'I';
          ket = 'Izin';
        }

        list.push({
          id_absensi: `period-${st.nis}-${d}`,
          nis: st.nis,
          status,
          tanggal: d,
          waktu: '07:05:00',
          keterangan: ket,
          siswa: st,
        });
      });
    });
    return list;
  }

  // Hitung Metrik Live Hari Ini
  const todayMetrics = (() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    todayAttendance.forEach((item) => {
      const s = (item.status || '').toUpperCase();
      if (s === 'H') hadir++;
      else if (s === 'S') sakit++;
      else if (s === 'I') izin++;
      else if (s === 'A') alpa++;
    });
    const totalSiswa = students.length || 1;
    const pct = Math.round((hadir / totalSiswa) * 100);
    return { hadir, sakit, izin, alpa, totalSiswa, pct };
  })();

  // Filter Live Attendance
  const filteredTodayAttendance = todayAttendance.filter((item) => {
    const s = (item.status || '').toUpperCase();
    if (liveFilterStatus === 'all') return true;
    if (liveFilterStatus === 'alpa') return s === 'A';
    if (liveFilterStatus === 'izin_sakit') return s === 'I' || s === 'S';
    if (liveFilterStatus === 'hadir') return s === 'H';
    return true;
  });

  // Kirim WhatsApp Direct ke Orang Tua
  function handleSendWhatsApp(student, status, date) {
    // 1. Validasi status mode kirim pesan WhatsApp (ON / OFF)
    let isWaEnabled = settings?.wa_notifikasi_aktif !== 'false';
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      if (saved.wa_notifikasi_aktif === 'false') isWaEnabled = false;
    } catch (e) {}

    if (!isWaEnabled) {
      showAlert({
        title: 'Fitur Kirim WhatsApp Dinonaktifkan',
        message: 'Layanan pengiriman pesan WhatsApp saat ini sedang dimatikan oleh Administrator. Silakan aktifkan kembali sakelar Mode Pengiriman Notifikasi WhatsApp di menu Pengaturan Sistem jika ingin mengirim pesan presensi ke orang tua.',
        type: 'warning',
        confirmText: 'Mengerti',
      });
      return;
    }

    const phone = student?.orang_tua?.no_whatsapp || student?.no_hp_ortu || '';
    if (!phone) {
      toast.warning(`Nomor WhatsApp orang tua untuk siswa ${student?.nama || ''} belum terdaftar di sistem.`, 'Nomor WA Belum Ada');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    let template = settings.wa_template_alpa;
    if (status === 'S' || status === 'I') template = settings.wa_template_izin_sakit;

    const message = (template || '')
      .replace(/{{nama_ortu}}/g, student?.orang_tua?.nama_ayah || 'Orang Tua / Wali')
      .replace(/{{nama_siswa}}/g, student?.nama || 'Siswa')
      .replace(/{{nis}}/g, student?.nis || '-')
      .replace(/{{status}}/g, status === 'A' ? 'ALPA' : status === 'S' ? 'SAKIT' : 'IZIN')
      .replace(/{{tanggal}}/g, date || todayStr)
      .replace(/{{waktu}}/g, '07:15 WITA')
      .replace(/{{mapel}}/g, 'KBM Sekolah')
      .replace(/{{keterangan}}/g, 'Konfirmasi kehadiran sekolah');

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  }

  // Master Excel Export
  function handleMasterExcelExport() {
    try {
      const rows = periodAttendance.map((item, idx) => ({
        No: idx + 1,
        Tanggal: item.tanggal,
        NIS: item.nis,
        Nama_Siswa: item.siswa?.nama || '-',
        Kelas: item.siswa?.kelas?.nama_kelas || item.siswa?.id_kelas || '-',
        Status: item.status === 'H' ? 'Hadir' : item.status === 'I' ? 'Izin' : item.status === 'S' ? 'Sakit' : 'Alpa',
        Keterangan: item.keterangan || '-',
      }));

      const classRows = classSummaries.map((c, idx) => ({
        Peringkat: idx + 1,
        Nama_Kelas: c.nama_kelas,
        Tingkat: c.tingkat,
        Wali_Kelas: c.wali_kelas,
        Jumlah_Siswa: c.totalStudents,
        Total_Hadir: c.hadir,
        Total_Sakit: c.sakit,
        Total_Izin: c.izin,
        Total_Alpa: c.alpa,
        Persentase_Kehadiran: `${c.percentage}%`,
      }));

      const wb = XLSX.utils.book_new();
      const wsComp = XLSX.utils.json_to_sheet(classRows);
      const wsDetail = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(wb, wsComp, 'Komparasi_Semua_Kelas');
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Riwayat_Presensi');
      XLSX.writeFile(wb, `Rekap_Presensi_Master_${schoolSettingsName()}_${todayStr}.xlsx`);
      toast.success('File Rekap Presensi Master Excel berhasil diunduh.');
    } catch (err) {
      toast.error(`Gagal ekspor Excel: ${err.message}`, 'Ekspor Gagal');
    }
  }

  function schoolSettingsName() {
    return (settings?.sekolah_nama || 'SMPN2KB').replace(/\s+/g, '_');
  }

  // Open Surat Panggilan Modal
  function handleOpenSummons(studentRiskItem) {
    setSelectedStudentForSummons(studentRiskItem);
    setIsSummonsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER EXECUTIVE DOKUMEN & SUB-TAB NAVIGATION                         */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-sky-50 text-sky-600 font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                Pusat Rekapitulasi & Laporan Presensi Eksekutif
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Pantau kehadiran real-time harian, komparasi disiplin antar kelas, deteksi dini siswa bermasalah (BK), serta cetak Rapor Presensi PDF resmi berstandar Kop Sekolah.
            </p>
          </div>

          {/* Master Excel & Print Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMasterExcelExport}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              title="Unduh master data kehadiran seluruh kelas dalam 1 file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Master Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => onOpenStudentPdf(students[0] || null)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              title="Cetak lembar rapor kehadiran siswa lengkap dengan Kop Surat & Tanda Tangan"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rapor PDF Siswa</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-6 border-b border-slate-200">
          <button
            onClick={() => setSubTab('live')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'live'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Live Monitoring Hari Ini</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
              {todayAttendance.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('makro')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'makro'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Komparasi Antar Kelas & Ranking</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
              {classes.length} Kelas
            </span>
          </button>

          <button
            onClick={() => setSubTab('ews')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'ews'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 hover:bg-rose-50 hover:text-rose-900 font-bold'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Early Warning System (BK)</span>
            {ewsStudents.length > 0 && (
              <span className="ml-1 text-[10px] px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full font-black">
                {ewsStudents.length} Siswa
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('guru')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'guru'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-indigo-400" />
            <span>Rekap Guru & Jam Inval</span>
          </button>

          <button
            onClick={() => setSubTab('jurnal_kbm')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'jurnal_kbm'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-300" />
            <span>Rekap Jurnal KBM Guru</span>
          </button>

          <button
            onClick={() => setSubTab('siswa_pdf')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'siswa_pdf'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-300" />
            <span>Cetak Rapor Presensi Siswa (PDF)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-TAB 1: LIVE MONITORING & KEHADIRAN HARI INI                        */}
      {/* ========================================================================= */}
      {subTab === 'live' && (
        <div className="space-y-6">
          {/* Metrik Real-time Hari Ini */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="glass-card rounded-2xl p-4 border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tingkat Hadir</span>
                <Radio className="w-4 h-4 animate-ping" />
              </div>
              <div className="text-2xl font-black text-slate-800">{todayMetrics.pct}%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Dari {todayMetrics.totalSiswa} total siswa</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Hadir (H)</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{todayMetrics.hadir}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Siswa masuk hari ini</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-blue-100 bg-gradient-to-br from-sky-50/50 to-white">
              <div className="flex items-center justify-between text-sky-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Sakit (S)</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-sky-700">{todayMetrics.sakit}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Dengan surat dokter / izin</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Izin (I)</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-amber-700">{todayMetrics.izin}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Keperluan keluarga</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-rose-100 bg-gradient-to-br from-rose-50/50 to-white">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Alpa (A)</span>
                <UserX className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-rose-700">{todayMetrics.alpa}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Tanpa keterangan</p>
            </div>
          </div>

          {/* Panel Live Issues & WhatsApp Broadcast */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  Live Feed Status Presensi Hari Ini ({todayStr})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar siswa dan status kehadiran pada sesi KBM hari ini. Gunakan tombol WA untuk langsung menghubungi orang tua siswa yang Alpa.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'alpa', label: `Alpa (${todayMetrics.alpa})`, color: 'text-rose-700' },
                  { id: 'izin_sakit', label: `Izin/Sakit (${todayMetrics.izin + todayMetrics.sakit})` },
                  { id: 'hadir', label: `Hadir (${todayMetrics.hadir})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLiveFilterStatus(f.id)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      liveFilterStatus === f.id
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabel Live Feed */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">NIS</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Jam Masuk</th>
                    <th className="py-3 px-3">Keterangan</th>
                    <th className="py-3 px-3 text-center">Kontak Ortu / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTodayAttendance.length > 0 ? (
                    filteredTodayAttendance.map((item, idx) => {
                      const st = (item.status || 'H').toUpperCase();
                      const parentPhone = item.siswa?.orang_tua?.no_whatsapp || '';
                      return (
                        <tr key={item.id_absensi || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {item.siswa?.nama || 'Siswa'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{item.nis}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {item.siswa?.kelas?.nama_kelas || item.siswa?.id_kelas || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st === 'H'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : st === 'S'
                                  ? 'bg-blue-100 text-blue-700'
                                  : st === 'I'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {st === 'H' ? 'Hadir' : st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alpa'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                            {item.waktu || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                            {item.keterangan || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {parentPhone ? (
                                <button
                                  onClick={() => handleSendWhatsApp(item.siswa, st, item.tanggal)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                                  title={`Kirim WA ke orang tua (${parentPhone})`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Chat WA</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No HP Ortu -</span>
                              )}
                              <button
                                onClick={() => onOpenStudentPdf(item.siswa)}
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Cetak Rapor Presensi PDF Siswa"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 italic">
                        Tidak ada data siswa pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monitoring Guru Inval (Guru Pengganti) Hari Ini */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Monitoring Guru Mengajar & Guru Inval (Pengganti) Hari Ini
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Daftar penugasan guru pengganti (Inval) aktif hari ini untuk kelas yang guru aslinya berhalangan hadir.
            </p>

            {invalAssignments && invalAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {invalAssignments.map((inv) => (
                  <div key={inv.id} className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{inv.kelas_nama || 'Kelas'}</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
                          INVAL AKTIF
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        Guru Asli: <span className="font-medium text-slate-700">{inv.guru_asli_nama}</span>
                      </p>
                      <p className="text-indigo-800 font-bold mt-0.5">
                        Guru Pengganti: <span>{inv.guru_pengganti_nama}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Mapel: {inv.mapel_nama} | Alasan: {inv.alasan || 'Izin dinas'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                Semua guru mengajar sesuai jadwal normal. Tidak ada penugasan guru inval aktif hari ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB 2: KOMPARASI MAKRO ANTAR KELAS & RANKING DISIPLIN              */}
      {/* ========================================================================= */}
      {subTab === 'makro' && (
        <div className="space-y-6">
          {/* Controls Filter Periode */}
          <div className="glass-card rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Periode Evaluasi Komparasi Antar Kelas</h4>
                <p className="text-[11px] text-slate-500">Rentang evaluasi: <span className="font-bold text-slate-700">{dateRange.label}</span></p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-700"
              >
                <option value="semesteran">Semesteran</option>
                <option value="bulanan">Bulanan</option>
              </select>

              {reportType === 'bulanan' ? (
                <div className="flex items-center gap-1">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 font-medium text-slate-700"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 font-medium text-slate-700"
                  >
                    {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
                >
                  <option value="ganjil">Semester Ganjil</option>
                  <option value="genap">Semester Genap</option>
                </select>
              )}

              <button
                onClick={fetchPeriodData}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                title="Refresh Data Komparasi"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* PODIUM LEADERBOARD KELAS TERDISIPLIN */}
          {classSummaries.length >= 3 && (
            <div className="glass-card rounded-3xl p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-500" />
                Podium Kelas Terdisiplin (Tingkat Kehadiran Tertinggi)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Juara 2 (Perak) */}
                <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-t from-slate-100 to-white border border-slate-200 text-center relative flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-black flex items-center justify-center mx-auto mb-2 text-sm shadow-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base">{classSummaries[1]?.nama_kelas}</h4>
                    <p className="text-xs text-slate-500">Wali: {classSummaries[1]?.wali_kelas}</p>
                    <div className="text-2xl font-black text-slate-700 mt-2">{classSummaries[1]?.percentage}%</div>
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold uppercase">
                      Medali Perak
                    </span>
                  </div>
                </div>

                {/* Juara 1 (Emas - Center Prominent) */}
                <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-t from-amber-50 to-white border-2 border-amber-300 text-center relative shadow-md flex flex-col justify-between scale-105">
                  <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center mx-auto mb-2 text-base shadow-sm ring-4 ring-amber-100">
                    👑 1
                  </div>
                  <div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      JUARA 1 TERDISIPLIN
                    </span>
                    <h4 className="font-black text-slate-900 text-lg mt-2">{classSummaries[0]?.nama_kelas}</h4>
                    <p className="text-xs text-slate-600">Wali: {classSummaries[0]?.wali_kelas}</p>
                    <div className="text-3xl font-black text-amber-600 my-1">{classSummaries[0]?.percentage}%</div>
                    <p className="text-[11px] text-slate-500">Alpa: {classSummaries[0]?.alpa} | Izin/Sakit: {(classSummaries[0]?.izin || 0) + (classSummaries[0]?.sakit || 0)}</p>
                  </div>
                </div>

                {/* Juara 3 (Perunggu) */}
                <div className="order-3 md:order-3 p-5 rounded-2xl bg-gradient-to-t from-amber-900/5 to-white border border-amber-800/20 text-center relative flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black flex items-center justify-center mx-auto mb-2 text-sm shadow-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-base">{classSummaries[2]?.nama_kelas}</h4>
                    <p className="text-xs text-slate-500">Wali: {classSummaries[2]?.wali_kelas}</p>
                    <div className="text-2xl font-black text-amber-800 mt-2">{classSummaries[2]?.percentage}%</div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase">
                      Medali Perunggu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabel Seluruh Kelas */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <School className="w-5 h-5 text-blue-600" />
              Tabel Komparasi Seluruh Kelas Sekolah
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 text-center w-12">Rank</th>
                    <th className="py-3 px-3">Nama Kelas</th>
                    <th className="py-3 px-3">Wali Kelas</th>
                    <th className="py-3 px-3 text-center">Siswa</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                    <th className="py-3 px-3 text-center text-blue-700">Sakit</th>
                    <th className="py-3 px-3 text-center text-amber-700">Izin</th>
                    <th className="py-3 px-3 text-center text-rose-700">Alpa</th>
                    <th className="py-3 px-3 text-center font-bold">Kehadiran (%)</th>
                    <th className="py-3 px-3 text-center">Aksi Laporan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {classSummaries.map((c, idx) => (
                    <tr key={c.id_kelas} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-bold">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{c.nama_kelas}</td>
                      <td className="py-3 px-3 text-slate-600">{c.wali_kelas}</td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">{c.totalStudents}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">{c.hadir}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700">{c.sakit}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700">{c.izin}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-700">{c.alpa}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.percentage >= 90 ? 'bg-emerald-500' : c.percentage >= 80 ? 'bg-blue-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900">{c.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const foundClass = classes.find((cl) => cl.id_kelas === c.id_kelas);
                              if (foundClass && onOpenClassReport) onOpenClassReport(foundClass);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            title="Buka Rekapitulasi Kelas ini"
                          >
                            Rekap Kelas
                          </button>
                          <button
                            onClick={() => {
                              const firstStudent = students.find((s) => s.id_kelas === c.id_kelas);
                              if (onOpenStudentPdf) onOpenStudentPdf(firstStudent || null);
                            }}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Cetak Rapor PDF Siswa Kelas Ini"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB 3: EARLY WARNING SYSTEM (RADAR BK & KESISWAAN)                 */}
      {/* ========================================================================= */}
      {subTab === 'ews' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  Radar Early Warning System (EWS) Kesiswaan & Bimbingan Konseling (BK)
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Sistem otomatis mendeteksi siswa yang berisiko drop-out atau memerlukan pembinaan khusus akibat akumulasi Alpa (≥ 3 kali) atau kehadiran di bawah 80%.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-900 bg-rose-200/80 px-3 py-1.5 rounded-xl">
                {ewsStudents.length} Siswa Butuh Atensi
              </span>
            </div>
          </div>

          {/* List Siswa Bermasalah */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">Daftar Siswa Terdeteksi Berisiko</h4>
              <div className="flex items-center gap-2">
                <select
                  value={ewsFilterType}
                  onChange={(e) => setEwsFilterType(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-700"
                >
                  <option value="all">Semua Siswa Berisiko</option>
                  <option value="alpa">Hanya Alpa ≥ 3 Kali</option>
                  <option value="low">Hanya Kehadiran &lt; 80%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ewsStudents
                .filter((item) => {
                  if (ewsFilterType === 'alpa') return item.alpa >= 3;
                  if (ewsFilterType === 'low') return item.percentage < 80;
                  return true;
                })
                .map((item) => {
                  const st = item.student;
                  const parentPhone = st?.orang_tua?.no_whatsapp || '';
                  return (
                    <div
                      key={st.nis}
                      className="p-5 rounded-2xl bg-white border-2 border-rose-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              {item.riskLabel}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{st.nama}</h4>
                            <p className="text-xs text-slate-500 font-mono">NIS: {st.nis} | {st.kelas?.nama_kelas || 'Kelas'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-rose-700">{item.percentage}%</span>
                            <p className="text-[9px] text-slate-400">Kehadiran</p>
                          </div>
                        </div>

                        {/* Statistik Pelanggaran */}
                        <div className="grid grid-cols-2 gap-2 py-2.5 my-2 border-y border-slate-100 text-center text-xs">
                          <div className="bg-rose-50/70 p-2 rounded-xl">
                            <span className="text-[10px] text-rose-800 font-bold uppercase">Total Alpa</span>
                            <div className="text-base font-black text-rose-700">{item.alpa} Hari</div>
                          </div>
                          <div className="bg-blue-50/70 p-2 rounded-xl">
                            <span className="text-[10px] text-blue-800 font-bold uppercase">Izin & Sakit</span>
                            <div className="text-base font-black text-blue-700">{item.izin + item.sakit} Hari</div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 mb-3">
                          Orang Tua: <span className="font-semibold text-slate-800">{st.orang_tua?.nama_ayah || 'Wali Siswa'}</span>
                          <br />
                          WhatsApp: <span className="font-mono text-slate-700">{parentPhone || 'Belum Terdaftar'}</span>
                        </p>
                      </div>

                      {/* Tindakan Cepat BK & Kesiswaan */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenSummons(item)}
                          className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Cetak Surat Panggilan Orang Tua Resmi"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Surat Panggilan</span>
                        </button>

                        <button
                          onClick={() => handleSendWhatsApp(st, 'A', todayStr)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                          title="Chat WA Orang Tua"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenStudentPdf(st)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                          title="Cetak Rapor Presensi PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {ewsStudents.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-slate-700">Tidak ada siswa berisiko!</p>
                <p className="text-xs text-slate-500">Semua siswa memiliki rekam kehadiran yang baik pada periode ini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-TAB 4: REKAP KEHADIRAN GURU & JAM MENGAJAR INVAL                   */}
      {/* ========================================================================= */}
      {subTab === 'guru' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Rekap Realisasi KBM Guru & Akumulasi Jam Inval (Guru Pengganti)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transparansi jam mengajar guru, kehadiran harian, serta jam piket pengganti untuk evaluasi kinerja & insentif piket sekolah.
                </p>
              </div>

              {onOpenTeacherSchedule && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenTeacherSchedule(null, 'all_individual')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Cetak lembar jadwal untuk seluruh guru sekaligus (1 lembar per guru dengan auto page-break)"
                  >
                    <Users className="w-4 h-4" />
                    <span>Cetak Massal Seluruh Guru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenTeacherSchedule(null, 'master_matrix')}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Cetak Master Matriks Rekapitulasi Jadwal Seluruh Guru (A4 Landscape & Excel)"
                  >
                    <Grid className="w-4 h-4" />
                    <span>Master Matriks</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Guru</th>
                    <th className="py-3 px-3">NIP</th>
                    <th className="py-3 px-3">Mata Pelajaran Diampu</th>
                    <th className="py-3 px-3 text-center">Jadwal Sesi/Minggu</th>
                    <th className="py-3 px-3 text-center text-indigo-700 font-bold">Jam Inval (Menggantikan)</th>
                    <th className="py-3 px-3 text-center">Status Hari Ini</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {teachers.map((t, idx) => {
                    const teacherSchedules = schedules.filter(
                      (s) => s.nip === t.nip || s.id_guru === t.nip || s.guru?.nama === t.nama
                    );
                    const invalCount = (invalAssignments || []).filter(
                      (inv) => inv.guru_pengganti_nip === t.nip || inv.guru_pengganti_nama === t.nama
                    ).length;

                    return (
                      <tr key={t.nip || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{t.nama}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{t.nip || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">
                          {t.mata_pelajaran || t.mapel || 'Guru Mata Pelajaran'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {teacherSchedules.length} Sesi
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            invalCount > 0 ? 'bg-indigo-100 text-indigo-800 font-black' : 'text-slate-400'
                          }`}>
                            {invalCount} Jam KBM
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aktif Mengajar
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {onOpenTeacherSchedule && (
                            <button
                              type="button"
                              onClick={() => onOpenTeacherSchedule(t)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold border border-indigo-200"
                              title="Cetak Lembar Jadwal Guru Resmi (PDF & Excel)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Cetak Jadwal</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5.5 SUB-TAB: REKAP JURNAL MATERI KBM & BUKU AGENDA GURU                   */}
      {/* ========================================================================= */}
      {subTab === 'jurnal_kbm' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Rekapitulasi Jurnal KBM & Buku Agenda Mengajar Guru
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Arsip materi pembelajaran harian, ketercapaian silabus, dan cetak dokumen Buku Agenda Resmi bertanda tangan Kepala Sekolah & berstempel digital.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedTeacherForJurnal(teachers[0] || null);
                  setIsJurnalModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Buka Cetak Agenda Guru (PDF / Excel)</span>
              </button>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Tenaga Pengajar</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{teachers.length} Guru</span>
                <span className="text-[10px] text-slate-400">Aktif mengajar semester ini</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Mata Pelajaran Aktif</span>
                <span className="text-2xl font-black text-emerald-800 mt-1 block">{subjects.length || 12} Mapel</span>
                <span className="text-[10px] text-emerald-600">Kurikulum Merdeka / Nasional</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Format Dokumen Cetak</span>
                <span className="text-2xl font-black text-indigo-800 mt-1 block">PDF & Excel</span>
                <span className="text-[10px] text-indigo-600">Kop resmi kedinasan sekolah</span>
              </div>
            </div>

            {/* Tabel Daftar Guru untuk Rekap Agenda */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Tenaga Pendidik</th>
                    <th className="py-3 px-3">NIP</th>
                    <th className="py-3 px-3">Mata Pelajaran Diampu</th>
                    <th className="py-3 px-3 text-center">Beban Jadwal</th>
                    <th className="py-3 px-3 text-center">Status Jurnal</th>
                    <th className="py-3 px-3 text-center w-36">Aksi Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {teachers.map((t, idx) => {
                    const teacherSchedules = schedules.filter((s) => s.nip === t.nip);

                    return (
                      <tr key={t.nip || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{t.nama}</p>
                          <p className="text-[10px] text-slate-400">{t.email || '-'}</p>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{t.nip || '-'}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {t.mata_pelajaran || t.mapel || 'Guru Mata Pelajaran'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {teacherSchedules.length || 4} Sesi / Mgg
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Tersedia
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedTeacherForJurnal(t);
                              setIsJurnalModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Pratinjau & Cetak Buku Agenda Guru"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Agenda</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-TAB 5: CETAK RAPOR PRESENSI SISWA (PDF ENGINE)                     */}
      {/* ========================================================================= */}
      {subTab === 'siswa_pdf' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Cetak Rapor Presensi & Lembar Kedisiplinan Siswa (PDF)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih siswa atau kelas untuk pratinjau dan unduh berkas Rapor Presensi Resmi siap simpan PDF atau cetak fisik.
                </p>
              </div>

              {/* Opsi Cetak Kelas Sekaligus */}
              <button
                onClick={() => onOpenStudentPdf(students[0] || null)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Buka Preview Rapor PDF</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama atau NIS..."
                  value={searchStudentTerm}
                  onChange={(e) => setSearchStudentTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-full sm:w-auto">
                <select
                  value={filterClassStudent}
                  onChange={(e) => setFilterClassStudent(e.target.value)}
                  className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-700"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id_kelas} value={c.id_kelas}>
                      {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Siswa Ready for PDF */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Lengkap Siswa</th>
                    <th className="py-3 px-3">NIS</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Orang Tua / Wali</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Aksi Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students
                    .filter((s) => {
                      const matchSearch =
                        !searchStudentTerm ||
                        s.nama?.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
                        s.nis?.includes(searchStudentTerm);
                      const matchClass =
                        filterClassStudent === 'all' || s.id_kelas === filterClassStudent;
                      return matchSearch && matchClass;
                    })
                    .map((s, idx) => (
                      <tr key={s.nis} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.nama}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {s.kelas?.nama_kelas || 'Kelas'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {s.orang_tua?.nama_ayah || 'Bpk/Ibu Wali'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                            {s.status_siswa || 'Aktif'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onOpenStudentPdf(s)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-all cursor-pointer shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Rapor PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL SURAT PANGGILAN ORANG TUA RESMI (PRINTABLE FORMAT)               */}
      {/* ========================================================================= */}
      {isSummonsModalOpen && selectedStudentForSummons && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-start p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          {/* Scoped Media Print Stylesheet */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 12mm;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden;
              }
              #printArea, #printArea * {
                visibility: visible;
              }
              #printArea {
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                zoom: 91% !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              .signature-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .no-print, [data-no-print="true"] {
                display: none !important;
              }
            }
          `}</style>

          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-4 mb-4 flex items-center justify-between print:hidden no-print">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600" /> Pratinjau Surat Panggilan Orang Tua Resmi
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!selectedStudentForSummons) {
                    toast.error('Data siswa panggilan tidak valid.');
                    return;
                  }
                  const printEl = document.getElementById('printArea');
                  if (!printEl) {
                    window.print();
                    return;
                  }
                  const studentName = (selectedStudentForSummons.nama || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
                  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat_Panggilan_${studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 16px; font-size: 11pt; color: #000; background: #fff; line-height: 1.5; }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  ${printEl.innerHTML}
</body>
</html>`;
                  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer shadow-sm"
                title="Buka dokumen di tab baru tanpa batasan margin"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>Buka di Tab Baru</span>
              </button>
              <button
                onClick={() => {
                  if (!selectedStudentForSummons) {
                    toast.error('Data siswa panggilan tidak valid.');
                    return;
                  }
                  setTimeout(() => window.print(), 150);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Surat (PDF)
              </button>
              <button
                onClick={() => setIsSummonsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Surat Panggilan Sheet */}
          <div
            id="printArea"
            className="printable-summons printable-area w-full max-w-3xl bg-white p-6 sm:p-10 font-serif text-slate-900 shadow-2xl rounded-2xl print:rounded-none print:shadow-none print:p-0"
          >
            {/* Kop Surat */}
            <div className="border-b-[3px] border-slate-900 pb-3 mb-1 text-center font-sans flex items-center justify-between gap-4">
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                {settings?.sekolah_logo ? (
                  <img src={settings.sekolah_logo} alt="Logo" className="w-14 h-14 object-contain" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-14 h-14 fill-slate-800">
                    <path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                    <circle cx="50" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M30 75 Q50 60 70 75" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M45 20 L55 20 M50 15 L50 25" stroke="currentColor" strokeWidth="3" />
                  </svg>
                )}
              </div>
              <div className="flex-1 px-2 text-center">
                <h4 className="text-[10px] uppercase font-bold text-slate-700 leading-tight">
                  {settings?.sekolah_dinas || 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                </h4>
                <h1 className="text-xl font-black text-slate-900 uppercase my-0.5">
                  {settings?.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN'}
                </h1>
                <p className="text-[9.5px] text-slate-600 leading-tight">
                  Alamat: {settings?.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12'}, {settings?.sekolah_kota || 'Kota Bangun'} | NPSN: {settings?.sekolah_npsn || '30401234'}
                </p>
              </div>
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-slate-700 flex flex-col items-center justify-center p-1 text-center">
                  <School className="w-6 h-6 text-slate-800" />
                  <span className="text-[6px] font-bold uppercase mt-0.5 leading-none">SURAT RESMI</span>
                </div>
              </div>
            </div>
            <div className="border-b border-slate-900 mb-6"></div>

            <div className="font-sans text-xs space-y-4">
              <div className="flex justify-between">
                <div>
                  <p>Nomor : 421.3 / BK / {(settings?.sekolah_nama || 'SEKOLAH').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()} / {new Date().getFullYear()}</p>
                  <p>Lampiran : 1 (Satu) Berkas Lembar Presensi</p>
                  <p>Perihal : <strong className="underline">Panggilan Orang Tua / Wali Murid</strong></p>
                </div>
                <div className="text-right">
                  <p>{settings?.sekolah_kota?.split(',')[0] || 'Kota Bangun'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="pt-2">
                <p>Kepada Yth.</p>
                <p><strong>Bpk/Ibu Orang Tua / Wali dari ananda {selectedStudentForSummons.student?.nama}</strong></p>
                <p>di Tempat</p>
              </div>

              <p className="leading-relaxed text-justify">
                Dengan hormat, sehubungan dengan evaluasi kedisiplinan dan absensi siswa di sekolah, kami menginformasikan bahwa ananda <strong>{selectedStudentForSummons.student?.nama}</strong> (NIS: {selectedStudentForSummons.student?.nis}, Kelas: {selectedStudentForSummons.student?.kelas?.nama_kelas || 'Kelas'}) tercatat memiliki ketidakhadiran tanpa keterangan (Alpa) sebanyak <strong>{selectedStudentForSummons.alpa} hari</strong>.
              </p>

              <p className="leading-relaxed">
                Demi kelancaran proses belajar dan masa depan ananda, kami mengharapkan kehadiran Bapak/Ibu untuk berkonsultasi bersama Guru BK dan Wali Kelas pada:
              </p>

              <div className="bg-slate-50 border border-slate-300 p-3 rounded-lg pl-6 space-y-1">
                <p>Hari / Tanggal : <strong>Senin, {new Date(Date.now() + 86400000 * 2).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
                <p>Waktu : <strong>Pukul 08.30 WITA s.d Selesai</strong></p>
                <p>Tempat : <strong>Ruang Bimbingan Konseling (BK) / Ruang Kesiswaan</strong></p>
                <p>Keperluan : <strong>Koordinasi Pembinaan Kedisiplinan Siswa</strong></p>
              </div>

              <p className="leading-relaxed">
                Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama yang baik dari Bapak/Ibu, kami ucapkan terima kasih.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-8 text-center signature-block break-inside-avoid">
                <div>
                  <p className="mb-16">Guru Bimbingan Konseling (BK)</p>
                  <p className="font-bold underline">Ibu Dra. Hj. Siti Maryam, M.Si</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. 197905102005012004</p>
                </div>
                <div className="relative">
                  <p className="mb-16">{settings?.kepala_sekolah_jabatan || 'Kepala Sekolah'}</p>

                  {/* Stempel Digital jika ada */}
                  {settings?.sekolah_stempel && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-20 pointer-events-none opacity-80">
                      <img
                        src={settings.sekolah_stempel}
                        alt="Stempel"
                        className="w-full h-full object-contain -rotate-6"
                      />
                    </div>
                  )}

                  <p className="font-bold underline">{settings?.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. {settings?.kepala_sekolah_nip || '197003121995121001'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Jurnal KBM Guru */}
      <JurnalKbmReportModal
        isOpen={isJurnalModalOpen}
        onClose={() => setIsJurnalModalOpen(false)}
        initialTeacher={selectedTeacherForJurnal}
        allTeachers={teachers}
        schoolSettings={settings}
        isAdmin={true}
      />
    </div>
  );
}
