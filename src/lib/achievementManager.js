// src/lib/achievementManager.js
// Sistem Terpadu Gamifikasi & Achievement Siswa SIAK
// Digunakan bersama oleh: MuridDashboard, GuruDashboard, dan AdminDashboard

/**
 * Menghitung Level dan Progress XP Siswa
 */
export function calculateStudentLevel(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const level = Math.floor(safeXp / 200) + 1;
  const currentLevelFloor = (level - 1) * 200;
  const xpInLevel = safeXp - currentLevelFloor;
  const percent = Math.min(100, Math.round((xpInLevel / 200) * 100));
  return {
    level,
    xpTotal: safeXp,
    xpInLevel,
    xpNextLevel: 200,
    percent,
  };
}

/**
 * Daftar Master Lencana Pencapaian Presensi Siswa (Lengkap dengan Status: Unlocked, Active, Upcoming, Missed)
 */
export function getMasterAchievements({
  studentGrade = 7,
  tahunAjaran = '2026/2027',
  semesterAktif = 'Ganjil',
  studentStreak = 0,
  studentTotalHadir = 0,
  studentRank = 1,
  currentDateStr = '2026-10-18',
} = {}) {
  const streak = Number(studentStreak) || 0;
  const hadir = Number(studentTotalHadir) || 0;
  const rank = Number(studentRank) || 1;
  const grade = Number(studentGrade) || 7;

  // Tanggal & Bulan Sistem Saat Ini (Default: 18 Oktober 2026)
  const currentYear = 2026;
  const currentMonth = 10; // Oktober

  // Helper helper status generator
  const createStatus = (isUnlocked, isUpcoming, isMissed, activeProgressText, upcomingReason, missedReason) => {
    if (isUnlocked) {
      return {
        status: 'unlocked',
        statusLabel: 'Terbuka',
        statusBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        statusNote: 'Lencana berhasil dikoleksi!',
      };
    }
    if (isUpcoming) {
      return {
        status: 'upcoming',
        statusLabel: 'Akan Datang',
        statusBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        statusNote: upcomingReason || 'Misi belum dibuka di periode kalender ini.',
      };
    }
    if (isMissed) {
      return {
        status: 'missed',
        statusLabel: 'Terlewat',
        statusBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        statusNote: missedReason || 'Periode misi telah berakhir untuk semester ini.',
      };
    }
    return {
      status: 'active',
      statusLabel: 'Sedang Berjalan',
      statusBadgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      statusNote: activeProgressText || 'Misi aktif dan dapat dikejar sekarang.',
    };
  };

  const rawList = [
    // =========================================================================
    // 1. REKOR STREAK KEHADIRAN (ONGOING / ACTIVE MISSONS)
    // =========================================================================
    {
      id: 'streak_7',
      category: 'streak',
      categoryLabel: 'Rekor Streak',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'bronze',
      xp: 50,
      title: 'Langkah Awal Disiplin',
      description: 'Hadir ke sekolah selama 7 hari masuk beruntun tanpa pernah alpa atau bolos.',
      icon: '🔥',
      isUnlocked: streak >= 7,
      currentProgress: Math.min(7, streak),
      maxProgress: 7,
      unit: 'Hari',
      unlockedDate: streak >= 7 ? 'Aktif' : null,
      ...createStatus(streak >= 7, false, false, 'Pertahankan streak Anda tiap hari sekolah'),
    },
    {
      id: 'streak_14',
      category: 'streak',
      categoryLabel: 'Rekor Streak',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'silver',
      xp: 120,
      title: 'Keteguhan Dua Pekan',
      description: 'Mempertahankan rekor kehadiran berturut-turut selama 14 hari sekolah.',
      icon: '⚡',
      isUnlocked: streak >= 14,
      currentProgress: Math.min(14, streak),
      maxProgress: 14,
      unit: 'Hari',
      unlockedDate: streak >= 14 ? 'Aktif' : null,
      ...createStatus(streak >= 14, false, false, `${14 - Math.min(14, streak)} hari lagi menuju 2 pekan`),
    },
    {
      id: 'streak_30',
      category: 'streak',
      categoryLabel: 'Rekor Streak',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'gold',
      xp: 250,
      title: 'Ksatria Sebulan Penuh',
      description: 'Hadir 30 hari sekolah tanpa terputus. Bukti dedikasi belajar pantang menyerah.',
      icon: '🛡️',
      isUnlocked: streak >= 30,
      currentProgress: Math.min(30, streak),
      maxProgress: 30,
      unit: 'Hari',
      unlockedDate: streak >= 30 ? 'Aktif' : null,
      ...createStatus(streak >= 30, false, false, `${30 - Math.min(30, streak)} hari lagi untuk sebulan penuh`),
    },
    {
      id: 'streak_60',
      category: 'streak',
      categoryLabel: 'Rekor Streak',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'diamond',
      xp: 600,
      title: 'Legenda Tanpa Alpa',
      description: 'Rekor luar biasa 60 hari berturut-turut hadir di sekolah tanpa pernah absen.',
      icon: '👑',
      isUnlocked: streak >= 60,
      currentProgress: Math.min(60, streak),
      maxProgress: 60,
      unit: 'Hari',
      unlockedDate: streak >= 60 ? 'Aktif' : null,
      ...createStatus(streak >= 60, false, false, 'Tantangan tertinggi kedisiplinan sekolah'),
    },

    // =========================================================================
    // 2. TINGKAT KELAS 7 (FASE ADAPTASI)
    // =========================================================================
    {
      id: 'gr7_adaptasi',
      category: 'grade',
      categoryLabel: 'Misi Kelas 7',
      gradeScope: '7',
      periodScope: 'all',
      tier: 'bronze',
      xp: 75,
      title: 'Siswa Baru Teladan',
      description: 'Berhasil beradaptasi sempurna di jenjang baru dengan hadir tertib di 10 hari pertama masuk sekolah.',
      icon: '🎒',
      isUnlocked: hadir >= 10,
      currentProgress: Math.min(10, hadir),
      maxProgress: 10,
      unit: 'Hari',
      unlockedDate: hadir >= 10 ? 'Fase Orientasi' : null,
      ...createStatus(
        hadir >= 10,
        false,
        grade > 7 && hadir < 10,
        'Hadir konsisten di masa pengenalan lingkungan sekolah',
        null,
        'Terlewat: Anda telah melewati masa orientasi jenjang kelas 7'
      ),
    },
    {
      id: 'gr7_fondasi',
      category: 'grade',
      categoryLabel: 'Misi Kelas 7',
      gradeScope: '7',
      periodScope: 'all',
      tier: 'silver',
      xp: 150,
      title: 'Fondasi Disiplin Belajar',
      description: 'Menjaga kehadiran 20 hari KBM di kelas 7 tanpa alpa.',
      icon: '🐣',
      isUnlocked: hadir >= 20,
      currentProgress: Math.min(20, hadir),
      maxProgress: 20,
      unit: 'Hari',
      unlockedDate: hadir >= 20 ? 'Tercapai' : null,
      ...createStatus(
        hadir >= 20,
        false,
        grade > 7 && hadir < 20,
        'Bangun fondasi kehadiran awal yang kokoh',
        null,
        'Terlewat: Telah melewati fase kelas 7'
      ),
    },
    {
      id: 'gr7_bintang',
      category: 'grade',
      categoryLabel: 'Misi Kelas 7',
      gradeScope: '7',
      periodScope: 'all',
      tier: 'gold',
      xp: 300,
      title: 'Bintang Muda Kelas 7',
      description: 'Raihan presensi terbaik tingkat kelas 7 dengan akumulasi kehadiran di atas 40 hari sekolah.',
      icon: '🌟',
      isUnlocked: hadir >= 40,
      currentProgress: Math.min(40, hadir),
      maxProgress: 40,
      unit: 'Hari',
      unlockedDate: hadir >= 40 ? 'Tercapai' : null,
      ...createStatus(
        hadir >= 40,
        false,
        grade > 7 && hadir < 40,
        'Puncak prestasi kehadiran tahun pertama',
        null,
        'Terlewat: Telah menyelesaikan jenjang kelas 7'
      ),
    },

    // =========================================================================
    // 3. TINGKAT KELAS 8 (FASE KONSISTENSI & TANGGUNG JAWAB)
    // =========================================================================
    {
      id: 'gr8_konsistensi',
      category: 'grade',
      categoryLabel: 'Misi Kelas 8',
      gradeScope: '8',
      periodScope: 'all',
      tier: 'bronze',
      xp: 100,
      title: 'Fase Keteguhan Kelas 8',
      description: 'Mempertahankan stabilitas presensi tanpa tergoda membolos di tingkat pertengahan.',
      icon: '🧭',
      isUnlocked: grade >= 8 && hadir >= 15,
      currentProgress: grade >= 8 ? Math.min(15, hadir) : 0,
      maxProgress: 15,
      unit: 'Hari',
      unlockedDate: grade >= 8 && hadir >= 15 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 8 && hadir >= 15,
        grade < 8,
        grade > 8 && hadir < 15,
        'Konsistensi kehadiran di jenjang kelas 8',
        'Akan Datang: Tersedia saat Anda naik ke Kelas 8',
        'Terlewat: Anda telah berada di jenjang Kelas 9'
      ),
    },
    {
      id: 'gr8_benteng',
      category: 'grade',
      categoryLabel: 'Misi Kelas 8',
      gradeScope: '8',
      periodScope: 'all',
      tier: 'silver',
      xp: 180,
      title: 'Benteng Kehadiran Kelas',
      description: 'Mencapai streak 25 hari beruntun saat aktif di jenjang kelas 8.',
      icon: '🏰',
      isUnlocked: grade >= 8 && streak >= 25,
      currentProgress: grade >= 8 ? Math.min(25, streak) : 0,
      maxProgress: 25,
      unit: 'Hari',
      unlockedDate: grade >= 8 && streak >= 25 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 8 && streak >= 25,
        grade < 8,
        grade > 8 && streak < 25,
        'Pertahankan streak 25 hari di kelas 8',
        'Akan Datang: Buka di Tingkat Kelas 8',
        'Terlewat: Periode jenjang kelas 8 telah berakhir'
      ),
    },
    {
      id: 'gr8_panutan',
      category: 'grade',
      categoryLabel: 'Misi Kelas 8',
      gradeScope: '8',
      periodScope: 'all',
      tier: 'gold',
      xp: 350,
      title: 'Panutan Tingkat Menengah',
      description: 'Menjadi teladan presensi bagi adik kelas 7 dengan akumulasi 50 hari hadir tepat waktu.',
      icon: '💎',
      isUnlocked: grade >= 8 && hadir >= 50,
      currentProgress: grade >= 8 ? Math.min(50, hadir) : 0,
      maxProgress: 50,
      unit: 'Hari',
      unlockedDate: grade >= 8 && hadir >= 50 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 8 && hadir >= 50,
        grade < 8,
        grade > 8 && hadir < 50,
        'Teladan kedisiplinan tingkat 8',
        'Akan Datang: Tersedia saat aktif di Kelas 8',
        'Terlewat: Masa jenjang kelas 8 telah usai'
      ),
    },

    // =========================================================================
    // 4. TINGKAT KELAS 9 (FASE KELULUSAN & KEPEMIMPINAN)
    // =========================================================================
    {
      id: 'gr9_fokus',
      category: 'grade',
      categoryLabel: 'Misi Kelas 9',
      gradeScope: '9',
      periodScope: 'all',
      tier: 'bronze',
      xp: 120,
      title: 'Fokus Ujian Akhir & Kelulusan',
      description: 'Hadir tanpa terputus di 20 hari sesi pengayaan dan persiapan asesmen akhir sekolah.',
      icon: '🎯',
      isUnlocked: grade >= 9 && hadir >= 20,
      currentProgress: grade >= 9 ? Math.min(20, hadir) : 0,
      maxProgress: 20,
      unit: 'Hari',
      unlockedDate: grade >= 9 && hadir >= 20 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 9 && hadir >= 20,
        grade < 9,
        false,
        'Persiapan penuh menyongsong kelulusan',
        `Akan Datang: Tersedia saat Anda menempuh Kelas 9 (Saat ini: Kelas ${grade})`
      ),
    },
    {
      id: 'gr9_senior',
      category: 'grade',
      categoryLabel: 'Misi Kelas 9',
      gradeScope: '9',
      periodScope: 'all',
      tier: 'silver',
      xp: 220,
      title: 'Senior Disiplin Paripurna',
      description: 'Menjaga streak 30 hari aktif di semester akhir sebelum pelepasan kelulusan.',
      icon: '🎖️',
      isUnlocked: grade >= 9 && streak >= 30,
      currentProgress: grade >= 9 ? Math.min(30, streak) : 0,
      maxProgress: 30,
      unit: 'Hari',
      unlockedDate: grade >= 9 && streak >= 30 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 9 && streak >= 30,
        grade < 9,
        false,
        'Ketertiban tingkat senior kelas 9',
        `Akan Datang: Khusus siswa tingkat 9 (Anda berada di Kelas ${grade})`
      ),
    },
    {
      id: 'gr9_legacy',
      category: 'grade',
      categoryLabel: 'Misi Kelas 9',
      gradeScope: '9',
      periodScope: 'all',
      tier: 'diamond',
      xp: 700,
      title: 'Warisan Abadi Alumni (Legacy)',
      description: 'Menuntaskan seluruh rangkaian KBM kelas 9 dengan rekor kehadiran sempurna di atas 98%.',
      icon: '🏆',
      isUnlocked: grade >= 9 && hadir >= 60,
      currentProgress: grade >= 9 ? Math.min(60, hadir) : 0,
      maxProgress: 60,
      unit: 'Hari',
      unlockedDate: grade >= 9 && hadir >= 60 ? 'Tercapai' : null,
      ...createStatus(
        grade >= 9 && hadir >= 60,
        grade < 9,
        false,
        'Mahakarya kehadiran sebelum kelulusan',
        `Akan Datang: Misi pamungkas kelulusan Kelas 9`
      ),
    },

    // =========================================================================
    // 5. MISI MUSIMAN KALENDER & SEMESTER (WAKTU AKTIF / AKAN DATANG / TERLEWAT)
    // =========================================================================
    {
      id: 'season_kickoff_ganjil',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'ganjil',
      tier: 'silver',
      xp: 160,
      title: `Kickoff Ganjil ${tahunAjaran}`,
      description: 'Hadir tepat waktu di 15 hari pertama masuk tahun ajaran baru semester ganjil (Bulan Juli - Agustus).',
      icon: '🍂',
      isUnlocked: hadir >= 15,
      currentProgress: Math.min(15, hadir),
      maxProgress: 15,
      unit: 'Hari',
      unlockedDate: hadir >= 15 ? 'Agustus 2026' : null,
      ...createStatus(
        hadir >= 15,
        false,
        hadir < 15, // Karena saat ini Oktober, periode Agustus sudah lewat
        'Kehadiran di awal tahun ajaran baru',
        null,
        'Terlewat: Batas akhir misi pada 31 Agustus 2026 (Kehadiran Anda belum mencapai 15 hari di periode tersebut)'
      ),
    },
    {
      id: 'season_september_gemilang',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'ganjil',
      tier: 'silver',
      xp: 180,
      title: `September Gemilang (${tahunAjaran})`,
      description: 'Hadir 100% tanpa alpa di sepanjang bulan September 2026.',
      icon: '🍁',
      isUnlocked: false,
      currentProgress: 12,
      maxProgress: 20,
      unit: 'Hari',
      unlockedDate: null,
      ...createStatus(
        false,
        false,
        true, // September 2026 sudah berlalu
        null,
        null,
        'Terlewat: Periode bulan September 2026 telah berakhir. Anda dapat mencoba misi musiman berikutnya!'
      ),
    },
    {
      id: 'season_oktober_prestasi',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'ganjil',
      tier: 'gold',
      xp: 220,
      title: `Oktober Sumpah Pemuda (${tahunAjaran})`,
      description: 'Menjaga rekor kehadiran penuh di bulan Oktober (Pekan Semangat Sumpah Pemuda).',
      icon: '🇮🇩',
      isUnlocked: streak >= 12,
      currentProgress: Math.min(18, Math.max(streak, 10)),
      maxProgress: 18,
      unit: 'Hari',
      unlockedDate: streak >= 12 ? 'Oktober 2026' : null,
      ...createStatus(
        streak >= 12,
        false,
        false,
        'Sedang Berlangsung: Berakhir pada 31 Oktober 2026'
      ),
    },
    {
      id: 'season_desember',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'ganjil',
      tier: 'gold',
      xp: 300,
      title: `Desember Sempurna (${tahunAjaran})`,
      description: 'Hadir 100% di seluruh jadwal KBM bulan penutup semester ganjil (1 - 20 Desember 2026) tanpa absen.',
      icon: '❄️',
      isUnlocked: false,
      currentProgress: 0,
      maxProgress: 18,
      unit: 'Hari',
      unlockedDate: null,
      ...createStatus(
        false,
        true, // Saat ini masih Oktober, Desember adalah Akan Datang
        false,
        null,
        'Akan Datang: Dimulai pada 1 Desember 2026 (Sekitar 44 hari lagi)',
        null
      ),
    },
    {
      id: 'season_final_lap',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'ganjil',
      tier: 'gold',
      xp: 280,
      title: `Pekan Asesmen Akhir Semester`,
      description: 'Hadir tanpa terlewat satu sesi pun selama pekan Asesmen Sumatif Akhir Semester Ganjil.',
      icon: '📝',
      isUnlocked: false,
      currentProgress: 0,
      maxProgress: 8,
      unit: 'Hari',
      unlockedDate: null,
      ...createStatus(
        false,
        true,
        false,
        null,
        'Akan Datang: Dijadwalkan pada pekan ujian akhir semester (Desember 2026)'
      ),
    },
    {
      id: 'season_genap_resolusi',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'genap',
      tier: 'silver',
      xp: 160,
      title: `Resolusi Genap ${tahunAjaran}`,
      description: 'Memulai awal tahun baru dengan kehadiran konsisten tanpa alpa di bulan Januari 2027.',
      icon: '🌱',
      isUnlocked: false,
      currentProgress: 0,
      maxProgress: 15,
      unit: 'Hari',
      unlockedDate: null,
      ...createStatus(
        false,
        true, // Semester genap belum dimulai
        false,
        null,
        'Akan Datang: Tersedia saat Semester Genap dimulai (Januari 2027)'
      ),
    },
    {
      id: 'season_ramadhan_berkah',
      category: 'seasonal',
      categoryLabel: 'Misi Musiman',
      gradeScope: 'all',
      periodScope: 'genap',
      tier: 'diamond',
      xp: 450,
      title: `Pejuang Ramadhan & Pagi`,
      description: 'Tetap hadir tepat waktu dan bersemangat di seluruh jadwal KBM bulan suci Ramadhan.',
      icon: '🌙',
      isUnlocked: false,
      currentProgress: 0,
      maxProgress: 20,
      unit: 'Hari',
      unlockedDate: null,
      ...createStatus(
        false,
        true,
        false,
        null,
        'Akan Datang: Misi khusus musim puasa Ramadhan 1448 H (Maret 2027)'
      ),
    },
    {
      id: 'season_semester_emas',
      category: 'seasonal',
      categoryLabel: 'Misi Semester',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'diamond',
      xp: 500,
      title: `Semester Emas ${tahunAjaran}`,
      description: 'Menuntaskan satu semester penuh dengan rasio kehadiran di atas 95%.',
      icon: '🏅',
      isUnlocked: hadir >= 45,
      currentProgress: Math.min(45, hadir),
      maxProgress: 45,
      unit: 'Hari',
      unlockedDate: hadir >= 45 ? 'Tercapai' : null,
      ...createStatus(
        hadir >= 45,
        false,
        false,
        `Akumulasi kehadiran Anda saat ini: ${hadir} hari (target: 45 hari)`
      ),
    },

    // =========================================================================
    // 6. PERINGKAT & KETEPATAN WAKTU
    // =========================================================================
    {
      id: 'rank_top3',
      category: 'leaderboard',
      categoryLabel: 'Peringkat Kelas',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'gold',
      xp: 300,
      title: 'Tiga Besar Terdisiplin',
      description: 'Berhasil menembus Peringkat Top 3 pada klasemen kehadiran kelas Anda.',
      icon: '🥇',
      isUnlocked: rank <= 3,
      currentProgress: rank <= 3 ? 1 : 0,
      maxProgress: 1,
      unit: 'Peringkat',
      unlockedDate: rank <= 3 ? `Peringkat #${rank}` : null,
      ...createStatus(
        rank <= 3,
        false,
        false,
        rank <= 3 ? `Posisi Anda saat ini: #${rank}` : `Tingkatkan streak untuk menembus Top 3 (Posisi Anda: #${rank})`
      ),
    },
    {
      id: 'punctuality_fajar',
      category: 'punctuality',
      categoryLabel: 'Ketepatan Waktu',
      gradeScope: 'all',
      periodScope: 'all',
      tier: 'silver',
      xp: 140,
      title: 'Pelopor Pagi (Early Bird)',
      description: 'Melakukan absensi 15 menit lebih awal sebelum bel masuk berbunyi.',
      icon: '🌅',
      isUnlocked: true,
      currentProgress: 10,
      maxProgress: 10,
      unit: 'Kali',
      unlockedDate: 'Aktif',
      ...createStatus(true, false, false, 'Tercapai: Disiplin datang lebih awal'),
    },
  ];

  return rawList;
}

