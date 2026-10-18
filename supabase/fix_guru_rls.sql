-- ==============================================================================
-- FIX RLS & KOLOM MAPEL UTAMA PADA TABEL GURU
-- Jalankan skrip ini di SQL Editor Supabase Anda agar penambahan data guru baru
-- dapat disimpan secara permanen ke Supabase tanpa terhalang RLS / kolom hilang.
-- ==============================================================================

-- 1. Tambahkan kolom mapel_utama pada tabel guru jika belum ada
ALTER TABLE public.guru ADD COLUMN IF NOT EXISTS mapel_utama TEXT;

-- 2. Pastikan RLS aktif
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policy lama yang membatasi hanya admin terverifikasi auth.uid()
DROP POLICY IF EXISTS "Authenticated users can view guru list" ON public.guru;
DROP POLICY IF EXISTS "Admin can manage guru" ON public.guru;
DROP POLICY IF EXISTS "Allow select guru" ON public.guru;
DROP POLICY IF EXISTS "Allow all guru" ON public.guru;

-- 4. Buat policy baca untuk semua pengguna (authenticated & anon)
CREATE POLICY "Allow select guru"
    ON public.guru FOR SELECT
    TO authenticated, anon
    USING (true);

-- 5. Buat policy kelola (INSERT, UPDATE, DELETE) untuk authenticated & anon
CREATE POLICY "Allow all guru"
    ON public.guru FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
