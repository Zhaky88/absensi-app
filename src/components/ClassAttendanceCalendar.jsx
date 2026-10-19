import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Award,
  Layers,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Sliders,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  BookmarkCheck,
  UserCheck,
  Globe,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastModalContext';
import { logActivity } from '../lib/activityLogger';

/**
 * ClassAttendanceCalendar Component
 * Komponen Kalender Pemantau Presensi & Jadwal KBM Multi-Kelas:
 * 1. Presensi Mandiri Per Mata Pelajaran (Subject-Level Attendance):
 *    - Setiap sesi mapel memiliki lembar presensi terpisah (Sesi 1 Fisika bisa Hadir, Sesi 2 Matematika bisa Sakit/Izin).
 *    - Tab/Tombol mata pelajaran interaktif dapat diklik untuk berganti sesi absensi.
 * 2. Format Baku 4 Status: H (Hadir), I (Izin), S (Sakit), A (Alpa). Status Telat (T) dihilangkan.
 * 3. Kolom Keterangan Opsional per Sesi Mapel: Mencatat alasan spesifik di jam pelajaran tersebut.
 * 4. Mode "Semua Kelas" & "Per Kelas": Monitoring multi-kelas atau kelas tunggal.
 * 5. Quick Inline Status & Keterangan: Penyimpanan instan per jadwal KBM ke database.
 */
