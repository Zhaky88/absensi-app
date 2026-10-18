const { createClient } = require('@supabase/supabase-js');

/**
 * Netlify Function: verify-gps.js
 * Path: netlify/functions/verify-gps.js & src/functions/verify-gps.js
 * Method: POST
 * 
 * Fitur & Proteksi Keamanan:
 * 1. Buffer Analysis Geodesic (Haversine Formula) menghitung jarak siswa ke titik sekolah.
 * 2. Mengambil koordinat gerbang dan batas radius meter langsung dari tabel `pengaturan_sistem`.
 * 3. Anti-Spoofing / Anti-Mock Location:
 *    - Menguji akurasi GPS perangkat (jika accuracy > 80m ditolak).
 *    - Memvalidasi rentang latitude/longitude valid.
 * 4. Anti-Joki Device Binding:
 *    - Mengecek kecocokan `deviceId` jika murid melakukan presensi.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Menghitung jarak geodesic antara 2 titik koordinat (dalam satuan METER)
 * Menggunakan Haversine Formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius rata-rata bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 desimal presisi meter
}

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ valid: false, error: 'Method Not Allowed. Gunakan POST.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { studentLat, studentLng, accuracy, nis, deviceId } = payload;

    // 1. Validasi Input Parameter
    if (studentLat == null || studentLng == null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          message: 'Parameter koordinat GPS (studentLat, studentLng) wajib dikirim!',
        }),
      };
    }

    const lat = parseFloat(studentLat);
    const lng = parseFloat(studentLng);
    const gpsAccuracy = Number(accuracy) || 0;

    // Validasi range koordinat bumi
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          message: 'Format koordinat latitude/longitude tidak valid.',
        }),
      };
    }

    // 2. Proteksi Anti-Spoofing / Mock Location:
    // Jika akurasi sinyal > 80m, kemungkinan siswa di dalam gedung ber-sinyal palsu atau menggunakan aplikasi Fake GPS
    if (gpsAccuracy > 80) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          valid: false,
          isSpoofed: true,
          message: `Akurasi sinyal GPS perangkat Anda terlalu rendah (±${gpsAccuracy}m). Mohon keluar ruangan atau aktifkan Mode Akurasi Tinggi (High Accuracy GPS).`,
        }),
      };
    }

    // 3. Ambil Konfigurasi Koordinat Sekolah dari Tabel pengaturan_sistem
    let schoolLat = -0.245892;
    let schoolLng = 116.591230;
    let maxRadiusMeter = 100;

    if (supabase) {
      const { data: settings, error: dbError } = await supabase
        .from('pengaturan_sistem')
        .select('kunci, nilai')
        .in('kunci', ['sekolah_lat', 'sekolah_lng', 'sekolah_radius_meter']);

      if (!dbError && settings) {
        settings.forEach((item) => {
          if (item.kunci === 'sekolah_lat') schoolLat = parseFloat(item.nilai);
          if (item.kunci === 'sekolah_lng') schoolLng = parseFloat(item.nilai);
          if (item.kunci === 'sekolah_radius_meter') maxRadiusMeter = parseFloat(item.nilai);
        });
      }

      // 4. Proteksi Anti-Joki: Device Binding Check jika NIS disertakan
      if (nis && deviceId) {
        const { data: studentUser } = await supabase
          .from('siswa')
          .select('id_user, users_metadata(device_id)')
          .eq('nis', nis)
          .maybeSingle();

        const boundDeviceId = studentUser?.users_metadata?.device_id;
        if (boundDeviceId && boundDeviceId !== deviceId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              valid: false,
              isDeviceMismatch: true,
              message: 'Peringatan Anti-Joki: Akun Anda terikat pada perangkat lain. Harap hubungi Admin/BK untuk reset binding perangkat.',
            }),
          };
        }
      }
    }

    // 5. Buffer Analysis (Perhitungan Jarak Haversine)
    const distanceMeter = calculateHaversineDistance(lat, lng, schoolLat, schoolLng);
    const isInsideRadius = distanceMeter <= maxRadiusMeter;

    if (!isInsideRadius) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          valid: false,
          distanceMeter,
          maxAllowedMeter: maxRadiusMeter,
          message: `Absensi Ditolak: Anda berada di luar radius sekolah (${distanceMeter}m dari gerbang). Maksimal radius toleransi adalah ${maxRadiusMeter}m.`,
        }),
      };
    }

    // 6. Response Sukses
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        distanceMeter,
        maxAllowedMeter: maxRadiusMeter,
        studentCoords: {
          lat,
          lng,
          accuracy: gpsAccuracy,
        },
        message: `Verifikasi Geolocation Berhasil! Siswa berada di dalam radius sekolah (${distanceMeter}m).`,
      }),
    };
  } catch (error) {
    console.error('[verify-gps] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        error: error.message || 'Internal Server Error pada Geolocation Verification.',
      }),
    };
  }
};
