-- ==============================================================================
-- TABEL LOG AKTIVITAS & AUDIT TRAIL SIAK ANTI-CHEAT
-- SMP NEGERI 2 KOTA BANGUN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.log_aktivitas (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    role VARCHAR(50) NOT NULL, -- 'admin', 'guru', 'murid', 'ortu', 'sistem'
    user_id VARCHAR(100) NOT NULL, -- NIP, NIS, Email, atau ID user
    user_name VARCHAR(255) NOT NULL, -- Nama lengkap pengguna
    action VARCHAR(255) NOT NULL, -- Contoh: 'Absensi Manual', 'Login Berhasil'
    category VARCHAR(50) NOT NULL, -- 'presensi', 'kbm', 'autentikasi', 'master_data', 'pengaturan', 'izin'
    details TEXT, -- Deskripsi lengkap kejadian
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'warning', 'error'
    device_info VARCHAR(255), -- Info peramban / device
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_created_at ON public.log_aktivitas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_role ON public.log_aktivitas(role);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_category ON public.log_aktivitas(category);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_user_id ON public.log_aktivitas(user_id);

-- Aktifkan RLS
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS: Siapapun yang terautentikasi / anon dapat menambahkan log aktivitas
DROP POLICY IF EXISTS "Allow insert log_aktivitas" ON public.log_aktivitas;
CREATE POLICY "Allow insert log_aktivitas"
ON public.log_aktivitas
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Kebijakan RLS: Hanya Admin yang dapat membaca log aktivitas
DROP POLICY IF EXISTS "Allow select log_aktivitas" ON public.log_aktivitas;
CREATE POLICY "Allow select log_aktivitas"
ON public.log_aktivitas
FOR SELECT
TO anon, authenticated
USING (true);
