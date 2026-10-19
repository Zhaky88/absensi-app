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
  Award,
  Users,
  Grid,
  ExternalLink,
  FileDown,
  Layers,
  Sparkles,
  Shield,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastModalContext';

export default function TeacherScheduleReportModal({
  isOpen,
  onClose,
  teacher = null,
  teachers = [],
  schedules = [],
  classes = [],
  subjects = [],
  schoolSettings = {},
  initialMode = 'single', // 'single' | 'all_individual' | 'master_matrix'
}) {
  const { toast } = useToast();
  const printRef = useRef(null);

  // Parameter & Opsi Cetak
  const [printMode, setPrintMode] = useState(initialMode || 'single');
  const [activeTeacher, setActiveTeacher] = useState(
    teacher || (teachers.length > 0 ? teachers[0] : null)
  );
  const [printPaperOrientation, setPrintPaperOrientation] = useState(
    initialMode === 'master_matrix' ? 'landscape' : 'portrait'
  );
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Sinkronisasi saat modal dibuka atau prop berubah
  useEffect(() => {
    if (!isOpen) return;

    if (teacher) {
      setActiveTeacher(teacher);
      setPrintMode(initialMode || 'single');
      setPrintPaperOrientation(
        initialMode === 'master_matrix' ? 'landscape' : 'portrait'
      );
    } else {
      if (initialMode) {
        setPrintMode(initialMode);
        setPrintPaperOrientation(
          initialMode === 'master_matrix' ? 'landscape' : 'portrait'
        );
      }
      if (teachers && teachers.length > 0) {
        setActiveTeacher((prev) => prev || teachers[0]);
      }
    }
  }, [isOpen, teacher, teachers, initialMode]);

  // Sync orientation saat printMode berganti (auto defaults, user can still override)
  const handleModeChange = (newMode) => {
    setPrintMode(newMode);
    if (newMode === 'master_matrix') {
      setPrintPaperOrientation('landscape');
    } else {
      setPrintPaperOrientation('portrait');
    }
  };

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
  const cityName = schoolCity.split(',')[0] || 'Kota Bangun';
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Urutan hari standar KBM
  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Helper resolusi nama kelas & mapel
  const getKelasName = (s) => {
    if (s.kelas?.nama_kelas) return s.kelas.nama_kelas;
    const found = classes.find((c) => String(c.id_kelas) === String(s.id_kelas));
    return found ? found.nama_kelas : s.id_kelas || '-';
  };

  const getMapelName = (s) => {
    if (s.mata_pelajaran?.nama_mapel) return s.mata_pelajaran.nama_mapel;
    const found = subjects.find((m) => String(m.id_mapel) === String(s.id_mapel));
    return found ? found.nama_mapel : s.id_mapel || 'Mata Pelajaran';
  };

  // Helper filter & sort jadwal untuk guru tertentu
  const getTeacherSchedules = (t) => {
    if (!t) return [];
    const tNip = String(t.nip || t.id_guru || '').trim();
    const tNama = (t.nama || '').toLowerCase().trim();

    return schedules
      .filter((s) => {
        const sNip = String(s.id_guru || s.nip || s.guru?.nip || '').trim();
        const sNama = (s.guru?.nama || s.nama_guru || '').toLowerCase().trim();
        if (tNip && sNip && tNip === sNip) return true;
        if (tNama && sNama && tNama === sNama) return true;
        return false;
      })
      .sort((a, b) => {
        const dayIndexA = daysOrder.indexOf(a.hari);
        const dayIndexB = daysOrder.indexOf(b.hari);
        if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
        return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
      });
  };

  // Data guru yang memiliki jadwal aktif
  const effectiveTeacherList =
    teachers.length > 0 ? teachers : activeTeacher ? [activeTeacher] : [];
  const teachersWithSchedule = effectiveTeacherList.filter(
    (t) => getTeacherSchedules(t).length > 0
  );
  const displayTeachersList =
    teachersWithSchedule.length > 0 ? teachersWithSchedule : effectiveTeacherList;

  // Target guru untuk dicetak
  const targetTeachers =
    printMode === 'all_individual'
      ? displayTeachersList
      : activeTeacher
      ? [activeTeacher]
      : displayTeachersList.slice(0, 1);

  const totalSessionsCount = targetTeachers.reduce(
    (acc, t) => acc + getTeacherSchedules(t).length,
    0
  );

  // ===========================================================================
  // GENERATOR HTML LENGKAP & ANDAL UNTUK CETAK IFRAME, TAB BARU, & FILE HTML
  // ===========================================================================
  const generateTeacherSchedulePrintHtml = () => {
    const isLandscape = printPaperOrientation === 'landscape';
    const pageOrientation = isLandscape ? 'A4 landscape' : 'A4 portrait';

    let contentHtml = '';

    if (printMode === 'master_matrix') {
      // Format Master Matriks Kolektif Se-Sekolah
      const tableRows = displayTeachersList
        .map((t, idx) => {
          const tSchedules = getTeacherSchedules(t);
          const tMapels =
            Array.from(new Set(tSchedules.map(getMapelName))).join(', ') ||
            t.mata_pelajaran ||
            '-';
          const totSesi = tSchedules.length;
          const totJp = totSesi * 2;

          const getDaySlots = (dayName) => {
            const dayS = tSchedules.filter((s) => s.hari === dayName);
            if (dayS.length === 0)
              return `<span style="color: #94a3b8; text-align: center; display: block;">-</span>`;
            return dayS
              .map(
                (s) =>
                  `<div><strong>Kelas ${getKelasName(s)}</strong> <span style="font-family: monospace; font-size: 7.5px; color: #475569;">(${(s.jam_mulai || '').slice(0, 5)}-${(s.jam_selesai || '').slice(0, 5)})</span></div>`
              )
              .join('');
          };

          return `
          <tr>
            <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
            <td>
              <div style="font-weight: 800; color: #0f172a;">${t.nama}</div>
              <div style="font-size: 8px; font-family: monospace; color: #475569;">NIP. ${t.nip || '-'}</div>
            </td>
            <td style="font-size: 8.5px; color: #334155;">${tMapels}</td>
            <td style="text-align: center; font-weight: 800; color: #1e3a8a;">
              <div>${totJp} JP</div>
              <div style="font-size: 7.5px; color: #64748b; font-weight: normal;">(${totSesi} Sesi)</div>
            </td>
            <td style="font-size: 8px;">${getDaySlots('Senin')}</td>
            <td style="font-size: 8px;">${getDaySlots('Selasa')}</td>
            <td style="font-size: 8px;">${getDaySlots('Rabu')}</td>
            <td style="font-size: 8px;">${getDaySlots('Kamis')}</td>
            <td style="font-size: 8px;">${getDaySlots('Jumat')}</td>
            <td style="font-size: 8px;">${getDaySlots('Sabtu')}</td>
          </tr>
        `;
        })
        .join('');

      const signatureBlock = includeSignatures
        ? `
        <div class="signature-box" style="margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; page-break-inside: avoid;">
          <div style="text-align: center; position: relative;">
            <p style="margin: 0; color: #334155;">Mengetahui,</p>
            <p style="margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase;">${kepalaSekolahJabatan}</p>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${
                schoolStempel
                  ? `<img src="${schoolStempel}" alt="Stempel" style="height: 50px; opacity: 0.85;" />`
                  : `<span style="font-size: 8.5px; color: #94a3b8; font-style: italic;">[Tanda Tangan & Stempel Resmi]</span>`
              }
            </div>
            <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase;">${kepalaSekolahNama}</p>
            <p style="margin: 2px 0 0 0; font-size: 8.5px; font-family: monospace; color: #334155;">NIP. ${kepalaSekolahNip}</p>
          </div>

          <div style="text-align: center;">
            <p style="margin: 0; color: #334155;">${cityName}, ${todayFormatted}</p>
            <p style="margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase;">Wakil Kepala Urusan Kurikulum</p>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 8.5px; color: #94a3b8; font-style: italic;">[Tanda Tangan Tim Pengembang Kurikulum]</span>
            </div>
            <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase;">Tim Pengembang Kurikulum</p>
            <p style="margin: 2px 0 0 0; font-size: 8.5px; font-family: monospace; color: #334155;">SMP Negeri 2 Kota Bangun</p>
          </div>
        </div>
      `
        : '';

      contentHtml = `
        <div class="teacher-sheet">
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
                <p class="kop-info">Master Matriks Jadwal Pembelajaran & Beban Mengajar Guru Se-Sekolah</p>
              </div>
              <div style="width: 75px; text-align: center; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 4px;">
                <div style="font-size: 7.5px; font-weight: 800; color: #475569;">TOTAL GURU</div>
                <div style="font-size: 15px; font-weight: 900; color: #1e3a8a; line-height: 1;">${displayTeachersList.length}</div>
              </div>
            </div>
            <div class="kop-divider"></div>
          </div>

          <!-- Judul Dokumen -->
          <div class="doc-title">
            <h2>MASTER MATRIKS JADWAL PEMBELAJARAN & BEBAN MENGAJAR GURU</h2>
            <p>TAHUN AJARAN ${tahunAjaran} — SEMESTER ${semesterAktif.toUpperCase()} • DOKUMEN RESMI KURIKULUM</p>
          </div>

          <!-- Metadata Ringkas -->
          <div class="meta-box">
            <div>
              <strong>Total Guru Aktif:</strong> ${displayTeachersList.length} Orang • <strong>Total Sesi KBM:</strong> ${schedules.length} Sesi (${schedules.length * 2} JP/Minggu)
            </div>
            <div style="text-align: right;">
              <strong>Waktu Cetak:</strong> ${todayFormatted} • Format: Master Matriks A4 Landscape
            </div>
          </div>

          <!-- Tabel Master Matriks -->
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">No</th>
                <th style="width: 150px;">Nama Guru & NIP</th>
                <th style="width: 110px;">Mata Pelajaran</th>
                <th style="width: 55px; text-align: center;">Beban</th>
                <th>Senin</th>
                <th>Selasa</th>
                <th>Rabu</th>
                <th>Kamis</th>
                <th>Jumat</th>
                <th>Sabtu</th>
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
    } else {
      // Format Lembar Per Guru (Single atau Batch Semua Guru)
      contentHtml = targetTeachers
        .map((t, teacherIndex) => {
          const tSchedules = getTeacherSchedules(t);
          const tName = t?.nama || 'Guru Pengampu';
          const tNip = t?.nip || t?.id_guru || '-';
          const uniqueCls = Array.from(
            new Set(tSchedules.map(getKelasName).filter((v) => v && v !== '-'))
          );
          const uniqueMpl = Array.from(
            new Set(tSchedules.map(getMapelName).filter((v) => v && v !== '-'))
          );
          const totSesi = tSchedules.length;
          const totJp = totSesi * 2;

          const tableRows =
            tSchedules.length === 0
              ? `<tr><td colspan="7" style="text-align: center; color: #64748b; font-style: italic; padding: 12px;">Tidak ada jadwal KBM aktif untuk guru ini.</td></tr>`
              : tSchedules
                  .map(
                    (s, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                  <td style="font-weight: 700;">${s.hari}</td>
                  <td style="font-family: monospace; font-weight: 600;">${(s.jam_mulai || '').slice(0, 5)} - ${(s.jam_selesai || '').slice(0, 5)}</td>
                  <td style="text-align: center; font-weight: 800; color: #1e3a8a;">Kelas ${getKelasName(s)}</td>
                  <td style="font-weight: 700;">${getMapelName(s)}</td>
                  <td style="text-align: center; font-family: monospace; color: #b91c1c; font-weight: 700;">
                    ${s.batas_waktu_terlambat ? s.batas_waktu_terlambat.slice(0, 5) : (s.jam_mulai || '').slice(0, 5) || '-'}
                  </td>
                  <td style="text-align: center; font-weight: 700;">2 JP</td>
                </tr>
              `
                  )
                  .join('');

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
                <p style="margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase;">Guru Pengampu,</p>
                <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 8.5px; color: #94a3b8; font-style: italic;">[Tanda Tangan Guru Pengampu]</span>
                </div>
                <p style="margin: 0; font-weight: 900; text-decoration: underline; text-transform: uppercase;">${tName}</p>
                <p style="margin: 2px 0 0 0; font-size: 8.5px; font-family: monospace; color: #334155;">NIP. ${tNip}</p>
              </div>
            </div>
          `
            : '';

          const isLastSheet = teacherIndex === targetTeachers.length - 1;

          return `
          <div class="teacher-sheet" style="${!isLastSheet ? 'page-break-after: always; break-after: page; margin-bottom: 24px;' : ''}">
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
                  <div style="font-size: 7.5px; font-weight: 800; color: #475569;">BEBAN JP</div>
                  <div style="font-size: 15px; font-weight: 900; color: #1e3a8a; line-height: 1;">${totJp}</div>
                </div>
              </div>
              <div class="kop-divider"></div>
            </div>

            <!-- Judul Dokumen -->
            <div class="doc-title">
              <h2>JADWAL PEMBELAJARAN & BEBAN MENGAJAR TATAP MUKA</h2>
              <p>TAHUN AJARAN ${tahunAjaran} — SEMESTER ${semesterAktif.toUpperCase()}</p>
            </div>

            <!-- Metadata Guru -->
            <div class="meta-box">
              <div>
                <div><strong>Nama Guru:</strong> ${tName}</div>
                <div><strong>NIP / NUPTK:</strong> ${tNip}</div>
                <div><strong>Mata Pelajaran:</strong> ${uniqueMpl.join(', ') || t?.mata_pelajaran || 'Semua Mapel'}</div>
              </div>
              <div style="text-align: right;">
                <div><strong>Beban Mengajar:</strong> <strong>${totSesi} Sesi KBM (${totJp} JP / Minggu)</strong></div>
                <div><strong>Kelas Diampu:</strong> ${uniqueCls.length > 0 ? uniqueCls.map((c) => `Kelas ${c}`).join(', ') : 'Belum Terpetakan'}</div>
                <div><strong>Status:</strong> Terverifikasi Kurikulum • Cetak: ${todayFormatted}</div>
              </div>
            </div>

            <!-- Tabel Rincian KBM -->
            <table>
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th style="width: 75px;">Hari</th>
                  <th style="width: 105px;">Waktu KBM</th>
                  <th style="width: 85px; text-align: center;">Kelas</th>
                  <th>Mata Pelajaran</th>
                  <th style="width: 75px; text-align: center;">Toleransi</th>
                  <th style="width: 45px; text-align: center;">Beban</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 800;">
                  <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 8px;">Total Beban Tatap Muka:</td>
                  <td style="text-align: center; color: #1e3a8a;">${uniqueCls.length} Kelas</td>
                  <td>${uniqueMpl.length} Mata Pelajaran</td>
                  <td style="text-align: center;">-</td>
                  <td style="text-align: center; color: #1e3a8a;">${totJp} JP</td>
                </tr>
              </tfoot>
            </table>

            <!-- Tanda Tangan -->
            ${signatureBlock}
          </div>
        `;
        })
        .join('');
    }

    let docTitle = 'Jadwal_Mengajar_Guru';
    if (printMode === 'single') {
      docTitle = `Jadwal_Mengajar_${(activeTeacher?.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else if (printMode === 'all_individual') {
      docTitle = `Jadwal_Massal_Seluruh_Guru_${tahunAjaran.replace(/[^a-zA-Z0-9]/g, '-')}`;
    } else {
      docTitle = `Master_Matriks_Jadwal_Guru_${tahunAjaran.replace(/[^a-zA-Z0-9]/g, '-')}`;
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
      font-size: ${isLandscape ? '8.5px' : '9.5px'};
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
      font-size: ${isLandscape ? '8px' : '9px'};
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
    ${contentHtml}
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
      const html = generateTeacherSchedulePrintHtml();
      let iframe = document.getElementById('siak_teacher_schedule_print_iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'siak_teacher_schedule_print_iframe';
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
      const html = generateTeacherSchedulePrintHtml();
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
      const html = generateTeacherSchedulePrintHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const nameTag =
        printMode === 'single'
          ? (activeTeacher?.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_')
          : printMode === 'all_individual'
          ? 'Semua_Guru'
          : 'Master_Matriks';
      a.href = url;
      a.download = `Dokumen_Cetak_Jadwal_Guru_${nameTag}_${dateStr}.html`;
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
      if (printMode === 'single' && activeTeacher) {
        const singleSchedules = getTeacherSchedules(activeTeacher);
        const tName = activeTeacher?.nama || 'Guru Pengampu';
        const tNip = activeTeacher?.nip || '-';
        const uniqueCls = Array.from(new Set(singleSchedules.map(getKelasName)));
        const uniqueMpl = Array.from(new Set(singleSchedules.map(getMapelName)));
        const totSesi = singleSchedules.length;
        const totJp = totSesi * 2;

        const rows = [
          [schoolDinas],
          [schoolName],
          [`Alamat: ${schoolAddress}, ${schoolCity} | NPSN: ${schoolNpsn}`],
          [],
          ['JADWAL PEMBELAJARAN & BEBAN MENGAJAR TATAP MUKA GURU'],
          [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semesterAktif}`],
          [],
          ['Nama Guru', ':', tName],
          ['NIP / NUPTK', ':', tNip],
          ['Mata Pelajaran', ':', uniqueMpl.join(', ') || '-'],
          ['Beban Mengajar', ':', `${totSesi} Sesi Pertemuan (${totJp} JP / Minggu)`],
          ['Kelas Diampu', ':', uniqueCls.map((c) => `Kelas ${c}`).join(', ') || '-'],
          [],
          ['No', 'Hari', 'Jam Pelajaran', 'Kelas', 'Mata Pelajaran', 'Batas Toleransi', 'Beban'],
        ];

        singleSchedules.forEach((s, idx) => {
          rows.push([
            idx + 1,
            s.hari,
            `${s.jam_mulai || '-'} s.d. ${s.jam_selesai || '-'}`,
            `Kelas ${getKelasName(s)}`,
            getMapelName(s),
            s.batas_waktu_terlambat || s.jam_mulai || '-',
            '2 JP',
          ]);
        });

        if (includeSignatures) {
          rows.push([]);
          rows.push(['', '', '', '', '', '', `${cityName}, ${todayFormatted}`]);
          rows.push(['Mengetahui,', '', '', '', '', '', 'Guru Pengampu,']);
          rows.push([kepalaSekolahJabatan, '', '', '', '', '', '']);
          rows.push([]);
          rows.push([]);
          rows.push([kepalaSekolahNama, '', '', '', '', '', tName]);
          rows.push([`NIP. ${kepalaSekolahNip}`, '', '', '', '', '', `NIP. ${tNip}`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_Guru');
        const fileName = `Jadwal_${tName.replace(/[^a-zA-Z0-9]/g, '_')}_${tahunAjaran.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Jadwal ${tName} berhasil diunduh ke Excel!`);
      } else {
        // Mode Master Matriks / Semua Guru Kolektif
        const rows = [
          [schoolDinas],
          [schoolName],
          [`Alamat: ${schoolAddress}, ${schoolCity} | NPSN: ${schoolNpsn}`],
          [],
          ['MASTER MATRIKS JADWAL PEMBELAJARAN & BEBAN MENGAJAR GURU SE-SEKOLAH'],
          [`Tahun Ajaran: ${tahunAjaran} | Semester: ${semesterAktif} | Total Guru: ${displayTeachersList.length}`],
          [],
          [
            'No',
            'Nama Guru',
            'NIP',
            'Mata Pelajaran',
            'Total Sesi',
            'Total JP',
            'Senin',
            'Selasa',
            'Rabu',
            'Kamis',
            'Jumat',
            'Sabtu',
          ],
        ];

        displayTeachersList.forEach((t, idx) => {
          const tSchedules = getTeacherSchedules(t);
          const tMapels =
            Array.from(new Set(tSchedules.map(getMapelName))).join(', ') ||
            t.mata_pelajaran ||
            '-';
          const totSesi = tSchedules.length;
          const totJp = totSesi * 2;

          const getDaySlots = (dayName) => {
            const dayS = tSchedules.filter((s) => s.hari === dayName);
            if (dayS.length === 0) return '-';
            return dayS
              .map(
                (s) =>
                  `${getKelasName(s)} (${(s.jam_mulai || '').slice(0, 5)}-${(s.jam_selesai || '').slice(0, 5)})`
              )
              .join('; ');
          };

          rows.push([
            idx + 1,
            t.nama,
            t.nip || '-',
            tMapels,
            totSesi,
            totJp,
            getDaySlots('Senin'),
            getDaySlots('Selasa'),
            getDaySlots('Rabu'),
            getDaySlots('Kamis'),
            getDaySlots('Jumat'),
            getDaySlots('Sabtu'),
          ]);
        });

        if (includeSignatures) {
          rows.push([]);
          rows.push(['', '', '', '', '', '', '', '', '', `${cityName}, ${todayFormatted}`]);
          rows.push(['Mengetahui,', '', '', '', '', '', '', '', '', 'Wakil Kepala Urusan Kurikulum,']);
          rows.push([kepalaSekolahJabatan, '', '', '', '', '', '', '', '', '']);
          rows.push([]);
          rows.push([]);
          rows.push([kepalaSekolahNama, '', '', '', '', '', '', '', '', 'Tim Pengembang Kurikulum']);
          rows.push([`NIP. ${kepalaSekolahNip}`, '', '', '', '', '', '', '', '', '']);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
          { wch: 5 },
          { wch: 25 },
          { wch: 20 },
          { wch: 22 },
          { wch: 10 },
          { wch: 10 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Master_Jadwal_Guru');
        const fileName = `Master_Jadwal_Seluruh_Guru_${tahunAjaran.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Master Matriks Jadwal Guru berhasil diunduh ke Excel: ${fileName}!`);
      }
    } catch (err) {
      console.error('Gagal export excel:', err);
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
              <GraduationCap className="w-5 h-5 text-indigo-300" />
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
                Cetak Dokumen Jadwal Mengajar Guru
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
            {/* 1. Mode & Pilihan Guru */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                1. Mode & Pilihan Guru
              </label>
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleModeChange('single')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      printMode === 'single'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Guru Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('all_individual')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      printMode === 'all_individual'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Cetak massal seluruh guru (1 lembar per guru)"
                  >
                    Massal ({displayTeachersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('master_matrix')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      printMode === 'master_matrix'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Cetak tabel master matriks kolektif se-sekolah"
                  >
                    Matriks
                  </button>
                </div>

                {printMode === 'single' && teachers.length > 0 && (
                  <select
                    value={activeTeacher?.nip || ''}
                    onChange={(e) => {
                      const found = teachers.find(
                        (t) => (t.nip || t.id_guru) === e.target.value
                      );
                      if (found) setActiveTeacher(found);
                    }}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {teachers.map((t) => (
                      <option key={t.nip || t.id_guru} value={t.nip || t.id_guru}>
                        {t.nama} ({getTeacherSchedules(t).length} Sesi)
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
                  ? 'Format tegak standar untuk berkas guru perorangan.'
                  : 'Format mendatar ideal untuk master matriks kolektif se-sekolah.'}
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
                  Sertakan Tanda Tangan Kepala Sekolah, Stempel Resmi & Guru Pengampu
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
                  {printMode === 'single'
                    ? `${activeTeacher?.nama || 'Guru'} (${getTeacherSchedules(activeTeacher).length} Sesi)`
                    : printMode === 'all_individual'
                    ? `${displayTeachersList.length} Lembar Guru (${totalSessionsCount} Sesi)`
                    : `Master Matriks Se-Sekolah (${displayTeachersList.length} Guru)`}
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
                title="Unduh jadwal mengajar ke format spreadsheet Excel (.xlsx)"
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
            id="printTeacherScheduleArea"
            ref={printRef}
            className={`printable-area w-full bg-white shadow-xl rounded-2xl p-6 sm:p-8 print:p-0 print:shadow-none print:rounded-none print:w-full print:max-w-none text-black border border-slate-200/80 space-y-8 ${
              printPaperOrientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl'
            }`}
          >
            {printMode === 'master_matrix' ? (
              /* Master Matriks Document */
              <div className="teacher-sheet">
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
                        Master Matriks Jadwal Pembelajaran & Beban Mengajar Guru Se-Sekolah • Kurikulum Merdeka
                      </p>
                    </div>
                    <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center border border-gray-400 rounded-xl p-1 bg-gray-50 text-center">
                      <span className="text-[7.5px] font-bold text-gray-600 uppercase">Total Guru</span>
                      <span className="text-lg font-black text-indigo-950 leading-tight">
                        {displayTeachersList.length}
                      </span>
                    </div>
                  </div>
                  <div className="border-b border-black mt-2" />
                </div>

                {/* Judul Dokumen */}
                <div className="text-center my-3">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline underline-offset-4 text-black">
                    MASTER MATRIKS JADWAL PEMBELAJARAN & BEBAN MENGAJAR GURU
                  </h2>
                  <p className="text-[10px] font-bold text-gray-700 mt-1 uppercase">
                    TAHUN AJARAN {tahunAjaran} — SEMESTER {semesterAktif.toUpperCase()} • DOKUMEN RESMI KURIKULUM
                  </p>
                </div>

                {/* Metadata Box */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded-xl mb-3 text-[10px]">
                  <div>
                    <span className="font-bold text-gray-700">Total Guru Aktif: </span>
                    <strong className="text-black">{displayTeachersList.length} Orang</strong>
                    {' • '}
                    <span>Total Sesi: <strong>{schedules.length} Sesi ({schedules.length * 2} JP/Minggu)</strong></span>
                  </div>
                  <div className="text-right text-gray-600 font-mono text-[9px]">
                    Format: Master Matriks A4 Landscape • Waktu Cetak: {todayFormatted}
                  </div>
                </div>

                {/* Tabel Master Matriks */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-[8.5px] border-collapse border border-gray-400 mb-4">
                    <thead>
                      <tr className="bg-gray-100 text-black font-extrabold uppercase border-b border-gray-400">
                        <th className="p-1 border border-gray-400 w-6 text-center">No</th>
                        <th className="p-1 border border-gray-400 w-36">Nama Guru & NIP</th>
                        <th className="p-1 border border-gray-400 w-28">Mata Pelajaran</th>
                        <th className="p-1 border border-gray-400 w-14 text-center">Beban</th>
                        <th className="p-1 border border-gray-400">Senin</th>
                        <th className="p-1 border border-gray-400">Selasa</th>
                        <th className="p-1 border border-gray-400">Rabu</th>
                        <th className="p-1 border border-gray-400">Kamis</th>
                        <th className="p-1 border border-gray-400">Jumat</th>
                        <th className="p-1 border border-gray-400">Sabtu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTeachersList.map((t, idx) => {
                        const tSchedules = getTeacherSchedules(t);
                        const tMapels =
                          Array.from(new Set(tSchedules.map(getMapelName))).join(', ') ||
                          t.mata_pelajaran ||
                          '-';
                        const totSesi = tSchedules.length;
                        const totJp = totSesi * 2;

                        const renderDaySlots = (dayName) => {
                          const dayS = tSchedules.filter((s) => s.hari === dayName);
                          if (dayS.length === 0)
                            return <span className="text-gray-300 text-center block">-</span>;
                          return (
                            <div className="space-y-0.5">
                              {dayS.map((s, i) => (
                                <div key={i} className="leading-tight">
                                  <span className="font-bold text-indigo-900">Kelas {getKelasName(s)}</span>{' '}
                                  <span className="font-mono text-gray-500 text-[7.5px]">
                                    ({(s.jam_mulai || '').slice(0, 5)}-{(s.jam_selesai || '').slice(0, 5)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        };

                        return (
                          <tr key={t.nip || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="p-1 border border-gray-400 text-center font-mono">{idx + 1}</td>
                            <td className="p-1 border border-gray-400">
                              <div className="font-bold text-black leading-tight">{t.nama}</div>
                              <div className="font-mono text-gray-600 text-[7.5px]">NIP. {t.nip || '-'}</div>
                            </td>
                            <td className="p-1 border border-gray-400 text-gray-800 leading-tight">{tMapels}</td>
                            <td className="p-1 border border-gray-400 text-center font-bold text-indigo-950">
                              <div>{totJp} JP</div>
                              <div className="text-[7.5px] text-gray-500 font-normal">({totSesi} Sesi)</div>
                            </td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Senin')}</td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Selasa')}</td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Rabu')}</td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Kamis')}</td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Jumat')}</td>
                            <td className="p-1 border border-gray-400">{renderDaySlots('Sabtu')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan Master Matriks */}
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
                      <p className="text-[9px] text-gray-700 font-mono">NIP. {kepalaSekolahNip}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-gray-700">
                        {cityName}, {todayFormatted}
                      </p>
                      <p className="font-bold text-black uppercase">Wakil Kepala Urusan Kurikulum</p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[9px] text-gray-300 italic">
                          [Tanda Tangan Tim Kurikulum]
                        </span>
                      </div>
                      <p className="font-black text-black underline underline-offset-2 uppercase">
                        Tim Pengembang Kurikulum
                      </p>
                      <p className="text-[9px] text-gray-700 font-mono">SMP Negeri 2 Kota Bangun</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Lembar Jadwal Guru (Single atau Batch Semua Guru) */
              targetTeachers.map((t, teacherIndex) => {
                const tSchedules = getTeacherSchedules(t);
                const tName = t?.nama || 'Guru Pengampu';
                const tNip = t?.nip || t?.id_guru || '-';
                const uniqueCls = Array.from(
                  new Set(tSchedules.map(getKelasName).filter((v) => v && v !== '-'))
                );
                const uniqueMpl = Array.from(
                  new Set(tSchedules.map(getMapelName).filter((v) => v && v !== '-'))
                );
                const totSesi = tSchedules.length;
                const totJp = totSesi * 2;
                const isLastSheet = teacherIndex === targetTeachers.length - 1;

                return (
                  <div
                    key={t?.nip || t?.id_guru || teacherIndex}
                    className={`teacher-sheet ${!isLastSheet ? 'pb-8 border-b-2 border-dashed border-slate-300' : ''}`}
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
                            Sistem Informasi Akademik & Presensi Siswa • Kurikulum Merdeka
                          </p>
                        </div>
                        <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center border border-gray-400 rounded-xl p-1 bg-gray-50 text-center">
                          <span className="text-[7.5px] font-bold text-gray-600 uppercase">Beban JP</span>
                          <span className="text-lg font-black text-indigo-950 leading-tight">
                            {totJp}
                          </span>
                        </div>
                      </div>
                      <div className="border-b border-black mt-2" />
                    </div>

                    {/* Judul Dokumen */}
                    <div className="text-center my-3">
                      <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline underline-offset-4 text-black">
                        JADWAL PEMBELAJARAN & BEBAN MENGAJAR TATAP MUKA
                      </h2>
                      <p className="text-[10px] font-bold text-gray-700 mt-1 uppercase">
                        TAHUN AJARAN {tahunAjaran} — SEMESTER {semesterAktif.toUpperCase()}
                      </p>
                    </div>

                    {/* Metadata Guru */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 border border-gray-300 rounded-xl mb-3 text-[10px]">
                      <div>
                        <div className="flex gap-2">
                          <span className="font-bold text-gray-700 w-28">Nama Guru:</span>
                          <strong className="text-black">{tName}</strong>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="font-bold text-gray-700 w-28">NIP / NUPTK:</span>
                          <span className="font-mono">{tNip}</span>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="font-bold text-gray-700 w-28">Mata Pelajaran:</span>
                          <span className="font-semibold text-indigo-900">
                            {uniqueMpl.join(', ') || t?.mata_pelajaran || 'Semua Mapel'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div>
                          <span className="font-bold text-gray-700">Total Beban Mengajar: </span>
                          <strong className="text-black">{totSesi} Sesi KBM ({totJp} JP / Minggu)</strong>
                        </div>
                        <div className="mt-0.5">
                          <span className="font-bold text-gray-700">Kelas Diampu: </span>
                          <span>
                            {uniqueCls.length > 0 ? uniqueCls.map((c) => `Kelas ${c}`).join(', ') : 'Belum Terpetakan'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-gray-600 font-mono text-[9px]">
                          Waktu Cetak: {todayFormatted}
                        </div>
                      </div>
                    </div>

                    {/* Printable Table Rincian Pelajaran */}
                    <div className="overflow-x-auto print:overflow-visible pb-1">
                      <table className="w-full min-w-[650px] text-left text-[9px] sm:text-[9.5px] border-collapse border border-gray-400 mb-4">
                        <thead>
                          <tr className="bg-gray-100 text-black font-extrabold uppercase border-b border-gray-400">
                            <th className="p-1.5 border border-gray-400 w-7 text-center">No</th>
                            <th className="p-1.5 border border-gray-400 w-20">Hari</th>
                            <th className="p-1.5 border border-gray-400 w-28">Waktu KBM</th>
                            <th className="p-1.5 border border-gray-400 w-24 text-center">Kelas</th>
                            <th className="p-1.5 border border-gray-400">Mata Pelajaran</th>
                            <th className="p-1.5 border border-gray-400 w-20 text-center">Toleransi</th>
                            <th className="p-1.5 border border-gray-400 w-16 text-center">Beban</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tSchedules.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-gray-400 italic border border-gray-400">
                                Tidak ada jadwal KBM aktif untuk guru ini.
                              </td>
                            </tr>
                          ) : (
                            tSchedules.map((s, idx) => (
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
                                <td className="p-1.5 border border-gray-400 text-center font-bold text-indigo-900">
                                  Kelas {getKelasName(s)}
                                </td>
                                <td className="p-1.5 border border-gray-400 font-extrabold text-black">
                                  {getMapelName(s)}
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
                        <tfoot>
                          <tr className="bg-gray-100 text-black font-extrabold border-t border-gray-400 text-[9px]">
                            <td colSpan={3} className="p-1.5 text-right uppercase border border-gray-400">
                              Total Beban Tatap Muka:
                            </td>
                            <td className="p-1.5 text-center text-indigo-900 border border-gray-400">
                              {uniqueCls.length} Kelas
                            </td>
                            <td className="p-1.5 border border-gray-400">
                              {uniqueMpl.length} Mata Pelajaran
                            </td>
                            <td className="p-1.5 text-center border border-gray-400">-</td>
                            <td className="p-1.5 text-center text-indigo-900 font-black border border-gray-400">
                              {totJp} JP / Mgg
                            </td>
                          </tr>
                        </tfoot>
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
                          <p className="font-bold text-black uppercase">Guru Pengampu,</p>
                          <div className="h-16 flex items-center justify-center">
                            <span className="text-[9px] text-gray-300 italic">
                              [Tanda Tangan Guru Pengampu]
                            </span>
                          </div>
                          <p className="font-black text-black underline underline-offset-2 uppercase">
                            {tName}
                          </p>
                          <p className="text-[9px] text-gray-700 font-mono">NIP. {tNip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
