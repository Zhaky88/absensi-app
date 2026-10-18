import React, { useState } from 'react';
import {
  X,
  Trophy,
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  FileText,
  Star,
  ExternalLink,
} from 'lucide-react';
import { calculateStudentAchievementsSummary, generateReportComment } from '../lib/achievementManager';

export default function StudentAchievementModal({
  student,
  isOpen,
  onClose,
  tahunAjaran = '2026/2027',
  semesterAktif = 'Ganjil',
  onOpenCertificate,
}) {
  const [copiedComment, setCopiedComment] = useState(false);
  const [filterTier, setFilterTier] = useState('all');

  if (!isOpen || !student) return null;

  const summary = calculateStudentAchievementsSummary(student, { tahunAjaran, semesterAktif });
  const reportComment = generateReportComment(summary);

  const filteredAchievements = summary.achievements.filter((badge) => {
    if (filterTier === 'all') return true;
    if (filterTier === 'unlocked') return badge.isUnlocked;
    if (filterTier === 'locked') return !badge.isUnlocked;
    return badge.tier === filterTier;
  });

  function handleCopyComment() {
    navigator.clipboard.writeText(reportComment);
    setCopiedComment(true);
    setTimeout(() => setCopiedComment(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Hero Siswa */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-400/20 shrink-0">
              🏆
            </div>
            <div className="text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-400/30">
                  Level {summary.level} • {summary.totalXp.toLocaleString()} XP
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-cyan-200 font-bold text-[10px] border border-blue-400/30">
                  Kelas {student.kelas?.nama_kelas || student.id_kelas || '-'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-black text-[10px] flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                  Streak: {student.streak_sekarang || 0} Hari
                </span>
              </div>

              <h2 className="text-xl font-black text-white">{student.nama}</h2>
              <p className="text-xs text-slate-300">
                NIS: <strong className="font-mono">{student.nis}</strong> • {summary.unlockedCount} dari {summary.totalCount} Lencana Terbuka ({summary.percentUnlocked}%)
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-amber-300 font-bold">Progres Level {summary.level}</span>
              <span className="text-cyan-200 font-mono">{summary.xpInLevel} / {summary.xpNextLevel} XP</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 rounded-full"
                style={{ width: `${Math.max(5, summary.percent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Card Rekomendasi Catatan Rapor Sikap Kedisiplinan */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-amber-600" />
                Rekomendasi Catatan Nilai Sikap Rapor (Wali Kelas)
              </span>
              <button
                type="button"
                onClick={handleCopyComment}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                {copiedComment ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Catatan</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3 rounded-xl border border-amber-200/60 shadow-inner">
              "{reportComment}"
            </p>
          </div>

          {/* Filter Tier Badges */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Koleksi Lencana Siswa ({summary.unlockedCount} Terbuka)
              </h3>
              {onOpenCertificate && (
                <button
                  type="button"
                  onClick={() => onOpenCertificate(student, summary)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Cetak Piagam Teladan</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'unlocked', label: `Terbuka (${summary.unlockedCount})` },
                { id: 'locked', label: `Terkunci (${summary.totalCount - summary.unlockedCount})` },
                { id: 'diamond', label: '💎 Diamond' },
                { id: 'gold', label: '🥇 Gold' },
                { id: 'silver', label: '🥈 Silver' },
                { id: 'bronze', label: '🥉 Bronze' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterTier(f.id)}
                  className={`px-3 py-1 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                    filterTier === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Lencana Siswa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredAchievements.map((b) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                  b.isUnlocked
                    ? 'bg-white border-slate-300 shadow-xs hover:border-blue-400'
                    : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner ${
                    b.isUnlocked
                      ? 'bg-amber-100 border border-amber-300 text-amber-950 shadow-amber-200/50'
                      : 'bg-slate-200/80 border border-slate-300 grayscale opacity-80'
                  }`}
                >
                  <span>{b.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-extrabold text-xs text-slate-900 truncate">{b.title}</span>
                    <span className="font-mono text-[10px] font-black text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                      +{b.xp} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-relaxed mb-2.5">
                    {b.description}
                  </p>
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      {b.isUnlocked ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terbuka
                        </span>
                      ) : (
                        <span className="text-slate-700 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" /> Progres: <strong>{b.currentProgress}/{b.maxProgress} {b.unit}</strong>
                        </span>
                      )}
                      <span className="text-slate-600 uppercase text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-200/70">{b.tier}</span>
                    </div>

                    {/* Progress Bar Kontras Tinggi */}
                    {!b.isUnlocked && (
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.round((b.currentProgress / b.maxProgress) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