export default function ClassAttendanceCalendar({
  classes = [],
  initialKelasId = 'all',
  allowEdit = true,
  onBack = null,
  onManageSchedule = null,
  isAdmin = false,
  isWaliKelas = false,
  activeTeacher = null, // { nip, nama }
}) {
  const { toast } = useToast();

  // Pilihan Cakupan Rekap: 'my_teaching' (Khusus Jam Mengajar Saya) vs 'all_school' (Rekap Keseluruhan Sekolah)
  const [calendarScope, setCalendarScope] = useState(() => {
    if (isAdmin || !activeTeacher) return 'all_school';
    try {
      const saved = localStorage.getItem(`siak_cal_scope_${activeTeacher.nip || 'guru'}`);
      return saved === 'all_school' ? 'all_school' : 'my_teaching';
    } catch (e) {
      return 'my_teaching';
    }
  });

  function handleScopeChange(newScope) {
    setCalendarScope(newScope);
    if (activeTeacher) {
      try {
        localStorage.setItem(`siak_cal_scope_${activeTeacher.nip || 'guru'}`, newScope);
      } catch (e) {}
    }
  }

  const [selectedKelasId, setSelectedKelasId] = useState(initialKelasId || 'all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Selected Day state for showing subjects & Daily Roster
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedDayRoster, setSelectedDayRoster] = useState(null);
  const [modalActiveKelasFilter, setModalActiveKelasFilter] = useState('all');
  const [expandedClasses, setExpandedClasses] = useState({});
  const [selectedSchedulePerClass, setSelectedSchedulePerClass] = useState({});
  const [searchStudent, setSearchStudent] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  const dayNameList = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayRoster(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayRoster(null);
  }

  function formatDateKey(d) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  useEffect(() => {
    if (initialKelasId) {
      setSelectedKelasId(initialKelasId);
    }
  }, [initialKelasId]);

  useEffect(() => {
    fetchClassMonthlyData();
  }, [selectedKelasId, year, month]);

  async function fetchClassMonthlyData() {
    setLoading(true);
    try {
      const isAllClasses = selectedKelasId === 'all';

      // 1. Tarik daftar siswa
      let studentQuery = supabase
        .from('siswa')
        .select('nis, nama, id_kelas, foto_wajah, status_siswa, streak_sekarang')
        .order('nama', { ascending: true });

      if (!isAllClasses) {
        studentQuery = studentQuery.eq('id_kelas', selectedKelasId);
      }

      const { data: stData } = await studentQuery;

      let studentList = stData && stData.length > 0 ? stData : [];
      if (studentList.length === 0) {
        // Mock fallback data per kelas
        studentList = [];
        const targetClasses = isAllClasses
          ? classes
          : classes.filter((c) => c.id_kelas === selectedKelasId);

        targetClasses.forEach((cls, cIdx) => {
          const names = [
            `Ahmad Fauzan (${cls.nama_kelas})`,
            `Bella Anggraini (${cls.nama_kelas})`,
            `Citra Kirana (${cls.nama_kelas})`,
            `Dimas Setiawan (${cls.nama_kelas})`,
            `Eka Pratiwi (${cls.nama_kelas})`,
          ];
          names.forEach((name, sIdx) => {
            studentList.push({
              nis: `202409${cIdx + 1}0${sIdx + 1}`,
              nama: name,
              id_kelas: cls.id_kelas,
              status_siswa: 'aktif',
              streak_sekarang: 8 + sIdx * 2,
            });
          });
        });
      }
      setStudents(studentList);

      // 2. Tarik data hari libur bulan ini
      const startMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(
        year,
        month + 1,
        0
      ).getDate()}`;

      const { data: holData } = await supabase
        .from('kalender_akademik')
        .select('*')
        .gte('tanggal', startMonthStr)
        .lte('tanggal', endMonthStr);

      setHolidays(holData || []);

      // 3. Tarik data jadwal pelajaran & guru pengajar
      let schedQuery = supabase
        .from('jadwal')
        .select(
          'id_jadwal, id_kelas, hari, jam_mulai, jam_selesai, batas_waktu_terlambat, mata_pelajaran(nama_mapel), guru(nama, foto_profil)'
        )
        .order('jam_mulai', { ascending: true });

      if (!isAllClasses) {
        schedQuery = schedQuery.eq('id_kelas', selectedKelasId);
      }

      const { data: schedData, error: schedError } = await schedQuery;
      if (schedError) {
        console.warn('Error fetching jadwal from supabase:', schedError);
      }

      let effectiveSchedules = [];
      if (schedData && schedData.length > 0) {
        const mappedSchedules = schedData.map((s) => ({
          ...s,
          batas_terlambat: s.batas_waktu_terlambat
            ? s.batas_waktu_terlambat.slice(0, 5)
            : '07:45',
        }));
        effectiveSchedules = mappedSchedules;
        setSchedules(mappedSchedules);
      } else {
        // Fallback mock jadwal per kelas & hari
        const mockSchedules = [];
        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        const sampleSubjects = [
          { mapel: 'Informatika & Koding', guru: 'Bpk. Ahmad Fauzi, S.Pd' },
          { mapel: 'Matematika Wajib', guru: 'Ibu Ratna Dewi, M.Pd' },
          { mapel: 'IPA Terpadu (Fisika)', guru: 'Bpk. Hendra Saputra, S.Si' },
          { mapel: 'Bahasa Indonesia', guru: 'Ibu Sri Wahyuni, S.Pd' },
          { mapel: 'Bahasa Inggris', guru: 'Bpk. Rizky Pratama, M.Pd' },
          { mapel: 'Pendidikan Agama Islam', guru: 'Ust. Abdullah, S.Ag' },
        ];

        classes.forEach((cls, cIdx) => {
          days.forEach((day, dIdx) => {
            const sub1 = sampleSubjects[(cIdx + dIdx) % sampleSubjects.length];
            const sub2 = sampleSubjects[(cIdx + dIdx + 1) % sampleSubjects.length];
            mockSchedules.push(
              {
                id_jadwal: `mock-s-${cls.id_kelas}-${day}-1`,
                id_kelas: cls.id_kelas,
                hari: day,
                jam_mulai: '07:30',
                jam_selesai: '09:00',
                batas_terlambat: '07:45',
                mata_pelajaran: { nama_mapel: sub1.mapel },
                guru: { nama: sub1.guru },
              },
              {
                id_jadwal: `mock-s-${cls.id_kelas}-${day}-2`,
                id_kelas: cls.id_kelas,
                hari: day,
                jam_mulai: '09:15',
                jam_selesai: '10:45',
                batas_terlambat: '09:30',
                mata_pelajaran: { nama_mapel: sub2.mapel },
                guru: { nama: sub2.guru },
              }
            );
          });
        });

        effectiveSchedules = isAllClasses
          ? mockSchedules
          : mockSchedules.filter((s) => s.id_kelas === selectedKelasId);
        setSchedules(effectiveSchedules);
      }

      // 4. Tarik data absensi siswa
      const studentNisList = studentList.map((s) => s.nis);
      if (studentNisList.length > 0) {
        const { data: attData } = await supabase
          .from('absensi')
          .select('id_absensi, nis, id_jadwal, tanggal, waktu, status, keterangan')
          .in('nis', studentNisList)
          .gte('tanggal', startMonthStr)
          .lte('tanggal', endMonthStr);

        if (attData && attData.length > 0) {
          // Normalize any existing 'T' records to 'H'
          const normalized = attData.map((r) => ({
            ...r,
            status: r.status === 'T' ? 'H' : r.status,
          }));
          setAttendanceRecords(normalized);
        } else {
          // Mock data kehadiran harian standar H, I, S, A dengan id_jadwal spesifik
          const mockAtt = [];
          studentList.forEach((s, sIdx) => {
            for (let d = 1; d <= 25; d++) {
              const dayOfWeek = new Date(year, month, d).getDay();
              if (dayOfWeek === 0) continue; // skip hari minggu
              const dayName = dayNameList[dayOfWeek];
              const dateStr = formatDateKey(d);

              // Cari jadwal kelas siswa pada hari ini
              const studentDaySchedules = effectiveSchedules.filter(
                (sch) => sch.id_kelas === s.id_kelas && sch.hari.toLowerCase() === dayName.toLowerCase()
              );

              studentDaySchedules.forEach((sch, schIdx) => {
                let st = 'H';
                let ket = '';

                // Simulasi variasi antar sesi mapel
                if (d === 7 && sIdx % 5 === 1) {
                  st = 'S';
                  ket = 'Demam flu';
                } else if (d === 11 && sIdx % 4 === 2) {
                  st = 'I';
                  ket = 'Izin keperluan keluarga';
                } else if (d === 4 && sIdx % 7 === 3) {
                  st = 'A';
                  ket = 'Tanpa kabar';
                } else if (d === 15 && schIdx === 1 && sIdx % 3 === 0) {
                  // Sesi 1 Hadir, Sesi 2 Sakit ke UKS
                  st = 'S';
                  ket = 'Izin ke ruang UKS pusing';
                }

                mockAtt.push({
                  id_absensi: `mock-${s.nis}-${sch.id_jadwal}-${dateStr}`,
                  nis: s.nis,
                  id_jadwal: sch.id_jadwal,
                  tanggal: dateStr,
                  waktu: st === 'H' ? sch.jam_mulai || '07:15' : '-',
                  status: st,
                  keterangan: ket,
                });
              });
            }
          });
          setAttendanceRecords(mockAtt);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data kalender kelas:', err);
    } finally {
      setLoading(false);
    }
  }

  // Quick Inline Edit Status Absensi Siswa per Sesi Mapel (H, I, S, A)
  async function handleQuickStatusChange(nis, newStatus, targetDate, targetJadwalId = null) {
    if (!allowEdit) return;
    setSavingAttendance(true);
    try {
      const existing = attendanceRecords.find(
        (r) =>
          r.nis === nis &&
          r.tanggal === targetDate &&
          (targetJadwalId ? r.id_jadwal === targetJadwalId : true)
      );

      // JIKA DIKLIK ULANG STATUS YANG SAMA: Batalkan presensi (Reset kembali ke Belum Diabsen)
      if (existing && existing.status === newStatus) {
        if (!String(existing.id_absensi).startsWith('mock')) {
          await supabase
            .from('absensi')
            .delete()
            .eq('id_absensi', existing.id_absensi);
        }

        setAttendanceRecords((prev) =>
          prev.filter(
            (r) =>
              !(
                r.nis === nis &&
                r.tanggal === targetDate &&
                (targetJadwalId ? r.id_jadwal === targetJadwalId : true)
              )
          )
        );

        if (selectedDayRoster) {
          setSelectedDayRoster((prev) => {
            if (!prev) return prev;
            let h = prev.hadirCount;
            let iCount = prev.izinCount;
            let sCount = prev.sakitCount;
            let a = prev.alpaCount;
            if (newStatus === 'H') h--;
            else if (newStatus === 'I') iCount--;
            else if (newStatus === 'S') sCount--;
            else if (newStatus === 'A') a--;
            return {
              ...prev,
              hadirCount: Math.max(0, h),
              izinCount: Math.max(0, iCount),
              sakitCount: Math.max(0, sCount),
              alpaCount: Math.max(0, a),
            };
          });
        }

        toast.info('Status presensi direset (Belum Diabsen)');
        return;
      }

      const payload = {
        nis,
        tanggal: targetDate,
        id_jadwal: targetJadwalId || existing?.id_jadwal || null,
        status: newStatus,
        waktu: newStatus === 'H' ? (existing?.waktu && existing.waktu !== '-' ? existing.waktu : '07:15') : '00:00',
        metode: 'manual',
        keterangan: existing?.keterangan || null,
      };

      const { data: savedData, error: saveErr } = await supabase
        .from('absensi')
        .upsert([payload], { onConflict: 'nis,id_jadwal,tanggal' })
        .select();

      if (saveErr) throw saveErr;
      const recordId = savedData?.[0]?.id_absensi || existing?.id_absensi || `temp-${Date.now()}`;
      toast.success(`Status ${newStatus} berhasil disimpan langsung ke database!`);

      // Catat log aktivitas presensi
      const studentObj = students.find((s) => s.nis === nis);
      logActivity({
        role: 'guru',
        userId: nis,
        userName: studentObj?.nama || `Siswa NIS ${nis}`,
        action: `Absensi Manual (${newStatus})`,
        category: 'presensi',
        details: `Guru mencatat presensi: Status ${newStatus} untuk ${studentObj?.nama || 'Siswa'} (NIS ${nis}) pada tanggal ${targetDate}`,
        status: newStatus === 'A' ? 'warning' : 'success',
        metadata: { nis, tanggal: targetDate, status: newStatus },
      });

      setAttendanceRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.nis === nis &&
              r.tanggal === targetDate &&
              (targetJadwalId ? r.id_jadwal === targetJadwalId : true)
            )
        );
        return [
          ...filtered,
          {
            id_absensi: recordId,
            nis,
            tanggal: targetDate,
            id_jadwal: payload.id_jadwal,
            status: newStatus,
            waktu: payload.waktu,
            keterangan: payload.keterangan,
          },
        ];
      });

      // Update local roster record stats
      if (selectedDayRoster) {
        setSelectedDayRoster((prev) => {
          if (!prev) return prev;
          let h = prev.hadirCount;
          let iCount = prev.izinCount;
          let sCount = prev.sakitCount;
          let a = prev.alpaCount;
          const oldStatus = existing ? (existing.status === 'T' ? 'H' : existing.status) : null;
          if (oldStatus === 'H') h--;
          else if (oldStatus === 'I') iCount--;
          else if (oldStatus === 'S') sCount--;
          else if (oldStatus === 'A') a--;

          if (newStatus === 'H') h++;
          else if (newStatus === 'I') iCount++;
          else if (newStatus === 'S') sCount++;
          else if (newStatus === 'A') a++;

          return {
            ...prev,
            hadirCount: Math.max(0, h),
            izinCount: Math.max(0, iCount),
            sakitCount: Math.max(0, sCount),
            alpaCount: Math.max(0, a),
          };
        });
      }
    } catch (e) {
      console.error('Gagal menyimpan status absensi ke database:', e);
      toast.error(`Gagal menyimpan ke database: ${e.message}`);
    } finally {
      setSavingAttendance(false);
    }
  }

  // Update Keterangan / Catatan Opsional per Siswa per Sesi Mapel
  async function handleUpdateKeterangan(nis, newKeterangan, targetDate, targetJadwalId = null) {
    try {
      const existing = attendanceRecords.find(
        (r) =>
          r.nis === nis &&
          r.tanggal === targetDate &&
          (targetJadwalId ? r.id_jadwal === targetJadwalId : true)
      );

      const trimmedKeterangan = newKeterangan?.trim() || '';

      if (!existing && !trimmedKeterangan) return;

      if (existing) {
        if (!String(existing.id_absensi).startsWith('mock')) {
          await supabase
            .from('absensi')
            .update({ keterangan: trimmedKeterangan || null })
            .eq('id_absensi', existing.id_absensi);
        }

        setAttendanceRecords((prev) =>
          prev.map((r) =>
            r.id_absensi === existing.id_absensi
              ? { ...r, keterangan: trimmedKeterangan || null }
              : r
          )
        );
      } else {
        // Jika siswa belum diabsen tetapi guru memberikan catatan khusus:
        // Deteksi secara logis apakah ada kata sakit atau izin, jangan memaksakan 'H' (Hadir)!
        const derivedStatus = /sakit|dokter|demam/i.test(trimmedKeterangan)
          ? 'S'
          : /izin|acara|tugas|dispensasi/i.test(trimmedKeterangan)
          ? 'I'
          : 'I';

        const payload = {
          nis,
          tanggal: targetDate,
          id_jadwal: targetJadwalId || null,
          status: derivedStatus,
          waktu: '00:00',
          metode: 'manual',
          keterangan: trimmedKeterangan,
        };

        const { data: insData } = await supabase.from('absensi').insert([payload]).select();
        const newId = insData?.[0]?.id_absensi || `temp-${Date.now()}`;

        setAttendanceRecords((prev) => [
          ...prev,
          {
            id_absensi: newId,
            nis,
            tanggal: targetDate,
            id_jadwal: payload.id_jadwal,
            status: derivedStatus,
            waktu: payload.waktu,
            keterangan: trimmedKeterangan,
          },
        ]);

        toast.info(`Catatan disimpan dengan status ${derivedStatus === 'S' ? 'Sakit' : 'Izin'}`);
      }
    } catch (err) {
      console.warn('Gagal menyimpan keterangan absensi:', err);
    }
  }

  const isAllClasses = selectedKelasId === 'all';
  const currentKelasObj = isAllClasses
    ? null
    : classes.find((c) => c.id_kelas === selectedKelasId);

  // Set ID Jadwal yang diampu oleh Guru yang sedang aktif
  const myScheduleIds = new Set(
    schedules
      .filter((s) => {
        if (!activeTeacher) return false;
        const tNip = String(activeTeacher.nip || '').trim();
        const tNama = String(activeTeacher.nama || '').trim().toLowerCase();
        const sGuruId = String(s.id_guru || '').trim();
        const sGuruNama = String(s.guru?.nama || '').trim().toLowerCase();
        return (
          (tNip && (sGuruId === tNip || s.guru?.nip === tNip)) ||
          (tNama && sGuruNama && (sGuruNama.includes(tNama) || tNama.includes(sGuruNama)))
        );
      })
      .map((s) => s.id_jadwal)
  );

  // Daftar kelas yang diajar oleh guru ini
  const myTeachingClasses = classes.filter((cls) =>
    schedules.some((s) => {
      if (s.id_kelas !== cls.id_kelas) return false;
      if (!activeTeacher) return false;
      const tNip = String(activeTeacher.nip || '').trim();
      const tNama = String(activeTeacher.nama || '').trim().toLowerCase();
      const sGuruId = String(s.id_guru || '').trim();
      const sGuruNama = String(s.guru?.nama || '').trim().toLowerCase();
      return (
        (tNip && (sGuruId === tNip || s.guru?.nip === tNip)) ||
        (tNama && sGuruNama && (sGuruNama.includes(tNama) || tNama.includes(sGuruNama)))
      );
    })
  );

  const isMyTeachingScope = calendarScope === 'my_teaching' && !!activeTeacher;


  // Grid Calculation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu
  const totalDays = new Date(year, month + 1, 0).getDate();

  const gridCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(
      <div
        key={`empty-${i}`}
        className="h-16 sm:h-22 bg-slate-50/50 rounded-2xl border border-transparent"
      />
    );
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateKey = formatDateKey(d);
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNameList[dayOfWeek];
    const isWeekend = dayOfWeek === 0; // Minggu
    const holiday = holidays.find((h) => h.tanggal === dateKey);

    // Filter jadwal pelajaran pada hari tanggal ini
    const dayAllSchedules = schedules.filter(
      (s) => s.hari.toLowerCase() === dayName.toLowerCase()
    );
    const dayMySchedules = dayAllSchedules.filter((s) => myScheduleIds.has(s.id_jadwal));
    const daySchedules = isMyTeachingScope ? dayMySchedules : dayAllSchedules;
    const isGuruFreeDay = isMyTeachingScope && dayMySchedules.length === 0;

    // Filter rekap presensi pada tanggal ini (Khusus Jam Mengajar Guru vs Keseluruhan)
    const rawDayRecords = attendanceRecords.filter((r) => r.tanggal === dateKey);
    const dayRecords = isMyTeachingScope
      ? rawDayRecords.filter((r) => myScheduleIds.size === 0 || (r.id_jadwal && myScheduleIds.has(r.id_jadwal)))
      : rawDayRecords;

    const totalStudents = students.length;

    // Hitung status unik per siswa pada hari ini untuk mencegah hitungan ganda antar-sesi mapel
    const studentDayStatus = new Map();
    dayRecords.forEach((r) => {
      const prev = studentDayStatus.get(r.nis);
      // Prioritas status: H/T > I > S > A
      if (
        !prev ||
        r.status === 'H' ||
        r.status === 'T' ||
        (prev === 'A' && (r.status === 'I' || r.status === 'S'))
      ) {
        studentDayStatus.set(r.nis, r.status === 'T' ? 'H' : r.status);
      }
    });

    let hadirCount = 0;
    let izinCount = 0;
    let sakitCount = 0;
    let alpaCount = 0;

    studentDayStatus.forEach((status) => {
      if (status === 'H') hadirCount++;
      else if (status === 'I') izinCount++;
      else if (status === 'S') sakitCount++;
      else if (status === 'A') alpaCount++;
    });

    const isToday = new Date().toDateString() === dateObj.toDateString();
    const isHoliday = holiday && holiday.is_libur;
    const hasRecords = dayRecords.length > 0;
    const percentPresent =
      totalStudents > 0
        ? Math.round((hadirCount / totalStudents) * 100)
        : 0;

    // Kelas yang memiliki KBM di hari ini
    const runningClassesOnDay = classes.filter((cls) =>
      daySchedules.some((s) => s.id_kelas === cls.id_kelas)
    );

    gridCells.push(
      <button
        key={d}
        type="button"
        onClick={() => {
          setSelectedDayKey(dateKey);
          setModalActiveKelasFilter('all');

          // Auto-expand all running classes initially
          const exp = {};
          classes.forEach((c) => { exp[c.id_kelas] = true; });
          setExpandedClasses(exp);

          // Auto-select first schedule for each class
          const initialSchedulePick = {};
          classes.forEach((cls) => {
            const classDaySched = daySchedules.filter((s) => s.id_kelas === cls.id_kelas);
            if (classDaySched.length > 0) {
              initialSchedulePick[cls.id_kelas] = classDaySched[0].id_jadwal;
            }
          });
          setSelectedSchedulePerClass(initialSchedulePick);

          setSelectedDayRoster({
            day: d,
            dateKey,
            dayName,
            holiday,
            isWeekend,
            hadirCount,
            izinCount,
            sakitCount,
            alpaCount,
            totalStudents,
            daySchedules,
            runningClasses: runningClassesOnDay,
          });
        }}
        className={`h-20 sm:h-24 p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative text-left group hover:scale-[1.02] hover:shadow-md ${
          selectedDayRoster?.dateKey === dateKey
            ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/80 shadow-sm'
            : isToday
            ? 'border-blue-400 bg-blue-50/30'
            : isHoliday
            ? 'bg-rose-50/80 border-rose-200 text-rose-800'
            : isWeekend
            ? 'bg-slate-100/70 border-slate-200 text-slate-400'
            : isGuruFreeDay
            ? 'bg-slate-50/70 border-slate-200/80 text-slate-400 hover:bg-slate-100/60'
            : hasRecords && alpaCount > 0
            ? 'bg-amber-50/60 border-amber-200'
            : hasRecords
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span
            className={`text-xs font-black leading-none ${
              isToday
                ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                : isWeekend || isHoliday
                ? 'text-rose-600 font-black'
                : 'text-slate-800'
            }`}
          >
            {d}
          </span>

          {isHoliday ? (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-200/80 text-rose-800 line-clamp-1 max-w-[70px]">
              Libur
            </span>
          ) : isWeekend ? (
            <span className="text-[9px] font-bold text-slate-400">Ahad</span>
          ) : hasRecords ? (
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                percentPresent >= 90
                  ? 'bg-emerald-100 text-emerald-800'
                  : percentPresent >= 75
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {percentPresent}%
            </span>
          ) : null}
        </div>

        {isHoliday ? (
          <p className="text-[10px] text-rose-700 font-medium line-clamp-2 leading-tight">
            {holiday.keterangan}
          </p>
        ) : !isWeekend && hasRecords ? (
          <div className="space-y-0.5 w-full">
            {isMyTeachingScope && dayMySchedules.length > 0 ? (
              <div className="flex items-center justify-between text-[9px] font-bold text-indigo-700">
                <span className="truncate">{dayMySchedules.length} Sesi KBM Anda</span>
              </div>
            ) : isAllClasses && runningClassesOnDay.length > 0 ? (
              <div className="flex items-center justify-between text-[9px] font-bold text-indigo-700">
                <span className="truncate">{runningClassesOnDay.length} Kelas KBM</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span className="text-emerald-700">H: {hadirCount}</span>
              {izinCount > 0 && (
                <span className="text-sky-700">I: {izinCount}</span>
              )}
              {sakitCount > 0 && (
                <span className="text-indigo-700">S: {sakitCount}</span>
              )}
              {alpaCount > 0 && (
                <span className="text-rose-700 font-black">A: {alpaCount}</span>
              )}
            </div>

            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(hadirCount / totalStudents) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Hadir: ${hadirCount}`}
              />
              <div
                style={{ width: `${(izinCount / totalStudents) * 100}%` }}
                className="bg-sky-500 h-full"
                title={`Izin: ${izinCount}`}
              />
              <div
                style={{ width: `${(sakitCount / totalStudents) * 100}%` }}
                className="bg-indigo-500 h-full"
                title={`Sakit: ${sakitCount}`}
              />
              <div
                style={{ width: `${(alpaCount / totalStudents) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`Alpa: ${alpaCount}`}
              />
            </div>
          </div>
        ) : !isWeekend ? (
          isGuruFreeDay ? (
            <span className="text-[10px] text-slate-400 font-medium italic flex items-center gap-1">
              ☕ Bebas Mengajar
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Belum ada absen</span>
          )
        ) : null}
      </button>
    );
  }

  // Toggle collapse class in modal
  function toggleClassExpand(classId) {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  }

  return (
    <div className="space-y-4">
      {/* Sakelar Pilihan Cakupan Rekap: Khusus Jam Mengajar Guru vs Seluruh Sekolah */}
      {activeTeacher && !isAdmin && (
        <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Cakupan Presensi Kalender:
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  calendarScope === 'my_teaching'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {calendarScope === 'my_teaching' ? 'Sesi Jam Mengajar Anda' : 'Seluruh Sekolah'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {calendarScope === 'my_teaching'
                  ? `Menyaring rekap presensi harian & jadwal KBM khusus untuk mata pelajaran yang Anda ampu (${activeTeacher.nama || 'Guru'}).`
                  : `Menampilkan seluruh rekap presensi siswa untuk semua mata pelajaran dan kelas di sekolah.`}
              </p>
            </div>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-auto shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => handleScopeChange('my_teaching')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                calendarScope === 'my_teaching'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Khusus Jam Mengajar Saya</span>
              {myScheduleIds.size > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700">
                  {myScheduleIds.size} Sesi
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('all_school')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                calendarScope === 'all_school'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Globe className="w-4 h-4 text-slate-600" />
              <span>Rekap Keseluruhan Sekolah</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header Controls: Pemilihan Kelas, Info Kelas, & Bulan */}
      <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Kembali ke Daftar Kelas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-800">
                {isMyTeachingScope
                  ? isAllClasses
                    ? `Kalender Jam Mengajar Saya: Seluruh Kelas Terkait (${myTeachingClasses.length} Kelas)`
                    : `Kalender Jam Mengajar Saya: Kelas ${currentKelasObj?.nama_kelas || 'Kelas'}`
                  : isAllClasses
                  ? `Kalender Presensi KBM: Seluruh Kelas (${classes.length} Kelas)`
                  : `Kalender Presensi & KBM: Kelas ${currentKelasObj?.nama_kelas || 'Kelas'}`}
              </h2>
              {isWaliKelas && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black uppercase">
                  Kelas Binaan Anda
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isMyTeachingScope
                ? `Memantau presensi siswa khusus pada jam mata pelajaran yang Anda ampu`
                : isAllClasses
                ? `Memantau presensi siswa mandiri per mata pelajaran & guru pengampu di semua kelas`
                : `Wali Kelas: ${
                    currentKelasObj?.guru?.nama ||
                    currentKelasObj?.wali_kelas ||
                    'Belum Ditentukan'
                  }${currentKelasObj?.tingkat ? ` • Tingkat Jenjang ${currentKelasObj.tingkat}` : ''}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Kelas: Opsi Semua Kelas + Kelas Spesifik */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
            <Layers className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                setSelectedDayRoster(null);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">
                {isMyTeachingScope
                  ? `🌟 Seluruh Kelas Ajar Saya (${myTeachingClasses.length} Kelas)`
                  : `🌟 Semua Kelas (${classes.length} Kelas)`}
              </option>
              {classes.map((cls) => {
                const isTaughtByMe = myTeachingClasses.some((mc) => mc.id_kelas === cls.id_kelas);
                return (
                  <option key={cls.id_kelas} value={cls.id_kelas}>
                    Kelas {cls.nama_kelas} (Tingkat {cls.tingkat || 10})
                    {isMyTeachingScope && isTaughtByMe ? ' • (Kelas Ajar Anda)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Navigasi Bulan */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl px-2 py-1 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-800 px-2 min-w-[125px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchClassMonthlyData}
            disabled={loading}
            className="p-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          {/* Tombol Admin: Atur Jadwal Kelas */}

        </div>
      </div>


      {/* Grid Kalender Presensi */}
      <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        {/* Info Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold pb-2 border-b border-slate-100">
          <span className="text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            {isAllClasses ? (
              <span>
                Total Seluruh Siswa:{' '}
                <strong className="text-indigo-700 font-black">{students.length} Siswa</strong>{' '}
                ({classes.length} Kelas)
              </span>
            ) : (
              <span>
                Total Siswa di Kelas Ini:{' '}
                <strong className="text-indigo-700 font-black">{students.length} Siswa</strong>
              </span>
            )}
          </span>

          {/* Legenda Standar 4 Status */}
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hadir (H)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Izin (I)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Sakit (S)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Alpa (A)
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-300" />{' '}
              Hari Libur
            </span>
          </div>
        </div>

        {/* Hari Bar */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-black uppercase text-slate-400">
          <span className="text-rose-500">Ahad</span>
          <span>Senin</span>
          <span>Selasa</span>
          <span>Rabu</span>
          <span>Kamis</span>
          <span>Jumat</span>
          <span className="text-slate-500">Sabtu</span>
        </div>

        {/* Cells Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{gridCells}</div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: DETAIL ROSTER KEHADIRAN HARIAN SAAT TANGGAL DIKLIK       */}
      {/* ========================================================================= */}
      {selectedDayRoster && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
                  Rekap Presensi KBM & Mata Pelajaran Harian
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  {isAllClasses
                    ? `Seluruh Rombongan Belajar • ${selectedDayRoster.dayName}, ${selectedDayRoster.day} ${monthNames[month]} ${year}`
                    : `Kelas ${currentKelasObj?.nama_kelas} • ${selectedDayRoster.dayName}, ${selectedDayRoster.day} ${monthNames[month]} ${year}`}
                </h3>
              </div>

              <button
                onClick={() => setSelectedDayRoster(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner Hari Libur jika ada */}
            {selectedDayRoster.holiday && selectedDayRoster.holiday.is_libur && (
              <div className="p-3 bg-rose-100/90 text-rose-800 px-5 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Hari Libur Sekolah: {selectedDayRoster.holiday.keterangan} (Streak kehadiran siswa
                  di-pause).
                </span>
              </div>
            )}

            {/* Metric Summary Cards Standar 4 Status: Hadir, Izin, Sakit, Alpa */}
            <div className="grid grid-cols-4 gap-2.5 p-3.5 sm:p-4 border-b border-slate-100 bg-white">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-700 block">Total Hadir (H)</span>
                <span className="text-base sm:text-lg font-black text-emerald-800">
                  {selectedDayRoster.hadirCount}
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-center">
                <span className="text-[10px] font-bold text-sky-700 block">Total Izin (I)</span>
                <span className="text-base sm:text-lg font-black text-sky-800">
                  {selectedDayRoster.izinCount}
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
                <span className="text-[10px] font-bold text-indigo-700 block">Total Sakit (S)</span>
                <span className="text-base sm:text-lg font-black text-indigo-800">
                  {selectedDayRoster.sakitCount}
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] font-bold text-rose-700 block">Total Alpa (A)</span>
                <span className="text-base sm:text-lg font-black text-rose-800">
                  {selectedDayRoster.alpaCount}
                </span>
              </div>
            </div>

            {/* Sub-Filter Kelas Tab (Jika Mode Semua Kelas) & Search */}
            <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
              {isAllClasses && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setModalActiveKelasFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      modalActiveKelasFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua Kelas ({classes.length})
                  </button>
                  {(isMyTeachingScope ? myTeachingClasses : classes).map((cls) => (
                    <button
                      key={cls.id_kelas}
                      type="button"
                      onClick={() => setModalActiveKelasFilter(cls.id_kelas)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        modalActiveKelasFilter === cls.id_kelas
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Kelas {cls.nama_kelas}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau NIS..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                {allowEdit && (
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    💡 Pilih mata pelajaran di kartu kelas untuk absensi sesi berbeda
                  </span>
                )}
              </div>
            </div>

            {/* DAFTAR KELAS & ROSTER SISWA */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const displayClasses = (isAllClasses
                  ? (isMyTeachingScope ? myTeachingClasses : classes)
                  : classes.filter((c) => c.id_kelas === selectedKelasId)
                ).filter(
                  (c) =>
                    modalActiveKelasFilter === 'all' ||
                    c.id_kelas === modalActiveKelasFilter
                );

                if (displayClasses.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Tidak ada kelas yang sesuai filter.
                    </div>
                  );
                }

                return displayClasses.map((cls) => {
                  const classStudents = students.filter(
                    (st) => st.id_kelas === cls.id_kelas
                  );
                  const classSchedules = (selectedDayRoster.daySchedules || []).filter(
                    (s) => s.id_kelas === cls.id_kelas
                  );

                  // Sesi jadwal yang sedang aktif dipilih pada kelas ini
                  const activeJadwalId =
                    selectedSchedulePerClass[cls.id_kelas] ||
                    (classSchedules.length > 0 ? classSchedules[0].id_jadwal : null);

                  const activeScheduleObj =
                    classSchedules.find((s) => s.id_jadwal === activeJadwalId) ||
                    classSchedules[0];

                  // Filter data absensi untuk siswa di kelas ini KHUSUS untuk jadwal KBM yang dipilih
                  const classRecords = classStudents.map((st) => {
                    // 1. Cari record presensi spesifik untuk sesi jadwal ini
                    const exactRec = attendanceRecords.find(
                      (r) =>
                        r.nis === st.nis &&
                        r.tanggal === selectedDayRoster.dateKey &&
                        (activeJadwalId ? r.id_jadwal === activeJadwalId : true)
                    );

                    // 2. Izin/Sakit/Alpa harian (all-day leave): jika siswa berhalangan sepanjang hari
                    // CATATAN PENTING: Hadir (H) dari sesi mapel lain TIDAK BOLEH dianggap otomatis hadir di sesi ini!
                    const dailyLeaveRec = !exactRec
                      ? attendanceRecords.find(
                          (r) =>
                            r.nis === st.nis &&
                            r.tanggal === selectedDayRoster.dateKey &&
                            (r.status === 'I' || r.status === 'S' || r.status === 'A')
                        )
                      : null;

                    const rec = exactRec || dailyLeaveRec;
                    const isRecorded = !!rec;
                    const rawStatus = rec?.status === 'T' ? 'H' : (rec?.status || null);
                    return {
                      ...st,
                      status: rawStatus,
                      waktu: exactRec?.waktu || (dailyLeaveRec ? '-' : '-'),
                      keterangan: rec?.keterangan || '',
                      isRecorded,
                      isAllDayLeave: !exactRec && !!dailyLeaveRec,
                    };
                  });

                  const filteredStudents = classRecords.filter(
                    (st) =>
                      st.nama.toLowerCase().includes(searchStudent.toLowerCase()) ||
                      st.nis.includes(searchStudent)
                  );

                  // Hitung statistik kelas ini KHUSUS pada sesi mapel yang aktif (H, I, S, A)
                  let clHadir = 0;
                  let clIzin = 0;
                  let clSakit = 0;
                  let clAlpa = 0;
                  let clBelum = 0;
                  classRecords.forEach((r) => {
                    if (!r.isRecorded) clBelum++;
                    else if (r.status === 'H') clHadir++;
                    else if (r.status === 'I') clIzin++;
                    else if (r.status === 'S') clSakit++;
                    else if (r.status === 'A') clAlpa++;
                  });

                  const clTotal = classStudents.length;
                  const clRecorded = clHadir + clIzin + clSakit + clAlpa;
                  const clPercent =
                    clTotal > 0
                      ? Math.round((clHadir / clTotal) * 100)
                      : 0;

                  const isExpanded = expandedClasses[cls.id_kelas] !== false;

                  return (
                    <div
                      key={cls.id_kelas}
                      className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Class Header Bar */}
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800">
                              Kelas {cls.nama_kelas}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              Tingkat {cls.tingkat || 10}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                clRecorded === 0
                                  ? 'bg-slate-100 text-slate-600'
                                  : clPercent >= 85
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : clPercent >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {clRecorded > 0 ? `${clPercent}% Hadir` : 'Belum Diabsen'}{' '}
                              {activeScheduleObj ? `(${activeScheduleObj.mata_pelajaran?.nama_mapel})` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Wali Kelas:{' '}
                            <strong className="text-slate-700">
                              {cls.guru?.nama || cls.wali_kelas || 'Belum Ditentukan'}
                            </strong>{' '}
                            • {classStudents.length} Siswa Terdaftar
                          </p>
                        </div>

                        {/* Statistik Mini & Collapse Button */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                            <span className="text-emerald-700">H: {clHadir}</span>
                            <span className="text-sky-700">I: {clIzin}</span>
                            <span className="text-indigo-700">S: {clSakit}</span>
                            <span className="text-rose-700 font-black">A: {clAlpa}</span>
                            {clBelum > 0 && (
                              <span className="text-slate-400 font-medium">Belum: {clBelum}</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleClassExpand(cls.id_kelas)}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title={isExpanded ? 'Tutup Roster' : 'Buka Roster'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* INTERACTIVE TABS: PILIH SESI MATA PELAJARAN (BISA DIKLIK) */}
                      {/* ========================================================= */}
                      <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100/70 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            Pilih Sesi Mata Pelajaran:
                          </span>
                          <span className="text-[10px] text-indigo-600/80 font-medium">
                            💡 Klik tombol mapel untuk membuka lembar absensi di jam tersebut
                          </span>
                        </div>

                        {classSchedules.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {classSchedules.map((sch, schIdx) => {
                              const isActive = sch.id_jadwal === activeJadwalId;
                              return (
                                <button
                                  key={sch.id_jadwal}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSchedulePerClass((prev) => ({
                                      ...prev,
                                      [cls.id_kelas]: sch.id_jadwal,
                                    }))
                                  }
                                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 scale-[1.02]'
                                      : 'bg-white border border-indigo-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs'
                                  }`}
                                  title={`Buka absensi sesi ${sch.mata_pelajaran?.nama_mapel} (${sch.guru?.nama})`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                      isActive
                                        ? 'bg-white text-indigo-700'
                                        : 'bg-indigo-100 text-indigo-700'
                                    }`}
                                  >
                                    {schIdx + 1}
                                  </span>
                                  <span className="font-extrabold">{sch.mata_pelajaran?.nama_mapel}</span>
                                  <span className={isActive ? 'text-indigo-200' : 'text-slate-300'}>|</span>
                                  <span
                                    className={`text-[11px] ${
                                      isActive ? 'text-indigo-100 font-medium' : 'text-slate-600'
                                    }`}
                                  >
                                    {sch.guru?.nama}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono ${
                                      isActive ? 'text-indigo-200' : 'text-slate-400'
                                    }`}
                                  >
                                    ({sch.jam_mulai?.slice(0, 5)})
                                  </span>
                                  {isActive && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"
                                      title="Sesi aktif yang sedang diisi presensinya"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Tidak ada jadwal mata pelajaran untuk kelas ini di hari{' '}
                            {selectedDayRoster.dayName}.
                          </p>
                        )}

                        {/* Banner status sesi aktif */}
                        {activeScheduleObj && (
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-700 shadow-2xs">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>Presensi Sesi:</span>
                              <strong className="text-indigo-700">
                                {activeScheduleObj.mata_pelajaran?.nama_mapel}
                              </strong>
                              <span className="text-slate-400 font-normal">| Pengajar:</span>
                              <strong className="text-slate-800">{activeScheduleObj.guru?.nama}</strong>
                            </span>
                            <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold self-start sm:self-auto">
                              Waktu: {activeScheduleObj.jam_mulai?.slice(0, 5)} - {activeScheduleObj.jam_selesai?.slice(0, 5)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Roster Siswa Kelas (Expandable) */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 space-y-2">
                          {filteredStudents.length === 0 ? (
                            <p className="text-center py-4 text-xs text-slate-400">
                              Tidak ada siswa yang cocok dengan pencarian di kelas ini.
                            </p>
                          ) : (
                            filteredStudents.map((st) => (
                              <div
                                key={st.nis}
                                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={
                                      st.foto_wajah ||
                                      `https://placehold.co/80x80/4338ca/ffffff?text=${st.nama.charAt(
                                        0
                                      )}`
                                    }
                                    alt={st.nama}
                                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-800 block leading-tight truncate">
                                      {st.nama}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                      <span>NIS: {st.nis}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                        <Award className="w-3 h-3" /> Streak:{' '}
                                        {st.streak_sekarang || 0}h
                                      </span>
                                      {st.isRecorded ? (
                                        <>
                                          <span>•</span>
                                          <span className="text-slate-600 font-mono">
                                            Masuk: {st.waktu}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span>•</span>
                                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[9px]">
                                            Belum Diabsen
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Kolom Keterangan Opsional & Quick Buttons H, I, S, A */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                                  {/* Input Keterangan / Catatan Opsional untuk Sesi Mapel Ini */}
                                  <div className="relative flex-1 sm:w-56 md:w-64">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                                    <input
                                      type="text"
                                      disabled={!allowEdit}
                                      placeholder={`Catatan mapel ${activeScheduleObj?.mata_pelajaran?.nama_mapel ? `(${activeScheduleObj.mata_pelajaran.nama_mapel})` : ''}...`}
                                      defaultValue={st.keterangan || ''}
                                      key={`${st.nis}-${activeJadwalId}`}
                                      onBlur={(e) =>
                                        handleUpdateKeterangan(
                                          st.nis,
                                          e.target.value,
                                          selectedDayRoster.dateKey,
                                          activeJadwalId
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.target.blur();
                                        }
                                      }}
                                      className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                                    />
                                  </div>

                                  {/* Quick Inline Action Buttons: Standar 4 Status (H, I, S, A) */}
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                    {[
                                      {
                                        code: 'H',
                                        label: 'Hadir',
                                        activeColor:
                                          'bg-emerald-600 text-white border-emerald-600',
                                      },
                                      {
                                        code: 'I',
                                        label: 'Izin',
                                        activeColor:
                                          'bg-sky-500 text-white border-sky-500',
                                      },
                                      {
                                        code: 'S',
                                        label: 'Sakit',
                                        activeColor:
                                          'bg-indigo-500 text-white border-indigo-500',
                                      },
                                      {
                                        code: 'A',
                                        label: 'Alpa',
                                        activeColor:
                                          'bg-rose-600 text-white border-rose-600',
                                      },
                                    ].map((item) => {
                                      const isCurrent = st.isRecorded && st.status === item.code;
                                      return (
                                        <button
                                          key={item.code}
                                          type="button"
                                          disabled={savingAttendance || !allowEdit}
                                          onClick={() =>
                                            handleQuickStatusChange(
                                              st.nis,
                                              item.code,
                                              selectedDayRoster.dateKey,
                                              activeJadwalId
                                            )
                                          }
                                          title={isCurrent ? 'Klik untuk membatalkan presensi (kembali ke Belum Diabsen)' : `Ubah status ${activeScheduleObj?.mata_pelajaran?.nama_mapel || 'mapel'} menjadi ${item.label}`}
                                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-[11px] font-black border transition-all cursor-pointer flex items-center justify-center ${
                                            isCurrent
                                              ? `${item.activeColor} shadow-sm ring-2 ring-indigo-500/30 scale-105`
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                          }`}
                                        >
                                          {item.code}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Presensi & catatan tersimpan mandiri per sesi mata pelajaran.
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayRoster(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
