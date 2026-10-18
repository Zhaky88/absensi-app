import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  School,
  Trophy,
  Flame,
  Clock,
  Target,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Edit,
  Save,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  MONTH_OPTIONS,
  MISSION_TEMPLATES,
  POINT_STANDARDS,
  calculateConsistentReward,
  calculateEffectiveSchoolDays,
  getAdaptiveMonthlyTarget,
  generateDefaultSemesterPreset,
  getCustomMissions,
  saveCustomMissions,
} from '../lib/achievementManager';
import { useToast } from '../context/ToastModalContext';

export default function AdminQuestBuilderModal({
  isOpen,
  onClose,
  schoolSettings = {},
  holidays = [],
  onMissionsUpdated,
}) {
  const { toast, showConfirm, showAlert } = useToast();
  const [missions, setMissions] = useState(() => getCustomMissions());
  const [editingMission, setEditingMission] = useState(null); // null = list view, object = form editing/adding
  const [autoConsistentPoints, setAutoConsistentPoints] = useState(true);

  // Ambil data tahun dan semester aktif sekolah
  const activeYear = schoolSettings.tahun_ajaran_aktif || '2026/2027';
  const activeSemester = schoolSettings.semester_aktif || 'Ganjil';
  const now = new Date();
  const currentMonthValue = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearValue = String(now.getFullYear());

  // Form State dengan Default yang Konsisten
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    templateType: 'monthly_presence',
    month: currentMonthValue,
    year: currentYearValue,
    periodScope: activeSemester.toLowerCase() === 'genap' ? 'genap' : 'ganjil',
    tahunAjaran: activeYear,
    gradeScope: 'all',
    tier: 'gold',
    xp: 500, // Standar konsisten: 500 XP
    target: 18, // Standar konsisten: 18 hari
    unit: 'Hari',
    icon: '🗓️',
    isActive: true,
  });

  useEffect(() => {
    if (isOpen) {
      setMissions(getCustomMissions());
      setEditingMission(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler saat admin memilih template cepat (Otomatis mengisi data secara konsisten)
  const applyTemplate = (tmplType, customMonth, customYear, customTarget) => {
    const tmpl = MISSION_TEMPLATES.find((t) => t.type === tmplType) || MISSION_TEMPLATES[0];
    const mValue = customMonth !== undefined ? customMonth : formData.month;
    const yValue = customYear !== undefined ? customYear : formData.year;
    const semValue = formData.periodScope;
    const targetValue = customTarget !== undefined ? customTarget : tmpl.defaultTarget;

    const monthObj = MONTH_OPTIONS.find((m) => m.value === mValue);
    const monthName = monthObj && monthObj.value !== 'all' ? monthObj.label : 'Bulan Berjalan';
    const semName = semValue === 'genap' ? 'Genap' : 'Ganjil';

    let title = tmpl.defaultTitle
      .replace('[Bulan]', monthName)
      .replace('[Tahun]', yValue)
      .replace('[Semester]', semName)
      .replace('[Target]', targetValue);

    let desc = tmpl.defaultDesc
      .replace('[Bulan]', monthName)
      .replace('[Tahun]', yValue)
      .replace('[Semester]', semName)
      .replace('[Target]', targetValue);

    // Hitung poin dan tier secara konsisten
    const reward = calculateConsistentReward(targetValue, tmplType);

    setFormData((prev) => ({
      ...prev,
      templateType: tmpl.type,
      title,
      description: desc,
      tier: autoConsistentPoints ? reward.tier : prev.tier,
      xp: autoConsistentPoints ? reward.xp : prev.xp,
      target: targetValue,
      unit: tmpl.unit,
      icon: tmpl.icon,
    }));
  };

  const handleStartAdd = (templateType = 'monthly_presence') => {
    const tmpl = MISSION_TEMPLATES.find((t) => t.type === templateType) || MISSION_TEMPLATES[0];
    const monthObj = MONTH_OPTIONS.find((m) => m.value === currentMonthValue);
    const monthName = monthObj ? monthObj.label : 'Oktober';

    const reward = calculateConsistentReward(tmpl.defaultTarget, tmpl.type);

    const newForm = {
      id: `custom_${Date.now()}`,
      templateType: tmpl.type,
      title: tmpl.defaultTitle
        .replace('[Bulan]', monthName)
        .replace('[Tahun]', currentYearValue)
        .replace('[Semester]', activeSemester)
        .replace('[Target]', tmpl.defaultTarget),
      description: tmpl.defaultDesc
        .replace('[Bulan]', monthName)
        .replace('[Tahun]', currentYearValue)
        .replace('[Semester]', activeSemester)
        .replace('[Target]', tmpl.defaultTarget),
      month: currentMonthValue,
      year: currentYearValue,
      periodScope: activeSemester.toLowerCase() === 'genap' ? 'genap' : 'ganjil',
      tahunAjaran: activeYear,
      gradeScope: 'all',
      tier: reward.tier,
      xp: reward.xp,
      target: tmpl.defaultTarget,
      unit: tmpl.unit,
      icon: tmpl.icon,
      isActive: true,
    };
    setFormData(newForm);
    setEditingMission(newForm);
  };

  const handleEdit = (mission) => {
    setFormData({
      id: mission.id,
      title: mission.title || '',
      description: mission.description || '',
      templateType: mission.templateType || 'monthly_presence',
      month: mission.month || 'all',
      year: mission.year || currentYearValue,
      periodScope: mission.periodScope || 'all',
      tahunAjaran: mission.tahunAjaran || activeYear,
      gradeScope: mission.gradeScope || 'all',
      tier: mission.tier || 'gold',
      xp: mission.xp || 500,
      target: mission.maxProgress || mission.target || 18,
      unit: mission.unit || 'Hari',
      icon: mission.icon || '🗓️',
      isActive: mission.isActive !== false,
    });
    setEditingMission(mission);
  };

  const handleDuplicate = (mission) => {
    const nextMonthNum = mission.month && mission.month !== 'all' ? (Number(mission.month) % 12) + 1 : 1;
    const nextMonthStr = String(nextMonthNum).padStart(2, '0');
    const nextYearStr = nextMonthNum === 1 ? String(Number(mission.year || 2026) + 1) : (mission.year || currentYearValue);

    const monthObj = MONTH_OPTIONS.find((m) => m.value === nextMonthStr);
    const monthName = monthObj ? monthObj.label : `Bulan ${nextMonthStr}`;

    const duplicated = {
      ...mission,
      id: `custom_${Date.now()}`,
      title: `Kehadiran Prima Bulan ${monthName} ${nextYearStr}`,
      description: `Hadir aktif di seluruh KBM minimal ${mission.maxProgress || mission.target || 18} hari selama bulan ${monthName} ${nextYearStr} tanpa alpa.`,
      month: nextMonthStr,
      year: nextYearStr,
    };
    handleEdit(duplicated);
  };

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Hapus Misi Khusus',
      message: 'Apakah Anda yakin ingin menghapus misi ini? Misi tidak akan ditampilkan lagi ke siswa.',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });
    if (ok) {
      const updated = missions.filter((m) => m.id !== id);
      setMissions(updated);
      saveCustomMissions(updated);
      if (onMissionsUpdated) onMissionsUpdated(updated);
      toast.success('Misi berhasil dihapus.');
    }
  };

  // Handler Muat Paket Lengkap Semester Otomatis dengan Poin Standar Konsisten & Hari Efektif Kaldik
  const handleLoadSemesterPreset = async () => {
    const isConfirm = await showConfirm({
      title: 'Muat Paket Misi Semester Adaptif Kaldik',
      message: `Muat Paket Lengkap Misi untuk Semester ${activeSemester} ${activeYear}?\n\nSistem otomatis menghitung hari efektif KBM berdasarkan Kalender Akademik (Kaldik) dan menyesuaikan target bulan pendek agar adil bagi siswa, dengan skema poin XP konsisten.`,
      type: 'info',
      confirmText: 'Muat Preset Sekarang',
      cancelText: 'Batal',
    });
    if (!isConfirm) return;

    const presetMissions = generateDefaultSemesterPreset(activeYear, activeSemester, holidays);
    // Gabungkan dengan misi yang sudah ada tanpa menduplikasi ID yang sama
    const existingIds = new Set(missions.map((m) => m.id));
    const newItems = presetMissions.filter((pm) => !existingIds.has(pm.id));
    const combined = [...newItems, ...missions];

    setMissions(combined);
    saveCustomMissions(combined);
    if (onMissionsUpdated) onMissionsUpdated(combined);

    showAlert({
      title: 'Paket Misi Berhasil Dimuat',
      message: `Berhasil memuat ${newItems.length} misi kalender adaptif untuk Semester ${activeSemester} ${activeYear} sesuai hari efektif Kalender Akademik!`,
      type: 'success',
      confirmText: 'Selesai',
    });
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    const finalTarget = Number(formData.target) || 18;
    const reward = autoConsistentPoints
      ? calculateConsistentReward(finalTarget, formData.templateType)
      : { tier: formData.tier, xp: formData.xp };

    const newMission = {
      ...formData,
      maxProgress: finalTarget,
      tier: reward.tier,
      xp: reward.xp,
      category: formData.templateType === 'streak_milestone' ? 'streak' : formData.templateType === 'early_bird' ? 'punctuality' : 'seasonal',
      categoryLabel: formData.templateType === 'streak_milestone' ? 'Rekor Streak' : formData.templateType === 'early_bird' ? 'Ketepatan Waktu' : `Musim & Bulan (${formData.tahunAjaran})`,
    };

    let updated = [];
    const exists = missions.some((m) => m.id === newMission.id);
    if (exists) {
      updated = missions.map((m) => (m.id === newMission.id ? newMission : m));
    } else {
      updated = [newMission, ...missions];
    }

    setMissions(updated);
    saveCustomMissions(updated);
    if (onMissionsUpdated) onMissionsUpdated(updated);
    setEditingMission(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shadow-xs">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Kelola & Buat Misi Kustom Siswa
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Quest Builder
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistem standarisasi misi bulanan & semester dengan skema poin XP yang adil dan konsisten
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-5">
          {editingMission ? (
            /* ========================================================= */
            /* FORMULIR INPUT MISI (DENGAN SKEMA POIN OTOMATIS KONSISTEN)*/
            /* ========================================================= */
            <form onSubmit={handleSaveForm} className="space-y-5">
              {/* Card 1: Pilihan Template Cepat */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Pilih Template Dasar Misi (Poin Terstandarisasi)
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Skema Poin Konsisten Aktif</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {MISSION_TEMPLATES.map((tmpl) => {
                    const active = formData.templateType === tmpl.type;
                    return (
                      <button
                        key={tmpl.type}
                        type="button"
                        onClick={() => applyTemplate(tmpl.type)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="space-y-1 mb-2">
                          <span className="text-2xl block">{tmpl.icon}</span>
                          <span className="text-[11px] font-bold leading-tight block">{tmpl.label.split('(')[0]}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold font-mono">
                          <span className="text-slate-500">{tmpl.defaultTarget} {tmpl.unit}</span>
                          <span className="text-indigo-600">+{tmpl.xp} XP</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Pengaturan Waktu & Sasaran */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Periode Waktu Kalender & Sasaran Kelas
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Sistem otomatis menghitung judul & deskripsi sesuai pilihan bulan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Bulan Pelaksanaan */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Bulan Pelaksanaan
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => {
                        const mVal = e.target.value;
                        setFormData((prev) => ({ ...prev, month: mVal }));
                        applyTemplate(formData.templateType, mVal, formData.year, formData.target);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      {MONTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tahun Pelaksanaan */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tahun Kalender
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.year}
                      onChange={(e) => {
                        const yVal = e.target.value;
                        setFormData((prev) => ({ ...prev, year: yVal }));
                        applyTemplate(formData.templateType, formData.month, yVal, formData.target);
                      }}
                      placeholder="2026 / 2027"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Semester & Tahun Ajaran */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Semester & T.A.
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={formData.periodScope}
                        onChange={(e) => setFormData((prev) => ({ ...prev, periodScope: e.target.value }))}
                        className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white cursor-pointer"
                      >
                        <option value="ganjil">Ganjil</option>
                        <option value="genap">Genap</option>
                        <option value="all">Semua</option>
                      </select>
                      <input
                        type="text"
                        value={formData.tahunAjaran}
                        onChange={(e) => setFormData((prev) => ({ ...prev, tahunAjaran: e.target.value }))}
                        placeholder="2026/2027"
                        className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 font-mono text-center focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Sasaran Jenjang Kelas */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Target Sasaran Jenjang Siswa
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: 'Semua Jenjang (7, 8, 9)' },
                      { id: '7', label: 'Khusus Kelas 7' },
                      { id: '8', label: 'Khusus Kelas 8' },
                      { id: '9', label: 'Khusus Kelas 9' },
                    ].map((gr) => (
                      <button
                        key={gr.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, gradeScope: gr.id }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          formData.gradeScope === gr.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {gr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Detail Target, Tier, & Hadiah XP yang Konsisten */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Target & Skema Hadiah Konsisten
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoConsistentPoints}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setAutoConsistentPoints(isChecked);
                        if (isChecked) {
                          const reward = calculateConsistentReward(formData.target, formData.templateType);
                          setFormData((prev) => ({ ...prev, tier: reward.tier, xp: reward.xp }));
                        }
                      }}
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Kunci Poin Otomatis (Konsisten)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Judul / Nama Misi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Misal: Kehadiran Prima Bulan November 2026"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Ikon Emoji
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                        className="w-12 h-10 text-center text-xl bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {['🗓️', '🚀', '🔥', '🌅', '🏅', '🏆', '👑', '💎'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, icon: em }))}
                            className="text-base p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Deskripsi Misi <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Instruksi pencapaian untuk siswa..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Target Nilai
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.target}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, target: val }));
                        if (autoConsistentPoints) {
                          const reward = calculateConsistentReward(val, formData.templateType);
                          setFormData((prev) => ({ ...prev, tier: reward.tier, xp: reward.xp }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Satuan
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="Hari">Hari Masuk</option>
                      <option value="Kali">Kali Absensi</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tier Lencana {autoConsistentPoints && <span className="text-[10px] text-emerald-600">(Otomatis)</span>}
                    </label>
                    <select
                      disabled={autoConsistentPoints}
                      value={formData.tier}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tier: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer disabled:opacity-80"
                    >
                      <option value="bronze">🥉 Bronze (150 XP)</option>
                      <option value="silver">🥈 Silver (300 XP)</option>
                      <option value="gold">🥇 Gold (500 XP)</option>
                      <option value="diamond">💎 Diamond (1000 XP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Hadiah XP {autoConsistentPoints && <span className="text-[10px] text-emerald-600">(Otomatis)</span>}
                    </label>
                    <input
                      type="number"
                      disabled={autoConsistentPoints}
                      step={50}
                      value={formData.xp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, xp: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-indigo-700 font-mono disabled:opacity-80"
                    />
                  </div>

                  {/* Indikator Hari Efektif Kalender Akademik (Kaldik) */}
                  {(() => {
                    const effDays = formData.month && formData.month !== 'all'
                      ? calculateEffectiveSchoolDays(formData.year, formData.month, holidays)
                      : 0;
                    if (effDays <= 0) return null;

                    const isShorterMonth = effDays < Number(formData.target);

                    return (
                      <div className="col-span-2 sm:col-span-4 p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <div>
                            <span className="font-extrabold text-blue-900 block text-xs">
                              Kalender Akademik: {effDays} Hari Efektif KBM Sekolah
                            </span>
                            <span className="text-[11px] text-blue-700">
                              {isShorterMonth
                                ? `Bulan ini memiliki hari efektif < ${formData.target} hari (terpotong libur/kegiatan).`
                                : `Target ${formData.target} hari wajar dan memberikan toleransi absen ${effDays - Number(formData.target)} hari.`}
                            </span>
                          </div>
                        </div>

                        {isShorterMonth && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                target: effDays,
                                description: prev.description.replace(/\d+\s*hari/i, `${effDays} hari`),
                              }));
                              if (autoConsistentPoints) {
                                const reward = calculateConsistentReward(effDays, formData.templateType);
                                setFormData((prev) => ({ ...prev, tier: reward.tier, xp: reward.xp }));
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[11px] cursor-pointer shadow-xs whitespace-nowrap shrink-0 self-start sm:self-auto"
                          >
                            ⚡ Sesuaikan Target ke {effDays} Hari
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMission(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal & Kembali
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan & Rilis Misi Ini</span>
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* DAFTAR MISI KUSTOM ADMIN (LIST VIEW + PRESET GENERATOR)   */
            /* ========================================================= */
            <div className="space-y-4">
              {/* BANNER PRESET GENERATOR LENGKAP SEMESTER */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Standarisasi Otomatis
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      T.A. {activeYear} • Semester {activeSemester}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white">
                    Muat Paket Misi Kalender Semester Ini (Poin Konsisten)
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    Menghasilkan otomatis seluruh misi 6 bulan (Juli-Desember / Januari-Juni) dengan target kehadiran standar 18 hari dan 500 XP adil untuk setiap bulannya.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSemesterPreset}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>⚡ Muat Paket 6 Bulan Otomatis</span>
                </button>
              </div>

              {/* Sub-Header: Counter & Tombol Buat Misi Individual */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Misi Kustom yang Sedang Berjalan</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                      {missions.length} Misi
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Siswa otomatis menerima lencana ini sesuai kalender akademik aktif
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartAdd('monthly_presence')}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Buat Misi Individual</span>
                  </button>
                </div>
              </div>

              {/* Grid List Misi */}
              {missions.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto text-2xl">
                    🎯
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Belum Ada Misi Kustom Tambahan</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Klik tombol <strong>"Muat Paket 6 Bulan Otomatis"</strong> di atas untuk langsung membuat jadwal misi bulanan lengkap dengan poin yang konsisten!
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSemesterPreset}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Muat Preset Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {missions.map((m) => {
                    const monthObj = MONTH_OPTIONS.find((mo) => mo.value === m.month);
                    const monthName = monthObj && monthObj.value !== 'all' ? monthObj.label : 'Bebas Bulan';

                    return (
                      <div
                        key={m.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              Tier {m.tier}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black border border-indigo-200">
                              +{m.xp} XP
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                              {m.icon || '🗓️'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
                                {m.title}
                              </h5>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                {m.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                              📅 {monthName} {m.year || ''}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md">
                              Semester {m.periodScope || 'Semua'}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                              🎓 {m.gradeScope === 'all' ? 'Semua Kelas' : `Kelas ${m.gradeScope}`}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              Target: {m.maxProgress || m.target} {m.unit || 'Hari'}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Aktif untuk Siswa
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicate(m)}
                              title="Salin untuk bulan berikutnya"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(m)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                              title="Hapus Misi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