/**
 * Menghitung Akumulasi XP dan Badge Terbuka untuk seorang Siswa
 */
export function calculateStudentAchievementsSummary(student, options = {}) {
  const gradeStr = (student?.kelas?.nama_kelas || student?.id_kelas || '').toUpperCase();
  let grade = 7;
  if (gradeStr.includes('IX') || gradeStr.includes('9')) grade = 9;
  else if (gradeStr.includes('VIII') || gradeStr.includes('8')) grade = 8;

  const streak = Number(student?.periodStreak !== undefined ? student.periodStreak : student?.streak_sekarang) || 0;
  const hadir = Number(student?.total_hadir !== undefined ? student.total_hadir : Math.max(streak, 12)) || 0;
  const rank = Number(student?.rank) || 1;

  const achievements = getMasterAchievements({
    studentGrade: grade,
    tahunAjaran: options.tahunAjaran || '2026/2027',
    semesterAktif: options.semesterAktif || 'Ganjil',
    studentStreak: streak,
    studentTotalHadir: hadir,
    studentRank: rank,
  });

  const unlockedList = achievements.filter((a) => a.isUnlocked);
  const totalXp = unlockedList.reduce((acc, curr) => acc + (curr.xp || 0), 0);
  const levelInfo = calculateStudentLevel(totalXp);

  return {
    student,
    grade,
    achievements,
    unlockedList,
    unlockedCount: unlockedList.length,
    totalCount: achievements.length,
    percentUnlocked: Math.round((unlockedList.length / achievements.length) * 100),
    totalXp,
    ...levelInfo,
  };
}

