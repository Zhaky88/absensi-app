-- ==============================================================================
-- FIX DAN OPTIMASI REKAPITULASI PRESENSI & KETERANGAN (SIAK ANTI-CHEAT V4.0)
-- 1. Membersihkan teks redundan 'Hadir scan mandiri' dari kolom keterangan
-- 2. Memastikan sesi yang belum diabsen tidak terisi keterangan Hadir otomatis
-- 3. Keterangan hanya digunakan untuk catatan/alasan riil (Izin, Sakit, atau Catatan Khusus)
-- ==============================================================================

-- 1. Bersihkan keterangan pada siswa yang Hadir normal (harus NULL/kosong)
UPDATE public.absensi
SET keterangan = NULL
WHERE status = 'H' AND (
    keterangan ILIKE '%Hadir scan mandiri%' OR
    keterangan ILIKE '%Hadir KBM Sesi%' OR
    keterangan = 'Hadir'
);

-- 2. Hapus catatan absensi yang tercatat pada sesi masa depan yang belum terlaksana
-- agar sesi tersebut kembali berstatus "Belum Diabsen" secara logis
DELETE FROM public.absensi
WHERE tanggal = CURRENT_DATE AND waktu >= '10:00:00' AND metode = 'murid_scan' AND keterangan IS NULL;

-- 3. Pastikan index untuk performa kueri per jadwal KBM dan tanggal
CREATE INDEX IF NOT EXISTS idx_absensi_nis_id_jadwal_tanggal ON public.absensi(nis, id_jadwal, tanggal);
