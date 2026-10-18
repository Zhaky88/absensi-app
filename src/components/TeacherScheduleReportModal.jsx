import React, { useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  BookOpen,
  School,
  CheckCircle2,
  GraduationCap,
  Award,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastModalContext';

export default function TeacherScheduleReportModal({
  isOpen,
  onClose,
  teacher = null,
  schedules = [],
  schoolSettings = {},
}) {
  const { toast } = useToast();
  const printRef = useRef(null);

  if (!isOpen) return null;

  // Inisialisasi Identitas Resmi Sekolah & Kepala Sekolah
  const savedSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem('siak_system_settings') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const effectiveSettings = { ...savedSettings, ...schoolSettings };
  const schoolName = effectiveSettings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN';
  const schoolLogo = effectiveSettings.sekolah_logo || '';
  const schoolStempel = effectiveSettings.sekolah_stempel || '';
  const schoolDinas =
    effectiveSettings.sekolah_dinas ||
    'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN';
  const schoolAddress =
    effectiveSettings.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12, Kota Bangun';
  const schoolCity = effectiveSettings.sekolah_kota || 'Kota Bangun, Kutai Kartanegara';
  const schoolNpsn = effectiveSettings.sekolah_npsn || '30401234';
  const schoolAkreditasi = effectiveSettings.sekolah_akreditasi || 'A (Unggul)';
  const kepalaSekolahNama = effectiveSettings.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd';
  const kepalaSekolahNip = effectiveSettings.kepala_sekolah_nip || '197003121995121001';
  const kepalaSekolahJabatan = effectiveSettings.kepala_sekolah_jabatan || 'Kepala Sekolah';

  const tahunAjaran = effectiveSettings.tahun_ajaran_aktif || '2026/2027';
  const semesterAktif = effectiveSettings.semester_aktif || 'Ganjil';

  const teacherName = teacher?.nama || 'Guru Pengampu';
  const teacherNip = teacher?.nip || '-';

  // Urutan hari standar
  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Urutkan jadwal berdasarkan hari dan jam_mulai
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dayIndexA = daysOrder.indexOf(a.hari);
    const dayIndexB = daysOrder.indexOf(b.hari);
    if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
    return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
  });

  const totalSesi = sortedSchedules.length;
  const totalJp = totalSesi * 2;
  const uniqueClasses = Array.from(
    new Set(sortedSchedules.map((s) => s.kelas?.nama_kelas || s.id_kelas).filter(Boolean))
  );
  const uniqueMapels = Array.from(
    new Set(sortedSchedules.map((s) => s.mata_pelajaran?.nama_mapel).filter(Boolean))
  );

  function handlePrintPdf() {
    setTimeout(() => {
      window.print();
    }, 150);
  }

  function handleExportExcel() {
    try {
      const rows = [
        [schoolDinas],
        [schoolName],
        [`Alamat: ${schoolAddress}, ${schoolCity} | NPSN: ${schoolNpsn} | Akreditasi: ${schoolAkreditasi}`],
        [],
        ['JADWAL PEMBELAJARAN & BEBAN MENGAJAR TATAP MUKA GURU'],
        [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semesterAktif}`],
        [],
        ['Nama Guru', ':', teacherName],
        ['NIP / NUPTK', ':', teacherNip],
        ['Mata Pelajaran', ':', uniqueMapels.join(', ') || '-'],
        ['Beban Tatap Muka', ':', `${totalSesi} Sesi Pertemuan (${totalJp} Jam Pelajaran / Minggu)`],
        ['Rombel Diampu', ':', uniqueClasses.map((c) => `Kelas ${c}`).join(', ') || '-'],
        [],
        [
          'No',
          'Hari',
          'Jam KBM (Mulai - Selesai)',
          'Rombel / Kelas',
          'Mata Pelajaran',
          'Batas Toleransi',
          'Alokasi Waktu',
          'Status Sesi',
        ],
      ];

      sortedSchedules.forEach((s, idx) => {
        rows.push([
          idx + 1,
          s.hari,
          `${s.jam_mulai || '-'} s.d. ${s.jam_selesai || '-'}`,
          `Kelas ${s.kelas?.nama_kelas || s.id_kelas}`,
          s.mata_pelajaran?.nama_mapel || 'Mata Pelajaran',
          s.batas_waktu_terlambat || s.jam_mulai || '-',
          '2 Jam Pelajaran (JP)',
          'Aktif Terjadwal',
        ]);
      });

      rows.push([]);
      rows.push([
        'TOTAL BEBAN MENGAJAR',
        '',
        '',
        `${uniqueClasses.length} Rombel`,
        `${uniqueMapels.length} Mapel`,
        '',
        `${totalJp} JP / Minggu`,
        `${totalSesi} Sesi KBM`,
      ]);

      const todayStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const cityName = schoolCity.split(',')[0] || 'Kota Bangun';

      rows.push([]);
      rows.push([]);
      rows.push(['', '', '', '', '', '', `${cityName}, ${todayStr}`]);
      rows.push(['Mengetahui,', '', '', '', '', '', 'Guru Pengampu,']);
      rows.push([kepalaSekolahJabatan, '', '', '', '', '', '']);
      rows.push([]);
      rows.push([]);
      rows.push([kepalaSekolahNama, '', '', '', '', '', teacherName]);
      rows.push([`NIP. ${kepalaSekolahNip}`, '', '', '', '', '', `NIP. ${teacherNip}`]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 12 },
        { wch: 22 },
        { wch: 16 },
        { wch: 28 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_Mengajar');

      const fileName = `Jadwal_Mengajar_${teacherName.replace(/[^a-zA-Z0-9]/g, '_')}_${tahunAjaran.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Jadwal Mengajar berhasil diunduh ke Excel: ${fileName}!`);
    } catch (err) {
      toast.error(`Gagal ekspor: ${err.message}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:p-0 print:overflow-visible print:m-0">
      {/* Scoped Media Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden;
          }
          #printScheduleArea, #printScheduleArea * {
            visibility: visible;
          }
          #printScheduleArea {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print, [data-no-print="true"] {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200 print:max-h-none print:max-w-none print:shadow-none print:border-none print:overflow-visible print:w-full print:p-0 print:m-0">
        {/* Modal Header Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white no-print print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Lembar Cetak Jadwal Mengajar Guru
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  Resmi Kurikulum
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Arsip alokasi jam tatap muka mingguan dan jadwal KBM guru
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center print:p-0 print:m-0 print:overflow-visible print:bg-white print:w-full">
          <div
            id="printScheduleArea"
            ref={printRef}
            className="printable-area w-full max-w-3xl bg-white shadow-md rounded-2xl p-6 sm:p-8 space-y-5 text-slate-900 border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
          >
            {/* KOP SURAT RESMI SEKOLAH */}
            <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
              <div className="w-20 h-20 shrink-0 flex items-center justify-center p-1">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt="Logo Sekolah"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-2xl">
                    🏫
                  </div>
                )}
              </div>
              <div className="flex-1 text-center leading-tight">
                <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                  {schoolDinas}
                </h4>
                <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide mt-0.5">
                  {schoolName}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1">
                  NPSN: {schoolNpsn} • Akreditasi: {schoolAkreditasi} • {schoolAddress}
                </p>
                <p className="text-[10px] text-slate-500">
                  Wilayah: {schoolCity}
                </p>
              </div>
            </div>

            {/* JUDUL DOKUMEN RESMI */}
            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide underline underline-offset-4">
                JADWAL PEMBELAJARAN & BEBAN MENGAJAR TATAP MUKA
              </h3>
              <p className="text-xs font-bold text-slate-700">
                Tahun Ajaran {tahunAjaran} • Semester {semesterAktif}
              </p>
            </div>

            {/* IDENTITAS GURU & BEBAN STATISTIK */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-slate-500">Nama Guru:</span>{' '}
                  <strong className="text-slate-800">{teacherName}</strong>
                </p>
                <p>
                  <span className="font-semibold text-slate-500">NIP / NUPTK:</span>{' '}
                  <strong className="text-slate-800 font-mono">{teacherNip}</strong>
                </p>
                <p>
                  <span className="font-semibold text-slate-500">Mata Pelajaran:</span>{' '}
                  <strong className="text-indigo-700">{uniqueMapels.join(', ') || 'Semua Mapel'}</strong>
                </p>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <p>
                  <span className="font-semibold text-slate-500">Total Beban Mengajar:</span>{' '}
                  <strong className="text-indigo-700">{totalSesi} Sesi Pertemuan ({totalJp} JP / Minggu)</strong>
                </p>
                <p>
                  <span className="font-semibold text-slate-500">Rombel Kelas Diampu:</span>{' '}
                  <strong className="text-slate-800">
                    {uniqueClasses.length > 0 ? uniqueClasses.map((c) => `Kelas ${c}`).join(', ') : 'Belum Terpetakan'}
                  </strong>
                </p>
                <p>
                  <span className="font-semibold text-slate-500">Status Validasi:</span>{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    ✓ Terverifikasi Kurikulum
                  </span>
                </p>
              </div>
            </div>

            {/* TABEL JADWAL KBM */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print:text-[10.5px]">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center w-8">No</th>
                    <th className="border border-slate-300 p-2 w-20">Hari</th>
                    <th className="border border-slate-300 p-2 w-32">Waktu KBM</th>
                    <th className="border border-slate-300 p-2 w-24 text-center">Kelas</th>
                    <th className="border border-slate-300 p-2">Mata Pelajaran</th>
                    <th className="border border-slate-300 p-2 w-28 text-center">Toleransi</th>
                    <th className="border border-slate-300 p-2 w-24 text-center">Alokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 p-6 text-center text-slate-400 italic">
                        Tidak ada data jadwal mengajar untuk guru ini.
                      </td>
                    </tr>
                  ) : (
                    sortedSchedules.map((s, idx) => (
                      <tr key={s.id_jadwal || idx} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-800">
                          {s.hari}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono font-semibold text-slate-700">
                          {s.jam_mulai} - {s.jam_selesai}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-indigo-700">
                          Kelas {s.kelas?.nama_kelas || s.id_kelas}
                        </td>
                        <td className="border border-slate-300 p-2 font-semibold text-slate-900">
                          {s.mata_pelajaran?.nama_mapel || 'Mata Pelajaran'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">
                          {s.batas_waktu_terlambat || s.jam_mulai}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">
                          2 JP
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-2 text-right uppercase text-[11px]">
                      Total Beban Tatap Muka:
                    </td>
                    <td className="p-2 text-center text-indigo-700">{uniqueClasses.length} Rombel</td>
                    <td className="p-2">{uniqueMapels.length} Mata Pelajaran</td>
                    <td className="p-2 text-center text-slate-500">-</td>
                    <td className="p-2 text-center text-indigo-700 font-black">{totalJp} JP / Mgg</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* KOLOM PENGESAHAN TANDA TANGAN */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
              <div className="text-center relative">
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-800">{kepalaSekolahJabatan}</p>

                {schoolStempel && (
                  <div className="h-24 my-1 flex items-center justify-center relative">
                    <img
                      src={schoolStempel}
                      alt="Stempel Sekolah"
                      className="absolute max-h-24 opacity-80 pointer-events-none select-none -translate-x-3"
                    />
                  </div>
                )}
                {!schoolStempel && <div className="h-24 my-1" />}

                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {kepalaSekolahNama}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NIP. {kepalaSekolahNip}
                </p>
              </div>

              <div className="text-center">
                <p className="text-slate-500">
                  {schoolCity.split(',')[0] || 'Kota Bangun'},{' '}
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="font-bold text-slate-800">Guru Pengampu,</p>
                <div className="h-24 my-1" />
                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {teacherName}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NIP. {teacherNip}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format cetak standar A4 siap digunakan untuk administrasi mengajar</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
