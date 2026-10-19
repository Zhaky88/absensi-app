import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Flame, AlertCircle } from 'lucide-react';

/**
 * AttendanceCalendar Component
 * Komponen Kalender Interaktif yang menampilkan:
 * 1. Tanggal Kalender Bulanan
 * 2. Status Kehadiran Murid (Dot Indicator: Hijau=Hadir, Biru=Izin/Sakit, Merah=Alpa)
 * 3. Hari Libur Sekolah / Nasional (Badge Merah Muda / Abu-abu dengan Keterangan Libur)
 * 4. Popup Detail riwayat kehadiran saat tanggal diklik
 */
export default function AttendanceCalendar({ attendanceRecords = [], holidays = [], currentStreak = 0 }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Nama Bulan Indonesia
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Hari Pertama Bulan Ini (0 = Minggu, 1 = Senin, ...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Jumlah Hari dalam Bulan Ini
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Helper navigasi bulan
  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayDetail(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayDetail(null);
  }

  // Format YYYY-MM-DD
  function formatDateKey(day) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Cari data kehadiran pada tanggal tertentu
  function getAttendanceForDay(dateKey) {
    return attendanceRecords.find((r) => r.tanggal === dateKey);
  }

  // Cari data hari libur pada tanggal tertentu
  function getHolidayForDay(dateKey) {
    return holidays.find((h) => h.tanggal === dateKey);
  }

  // Render Grid Tanggal
  const daysGrid = [];
  // Slot kosong sebelum hari pertama
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(<div key={`empty-${i}`} className="h-10 sm:h-12 bg-transparent" />);
  }

  // Slot tanggal aktif
  for (let d = 1; d <= totalDays; d++) {
    const dateKey = formatDateKey(d);
    const att = getAttendanceForDay(dateKey);
    const hol = getHolidayForDay(dateKey);
    const isWeekend = new Date(year, month, d).getDay() === 0; // Minggu

    let dotColor = null;
    let badgeText = null;

    if (hol && hol.is_libur) {
      badgeText = 'Libur';
    } else if (isWeekend) {
      badgeText = 'Ahad';
    } else if (att) {
      if (att.status === 'H') dotColor = 'bg-emerald-500';
      else if (att.status === 'I') dotColor = 'bg-sky-500';
      else if (att.status === 'S') dotColor = 'bg-indigo-500';
      else if (att.status === 'A') dotColor = 'bg-rose-500';
    }

    daysGrid.push(
      <button
        key={d}
        type="button"
        onClick={() => {
          setSelectedDayDetail({
            day: d,
            dateKey,
            att,
            hol,
            isWeekend,
          });
        }}
        className={`h-11 sm:h-14 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all border cursor-pointer relative ${
          selectedDayDetail?.dateKey === dateKey
            ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/80 shadow-xs'
            : hol && hol.is_libur
            ? 'bg-rose-50/70 border-rose-200/80 text-rose-700 hover:bg-rose-100/70'
            : isWeekend
            ? 'bg-slate-100/80 border-slate-200/80 text-slate-400'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <span className={`text-xs font-bold leading-none ${isWeekend || (hol && hol.is_libur) ? 'text-rose-600 font-black' : ''}`}>
          {d}
        </span>

        {/* Status Dot / Libur Badge */}
        {badgeText ? (
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 leading-tight">
            {badgeText}
          </span>
        ) : dotColor ? (
          <div className="flex items-center gap-0.5">
            <span className={`w-2 h-2 rounded-full ${dotColor} ring-2 ring-white shadow-xs animate-pulse`} />
            <span className="text-[9px] font-black uppercase text-slate-600">{att.status}</span>
          </div>
        ) : (
          <span className="text-[9px] text-slate-300">-</span>
        )}
      </button>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
      {/* Header Kalender & Navigasi Bulan */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" /> Kalender Presensi & Hari Libur
          </h3>
          <p className="text-[11px] text-slate-500">
            Klik salah satu tanggal untuk melihat rincian jam presensi atau status libur.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-800 px-2 min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bar Hari */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
        <span className="text-rose-500">Min</span>
        <span>Sen</span>
        <span>Sel</span>
        <span>Rab</span>
        <span>Kam</span>
        <span>Jum</span>
        <span className="text-slate-500">Sab</span>
      </div>

      {/* Grid Tanggal */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">{daysGrid}</div>

      {/* Legenda Warna & Indikator */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hadir (H)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Izin (I)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Sakit (S)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Alpa (A)
          </span>
          <span className="flex items-center gap-1 text-rose-600">
            <span className="w-2 h-2 rounded-full bg-rose-300" /> Libur Sekolah (Streak Pause)
          </span>
        </div>
      </div>

      {/* Modal Detail Tanggal Terpilih */}
      {selectedDayDetail && (
        <div className="mt-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>
              Tanggal: {selectedDayDetail.day} {monthNames[month]} {year}
            </span>
            <button
              onClick={() => setSelectedDayDetail(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>

          {selectedDayDetail.hol && selectedDayDetail.hol.is_libur ? (
            <div className="p-3 bg-rose-100/80 text-rose-800 rounded-xl font-medium space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Hari Libur: {selectedDayDetail.hol.keterangan}
              </span>
              <p className="text-[11px] text-rose-700">
                ⏸️ Status Gamifikasi: Streak kehadiran Anda aman (di-pause) dan tidak dihitung alpa pada hari libur.
              </p>
            </div>
          ) : selectedDayDetail.att ? (
            <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1">
              <span className="font-bold text-slate-800 block">
                Status: {selectedDayDetail.att.status === 'H' ? '✅ Hadir' : selectedDayDetail.att.status === 'I' ? 'ℹ️ Izin' : selectedDayDetail.att.status === 'S' ? '💊 Sakit' : '❌ Alpa'}
              </span>
              <p className="text-[11px] text-slate-600">Waktu Scan: {selectedDayDetail.att.waktu || '07:15'}</p>
              <p className="text-[11px] text-slate-500">Mapel: {selectedDayDetail.att.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Pembelajaran'}</p>
              {selectedDayDetail.att.keterangan && (
                <p className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 mt-1">
                  Catatan/Keterangan: {selectedDayDetail.att.keterangan}
                </p>
              )}
            </div>
          ) : selectedDayDetail.isWeekend ? (
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 text-[11px]">
              Hari Ahad / Akhir pekan: Tidak ada kegiatan belajar mengajar aktif.
            </div>
          ) : (
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 text-[11px]">
              Belum ada catatan presensi tercatat untuk tanggal ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
