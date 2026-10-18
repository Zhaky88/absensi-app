-- ==============================================================================
-- UPDATE MIGRATION: KALENDER AKADEMIK & HARI LIBUR SEKOLAH
-- Fitur: Menandai Hari Libur, Freeze Streak Gamifikasi, & Dot Indicator Presensi
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.kalender_akademik (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE UNIQUE NOT NULL,
    status_hari VARCHAR(30) NOT NULL DEFAULT 'libur_nasional', -- 'libur_nasional', 'libur_sekolah', 'kegiatan_khusus'
    keterangan VARCHAR(150) NOT NULL,
    is_libur BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_kalender_tanggal ON public.kalender_akademik(tanggal);

ALTER TABLE public.kalender_akademik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua user bisa melihat kalender akademik" ON public.kalender_akademik;
CREATE POLICY "Semua user bisa melihat kalender akademik"
    ON public.kalender_akademik FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin bisa mengelola kalender akademik" ON public.kalender_akademik;
CREATE POLICY "Admin bisa mengelola kalender akademik"
    ON public.kalender_akademik FOR ALL
    USING (public.get_current_user_role() = 'admin');

-- Seeder Contoh Hari Libur & Kegiatan
INSERT INTO public.kalender_akademik (tanggal, status_hari, keterangan, is_libur)
VALUES
    ('2026-10-20', 'kegiatan_khusus', 'Classmeeting & Porseni Sekolah', false),
    ('2026-10-28', 'libur_nasional', 'Hari Sumpah Pemuda (Upacara Gabungan)', false),
    ('2026-12-25', 'libur_nasional', 'Hari Raya Natal', true),
    ('2026-12-31', 'libur_sekolah', 'Libur Akhir Semester Ganjil', true),
    ('2026-01-01', 'libur_nasional', 'Tahun Baru Masehi', true)
ON CONFLICT (tanggal) DO UPDATE 
SET keterangan = EXCLUDED.keterangan, is_libur = EXCLUDED.is_libur;
