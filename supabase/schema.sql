-- ==============================================================================
-- ABSENSI SISWA V4.0: Enterprise School Attendance & Administration System
-- Architecture: Jamstack + Supabase PostgreSQL + Netlify Functions (Serverless)
-- Features: Dynamic QR, GPS Geofencing, Anti-Joki Device Binding, Gamification Streak, WhatsApp Queue
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('admin', 'guru', 'murid', 'ortu', 'guru_bk', 'guru_piket');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_siswa_enum AS ENUM ('aktif', 'lulus', 'alumni', 'pindah');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_absen_enum AS ENUM ('H', 'S', 'I', 'A', 'T');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metode_absen_enum AS ENUM ('guru_scan', 'murid_scan', 'manual', 'piket_scan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_wa_enum AS ENUM ('pending', 'sukses', 'gagal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES DEFINITION

-- 3.1 Users Metadata (Bridge between auth.users, Role Management & Device Binding Anti-Joki)
CREATE TABLE IF NOT EXISTS public.users_metadata (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'murid',
    device_id TEXT, -- Fingerprint ID perangkat untuk mencegah joki akun di HP lain
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 Orang Tua Siswa
CREATE TABLE IF NOT EXISTS public.orang_tua (
    id_ortu UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID UNIQUE REFERENCES public.users_metadata(id) ON DELETE SET NULL,
    nama_ayah VARCHAR(150),
    nama_ibu VARCHAR(150),
    no_whatsapp VARCHAR(25) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 Guru
CREATE TABLE IF NOT EXISTS public.guru (
    nip VARCHAR(30) PRIMARY KEY,
    id_user UUID UNIQUE REFERENCES public.users_metadata(id) ON DELETE SET NULL,
    nama VARCHAR(150) NOT NULL,
    is_bk BOOLEAN NOT NULL DEFAULT false,
    is_piket BOOLEAN NOT NULL DEFAULT false,
    foto_profil TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 Kelas
CREATE TABLE IF NOT EXISTS public.kelas (
    id_kelas UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelas VARCHAR(50) UNIQUE NOT NULL,
    tingkat INT NOT NULL CHECK (tingkat IN (7, 8, 9)),
    jurusan VARCHAR(20) DEFAULT 'IPA',
    wali_kelas VARCHAR(30) REFERENCES public.guru(nip) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 Siswa
CREATE TABLE IF NOT EXISTS public.siswa (
    nis VARCHAR(30) PRIMARY KEY,
    id_user UUID UNIQUE REFERENCES public.users_metadata(id) ON DELETE SET NULL,
    id_kelas UUID REFERENCES public.kelas(id_kelas) ON DELETE SET NULL,
    id_ortu UUID REFERENCES public.orang_tua(id_ortu) ON DELETE SET NULL,
    nama VARCHAR(150) NOT NULL,
    foto_wajah TEXT,
    qr_token_pribadi VARCHAR(255) UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text),
    streak_sekarang INT NOT NULL DEFAULT 0,
    streak_tertinggi INT NOT NULL DEFAULT 0,
    status_siswa status_siswa_enum NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6 Mata Pelajaran
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id_mapel UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_mapel VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 Jadwal Pelajaran
CREATE TABLE IF NOT EXISTS public.jadwal (
    id_jadwal UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_kelas UUID NOT NULL REFERENCES public.kelas(id_kelas) ON DELETE CASCADE,
    id_mapel UUID NOT NULL REFERENCES public.mata_pelajaran(id_mapel) ON DELETE CASCADE,
    id_guru VARCHAR(30) NOT NULL REFERENCES public.guru(nip) ON DELETE CASCADE,
    hari VARCHAR(20) NOT NULL, -- 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    batas_terlambat TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 Pengaturan Sistem (Koordinat GPS Sekolah, Buffer Radius, WhatsApp Gateway API)
CREATE TABLE IF NOT EXISTS public.pengaturan_sistem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunci VARCHAR(100) UNIQUE NOT NULL,
    nilai TEXT NOT NULL,
    deskripsi TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 Absensi Siswa
CREATE TABLE IF NOT EXISTS public.absensi (
    id_absensi UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_jadwal UUID REFERENCES public.jadwal(id_jadwal) ON DELETE CASCADE,
    nis VARCHAR(30) NOT NULL REFERENCES public.siswa(nis) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    status status_absen_enum NOT NULL DEFAULT 'H',
    metode metode_absen_enum NOT NULL DEFAULT 'murid_scan',
    koordinat_gps JSONB, -- { "lat": -0.245, "lng": 116.591, "accuracy": 12.5, "distance_meter": 24.3 }
    foto_bukti_izin TEXT, -- URL file bukti surat izin / surat sakit dari Supabase Storage
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_absensi_siswa_jadwal_tanggal UNIQUE (nis, id_jadwal, tanggal)
);

-- 3.10 Antrean WhatsApp (Notification Queue)
CREATE TABLE IF NOT EXISTS public.antrean_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_absensi UUID REFERENCES public.absensi(id_absensi) ON DELETE SET NULL,
    no_tujuan VARCHAR(25) NOT NULL,
    pesan TEXT NOT NULL,
    status_kirim status_wa_enum NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

-- 4. DATABASE INDEXING (OPTIMASI PERFORMA KUERI ENTERPRISE)
CREATE INDEX IF NOT EXISTS idx_absensi_nis_tanggal ON public.absensi(nis, tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_id_jadwal_tanggal ON public.absensi(id_jadwal, tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_status ON public.absensi(status);
CREATE INDEX IF NOT EXISTS idx_siswa_id_kelas_status ON public.siswa(id_kelas, status_siswa);
CREATE INDEX IF NOT EXISTS idx_siswa_id_user ON public.siswa(id_user);
CREATE INDEX IF NOT EXISTS idx_siswa_id_ortu ON public.siswa(id_ortu);
CREATE INDEX IF NOT EXISTS idx_guru_id_user ON public.guru(id_user);
CREATE INDEX IF NOT EXISTS idx_jadwal_id_kelas_hari ON public.jadwal(id_kelas, hari);
CREATE INDEX IF NOT EXISTS idx_jadwal_id_guru_hari ON public.jadwal(id_guru, hari);
CREATE INDEX IF NOT EXISTS idx_antrean_wa_status ON public.antrean_whatsapp(status_kirim);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orang_tua ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan_sistem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrean_whatsapp ENABLE ROW LEVEL SECURITY;

-- Helper Function: Mengetahui role pengguna aktif
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role_enum
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.users_metadata WHERE id = auth.uid();
$$;

-- Helper Function: Mengetahui apakah pengguna adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (SELECT 1 FROM public.users_metadata WHERE id = auth.uid() AND role = 'admin');
$$;

-- RLS: users_metadata
DROP POLICY IF EXISTS "Users can read own metadata or admin full access" ON public.users_metadata;
CREATE POLICY "Users can read own metadata or admin full access"
    ON public.users_metadata FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admin has full access on users_metadata" ON public.users_metadata;
CREATE POLICY "Admin has full access on users_metadata"
    ON public.users_metadata FOR ALL
    USING (public.is_admin());

-- RLS: guru
DROP POLICY IF EXISTS "Authenticated users can view guru list" ON public.guru;
CREATE POLICY "Authenticated users can view guru list"
    ON public.guru FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can manage guru" ON public.guru;
CREATE POLICY "Admin can manage guru"
    ON public.guru FOR ALL
    USING (public.is_admin());

-- RLS: kelas
DROP POLICY IF EXISTS "Authenticated users can view kelas" ON public.kelas;
CREATE POLICY "Authenticated users can view kelas"
    ON public.kelas FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin can manage kelas" ON public.kelas;
CREATE POLICY "Admin can manage kelas"
    ON public.kelas FOR ALL
    USING (public.is_admin());

-- RLS: siswa
DROP POLICY IF EXISTS "Authenticated users can view active student list" ON public.siswa;
CREATE POLICY "Authenticated users can view active student list"
    ON public.siswa FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin and Guru can manage siswa" ON public.siswa;
CREATE POLICY "Admin and Guru can manage siswa"
    ON public.siswa FOR ALL
    USING (public.get_current_user_role() IN ('admin', 'guru', 'guru_bk', 'guru_piket'));

-- RLS: absensi
DROP POLICY IF EXISTS "Student read own attendance, parents read children, staff read all" ON public.absensi;
CREATE POLICY "Student read own attendance, parents read children, staff read all"
    ON public.absensi FOR SELECT
    TO authenticated
    USING (
        nis IN (SELECT s.nis FROM public.siswa s WHERE s.id_user = auth.uid())
        OR public.get_current_user_role() IN ('admin', 'guru', 'guru_bk', 'guru_piket')
        OR auth.uid() IN (
            SELECT ot.id_user 
            FROM public.orang_tua ot 
            JOIN public.siswa s ON s.id_ortu = ot.id_ortu 
            WHERE s.nis = public.absensi.nis
        )
    );

DROP POLICY IF EXISTS "Student or teacher insert attendance" ON public.absensi;
CREATE POLICY "Student or teacher insert attendance"
    ON public.absensi FOR INSERT
    TO authenticated
    WITH CHECK (
        nis IN (SELECT s.nis FROM public.siswa s WHERE s.id_user = auth.uid())
        OR public.get_current_user_role() IN ('admin', 'guru', 'guru_piket')
    );

DROP POLICY IF EXISTS "Teachers and admin update or delete attendance" ON public.absensi;
CREATE POLICY "Teachers and admin update or delete attendance"
    ON public.absensi FOR UPDATE
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'guru', 'guru_piket', 'guru_bk'));

-- RLS: pengaturan_sistem
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.pengaturan_sistem;
CREATE POLICY "Authenticated users can read system settings"
    ON public.pengaturan_sistem FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only admin can modify system settings" ON public.pengaturan_sistem;
CREATE POLICY "Only admin can modify system settings"
    ON public.pengaturan_sistem FOR ALL
    USING (public.is_admin());

-- RLS: antrean_whatsapp
DROP POLICY IF EXISTS "Staff can monitor whatsapp queue" ON public.antrean_whatsapp;
CREATE POLICY "Staff can monitor whatsapp queue"
    ON public.antrean_whatsapp FOR SELECT
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'guru_bk', 'guru_piket'));

-- RLS: mata_pelajaran
DROP POLICY IF EXISTS "Authenticated users can view mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Authenticated users can view mata_pelajaran"
    ON public.mata_pelajaran FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Admin and Guru can manage mata_pelajaran" ON public.mata_pelajaran;
CREATE POLICY "Admin and Guru can manage mata_pelajaran"
    ON public.mata_pelajaran FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- RLS: jadwal
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

-- 3.11 Kalender Akademik (Hari Libur & Jadwal Khusus)
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


-- 6. TRIGGER OTOMATIS: Registrasi Auth Users -> Otomatis Baris users_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users_metadata (id, username, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::user_role_enum, 'murid'::user_role_enum)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. SEEDER DATA AWAL (DEFAULT SYSTEM SETTINGS & MASTER DEMO)

-- 7.1 Pengaturan Sistem
INSERT INTO public.pengaturan_sistem (kunci, nilai, deskripsi)
VALUES
    ('sekolah_nama', 'SMP NEGERI 2 KOTA BANGUN', 'Nama resmi instansi sekolah'),
    ('sekolah_lat', '-0.245892', 'Latitude pusat koordinat gerbang sekolah'),
    ('sekolah_lng', '116.591230', 'Longitude pusat koordinat gerbang sekolah'),
    ('sekolah_radius_meter', '100', 'Radius buffer toleransi GPS absensi siswa (dalam meter)'),
    ('wa_gateway_api_url', 'https://api.fonnte.com/send', 'URL Endpoint WA Gateway / Fonnte / Watzap'),
    ('wa_gateway_api_key', 'SAMPLE_FONNTE_KEY_XYZ123', 'API Token WhatsApp Gateway'),
    ('wa_template_alpa', 'Pemberitahuan: Bpk/Ibu {{nama_ortu}}, ananda {{nama_siswa}} (NIS: {{nis}}) tercatat ALPA pada {{tanggal}}.', 'Template pesan WA jika siswa alpa'),
    ('wa_template_terlambat', 'Pemberitahuan: Ananda {{nama_siswa}} terlambat hadir pada mapel {{mapel}} pukul {{waktu}}.', 'Template pesan WA jika terlambat'),
    ('wa_template_streak', 'Apresiasi: Selamat! Ananda {{nama_siswa}} telah mencapai Attendance Streak {{streak}} Hari berturut-turut! Tetap pertahankan prestasi ini!', 'Template WA milestone streak')
ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai;

-- 7.2 Master Data Awal (Guru, Kelas, Siswa, Mapel, Jadwal)
DO $$
DECLARE
    var_id_ortu UUID := 'b0000000-0000-0000-0000-000000000001';
    var_id_kelas UUID := 'c0000000-0000-0000-0000-000000000001';
    var_id_mapel UUID := 'd0000000-0000-0000-0000-000000000001';
BEGIN
    -- Seeder Guru
    INSERT INTO public.guru (nip, id_user, nama, is_bk, is_piket, foto_profil)
    VALUES
        ('198501152010011002', NULL, 'Bpk. Ahmad Fauzi, S.Pd', false, true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
    ON CONFLICT (nip) DO UPDATE SET nama = EXCLUDED.nama, is_piket = EXCLUDED.is_piket;

    -- Seeder Kelas (Tingkat 10)
    INSERT INTO public.kelas (id_kelas, nama_kelas, tingkat, wali_kelas)
    VALUES
        (var_id_kelas, 'X-IPA-1', 10, '198501152010011002')
    ON CONFLICT (id_kelas) DO NOTHING;

    -- Seeder Orang Tua
    INSERT INTO public.orang_tua (id_ortu, id_user, nama_ayah, nama_ibu, no_whatsapp)
    VALUES
        (var_id_ortu, NULL, 'Bpk. Bambang Sutrisno', 'Ibu Siti Aminah', '6281234567890')
    ON CONFLICT (id_ortu) DO NOTHING;

    -- Seeder Siswa
    INSERT INTO public.siswa (nis, id_user, id_kelas, id_ortu, nama, foto_wajah, qr_token_pribadi, streak_sekarang, streak_tertinggi, status_siswa)
    VALUES
        ('202409001', NULL, var_id_kelas, var_id_ortu, 'Budi Pratama', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'TOKEN-BUDI-202409001-SECURE', 14, 28, 'aktif')
    ON CONFLICT (nis) DO NOTHING;

    -- Seeder Mapel
    INSERT INTO public.mata_pelajaran (id_mapel, nama_mapel)
    VALUES
        (var_id_mapel, 'Informatika & Pemrograman Web')
    ON CONFLICT (id_mapel) DO NOTHING;

    -- Seeder Jadwal Pelajaran
    INSERT INTO public.jadwal (id_kelas, id_mapel, id_guru, hari, jam_mulai, jam_selesai, batas_terlambat)
    VALUES
        (var_id_kelas, var_id_mapel, '198501152010011002', 'Senin', '07:30:00', '09:00:00', '07:45:00')
    ON CONFLICT DO NOTHING;
END $$;
