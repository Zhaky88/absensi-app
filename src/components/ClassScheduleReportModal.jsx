import React, { useRef, useEffect, useState } from 'react';
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
  Users,
  Grid,
  ExternalLink,
  FileDown,
  Layers,
  Sparkles,
  Shield,
  FolderOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastModalContext';

export default function ClassScheduleReportModal({
  isOpen,
  onClose,
  selectedClass = null,
  classes = [],
  schedules = [],
  teachers = [],
  subjects = [],
  schoolSettings = {},
  initialMode = 'single_class', // 'single_class' | 'all_classes'
}) {
  const { toast } = useToast();
  const printContentRef = useRef(null);

  // Parameter & Opsi Cetak
  const [printMode, setPrintMode] = useState(initialMode || 'single_class');
  const [activeClass, setActiveClass] = useState(
    selectedClass || (classes.length > 0 ? classes[0] : null)
  );
  const [printPaperOrientation, setPrintPaperOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    if (selectedClass) {
      setActiveClass(selectedClass);
      setPrintMode(initialMode || 'single_class');
    } else if (classes && classes.length > 0) {
      setActiveClass((prev) => prev || classes[0]);
      if (initialMode) setPrintMode(initialMode);
    }
  }, [isOpen, selectedClass, classes, initialMode]);

  // Sync body class untuk isolasi modal & scroll lock
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

  if (!isOpen) return null;

  // Identitas Resmi Sekolah & Kepala Sekolah
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
  const cityName = schoolCity.split(',')[0] || 'Kota Bangun';
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Urutan hari standar KBM
  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Helper resolusi data guru & mapel
  const getTeacherName = (s) => {
    if (s.guru?.nama) return s.guru.nama;
    const found = teachers.find(
      (t) => String(t.nip || t.id_guru).trim() === String(s.id_guru).trim()
    );
    return found ? found.nama : s.id_guru || 'Guru Pengampu';
  };

  const getTeacherNip = (s) => {
    if (s.guru?.nip) return s.guru.nip;
    const found = teachers.find(
      (t) => String(t.nip || t.id_guru).trim() === String(s.id_guru).trim()
    );
    return found ? (found.nip || found.id_guru) : '-';
  };

  const getMapelName = (s) => {
    if (s.mata_pelajaran?.nama_mapel) return s.mata_pelajaran.nama_mapel;
    const found = subjects.find((m) => String(m.id_mapel) === String(s.id_mapel));
    return found ? found.nama_mapel : s.id_mapel || 'Mata Pelajaran';
  };

  const getWaliKelasName = (cls) => {
    if (!cls) return 'Belum Ditentukan';
    if (cls.guru?.nama) return cls.guru.nama;
    const found = teachers.find(
      (t) => String(t.nip || t.id_guru).trim() === String(cls.wali_kelas).trim()
    );
    return found ? found.nama : cls.wali_kelas || 'Belum Ditentukan';
  };

  const getWaliKelasNip = (cls) => {
    if (!cls) return '-';
    if (cls.guru?.nip) return cls.guru.nip;
    const found = teachers.find(
      (t) => String(t.nip || t.id_guru).trim() === String(cls.wali_kelas).trim()
    );
    return found ? (found.nip || found.id_guru) : cls.wali_kelas || '-';
  };

  // Helper filter & sort jadwal untuk kelas tertentu
  const getClassSchedules = (cls) => {
    if (!cls) return [];
    return schedules
      .filter((s) => String(s.id_kelas) === String(cls.id_kelas))
      .sort((a, b) => {
        const dayIndexA = daysOrder.indexOf(a.hari);
        const dayIndexB = daysOrder.indexOf(b.hari);
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });
  };

  // List kelas yang akan dicetak berdasarkan mode
  const targetClasses =
    printMode === 'all_classes'
      ? classes
      : activeClass
      ? [activeClass]
      : classes.slice(0, 1);

  const totalSessionsCount = targetClasses.reduce(
    (acc, cls) => acc + getClassSchedules(cls).length,
    0
  );

  // ===========================================================================
  // GENERATOR HTML LENGKAP & ANDAL UNTUK CETAK IFRAME, TAB BARU, & FILE HTML
  // ===========================================================================
  const generateClassSchedulePrintHtml = () => {
    const isLandscape = printPaperOrientation === 'landscape';
    const pageOrientation = isLandscape ? 'A4 landscape' : 'A4 portrait';

    const sheetsHtml = targetClasses
      .map((cls, classIndex) => {
        const clsSchedules = getClassSchedules(cls);
        const cName = cls.nama_kelas;
        const waliName = getWaliKelasName(cls);
        const waliNip = getWaliKelasNip(cls);
        const totSesi = clsSchedules.length;
        const totJp = totSesi * 2;

        // Tabel rincian jadwal
        const tableRows =
          clsSchedules.length === 0
            ? `<tr><td colspan="7" style="text-align: center; color: #64748b; font-style: italic; padding: 12px;">Belum ada jadwal KBM yang dikonfigurasi untuk kelas ini.</td></tr>`
            : clsSchedules
                .map(
                  (s, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="font-weight: 700;">${s.hari}</td>
                <td style="font-family: monospace; font-weight: 600;">${(s.jam_mulai || '').slice(0, 5)} - ${(s.jam_selesai || '').slice(0, 5)}</td>
                <td style="font-weight: 800; color: #0f172a;">${getMapelName(s)}</td>
                <td>
                  <div style="font-weight: 700;">${getTeacherName(s)}</div>
                  <div style="font-size: 8px; color: #64748b; font-family: monospace;">NIP: ${getTeacherNip(s)}</div>
                </td>
                <td style="text-align: center; font-family: monospace; color: #b91c1c; font-weight: 700;">
                  ${s.batas_waktu_terlambat ? s.batas_waktu_terlambat.slice(0, 5) : (s.jam_mulai || '').slice(0, 5) || '-'}
                </td>
                <td style="text-align: center; font-weight: 700;">2 JP</td>
              </tr>
            `
                )
                .join('');

        // Tanda tangan
        const signatureBlock = includeSignatures
          ? `
          <div class="signature-box" style="margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; page-break-inside: avoid;">
            <div style="text-align: center; position: relative;">
              <p style="margin: 0; color: #334155;">Mengetahui,</p>
              <p style="margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase;">${kepalaSekolahJabatan}</p>
              <div style="height: 60px; display: flex; align-items: center; justify-content: center; position: relative;">
                ${
                  schoolStempel
                    ? `<img src="${schoolStempel}" alt="Stempel" style="height: 55px; opacity: 0.85;" />`
                    : `<span style="font-size: 8.5px; color: #94a3b8; font-style: italic;">[Tanda Tangan & Stempel Resmi]</span>`
                }
              </div>
              <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase;">${kepalaSekolahNama}</p>
              <p style="margin: 2px 0 0 0; font-size: 8.5px; font-family: monospace; color: #334155;">NIP. ${kepalaSekolahNip}</p>
            </div>

            <div style="text-align: center;">
              <p style="margin: 0; color: #334155;">${cityName}, ${todayFormatted}</p>
              <p style="margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase;">Wali Kelas ${cName}</p>
              <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 8.5px; color: #94a3b8; font-style: italic;">[Tanda Tangan Wali Kelas]</span>
              </div>
              <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase;">${waliName}</p>
              <p style="margin: 2px 0 0 0; font-size: 8.5px; font-family: monospace; color: #334155;">NIP. ${waliNip}</p>
            </div>
          </div>
        `
          : '';

        const isLastSheet = classIndex === targetClasses.length - 1;

        return `
        <div class="class-sheet" style="${!isLastSheet ? 'page-break-after: always; break-after: page; margin-bottom: 24px;' : ''}">
          <!-- Kop Surat Resmi -->
          <div class="kop-header">
            <div class="kop-flex">
              ${
                schoolLogo
                  ? `<img src="${schoolLogo}" alt="Logo" class="kop-logo" />`
                  : `<div class="kop-logo-placeholder">SMP</div>`
              }
              <div class="kop-text">
                <p class="kop-dinas">${schoolDinas}</p>
                <h1 class="kop-sekolah">${schoolName}</h1>
                <p class="kop-info">${schoolAddress} • ${schoolCity} • NPSN: ${schoolNpsn} • Akreditasi: ${schoolAkreditasi}</p>
                <p class="kop-info">Sistem Informasi Akademik & Presensi Siswa • Kurikulum Merdeka</p>
              </div>
              <div style="width: 60px; text-align: center; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 4px;">
                <div style="font-size: 8px; font-weight: 800; color: #475569;">TINGKAT</div>
                <div style="font-size: 16px; font-weight: 900; color: #1e3a8a; line-height: 1;">${cls.tingkat || 7}</div>
              </div>
            </div>
            <div class="kop-divider"></div>
          </div>

          <!-- Judul Dokumen -->
          <div class="doc-title">
            <h2>JADWAL PELAJARAN KELAS ${cName.toUpperCase()}</h2>
            <p>TAHUN AJARAN ${tahunAjaran} — SEMESTER ${semesterAktif.toUpperCase()}</p>
          </div>

          <!-- Metadata Kelas -->
          <div class="meta-box">
            <div>
              <div><strong>Kelas:</strong> Kelas ${cName} (Tingkat ${cls.tingkat || 7})</div>
              <div><strong>Wali Kelas:</strong> ${waliName} (NIP. ${waliNip})</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Total Pertemuan:</strong> <strong>${totSesi} Sesi KBM</strong> (${totJp} JP / Minggu)</div>
              <div><strong>Status:</strong> Terjadwal Aktif • Waktu Cetak: ${todayFormatted}</div>
            </div>
          </div>

          <!-- Tabel Rincian KBM -->
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th style="width: 75px;">Hari</th>
                <th style="width: 105px;">Jam Pelajaran</th>
                <th>Mata Pelajaran</th>
                <th style="width: 180px;">Guru Pengampu</th>
                <th style="width: 75px; text-align: center;">Batas Masuk</th>
                <th style="width: 45px; text-align: center;">Beban</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Tanda Tangan -->
          ${signatureBlock}
        </div>
      `;
      })
      .join('');

    let docTitle = 'Jadwal_Pelajaran_Kelas';
    if (printMode === 'single_class') {
      docTitle = `Jadwal_Kelas_${(activeClass?.nama_kelas || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else {
      docTitle = `Jadwal_Massal_Seluruh_Kelas_${tahunAjaran.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

    @page {
      size: ${pageOrientation};
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
      font-size: ${isLandscape ? '9px' : '9.5px'};
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
      padding-bottom: 5px;
      margin-bottom: 8px;
      text-align: center;
      position: relative;
    }

    .kop-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .kop-logo {
      width: 55px;
      height: 55px;
      object-fit: contain;
    }

    .kop-logo-placeholder {
      width: 55px;
      height: 55px;
      border: 2px solid #1e3a8a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #1e3a8a;
      font-size: 14px;
    }

    .kop-text {
      flex: 1;
      text-align: center;
      padding: 0 10px;
    }

    .kop-dinas {
      font-size: 10px;
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
      margin: 1.5px 0;
    }

    .kop-divider {
      border-bottom: 1px solid #000;
      margin-top: 4px;
    }

    .doc-title {
      text-align: center;
      margin: 8px 0 10px 0;
    }

    .doc-title h2 {
      font-size: 12.5px;
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
      font-size: ${isLandscape ? '8.5px' : '9px'};
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
    ${sheetsHtml}
  </div>
</body>
</html>`;
  };

  // ===========================================================================
  // PILIHAN OPSI CETAK (4 OPSI METODE CETAK PERSIS SEPERTI LOG AKTIVITAS)
  // ===========================================================================

  // Opsi 1: Cetak Langsung (Printer Dialog via Iframe Terisolasi)
  const handlePrintDirect = () => {
    try {
      const html = generateClassSchedulePrintHtml();
      let iframe = document.getElementById('siak_class_schedule_print_iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'siak_class_schedule_print_iframe';
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
          toast.success('Dialog cetak dibuka. Pilih printer fisik atau Simpan sebagai PDF.');
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
    try {
      const html = generateClassSchedulePrintHtml();
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
    try {
      const html = generateClassSchedulePrintHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const nameTag =
        printMode === 'single_class'
          ? (activeClass?.nama_kelas || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_')
          : 'Semua_Kelas';
      a.href = url;
      a.download = `Dokumen_Cetak_Jadwal_${nameTag}_${dateStr}.html`;
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
    try {
      const wb = XLSX.utils.book_new();

      if (printMode === 'single_class' && activeClass) {
        const clsSchedules = getClassSchedules(activeClass);
        const cName = activeClass.nama_kelas;
        const waliName = getWaliKelasName(activeClass);
        const waliNip = getWaliKelasNip(activeClass);
        const totSesi = clsSchedules.length;
        const totJp = totSesi * 2;

        const rows = [
          [schoolDinas],
          [schoolName],
          [`Alamat: ${schoolAddress}, ${schoolCity} | NPSN: ${schoolNpsn}`],
          [],
          [`JADWAL PELAJARAN KELAS ${cName.toUpperCase()}`],
          [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semesterAktif}`],
          [],
          ['Kelas', ':', `Kelas ${cName} (Tingkat ${activeClass.tingkat || 7})`],
          ['Wali Kelas', ':', `${waliName} (${waliNip})`],
          ['Total Pertemuan', ':', `${totSesi} Sesi KBM (${totJp} JP / Minggu)`],
          [],
          ['No', 'Hari', 'Jam Pelajaran', 'Mata Pelajaran', 'Guru Pengajar', 'Batas Masuk', 'Beban'],
        ];

        clsSchedules.forEach((s, idx) => {
          rows.push([
            idx + 1,
            s.hari,
            `${s.jam_mulai || '-'} s.d. ${s.jam_selesai || '-'}`,
            getMapelName(s),
            getTeacherName(s),
            s.batas_waktu_terlambat || s.jam_mulai || '-',
            '2 JP',
          ]);
        });

        if (includeSignatures) {
          rows.push([]);
          rows.push(['', '', '', '', '', '', `${cityName}, ${todayFormatted}`]);
          rows.push(['Mengetahui,', '', '', '', '', '', `Wali Kelas ${cName},`]);
          rows.push([kepalaSekolahJabatan, '', '', '', '', '', '']);
          rows.push([]);
          rows.push([]);
          rows.push([kepalaSekolahNama, '', '', '', '', '', waliName]);
          rows.push([`NIP. ${kepalaSekolahNip}`, '', '', '', '', '', `NIP. ${waliNip}`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, `Jadwal_${cName}`.slice(0, 31));
        const fileName = `Jadwal_Kelas_${cName.replace(/[^a-zA-Z0-9]/g, '_')}_${tahunAjaran.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Jadwal Kelas ${cName} berhasil diunduh ke Excel!`);
      } else {
        // Mode Semua Kelas
        classes.forEach((cls) => {
          const clsSchedules = getClassSchedules(cls);
          const cName = cls.nama_kelas;
          const waliName = getWaliKelasName(cls);

          const rows = [
            [schoolDinas],
            [schoolName],
            [`JADWAL KBM KELAS ${cName.toUpperCase()} - TP ${tahunAjaran}`],
            [`Wali Kelas: ${waliName}`],
            [],
            ['No', 'Hari', 'Jam Pelajaran', 'Mata Pelajaran', 'Guru Pengajar', 'Batas Masuk', 'Beban'],
          ];

          clsSchedules.forEach((s, idx) => {
            rows.push([
              idx + 1,
              s.hari,
              `${s.jam_mulai || '-'} - ${s.jam_selesai || '-'}`,
              getMapelName(s),
              getTeacherName(s),
              s.batas_waktu_terlambat || s.jam_mulai || '-',
              '2 JP',
            ]);
          });

          const ws = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, cName.slice(0, 30));
        });

        const fileName = `Master_Jadwal_Seluruh_Kelas_${tahunAjaran.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Jadwal seluruh kelas (${classes.length} Kelas) berhasil diunduh ke Excel!`);
      }
    } catch (err) {
      console.error('Gagal export excel jadwal kelas:', err);
      toast.error('Gagal mengekspor data ke Excel.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
        {/* =================================================================== */}
        {/* MODAL HEADER (No Print)                                            */}
        {/* =================================================================== */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                  Dokumen Resmi KBM
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  TP {tahunAjaran} • Semester {semesterAktif}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Cetak Dokumen Jadwal Pelajaran Kelas
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Tutup dialog cetak"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* OPSI & PARAMETER BAR (No Print)                                    */}
        {/* =================================================================== */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Mode & Pilihan Kelas */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                1. Mode & Pilihan Kelas
              </label>
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintMode('single_class')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      printMode === 'single_class'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kelas Tunggal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('all_classes')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      printMode === 'all_classes'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({classes.length})
                  </button>
                </div>

                {printMode === 'single_class' && (
                  <select
                    value={activeClass?.id_kelas || ''}
                    onChange={(e) => {
                      const found = classes.find(
                        (c) => String(c.id_kelas) === String(e.target.value)
                      );
                      if (found) setActiveClass(found);
                    }}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id_kelas} value={c.id_kelas}>
                        Kelas {c.nama_kelas} (Tingkat {c.tingkat || 7})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Orientasi Kertas */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                2. Orientasi Kertas (A4)
              </label>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
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
              </div>
              <p className="text-[10px] text-slate-400">
                {printPaperOrientation === 'portrait'
                  ? 'Format standar tegak untuk dokumen map portofolio siswa.'
                  : 'Format mendatar luas untuk papan pengumuman kelas.'}
              </p>
            </div>

            {/* 3. Lembar Tanda Tangan */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                3. Pengesahan Dokumen
              </label>
              <label className="flex items-start gap-2 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 leading-snug">
                  Sertakan Tanda Tangan Kepala Sekolah, Stempel Resmi & Wali Kelas
                </span>
              </label>
            </div>
          </div>

          {/* ACTION BUTTONS (4 OPSI METODE CETAK SEPERTI LOG AKTIVITAS) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                Siap Cetak:{' '}
                <strong>
                  {printMode === 'single_class'
                    ? `Kelas ${activeClass?.nama_kelas || '-'} (${getClassSchedules(activeClass).length} Sesi)`
                    : `${classes.length} Kelas (${totalSessionsCount} Sesi)`}
                </strong>
              </span>
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
                title="Unduh jadwal pelajaran ke format spreadsheet Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Opsi 4: Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* LIVE DOCUMENT PREVIEW CANVAS (Screen Replica & Print Area)         */}
        {/* =================================================================== */}
        <div className="p-4 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 font-sans text-black bg-slate-200/50 flex justify-center">
          <div
            id="printClassScheduleArea"
            ref={printContentRef}
            className={`printable-area w-full bg-white shadow-xl rounded-2xl p-6 sm:p-8 print:p-0 print:shadow-none print:rounded-none print:w-full print:max-w-none text-black border border-slate-200/80 space-y-8 ${
              printPaperOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl'
            }`}
          >
            {targetClasses.map((cls, classIndex) => {
              const clsSchedules = getClassSchedules(cls);
              const cName = cls.nama_kelas;
              const waliName = getWaliKelasName(cls);
              const waliNip = getWaliKelasNip(cls);
              const totSesi = clsSchedules.length;
              const totJp = totSesi * 2;
              const isLastSheet = classIndex === targetClasses.length - 1;

              return (
                <div
                  key={cls.id_kelas}
                  className={`class-sheet ${!isLastSheet ? 'pb-8 border-b-2 border-dashed border-slate-300' : ''}`}
                >
                  {/* Kop Surat Resmi */}
                  <div className="border-b-[3px] border-black pb-3 mb-4 text-center relative">
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-16 h-16 flex items-center justify-center shrink-0">
                        {schoolLogo ? (
                          <img
                            src={schoolLogo}
                            alt="Logo Sekolah"
                            className="w-14 h-14 object-contain rounded-xl"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl border-2 border-indigo-900 flex items-center justify-center text-indigo-950 font-black text-sm">
                            SMP
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-center">
                        <h4 className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-black leading-tight">
                          {schoolDinas}
                        </h4>
                        <h1 className="text-base sm:text-lg font-black tracking-wide text-black uppercase mt-0.5">
                          {schoolName}
                        </h1>
                        <p className="text-[10px] text-gray-800 font-medium mt-0.5">
                          {schoolAddress} • {schoolCity} • NPSN: {schoolNpsn} • Akreditasi: {schoolAkreditasi}
                        </p>
                        <p className="text-[9px] text-gray-600 font-medium">
                          Website/Sistem SIAK Terpadu: siak.smpn2kotabangun.sch.id • Kurikulum Merdeka
                        </p>
                      </div>
                      <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center border border-gray-400 rounded-xl p-1 bg-gray-50 text-center">
                        <span className="text-[8px] font-bold text-gray-600 uppercase">Tingkat</span>
                        <span className="text-lg font-black text-indigo-950 leading-tight">
                          {cls.tingkat || 7}
                        </span>
                      </div>
                    </div>
                    {/* Double Border Line Kop */}
                    <div className="border-b border-black mt-2" />
                  </div>

                  {/* Title Section */}
                  <div className="text-center my-3">
                    <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline underline-offset-4 text-black">
                      JADWAL PELAJARAN KELAS {cName.toUpperCase()}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-700 mt-1 uppercase">
                      TAHUN AJARAN {tahunAjaran} — SEMESTER {semesterAktif.toUpperCase()}
                    </p>
                  </div>

                  {/* Metadata Box */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded-xl mb-3 text-[10px]">
                    <div>
                      <div className="flex gap-2">
                        <span className="font-bold text-gray-700 w-28">Kelas:</span>
                        <span className="font-bold text-black">Kelas {cName} (Tingkat {cls.tingkat || 7})</span>
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="font-bold text-gray-700 w-28">Wali Kelas:</span>
                        <span>{waliName} ({waliNip})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        <span className="font-bold text-gray-700">Total Jadwal: </span>
                        <strong>{totSesi} Sesi KBM ({totJp} JP / Minggu)</strong>
                      </div>
                      <div className="mt-0.5 text-gray-600 font-mono text-[9px]">
                        Waktu Cetak: {todayFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Matriks Mingguan KBM (Kartu 6 Hari) */}
                  <div className="mb-4">
                    <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-700" /> Ringkasan Mingguan KBM:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {daysOrder.map((dayName) => {
                        const dayScheds = clsSchedules.filter((s) => s.hari === dayName);
                        return (
                          <div
                            key={dayName}
                            className="p-2 rounded-xl border border-gray-300 bg-white shadow-2xs space-y-1 text-[9px]"
                          >
                            <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                              <span className="font-bold text-gray-900">{dayName}</span>
                              <span className="font-mono text-gray-600 bg-gray-100 px-1 rounded text-[8px]">
                                {dayScheds.length} Mapel
                              </span>
                            </div>
                            {dayScheds.length === 0 ? (
                              <p className="text-gray-400 italic text-[8.5px] py-1 text-center">
                                - Libur -
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {dayScheds.map((sch) => (
                                  <div
                                    key={sch.id_jadwal}
                                    className="p-1 rounded bg-gray-50 border border-gray-200 text-[8px] leading-tight"
                                  >
                                    <div className="font-bold text-gray-900 truncate">
                                      {getMapelName(sch)}
                                    </div>
                                    <div className="text-gray-600 font-mono">
                                      {(sch.jam_mulai || '').slice(0, 5)} - {(sch.jam_selesai || '').slice(0, 5)}
                                    </div>
                                    <div className="text-indigo-900 truncate font-semibold">
                                      {getTeacherName(sch)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Printable Table Rincian Pelajaran */}
                  <div className="overflow-x-auto print:overflow-visible pb-1">
                    <table className="w-full min-w-[650px] text-left text-[9px] sm:text-[9.5px] border-collapse border border-gray-400 mb-4">
                      <thead>
                        <tr className="bg-gray-100 text-black font-extrabold uppercase border-b border-gray-400">
                          <th className="p-1.5 border border-gray-400 w-7 text-center">No</th>
                          <th className="p-1.5 border border-gray-400 w-20">Hari</th>
                          <th className="p-1.5 border border-gray-400 w-28">Jam Pelajaran</th>
                          <th className="p-1.5 border border-gray-400">Mata Pelajaran</th>
                          <th className="p-1.5 border border-gray-400 w-44">Guru Pengampu</th>
                          <th className="p-1.5 border border-gray-400 w-20 text-center">Batas Masuk</th>
                          <th className="p-1.5 border border-gray-400 w-16 text-center">Beban</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clsSchedules.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-400 italic border border-gray-400">
                              Belum ada jadwal KBM yang dikonfigurasi untuk kelas ini.
                            </td>
                          </tr>
                        ) : (
                          clsSchedules.map((s, idx) => (
                            <tr
                              key={s.id_jadwal || idx}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                            >
                              <td className="p-1.5 border border-gray-400 text-center font-bold">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border border-gray-400 font-bold">{s.hari}</td>
                              <td className="p-1.5 border border-gray-400 font-mono text-[8.5px] font-semibold">
                                {(s.jam_mulai || '').slice(0, 5)} - {(s.jam_selesai || '').slice(0, 5)}
                              </td>
                              <td className="p-1.5 border border-gray-400 font-extrabold text-black">
                                {getMapelName(s)}
                              </td>
                              <td className="p-1.5 border border-gray-400">
                                <div className="font-bold text-black">{getTeacherName(s)}</div>
                                <div className="text-[8px] text-gray-600 font-mono">
                                  NIP: {getTeacherNip(s)}
                                </div>
                              </td>
                              <td className="p-1.5 border border-gray-400 text-center font-mono font-bold text-rose-700 text-[8.5px]">
                                {s.batas_waktu_terlambat
                                  ? s.batas_waktu_terlambat.slice(0, 5)
                                  : (s.jam_mulai || '').slice(0, 5) || '-'}
                              </td>
                              <td className="p-1.5 border border-gray-400 text-center font-bold text-gray-700">
                                2 JP
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Tanda Tangan Resmi Pengesahan Dokumen */}
                  {includeSignatures && (
                    <div className="grid grid-cols-2 gap-8 text-[10px] pt-3 mt-4 border-t border-dashed border-gray-300 page-break-inside-avoid">
                      <div className="text-center">
                        <p className="text-gray-700">Mengetahui,</p>
                        <p className="font-bold text-black uppercase">{kepalaSekolahJabatan}</p>
                        <div className="h-16 flex items-center justify-center">
                          {schoolStempel ? (
                            <img
                              src={schoolStempel}
                              alt="Stempel"
                              className="h-14 object-contain opacity-85"
                            />
                          ) : (
                            <span className="text-[9px] text-gray-300 italic">
                              [Stempel & Tanda Tangan]
                            </span>
                          )}
                        </div>
                        <p className="font-black text-black underline underline-offset-2 uppercase">
                          {kepalaSekolahNama}
                        </p>
                        <p className="text-[9px] text-gray-700 font-mono">
                          NIP. {kepalaSekolahNip}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-700">
                          {cityName}, {todayFormatted}
                        </p>
                        <p className="font-bold text-black uppercase">Wali Kelas {cName}</p>
                        <div className="h-16 flex items-center justify-center">
                          <span className="text-[9px] text-gray-300 italic">
                            [Tanda Tangan Wali Kelas]
                          </span>
                        </div>
                        <p className="font-black text-black underline underline-offset-2 uppercase">
                          {waliName}
                        </p>
                        <p className="text-[9px] text-gray-700 font-mono">NIP. {waliNip}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
