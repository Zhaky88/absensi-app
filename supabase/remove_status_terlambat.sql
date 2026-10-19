-- ==============================================================================
-- MIGRATION: HAPUS TOTAL STATUS TERLAMBAT (T) DARI DATABASE & SISTEM SIAK
-- Hanya menyisakan 4 status resmi presensi: 'H' (Hadir), 'S' (Sakit), 'I' (Izin), 'A' (Alpa)
-- ==============================================================================

-- 1. Konversi seluruh data riwayat absensi yang masih berstatus 'T' menjadi 'H' (Hadir)
UPDATE public.absensi
SET status = 'H', 
    keterangan = CASE 
      WHEN keterangan IS NULL OR keterangan = '' THEN 'Hadir'
      ELSE keterangan 
    END
WHERE status::text = 'T';

-- 2. Hapus pengaturan template WA keterlambatan dari tabel pengaturan sistem
DELETE FROM public.pengaturan_sistem 
WHERE kunci = 'wa_template_terlambat';

-- 3. Hapus constraint lama jika ada
ALTER TABLE public.absensi DROP CONSTRAINT IF EXISTS absensi_status_check;
ALTER TABLE public.absensi DROP CONSTRAINT IF EXISTS check_status_valid;

-- 4. Normalisasi tipe data kolom status ke VARCHAR(10) jika sebelumnya ENUM
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'absensi' 
      AND column_name = 'status' 
      AND udt_name = 'status_absen_enum'
  ) THEN
    ALTER TABLE public.absensi ALTER COLUMN status TYPE VARCHAR(10) USING status::text;
  END IF;
END $$;

-- 5. Tambahkan Check Constraint resmi hanya 4 status: ('H', 'S', 'I', 'A')
ALTER TABLE public.absensi 
ADD CONSTRAINT absensi_status_check 
CHECK (status IN ('H', 'S', 'I', 'A'));

-- 6. Verifikasi hasil migrasi
SELECT status, count(*) AS total_data 
FROM public.absensi 
GROUP BY status;
