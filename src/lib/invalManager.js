import { supabase } from './supabase';

const STORAGE_KEY = 'siak_inval_assignments';

/**
 * Format tanggal hari ini dalam format YYYY-MM-DD lokal
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Ambil seluruh daftar penugasan guru inval dari localStorage
 */
export function getInvalAssignments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Sinkronisasi data ke Supabase (tabel pengaturan_sistem) agar tersimpan di cloud
 */
async function syncToSupabase(assignments) {
  try {
    await supabase.from('pengaturan_sistem').upsert(
      {
        kunci: 'inval_assignments',
        nilai: JSON.stringify(assignments),
        deskripsi: 'Data penugasan guru pengganti (inval) aktif',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'kunci' }
    );
  } catch (e) {
    // Fail silently jika RLS atau koneksi terbatas
  }
}

/**
 * Tarik data inval terbaru dari Supabase dan simpan ke localStorage
 */
export async function fetchInvalAssignmentsFromCloud() {
  try {
    const { data } = await supabase
      .from('pengaturan_sistem')
      .select('nilai')
      .eq('kunci', 'inval_assignments')
      .single();

    if (data && data.nilai) {
      const parsed = JSON.parse(data.nilai);
      if (Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {}
  return getInvalAssignments();
}

/**
 * Simpan atau perbarui penugasan guru inval
 */
export async function saveInvalAssignment(assignment) {
  const current = getInvalAssignments();
  const index = current.findIndex((item) => item.id === assignment.id);

  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...assignment };
  } else {
    const newEntry = {
      id: assignment.id || `inval-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tanggal: assignment.tanggal || getTodayDateString(),
      created_at: new Date().toISOString(),
      status: 'aktif',
      ...assignment,
    };
    updated = [newEntry, ...current];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  await syncToSupabase(updated);
  return updated;
}

/**
 * Batalkan / hapus penugasan guru inval
 */
export async function removeInvalAssignment(invalId) {
  const current = getInvalAssignments();
  const updated = current.filter((item) => item.id !== invalId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  await syncToSupabase(updated);
  return updated;
}

/**
 * Cek apakah jadwal tertentu pada tanggal hari ini memiliki guru pengganti (inval)
 */
export function getActiveInvalForSchedule(id_jadwal, dateStr = getTodayDateString()) {
  const all = getInvalAssignments();
  return all.find(
    (item) => item.id_jadwal === id_jadwal && item.tanggal === dateStr && item.status === 'aktif'
  );
}

/**
 * Ambil daftar tugas inval untuk seorang guru (sebagai pengganti) hari ini
 */
export function getActiveInvalsForTeacher(guruNip, dateStr = getTodayDateString()) {
  const all = getInvalAssignments();
  return all.filter(
    (item) =>
      item.id_guru_pengganti === guruNip &&
      item.tanggal === dateStr &&
      item.status === 'aktif'
  );
}

/**
 * Ambil seluruh penugasan inval aktif untuk hari ini
 */
export function getAllActiveInvalsForToday(dateStr = getTodayDateString()) {
  const all = getInvalAssignments();
  return all.filter((item) => item.tanggal === dateStr && item.status === 'aktif');
}
