import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[SIAK] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum dikonfigurasi pada file .env!'
  );
}

/**
 * Supabase Client Instance (Client-side / Browser)
 * Mengelola auto-refresh token, session storage di browser (localStorage/cookies),
 * serta auto-reconnect untuk skenario PWA/Offline-mode.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window?.localStorage,
  },
  global: {
    headers: {
      'x-application-name': 'SIAK-Absensi-Siswa-V4',
    },
  },
});

/**
 * Device Fingerprint Generator sederhana untuk proteksi Device Binding (Anti-Joki)
 */
export function getBrowserDeviceId() {
  const nav = window.navigator || {};
  const screen = window.screen || {};
  const rawId = `${nav.userAgent || ''}-${screen.colorDepth || ''}-${screen.width || ''}x${screen.height || ''}-${nav.language || ''}`;
  
  // Hash sederhana ke base64/hex
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    const char = rawId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `DEV-${Math.abs(hash).toString(36).toUpperCase()}`;
}

/**
 * Smart User Profile & Multi-Role Resolver
 * Mendeteksi akun pengguna, role utama, role ganda (misal: Guru sekaligus Ortu),
 * serta memvalidasi Device Binding (Anti-Joki).
 * 
 * @param {string} userId - UUID dari auth.users
 * @param {string} [currentDeviceId] - ID perangkat browser saat ini
 */
export async function getUserMetadataAndRole(userId, currentDeviceId = null) {
  try {
    const { data: meta, error } = await supabase
      .from('users_metadata')
      .select('id, username, role, device_id')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!meta) throw new Error('Profil pengguna tidak ditemukan.');

    // 1. Validasi Device Binding untuk Murid (Anti-Joki)
    let isDeviceBlocked = false;
    if (meta.role === 'murid' && currentDeviceId) {
      if (!meta.device_id) {
        // First login: otomatis bind device
        await supabase
          .from('users_metadata')
          .update({ device_id: currentDeviceId, updated_at: new Date().toISOString() })
          .eq('id', userId);
        meta.device_id = currentDeviceId;
      } else if (meta.device_id !== currentDeviceId) {
        // Terdeteksi login di perangkat lain!
        isDeviceBlocked = true;
      }
    }

    let extraDetails = null;
    let availableRoles = [meta.role];

    // 2. Fetch data detail spesifik berdasarkan role
    if (meta.role === 'guru' || meta.role === 'guru_bk') {
      const { data: guruData } = await supabase
        .from('guru')
        .select('nip, nama, is_bk, foto_profil')
        .eq('id_user', userId)
        .maybeSingle();

      extraDetails = guruData;

      // Dukungan multi-role: Cek jika guru ini juga memiliki anak (sebagai Ortu)
      const { data: ortuCheck } = await supabase
        .from('orang_tua')
        .select('id_ortu')
        .eq('id_user', userId)
        .maybeSingle();
      if (ortuCheck) availableRoles.push('ortu');

      // Cek apakah guru juga memiliki hak Guru BK
      if (guruData?.is_bk && !availableRoles.includes('guru_bk')) availableRoles.push('guru_bk');

    } else if (meta.role === 'murid') {
      const { data: muridData } = await supabase
        .from('siswa')
        .select('nis, nama, foto_wajah, qr_token_pribadi, streak_sekarang, streak_tertinggi, status_siswa, id_kelas, kelas(nama_kelas, tingkat)')
        .eq('id_user', userId)
        .maybeSingle();
      extraDetails = muridData;

    } else if (meta.role === 'ortu') {
      const { data: ortuData } = await supabase
        .from('orang_tua')
        .select('id_ortu, nama_ayah, nama_ibu, no_whatsapp')
        .eq('id_user', userId)
        .maybeSingle();
      extraDetails = ortuData;
    }

    return {
      success: true,
      role: meta.role,
      username: meta.username,
      deviceId: meta.device_id,
      isDeviceBlocked,
      availableRoles: [...new Set(availableRoles)], // Unique roles list
      details: extraDetails,
    };
  } catch (err) {
    console.error('[SIAK Supabase] Error fetching user metadata:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
