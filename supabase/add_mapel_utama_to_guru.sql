-- Migration: Menambahkan kolom mapel_utama pada tabel guru jika belum ada
-- Jalankan skrip ini di Supabase SQL Editor jika ingin kolom mapel_utama tersimpan permanen di database.

ALTER TABLE public.guru ADD COLUMN IF NOT EXISTS mapel_utama TEXT;

-- Update contoh data spesialisasi mapel guru
UPDATE public.guru SET mapel_utama = 'Informatika & Pemrograman Web' WHERE nip = '199203152018011003';
UPDATE public.guru SET mapel_utama = 'Matematika Wajib' WHERE nip = '198802202012022001';
UPDATE public.guru SET mapel_utama = 'Bahasa Indonesia, Pendidikan Agama & Budi Pekerti' WHERE nip = '198501152010011002';
UPDATE public.guru SET mapel_utama = 'Fisika, Biologi' WHERE nip = '197905102005012004';
UPDATE public.guru SET mapel_utama = 'Pendidikan Jasmani & Olahraga' WHERE nip = '199008122019031005';
UPDATE public.guru SET mapel_utama = 'Bahasa Inggris' WHERE nip = '199411052020122006';
