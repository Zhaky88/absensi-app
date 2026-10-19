import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Download,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Layers,
  BookOpen,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  ArrowUpDown,
  Smartphone,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Table,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { getTodayDateString } from '../lib/invalManager';
import { logActivity } from '../lib/activityLogger';
import { useToast } from '../context/ToastModalContext';
import ClassAttendanceCalendar from './ClassAttendanceCalendar';
import AttendanceMatrixView from './AttendanceMatrixView';
import AttendanceAnalyticsView from './AttendanceAnalyticsView';
import ClassAttendanceReportModal from './ClassAttendanceReportModal';
import StudentAttendancePdfModal from './StudentAttendancePdfModal';

export default function AdminAttendanceManager({
  students = [],
  classes = [],
  teachers = [],
  subjects = [],
  schedules = [],
  settings = {},
  initialView = 'table', // 'table' | 'calendar'
  initialClassId = 'all',
  onManageSchedule = null,
  onOpenStudentPdfReport = null,
  onOpenClassReport = null,
}) {
  const { toast, showConfirm, showAlert } = useToast();

  // Mode Tampilan Visual: 'table' (Tabel Transaksi Operasional) vs 'calendar' (Kalender Presensi Kelas)
  const [viewMode, setViewMode] = useState(initialView || 'table');

  // Local fallback modals jika tidak diprovide callback dari parent
  const [localClassForReport, setLocalClassForReport] = useState(null);
  const [localStudentForPdf, setLocalStudentForPdf] = useState(null);
  const [localIsPdfOpen, setLocalIsPdfOpen] = useState(false);

  const handleOpenStudentPdf = (student = null) => {
    if (onOpenStudentPdfReport) {
      onOpenStudentPdfReport(student);
    } else {
      setLocalStudentForPdf(student);
      setLocalIsPdfOpen(true);
    }
  };

  const handleOpenClassReport = (cls = null) => {
    const targetClass =
      cls ||
      (selectedClassId && selectedClassId !== 'all'
        ? classes.find((c) => String(c.id_kelas) === String(selectedClassId))
        : (classes.length > 0 ? classes[0] : null));
    if (onOpenClassReport) {
      onOpenClassReport(targetClass);
    } else {
      setLocalClassForReport(targetClass);
    }
  };

  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);

  // Data & Loading States
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filter Presets: default to 'all' or 'thisMonth' so existing records are immediately visible
  const todayStr = getTodayDateString();
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filters
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || 'all');

  useEffect(() => {
    if (initialClassId && initialClassId !== 'all') {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'H' | 'S' | 'I' | 'A'
  const [selectedMetode, setSelectedMetode] = useState('all'); // 'all' | 'murid_scan' | 'guru_scan' | 'manual' | 'piket_scan'
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-Selection State for Batch Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  // Lightbox Modal for Proof Photos
  const [lightboxData, setLightboxData] = useState(null); // { isOpen, url, studentName, date, status, keterangan }

  // Manual Attendance Form State
  const [manualForm, setManualForm] = useState({
    nis: '',
    id_kelas: '',
    tanggal: todayStr,
    waktu: '07:15',
    status: 'H',
    id_jadwal: '',
    keterangan: '',
    foto_bukti_izin: '',
    notifyWa: false,
  });

  // Calculate Date Range based on Preset
  useEffect(() => {
    const now = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (datePreset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (datePreset === 'today') {
      const t = formatDate(now);
      setStartDate(t);
      setEndDate(t);
    } else if (datePreset === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (datePreset === 'last7') {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (datePreset === 'last30') {
      const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (datePreset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(now));
    }
  }, [datePreset]);

  // Fetch Attendance Records
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('absensi')
        .select(`
          id_absensi,
          nis,
          id_jadwal,
          tanggal,
          waktu,
          status,
          metode,
          keterangan,
          foto_bukti_izin,
          created_at,
          siswa (
            nis,
            nama,
            id_kelas,
            foto_wajah,
            orang_tua (
              no_whatsapp,
              nama_ayah
            ),
            kelas (
              nama_kelas
            )
          ),
          jadwal (
            id_jadwal,
            hari,
            jam_mulai,
            jam_selesai,
            mata_pelajaran (
              nama_mapel
            ),
            guru (
              nama
            )
          )
        `)
        .order('tanggal', { ascending: false })
        .order('waktu', { ascending: false });

      if (startDate) {
        query = query.gte('tanggal', startDate);
      }
      if (endDate) {
        query = query.lte('tanggal', endDate);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (selectedMetode !== 'all') {
        query = query.eq('metode', selectedMetode);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAttendanceList(data || []);
      setSelectedIds([]);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      toast.error('Gagal mengambil data absensi: ' + (err.message || 'Koneksi error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate, selectedStatus, selectedMetode, datePreset]);

  // Client-side filtering for Class and Search Term
  const filteredList = useMemo(() => {
    return attendanceList.filter((item) => {
      // Filter Kelas
      if (selectedClassId !== 'all') {
        const itemClassId = item.siswa?.id_kelas;
        if (String(itemClassId) !== String(selectedClassId)) {
          return false;
        }
      }

      // Filter Search Term (Nama Siswa, NIS, Keterangan)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const nama = (item.siswa?.nama || '').toLowerCase();
        const nis = (item.nis || '').toLowerCase();
        const ket = (item.keterangan || '').toLowerCase();
        const mapel = (item.jadwal?.mata_pelajaran?.nama_mapel || '').toLowerCase();
        if (!nama.includes(term) && !nis.includes(term) && !ket.includes(term) && !mapel.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [attendanceList, selectedClassId, searchTerm]);

  // Statistics Summary
  const stats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    filteredList.forEach((item) => {
      const s = String(item.status).toUpperCase();
      if (s === 'H') hadir++;
      else if (s === 'S') sakit++;
      else if (s === 'I') izin++;
      else if (s === 'A') alpa++;
    });

    const total = filteredList.length;
    const hadirPct = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, sakit, izin, alpa, hadirPct };
  }, [filteredList]);

  // Pagination Slice
  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredList.slice(startIndex, startIndex + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  // Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedList.map((item) => item.id_absensi));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Helper formatting
  const formatTanggalIndo = (tglStr) => {
    if (!tglStr) return '-';
    try {
      const parts = tglStr.split('-');
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return tglStr;
    } catch (e) {
      return tglStr;
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'H') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Hadir
        </span>
      );
    }
    if (s === 'S') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Sakit
        </span>
      );
    }
    if (s === 'I') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300 shadow-xs">
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          Izin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Alpa
      </span>
    );
  };

  // Metode Badge Helper
  const renderMetodeBadge = (metode) => {
    switch (metode) {
      case 'murid_scan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Smartphone className="w-3 h-3 text-indigo-500" />
            QR Siswa
          </span>
        );
      case 'guru_scan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Users className="w-3 h-3 text-purple-500" />
            Scan Guru
          </span>
        );
      case 'piket_scan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            Guru Piket
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Edit2 className="w-3 h-3 text-slate-500" />
            Manual TU
          </span>
        );
    }
  };

  // WhatsApp Sender Helper
  const handleSendWhatsApp = (item) => {
    const student = item.siswa;
    const parentPhone = student?.orang_tua?.no_whatsapp || '';
    if (!parentPhone) {
      toast.warning(
        `Nomor WhatsApp orang tua untuk ${student?.nama || 'siswa'} belum terdaftar.`,
        'Nomor Tidak Ditemukan'
      );
      return;
    }

    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const schoolName = settings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN';
    const statusText =
      item.status === 'H' ? 'HADIR' : item.status === 'S' ? 'SAKIT' : item.status === 'I' ? 'IZIN' : 'ALPA (Tanpa Keterangan)';

    const msg = `*NOTIFIKASI PRESENSI RESMI - ${schoolName}*
----------------------------------------
Yth. Orang Tua / Wali dari:
*Nama:* ${student?.nama || '-'}
*NIS:* ${item.nis}
*Kelas:* ${student?.kelas?.nama_kelas || '-'}

Dengan ini kami menginformasikan bahwa data kehadiran ananda pada:
*Hari/Tanggal:* ${formatTanggalIndo(item.tanggal)}
*Pukul:* ${item.waktu || '-'} WITA
*Status Presensi:* *${statusText}*
*Keterangan:* ${item.keterangan || '-'}

Pesan ini dikirim secara otomatis melalui Sistem Informasi & Presensi Digital Sekolah (SIAK). Terima kasih atas perhatian Bapak/Ibu.`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${finalPhone}?text=${encoded}`, '_blank');
  };

  // Single Delete Handler
  const handleDeleteSingle = async (item) => {
    const studentName = item.siswa?.nama || item.nis;
    const ok = await showConfirm({
      title: 'Hapus Catatan Absensi',
      message: `Apakah Anda yakin ingin menghapus data absensi siswa "${studentName}" pada tanggal ${formatTanggalIndo(item.tanggal)}? Tindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });

    if (!ok) return;

    try {
      const { error } = await supabase.from('absensi').delete().eq('id_absensi', item.id_absensi);
      if (error) throw error;

      toast.success(`Data absensi siswa ${studentName} berhasil dihapus.`);
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Hapus Absensi',
        category: 'presensi',
        details: `Menghapus catatan absensi ${studentName} (NIS: ${item.nis}) tanggal ${item.tanggal}`,
        status: 'success',
      });

      setAttendanceList((prev) => prev.filter((i) => i.id_absensi !== item.id_absensi));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id_absensi));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Gagal menghapus data absensi: ' + err.message);
    }
  };

  // Batch Status Change Handler
  const handleBatchUpdateStatus = async (newStatus) => {
    if (selectedIds.length === 0) return;

    const statusLabel =
      newStatus === 'H' ? 'Hadir' : newStatus === 'S' ? 'Sakit' : newStatus === 'I' ? 'Izin' : 'Alpa';

    const ok = await showConfirm({
      title: `Ubah Status Massal ke "${statusLabel}"`,
      message: `Apakah Anda yakin ingin mengubah status ${selectedIds.length} data absensi yang dipilih menjadi "${statusLabel}"?`,
      type: 'warning',
      confirmText: `Ya, Ubah ke ${statusLabel}`,
      cancelText: 'Batal',
    });

    if (!ok) return;

    try {
      const { error } = await supabase
        .from('absensi')
        .update({ status: newStatus })
        .in('id_absensi', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} data absensi berhasil diubah menjadi ${statusLabel}.`);
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Batch Update Status Absensi',
        category: 'presensi',
        details: `Mengubah ${selectedIds.length} catatan absensi massal menjadi ${statusLabel}`,
        status: 'success',
      });

      setAttendanceList((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id_absensi) ? { ...item, status: newStatus } : item
        )
      );
      setSelectedIds([]);
    } catch (err) {
      console.error('Batch status update error:', err);
      toast.error('Gagal memperbarui status massal: ' + err.message);
    }
  };

  // Batch Delete Handler
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const ok = await showConfirm({
      title: `Hapus ${selectedIds.length} Catatan Absensi`,
      message: `Apakah Anda yakin ingin menghapus permanen ${selectedIds.length} data absensi yang dipilih?`,
      type: 'danger',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
    });

    if (!ok) return;

    try {
      const { error } = await supabase
        .from('absensi')
        .delete()
        .in('id_absensi', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} data absensi berhasil dihapus.`);
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Batch Delete Absensi',
        category: 'presensi',
        details: `Menghapus massal ${selectedIds.length} catatan log absensi siswa`,
        status: 'warning',
      });

      setAttendanceList((prev) => prev.filter((item) => !selectedIds.includes(item.id_absensi)));
      setSelectedIds([]);
    } catch (err) {
      console.error('Batch delete error:', err);
      toast.error('Gagal menghapus data massal: ' + err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setRecordToEdit({
      ...item,
      newStatus: item.status,
      newTanggal: item.tanggal,
      newWaktu: item.waktu || '07:15',
      newKeterangan: item.keterangan || '',
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Handler
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!recordToEdit) return;

    try {
      const payload = {
        status: recordToEdit.newStatus,
        tanggal: recordToEdit.newTanggal,
        waktu: recordToEdit.newWaktu,
        keterangan: recordToEdit.newKeterangan,
      };

      const { error } = await supabase
        .from('absensi')
        .update(payload)
        .eq('id_absensi', recordToEdit.id_absensi);

      if (error) throw error;

      toast.success('Koreksi data absensi berhasil disimpan!');
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Koreksi Data Absensi',
        category: 'presensi',
        details: `Koreksi absensi ${recordToEdit.siswa?.nama || recordToEdit.nis}: Status ${recordToEdit.status} -> ${recordToEdit.newStatus}`,
        status: 'success',
      });

      setAttendanceList((prev) =>
        prev.map((item) =>
          item.id_absensi === recordToEdit.id_absensi
            ? { ...item, ...payload, status: recordToEdit.newStatus }
            : item
        )
      );

      setIsEditModalOpen(false);
      setRecordToEdit(null);
    } catch (err) {
      console.error('Save edit error:', err);
      toast.error('Gagal menyimpan koreksi: ' + err.message);
    }
  };

  // Open Manual Attendance Modal
  const handleOpenManual = () => {
    const curTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    setManualForm({
      nis: '',
      id_kelas: classes.length > 0 ? classes[0].id_kelas : '',
      tanggal: todayStr,
      waktu: curTime || '07:15',
      status: 'H',
      id_jadwal: '',
      keterangan: 'Input Manual oleh Administrator / Piket',
      foto_bukti_izin: '',
      notifyWa: false,
    });
    setIsManualModalOpen(true);
  };

  // Save Manual Attendance Form
  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.nis) {
      toast.warning('Silakan pilih siswa terlebih dahulu.');
      return;
    }

    try {
      const payload = {
        nis: manualForm.nis,
        tanggal: manualForm.tanggal,
        waktu: manualForm.waktu,
        status: manualForm.status,
        metode: 'manual',
        keterangan: manualForm.keterangan || 'Input Manual Susulan',
        id_jadwal: manualForm.id_jadwal || null,
        foto_bukti_izin: manualForm.foto_bukti_izin || null,
      };

      // Check if duplicate on same date & schedule
      let queryCheck = supabase
        .from('absensi')
        .select('id_absensi')
        .eq('nis', manualForm.nis)
        .eq('tanggal', manualForm.tanggal);

      if (manualForm.id_jadwal) {
        queryCheck = queryCheck.eq('id_jadwal', manualForm.id_jadwal);
      } else {
        queryCheck = queryCheck.is('id_jadwal', null);
      }

      const { data: existing } = await queryCheck;

      let savedRecord = null;
      if (existing && existing.length > 0) {
        // Update existing record
        const { data, error } = await supabase
          .from('absensi')
          .update(payload)
          .eq('id_absensi', existing[0].id_absensi)
          .select()
          .single();
        if (error) throw error;
        savedRecord = data;
        toast.success('Data absensi siswa berhasil diperbarui!');
      } else {
        // Insert new record
        const { data, error } = await supabase.from('absensi').insert([payload]).select().single();
        if (error) throw error;
        savedRecord = data;
        toast.success('Presensi manual berhasil dicatat!');
      }

      const studentObj = students.find((s) => s.nis === manualForm.nis);

      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Input Presensi Manual',
        category: 'presensi',
        details: `Input manual presensi siswa ${studentObj?.nama || manualForm.nis} (Status: ${manualForm.status})`,
        status: 'success',
      });

      // Optionally send WA
      if (manualForm.notifyWa && studentObj) {
        handleSendWhatsApp({
          nis: manualForm.nis,
          tanggal: manualForm.tanggal,
          waktu: manualForm.waktu,
          status: manualForm.status,
          keterangan: manualForm.keterangan,
          siswa: studentObj,
        });
      }

      setIsManualModalOpen(false);
      fetchAttendance();
    } catch (err) {
      console.error('Manual attendance save error:', err);
      toast.error('Gagal menyimpan presensi manual: ' + err.message);
    }
  };

  // Export Filtered Records to Excel
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      toast.warning('Tidak ada data absensi untuk diekspor pada filter ini.');
      return;
    }

    try {
      const rows = filteredList.map((item, idx) => ({
        No: idx + 1,
        Tanggal: item.tanggal,
        Waktu: item.waktu || '-',
        NIS: item.nis,
        Nama_Siswa: item.siswa?.nama || '-',
        Kelas: item.siswa?.kelas?.nama_kelas || '-',
        Status:
          item.status === 'H' ? 'Hadir' : item.status === 'S' ? 'Sakit' : item.status === 'I' ? 'Izin' : 'Alpa',
        Metode:
          item.metode === 'murid_scan'
            ? 'QR Siswa Mandiri'
            : item.metode === 'guru_scan'
            ? 'Scan Guru'
            : item.metode === 'piket_scan'
            ? 'Guru Piket'
            : 'Input Manual',
        Mata_Pelajaran: item.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Harian',
        Keterangan: item.keterangan || '-',
        No_WhatsApp_Ortu: item.siswa?.orang_tua?.no_whatsapp || '-',
        Ada_Bukti_Surat: item.foto_bukti_izin ? 'Ada Foto' : 'Tidak Ada',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Absensi');

      // Auto width
      const maxCols = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.max(k.length, 14),
      }));
      worksheet['!cols'] = maxCols;

      const filename = `Data_Absensi_SIAK_${startDate}_sd_${endDate}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`File Excel berhasil diunduh: ${filename}`);
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Export Excel Data Absensi',
        category: 'presensi',
        details: `Mengunduh file Excel data absensi sebanyak ${rows.length} baris`,
        status: 'success',
      });
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Gagal mengekspor file Excel: ' + err.message);
    }
  };

  // Filter students for manual modal based on class
  const studentsInSelectedClass = useMemo(() => {
    if (!manualForm.id_kelas) return students;
    return students.filter((s) => String(s.id_kelas) === String(manualForm.id_kelas));
  }, [students, manualForm.id_kelas]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION & MAIN ACTIONS */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  Kelola Data Absensi
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Manajemen log transaksi presensi, validasi surat izin/sakit, koreksi status & input susulan
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* View Mode Toggle Switcher: 4 Opsi Visual Lengkap */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tabel Transaksi Operasional & Log"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel Data</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-purple-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Matriks Kisi-kisi Presensi Bulanan Per Siswa (Buku Absen Digital)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matriks Kelas</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kalender Presensi Kelas & Jadwal Sesi KBM"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Kalender Kelas</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'analytics'
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Komparasi Tingkat 7, 8, 9, Leaderboard Kelas & Grafik Tren"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Komparasi & Tren</span>
              </button>
            </div>

            {viewMode === 'table' && (
              <>
                {/* Tombol Input Manual Susulan */}
                <button
                  type="button"
                  onClick={handleOpenManual}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Input Susulan</span>
                </button>

                {/* Tombol Cetak Rapor Siswa Resmi (PDF) */}
                <button
                  type="button"
                  onClick={() => handleOpenStudentPdf(null)}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                  title="Cetak Rapor Rekap Presensi Siswa Resmi (PDF)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Cetak Rapor Siswa</span>
                </button>

                {/* Tombol Rekap Presensi Kelas (PDF & Excel) */}
                <button
                  type="button"
                  onClick={() => handleOpenClassReport(null)}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                  title={
                    selectedClassId !== 'all'
                      ? `Cetak Rekap Presensi Kelas ${classes.find((c) => String(c.id_kelas) === String(selectedClassId))?.nama_kelas || ''} (PDF & Excel)`
                      : 'Cetak Laporan Rekapitulasi Presensi Kelas Resmi (PDF & Excel)'
                  }
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    {selectedClassId !== 'all'
                      ? `Rekap Kelas ${classes.find((c) => String(c.id_kelas) === String(selectedClassId))?.nama_kelas || ''}`
                      : 'Rekap Presensi Kelas'}
                  </span>
                </button>

                {/* Tombol Ekspor Excel Log Transaksi */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  title="Unduh log transaksi presensi yang terfilter ke Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>

                {/* Tombol Refresh */}
                <button
                  type="button"
                  onClick={fetchAttendance}
                  disabled={loading}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. STATISTIC METRIC CARDS (Hanya tampil saat mode Tabel) */}
        {viewMode === 'table' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-100">
          {/* Total Data */}
          <div
            onClick={() => setSelectedStatus('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Catatan</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[10px] font-medium text-slate-400 mt-0.5">Semua data terfilter</div>
          </div>

          {/* Hadir */}
          <div
            onClick={() => setSelectedStatus('H')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === 'H'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Hadir (H)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{stats.hadir}</div>
            <div className="text-[10px] font-semibold text-emerald-600/80 mt-0.5">{stats.hadirPct}% Kehadiran</div>
          </div>

          {/* Sakit */}
          <div
            onClick={() => setSelectedStatus('S')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === 'S'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Sakit (S)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700">{stats.sakit}</div>
            <div className="text-[10px] font-medium text-amber-600/80 mt-0.5">Surat / keterangan sakit</div>
          </div>

          {/* Izin */}
          <div
            onClick={() => setSelectedStatus('I')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === 'I'
                ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20'
                : 'bg-sky-50/30 border-sky-100 hover:bg-sky-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Izin (I)</span>
              <FileText className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-sky-700">{stats.izin}</div>
            <div className="text-[10px] font-medium text-sky-600/80 mt-0.5">Izin orang tua / acara</div>
          </div>

          {/* Alpa */}
          <div
            onClick={() => setSelectedStatus('A')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              selectedStatus === 'A'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Alpa (A)</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-rose-700">{stats.alpa}</div>
            <div className="text-[10px] font-medium text-rose-600/80 mt-0.5">Tanpa keterangan</div>
          </div>
        </div>
      )}
    </div>

      {/* ========================================================= */}
      {/* KONDISIONAL RENDER BERDASARKAN VIEW MODE                  */}
      {/* ========================================================= */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          <ClassAttendanceCalendar
            classes={classes}
            initialKelasId={selectedClassId === 'all' ? (initialClassId || 'all') : selectedClassId}
            allowEdit={true}
            isAdmin={true}
            onBack={() => setViewMode('table')}
            onManageSchedule={onManageSchedule}
          />
        </div>
      ) : viewMode === 'matrix' ? (
        <div className="space-y-4">
          <AttendanceMatrixView
            classes={classes}
            students={students}
            initialClassId={selectedClassId === 'all' ? (initialClassId || '') : selectedClassId}
            onSwitchToCalendar={() => setViewMode('calendar')}
          />
        </div>
      ) : viewMode === 'analytics' ? (
        <div className="space-y-4">
          <AttendanceAnalyticsView
            classes={classes}
            students={students}
            teachers={teachers}
            onSelectClass={(clsId) => {
              setSelectedClassId(clsId);
              setViewMode('matrix');
            }}
          />
        </div>
      ) : (
        <>
          {/* 3. COMPREHENSIVE FILTER CONTROLS */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200 bg-white/80 backdrop-blur-md shadow-xs space-y-4">
        {/* Preset Date Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'all', label: 'Semua Riwayat' },
              { id: 'thisMonth', label: 'Bulan Ini' },
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'last7', label: '7 Hari Terakhir' },
              { id: 'last30', label: '30 Hari Terakhir' },
              { id: 'custom', label: 'Kustom Rentang' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range display */}
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Periode: <strong className="text-slate-700">{formatTanggalIndo(startDate)}</strong> s/d{' '}
              <strong className="text-slate-700">{formatTanggalIndo(endDate)}</strong>
            </span>
          </div>
        </div>

        {/* Custom Date Pickers (Shown if custom preset is selected) */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Mulai:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>
        )}

        {/* Granular Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama Siswa / NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kelas */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white"
            >
              <option value="all">Semua Kelas ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  Kelas {c.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white"
            >
              <option value="all">Semua Status (Hadir, Sakit, Izin, Alpa)</option>
              <option value="H">Hadir (H)</option>
              <option value="S">Sakit (S)</option>
              <option value="I">Izin (I)</option>
              <option value="A">Alpa (A)</option>
            </select>
          </div>

          {/* Filter Metode Presensi */}
          <div>
            <select
              value={selectedMetode}
              onChange={(e) => setSelectedMetode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white"
            >
              <option value="all">Semua Metode Presensi</option>
              <option value="murid_scan">Scan QR Siswa Mandiri</option>
              <option value="guru_scan">Scan oleh Guru KBM</option>
              <option value="piket_scan">Scan oleh Guru Piket</option>
              <option value="manual">Input Manual / Susulan TU</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. BATCH ACTIONS FLOATING / STICKY BAR */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500 text-white font-black text-xs rounded-lg">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">Catatan presensi dipilih</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Ubah Status ke:</span>

            <button
              type="button"
              onClick={() => handleBatchUpdateStatus('H')}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Set Hadir (H)
            </button>
            <button
              type="button"
              onClick={() => handleBatchUpdateStatus('S')}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Set Sakit (S)
            </button>
            <button
              type="button"
              onClick={() => handleBatchUpdateStatus('I')}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Set Izin (I)
            </button>
            <button
              type="button"
              onClick={() => handleBatchUpdateStatus('A')}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Set Alpa (A)
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Batal Pilih"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN ATTENDANCE DATA TABLE */}
      <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedList.length > 0 &&
                      paginatedList.every((item) => selectedIds.includes(item.id_absensi))
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Tanggal & Waktu</th>
                <th className="py-3.5 px-4">Siswa & Kelas</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Sesi KBM / Mapel</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4 text-center">Bukti Surat</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right pr-6">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="font-semibold text-sm">Memuat data absensi sekolah...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Tidak ada catatan absensi</p>
                      <p className="text-xs text-slate-400 text-center">
                        Tidak ditemukan catatan presensi sesuai kriteria filter tanggal dan status yang dipilih.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenManual}
                        className="mt-2 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        + Input Presensi Susulan Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const student = item.siswa;
                  const isSelected = selectedIds.includes(item.id_absensi);
                  const parentPhone = student?.orang_tua?.no_whatsapp || '';

                  return (
                    <tr
                      key={item.id_absensi}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id_absensi)}
                          className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatTanggalIndo(item.tanggal)}</div>
                        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.waktu ? `${item.waktu} WITA` : '-'}</span>
                        </div>
                      </td>

                      {/* Siswa & Kelas */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {student?.foto_wajah ? (
                              <img
                                src={student.foto_wajah}
                                alt={student.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 line-clamp-1">
                              {student?.nama || `NIS: ${item.nis}`}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                              <span>NIS: {item.nis}</span>
                              <span>•</span>
                              <span className="font-bold text-blue-600">
                                {student?.kelas?.nama_kelas || 'Kelas -'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Sesi KBM / Mapel */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">
                          {item.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Umum / Harian'}
                        </div>
                        {item.jadwal && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.jadwal.jam_mulai} - {item.jadwal.jam_selesai} • {item.jadwal.guru?.nama || '-'}
                          </div>
                        )}
                      </td>

                      {/* Metode Presensi */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderMetodeBadge(item.metode)}
                      </td>

                      {/* Bukti Foto Surat Izin / Sakit */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.foto_bukti_izin ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxData({
                                isOpen: true,
                                url: item.foto_bukti_izin,
                                studentName: student?.nama || item.nis,
                                date: item.tanggal,
                                status: item.status,
                                keterangan: item.keterangan,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            title="Klik untuk melihat bukti foto surat"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                            <span>Lihat Foto</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Keterangan */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 text-xs truncate" title={item.keterangan || '-'}>
                          {item.keterangan || '-'}
                        </p>
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Cetak Rapor Rekap Presensi Siswa Resmi (PDF) */}
                          <button
                            type="button"
                            onClick={() => {
                              const studentObj = student || students.find((s) => String(s.nis) === String(item.nis));
                              handleOpenStudentPdf(studentObj);
                            }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            title={`Cetak Rapor Rekap Presensi Siswa Resmi (PDF) - ${student?.nama || item.nis}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          </button>

                          {/* Notifikasi WhatsApp ke Ortu */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title={`Kirim WA ke orang tua (${parentPhone || 'Belum terdaftar'})`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {/* Koreksi / Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            title="Koreksi Data Absensi"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(item)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

        {/* 6. TABLE FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Menampilkan{' '}
            <strong className="text-slate-700">
              {filteredList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-slate-700">
              {Math.min(currentPage * pageSize, filteredList.length)}
            </strong>{' '}
            dari <strong className="text-slate-700">{filteredList.length}</strong> data presensi
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2.5 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: INPUT PRESENSI SUSULAN / MANUAL                   */}
      {/* ========================================================= */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Input Presensi Susulan / Manual</h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    Catat kehadiran siswa susulan atau tanpa gawai
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Filter Kelas Dulu untuk Mempermudah Pilih Siswa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Kelas <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualForm.id_kelas}
                  onChange={(e) => {
                    setManualForm({ ...manualForm, id_kelas: e.target.value, nis: '' });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id_kelas} value={c.id_kelas}>
                      Kelas {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Siswa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Nama Siswa <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualForm.nis}
                  onChange={(e) => setManualForm({ ...manualForm, nis: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Pilih Siswa ({studentsInSelectedClass.length} Siswa) --</option>
                  {studentsInSelectedClass.map((s) => (
                    <option key={s.nis} value={s.nis}>
                      {s.nama} (NIS: {s.nis})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tanggal</label>
                  <input
                    type="date"
                    value={manualForm.tanggal}
                    onChange={(e) => setManualForm({ ...manualForm, tanggal: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Waktu Scan</label>
                  <input
                    type="time"
                    value={manualForm.waktu}
                    onChange={(e) => setManualForm({ ...manualForm, waktu: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Status Pilihan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Status Presensi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'H', label: 'Hadir', col: 'emerald' },
                    { val: 'S', label: 'Sakit', col: 'amber' },
                    { val: 'I', label: 'Izin', col: 'sky' },
                    { val: 'A', label: 'Alpa', col: 'rose' },
                  ].map((st) => (
                    <label
                      key={st.val}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        manualForm.status === st.val
                          ? `bg-${st.col}-100 border-${st.col}-500 text-${st.col}-800 ring-2 ring-${st.col}-400/40`
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="manual_status"
                        value={st.val}
                        checked={manualForm.status === st.val}
                        onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                        className="hidden"
                      />
                      <span>{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Keterangan / Alasan</label>
                <textarea
                  rows="2"
                  placeholder="Misal: Siswa lupa membawa kartu identitas / surat dokter terlampir"
                  value={manualForm.keterangan}
                  onChange={(e) => setManualForm({ ...manualForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* URL Foto Bukti Izin / Surat (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  URL Foto Bukti Surat (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={manualForm.foto_bukti_izin}
                  onChange={(e) => setManualForm({ ...manualForm, foto_bukti_izin: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Opsi Kirim WhatsApp ke Orang Tua Langsung */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.notifyWa}
                  onChange={(e) => setManualForm({ ...manualForm, notifyWa: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  Kirim Notifikasi WhatsApp ke Orang Tua setelah disimpan
                </span>
              </label>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: KOREKSI DATA ABSENSI                             */}
      {/* ========================================================= */}
      {isEditModalOpen && recordToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Koreksi Data Absensi</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Ubah status kehadiran & catatan riwayat siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Info Siswa */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shrink-0">
                  {recordToEdit.siswa?.nama ? recordToEdit.siswa.nama.charAt(0) : 'S'}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    {recordToEdit.siswa?.nama || recordToEdit.nis}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    NIS: {recordToEdit.nis} • Kelas:{' '}
                    <strong className="text-blue-600">
                      {recordToEdit.siswa?.kelas?.nama_kelas || '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Status Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Status Kehadiran</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'H', label: 'Hadir', col: 'emerald' },
                    { val: 'S', label: 'Sakit', col: 'amber' },
                    { val: 'I', label: 'Izin', col: 'sky' },
                    { val: 'A', label: 'Alpa', col: 'rose' },
                  ].map((st) => (
                    <label
                      key={st.val}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex flex-col items-center gap-1 ${
                        recordToEdit.newStatus === st.val
                          ? `bg-${st.col}-100 border-${st.col}-500 text-${st.col}-800 ring-2 ring-${st.col}-400/40`
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_status"
                        value={st.val}
                        checked={recordToEdit.newStatus === st.val}
                        onChange={(e) =>
                          setRecordToEdit({ ...recordToEdit, newStatus: e.target.value })
                        }
                        className="hidden"
                      />
                      <span>{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tanggal</label>
                  <input
                    type="date"
                    value={recordToEdit.newTanggal}
                    onChange={(e) =>
                      setRecordToEdit({ ...recordToEdit, newTanggal: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Waktu</label>
                  <input
                    type="time"
                    value={recordToEdit.newWaktu}
                    onChange={(e) =>
                      setRecordToEdit({ ...recordToEdit, newWaktu: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Alasan Koreksi / Keterangan</label>
                <textarea
                  rows="2"
                  value={recordToEdit.newKeterangan}
                  onChange={(e) =>
                    setRecordToEdit({ ...recordToEdit, newKeterangan: e.target.value })
                  }
                  placeholder="Misal: Surat dokter menyusul diserahkan ke ruang BK"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: LIGHTBOX PREVIEW BUKTI FOTO SURAT                */}
      {/* ========================================================= */}
      {lightboxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">
                  Bukti Foto Surat - {lightboxData.studentName}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tanggal: {formatTanggalIndo(lightboxData.date)} • Status: {lightboxData.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              <img
                src={lightboxData.url}
                alt="Foto Bukti Izin"
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-400">
                Keterangan: <span className="text-slate-200">{lightboxData.keterangan || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxData(null)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL LAPORAN REKAP PRESENSI KELAS (LOCAL FALLBACK) */}
      {!onOpenClassReport && localClassForReport && (
        <ClassAttendanceReportModal
          isOpen={Boolean(localClassForReport)}
          onClose={() => setLocalClassForReport(null)}
          kelas={localClassForReport}
          schoolSettings={settings}
          isAdmin={true}
        />
      )}

      {/* MODAL CETAK RAPOR REKAP PRESENSI SISWA RESMI (LOCAL FALLBACK) */}
      {!onOpenStudentPdfReport && localIsPdfOpen && (
        <StudentAttendancePdfModal
          isOpen={localIsPdfOpen}
          onClose={() => {
            setLocalIsPdfOpen(false);
            setLocalStudentForPdf(null);
          }}
          allStudents={students}
          classes={classes}
          teachers={teachers}
          initialStudent={localStudentForPdf}
          schoolSettings={settings}
        />
      )}
    </div>
  );
}
