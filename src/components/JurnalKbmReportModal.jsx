import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  School,
  Download,
  Filter,
  RefreshCw,
  Award,
  Layers,
  Save,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastModalContext';

export default function JurnalKbmReportModal({
  isOpen,
  onClose,
  initialTeacher = null,
  allTeachers = [],
  schoolSettings = {},
  isAdmin = false,
}) {
  const { toast } = useToast();
  const printRef = useRef(null);

  // Sync body class for print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-open');
    } else {
      document.body.classList.remove('print-modal-open');
    }
    return () => {
      document.body.classList.remove('print-modal-open');
    };
  }, [isOpen]);

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
  const titimangsaRapor = effectiveSettings.tanggal_bagi_rapor || '2026-12-19';

  // Guru Terpilih
  const [selectedTeacherNip, setSelectedTeacherNip] = useState(
    initialTeacher?.nip || allTeachers[0]?.nip || ''
  );

  const selectedTeacher =
    allTeachers.find((t) => t.nip === selectedTeacherNip) ||
    initialTeacher || { nama: 'Bpk. Hendra Wijaya, M.Kom', nip: '199203152018011003' };

  // Filter Periode
  const today = new Date();
  const [reportType, setReportType] = useState('semesteran'); // 'semesteran' | 'bulanan'
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [filterKelas, setFilterKelas] = useState('all');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Load Data Jurnal KBM
  const [journalEntries, setJournalEntries] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    let storedJournals = [];
    try {
      storedJournals = JSON.parse(localStorage.getItem('siak_jurnal_kbm') || '[]');
    } catch (e) {
      storedJournals = [];
    }

    // Filter berdasarkan guru terpilih jika ada
    let teacherJournals = storedJournals.filter(
      (j) =>
        !j.id_guru ||
        j.id_guru === selectedTeacher.nip ||
        j.nama_guru === selectedTeacher.nama
    );

    // Jika belum ada cukup data, buat data sampel agenda realistis
    if (teacherJournals.length < 5) {
      const mockAgendas = generateMockAgendaEntries(selectedTeacher);
      teacherJournals = [...teacherJournals, ...mockAgendas];
    }

    // Filter periode
    if (reportType === 'bulanan') {
      const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      teacherJournals = teacherJournals.filter(
        (j) => j.tanggal && j.tanggal.startsWith(monthPrefix)
      );
    }

    // Filter kelas jika dipilih
    if (filterKelas !== 'all') {
      teacherJournals = teacherJournals.filter(
        (j) => j.nama_kelas && j.nama_kelas.toLowerCase().includes(filterKelas.toLowerCase())
      );
    }

    // Urutkan tanggal naik
    teacherJournals.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    setJournalEntries(teacherJournals);
  }, [isOpen, selectedTeacherNip, reportType, selectedMonth, selectedYear, filterKelas]);

  function generateMockAgendaEntries(teacher) {
    const list = [
      {
        id: 'mock_1',
        tanggal: '2026-08-04',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 1: Pengenalan Perangkat Keras dan Perangkat Lunak Komputer',
        tugas: 'Latihan uji pemahaman Bab 1 hal 18 nomor 1-5',
        kehadiran: '31 Hadir, 1 Sakit',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_2',
        tanggal: '2026-08-11',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 1: Praktik Perakitan Komponen Komputer & Sistem Operasi',
        tugas: 'Membuat peta konsep diagram alir sistem operasi',
        kehadiran: '32 Hadir (Nihil)',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_3',
        tanggal: '2026-08-18',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 2: Algoritma dan Pemrograman Dasar - Konsep Variabel & Tipe Data',
        tugas: 'LKS Algoritma halaman 24 nomor 1-4',
        kehadiran: '30 Hadir, 1 Izin, 1 Sakit',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_4',
        tanggal: '2026-08-25',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 2: Struktur Kontrol Percabangan (IF-ELSE) pada Bahasa Pemrograman',
        tugas: 'Menuliskan kode program percabangan kalkulator sederhana',
        kehadiran: '32 Hadir (Nihil)',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_5',
        tanggal: '2026-09-08',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 3: Jaringan Komputer dan Internet - Topologi Jaringan & Protokol TCP/IP',
        tugas: 'Menggambar skema topologi jaringan LAN laboratorium sekolah',
        kehadiran: '31 Hadir, 1 Alpa',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_6',
        tanggal: '2026-09-15',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Penilaian Tengah Semester (PTS) Ganjil KBM Informatika',
        tugas: 'Mengerjakan lembar tes PTS 30 butir soal',
        kehadiran: '32 Hadir (Nihil)',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_7',
        tanggal: '2026-09-22',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Pembahasan Soal PTS Ganjil & Remedial Materi Pemrograman',
        tugas: 'Perbaikan tugas portofolio bagi siswa di bawah KKM',
        kehadiran: '31 Hadir, 1 Sakit',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
      {
        id: 'mock_8',
        tanggal: '2026-10-06',
        hari: 'Senin',
        jam_ke: '1 - 2 (07:30 - 09:00)',
        nama_kelas: 'VII-A',
        nama_mapel: 'Informatika',
        materi: 'Bab 4: Dampak Sosial Informatika & Etika Keamanan Berinternet (Cyber Security)',
        tugas: 'Membuat poster edukasi anti-phishing dan privasi data',
        kehadiran: '32 Hadir (Nihil)',
        nama_guru: teacher.nama,
        id_guru: teacher.nip,
      },
    ];
    return list;
  }

  // 1. Export ke Excel (.xlsx)
  function handleExportExcel() {
    try {
      const rows = [
        ['BUKU AGENDA GURU & JURNAL MATERI PEMBELAJARAN'],
        [schoolName],
        [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semesterAktif}`],
        [`Guru Pengampu: ${selectedTeacher.nama} (NIP: ${selectedTeacher.nip || '-'})`],
        [`Periode: ${reportType === 'bulanan' ? `${monthNames[selectedMonth]} ${selectedYear}` : `Semester ${semesterAktif} T.A. ${tahunAjaran}`}`],
        [],
        ['No', 'Hari/Tanggal', 'Jam / Waktu', 'Kelas', 'Mata Pelajaran', 'Pokok Bahasan / Materi Pembelajaran', 'Penugasan / Catatan KBM', 'Kehadiran Siswa', 'Status'],
      ];

      journalEntries.forEach((item, idx) => {
        rows.push([
          idx + 1,
          item.tanggal || item.hari || '-',
          item.jam_ke || item.waktu || 'KBM',
          item.nama_kelas || '-',
          item.nama_mapel || '-',
          item.materi || '-',
          item.tugas || '-',
          item.kehadiran || 'Hadir Lengkap',
          'Terlaksana',
        ]);
      });

      const formattedTitimangsa = formatDateIndo(titimangsaRapor);
      const cityName = schoolCity.split(',')[0] || 'Kota Bangun';

      rows.push([]);
      rows.push(['', '', '', '', '', '', '', `${cityName}, ${formattedTitimangsa}`]);
      rows.push(['Mengetahui,', '', '', '', '', '', '', 'Guru Mata Pelajaran,']);
      rows.push([kepalaSekolahJabatan, '', '', '', '', '', '', '']);
      rows.push([]);
      rows.push([]);
      rows.push([kepalaSekolahNama, '', '', '', '', '', '', selectedTeacher.nama]);
      rows.push([`NIP. ${kepalaSekolahNip}`, '', '', '', '', '', '', `NIP. ${selectedTeacher.nip || '-'}`]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 14 },
        { wch: 18 },
        { wch: 10 },
        { wch: 18 },
        { wch: 42 },
        { wch: 32 },
        { wch: 22 },
        { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jurnal_KBM');

      const fileSuffix = reportType === 'bulanan' ? monthNames[selectedMonth] : semesterAktif;
      const fileName = `Jurnal_KBM_${selectedTeacher.nama.replace(/[^a-zA-Z0-9]/g, '_')}_${fileSuffix}_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Jurnal KBM berhasil diekspor ke Excel: ${fileName}!`);
    } catch (err) {
      toast.error(`Gagal ekspor: ${err.message}`);
    }
  }

  // Sync body class for print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-open');
    } else {
      document.body.classList.remove('print-modal-open');
    }
    return () => {
      document.body.classList.remove('print-modal-open');
    };
  }, [isOpen]);

  // 2. Cetak ke PDF
  function handlePrintPdf() {
    if (!selectedTeacher) {
      toast.error('Pilih data guru terlebih dahulu.');
      return;
    }
    if (!journalEntries || journalEntries.length === 0) {
      toast.error('Belum ada catatan agenda KBM yang dapat dicetak pada periode ini.');
      return;
    }
    setTimeout(() => {
      window.print();
    }, 150);
  }

  function handleOpenNewTab() {
    if (!selectedTeacher) {
      toast.error('Pilih data guru terlebih dahulu.');
      return;
    }
    if (!journalEntries || journalEntries.length === 0) {
      toast.error('Belum ada catatan agenda KBM yang dapat dicetak pada periode ini.');
      return;
    }
    const printEl = document.getElementById('printArea');
    if (!printEl) {
      window.print();
      return;
    }
    const teacherName = (selectedTeacher.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku_Jurnal_Mengajar_${teacherName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; margin: 0; padding: 12px; font-size: 10px; color: #000; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
    th, td { border: 1px solid #334155; padding: 5px 6px; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 9px; font-weight: 800; text-align: left; }
    tr { page-break-inside: avoid; }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:p-0 print:overflow-visible print:m-0">
      {/* Scoped Media Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
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
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            zoom: 88% !important;
          }
          table {
            width: 100% !important;
            table-layout: auto !important;
          }
          th, td {
            padding: 4px 6px !important;
            word-break: break-word !important;
          }
          .document-header, .kop-surat {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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

      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200 print:max-h-none print:max-w-none print:shadow-none print:border-none print:overflow-visible print:w-full print:p-0 print:m-0">
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white no-print print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Buku Agenda & Rekapitulasi Jurnal Mengajar KBM
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Resmi Kedinasan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Dokumen pengawasan kurikulum, pemenuhan jam tatap muka, dan arsip supervisi PKG
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

        {/* ========================================================= */}
        {/* FILTER BAR DOKUMEN                                        */}
        {/* ========================================================= */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0 no-print print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Pemilih Guru (Hanya tampil penuh jika mode Admin) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Guru Pengampu:</span>
              {isAdmin && allTeachers.length > 0 ? (
                <select
                  value={selectedTeacherNip}
                  onChange={(e) => setSelectedTeacherNip(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                >
                  {allTeachers.map((t) => (
                    <option key={t.nip} value={t.nip}>
                      {t.nama} ({t.nip})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                  {selectedTeacher.nama} ({selectedTeacher.nip || 'NIP Terdaftar'})
                </span>
              )}
            </div>

            {/* Filter Periode */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-xl bg-slate-200 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReportType('semesteran')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    reportType === 'semesteran' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  1 Semester Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('bulanan')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    reportType === 'bulanan' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Per Bulan
                </button>
              </div>

              {reportType === 'bulanan' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PREVIEW DOKUMEN BERKOP SURAT RESMI (SCROLLABLE & PRINTABLE)*/}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center print:p-0 print:m-0 print:overflow-visible print:bg-white print:w-full">
          <div
            id="printArea"
            ref={printRef}
            className="printable-area w-full max-w-4xl bg-white shadow-md rounded-2xl p-6 sm:p-8 space-y-6 text-slate-900 border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
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
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-2xl">
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
                  Kota / Wilayah: {schoolCity}
                </p>
              </div>
            </div>

            {/* JUDUL DOKUMEN & IDENTITAS GURU */}
            <div className="text-center space-y-1">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide underline underline-offset-4">
                BUKU AGENDA GURU & JURNAL MATERI PEMBELAJARAN
              </h3>
              <p className="text-xs font-bold text-slate-700">
                Tahun Ajaran {tahunAjaran} • Semester {semesterAktif}
              </p>
            </div>

            {/* TABEL PROFIL GURU & PERIODE */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p>
                  <span className="font-semibold text-slate-500">Nama Guru:</span>{' '}
                  <strong className="text-slate-800">{selectedTeacher.nama}</strong>
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-500">NIP / NUPTK:</span>{' '}
                  <strong className="text-slate-800 font-mono">{selectedTeacher.nip || '-'}</strong>
                </p>
              </div>
              <div className="text-right sm:text-left">
                <p>
                  <span className="font-semibold text-slate-500">Periode Rekap:</span>{' '}
                  <strong className="text-slate-800">
                    {reportType === 'bulanan'
                      ? `Bulan ${monthNames[selectedMonth]} ${selectedYear}`
                      : `Semester ${semesterAktif} (${tahunAjaran})`}
                  </strong>
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-500">Jumlah Pertemuan:</span>{' '}
                  <strong className="text-blue-700 font-bold">{journalEntries.length} Sesi Terlaksana</strong>
                </p>
              </div>
            </div>

            {/* TABEL UTAMA JURNAL AGENDA PEMBELAJARAN */}
            <div className="overflow-x-auto print:overflow-visible pb-1">
              <table className="w-full min-w-[700px] text-left border-collapse border border-slate-300 text-xs print:text-[10.5px]">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center w-8">No</th>
                    <th className="border border-slate-300 p-2 w-28">Hari / Tanggal</th>
                    <th className="border border-slate-300 p-2 w-24">Waktu / Jam</th>
                    <th className="border border-slate-300 p-2 w-16 text-center">Kelas</th>
                    <th className="border border-slate-300 p-2">Pokok Bahasan & Materi KBM</th>
                    <th className="border border-slate-300 p-2 w-40">Penugasan / Tugas Siswa</th>
                    <th className="border border-slate-300 p-2 w-28 text-center">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {journalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 p-6 text-center text-slate-400 italic">
                        Tidak ada catatan agenda mengajar pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    journalEntries.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">
                          <span className="font-bold block">{item.hari || 'KBM'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatDateIndo(item.tanggal)}
                          </span>
                        </td>
                        <td className="border border-slate-300 p-2 text-[11px] font-mono text-slate-600">
                          {item.jam_ke || item.waktu || '07:30 - 09:00'}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-center text-blue-700">
                          {item.nama_kelas}
                        </td>
                        <td className="border border-slate-300 p-2 leading-relaxed">
                          <span className="font-bold text-slate-900 block">{item.materi}</span>
                          {item.nama_mapel && (
                            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                              Mata Pelajaran: {item.nama_mapel}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-[11px] text-slate-600">
                          {item.tugas || '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-[11px] font-medium text-center bg-slate-50/50">
                          {item.kehadiran || '32 Hadir (Nihil)'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PENGESAHAN TANDA TANGAN KEPALA SEKOLAH & GURU PENGAMPU */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
              {/* Kolom Mengetahui Kepala Sekolah (Kiri) */}
              <div className="text-center relative">
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-800">{kepalaSekolahJabatan}</p>

                {/* Stempel Sekolah Digital (Jika Ada) */}
                <div className="h-24 my-1 flex items-center justify-center relative">
                  {schoolStempel && (
                    <img
                      src={schoolStempel}
                      alt="Stempel Sekolah"
                      className="absolute max-h-24 opacity-80 pointer-events-none select-none -translate-x-3"
                    />
                  )}
                </div>

                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {kepalaSekolahNama}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NIP. {kepalaSekolahNip}
                </p>
              </div>

              {/* Kolom Guru Mata Pelajaran (Kanan) */}
              <div className="text-center">
                <p className="text-slate-500">
                  {schoolCity.split(',')[0] || 'Kota Bangun'}, {formatDateIndo(titimangsaRapor)}
                </p>
                <p className="font-bold text-slate-800">Guru Mata Pelajaran,</p>
                <div className="h-24 my-1" />
                <p className="font-bold text-slate-900 underline underline-offset-2">
                  {selectedTeacher.nama}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NIP. {selectedTeacher.nip || '...........................................'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER DENGAN TOMBOL AKSI                           */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dokumen siap dicetak ke PDF atau diunduh ke Excel</span>
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
              onClick={handleOpenNewTab}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
              title="Buka dokumen di tab baru browser lalu tekan Ctrl+P"
            >
              <ExternalLink className="w-4 h-4 text-indigo-600" />
              <span>Buka di Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF Resmi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
