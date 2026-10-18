import React, { useRef } from 'react';
import { X, Printer, Download, Award, CheckCircle } from 'lucide-react';

export default function SchoolCertificateModal({
  isOpen,
  onClose,
  student,
  summary,
  settings = {},
}) {
  const certificateRef = useRef(null);

  if (!isOpen || !student) return null;

  const sekolahNama = settings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN';
  const kepalaNama = settings.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd';
  const kepalaNip = settings.kepala_sekolah_nip || '197003121995121001';
  const tahunAjaran = settings.tahun_ajaran_aktif || '2026/2027';
  const semester = settings.semester_aktif || 'Ganjil';

  const dateNow = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const certNumber = `421.3/${student.nis || '001'}/SMPN2-KB/${new Date().getFullYear()}`;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-300 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:rounded-none">
        {/* Modal Controls (Hidden Saat Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm">
              Piagam Penghargaan Resmi Kedisiplinan Siswa
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Piagam (Print / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAMPILAN PIAGAM RESMI / SERTIFIKAT                        */}
        {/* ========================================================= */}
        <div
          ref={certificateRef}
          className="p-8 sm:p-12 bg-[#fffdfa] text-slate-800 relative border-8 border-double border-amber-600/40 m-2 sm:m-4 rounded-2xl shadow-inner print:m-0 print:border-8 print:border-amber-700"
        >
          {/* Watermark / Ornamen Sudut */}
          <div className="text-center space-y-4 relative z-10">
            {/* Header Instansi */}
            <div className="border-b-2 border-slate-800 pb-3">
              <h4 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-600">
                PEMERINTAH KABUPATEN KUTAI KARTANEGARA
              </h4>
              <h4 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-600">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h4>
              <h2 className="text-lg sm:text-2xl font-black tracking-wider uppercase text-slate-900 font-serif mt-0.5">
                {sekolahNama}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-sans">
                NPSN: 30400582 • Sistem Informasi Akademik & Presensi Terpadu (SIAK)
              </p>
            </div>

            {/* Judul Piagam */}
            <div className="py-2 space-y-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Nomor: {certNumber}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-amber-700 font-serif tracking-widest drop-shadow-xs">
                PIAGAM PENGHARGAAN
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-serif italic">
                Diberikan sebagai bentuk apresiasi atas dedikasi dan kedisiplinan kehadiran terbaik kepada:
              </p>
            </div>

            {/* Nama Siswa */}
            <div className="py-2">
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 font-serif underline decoration-amber-500 underline-offset-8">
                {student.nama}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-600 mt-2">
                NIS: <span className="font-mono">{student.nis}</span> • Kelas: {student.kelas?.nama_kelas || student.id_kelas}
              </p>
            </div>

            {/* Deskripsi Prestasi */}
            <p className="text-xs sm:text-sm text-slate-700 max-w-xl mx-auto leading-relaxed font-serif">
              Telah menunjukkan ketertiban, komitmen waktu, dan konsistensi kehadiran beruntun
              mencapai <strong>{student.streak_sekarang || 14} Hari Masuk Sekolah Tanpa Alpa</strong> (Level {summary?.level || 1} • {summary?.totalXp || 0} XP)
              pada Tahun Ajaran <strong>{tahunAjaran} Semester {semester}</strong>.
            </p>

            {/* Tanda Tangan & Stempel */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs sm:text-sm font-serif">
              <div>
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-800">Wali Kelas</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">
                  {student.kelas?.guru?.nama || 'Wali Kelas Terkait, S.Pd'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. Guru Pembina</p>
              </div>

              <div className="relative">
                <p className="text-slate-500">Kota Bangun, {dateNow}</p>
                <p className="font-bold text-slate-800">Kepala Sekolah,</p>
                <div className="h-16" />
                <p className="font-bold underline text-slate-900">{kepalaNama}</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. {kepalaNip}</p>

                {/* Cap Stempel Digital */}
                <div className="absolute top-6 right-6 w-20 h-20 rounded-full border-2 border-red-500/70 text-red-600 flex items-center justify-center text-[9px] font-black uppercase text-center rotate-[-12deg] pointer-events-none select-none opacity-85">
                  TERVERIFIKASI
                  <br />
                  SIAK RESMI
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Piagam ini dihasilkan secara otomatis dari data rekor kehadiran SIAK.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
