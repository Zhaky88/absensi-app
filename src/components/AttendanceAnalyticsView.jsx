import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  Sparkles,
  Trophy,
  ArrowUpRight,
  BarChart3,
  PieChart,
  RefreshCw,
  Medal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastModalContext';

export default function AttendanceAnalyticsView({
  classes = [],
  students = [],
  teachers = [],
  onSelectClass = null,
}) {
  const { toast } = useToast();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [periodPreset, setPeriodPreset] = useState('month'); // 'month' | 'last30' | 'today'
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Fetch Attendance Records for Analytics
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const startDate = `${selectedYear}-${monthStr}-01`;
      const endDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('absensi')
        .select('id_absensi, nis, tanggal, status, waktu')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      toast.error('Gagal memuat data analitik presensi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedMonth, selectedYear]);

  // Lookup Student by NIS -> class and grade
  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const cls = classes.find((c) => String(c.id_kelas) === String(s.id_kelas));
      map[s.nis] = {
        ...s,
        className: cls?.nama_kelas || 'Belum Terdaftar',
        grade: cls?.tingkat || '7',
        classId: cls?.id_kelas,
      };
    });
    return map;
  }, [students, classes]);

  // 1. KOMPARASI ANGKATAN / TINGKAT (Tingkat 7, 8, 9)
  const gradeComparison = useMemo(() => {
    const grades = {
      '7': { grade: '7', label: 'Tingkat VII (Kelas 7)', hadir: 0, sakit: 0, izin: 0, alpa: 0, studentsCount: 0 },
      '8': { grade: '8', label: 'Tingkat VIII (Kelas 8)', hadir: 0, sakit: 0, izin: 0, alpa: 0, studentsCount: 0 },
      '9': { grade: '9', label: 'Tingkat IX (Kelas 9)', hadir: 0, sakit: 0, izin: 0, alpa: 0, studentsCount: 0 },
    };

    // Count students per grade
    students.forEach((s) => {
      const g = studentMap[s.nis]?.grade;
      if (grades[g]) {
        grades[g].studentsCount++;
      }
    });

    // Count attendance per grade
    attendanceRecords.forEach((row) => {
      const st = studentMap[row.nis];
      const g = st?.grade;
      if (grades[g]) {
        const s = String(row.status).toUpperCase();
        if (s === 'H') grades[g].hadir++;
        else if (s === 'S') grades[g].sakit++;
        else if (s === 'I') grades[g].izin++;
        else if (s === 'A') grades[g].alpa++;
      }
    });

    // Calculate rates
    const list = Object.values(grades).map((item) => {
      const total = item.hadir + item.sakit + item.izin + item.alpa;
      const rate = total > 0 ? Math.round((item.hadir / total) * 100) : 0;
      return {
        ...item,
        total,
        rate,
      };
    });

    // Find champion grade
    const maxRate = Math.max(...list.map((l) => l.rate));

    return list.map((l) => ({
      ...l,
      isChampion: l.rate === maxRate && maxRate > 0,
    }));
  }, [students, attendanceRecords, studentMap]);

  // 2. LEADERBOARD / PERINGKAT KEDISIPLINAN PER KELAS
  const classLeaderboard = useMemo(() => {
    const classData = {};

    classes.forEach((c) => {
      const teacherObj = teachers.find((t) => String(t.nip) === String(c.wali_kelas));
      classData[c.id_kelas] = {
        id_kelas: c.id_kelas,
        nama_kelas: c.nama_kelas,
        tingkat: c.tingkat,
        waliKelasName: teacherObj?.nama || 'Belum Ditentukan',
        studentsCount: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
      };
    });

    // Student counts
    students.forEach((s) => {
      if (classData[s.id_kelas]) {
        classData[s.id_kelas].studentsCount++;
      }
    });

    // Attendance counts
    attendanceRecords.forEach((row) => {
      const st = studentMap[row.nis];
      if (st?.classId && classData[st.classId]) {
        const s = String(row.status).toUpperCase();
        if (s === 'H') classData[st.classId].hadir++;
        else if (s === 'S') classData[st.classId].sakit++;
        else if (s === 'I') classData[st.classId].izin++;
        else if (s === 'A') classData[st.classId].alpa++;
      }
    });

    // Calculate rates and sort
    return Object.values(classData)
      .map((item) => {
        const total = item.hadir + item.sakit + item.izin + item.alpa;
        const rate = total > 0 ? Math.round((item.hadir / total) * 100) : 0;
        return {
          ...item,
          total,
          rate,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.hadir - a.hadir);
  }, [classes, students, attendanceRecords, studentMap, teachers]);

  // 3. GRAFIK TREN HARIAN DALAM BULAN
  const dailyTrend = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const trend = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

      let hadir = 0;
      let total = 0;

      attendanceRecords.forEach((r) => {
        if (r.tanggal === dateString) {
          total++;
          if (r.status === 'H') hadir++;
        }
      });

      const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
      trend.push({
        day: d,
        dateString,
        isWeekend,
        hadir,
        total,
        rate,
      });
    }
    return trend;
  }, [selectedYear, selectedMonth, attendanceRecords]);

  // 4. DISTRIBUSI STATUS GLOBAL
  const globalDistribution = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    attendanceRecords.forEach((r) => {
      const s = String(r.status).toUpperCase();
      if (s === 'H') hadir++;
      else if (s === 'S') sakit++;
      else if (s === 'I') izin++;
      else if (s === 'A') alpa++;
    });

    const total = hadir + sakit + izin + alpa;
    const hadirPct = total > 0 ? Math.round((hadir / total) * 100) : 0;
    const sakitPct = total > 0 ? Math.round((sakit / total) * 100) : 0;
    const izinPct = total > 0 ? Math.round((izin / total) * 100) : 0;
    const alpaPct = total > 0 ? Math.round((alpa / total) * 100) : 0;

    return { total, hadir, sakit, izin, alpa, hadirPct, sakitPct, izinPct, alpaPct };
  }, [attendanceRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. HEADER & PERIOD CONTROLS */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg tracking-tight">
                Analitik & Komparasi Presensi Antar Angkatan
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Komparasi tingkat jenjang SMP (7, 8, 9), leaderboard kedisiplinan kelas & visualisasi tren kehadiran
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>
                    Bulan {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Analisis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. KOMPARASI ANGKATAN (TINGKAT 7, 8, 9) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Komparasi Antar Tingkat / Angkatan</span>
          </h4>
          <span className="text-xs text-slate-400 font-medium">Periode {monthNames[selectedMonth]} {selectedYear}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gradeComparison.map((item) => (
            <div
              key={item.grade}
              className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                item.isChampion
                  ? 'bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              {item.isChampion && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs">
                  <Medal className="w-3 h-3" />
                  <span>Terdisiplin</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                      item.grade === '7'
                        ? 'bg-blue-100 text-blue-700'
                        : item.grade === '8'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.grade}
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800 text-sm">{item.label}</h5>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {item.studentsCount} Siswa Terdaftar
                    </p>
                  </div>
                </div>

                {/* Big Rate Percentage */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {item.rate}%
                    </span>
                    <span className="text-xs font-bold text-slate-500">Tingkat Kehadiran</span>
                  </div>

                  {/* Progress Stack Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden flex">
                    <div
                      style={{ width: `${item.rate}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Hadir: ${item.hadir}`}
                    />
                    <div
                      style={{
                        width: `${item.total > 0 ? (item.sakit / item.total) * 100 : 0}%`,
                      }}
                      className="bg-amber-400 h-full"
                      title={`Sakit: ${item.sakit}`}
                    />
                    <div
                      style={{
                        width: `${item.total > 0 ? (item.izin / item.total) * 100 : 0}%`,
                      }}
                      className="bg-sky-400 h-full"
                      title={`Izin: ${item.izin}`}
                    />
                    <div
                      style={{
                        width: `${item.total > 0 ? (item.alpa / item.total) * 100 : 0}%`,
                      }}
                      className="bg-rose-500 h-full"
                      title={`Alpa: ${item.alpa}`}
                    />
                  </div>
                </div>

                {/* Mini Counters Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-100 text-center">
                  <div className="p-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-700">Hadir</div>
                    <div className="font-black text-emerald-800 text-xs mt-0.5">{item.hadir}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-amber-50/70 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-700">Sakit</div>
                    <div className="font-black text-amber-800 text-xs mt-0.5">{item.sakit}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-sky-50/70 border border-sky-100">
                    <div className="text-[10px] font-bold text-sky-700">Izin</div>
                    <div className="font-black text-sky-800 text-xs mt-0.5">{item.izin}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-rose-50/70 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700">Alpa</div>
                    <div className="font-black text-rose-800 text-xs mt-0.5">{item.alpa}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ROW DUA: LEADERBOARD KELAS & DISTRIBUSI STATUS GLOBAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 Col): Leaderboard Kelas Terdisiplin */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Peringkat Kedisiplinan Seluruh Kelas (Leaderboard)</span>
            </h4>
            <span className="text-xs text-slate-400 font-medium">Berdasarkan % Hadir</span>
          </div>

          <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {classLeaderboard.map((cls, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={cls.id_kelas}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          rank === 1
                            ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30'
                            : rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800 text-sm">Kelas {cls.nama_kelas}</h5>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            Tingkat {cls.tingkat || '7'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Wali Kelas: <span className="text-slate-600 font-medium">{cls.waliKelasName}</span> •{' '}
                          {cls.studentsCount} Siswa
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Breakdown badges */}
                      <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          {cls.hadir} H
                        </span>
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                          {cls.sakit} S
                        </span>
                        <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md">
                          {cls.izin} I
                        </span>
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                          {cls.alpa} A
                        </span>
                      </div>

                      {/* Percentage & Progress bar */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-base font-black text-slate-800">{cls.rate}%</div>
                        <div className="text-[10px] text-slate-400 font-medium">Hadir</div>
                      </div>

                      {onSelectClass && (
                        <button
                          type="button"
                          onClick={() => onSelectClass(cls.id_kelas)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Buka Matriks Kelas Ini"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan (1 Col): Distribusi Global Status Presensi */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>Proporsi Status Global</span>
          </h4>

          <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-xs space-y-5">
            <div className="text-center space-y-1">
              <div className="text-4xl font-black text-slate-800 tracking-tight">
                {globalDistribution.total}
              </div>
              <p className="text-xs text-slate-400 font-medium">Total Catatan Presensi Terdata</p>
            </div>

            {/* Visual Circular Representation / Stack Bar */}
            <div className="space-y-3">
              {/* Hadir */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Hadir (H)
                  </span>
                  <span className="text-slate-800 font-black">
                    {globalDistribution.hadir} ({globalDistribution.hadirPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${globalDistribution.hadirPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Sakit */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Sakit (S)
                  </span>
                  <span className="text-slate-800 font-black">
                    {globalDistribution.sakit} ({globalDistribution.sakitPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${globalDistribution.sakitPct}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Izin */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-sky-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    Izin (I)
                  </span>
                  <span className="text-slate-800 font-black">
                    {globalDistribution.izin} ({globalDistribution.izinPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${globalDistribution.izinPct}%` }}
                    className="bg-sky-400 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Alpa */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Alpa (A)
                  </span>
                  <span className="text-slate-800 font-black">
                    {globalDistribution.alpa} ({globalDistribution.alpaPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${globalDistribution.alpaPct}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Persentase dihitung dari akumulasi data riwayat scan presensi siswa resmi di database sekolah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GRAFIK TREN KEHADIRAN HARIAN DALAM BULAN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Grafik Fluktuasi Tren Kehadiran Harian (Bulan {monthNames[selectedMonth]})</span>
          </h4>
          <span className="text-xs text-slate-400 font-medium">Tinggi batang = Persentase Hadir (%)</span>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200 bg-white shadow-xs">
          <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 overflow-x-auto">
            {dailyTrend.map((d) => {
              const heightPct = Math.max(d.rate, d.total > 0 ? 8 : 4);
              const barColor =
                d.total === 0
                  ? 'bg-slate-100'
                  : d.rate >= 90
                  ? 'bg-emerald-500 hover:bg-emerald-400'
                  : d.rate >= 75
                  ? 'bg-amber-400 hover:bg-amber-300'
                  : 'bg-rose-500 hover:bg-rose-400';

              return (
                <div
                  key={d.day}
                  className="flex-1 min-w-[20px] sm:min-w-[26px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-lg">
                    Tgl {d.day}: <strong>{d.hadir} Hadir</strong> ({d.rate}%)
                  </div>

                  {/* Percentage Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all ${barColor}`}
                  />

                  {/* Day Label */}
                  <div
                    className={`text-[10px] mt-2 font-bold ${
                      d.isWeekend ? 'text-rose-500 font-black' : 'text-slate-500'
                    }`}
                  >
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
            <span>Tanggal 1</span>
            <span className="text-slate-600 font-bold">Hari Kerja: Senin s/d Sabtu</span>
            <span>Tanggal {dailyTrend.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