/**
 * Rekomendasi Narasi Catatan Rapor Sikap Kedisiplinan Berdasarkan Pencapaian Siswa
 */
export function generateReportComment(summary) {
  const { student, level, totalXp, unlockedList } = summary;
  const streak = student?.streak_sekarang || 0;
  const nama = student?.nama || 'Siswa';

  const hasDiamond = unlockedList.some((b) => b.tier === 'diamond');
  const hasGold = unlockedList.some((b) => b.tier === 'gold');

  if (hasDiamond || streak >= 40) {
    return `Ananda ${nama} menunjukkan karakter kedisiplinan dan dedikasi luar biasa (Level ${level} • ${totalXp} XP Prestasi). Memiliki konsistensi kehadiran ${streak} hari berturut-turut tanpa pernah alpa, serta menjadi panutan bagi teman-temannya. Pertahankan semangat belajar yang membanggakan ini!`;
  }
  if (hasGold || streak >= 20) {
    return `Ananda ${nama} menunjukkan sikap disiplin dan tanggung jawab kehadiran yang sangat baik (Level ${level} • ${totalXp} XP). Sangat tertib mengikuti jam pelajaran dan mampu mempertahankan kehadiran konsisten. Sangat diapresiasi!`;
  }
  if (streak >= 7) {
    return `Ananda ${nama} memiliki komitmen kehadiran yang baik dan aktif mengikuti kegiatan belajar mengajar (Level ${level} • ${totalXp} XP). Tingkatkan terus ketepatan waktu hadir setiap pagi.`;
  }
  return `Ananda ${nama} mengikuti kegiatan sekolah dengan cukup baik. Disarankan untuk terus meningkatkan kedisiplinan dan menjaga konsistensi kehadiran di semester mendatang.`;
}

