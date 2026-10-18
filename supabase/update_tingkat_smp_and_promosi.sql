-- ==============================================================================
-- MIGRASI: Sinkronisasi Tingkat Kelas SMP (7, 8, 9) & Kolom Jurusan
-- ==============================================================================
-- Script ini aman dijalankan di Supabase SQL Editor.
-- 1. Menambahkan kolom 'jurusan' pada tabel kelas jika belum ada
-- 2. Menyesuaikan constraint CHECK tingkat hanya untuk SMP (7, 8, 9)
-- 3. Memastikan index id_kelas dan status_siswa optimal untuk proses Kenaikan Kelas

DO $$ 
BEGIN
    -- 1. Tambah kolom jurusan jika belum ada
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'kelas' 
          AND column_name = 'jurusan'
    ) THEN
        ALTER TABLE public.kelas ADD COLUMN jurusan VARCHAR(20) DEFAULT 'IPA';
        RAISE NOTICE 'Kolom jurusan berhasil ditambahkan ke tabel kelas.';
    END IF;

    -- 2. Update data lama jika ada tingkat di luar 7, 8, 9 sebelum memasang check constraint
    -- (Opsional/Pencegahan agar tidak error saat alter constraint)
    UPDATE public.kelas SET tingkat = 7 WHERE tingkat < 7;
    UPDATE public.kelas SET tingkat = 9 WHERE tingkat > 9;

    -- 3. Hapus constraint lama jika ada
    ALTER TABLE public.kelas DROP CONSTRAINT IF EXISTS kelas_tingkat_check;

    -- 4. Pasang constraint baru khusus SMP (tingkat 7, 8, 9)
    ALTER TABLE public.kelas ADD CONSTRAINT kelas_tingkat_check CHECK (tingkat IN (7, 8, 9));
    RAISE NOTICE 'Constraint kelas_tingkat_check (7, 8, 9) berhasil dipasang.';

END $$;

-- 5. Pastikan Index untuk mempercepat query siswa per kelas dan kenaikan kelas
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_status ON public.siswa (id_kelas, status_siswa);
CREATE INDEX IF NOT EXISTS idx_kelas_tingkat ON public.kelas (tingkat);

-- Verifikasi data kelas saat ini
SELECT id_kelas, nama_kelas, tingkat, jurusan, wali_kelas 
FROM public.kelas 
ORDER BY tingkat ASC, nama_kelas ASC;
