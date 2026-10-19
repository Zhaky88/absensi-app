import { supabase } from './supabase.js';

const STORAGE_KEY = 'siak_audit_logs';

/**
 * Generate initial realistic seed logs if none exist
 */
function getInitialSeedLogs() {
  const now = new Date();
  const formatTime = (offsetHours, offsetMinutes) => {
    const d = new Date(now.getTime() - (offsetHours * 3600000 + offsetMinutes * 60000));
    return d.toISOString();
  };

  return [
    {
      id: 'log_seed_001',
      timestamp: formatTime(0, 15),
      role: 'admin',
      userId: 'admin_siak',
      userName: 'Administrator SIAK',
      action: 'Akses Sistem',
      category: 'autentikasi',
      details: 'Login Berhasil sebagai Administrator SIAK (Full Access)',
      status: 'success',
      ipOrDevice: 'Web Desktop / Chrome (Windows)',
      metadata: { browser: 'Chrome', platform: 'Win32' },
    },
    {
      id: 'log_seed_002',
      timestamp: formatTime(1, 20),
      role: 'guru',
      userId: '198501152010011002',
      userName: 'Bpk. Ahmad Fauzi, S.Pd',
      action: 'Absensi Manual KBM',
      category: 'presensi',
      details: 'Menandai status presensi siswa Kelas VII-A pada KBM Matematika Sesi 1',
      status: 'success',
      ipOrDevice: 'Mobile PWA / Android 14',
      metadata: { kelas: 'VII-A', mapel: 'Matematika' },
    },
    {
      id: 'log_seed_003',
      timestamp: formatTime(1, 45),
      role: 'guru',
      userId: '198501152010011002',
      userName: 'Bpk. Ahmad Fauzi, S.Pd',
      action: 'Dynamic QR KBM',
      category: 'kbm',
      details: 'Membuka QR Code Dinamis Anti-Screenshot untuk Kelas VII-A (Interval 15s)',
      status: 'success',
      ipOrDevice: 'Smart TV / Browser Kelas VII-A',
      metadata: { sesi: 'Sesi 1', interval: 15 },
    },
    {
      id: 'log_seed_004',
      timestamp: formatTime(2, 10),
      role: 'murid',
      userId: '202409001',
      userName: 'Budi Pratama (VII-A)',
      action: 'Scan Presensi Mandiri',
      category: 'presensi',
      details: 'Scan QR Masuk Sekolah berhasil (Radius GPS: 14m dari titik pusat gerbang) -> Hadir',
      status: 'success',
      ipOrDevice: 'Samsung Galaxy A54 / PWA',
      metadata: { gps_distance: '14m', radius_limit: '50m' },
    },
    {
      id: 'log_seed_005',
      timestamp: formatTime(2, 35),
      role: 'ortu',
      userId: 'ortu_budi',
      userName: 'Bpk. Bambang Sutrisno (Ortu Budi)',
      action: 'Pantau Presensi Anak',
      category: 'izin',
      details: 'Mengecek kehadiran real-time Budi Pratama dan mengunduh rekap bulanan',
      status: 'success',
      ipOrDevice: 'Mobile Safari / iOS 17',
      metadata: { nis: '202409001' },
    },
    {
      id: 'log_seed_006',
      timestamp: formatTime(3, 5),
      role: 'murid',
      userId: '202409015',
      userName: 'Rian Saputra (VII-B)',
      action: 'GPS Anti-Cheat Triggered',
      category: 'presensi',
      details: 'Percobaan scan presensi ditolak: Posisi terdeteksi 420m di luar radius sekolah',
      status: 'warning',
      ipOrDevice: 'Xiaomi Redmi Note 12 / Chrome',
      metadata: { gps_distance: '420m', status_code: 'OUT_OF_BOUNDS' },
    },
    {
      id: 'log_seed_007',
      timestamp: formatTime(4, 15),
      role: 'admin',
      userId: 'admin_siak',
      userName: 'Administrator SIAK',
      action: 'Update Master Data',
      category: 'master_data',
      details: 'Menambahkan 1 jadwal KBM baru untuk Kelas VIII-B (Prakarya / Bpk. Rudi)',
      status: 'success',
      ipOrDevice: 'Web Desktop / Admin PC',
      metadata: { table: 'jadwal_kbm', action: 'insert' },
    },
    {
      id: 'log_seed_008',
      timestamp: formatTime(5, 30),
      role: 'sistem',
      userId: 'system_auto',
      userName: 'Sistem SIAK Anti-Cheat',
      action: 'Auto Lock Presensi',
      category: 'pengaturan',
      details: 'Batas waktu presensi reguler (07:15 WITA) telah berakhir, sesi presensi pagi ditutup',
      status: 'success',
      ipOrDevice: 'Cron Service / Supabase Edge',
      metadata: { cut_off_time: '07:15:00' },
    },
    {
      id: 'log_seed_009',
      timestamp: formatTime(6, 40),
      role: 'guru',
      userId: '197908122005012004',
      userName: 'Ibu Ratna Dewi, M.Pd',
      action: 'Input Jurnal KBM',
      category: 'kbm',
      details: 'Menyimpan Jurnal Pembelajaran IPA Terpadu Kelas IX-A (Materi: Sistem Reproduksi)',
      status: 'success',
      ipOrDevice: 'Laptop Lenovo / Windows 11',
      metadata: { kelas: 'IX-A', mapel: 'IPA' },
    },
    {
      id: 'log_seed_010',
      timestamp: formatTime(8, 0),
      role: 'ortu',
      userId: 'ortu_doni',
      userName: 'Ibu Maryam (Ortu Doni)',
      action: 'Pengajuan Izin Sakit',
      category: 'izin',
      details: 'Mengirim permohonan surat izin sakit 2 hari dengan lampiran surat dokter',
      status: 'warning',
      ipOrDevice: 'WhatsApp Web Form / Mobile',
      metadata: { nis: '202409005', hari: 2 },
    },
  ];
}

