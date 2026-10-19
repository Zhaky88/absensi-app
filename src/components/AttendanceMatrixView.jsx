import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  Edit2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastModalContext';
import { logActivity } from '../lib/activityLogger';

export default function AttendanceMatrixView({
  classes = [],
  students = [],
  initialClassId = '',
  onSwitchToCalendar = null,
}) {
  const { toast, showConfirm } = useToast();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0 - 11
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedClassId, setSelectedClassId] = useState(
    initialClassId || (classes.length > 0 ? classes[0].id_kelas : '')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [matrixAttendance, setMatrixAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // Quick Edit Cell Modal State
  const [editingCell, setEditingCell] = useState(null); // { student, dateStr, dayNum, currentStatus, recordId }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Update selected class if initialClassId changes
  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    } else if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id_kelas);
    }
  }, [initialClassId, classes]);

  // Days in selected Month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Generate Array of Days in the month
  const monthDays = useMemo(() => {
    const days = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

      days.push({
        dayNum: d,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6,
        dateString,
      });
    }
    return days;
  }, [selectedYear, selectedMonth, daysInMonth]);

  // Filter students for the selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter((s) => String(s.id_kelas) === String(selectedClassId))
      .filter((s) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (s.nama || '').toLowerCase().includes(term) ||
          (s.nis || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [students, selectedClassId, searchTerm]);

  // Fetch Attendance Records for this Class & Month
  const fetchMatrixData = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const startDate = `${selectedYear}-${monthStr}-01`;
      const endDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

      // 1. Fetch holidays
      try {
        const { data: hData } = await supabase
          .from('kalender_akademik')
          .select('tanggal, keterangan, is_libur')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);
        setHolidays(hData || []);
      } catch (e) {
        setHolidays([]);
      }

      // 2. Fetch class students NIS list
      const nises = classStudents.map((s) => s.nis);
      if (nises.length === 0) {
        setMatrixAttendance([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('absensi')
        .select('id_absensi, nis, tanggal, status, waktu, keterangan, metode')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .in('nis', nises);

      if (error) throw error;
      setMatrixAttendance(data || []);
    } catch (err) {
      console.error('Error fetching matrix attendance:', err);
      toast.error('Gagal mengambil data matriks absensi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [selectedClassId, selectedMonth, selectedYear, classStudents.length]);

  // Map attendance by NIS & Date: { [nis]: { [dateStr]: { status, id_absensi, keterangan } } }
  const attendanceLookup = useMemo(() => {
    const map = {};
    matrixAttendance.forEach((row) => {
      if (!map[row.nis]) map[row.nis] = {};
      map[row.nis][row.tanggal] = row;
    });
    return map;
  }, [matrixAttendance]);

  // Holiday map
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach((h) => {
      map[h.tanggal] = h.keterangan || 'Libur Sekolah';
    });
    return map;
  }, [holidays]);

  // Calculate stats per student
  const studentStats = useMemo(() => {
    const stats = {};
    classStudents.forEach((student) => {
      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;

      const studentAtt = attendanceLookup[student.nis] || {};
      monthDays.forEach((day) => {
        const att = studentAtt[day.dateString];
        if (att) {
          const s = String(att.status).toUpperCase();
          if (s === 'H') hadir++;
          else if (s === 'S') sakit++;
          else if (s === 'I') izin++;
          else if (s === 'A') alpa++;
        }
      });

      const totalRecorded = hadir + sakit + izin + alpa;
      const pct = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 0;

      stats[student.nis] = { hadir, sakit, izin, alpa, totalRecorded, pct };
    });
    return stats;
  }, [classStudents, attendanceLookup, monthDays]);

  // Calculate daily totals for class summary row
  const dailyClassStats = useMemo(() => {
    const daily = {};
    monthDays.forEach((day) => {
      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;

      classStudents.forEach((student) => {
        const att = attendanceLookup[student.nis]?.[day.dateString];
        if (att) {
          const s = String(att.status).toUpperCase();
          if (s === 'H') hadir++;
          else if (s === 'S') sakit++;
          else if (s === 'I') izin++;
          else if (s === 'A') alpa++;
        }
      });

      const total = hadir + sakit + izin + alpa;
      const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
      daily[day.dateString] = { hadir, sakit, izin, alpa, total, pct };
    });
    return daily;
  }, [monthDays, classStudents, attendanceLookup]);

  // Selected Class Info
  const currentClass = useMemo(() => {
    return classes.find((c) => String(c.id_kelas) === String(selectedClassId));
  }, [classes, selectedClassId]);

  // Cell Click Handler to Open Quick Edit Modal
  const handleCellClick = (student, day) => {
    const existing = attendanceLookup[student.nis]?.[day.dateString];
    setEditingCell({
      student,
      dateString: day.dateString,
      dayNum: day.dayNum,
      currentStatus: existing ? existing.status : '',
      currentKeterangan: existing ? existing.keterangan || '' : '',
      recordId: existing ? existing.id_absensi : null,
    });
  };

  // Save Cell Edit
  const handleSaveCell = async (newStatus, newKeterangan = '') => {
    if (!editingCell) return;
    try {
      if (!newStatus) {
        // Delete if status cleared
        if (editingCell.recordId) {
          await supabase.from('absensi').delete().eq('id_absensi', editingCell.recordId);
          toast.success('Presensi siswa berhasil dikosongkan.');
        }
      } else if (editingCell.recordId) {
        // Update existing
        await supabase
          .from('absensi')
          .update({
            status: newStatus,
            keterangan: newKeterangan || null,
          })
          .eq('id_absensi', editingCell.recordId);
        toast.success(`Status berhasil diubah ke ${newStatus}.`);
      } else {
        // Insert new record
        await supabase.from('absensi').insert([
          {
            nis: editingCell.student.nis,
            tanggal: editingCell.dateString,
            waktu: '07:15',
            status: newStatus,
            metode: 'manual',
            keterangan: newKeterangan || 'Diinput via Matriks Kelas',
          },
        ]);
        toast.success(`Presensi ${editingCell.student.nama} berhasil dicatat.`);
      }

      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Koreksi Matriks Presensi',
        category: 'presensi',
        details: `Koreksi presensi ${editingCell.student.nama} tgl ${editingCell.dateString} -> ${newStatus || 'Kosong'}`,
        status: 'success',
      });

      setEditingCell(null);
      fetchMatrixData();
    } catch (err) {
      console.error('Error saving matrix cell:', err);
      toast.error('Gagal menyimpan perubahan: ' + err.message);
    }
  };

  // Export Matrix to Excel
  const handleExportMatrixExcel = () => {
    if (classStudents.length === 0) {
      toast.warning('Tidak ada siswa di kelas ini untuk diekspor.');
      return;
    }

    try {
      const rows = classStudents.map((st, idx) => {
        const row = {
          No: idx + 1,
          NIS: st.nis,
          Nama_Siswa: st.nama,
          Kelas: currentClass?.nama_kelas || '-',
        };

        // Days 1 - 31
        monthDays.forEach((day) => {
          const att = attendanceLookup[st.nis]?.[day.dateString];
          row[`Tgl_${day.dayNum}`] = att ? att.status : day.isWeekend ? 'W' : '-';
        });

        const stStat = studentStats[st.nis] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, pct: 0 };
        row['Total_Hadir_H'] = stStat.hadir;
        row['Total_Sakit_S'] = stStat.sakit;
        row['Total_Izin_I'] = stStat.izin;
        row['Total_Alpa_A'] = stStat.alpa;
        row['Persentase_Kehadiran'] = `${stStat.pct}%`;

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks_${currentClass?.nama_kelas || 'Kelas'}`);

      const filename = `Matriks_Presensi_${currentClass?.nama_kelas || 'Kelas'}_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`File Excel matriks berhasil diunduh: ${filename}`);
      logActivity({
        role: 'admin',
        userId: 'admin_siak',
        userName: 'Administrator SIAK',
        action: 'Export Excel Matriks Presensi',
        category: 'presensi',
        details: `Mengunduh file Excel matriks presensi kelas ${currentClass?.nama_kelas || '-'} periode ${monthNames[selectedMonth]} ${selectedYear}`,
        status: 'success',
      });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Gagal mengekspor matriks Excel: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. FILTER & CONTROLS BAR */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200 bg-white/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base tracking-tight flex items-center gap-2">
                <span>Matriks Presensi Siswa Per Kelas</span>
                {currentClass && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Kelas {currentClass.nama_kelas}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kisi-kisi rekapitulasi kehadiran bulanan (Buku Absensi Digital) tanggal 1 s/d {daysInMonth}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Ekspor Excel */}
            <button
              type="button"
              onClick={handleExportMatrixExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Matriks Excel</span>
            </button>

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={fetchMatrixData}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Data Matriks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Pilih Kelas */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pilih Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {classes.map((c) => (
                <option key={c.id_kelas} value={c.id_kelas}>
                  Kelas {c.nama_kelas} ({c.tingkat ? `Tingkat ${c.tingkat}` : 'SMP'})
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Bulan */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Tahun */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Search Siswa */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Cari Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Petunjuk:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">
                H
              </span>
              <span className="text-slate-700 font-bold">Hadir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                S
              </span>
              <span className="text-slate-700 font-bold">Sakit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-sky-500 text-white font-black text-[10px] flex items-center justify-center">
                I
              </span>
              <span className="text-slate-700 font-bold">Izin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">
                A
              </span>
              <span className="text-slate-700 font-bold">Alpa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-500 font-bold text-[10px] flex items-center justify-center">
                -
              </span>
              <span className="text-slate-500">Libur / Kosong</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * Klik salah satu kotak tanggal untuk mengedit status kehadiran siswa secara langsung.
          </div>
        </div>
      </div>

      {/* 2. MATRIX GRID TABLE */}
      <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] pb-2">
          <table className="w-full min-w-[1200px] text-left border-collapse border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-xs">
              <tr className="border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                {/* Fixed Columns */}
                <th className="py-3 px-3 w-10 text-center sticky left-0 z-30 bg-slate-100 border-r border-slate-200">
                  No
                </th>
                <th className="py-3 px-4 min-w-[200px] sticky left-10 z-30 bg-slate-100 border-r border-slate-200 shadow-xs">
                  Nama Siswa ({classStudents.length})
                </th>

                {/* Day Columns */}
                {monthDays.map((day) => {
                  const isHoliday = !!holidayMap[day.dateString];
                  return (
                    <th
                      key={day.dayNum}
                      className={`py-2 px-1 text-center min-w-[34px] border-r border-slate-200 ${
                        isHoliday
                          ? 'bg-red-50 text-red-600'
                          : day.isSunday
                          ? 'bg-rose-50 text-rose-600'
                          : day.isSaturday
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                      title={isHoliday ? holidayMap[day.dateString] : day.dateString}
                    >
                      <div className="text-[9px] font-bold opacity-80">{day.dayName}</div>
                      <div className="text-xs font-black">{day.dayNum}</div>
                    </th>
                  );
                })}

                {/* Summary Columns */}
                <th className="py-3 px-2 text-center w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200 font-bold">
                  H
                </th>
                <th className="py-3 px-2 text-center w-12 bg-amber-50 text-amber-800 border-r border-slate-200 font-bold">
                  S
                </th>
                <th className="py-3 px-2 text-center w-12 bg-sky-50 text-sky-800 border-r border-slate-200 font-bold">
                  I
                </th>
                <th className="py-3 px-2 text-center w-12 bg-rose-50 text-rose-800 border-r border-slate-200 font-bold">
                  A
                </th>
                <th className="py-3 px-3 text-center min-w-[80px] bg-indigo-50 text-indigo-800 font-bold">
                  % Kehadiran
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={monthDays.length + 7} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="font-semibold text-sm text-slate-600">Memuat matriks presensi kelas...</p>
                    </div>
                  </td>
                </tr>
              ) : classStudents.length === 0 ? (
                <tr>
                  <td colSpan={monthDays.length + 7} className="py-16 text-center text-slate-400">
                    <div className="max-w-sm mx-auto text-center space-y-1">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">Tidak ada siswa di kelas ini</p>
                      <p className="text-xs text-slate-400">
                        Silakan pilih kelas lain atau tambahkan siswa ke dalam kelas ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                classStudents.map((student, idx) => {
                  const stStat = studentStats[student.nis] || {
                    hadir: 0,
                    sakit: 0,
                    izin: 0,
                    alpa: 0,
                    pct: 0,
                  };

                  return (
                    <tr key={student.nis} className="hover:bg-indigo-50/30 transition-colors group">
                      {/* Fixed Col 1: No */}
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px] sticky left-0 z-10 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Fixed Col 2: Student Info */}
                      <td className="py-2.5 px-3 sticky left-10 z-10 bg-white group-hover:bg-indigo-50/50 border-r border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {student.foto_wajah ? (
                              <img src={student.foto_wajah} alt="" className="w-full h-full object-cover" />
                            ) : (
                              student.nama.charAt(0)
                            )}
                          </div>
                          <div className="truncate max-w-[150px]">
                            <div className="font-bold text-slate-800 text-xs truncate" title={student.nama}>
                              {student.nama}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Day Cells */}
                      {monthDays.map((day) => {
                        const att = attendanceLookup[student.nis]?.[day.dateString];
                        const isHoliday = !!holidayMap[day.dateString];
                        const status = att ? String(att.status).toUpperCase() : '';

                        let cellBg = '';
                        let textBadge = '';

                        if (status === 'H') {
                          cellBg = 'bg-emerald-500 text-white shadow-2xs';
                          textBadge = 'H';
                        } else if (status === 'S') {
                          cellBg = 'bg-amber-500 text-white shadow-2xs';
                          textBadge = 'S';
                        } else if (status === 'I') {
                          cellBg = 'bg-sky-500 text-white shadow-2xs';
                          textBadge = 'I';
                        } else if (status === 'A') {
                          cellBg = 'bg-rose-500 text-white shadow-2xs';
                          textBadge = 'A';
                        } else if (isHoliday || day.isSunday) {
                          cellBg = 'bg-slate-100/70 text-slate-300';
                          textBadge = '';
                        } else {
                          cellBg = 'hover:bg-slate-100 text-slate-300';
                          textBadge = '';
                        }

                        return (
                          <td
                            key={day.dayNum}
                            onClick={() => handleCellClick(student, day)}
                            className={`p-1 text-center border-r border-slate-100 cursor-pointer transition-all ${
                              day.isSunday ? 'bg-rose-50/20' : day.isSaturday ? 'bg-amber-50/10' : ''
                            }`}
                            title={`${student.nama} - ${day.dateString}: ${
                              status ? `Status ${status}` : isHoliday ? holidayMap[day.dateString] : 'Belum diabsen'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center font-black text-[11px] transition-transform hover:scale-115 ${cellBg}`}
                            >
                              {textBadge || '•'}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary Col: H */}
                      <td className="py-2 px-1 text-center font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-200">
                        {stStat.hadir}
                      </td>

                      {/* Summary Col: S */}
                      <td className="py-2 px-1 text-center font-bold text-amber-700 bg-amber-50/40 border-r border-slate-200">
                        {stStat.sakit}
                      </td>

                      {/* Summary Col: I */}
                      <td className="py-2 px-1 text-center font-bold text-sky-700 bg-sky-50/40 border-r border-slate-200">
                        {stStat.izin}
                      </td>

                      {/* Summary Col: A */}
                      <td className="py-2 px-1 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-200">
                        {stStat.alpa}
                      </td>

                      {/* Summary Col: % */}
                      <td className="py-2 px-2 text-center bg-indigo-50/30">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span
                            className={`font-black text-xs ${
                              stStat.pct >= 90
                                ? 'text-emerald-700'
                                : stStat.pct >= 75
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {stStat.pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Daily Attendance Summary */}
            {!loading && classStudents.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-[11px] border-t-2 border-slate-300">
                <tr>
                  <td colSpan="2" className="py-3 px-3 text-right font-black text-slate-700 sticky left-0 z-10 bg-slate-100 border-r border-slate-200">
                    Total Hadir Harian:
                  </td>
                  {monthDays.map((day) => {
                    const st = dailyClassStats[day.dateString] || { hadir: 0, pct: 0 };
                    return (
                      <td
                        key={day.dayNum}
                        className={`py-2 px-0.5 text-center border-r border-slate-200 text-[10px] ${
                          st.hadir > 0 ? 'text-emerald-800 font-black' : 'text-slate-400'
                        }`}
                        title={`${day.dateString}: ${st.hadir} Hadir (${st.pct}%)`}
                      >
                        {st.hadir || '-'}
                      </td>
                    );
                  })}
                  <td colSpan="5" className="py-2 px-3 text-center text-indigo-700 font-bold">
                    Rekap Kelas
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK MODAL: EDIT CELL PRESENSI TANGGAL INI               */}
      {/* ========================================================= */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-800">Ubah Status Presensi</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800">{editingCell.student.nama}</div>
              <div className="text-[11px] text-slate-500">
                Tanggal: <strong>{editingCell.dateString}</strong> (Hari ke-{editingCell.dayNum})
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Status:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCell('H', editingCell.currentKeterangan)}
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    editingCell.currentStatus === 'H'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hadir (H)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCell('S', editingCell.currentKeterangan)}
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    editingCell.currentStatus === 'S'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Sakit (S)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCell('I', editingCell.currentKeterangan)}
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    editingCell.currentStatus === 'I'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/20'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Izin (I)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCell('A', editingCell.currentKeterangan)}
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    editingCell.currentStatus === 'A'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Alpa (A)</span>
                </button>
              </div>
            </div>

            {/* Clear button if existing */}
            {editingCell.recordId && (
              <button
                type="button"
                onClick={() => handleSaveCell('', '')}
                className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
              >
                Hapus / Kosongkan Presensi Tanggal Ini
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
