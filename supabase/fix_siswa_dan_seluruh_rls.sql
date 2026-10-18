-- ==============================================================================
-- FIX RLS & POLICIES LENGKAP UNTUK SISWA, ORANG TUA, KELAS, ABSENSI & SEMUA TABEL
-- Jalankan skrip ini di SQL Editor Supabase Anda:
-- Buka https://supabase.com/dashboard/project/zbpxkdilxewpbspqmgud/sql
-- Buat New Query -> Tempel seluruh skrip ini -> Klik "RUN"
-- ==============================================================================

-- 1. FIX TABEL SISWA
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active student list" ON public.siswa;
DROP POLICY IF EXISTS "Admin and Guru can manage siswa" ON public.siswa;
DROP POLICY IF EXISTS "Allow all siswa" ON public.siswa;
DROP POLICY IF EXISTS "Allow select siswa" ON public.siswa;

CREATE POLICY "Allow select siswa"
    ON public.siswa FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all siswa"
    ON public.siswa FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 2. FIX TABEL ORANG TUA
ALTER TABLE public.orang_tua ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all orang_tua" ON public.orang_tua;
DROP POLICY IF EXISTS "Allow select orang_tua" ON public.orang_tua;

CREATE POLICY "Allow select orang_tua"
    ON public.orang_tua FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all orang_tua"
    ON public.orang_tua FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. FIX TABEL KELAS
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS jurusan VARCHAR(20) DEFAULT 'IPA';
DROP POLICY IF EXISTS "Authenticated users can view kelas" ON public.kelas;
DROP POLICY IF EXISTS "Admin can manage kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow all kelas" ON public.kelas;
DROP POLICY IF EXISTS "Allow select kelas" ON public.kelas;

CREATE POLICY "Allow select kelas"
    ON public.kelas FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all kelas"
    ON public.kelas FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 4. FIX TABEL ABSENSI
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student read own attendance, parents read children, staff read all" ON public.absensi;
DROP POLICY IF EXISTS "Student or teacher insert attendance" ON public.absensi;
DROP POLICY IF EXISTS "Teachers and admin update or delete attendance" ON public.absensi;
DROP POLICY IF EXISTS "Allow all absensi" ON public.absensi;
DROP POLICY IF EXISTS "Allow select absensi" ON public.absensi;

CREATE POLICY "Allow select absensi"
    ON public.absensi FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all absensi"
    ON public.absensi FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 5. FIX TABEL PENGATURAN SISTEM
ALTER TABLE public.pengaturan_sistem ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.pengaturan_sistem;
DROP POLICY IF EXISTS "Only admin can modify system settings" ON public.pengaturan_sistem;
DROP POLICY IF EXISTS "Allow all pengaturan_sistem" ON public.pengaturan_sistem;
DROP POLICY IF EXISTS "Allow select pengaturan_sistem" ON public.pengaturan_sistem;

CREATE POLICY "Allow select pengaturan_sistem"
    ON public.pengaturan_sistem FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all pengaturan_sistem"
    ON public.pengaturan_sistem FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 6. FIX TABEL ANTREAN WHATSAPP
ALTER TABLE public.antrean_whatsapp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can monitor whatsapp queue" ON public.antrean_whatsapp;
DROP POLICY IF EXISTS "Allow all antrean_whatsapp" ON public.antrean_whatsapp;
DROP POLICY IF EXISTS "Allow select antrean_whatsapp" ON public.antrean_whatsapp;

CREATE POLICY "Allow select antrean_whatsapp"
    ON public.antrean_whatsapp FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all antrean_whatsapp"
    ON public.antrean_whatsapp FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 7. FIX TABEL USERS METADATA
ALTER TABLE public.users_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own metadata or admin full access" ON public.users_metadata;
DROP POLICY IF EXISTS "Admin has full access on users_metadata" ON public.users_metadata;
DROP POLICY IF EXISTS "Allow all users_metadata" ON public.users_metadata;
DROP POLICY IF EXISTS "Allow select users_metadata" ON public.users_metadata;

CREATE POLICY "Allow select users_metadata"
    ON public.users_metadata FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow all users_metadata"
    ON public.users_metadata FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 8. SEED DATA KELAS SMP (TINGKAT 7, 8, 9 DENGAN WALI KELAS NULL)
INSERT INTO public.kelas (id_kelas, nama_kelas, tingkat, wali_kelas)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'VII-A', 7, NULL),
  ('c0000000-0000-0000-0000-000000000002', 'VIII-A', 8, NULL),
  ('c0000000-0000-0000-0000-000000000003', 'IX-A', 9, NULL)
ON CONFLICT (id_kelas) DO UPDATE SET
  nama_kelas = EXCLUDED.nama_kelas,
  tingkat = EXCLUDED.tingkat;
