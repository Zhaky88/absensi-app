-- ==============================================================================
-- TAMBAH KOLOM JURUSAN / PEMINATAN PADA TABEL KELAS SUPABASE
-- Jalankan skrip ini di SQL Editor Supabase Anda:
-- Buka https://supabase.com/dashboard/project/zbpxkdilxewpbspqmgud/sql
-- Buat New Query -> Tempel seluruh skrip ini -> Klik "RUN"
-- ==============================================================================

-- 1. Tambah kolom jurusan pada tabel kelas jika belum ada
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS jurusan VARCHAR(20) DEFAULT 'IPA';

-- 2. Sinkronkan nilai jurusan kelas berdasarkan nama kelas
UPDATE public.kelas 
SET jurusan = CASE 
  WHEN nama_kelas ILIKE '%IPS%' THEN 'IPS' 
  ELSE 'IPA' 
END;