/**
 * Get all activity logs from localStorage, merged with seed data if empty
 */
export function getActivityLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initial = getInitialSeedLogs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.error('Error fetching activity logs:', e);
    return getInitialSeedLogs();
  }
}

/**
 * Log a new user activity into the audit trail
 * @param {Object} param
 * @param {string} param.role - 'admin' | 'guru' | 'murid' | 'ortu' | 'sistem'
 * @param {string} param.userId - NIP, NIS, email, or username
 * @param {string} param.userName - Full name of the user
 * @param {string} param.action - Short title of action (e.g. 'Absensi Manual')
 * @param {string} param.category - 'presensi' | 'kbm' | 'autentikasi' | 'master_data' | 'pengaturan' | 'izin'
 * @param {string} param.details - Detailed human-readable description
 * @param {'success' | 'warning' | 'error'} [param.status='success']
 * @param {Object} [param.metadata={}]
 */
export async function logActivity({
  role = 'sistem',
  userId = 'system',
  userName = 'Sistem',
  action = 'Aktivitas',
  category = 'presensi',
  details = '',
  status = 'success',
  metadata = {},
}) {
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    role: role || 'sistem',
    userId: String(userId || '-'),
    userName: String(userName || 'Pengguna SIAK'),
    action: String(action || 'Aktivitas'),
    category: String(category || 'presensi'),
    details: String(details || '-'),
    status: status || 'success',
    ipOrDevice: (() => {
      try {
        const ua = navigator.userAgent || '';
        if (/iphone|ipad|ipod/i.test(ua)) return 'Mobile Apple / iOS';
        if (/android/i.test(ua)) return 'Mobile Smartphone / Android';
        if (/windows/i.test(ua)) return 'Desktop PC / Windows';
        if (/mac/i.test(ua)) return 'Desktop Mac / macOS';
        return 'Web Browser App';
      } catch (e) {
        return 'Web Client';
      }
    })(),
    metadata: metadata || {},
  };

  try {
    const existing = getActivityLogs();
    const updated = [newLog, ...existing].slice(0, 500); // Batasi maks 500 entri terbaru
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Gagal menyimpan log audit ke localStorage:', err);
  }

  // Coba kirim juga ke Supabase table log_aktivitas (jika tabel telah dibuat)
  try {
    if (supabase) {
      supabase
        .from('log_aktivitas')
        .insert([
          {
            id: newLog.id,
            created_at: newLog.timestamp,
            role: newLog.role,
            user_id: newLog.userId,
            user_name: newLog.userName,
            action: newLog.action,
            category: newLog.category,
            details: newLog.details,
            status: newLog.status,
            device_info: newLog.ipOrDevice,
            metadata: newLog.metadata,
          },
        ])
        .then(({ error }) => {
          if (error && !error.message?.includes('does not exist')) {
            // Abaikan silently jika tabel belum dibuat di supabase
          }
        })
        .catch(() => {});
    }
  } catch (e) {}

  return newLog;
}

/**
 * Clear all activity logs
 */
export function clearActivityLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
