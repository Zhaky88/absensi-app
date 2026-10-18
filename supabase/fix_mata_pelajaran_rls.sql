-- ==============================================================================
-- FIX RLS & TABEL UNTUK MATA PELAJARAN, JADWAL, & KALENDER AKADEMIK
-- Jalankan query ini di SQL Editor Supabase Anda jika mengalami error RLS saat tambah mapel
-- ==============================================================================

-- 1. Pastikan tabel mata_pelajaran ada
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id_mapel UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_mapel VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;

-- Policy mata_pelajaran: Baca untuk semua pengguna terotentikasi & anon
DROP POLICY IF EXISTS "Authenticated users can view mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Authenticated users can view mata_pelajaran"
    ON public.mata_pelajaran FOR SELECT
    TO authenticated, anon
    USING (true);

-- Policy mata_pelajaran: Admin & Guru bisa menambah, mengubah, dan menghapus mapel
DROP POLICY IF EXISTS "Admin and Guru can manage mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Admin and Guru can manage mata_pelajaran"
    ON public.mata_pelajaran FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 2. Pastikan tabel jadwal ada dan memiliki policy
CREATE TABLE IF NOT EXISTS public.jadwal (
    id_jadwal UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_kelas UUID NOT NULL REFERENCES public.kelas(id_kelas) ON DELETE CASCADE,
    id_mapel UUID NOT NULL REFERENCES public.mata_pelajaran(id_mapel) ON DELETE CASCADE,
    id_guru VARCHAR(30) NOT NULL REFERENCES public.guru(nip) ON DELETE CASCADE,
    hari VARCHAR(20) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    batas_terlambat TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.jadwal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view jadwal" ON public.jadwal;
CREATE POLICY "Authenticated users can view jadwal"
    ON public.jadwal FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Admin and Guru can manage jadwal" ON public.jadwal;
CREATE POLICY "Admin and Guru can manage jadwal"
    ON public.jadwal FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. Tabel kalender_akademik untuk hari libur & kegiatan
CREATE TABLE IF NOT EXISTS public.kalender_akademik (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL,
    status_hari VARCHAR(50) NOT NULL DEFAULT 'libur_nasional',
    keterangan TEXT,
    is_libur BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.kalender_akademik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view kalender_akademik" ON public.kalender_akademik;
CREATE POLICY "Anyone can view kalender_akademik"
    ON public.kalender_akademik FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Admin can manage kalender_akademik" ON public.kalender_akademik;
CREATE POLICY "Admin can manage kalender_akademik"
    ON public.kalender_akademik FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
