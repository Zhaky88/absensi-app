import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Shield,
  Search,
  Filter,
  Printer,
  Download,
  RefreshCw,
  Trash2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Laptop,
  Smartphone,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  X,
  Eye,
  SlidersHorizontal,
  ExternalLink,
  FileDown,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getActivityLogs, clearActivityLogs, logActivity } from '../lib/activityLogger';
import { useToast } from '../context/ToastModalContext';

export default function AdminActivityLogCenter() {
  const { toast, showConfirm } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'admin' | 'guru' | 'murid' | 'ortu' | 'sistem'
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'presensi' | 'kbm' | 'autentikasi' | 'master_data' | 'pengaturan' | 'izin'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'success' | 'warning' | 'error'
  const [filterDateRange, setFilterDateRange] = useState('all'); // 'all' | 'today' | '7days' | '30days'

  // Print Modal & Options State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPaperOrientation, setPrintPaperOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [printLimitCount, setPrintLimitCount] = useState('all'); // 'all' | '25' | '50' | '100'
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Identitas Sekolah
  const schoolSettings = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
      return {
        sekolah_nama: saved.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_dinas: saved.sekolah_dinas || 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN',
        sekolah_alamat: saved.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: saved.sekolah_kota || 'Kota Bangun, Kutai Kartanegara',
        sekolah_npsn: saved.sekolah_npsn || '30401234',
        sekolah_akreditasi: saved.sekolah_akreditasi || 'A (Unggul)',
        kepala_sekolah_nama: saved.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: saved.kepala_sekolah_nip || '197003121995121001',
        sekolah_stempel: saved.sekolah_stempel || '',
      };
    } catch (e) {
      return {
        sekolah_nama: 'SMP NEGERI 2 KOTA BANGUN',
        sekolah_dinas: 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN',
        sekolah_alamat: 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun',
        sekolah_kota: 'Kota Bangun, Kutai Kartanegara',
        sekolah_npsn: '30401234',
        sekolah_akreditasi: 'A (Unggul)',
        kepala_sekolah_nama: 'Drs. H. Mulyadi, M.Pd',
        kepala_sekolah_nip: '197003121995121001',
        sekolah_stempel: '',
      };
    }
  }, []);

  const adminProfile = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('siak_admin_profile') || '{}');
      return {
        nama: saved.nama || 'Administrator SIAK',
        nip: saved.nip || '198205202008011003',
        jabatan: saved.jabatan || 'Koordinator IT & Admin Sistem SIAK',
      };
    } catch (e) {
      return {
        nama: 'Administrator SIAK',
        nip: '198205202008011003',
        jabatan: 'Koordinator IT & Admin Sistem SIAK',
      };
    }
  }, []);

  // Fetch logs
  const refreshLogs = () => {
    setLoading(true);
    const data = getActivityLogs();
    setLogs(data);
    setTimeout(() => setLoading(false), 200);
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // 1. Role
      if (filterRole !== 'all' && item.role !== filterRole) return false;

      // 2. Kategori
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;

      // 3. Status
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;

      // 4. Rentang Tanggal
      if (filterDateRange !== 'all') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        if (filterDateRange === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          if (itemDate < sevenDaysAgo) return false;
        } else if (filterDateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
          if (itemDate < thirtyDaysAgo) return false;
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.userName || '').toLowerCase().includes(q);
        const matchUser = (item.userId || '').toLowerCase().includes(q);
        const matchAction = (item.action || '').toLowerCase().includes(q);
        const matchDetails = (item.details || '').toLowerCase().includes(q);
        const matchDevice = (item.ipOrDevice || '').toLowerCase().includes(q);
        return matchName || matchUser || matchAction || matchDetails || matchDevice;
      }

      return true;
    });
  }, [logs, filterRole, filterCategory, filterStatus, filterDateRange, searchQuery]);

  // Logs to be printed (applying limit if selected)
  const logsToPrint = useMemo(() => {
    if (printLimitCount === 'all') return filteredLogs;
    const limit = parseInt(printLimitCount, 10);
    return filteredLogs.slice(0, limit);
  }, [filteredLogs, printLimitCount]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const total = logs.length;
    const now = new Date();
    const todayCount = logs.filter((l) => new Date(l.timestamp).toDateString() === now.toDateString()).length;
    const presensiCount = logs.filter((l) => l.category === 'presensi' || l.category === 'kbm').length;
    const warningCount = logs.filter((l) => l.status === 'warning' || l.status === 'error').length;
    const authCount = logs.filter((l) => l.category === 'autentikasi').length;

    return { total, todayCount, presensiCount, warningCount, authCount };
  }, [logs]);

  // Handle Clear Logs
  const handleClearLogs = async () => {
    const confirmed = await showConfirm({
      title: 'Hapus Semua Riwayat Log?',
      message: 'Apakah Anda yakin ingin mengosongkan seluruh data audit log? Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      confirmText: 'Ya, Kosongkan Log',
      cancelText: 'Batal',
    });

    if (confirmed) {
      clearActivityLogs();
      refreshLogs();
      toast.success('Seluruh riwayat log aktivitas telah dibersihkan.');
    }
  };

  // Helper Formatters
  function formatDateTimeFull(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function formatTimeRelative(isoString) {
    if (!isoString) return '-';
    const now = new Date();
    const d = new Date(isoString);
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 172800) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function formatRoleLabel(role) {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'guru':
        return 'Guru / Pendidik';
      case 'murid':
        return 'Siswa / Murid';
      case 'ortu':
        return 'Orang Tua / Wali';
      case 'sistem':
        return 'Sistem Otomatis';
      default:
        return role;
    }
  }

  function formatCategoryLabel(cat) {
    switch (cat) {
      case 'presensi':
        return 'Presensi Siswa';
      case 'kbm':
        return 'KBM & Jurnal';
      case 'autentikasi':
        return 'Keamanan & Login';
      case 'master_data':
        return 'Data Master';
      case 'pengaturan':
        return 'Pengaturan & GPS';
      case 'izin':
        return 'Perizinan & Wali';
      default:
        return cat;
    }
  }

  function getRoleBadge(role) {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'guru':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'murid':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ortu':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sistem':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  }

  // ===========================================================================
  // STANDALONE HTML GENERATOR UNTUK CETAK 100% RELIABEL
  // ===========================================================================
  function generateActivityLogPrintHtml() {
    const printDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const printTime = formatDateTimeFull(new Date().toISOString());

    const tableRows = logsToPrint
      .map(
        (item, idx) => `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="text-align: center; font-weight: bold; padding: 5px 6px; border: 1px solid #475569;">${idx + 1}</td>
        <td style="font-family: monospace; font-size: 8.5px; padding: 5px 6px; border: 1px solid #475569; white-space: nowrap;">${formatDateTimeFull(item.timestamp)}</td>
        <td style="padding: 5px 6px; border: 1px solid #475569;">
          <div style="font-weight: 800; color: #0f172a;">${escapeHtml(item.userName)}</div>
          <div style="font-size: 8.5px; color: #475569; font-family: monospace;">[${formatRoleLabel(item.role)}] ${escapeHtml(item.userId)}</div>
        </td>
        <td style="padding: 5px 6px; border: 1px solid #475569; font-weight: 600;">${formatCategoryLabel(item.category)}</td>
        <td style="padding: 5px 6px; border: 1px solid #475569;">
          <div style="font-weight: 800; color: #0f172a;">${escapeHtml(item.action)}</div>
          <div style="font-size: 8.5px; color: #334155; margin-top: 2px; line-height: 1.35;">${escapeHtml(item.details)}</div>
        </td>
        <td style="text-align: center; font-weight: bold; font-size: 8.5px; text-transform: uppercase; padding: 5px 6px; border: 1px solid #475569; color: ${
          item.status === 'warning' ? '#b45309' : item.status === 'error' ? '#b91c1c' : '#047857'
        };">
          ${item.status}
        </td>
        <td style="font-size: 8.5px; color: #475569; padding: 5px 6px; border: 1px solid #475569;">${escapeHtml(item.ipOrDevice || '-')}</td>
      </tr>
    `
      )
      .join('');

    const signatureBlock = includeSignatures
      ? `
      <div style="display: flex; justify-content: space-between; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #cbd5e1; page-break-inside: avoid; font-size: 10px;">
        <div style="width: 45%; text-align: center;">
          <p style="margin: 0; color: #475569;">Mengetahui,</p>
          <p style="margin: 2px 0 0 0; font-weight: 800; color: #0f172a;">Kepala SMP Negeri 2 Kota Bangun</p>
          <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
            ${
              schoolSettings.sekolah_stempel
                ? `<img src="${schoolSettings.sekolah_stempel}" alt="Stempel" style="height: 50px; object-fit: contain; opacity: 0.85;" />`
                : `<span style="font-size: 9px; color: #94a3b8; font-style: italic;">[Stempel & Tanda Tangan]</span>`
            }
          </div>
          <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase; color: #0f172a;">${schoolSettings.kepala_sekolah_nama}</p>
          <p style="margin: 2px 0 0 0; font-size: 9px; font-family: monospace; color: #475569;">NIP. ${schoolSettings.kepala_sekolah_nip}</p>
        </div>

        <div style="width: 45%; text-align: center;">
          <p style="margin: 0; color: #475569;">Kota Bangun, ${printDate}</p>
          <p style="margin: 2px 0 0 0; font-weight: 800; color: #0f172a;">${adminProfile.jabatan}</p>
          <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 9px; color: #94a3b8; font-style: italic;">[Tanda Tangan Petugas Audit]</span>
          </div>
          <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase; color: #0f172a;">${adminProfile.nama}</p>
          <p style="margin: 2px 0 0 0; font-size: 9px; font-family: monospace; color: #475569;">NIP. ${adminProfile.nip}</p>
        </div>
      </div>
    `
      : '';

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Dokumen_Audit_Trail_SIAK_${new Date().toISOString().split('T')[0]}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    
    @page {
      size: ${printPaperOrientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
      margin: 8mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      font-size: 9.5px;
      line-height: 1.35;
    }

    .print-sheet {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 8px 12px;
    }

    .kop-header {
      border-bottom: 3px solid #000;
      padding-bottom: 6px;
      margin-bottom: 10px;
      text-align: center;
      position: relative;
    }

    .kop-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .kop-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }

    .kop-text {
      flex: 1;
      text-align: center;
      padding: 0 10px;
    }

    .kop-dinas {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .kop-sekolah {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }

    .kop-info {
      font-size: 8.5px;
      color: #334155;
      margin: 2px 0;
    }

    .kop-divider {
      border-bottom: 1px solid #000;
      margin-top: 5px;
    }

    .doc-title {
      text-align: center;
      margin: 8px 0 10px 0;
    }

    .doc-title h2 {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      text-decoration: underline;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .doc-title p {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      margin: 2px 0 0 0;
    }

    .meta-box {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 9px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9px;
    }

    th, td {
      border: 1px solid #475569;
      padding: 4px 6px;
      vertical-align: top;
    }

    th {
      background: #f1f5f9;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      text-align: left;
    }

    tr {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    <!-- Kop Surat Resmi -->
    <div class="kop-header">
      <div class="kop-flex">
        <img src="https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2" alt="Logo" class="kop-logo" />
        <div class="kop-text">
          <p class="kop-dinas">${schoolSettings.sekolah_dinas}</p>
          <h1 class="kop-sekolah">${schoolSettings.sekolah_nama}</h1>
          <p class="kop-info">${schoolSettings.sekolah_alamat} • NPSN: ${schoolSettings.sekolah_npsn} • Akreditasi: ${schoolSettings.sekolah_akreditasi}</p>
          <p class="kop-info">SIAK Anti-Cheat V4.0 Terpadu • Email: info@smpn2kotabangun.sch.id</p>
        </div>
        <div style="width: 60px;"></div>
      </div>
      <div class="kop-divider"></div>
    </div>

    <!-- Judul Dokumen -->
    <div class="doc-title">
      <h2>DOKUMEN AUDIT TRAIL & LOG AKTIVITAS SISTEM</h2>
      <p>SIAK ANTI-CHEAT V4.0 — TAHUN AJARAN 2026/2027</p>
    </div>

    <!-- Metadata Informasi Cetak -->
    <div class="meta-box">
      <div>
        <div><strong>Waktu Cetak:</strong> ${printTime}</div>
        <div><strong>Dicetak Oleh:</strong> ${adminProfile.nama} (${adminProfile.nip})</div>
      </div>
      <div style="text-align: right;">
        <div><strong>Filter:</strong> Peran: <span style="text-transform: capitalize;">${filterRole}</span> | Kategori: <span style="text-transform: capitalize;">${filterCategory}</span></div>
        <div><strong>Total Log Dicetak:</strong> <strong>${logsToPrint.length} dari ${filteredLogs.length}</strong> Aktivitas</div>
      </div>
    </div>

    <!-- Tabel Rinci -->
    <table>
      <thead>
        <tr>
          <th style="width: 25px; text-align: center;">No</th>
          <th style="width: 110px;">Waktu (WITA)</th>
          <th style="width: 140px;">Pengguna & Peran</th>
          <th style="width: 95px;">Kategori</th>
          <th>Tindakan & Rincian Log Aktivitas</th>
          <th style="width: 60px; text-align: center;">Status</th>
          <th style="width: 95px;">Perangkat</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <!-- Tanda Tangan -->
    ${signatureBlock}
  </div>
</body>
</html>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===========================================================================
  // PILIHAN OPSI CETAK (4 OPSI LENGKAP & ANDAL)
  // ===========================================================================

  // Opsi 1: Cetak Langsung (Printer Dialog via Iframe Terisolasi)
  const handlePrintDirect = () => {
    if (logsToPrint.length === 0) {
      toast.warning('Tidak ada data log untuk dicetak.');
      return;
    }

    try {
      const html = generateActivityLogPrintHtml();
      let iframe = document.getElementById('siak_audit_print_iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'siak_audit_print_iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          toast.success('Dialog cetak dibuka. Pilih printer atau Simpan sebagai PDF.');
        } catch (err) {
          console.warn('Iframe print fallback ke window.print:', err);
          window.print();
        }
      }, 350);
    } catch (e) {
      console.error('Print direct error:', e);
      window.print();
    }
  };

  // Opsi 2: Buka di Tab Baru (Pratinjau Layar Penuh)
  const handleOpenInNewTab = () => {
    if (logsToPrint.length === 0) {
      toast.warning('Tidak ada data log untuk dicetak.');
      return;
    }

    try {
      const html = generateActivityLogPrintHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const newTab = window.open(url, '_blank');

      if (!newTab) {
        toast.warning('Pop-up diblokir peramban. Mengunduh file dokumen HTML...');
        handleDownloadHtml();
      } else {
        toast.success('Dokumen berhasil dibuka di tab baru. Anda dapat menekan Ctrl+P untuk mencetak.');
      }
    } catch (e) {
      console.error('Open new tab error:', e);
      handleDownloadHtml();
    }
  };

  // Opsi 3: Unduh File Dokumen Cetak (.html)
  const handleDownloadHtml = () => {
    if (logsToPrint.length === 0) {
      toast.warning('Tidak ada data log untuk diunduh.');
      return;
    }

    try {
      const html = generateActivityLogPrintHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `Dokumen_Cetak_Log_Aktivitas_SIAK_${dateStr}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('File dokumen cetak (.html) berhasil diunduh. Dapat dibuka dan dicetak kapan saja.');
    } catch (e) {
      console.error('Download html error:', e);
      toast.error('Gagal mengunduh file dokumen.');
    }
  };

  // Opsi 4: Ekspor Data ke Excel (XLSX)
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.warning('Tidak ada data log yang sesuai filter untuk diekspor.');
      return;
    }

    try {
      const dataRows = filteredLogs.map((item, idx) => ({
        No: idx + 1,
        'Waktu (WITA)': formatDateTimeFull(item.timestamp),
        Nama: item.userName,
        'NIP / NIS / ID': item.userId,
        Peran: formatRoleLabel(item.role),
        Kategori: formatCategoryLabel(item.category),
        Tindakan: item.action,
        'Rincian Aktivitas': item.details,
        Status: item.status.toUpperCase(),
        'Perangkat / IP': item.ipOrDevice,
      }));

      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Log_Aktivitas');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Log_Aktivitas_SIAK_${dateStr}.xlsx`);
      toast.success(`Berhasil mengunduh ${filteredLogs.length} data log ke Excel.`);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor data ke Excel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Card Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Khusus Administrator
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                SIAK Anti-Cheat Audit Trail
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-indigo-400" /> Log Aktivitas & Jejak Keamanan Pengguna
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Memantau seluruh interaksi pengguna di sistem secara real-time, meliputi autentikasi, absensi manual guru,
              scan mandiri GPS siswa, pengisian jurnal KBM, dan pembaruan pengaturan sekolah.
            </p>
          </div>

          {/* Action Buttons Top */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              title="Cetak dokumen resmi log aktivitas ke printer atau simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Opsi Cetak & Unduh Dokumen</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              title="Unduh data log ke format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={refreshLogs}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all active:scale-95 cursor-pointer"
              title="Segarkan Log"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all active:scale-95 cursor-pointer"
              title="Bersihkan Semua Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Log Tercatat</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800">{stats.total}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Semua jejak aksi</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Aktivitas Hari Ini</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.todayCount}</span>
            <span className="text-[10px] text-emerald-600/80 block mt-0.5">Tanggal berjalan</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Presensi & KBM</span>
            <span className="text-xl sm:text-2xl font-black text-teal-600">{stats.presensiCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Scan, input manual, QR</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Insiden / Peringatan</span>
            <span className={`text-xl sm:text-2xl font-black ${stats.warningCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {stats.warningCount}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">GPS / Percobaan gagal</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengguna, NIP, NIS, tindakan, atau rincian aktivitas..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Clear Filter */}
          {(filterRole !== 'all' || filterCategory !== 'all' || filterStatus !== 'all' || filterDateRange !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterRole('all');
                setFilterCategory('all');
                setFilterStatus('all');
                setFilterDateRange('all');
              }}
              className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Filter Role */}
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Peran (Role)</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru / Pendidik</option>
              <option value="murid">Siswa / Murid</option>
              <option value="ortu">Orang Tua / Wali</option>
              <option value="sistem">Sistem Otomatis</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Kategori</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="presensi">Presensi Siswa</option>
              <option value="kbm">KBM & Jurnal</option>
              <option value="autentikasi">Autentikasi & Login</option>
              <option value="master_data">Master Data</option>
              <option value="pengaturan">Pengaturan & GPS</option>
              <option value="izin">Perizinan</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="success">Sukses / Berhasil</option>
              <option value="warning">Peringatan / Anti-Cheat</option>
              <option value="error">Gagal / Ditolak</option>
            </select>
          </div>

          {/* Filter Periode */}
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Rentang Waktu</label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Timeline Container */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">Daftar Rekaman Audit Trail</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {filteredLogs.length} Entri
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Urut berdasarkan waktu terbaru</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Log Aktivitas yang Cocok</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan data aktivitas untuk parameter pencarian atau filter yang Anda pilih. Silakan atur ulang filter Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 w-40">Waktu</th>
                  <th className="py-3.5 px-4 w-48">Pengguna (User)</th>
                  <th className="py-3.5 px-4 w-32">Kategori</th>
                  <th className="py-3.5 px-4">Tindakan & Rincian Aktivitas</th>
                  <th className="py-3.5 px-4 w-28 text-center">Status</th>
                  <th className="py-3.5 px-4 w-36">Perangkat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-700">{formatDateTimeFull(item.timestamp)}</div>
                      <div className="text-[10px] text-indigo-500 font-semibold">{formatTimeRelative(item.timestamp)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-800 leading-snug">{item.userName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${getRoleBadge(item.role)}`}>
                          {item.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.userId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        {formatCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.action}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.details}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="uppercase">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1 truncate max-w-[140px]" title={item.ipOrDevice}>
                        {item.ipOrDevice?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                        ) : (
                          <Laptop className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.ipOrDevice}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL CETAK RESMI DENGAN 4 OPSI LENGKAP & ANDAL                           */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none border border-slate-200">
            {/* Modal Header (Dark Themed, Controls) */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                    Opsi Cetak & Unduh Dokumen Audit Trail
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pilih metode cetak yang paling sesuai untuk printer fisik atau arsip PDF resmi
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="self-end md:self-auto p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OPSI & PARAMETER BAR (No Print) */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Jumlah Data yang Dicetak */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    1. Batas Jumlah Log
                  </label>
                  <select
                    value={printLimitCount}
                    onChange={(e) => setPrintLimitCount(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Log Terfilter ({filteredLogs.length} Data)</option>
                    <option value="25">25 Log Terbaru Saja</option>
                    <option value="50">50 Log Terbaru</option>
                    <option value="100">100 Log Terbaru</option>
                  </select>
                </div>

                {/* 2. Orientasi Kertas */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    2. Orientasi Kertas
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintPaperOrientation('landscape')}
                      className={`px-2 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        printPaperOrientation === 'landscape'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Landscape (Lebar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintPaperOrientation('portrait')}
                      className={`px-2 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        printPaperOrientation === 'portrait'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      Portrait (Tegak)
                    </button>
                  </div>
                </div>

                {/* 3. Tanda Tangan Resmi */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    3. Lembar Tanda Tangan
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Sertakan Kolom Kepala Sekolah & Admin
                    </span>
                  </label>
                </div>
              </div>

              {/* ACTION BUTTONS (4 OPSI METODE CETAK) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Siap Cetak: <strong>{logsToPrint.length} Baris Data</strong></span>
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* OPSI 1: CETAK LANGSUNG (IFRAME AUTOMATIC PRINT) */}
                  <button
                    type="button"
                    onClick={handlePrintDirect}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                    title="Cetak langsung menggunakan kotak dialog cetak printer bawaan"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Opsi 1: Cetak Langsung</span>
                  </button>

                  {/* OPSI 2: BUKA DI TAB BARU (FULLSCREEN VIEW) */}
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs border border-indigo-200 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    title="Buka dokumen di tab baru browser lalu tekan Ctrl+P"
                  >
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    <span>Opsi 2: Buka di Tab Baru</span>
                  </button>

                  {/* OPSI 3: UNDUH FILE DOKUMEN HTML */}
                  <button
                    type="button"
                    onClick={handleDownloadHtml}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    title="Unduh file dokumen HTML siap cetak untuk disimpan atau dikirim"
                  >
                    <FileDown className="w-4 h-4 text-slate-600" />
                    <span>Opsi 3: Unduh File HTML</span>
                  </button>

                  {/* OPSI 4: EKSPOR EXCEL */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    title="Unduh seluruh data log ke format spreadsheet Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Opsi 4: Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE DOCUMENT PREVIEW CANVAS (Screen Replica & Fallback Print DOM) */}
            <div className="p-4 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 font-sans text-black bg-slate-200/50 flex justify-center">
              <div
                id="printActivityLogArea"
                className="printable-area w-full max-w-4xl bg-white shadow-xl rounded-2xl p-6 sm:p-8 print:p-0 print:shadow-none print:rounded-none print:w-full print:max-w-none text-black border border-slate-200/80"
              >
                {/* Kop Surat Resmi */}
                <div className="border-b-[3px] border-black pb-3 mb-4 text-center relative">
                  <div className="flex items-center justify-between gap-4">
                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                      <img
                        src="https://placehold.co/100x100/1e3a8a/ffffff?text=SMPN2"
                        alt="Logo Sekolah"
                        className="w-14 h-14 object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex-1 text-center">
                      <h4 className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-black leading-tight">
                        {schoolSettings.sekolah_dinas}
                      </h4>
                      <h1 className="text-base sm:text-lg font-black tracking-wide text-black uppercase mt-0.5">
                        {schoolSettings.sekolah_nama}
                      </h1>
                      <p className="text-[10px] text-gray-800 font-medium mt-0.5">
                        {schoolSettings.sekolah_alamat} • NPSN: {schoolSettings.sekolah_npsn} • Akreditasi: {schoolSettings.sekolah_akreditasi}
                      </p>
                      <p className="text-[9px] text-gray-600 font-medium">
                        Website/Sistem SIAK Terpadu: siak.smpn2kotabangun.sch.id • Email: info@smpn2kotabangun.sch.id
                      </p>
                    </div>
                    <div className="w-16 h-16 shrink-0 hidden sm:block" />
                  </div>
                  {/* Double Border Line Kop */}
                  <div className="border-b border-black mt-2" />
                </div>

                {/* Title Section */}
                <div className="text-center my-3">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline underline-offset-4 text-black">
                    DOKUMEN AUDIT TRAIL & LOG AKTIVITAS SISTEM
                  </h2>
                  <p className="text-[10px] font-bold text-gray-700 mt-1 uppercase">
                    SIAK ANTI-CHEAT V4.0 — TAHUN AJARAN 2026/2027
                  </p>
                </div>

                {/* Metadata Box */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded-xl mb-3 text-[10px]">
                  <div>
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700 w-24">Waktu Cetak:</span>
                      <span className="font-mono">{formatDateTimeFull(new Date().toISOString())}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="font-bold text-gray-700 w-24">Dicetak Oleh:</span>
                      <span>{adminProfile.nama} ({adminProfile.nip})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div>
                      <span className="font-bold text-gray-700">Filter Terpilih: </span>
                      <span className="capitalize">{filterRole}</span> | <span className="capitalize">{filterCategory}</span>
                    </div>
                    <div className="mt-0.5 font-bold">
                      Jumlah Log Dicetak: {logsToPrint.length} dari {filteredLogs.length} Baris
                    </div>
                  </div>
                </div>

                {/* Printable Table */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-[9px] sm:text-[9.5px] border-collapse border border-gray-400 mb-4">
                    <thead>
                      <tr className="bg-gray-100 text-black font-extrabold uppercase border-b border-gray-400">
                        <th className="p-1.5 border border-gray-400 w-7 text-center">No</th>
                        <th className="p-1.5 border border-gray-400 w-28">Waktu (WITA)</th>
                        <th className="p-1.5 border border-gray-400 w-36">Pengguna & Peran</th>
                        <th className="p-1.5 border border-gray-400 w-24">Kategori</th>
                        <th className="p-1.5 border border-gray-400">Tindakan & Rincian Log</th>
                        <th className="p-1.5 border border-gray-400 w-16 text-center">Status</th>
                        <th className="p-1.5 border border-gray-400 w-24">Perangkat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsToPrint.map((item, idx) => (
                        <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="p-1.5 border border-gray-400 text-center font-bold">{idx + 1}</td>
                          <td className="p-1.5 border border-gray-400 font-mono text-[8.5px] leading-tight">
                            {formatDateTimeFull(item.timestamp)}
                          </td>
                          <td className="p-1.5 border border-gray-400">
                            <div className="font-bold text-black">{item.userName}</div>
                            <div className="text-[8.5px] text-gray-600 font-mono">
                              [{formatRoleLabel(item.role)}] {item.userId}
                            </div>
                          </td>
                          <td className="p-1.5 border border-gray-400 font-semibold">
                            {formatCategoryLabel(item.category)}
                          </td>
                          <td className="p-1.5 border border-gray-400">
                            <div className="font-bold text-black">{item.action}</div>
                            <div className="text-[8.5px] text-gray-700 leading-snug">{item.details}</div>
                          </td>
                          <td className="p-1.5 border border-gray-400 text-center font-bold uppercase text-[8.5px]">
                            <span className={item.status === 'warning' ? 'text-amber-800' : item.status === 'error' ? 'text-red-700' : 'text-emerald-800'}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-1.5 border border-gray-400 text-[8.5px] text-gray-700">
                            {item.ipOrDevice}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan Resmi Pengesahan Dokumen */}
                {includeSignatures && (
                  <div className="grid grid-cols-2 gap-8 text-[10px] pt-3 mt-4 border-t border-dashed border-gray-300 page-break-inside-avoid">
                    <div className="text-center">
                      <p className="text-gray-700">Mengetahui,</p>
                      <p className="font-bold text-black">Kepala SMP Negeri 2 Kota Bangun</p>
                      <div className="h-16 flex items-center justify-center">
                        {schoolSettings.sekolah_stempel ? (
                          <img src={schoolSettings.sekolah_stempel} alt="Stempel" className="h-14 object-contain opacity-80" />
                        ) : (
                          <span className="text-[9px] text-gray-300 italic">[Stempel & Tanda Tangan]</span>
                        )}
                      </div>
                      <p className="font-black text-black underline underline-offset-2 uppercase">
                        {schoolSettings.kepala_sekolah_nama}
                      </p>
                      <p className="text-[9px] text-gray-700 font-mono">NIP. {schoolSettings.kepala_sekolah_nip}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-700">
                        Kota Bangun, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="font-bold text-black">{adminProfile.jabatan}</p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[9px] text-gray-300 italic">[Tanda Tangan Petugas Audit]</span>
                      </div>
                      <p className="font-black text-black underline underline-offset-2 uppercase">
                        {adminProfile.nama}
                      </p>
                      <p className="text-[9px] text-gray-700 font-mono">NIP. {adminProfile.nip}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
