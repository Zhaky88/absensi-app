import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Download,
  Filter,
  Check,
  X,
  ExternalLink,
  Copy,
  AlertTriangle,
  Layers,
  Shield,
  Calendar,
  Clock,
  User,
  Users,
  GraduationCap,
  BookOpen,
  MapPin,
  MessageSquare,
  Key,
  ChevronLeft,
  ChevronRight,
  Code
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastModalContext';

// =========================================================================
// DEFINISI SKEMA LENGKAP SELURUH TABEL DATABASE SUPABASE
// =========================================================================
const TABLE_DEFINITIONS = [
  {
    id: 'siswa',
    label: 'Master Data Siswa',
    icon: GraduationCap,
    pk: 'nis',
    description: 'Data induk seluruh siswa, kelas, QR token, dan nomor kontak orang tua.',
    columns: [
      { key: 'nis', label: 'NIS', type: 'text', required: true, isPk: true },
      { key: 'nama', label: 'Nama Siswa', type: 'text', required: true },
      { key: 'id_kelas', label: 'Kelas', type: 'fk', refTable: 'kelas', refKey: 'id_kelas', refLabel: 'nama_kelas' },
      { key: 'id_ortu', label: 'Orang Tua', type: 'fk', refTable: 'orang_tua', refKey: 'id_ortu', refLabel: 'nama_ayah' },
      { key: 'status_siswa', label: 'Status', type: 'select', options: ['aktif', 'lulus', 'alumni', 'pindah'], default: 'aktif' },
      { key: 'streak_sekarang', label: 'Streak Sekarang', type: 'number', default: 0 },
      { key: 'streak_tertinggi', label: 'Streak Tertinggi', type: 'number', default: 0 },
      { key: 'qr_token_pribadi', label: 'QR Token Pribadi', type: 'text' },
      { key: 'foto_wajah', label: 'URL Foto', type: 'text' },
      { key: 'id_user', label: 'User ID (Auth)', type: 'text' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'guru',
    label: 'Master Data Guru',
    icon: Users,
    pk: 'nip',
    description: 'Data pendidik, NIP, status wali kelas, BK, dan akun login.',
    columns: [
      { key: 'nip', label: 'NIP / NUPTK', type: 'text', required: true, isPk: true },
      { key: 'nama', label: 'Nama Lengkap Guru', type: 'text', required: true },
      { key: 'is_bk', label: 'Guru BK?', type: 'boolean', default: false },
      { key: 'is_piket', label: 'Guru Piket?', type: 'boolean', default: false },
      { key: 'foto_profil', label: 'URL Foto Profil', type: 'text' },
      { key: 'id_user', label: 'User ID (Auth)', type: 'text' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'kelas',
    label: 'Kelas',
    icon: Layers,
    pk: 'id_kelas',
    description: 'Daftar data kelas, tingkat (7-9 SMP), dan guru wali kelas.',
    columns: [
      { key: 'id_kelas', label: 'ID Kelas (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'nama_kelas', label: 'Nama Kelas', type: 'text', required: true },
      { key: 'tingkat', label: 'Tingkat', type: 'select', options: ['7', '8', '9'], required: true },
      { key: 'jurusan', label: 'Peminatan', type: 'select', options: ['IPA', 'IPS'] },
      { key: 'wali_kelas', label: 'Wali Kelas', type: 'fk', refTable: 'guru', refKey: 'nip', refLabel: 'nama' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'mata_pelajaran',
    label: 'Mata Pelajaran',
    icon: BookOpen,
    pk: 'id_mapel',
    description: 'Daftar kurikulum mata pelajaran KBM sekolah.',
    columns: [
      { key: 'id_mapel', label: 'ID Mapel (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'nama_mapel', label: 'Nama Mata Pelajaran', type: 'text', required: true },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'jadwal',
    label: 'Jadwal Pelajaran KBM',
    icon: Clock,
    pk: 'id_jadwal',
    description: 'Alokasi sesi pelajaran, hari, jam KBM, kelas, dan pengampu.',
    columns: [
      { key: 'id_jadwal', label: 'ID Jadwal (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'id_kelas', label: 'Kelas', type: 'fk', refTable: 'kelas', refKey: 'id_kelas', refLabel: 'nama_kelas', required: true },
      { key: 'id_mapel', label: 'Mata Pelajaran', type: 'fk', refTable: 'mata_pelajaran', refKey: 'id_mapel', refLabel: 'nama_mapel', required: true },
      { key: 'id_guru', label: 'Guru Pengampu', type: 'fk', refTable: 'guru', refKey: 'nip', refLabel: 'nama', required: true },
      { key: 'hari', label: 'Hari', type: 'select', options: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], required: true },
      { key: 'jam_mulai', label: 'Jam Mulai', type: 'time', required: true },
      { key: 'jam_selesai', label: 'Jam Selesai', type: 'time', required: true },
      { key: 'batas_terlambat', label: 'Batas Toleransi', type: 'time', required: true },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'absensi',
    label: 'Log Presensi Siswa',
    icon: Table,
    pk: 'id_absensi',
    description: 'Rekam transaksi kehadiran, tanggal, jam scan, status H/S/I/A, dan metode.',
    columns: [
      { key: 'id_absensi', label: 'ID Absensi (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'nis', label: 'Siswa (NIS)', type: 'fk', refTable: 'siswa', refKey: 'nis', refLabel: 'nama', required: true },
      { key: 'id_jadwal', label: 'ID Jadwal', type: 'fk', refTable: 'jadwal', refKey: 'id_jadwal', refLabel: 'hari' },
      { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { key: 'waktu', label: 'Waktu Scan', type: 'time', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['H', 'S', 'I', 'A'], required: true },
      { key: 'metode', label: 'Metode', type: 'select', options: ['murid_scan', 'guru_scan', 'manual', 'piket_scan'], default: 'murid_scan' },
      { key: 'keterangan', label: 'Keterangan / Alasan', type: 'text' },
      { key: 'foto_bukti_izin', label: 'Bukti Foto Surat', type: 'text' },
      { key: 'koordinat_gps', label: 'Koordinat GPS (JSON)', type: 'textarea' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'orang_tua',
    label: 'Kontak Orang Tua / Wali',
    icon: MessageSquare,
    pk: 'id_ortu',
    description: 'Database wali murid, nomor WhatsApp aktif, dan relasi akun.',
    columns: [
      { key: 'id_ortu', label: 'ID Ortu (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'nama_ayah', label: 'Nama Ayah / Wali', type: 'text' },
      { key: 'nama_ibu', label: 'Nama Ibu', type: 'text' },
      { key: 'no_whatsapp', label: 'No. WhatsApp', type: 'text', required: true },
      { key: 'id_user', label: 'User ID (Auth)', type: 'text' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'pengaturan_sistem',
    label: 'Pengaturan Sistem & GPS',
    icon: Shield,
    pk: 'id',
    description: 'Konfigurasi global sekolah: nama sekolah, GPS geofencing, radius, WA gateway.',
    columns: [
      { key: 'id', label: 'ID (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'kunci', label: 'Kunci Pengaturan (Key)', type: 'text', required: true },
      { key: 'nilai', label: 'Nilai (Value)', type: 'textarea', required: true },
      { key: 'deskripsi', label: 'Deskripsi', type: 'text' },
      { key: 'updated_at', label: 'Terakhir Diubah', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'kalender_akademik',
    label: 'Kalender Akademik & Libur',
    icon: Calendar,
    pk: 'id',
    description: 'Daftar tanggal libur nasional, libur sekolah, dan agenda kegiatan khusus.',
    columns: [
      { key: 'id', label: 'ID (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { key: 'status_hari', label: 'Kategori Hari', type: 'select', options: ['libur_nasional', 'libur_sekolah', 'kegiatan_khusus'], required: true },
      { key: 'keterangan', label: 'Keterangan Agenda', type: 'text', required: true },
      { key: 'is_libur', label: 'Libur Sekolah?', type: 'boolean', default: true },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
    ],
  },
  {
    id: 'antrean_whatsapp',
    label: 'Antrean Pesan WhatsApp',
    icon: MessageSquare,
    pk: 'id',
    description: 'Antrean pesan otomatis WhatsApp ke orang tua siswa (Pending, Sukses, Gagal).',
    columns: [
      { key: 'id', label: 'ID (UUID)', type: 'uuid', isPk: true, autoGen: true },
      { key: 'no_tujuan', label: 'No. Tujuan', type: 'text', required: true },
      { key: 'pesan', label: 'Isi Pesan', type: 'textarea', required: true },
      { key: 'status_kirim', label: 'Status Kirim', type: 'select', options: ['pending', 'sukses', 'gagal'], default: 'pending' },
      { key: 'retry_count', label: 'Percobaan (Retry)', type: 'number', default: 0 },
      { key: 'id_absensi', label: 'ID Absensi', type: 'text' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
      { key: 'sent_at', label: 'Waktu Terkirim', type: 'timestamp' },
    ],
  },
  {
    id: 'users_metadata',
    label: 'Autentikasi & Akun User',
    icon: Key,
    pk: 'id',
    description: 'Mapping username, role pengguna (admin, guru, murid), dan device anti-joki.',
    columns: [
      { key: 'id', label: 'User ID (Auth UUID)', type: 'uuid', isPk: true, required: true },
      { key: 'username', label: 'Username / ID Login', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'select', options: ['admin', 'guru', 'murid', 'ortu', 'guru_bk', 'guru_piket'], required: true },
      { key: 'device_id', label: 'Device ID (Anti-Joki HP)', type: 'text' },
      { key: 'created_at', label: 'Dibuat Pada', type: 'timestamp', readOnly: true },
      { key: 'updated_at', label: 'Diperbarui', type: 'timestamp', readOnly: true },
    ],
  },
];

export default function DatabaseCrudStudio() {
  const { toast } = useToast();
  const [selectedTableId, setSelectedTableId] = useState('siswa');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // References Cache for FK dropdowns (e.g. classes, teachers, subjects)
  const [refCache, setRefCache] = useState({});

  // Modals State
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'detail' | 'delete'
  const [activeRecord, setActiveRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Current Table Configuration
  const currentTable = TABLE_DEFINITIONS.find((t) => t.id === selectedTableId) || TABLE_DEFINITIONS[0];

  useEffect(() => {
    fetchTableData(currentTable.id);
    fetchReferencesForTable(currentTable);
    setCurrentPage(1);
    setSearchTerm('');
  }, [selectedTableId]);

  // 1. Ambil data dari tabel aktif
  async function fetchTableData(tableName) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(500);

      if (error) {
        console.warn(`Query ${tableName} error:`, error.message);
        setTableData([]);
      } else {
        let rows = data || [];
        if (tableName === 'kelas') {
          rows.sort((a, b) => {
            const tA = Number(a.tingkat) || 7;
            const tB = Number(b.tingkat) || 7;
            if (tA !== tB) return tA - tB;
            return (a.nama_kelas || '').localeCompare(b.nama_kelas || '', undefined, { numeric: true });
          });
        }
        setTableData(rows);
      }
    } catch (err) {
      console.error(`Fetch ${tableName} failed:`, err);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }

  // 2. Ambil referensi Foreign Keys
  async function fetchReferencesForTable(tableDef) {
    const fkColumns = tableDef.columns.filter((c) => c.type === 'fk');
    for (const col of fkColumns) {
      if (!refCache[col.refTable]) {
        try {
          const { data } = await supabase
            .from(col.refTable)
            .select(`${col.refKey}, ${col.refLabel}`)
            .limit(200);

          if (data) {
            setRefCache((prev) => ({ ...prev, [col.refTable]: data }));
          }
        } catch (e) {}
      }
    }
  }

  // 3. Sorting Data
  function handleSort(colKey) {
    let direction = 'asc';
    if (sortConfig.key === colKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: colKey, direction });
  }

  const sortedData = React.useMemo(() => {
    let items = [...tableData];

    // Filter pencarian
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter((row) =>
        Object.values(row).some((val) =>
          String(val || '').toLowerCase().includes(q)
        )
      );
    }

    // Urutkan
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return items;
  }, [tableData, searchTerm, sortConfig]);

  // Pagination Slice
  const totalRecords = sortedData.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // 4. Modal Handlers
  function openCreateModal() {
    const initial = {};
    currentTable.columns.forEach((col) => {
      if (col.autoGen) {
        // Auto-generate UUID standard
        initial[col.key] = crypto.randomUUID();
      } else if (col.default !== undefined) {
        initial[col.key] = col.default;
      } else if (col.type === 'boolean') {
        initial[col.key] = false;
      } else if (col.type === 'number') {
        initial[col.key] = 0;
      } else {
        initial[col.key] = '';
      }
    });
    setFormData(initial);
    setModalType('create');
  }

  function openEditModal(record) {
    setActiveRecord(record);
    setFormData({ ...record });
    setModalType('edit');
  }

  function openDetailModal(record) {
    setActiveRecord(record);
    setModalType('detail');
  }

  function openDeleteModal(record) {
    setActiveRecord(record);
    setModalType('delete');
  }

  // 5. Submit CREATE / INSERT
  async function handleCreateSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Siapkan payload bersih
      const payload = {};
      currentTable.columns.forEach((col) => {
        if (col.readOnly) return;
        let val = formData[col.key];

        if (col.type === 'number') {
          val = val === '' ? null : Number(val);
        } else if (col.type === 'boolean') {
          val = Boolean(val);
        } else if (col.type === 'textarea' && col.key.includes('gps')) {
          try {
            val = val ? JSON.parse(val) : null;
          } catch (e) {
            val = val || null;
          }
        } else if (val === '') {
          val = null;
        }

        payload[col.key] = val;
      });

      const { data, error } = await supabase
        .from(currentTable.id)
        .insert([payload])
        .select();

      if (error) throw error;

      toast.success(`Data berhasil ditambahkan ke tabel "${currentTable.label}".`);
      setModalType(null);
      fetchTableData(currentTable.id);
    } catch (err) {
      if (err.message?.includes('row-level security') || err.code === '42501') {
        toast.error(
          `Akses ditolak RLS Supabase: Jalankan script 'supabase/fix_siswa_dan_seluruh_rls.sql' di SQL Editor Supabase untuk membuka izin akses tabel "${currentTable.label}".`,
          'RLS Policy Supabase'
        );
      } else if (err.code === '42703') {
        toast.warning(
          `Kolom belum ada di tabel Supabase: Jalankan skrip 'supabase/add_jurusan_to_kelas.sql' di SQL Editor Supabase.`,
          'Skema Supabase Perlu Update'
        );
      } else {
        toast.error(`Gagal menambah data: ${err.message}`, 'Operasi Gagal');
      }
    } finally {
      setSaving(false);
    }
  }

  // 6. Submit UPDATE / EDIT
  async function handleEditSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const pkKey = currentTable.pk;
      const pkVal = activeRecord[pkKey];

      const payload = {};
      currentTable.columns.forEach((col) => {
        if (col.readOnly || col.isPk) return;
        let val = formData[col.key];

        if (col.type === 'number') {
          val = val === '' ? null : Number(val);
        } else if (col.type === 'boolean') {
          val = Boolean(val);
        } else if (col.type === 'textarea' && col.key.includes('gps')) {
          try {
            val = val ? (typeof val === 'string' ? JSON.parse(val) : val) : null;
          } catch (e) {
            val = val || null;
          }
        } else if (val === '') {
          val = null;
        }

        payload[col.key] = val;
      });

      const { error } = await supabase
        .from(currentTable.id)
        .update(payload)
        .eq(pkKey, pkVal);

      if (error) throw error;

      toast.success(`Data ${currentTable.label} [${pkKey}: ${pkVal}] berhasil diperbarui.`);
      setModalType(null);
      fetchTableData(currentTable.id);
    } catch (err) {
      if (err.message?.includes('row-level security') || err.code === '42501') {
        toast.error(
          `Akses ditolak RLS Supabase: Jalankan script 'supabase/fix_siswa_dan_seluruh_rls.sql' di SQL Editor Supabase.`,
          'RLS Policy Supabase'
        );
      } else if (err.code === '42703') {
        toast.warning(
          `Kolom belum ada di tabel Supabase: Jalankan skrip 'supabase/add_jurusan_to_kelas.sql' di SQL Editor Supabase.`,
          'Skema Supabase Perlu Update'
        );
      } else {
        toast.error(`Gagal mengubah data: ${err.message}`, 'Update Gagal');
      }
    } finally {
      setSaving(false);
    }
  }

  // 7. Submit DELETE
  async function handleDeleteSubmit() {
    setSaving(true);
    try {
      const pkKey = currentTable.pk;
      const pkVal = activeRecord[pkKey];

      const { error } = await supabase
        .from(currentTable.id)
        .delete()
        .eq(pkKey, pkVal);

      if (error) throw error;

      toast.success(`Data [${pkKey}: ${pkVal}] berhasil dihapus dari tabel ${currentTable.label}.`);
      setModalType(null);
      fetchTableData(currentTable.id);
    } catch (err) {
      if (err.message?.includes('row-level security') || err.code === '42501') {
        toast.error(
          `Akses ditolak RLS Supabase: Jalankan script 'supabase/fix_siswa_dan_seluruh_rls.sql' di SQL Editor Supabase.`,
          'RLS Policy Supabase'
        );
      } else {
        toast.error(`Gagal menghapus data: ${err.message}`, 'Hapus Gagal');
      }
    } finally {
      setSaving(false);
    }
  }

  // 8. Ekspor ke Excel (.xlsx)
  function exportTableToExcel() {
    try {
      if (tableData.length === 0) {
        toast.info('Tidak ada data dalam tabel ini untuk diekspor.');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentTable.id);
      XLSX.writeFile(wb, `Database_${currentTable.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Tabel ${currentTable.label} berhasil diekspor ke Excel.`);
    } catch (e) {
      toast.error(`Gagal ekspor: ${e.message}`);
    }
  }

  // Helper render Foreign Key label
  function getFkDisplay(col, val) {
    if (!val) return '-';
    const list = refCache[col.refTable];
    if (list && list.length > 0) {
      const found = list.find((item) => String(item[col.refKey]) === String(val));
      if (found) {
        return (
          <span title={`ID: ${val}`} className="font-semibold text-slate-800">
            {found[col.refLabel]} <span className="text-[10px] text-slate-400 font-mono">({String(val).slice(0, 6)}..)</span>
          </span>
        );
      }
    }
    return <span className="font-mono text-slate-600 text-[11px]">{String(val)}</span>;
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER DATABASE STUDIO & SELECTOR TABEL                                */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-200">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Studio CRUD & Manajemen Database Lengkap
                </h1>
                <span className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  PostgreSQL Master
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Akses langsung seluruh entitas tabel database: Lihat, Tambah (Create), Edit (Update), dan Hapus (Delete) dengan integritas relasi.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={() => fetchTableData(currentTable.id)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Muat ulang data tabel"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportTableToExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Unduh data tabel ke file Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (.xlsx)</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shadow-violet-200"
              title={`Tambah baris data baru ke tabel ${currentTable.id}`}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Baru</span>
            </button>
          </div>
        </div>

        {/* TABEL SELECTOR PILLS */}
        <div className="border-t border-slate-100 pt-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Pilih Tabel Database:
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {TABLE_DEFINITIONS.map((tbl) => {
              const Icon = tbl.icon;
              const isSelected = tbl.id === selectedTableId;
              return (
                <button
                  key={tbl.id}
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200 scale-102'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tbl.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tbl.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOOLBAR PENCARIAN & KONTROL DATA GRID                                  */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Table className="w-4 h-4 text-violet-600" />
              Tabel <span className="font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg">public.{currentTable.id}</span>
              <span className="text-xs text-slate-400 font-normal">
                ({totalRecords} baris data ditemukan)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{currentTable.description}</p>
          </div>

          {/* Search & Page Size */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari di semua kolom..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DYNAMIC DATA TABLE                                                    */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs pb-1">
          <table className="w-full min-w-[800px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 text-center w-12">No</th>
                {currentTable.columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    title={`Klik untuk mengurutkan berdasarkan ${col.label}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.isPk && (
                        <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded font-mono">
                          PK
                        </span>
                      )}
                      {sortConfig.key === col.key && (
                        <span className="text-violet-600 font-black">
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-28">Aksi CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={currentTable.columns.length + 2} className="py-12 text-center text-slate-500">
                    <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="font-semibold text-xs">Memuat data dari Supabase...</p>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Column Cells */}
                    {currentTable.columns.map((col) => {
                      const val = row[col.key];

                      let rendered = '-';
                      if (col.type === 'boolean') {
                        rendered = val ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            TRUE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            FALSE
                          </span>
                        );
                      } else if (col.type === 'fk') {
                        rendered = getFkDisplay(col, val);
                      } else if (col.key === 'status' || col.key === 'status_siswa' || col.key === 'status_kirim' || col.key === 'role') {
                        rendered = (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 capitalize border border-slate-200">
                            {String(val || '-')}
                          </span>
                        );
                      } else if (col.type === 'textarea' || (typeof val === 'object' && val !== null)) {
                        rendered = (
                          <span className="font-mono text-[10px] text-slate-500 max-w-xs truncate block" title={JSON.stringify(val)}>
                            {JSON.stringify(val)}
                          </span>
                        );
                      } else {
                        rendered = (
                          <span className="text-slate-800 font-medium truncate max-w-xs block">
                            {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">null</span>}
                          </span>
                        );
                      }

                      return (
                        <td key={col.key} className="py-2.5 px-3">
                          {rendered}
                        </td>
                      );
                    })}

                    {/* Row Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetailModal(row)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Detail Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Record (Update)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(row)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Record (Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentTable.columns.length + 2} className="py-8 text-center text-slate-400 italic">
                    Tabel ini kosong atau tidak ada data yang cocok dengan pencarian "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <div>
            Menampilkan baris <strong>{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> s.d.{' '}
            <strong>{Math.min(totalRecords, currentPage * pageSize)}</strong> dari{' '}
            <strong>{totalRecords}</strong> total record
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL FORM: CREATE / TAMBAH DATA BARU                                  */}
      {/* ========================================================================= */}
      {modalType === 'create' && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-violet-100 text-violet-700">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tambah Data: {currentTable.label}</h3>
                  <p className="text-xs text-slate-500 font-mono">Tabel: public.{currentTable.id}</p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentTable.columns
                  .filter((col) => !col.readOnly)
                  .map((col) => (
                    <div
                      key={col.key}
                      className={col.type === 'textarea' ? 'sm:col-span-2' : ''}
                    >
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {col.label} {col.required && <span className="text-rose-500">*</span>}
                        {col.isPk && <span className="ml-1 text-[9px] bg-violet-100 text-violet-800 px-1 py-0.2 rounded font-mono">PRIMARY KEY</span>}
                      </label>

                      {/* Render Input Sesuai Tipe */}
                      {col.type === 'select' ? (
                        <select
                          value={formData[col.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">-- Pilih {col.label} --</option>
                          {col.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'boolean' ? (
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[col.key])}
                            onChange={(e) => setFormData({ ...formData, [col.key]: e.target.checked })}
                            className="w-4 h-4 text-violet-600 rounded cursor-pointer"
                            id={`check-${col.key}`}
                          />
                          <label htmlFor={`check-${col.key}`} className="text-xs text-slate-700 font-medium cursor-pointer">
                            {formData[col.key] ? 'Aktif / TRUE' : 'Non-Aktif / FALSE'}
                          </label>
                        </div>
                      ) : col.type === 'fk' ? (
                        <select
                          value={formData[col.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">-- Pilih Relasi {col.refTable} --</option>
                          {(refCache[col.refTable] || []).map((refItem) => (
                            <option key={refItem[col.refKey]} value={refItem[col.refKey]}>
                              {refItem[col.refLabel]} ({String(refItem[col.refKey]).slice(0, 8)}..)
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={formData[col.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder={col.key.includes('gps') ? '{"lat": -0.245, "lng": 116.591}' : ''}
                        />
                      ) : (
                        <input
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : col.type === 'time' ? 'time' : 'text'}
                          value={formData[col.key] !== undefined ? formData[col.key] : ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder={col.autoGen ? 'UUID Otomatis dibuat' : `Masukkan ${col.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-200 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL FORM: EDIT / UPDATE DATA                                         */}
      {/* ========================================================================= */}
      {modalType === 'edit' && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Data: {currentTable.label}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    PK: {currentTable.pk} = <strong className="text-slate-800">{activeRecord[currentTable.pk]}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentTable.columns
                  .filter((col) => !col.readOnly)
                  .map((col) => (
                    <div
                      key={col.key}
                      className={col.type === 'textarea' ? 'sm:col-span-2' : ''}
                    >
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {col.label} {col.required && <span className="text-rose-500">*</span>}
                        {col.isPk && <span className="ml-1 text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono">TIDAK DAPAT DIUBAH</span>}
                      </label>

                      {col.isPk ? (
                        <input
                          type="text"
                          value={formData[col.key] || ''}
                          disabled
                          className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono cursor-not-allowed"
                        />
                      ) : col.type === 'select' ? (
                        <select
                          value={formData[col.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih {col.label} --</option>
                          {col.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'boolean' ? (
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[col.key])}
                            onChange={(e) => setFormData({ ...formData, [col.key]: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            id={`check-edit-${col.key}`}
                          />
                          <label htmlFor={`check-edit-${col.key}`} className="text-xs text-slate-700 font-medium cursor-pointer">
                            {formData[col.key] ? 'Aktif / TRUE' : 'Non-Aktif / FALSE'}
                          </label>
                        </div>
                      ) : col.type === 'fk' ? (
                        <select
                          value={formData[col.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih Relasi {col.refTable} --</option>
                          {(refCache[col.refTable] || []).map((refItem) => (
                            <option key={refItem[col.refKey]} value={refItem[col.refKey]}>
                              {refItem[col.refLabel]} ({String(refItem[col.refKey]).slice(0, 8)}..)
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={
                            typeof formData[col.key] === 'object' && formData[col.key] !== null
                              ? JSON.stringify(formData[col.key])
                              : formData[col.key] || ''
                          }
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : col.type === 'time' ? 'time' : 'text'}
                          value={formData[col.key] !== undefined ? formData[col.key] : ''}
                          onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                          required={col.required}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan Perubahan...' : 'Perbarui Data (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DETAIL RECORD                                                    */}
      {/* ========================================================================= */}
      {modalType === 'detail' && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-800">
                  <Eye className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Record: {currentTable.label}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    public.{currentTable.id} &bull; {currentTable.pk}: {activeRecord[currentTable.pk]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 text-xs flex-1 pr-1">
              {currentTable.columns.map((col) => {
                const val = activeRecord[col.key];
                return (
                  <div key={col.key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">{col.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">({col.key})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 font-medium break-all">
                        {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val !== null && val !== undefined ? val : 'null')}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(String(val || ''));
                          toast.success(`Disalin: ${col.key}`);
                        }}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Salin nilai"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 justify-end mt-4">
              <button
                onClick={() => openEditModal(activeRecord)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Record Ini
              </button>
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL KONFIRMASI HAPUS / DELETE                                        */}
      {/* ========================================================================= */}
      {modalType === 'delete' && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Konfirmasi Hapus Data</h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus data ini dari tabel <strong className="text-slate-800">{currentTable.id}</strong>?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left text-xs mb-5 font-mono">
              <div>Primary Key: <strong>{currentTable.pk}</strong></div>
              <div>Nilai ID: <strong>{activeRecord[currentTable.pk]}</strong></div>
              {activeRecord.nama && <div>Nama: <strong>{activeRecord.nama}</strong></div>}
              {activeRecord.nama_kelas && <div>Kelas: <strong>{activeRecord.nama_kelas}</strong></div>}
              {activeRecord.nama_mapel && <div>Mapel: <strong>{activeRecord.nama_mapel}</strong></div>}
            </div>

            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setModalType(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={saving}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
