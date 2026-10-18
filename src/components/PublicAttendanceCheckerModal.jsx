import React, { useState } from 'react';
import {
  Search,
  X,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Flame,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastModalContext';

export default function PublicAttendanceCheckerModal({ isOpen, onClose, initialNis = '' }) {
  const { toast } = useToast();
  const [nisInput, setNisInput] = useState(initialNis);
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  async function handleSearch(e) {
    if (e) e.preventDefault();
    const queryNis = (nisInput || '').trim();
    if (!queryNis) {
      toast.warning('Silakan masukkan NIS (Nomor Induk Siswa).');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setStudentData(null);
    setAttendanceLogs([]);

    try {
      // 1. Ambil data siswa berdasarkan NIS
      const { data: siswaArr, error: siswaErr } = await supabase
        .from('siswa')
        .select(`
          nis,
          nama,
          foto_wajah,
          streak_sekarang,
          streak_tertinggi,
          status_siswa,
          kelas(nama_kelas, tingkat, guru(nama)),
          orang_tua(nama_ayah, nama_ibu, no_whatsapp)
        `)
        .eq('nis', queryNis)
        .limit(1);

      if (siswaErr) throw siswaErr;

      if (!siswaArr || siswaArr.length === 0) {
        toast.error(`Siswa dengan NIS "${queryNis}" tidak ditemukan.`);
        return;
      }

      const st = siswaArr[0];
      setStudentData(st);

      // 2. Ambil riwayat presensi siswa 15 hari terakhir
      const { data: absensiArr, error: absensiErr } = await supabase
        .from('absensi_harian')
        .select(`
          id_absensi,
          tanggal,
          waktu,
          status,
          keterangan,
          metode,
          jadwal(jam_mulai, jam_selesai, mata_pelajaran(nama_mapel))
        `)
        .eq('nis', queryNis)
        .order('tanggal', { ascending: false })
        .limit(20);

      if (absensiErr) {
        console.warn('Gagal membaca absensi:', absensiErr.message);
      } else {
        setAttendanceLogs(absensiArr || []);
      }
    } catch (err) {
      toast.error(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Hitung ringkasan status kehadiran
  const stats = attendanceLogs.reduce(
    (acc, curr) => {
      const s = (curr.status || '').toUpperCase();
      if (s === 'H') acc.hadir++;
      else if (s === 'T') acc.terlambat++;
      else if (s === 'I') acc.izin++;
      else if (s === 'S') acc.sakit++;
      else if (s === 'A') acc.alpha++;
      return acc;
    },
    { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 }
  );

  const totalLogs = attendanceLogs.length;
  const attendanceRate = totalLogs > 0 ? Math.round(((stats.hadir + stats.terlambat) / totalLogs) * 100) : 100;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-base font-black">Cek Kehadiran Murid Mandiri</h2>
              <p className="text-xs text-blue-100">
                Layanan praktis bagi orang tua/wali murid untuk memantau presensi tanpa perlu login
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Input NIS */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/80">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={nisInput}
                onChange={(e) => setNisInput(e.target.value)}
                placeholder="Masukkan Nomor Induk Siswa (NIS), misal: 202409001"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Mencari...' : 'Cek Presensi'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Contoh NIS demo: <strong>202409001</strong>, <strong>202409002</strong></span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Data langsung dari sistem absensi sekolah
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Mengambil data presensi siswa...</p>
            </div>
          ) : studentData ? (
            <div className="space-y-4 animate-in fade-in">
              {/* Profile Card Siswa */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img
                  src={studentData.foto_wajah || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
                  alt={studentData.nama}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                />
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-base font-black text-slate-800">{studentData.nama}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                      NIS: {studentData.nis}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                      Kelas {studentData.kelas?.nama_kelas || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Wali Kelas: <strong>{studentData.kelas?.guru?.nama || 'Bpk. Ahmad Fauzi, S.Pd'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Wali Murid: {studentData.orang_tua?.nama_ayah || studentData.orang_tua?.nama_ibu || 'Orang Tua / Wali'} 
                    {studentData.orang_tua?.no_whatsapp ? ` (WA: ${studentData.orang_tua.no_whatsapp})` : ''}
                  </p>
                </div>
                {/* Streak Badge */}
                <div className="p-2.5 rounded-2xl bg-white border border-amber-200 text-center shadow-xs shrink-0 min-w-[100px]">
                  <div className="flex items-center justify-center gap-1 text-amber-500 font-black text-sm">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    <span>{studentData.streak_sekarang || 0} Hari</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">Streak Kehadiran</p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 block">Tingkat Hadir</span>
                  <span className="text-lg font-black text-emerald-600">{attendanceRate}%</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                  <span className="text-[10px] font-bold text-blue-700 block">Total Hadir (H)</span>
                  <span className="text-lg font-black text-blue-600">{stats.hadir} Sesi</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-700 block">Izin / Sakit (I/S)</span>
                  <span className="text-lg font-black text-amber-600">{stats.izin + stats.sakit} Hari</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                  <span className="text-[10px] font-bold text-rose-700 block">Alpha (A)</span>
                  <span className="text-lg font-black text-rose-600">{stats.alpha} Hari</span>
                </div>
              </div>

              {/* Riwayat Absensi Terakhir */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" /> Riwayat Kehadiran Terbaru
                  </h4>
                  <span className="text-[11px] text-slate-400">Menampilkan {attendanceLogs.length} catatan</span>
                </div>

                {attendanceLogs.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Belum ada riwayat presensi tercatat untuk NIS ini.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {attendanceLogs.map((log) => {
                      const stUpper = (log.status || '').toUpperCase();
                      const statusMap = {
                        H: { label: 'Hadir Tepat Waktu', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
                        T: { label: 'Terlambat', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
                        I: { label: 'Izin', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: AlertTriangle },
                        S: { label: 'Sakit', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: AlertTriangle },
                        A: { label: 'Tanpa Keterangan (Alpha)', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
                      };
                      const conf = statusMap[stUpper] || { label: log.status, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock };
                      const IconComp = conf.icon;

                      return (
                        <div key={log.id_absensi} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>{log.tanggal}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{log.waktu || '-'} WITA</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              <span>{log.jadwal?.mata_pelajaran?.nama_mapel || 'Presensi Harian Sekolah'}</span>
                              {log.keterangan && <span className="text-slate-400">({log.keterangan})</span>}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 shrink-0 ${conf.bg}`}>
                            <IconComp className="w-3 h-3" />
                            <span>{conf.label}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="py-12 text-center space-y-2">
              <User className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Siswa Tidak Ditemukan</p>
              <p className="text-[11px] text-slate-400">
                Pastikan NIS yang dimasukkan sudah sesuai dengan nomor induk yang terdaftar di sekolah.
              </p>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h4 className="text-xs font-bold text-slate-700">Silakan Masukkan NIS Siswa</h4>
                <p className="text-[11px] text-slate-400">
                  Ketik Nomor Induk Siswa (NIS) putra/putri Anda pada kolom pencarian di atas, lalu tekan tombol <strong>Cek Presensi</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">SMP Negeri 2 Kota Bangun — Akses Cek Mandiri Wali Murid</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