// =========================================================================
// SISTEM QUEST BUILDER (MISI KUSTOM ADMIN)
// =========================================================================

export const MONTH_OPTIONS = [
  { value: 'all', label: 'Sepanjang Semester (Bebas Bulan)' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export const POINT_STANDARDS = {
  monthly_presence: {
    label: 'Misi Bulanan Fleksibel (18 Hari / Sesuai Kaldik)',
    tier: 'gold',
    tierLabel: '🥇 Gold',
    xp: 500,
    target: 18,
    unit: 'Hari',
    icon: '🗓️',
  },
  semester_kickoff: {
    label: 'Kickoff Awal Semester (7 Hari)',
    tier: 'silver',
    tierLabel: '🥈 Silver',
    xp: 250,
    target: 7,
    unit: 'Hari',
    icon: '🚀',
  },
  semester_closing: {
    label: 'Penutupan Semester (15 Hari)',
    tier: 'gold',
    tierLabel: '🥇 Gold',
    xp: 600,
    target: 15,
    unit: 'Hari',
    icon: '🏅',
  },
  semester_full: {
    label: 'Mahkota 1 Semester Penuh (40 Hari)',
    tier: 'diamond',
    tierLabel: '💎 Diamond',
    xp: 1000,
    target: 40,
    unit: 'Hari',
    icon: '👑',
  },
  streak_milestone: {
    label: 'Rekor Streak Ketahanan (20 Hari)',
    tier: 'diamond',
    tierLabel: '💎 Diamond',
    xp: 600,
    target: 20,
    unit: 'Hari',
    icon: '🔥',
  },
  early_bird: {
    label: 'Fajar Disiplin Pagi (10 Kali)',
    tier: 'silver',
    tierLabel: '🥈 Silver',
    xp: 250,
    target: 10,
    unit: 'Kali',
    icon: '🌅',
  },
};

/**
 * Menghitung otomatis Tier dan XP yang konsisten berdasarkan target hari
 */
export function calculateConsistentReward(targetDays = 18, type = 'monthly_presence') {
  const days = Number(targetDays) || 18;
  if (type === 'semester_full' || days >= 35) {
    return { tier: 'diamond', xp: 1000, tierLabel: '💎 Diamond' };
  }
  if (days >= 16) {
    return { tier: 'gold', xp: 500, tierLabel: '🥇 Gold' };
  }
  if (days >= 10) {
    return { tier: 'silver', xp: 300, tierLabel: '🥈 Silver' };
  }
  return { tier: 'bronze', xp: 150, tierLabel: '🥉 Bronze' };
}

export const MISSION_TEMPLATES = [
  {
    type: 'monthly_presence',
    label: 'Tantangan Kehadiran Bulanan (Standar 500 XP)',
    defaultTitle: 'Kehadiran Prima Bulan [Bulan]',
    defaultDesc: 'Hadir aktif di seluruh KBM minimal [Target] hari selama bulan [Bulan] [Tahun] tanpa alpa.',
    icon: '🗓️',
    tier: 'gold',
    xp: 500,
    unit: 'Hari',
    defaultTarget: 18,
    category: 'seasonal',
    categoryLabel: 'Misi Musim & Bulan',
  },
  {
    type: 'semester_kickoff',
    label: 'Kickoff Awal Masuk Semester (250 XP)',
    defaultTitle: 'Resolusi Awal Semester [Semester] ([Tahun])',
    defaultDesc: 'Disiplin hadir tepat waktu tanpa alpa sejak hari pertama semester [Semester] [Tahun] dimulai.',
    icon: '🚀',
    tier: 'silver',
    xp: 250,
    unit: 'Hari',
    defaultTarget: 7,
    category: 'seasonal',
    categoryLabel: 'Misi Semester',
  },
  {
    type: 'semester_closing',
    label: 'Penutupan & Evaluasi Semester (600 XP)',
    defaultTitle: 'Puncak Penutupan Semester [Semester]',
    defaultDesc: 'Mempertahankan presensi sempurna minimal [Target] hari di penutupan semester [Semester] [Tahun].',
    icon: '🏅',
    tier: 'gold',
    xp: 600,
    unit: 'Hari',
    defaultTarget: 15,
    category: 'seasonal',
    categoryLabel: 'Misi Semester',
  },
  {
    type: 'semester_full',
    label: 'Mahkota 1 Semester Penuh (1000 XP)',
    defaultTitle: 'Mahkota Kehadiran Semester [Semester] ([Tahun])',
    defaultDesc: 'Kehadiran konsisten luar biasa minimal [Target] hari sekolah sepanjang Semester [Semester] penuh!',
    icon: '👑',
    tier: 'diamond',
    xp: 1000,
    unit: 'Hari',
    defaultTarget: 40,
    category: 'seasonal',
    categoryLabel: 'Misi Semester',
  },
  {
    type: 'streak_milestone',
    label: 'Rekor Ketahanan Streak Khusus (600 XP)',
    defaultTitle: 'Tantangan Streak [Target] Hari',
    defaultDesc: 'Mencapai ketahanan streak hadir berturut-turut selama minimal [Target] hari sekolah tanpa alpa.',
    icon: '🔥',
    tier: 'diamond',
    xp: 600,
    unit: 'Hari',
    defaultTarget: 20,
    category: 'streak',
    categoryLabel: 'Rekor Streak',
  },
  {
    type: 'early_bird',
    label: 'Disiplin Waktu & Fajar Pagi (250 XP)',
    defaultTitle: 'Fajar Disiplin Bulan [Bulan]',
    defaultDesc: 'Melakukan absensi 15 menit sebelum bel masuk berbunyi sebanyak [Target] kali di bulan [Bulan] [Tahun].',
    icon: '🌅',
    tier: 'silver',
    xp: 250,
    unit: 'Kali',
    defaultTarget: 10,
    category: 'punctuality',
    categoryLabel: 'Ketepatan Waktu',
  },
];

/**
 * Menghitung Jumlah Hari Efektif KBM Sekolah dalam Satu Bulan Kalender
 * Berdasarkan Kalender Akademik (Senin - Jumat, mengecualikan Sabtu/Minggu & tanggal libur)
 */
export function calculateEffectiveSchoolDays(year, month, holidays = []) {
  const y = Number(year) || new Date().getFullYear();
  let m = typeof month === 'string' ? parseInt(month, 10) : Number(month);
  if (!m || m < 1 || m > 12) m = new Date().getMonth() + 1;

  const daysInMonth = new Date(y, m, 0).getDate();
  const padMonth = String(m).padStart(2, '0');

  // Kumpulkan tanggal libur sekolah / nasional
  const holidayDates = new Set();
  (holidays || []).forEach((h) => {
    if (h && h.tanggal && h.is_libur !== false) {
      holidayDates.add(h.tanggal);
    }
  });

  let effectiveDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0: Minggu, 6: Sabtu

    // Libur akhir pekan
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = `${y}-${padMonth}-${String(d).padStart(2, '0')}`;
    // Libur kalender akademik
    if (holidayDates.has(dateStr)) continue;

    effectiveDays++;
  }

  return effectiveDays;
}

/**
 * Menentukan Target Kehadiran Bulanan yang Adaptif & Adil terhadap Kalender Akademik
 * Jika hari efektif di Kaldik < 18 hari (misal Desember, Juli, atau libur hari raya),
 * target otomatis disesuaikan dengan seluruh hari sekolah yang ada di bulan tersebut.
 */
export function getAdaptiveMonthlyTarget(year, month, holidays = [], standardTarget = 18) {
  const effectiveDays = calculateEffectiveSchoolDays(year, month, holidays);

  if (effectiveDays > 0 && effectiveDays < standardTarget) {
    return {
      target: effectiveDays,
      effectiveDays,
      isAdapted: true,
      conditionText: `Hadir minimal ${effectiveDays} hari (100% Hari Efektif KBM Kalender Akademik)`,
      note: `Bulan ini memiliki ${effectiveDays} hari efektif sekolah. Target otomatis disesuaikan agar adil bagi siswa.`,
    };
  }

  return {
    target: standardTarget,
    effectiveDays: effectiveDays || 22,
    isAdapted: false,
    conditionText: `Hadir minimal ${standardTarget} hari sekolah (Toleransi izin/sakit ${Math.max(0, (effectiveDays || 22) - standardTarget)} hari)`,
    note: `Target standar ${standardTarget} hari dari ${effectiveDays || 22} hari efektif KBM.`,
  };
}

/**
 * Otomatis menghasilkan Paket Misi Kalender Lengkap Semester dengan Target Adaptif & Poin Konsisten
 */
export function generateDefaultSemesterPreset(tahunAjaran = '2026/2027', semester = 'Ganjil', holidays = []) {
  const isGanjil = (semester || '').toLowerCase() === 'ganjil';
  const year1 = (tahunAjaran || '2026/2027').split('/')[0] || '2026';
  const year2 = (tahunAjaran || '2026/2027').split('/')[1] || '2027';

  if (isGanjil) {
    const t07 = getAdaptiveMonthlyTarget(year1, '07', holidays, 14);
    const t08 = getAdaptiveMonthlyTarget(year1, '08', holidays, 18);
    const t09 = getAdaptiveMonthlyTarget(year1, '09', holidays, 18);
    const t10 = getAdaptiveMonthlyTarget(year1, '10', holidays, 18);
    const t11 = getAdaptiveMonthlyTarget(year1, '11', holidays, 18);
    const t12 = getAdaptiveMonthlyTarget(year1, '12', holidays, 14);

    return [
      {
        id: `preset_ganjil_07_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '07',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Pionir Juli (${tahunAjaran})`,
        description: `Presensi aktif minimal ${t07.target} hari (atau seluruh ${t07.effectiveDays} hari efektif KBM) di masa orientasi sekolah bulan Juli ${year1}.`,
        tier: 'silver',
        xp: 350,
        target: t07.target,
        maxProgress: t07.target,
        effectiveDays: t07.effectiveDays,
        unit: 'Hari',
        icon: '🎒',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_08_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '08',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Semangat Merdeka Agustus (${tahunAjaran})`,
        description: `Kehadiran konsisten minimal ${t08.target} hari (dari ${t08.effectiveDays} hari efektif) selama bulan Kemerdekaan Agustus ${year1}.`,
        tier: 'gold',
        xp: 500,
        target: t08.target,
        maxProgress: t08.target,
        effectiveDays: t08.effectiveDays,
        unit: 'Hari',
        icon: '🇮🇩',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_09_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '09',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Konsistensi Belajar September (${tahunAjaran})`,
        description: `Mempertahankan ketertiban hadir sekolah minimal ${t09.target} hari (dari ${t09.effectiveDays} hari aktif Kaldik) di bulan September ${year1}.`,
        tier: 'gold',
        xp: 500,
        target: t09.target,
        maxProgress: t09.target,
        effectiveDays: t09.effectiveDays,
        unit: 'Hari',
        icon: '📚',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_10_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '10',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Fokus Disiplin Oktober (${tahunAjaran})`,
        description: `Hadir aktif minimal ${t10.target} hari (dari ${t10.effectiveDays} hari efektif) di tengah periode belajar bulan Oktober ${year1}.`,
        tier: 'gold',
        xp: 500,
        target: t10.target,
        maxProgress: t10.target,
        effectiveDays: t10.effectiveDays,
        unit: 'Hari',
        icon: '🎯',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_11_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '11',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Sprint Tangguh November (${tahunAjaran})`,
        description: `Memaksimalkan kehadiran minimal ${t11.target} hari menjelang penilaian akhir semester di bulan November ${year1}.`,
        tier: 'gold',
        xp: 500,
        target: t11.target,
        maxProgress: t11.target,
        effectiveDays: t11.effectiveDays,
        unit: 'Hari',
        icon: '⚡',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_12_${year1}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '12',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Puncak Prestasi Desember (${tahunAjaran})`,
        description: `Hadir penuh minimal ${t12.target} hari atau 100% dari seluruh hari efektif sekolah (${t12.effectiveDays} hari) hingga pembagian rapor bulan Desember ${year1}.`,
        tier: 'gold',
        xp: 600,
        target: t12.target,
        maxProgress: t12.target,
        effectiveDays: t12.effectiveDays,
        unit: 'Hari',
        icon: '🏆',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_ganjil_full_${year1}`,
        type: 'semester_full',
        templateType: 'semester_full',
        month: 'all',
        year: year1,
        periodScope: 'ganjil',
        tahunAjaran,
        gradeScope: 'all',
        title: `Mahkota Emas Semester Ganjil (${tahunAjaran})`,
        description: `Kehadiran konsisten luar biasa minimal 40 hari sekolah sepanjang Semester Ganjil penuh!`,
        tier: 'diamond',
        xp: 1000,
        target: 40,
        maxProgress: 40,
        unit: 'Hari',
        icon: '👑',
        category: 'seasonal',
        categoryLabel: `Semester Ganjil ${tahunAjaran}`,
        isActive: true,
      },
    ];
  } else {
    const t01 = getAdaptiveMonthlyTarget(year2, '01', holidays, 18);
    const t02 = getAdaptiveMonthlyTarget(year2, '02', holidays, 18);
    const t03 = getAdaptiveMonthlyTarget(year2, '03', holidays, 16);
    const t04 = getAdaptiveMonthlyTarget(year2, '04', holidays, 16);
    const t05 = getAdaptiveMonthlyTarget(year2, '05', holidays, 18);
    const t06 = getAdaptiveMonthlyTarget(year2, '06', holidays, 14);

    return [
      {
        id: `preset_genap_01_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '01',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Resolusi Awal Januari (${tahunAjaran})`,
        description: `Hadir aktif sejak hari pertama masuk semester genap minimal ${t01.target} hari (dari ${t01.effectiveDays} hari efektif) di bulan Januari ${year2}.`,
        tier: 'gold',
        xp: 500,
        target: t01.target,
        maxProgress: t01.target,
        effectiveDays: t01.effectiveDays,
        unit: 'Hari',
        icon: '🚀',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_02_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '02',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Disiplin Tangguh Februari (${tahunAjaran})`,
        description: `Kehadiran penuh minimal ${t02.target} hari (dari ${t02.effectiveDays} hari efektif) tanpa alpa di bulan Februari ${year2}.`,
        tier: 'gold',
        xp: 500,
        target: t02.target,
        maxProgress: t02.target,
        effectiveDays: t02.effectiveDays,
        unit: 'Hari',
        icon: '🗓️',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_03_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '03',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Karakter Mulia Maret (${tahunAjaran})`,
        description: `Ketahanan disiplin kehadiran minimal ${t03.target} hari (atau seluruh ${t03.effectiveDays} hari efektif KBM) di bulan Maret ${year2}.`,
        tier: 'gold',
        xp: 500,
        target: t03.target,
        maxProgress: t03.target,
        effectiveDays: t03.effectiveDays,
        unit: 'Hari',
        icon: '🌙',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_04_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '04',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Semangat Kebersamaan April (${tahunAjaran})`,
        description: `Presensi tertib minimal ${t04.target} hari (dari ${t04.effectiveDays} hari aktif) di bulan April ${year2}.`,
        tier: 'gold',
        xp: 500,
        target: t04.target,
        maxProgress: t04.target,
        effectiveDays: t04.effectiveDays,
        unit: 'Hari',
        icon: '🤝',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_05_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '05',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Keteguhan Ujian Mei (${tahunAjaran})`,
        description: `Hadir penuh minimal ${t05.target} hari (dari ${t05.effectiveDays} hari efektif) di pekan penilaian kenaikan kelas Mei ${year2}.`,
        tier: 'gold',
        xp: 500,
        target: t05.target,
        maxProgress: t05.target,
        effectiveDays: t05.effectiveDays,
        unit: 'Hari',
        icon: '✍️',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_06_${year2}`,
        type: 'monthly_presence',
        templateType: 'monthly_presence',
        month: '06',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Mahkota Kenaikan Kelas Juni (${tahunAjaran})`,
        description: `Penutupan tahun ajaran sempurna minimal ${t06.target} hari atau seluruh ${t06.effectiveDays} hari efektif KBM hingga penerimaan rapor Juni ${year2}.`,
        tier: 'gold',
        xp: 600,
        target: t06.target,
        maxProgress: t06.target,
        effectiveDays: t06.effectiveDays,
        unit: 'Hari',
        icon: '🏅',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
      {
        id: `preset_genap_full_${year2}`,
        type: 'semester_full',
        templateType: 'semester_full',
        month: 'all',
        year: year2,
        periodScope: 'genap',
        tahunAjaran,
        gradeScope: 'all',
        title: `Mahkota Utama Semester Genap (${tahunAjaran})`,
        description: `Dedikasi presensi luar biasa minimal 40 hari aktif sepanjang Semester Genap penuh!`,
        tier: 'diamond',
        xp: 1000,
        target: 40,
        maxProgress: 40,
        unit: 'Hari',
        icon: '👑',
        category: 'seasonal',
        categoryLabel: `Semester Genap ${tahunAjaran}`,
        isActive: true,
      },
    ];
  }
}

/**
 * Mengambil daftar misi kustom yang dibuat oleh Admin
 */
export function getCustomMissions() {
  try {
    const raw = localStorage.getItem('siak_custom_achievements');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Menyimpan daftar misi kustom Admin ke localStorage & memicu event update
 */
export function saveCustomMissions(missions) {
  try {
    localStorage.setItem('siak_custom_achievements', JSON.stringify(missions));
    window.dispatchEvent(new Event('siak_custom_achievements_updated'));
    return true;
  } catch (e) {
    console.error('Error saving custom missions:', e);
    return false;
  }
}

/**
 * Menghitung Progres & Status Misi Kustom untuk Siswa
 * Dilengkapi evaluasi adil berbasis Kalender Akademik (Kaldik)
 */
export function evaluateCustomMissionForStudent(mission, studentContext = {}) {
  const {
    attendanceHistory = [],
    effectiveStreak = 0,
    studentGrade = 7,
    currentDate = new Date(),
    semesterAktif = 'Ganjil',
    tahunAjaran = '2026/2027',
    holidays = [],
  } = studentContext;

  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1; // 1-12
  const target = Number(mission.maxProgress) || Number(mission.defaultTarget) || 10;
  const missionMonth = mission.month && mission.month !== 'all' ? mission.month : null;
  const missionYear = Number(mission.year) || currentYear;

  // Hitung jumlah hari efektif di bulan kalender ini jika terkait bulan tertentu
  let effectiveDaysInMonth = 0;
  if (missionMonth) {
    effectiveDaysInMonth = calculateEffectiveSchoolDays(missionYear, missionMonth, holidays);
  }

  // 1. Hitung Progres Siswa
  let currentProgress = 0;
  if (mission.type === 'streak_milestone') {
    currentProgress = Math.min(target, effectiveStreak);
  } else if (mission.type === 'early_bird') {
    const matchingEarly = attendanceHistory.filter((a) => {
      const matchMonth = missionMonth ? a.tanggal && a.tanggal.includes(`-${missionMonth}-`) : true;
      const isEarly = a.waktu && a.waktu <= '07:15';
      const isPresent = a.status === 'H';
      return matchMonth && isEarly && isPresent;
    });
    currentProgress = Math.min(target, matchingEarly.length);
  } else {
    // Default presensi hadir (monthly_presence, kickoff, closing, etc.)
    const presentDates = new Set(
      attendanceHistory
        .filter((a) => {
          const matchMonth = missionMonth ? a.tanggal && a.tanggal.includes(`-${missionMonth}-`) : true;
          const isPresent = a.status === 'H';
          return matchMonth && isPresent;
        })
        .map((a) => a.tanggal)
    );
    currentProgress = Math.min(target, presentDates.size);
  }

  // Syarat Tercapai yang Adil:
  // a. Siswa memenuhi target angka (misal >= 18 hari atau target adaptif)
  // b. ATAU siswa hadir di seluruh hari efektif KBM bulan tersebut (100% kehadiran kalender)
  const isFullAttendance = effectiveDaysInMonth > 0 && currentProgress >= effectiveDaysInMonth;
  const isUnlocked = currentProgress >= target || isFullAttendance;

  // 2. Tentukan Status Temporal (unlocked, upcoming, missed, active)
  let missionStatus = 'active';
  let missionStatusLabel = 'Sedang Berjalan';
  let missionStatusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
  let missionStatusReason = 'Misi kustom aktif dan dapat dicapai sekarang.';

  if (isUnlocked) {
    missionStatus = 'unlocked';
    missionStatusLabel = 'Terbuka';
    missionStatusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    missionStatusReason = 'Lencana kustom berhasil diraih!';
  } else if (missionMonth) {
    const mNum = parseInt(missionMonth, 10);
    const monthLabel = MONTH_OPTIONS.find((m) => m.value === missionMonth)?.label || missionMonth;

    if (missionYear > currentYear || (missionYear === currentYear && mNum > currentMonthNum)) {
      missionStatus = 'upcoming';
      missionStatusLabel = 'Akan Datang';
      missionStatusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
      missionStatusReason = `Dibuka pada bulan ${monthLabel} ${missionYear}.`;
    } else if (missionYear < currentYear || (missionYear === currentYear && mNum < currentMonthNum)) {
      missionStatus = 'missed';
      missionStatusLabel = 'Terlewat';
      missionStatusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      missionStatusReason = `Masa misi bulan ${monthLabel} ${missionYear} telah berakhir.`;
    }
  } else if (mission.periodScope && mission.periodScope !== 'all_time' && mission.periodScope !== 'all') {
    if (mission.periodScope.toLowerCase() === 'genap' && semesterAktif.toLowerCase() === 'ganjil') {
      missionStatus = 'upcoming';
      missionStatusLabel = 'Akan Datang';
      missionStatusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
      missionStatusReason = `Tersedia saat Semester Genap ${tahunAjaran} dimulai.`;
    } else if (mission.periodScope.toLowerCase() === 'ganjil' && semesterAktif.toLowerCase() === 'genap') {
      missionStatus = 'missed';
      missionStatusLabel = 'Terlewat';
      missionStatusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      missionStatusReason = `Periode Semester Ganjil ${tahunAjaran} telah selesai.`;
    }
  }

  // Evaluasi Jenjang Kelas
  if (!isUnlocked && mission.gradeScope && mission.gradeScope !== 'all') {
    const targetG = Number(mission.gradeScope);
    if (targetG > studentGrade) {
      missionStatus = 'upcoming';
      missionStatusLabel = 'Akan Datang';
      missionStatusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
      missionStatusReason = `Tersedia saat Anda naik ke Kelas ${targetG}.`;
    } else if (targetG < studentGrade) {
      missionStatus = 'missed';
      missionStatusLabel = 'Terlewat';
      missionStatusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      missionStatusReason = `Telah melewati masa jenjang Kelas ${targetG}.`;
    }
  }

  return {
    ...mission,
    isCustom: true,
    currentProgress,
    maxProgress: target,
    isUnlocked,
    missionStatus,
    missionStatusLabel,
    missionStatusBadgeClass,
    missionStatusReason,
    unlockedDate: isUnlocked ? 'Tercapai' : null,
  };
}

/**
 * Menghitung Total Hari Efektif Satu Semester Berdasarkan Kalender Akademik
 */
export function calculateSemesterEffectiveDays(tahunAjaran = '2026/2027', semester = 'Ganjil', holidays = []) {
  const isGanjil = (semester || '').toLowerCase() === 'ganjil';
  const year1 = (tahunAjaran || '2026/2027').split('/')[0] || '2026';
  const year2 = (tahunAjaran || '2026/2027').split('/')[1] || '2027';
  const months = isGanjil ? ['07', '08', '09', '10', '11', '12'] : ['01', '02', '03', '04', '05', '06'];
  const yr = isGanjil ? year1 : year2;

  let totalEffectiveDays = 0;
  const breakdown = {};
  months.forEach((m) => {
    const days = calculateEffectiveSchoolDays(yr, m, holidays);
    totalEffectiveDays += days;
    breakdown[m] = days;
  });

  return { totalEffectiveDays, breakdown, year: yr, months };
}

/**
 * Menghitung Hari Efektif yang Telah Berjalan Hingga Tanggal Tertentu
 */
export function calculateElapsedEffectiveSchoolDays(tahunAjaran = '2026/2027', semester = 'Ganjil', holidays = [], targetDate = new Date()) {
  const isGanjil = (semester || '').toLowerCase() === 'ganjil';
  const year1 = Number((tahunAjaran || '2026/2027').split('/')[0]) || 2026;
  const year2 = Number((tahunAjaran || '2026/2027').split('/')[1]) || 2027;

  const startYear = isGanjil ? year1 : year2;
  const startMonth = isGanjil ? 6 : 0; // 6 = Juli, 0 = Januari
  const startDate = new Date(startYear, startMonth, 1);

  const endYear = isGanjil ? year1 : year2;
  const endMonth = isGanjil ? 11 : 5; // 11 = Desember, 5 = Juni
  const endDate = new Date(endYear, endMonth + 1, 0);

  let checkDate = new Date(targetDate);
  if (checkDate < startDate) return 0;
  if (checkDate > endDate) checkDate = endDate;

  const holidayDates = new Set();
  (holidays || []).forEach((h) => {
    if (h && h.tanggal && h.is_libur !== false) {
      holidayDates.add(h.tanggal);
    }
  });

  let elapsedDays = 0;
  const cur = new Date(startDate);
  while (cur <= checkDate) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (!holidayDates.has(dateStr)) {
        elapsedDays++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return elapsedDays;
}

/**
 * Menghitung Agregat dan Klasemen Kelas Terdisiplin (% Kehadiran & Kekompakan)
 * Selaras dengan Kalender Akademik dan Rekor Streak Murid
 */
export function calculateClassDisciplineLeaderboard(classes = [], students = [], holidays = [], options = {}) {
  const { 
    tahunAjaran = '2026/2027', 
    semester = 'Ganjil', 
    targetDate = new Date(),
    attendanceRecords = [] 
  } = options;
  const elapsedDays = Math.max(1, calculateElapsedEffectiveSchoolDays(tahunAjaran, semester, holidays, targetDate));
  const semesterDays = calculateSemesterEffectiveDays(tahunAjaran, semester, holidays);

  // Jika attendanceRecords diberikan, buat map tanggal unik hadir ('H' atau 'T') per siswa
  const studentRealAttendanceMap = new Map();
  if (Array.isArray(attendanceRecords) && attendanceRecords.length > 0) {
    attendanceRecords.forEach((rec) => {
      if (!rec || !rec.nis || !rec.tanggal) return;
      const st = String(rec.status || '').toUpperCase();
      if (st === 'H' || st === 'T') {
        if (!studentRealAttendanceMap.has(String(rec.nis))) {
          studentRealAttendanceMap.set(String(rec.nis), new Set());
        }
        studentRealAttendanceMap.get(String(rec.nis)).add(rec.tanggal);
      }
    });
  }

  const sortedClasses = classes.map((c) => {
    const classStudents = students.filter((s) => String(s.id_kelas) === String(c.id_kelas));
    const totalStudents = classStudents.length;

    if (totalStudents === 0) {
      return {
        ...c,
        totalStudents: 0,
        percentage: 0,
        avgActiveStreak: 0,
        avgRecordStreak: 0,
        totalActiveStreak: 0,
        perfectStreakCount: 0,
        scoreIndex: 0,
        elapsedDays,
        totalSemesterDays: semesterDays.totalEffectiveDays,
      };
    }

    const totalActiveStreak = classStudents.reduce((acc, s) => acc + (Number(s.streak_sekarang) || 0), 0);
    const totalRecordStreak = classStudents.reduce((acc, s) => acc + (Number(s.streak_tertinggi || s.streak_sekarang) || 0), 0);
    const avgActiveStreak = Math.round((totalActiveStreak / totalStudents) * 10) / 10;
    const avgRecordStreak = Math.round((totalRecordStreak / totalStudents) * 10) / 10;

    let percentage = 0;
    if (studentRealAttendanceMap.size > 0) {
      // 1. Perhitungan 100% Empiris Berbasis Riwayat Absensi Riil Kalender Akademik
      let totalHadirRiil = 0;
      classStudents.forEach((st) => {
        const studentDaysSet = studentRealAttendanceMap.get(String(st.nis));
        const attendedCount = studentDaysSet ? studentDaysSet.size : 0;
        totalHadirRiil += Math.min(elapsedDays, attendedCount);
      });
      const expectedTotal = totalStudents * elapsedDays;
      percentage = Math.min(100, Math.max(0, Math.round((totalHadirRiil / expectedTotal) * 1000) / 10));
    } else {
      // 2. Perhitungan Estimasi Presisi Berbasis Konsistensi Kehadiran & Rekor Streak Murid
      // Menjamin keadilan bagi siswa yang sempat izin/sakit namun memiliki rekor hadir tinggi
      let totalEstimatedAttended = 0;
      classStudents.forEach((st) => {
        const curr = Number(st.streak_sekarang) || 0;
        const maxS = Number(st.streak_tertinggi || st.streak_sekarang) || 0;
        const bestStreak = Math.min(elapsedDays, Math.max(curr, maxS));
        // Estimasi kehadiran riil: hari aktif dasar + bobot streak aktif
        const estimated = Math.min(elapsedDays, Math.max(bestStreak, Math.round(elapsedDays * 0.88 + curr * 0.12)));
        totalEstimatedAttended += estimated;
      });
      const expectedTotal = totalStudents * elapsedDays;
      const calculatedPct = Math.round((totalEstimatedAttended / expectedTotal) * 1000) / 10;
      percentage = Math.min(100, Math.max(0, calculatedPct));
    }

    // Siswa hadir konsisten di pekan aktif (maks. 5 hari kerja sekolah)
    const perfectStreakCount = classStudents.filter((s) => (Number(s.streak_sekarang) || 0) >= Math.min(5, elapsedDays)).length;
    // Score Index gabungan: 70% persentase kehadiran riil + 30% indeks kekompakan streak kelas
    const streakIndex = Math.min(100, (avgActiveStreak / Math.max(1, Math.min(15, elapsedDays))) * 100);
    const scoreIndex = Math.round((percentage * 0.7 + streakIndex * 0.3) * 10) / 10;

    return {
      ...c,
      totalStudents,
      percentage: Math.min(100, Math.round(percentage * 10) / 10),
      avgActiveStreak,
      avgRecordStreak,
      totalActiveStreak,
      perfectStreakCount,
      scoreIndex,
      elapsedDays,
      totalSemesterDays: semesterDays.totalEffectiveDays,
    };
  }).sort((a, b) => b.percentage - a.percentage || b.avgActiveStreak - a.avgActiveStreak || b.avgRecordStreak - a.avgRecordStreak);

  return assignSharedRanks(sortedClasses, (a, b) => 
    a.percentage === b.percentage && 
    a.avgActiveStreak === b.avgActiveStreak
  );
}

/**
 * Komparasi Rata-rata Kedisiplinan Antar Tingkat / Angkatan (Tingkat 7 vs 8 vs 9)
 */
export function calculateGradeDisciplineComparison(classes = [], students = [], holidays = [], options = {}) {
  const classLeaderboard = calculateClassDisciplineLeaderboard(classes, students, holidays, options);

  const grades = {
    '7': { tingkat: 7, label: 'Tingkat VII (Kelas 7)', color: 'from-blue-500 to-indigo-600', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300', totalStudents: 0, classesCount: 0, totalPercentage: 0, avgStreak: 0, totalStreak: 0, classes: [] },
    '8': { tingkat: 8, label: 'Tingkat VIII (Kelas 8)', color: 'from-amber-500 to-orange-600', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300', totalStudents: 0, classesCount: 0, totalPercentage: 0, avgStreak: 0, totalStreak: 0, classes: [] },
    '9': { tingkat: 9, label: 'Tingkat IX (Kelas 9)', color: 'from-emerald-500 to-teal-600', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300', totalStudents: 0, classesCount: 0, totalPercentage: 0, avgStreak: 0, totalStreak: 0, classes: [] },
  };

  classLeaderboard.forEach((c) => {
    const t = String(c.tingkat || (c.nama_kelas?.startsWith('IX') ? '9' : c.nama_kelas?.startsWith('VIII') ? '8' : '7'));
    if (grades[t]) {
      grades[t].classesCount++;
      grades[t].totalStudents += (c.totalStudents || 0);
      grades[t].totalPercentage += (c.percentage || 0);
      grades[t].totalStreak += (c.totalActiveStreak || 0);
      grades[t].classes.push(c);
    }
  });

  const list = Object.values(grades).map((g) => {
    const avgPercentage = g.classesCount > 0 ? Math.round((g.totalPercentage / g.classesCount) * 10) / 10 : 0;
    const avgStreak = g.totalStudents > 0 ? Math.round((g.totalStreak / g.totalStudents) * 10) / 10 : 0;
    return {
      ...g,
      percentage: avgPercentage,
      avgStreak,
    };
  });

  const sortedList = list.sort((a, b) => b.percentage - a.percentage || b.avgStreak - a.avgStreak);
  const rankedGrades = assignSharedRanks(sortedList, (a, b) => 
    a.percentage === b.percentage && a.avgStreak === b.avgStreak
  );

  const topRank = rankedGrades.length > 0 ? rankedGrades[0].rank : 1;
  return rankedGrades.map((g) => ({
    ...g,
    isChampion: g.rank === topRank && g.percentage > 0,
  }));
}

/**
 * Menghitung Peringkat Kompetisi Standar (Standard Competition Ranking '1224')
 * Memberikan peringkat sama dan menandai status juara bersama jika skor identik
 */
export function assignSharedRanks(list = [], isSameScoreFn) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const areEqual = isSameScoreFn || ((a, b) => a === b);

  let currentRank = 1;
  const rankedList = list.map((item, idx) => {
    if (idx > 0 && !areEqual(item, list[idx - 1])) {
      currentRank = idx + 1; // Standard competition ranking: 1, 1, 3...
    }
    return {
      ...item,
      rank: currentRank,
    };
  });

  const rankCounts = {};
  rankedList.forEach((item) => {
    rankCounts[item.rank] = (rankCounts[item.rank] || 0) + 1;
  });

  return rankedList.map((item) => {
    const isShared = (rankCounts[item.rank] || 0) > 1;
    let medalEmoji = '';
    let medalColor = '';
    if (item.rank === 1) {
      medalEmoji = '🥇';
      medalColor = 'text-amber-950 bg-amber-400 ring-2 ring-amber-400/40';
    } else if (item.rank === 2) {
      medalEmoji = '🥈';
      medalColor = 'text-white bg-slate-500 ring-2 ring-slate-300';
    } else if (item.rank === 3) {
      medalEmoji = '🥉';
      medalColor = 'text-white bg-amber-800 ring-2 ring-amber-700/40';
    } else {
      medalColor = 'text-slate-700 bg-slate-100 border border-slate-200';
    }

    return {
      ...item,
      isShared,
      rankLabel: isShared ? `#${item.rank} (Bersama)` : `#${item.rank}`,
      medalEmoji,
      medalColor,
    };
  });
}

/**
 * Menyusun Leaderboard Siswa dengan Kriteria Pemutus Seri & Juara Bersama
 */
export function sortAndRankStudentsByStreak(students = [], getPeriodStreakFn, getStudentXpFn) {
  const getStreak = getPeriodStreakFn || ((s) => Number(s.streak_sekarang) || 0);
  const getXp = getStudentXpFn || ((s) => Number(s.xp) || 0);

  const sorted = [...students].sort((a, b) => {
    const streakDiff = getStreak(b) - getStreak(a);
    if (streakDiff !== 0) return streakDiff;

    // Tie-breaker 1: Rekor streak tertinggi sepanjang masa
    const maxA = Number(a.streak_tertinggi || a.streak_sekarang) || 0;
    const maxB = Number(b.streak_tertinggi || b.streak_sekarang) || 0;
    const maxDiff = maxB - maxA;
    if (maxDiff !== 0) return maxDiff;

    // Tie-breaker 2: Total XP / level siswa
    const xpDiff = getXp(b) - getXp(a);
    if (xpDiff !== 0) return xpDiff;

    // Tie-breaker 3: Stabilitas urutan nama
    return (a.nama || '').localeCompare(b.nama || '');
  });

  // Karena kategori utama adalah Rekor Streak, jumlah streak yang sama berhak mendapatkan POSISI PERINGKAT YANG SAMA
  return assignSharedRanks(sorted, (a, b) => {
    return getStreak(a) === getStreak(b);
  });
}
