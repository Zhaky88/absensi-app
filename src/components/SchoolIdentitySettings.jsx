import React, { useState, useRef } from 'react';
import {
  Building2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Award,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  School,
  Download,
  FolderUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  Stamp,
  Calendar,
  Layers,
  Save,
} from 'lucide-react';
import { useToast } from '../context/ToastModalContext';

export default function SchoolIdentitySettings({
  settings = {},
  onChangeSettings,
  onSaveAll,
  saving = false,
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const stempelInputRef = useRef(null);
  const backupFileInputRef = useRef(null);
  const [activeSubTab, setActiveSubTab] = useState('identitas'); // 'identitas' | 'pimpinan' | 'kop_preview'

  // Helper untuk membaca file gambar dan meresize/mengonversi ke Base64
  function handleImageUpload(e, fieldKey) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File yang diunggah harus berupa gambar (PNG, JPG, WEBP, atau SVG).');
      return;
    }

    // Batasi ukuran file maks 3MB untuk menjaga performa
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran file gambar maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize jika dimensi gambar terlalu besar untuk menghemat memori
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        onChangeSettings({ [fieldKey]: dataUrl });
        toast.success(
          `${fieldKey === 'sekolah_logo' ? 'Logo Sekolah' : 'Stempel Resmi'} berhasil diunggah dan disimpan!`,
          'Gambar Diperbarui'
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset file input agar bisa upload file yang sama jika dibutuhkan
    e.target.value = '';
  }

  // Backup data identitas ke format JSON
  function handleExportBackup() {
    try {
      const exportData = {
        app: 'SIAK_PRESENSI_SEKOLAH',
        timestamp: new Date().toISOString(),
        settings: settings,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_identitas_sekolah_${(settings.sekolah_nama || 'sekolah').toLowerCase().replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File cadangan identitas dan pengaturan sekolah berhasil diunduh.', 'Backup Berhasil');
    } catch (e) {
      toast.error('Gagal mencadangkan pengaturan.');
    }
  }

  // Restore data pengaturan dari file JSON
  function handleImportBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && parsed.settings) {
          onChangeSettings(parsed.settings);
          toast.success('Pengaturan identitas sekolah berhasil dipulihkan dari file backup!', 'Pemulihan Sukses');
        } else {
          toast.error('Format file backup tidak valid.');
        }
      } catch (err) {
        toast.error('Gagal membaca file JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const schoolLogo = settings.sekolah_logo || '';
  const schoolStempel = settings.sekolah_stempel || '';

  return (
    <div className="glass-card rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6 bg-white">
      {/* HEADER SECTION DENGAN ACTION BACKUP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Identitas Resmi Sekolah & Pengaturan Kop Rekapitulasi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data ini digunakan sebagai kop surat resmi, identitas kop laporan PDF/Excel, dan legalitas tanda tangan Kepala Sekolah pada seluruh rekap absensi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Download file cadangan (JSON) pengaturan dan logo sekolah"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Backup Data</span>
          </button>

          <button
            type="button"
            onClick={() => backupFileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Pulihkan pengaturan dari file JSON cadangan"
          >
            <FolderUp className="w-3.5 h-3.5 text-slate-600" />
            <span>Restore JSON</span>
          </button>
          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('identitas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'identitas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Profil & Logo Sekolah</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pimpinan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pimpinan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Kepala Sekolah & Tahun Ajaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('kop_preview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'kop_preview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Pratinjau Kop Surat & TTD (Live Preview)</span>
        </button>
      </div>

      {/* TAB 1: PROFIL & LOGO SEKOLAH */}
      {activeSubTab === 'identitas' && (
        <div className="space-y-6">
          {/* UPLOAD LOGO & STEMPEL SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {/* LOGO SEKOLAH */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Logo Resmi Sekolah (Kop Dokumen)</span>
                </label>
                {schoolLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSettings({ sekolah_logo: '' });
                      toast.success('Logo dikembalikan ke lambang Tut Wuri Handayani default.');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Logo</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* PREVIEW CONTAINER */}
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  {schoolLogo ? (
                    <img
                      src={schoolLogo}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <School className="w-7 h-7 mx-auto mb-0.5 text-slate-300" />
                      <span className="text-[9px] font-bold block leading-none">Default</span>
                    </div>
                  )}
                </div>

                {/* UPLOAD BUTTONS & URL */}
                <div className="space-y-2 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'sekolah_logo')}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeSettings({
                          sekolah_logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg',
                        });
                        toast.success('Menggunakan logo resmi Kemdikbudristek RI.');
                      }}
                      className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                      title="Gunakan Logo Resmi Tut Wuri Handayani Nasional"
                    >
                      Logo Kemdikbud
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Format disarankan: PNG transparan atau SVG (Maks. 3 MB). Logo akan otomatis tampil di sudut kiri kop rekap.
                  </p>
                </div>
              </div>

              {/* INPUT URL ALTERNATIF */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Atau masukkan Tautan Gambar Langsung (URL Logo):
                </label>
                <input
                  type="text"
                  value={settings.sekolah_logo || ''}
                  onChange={(e) => onChangeSettings({ sekolah_logo: e.target.value })}
                  placeholder="https://domain-sekolah.sch.id/assets/logo.png"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* STEMPEL RESMI DIGITAL (OPSIONAL) */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 md:pl-5 pt-4 md:pt-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Stamp className="w-4 h-4 text-emerald-600" />
                  <span>Stempel Sekolah Digital (Opsional)</span>
                </label>
                {schoolStempel && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSettings({ sekolah_stempel: '' });
                      toast.success('Stempel digital dihapus.');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  {schoolStempel ? (
                    <img
                      src={schoolStempel}
                      alt="Stempel Digital"
                      className="w-full h-full object-contain opacity-85"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Stamp className="w-7 h-7 mx-auto mb-0.5 text-slate-300" />
                      <span className="text-[9px] font-bold block leading-none">Kosong</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    ref={stempelInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'sekolah_stempel')}
                  />
                  <button
                    type="button"
                    onClick={() => stempelInputRef.current?.click()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Stempel PNG</span>
                  </button>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Unggah stempel bulat/lonjong berlatar transparan (PNG). Akan dicetak di atas kolom tanda tangan Kepala Sekolah.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Atau masukkan Tautan Gambar Stempel:
                </label>
                <input
                  type="text"
                  value={settings.sekolah_stempel || ''}
                  onChange={(e) => onChangeSettings({ sekolah_stempel: e.target.value })}
                  placeholder="https://domain-sekolah.sch.id/assets/stempel.png"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* GRID FORMULIR IDENTITAS SEKOLAH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Nama Resmi Satuan Pendidikan (Sekolah) *
              </label>
              <input
                type="text"
                value={settings.sekolah_nama || ''}
                onChange={(e) => onChangeSettings({ sekolah_nama: e.target.value })}
                placeholder="Contoh: SMP NEGERI 2 KOTA BANGUN"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase tracking-wide"
                required
              />
              <span className="text-[10px] text-slate-500">
                Nama ini dicetak tebal dengan ukuran terbesar pada kop surat dan judul dokumen rekap.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nomor Pokok Sekolah Nasional (NPSN)
              </label>
              <input
                type="text"
                value={settings.sekolah_npsn || ''}
                onChange={(e) => onChangeSettings({ sekolah_npsn: e.target.value })}
                placeholder="Contoh: 30401234"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Status Akreditasi Sekolah
              </label>
              <input
                type="text"
                value={settings.sekolah_akreditasi || ''}
                onChange={(e) => onChangeSettings({ sekolah_akreditasi: e.target.value })}
                placeholder="Contoh: A (Unggul) / B (Baik)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Instansi Pembina / Dinas Pendidikan (Header Baris Pertama Kop)
              </label>
              <input
                type="text"
                value={settings.sekolah_dinas || ''}
                onChange={(e) => onChangeSettings({ sekolah_dinas: e.target.value })}
                placeholder="Contoh: PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Alamat Lengkap Sekolah (Jalan, RT/RW, Kelurahan)
              </label>
              <input
                type="text"
                value={settings.sekolah_alamat || ''}
                onChange={(e) => onChangeSettings({ sekolah_alamat: e.target.value })}
                placeholder="Contoh: Jl. Ki Hajar Dewantara No. 12, RT. 05"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Kecamatan / Kabupaten / Kota
              </label>
              <input
                type="text"
                value={settings.sekolah_kota || ''}
                onChange={(e) => onChangeSettings({ sekolah_kota: e.target.value })}
                placeholder="Contoh: Kota Bangun, Kutai Kartanegara"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Provinsi
              </label>
              <input
                type="text"
                value={settings.sekolah_provinsi || ''}
                onChange={(e) => onChangeSettings({ sekolah_provinsi: e.target.value })}
                placeholder="Contoh: Kalimantan Timur"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Telepon / WhatsApp Resmi Sekolah
              </label>
              <input
                type="text"
                value={settings.sekolah_telepon || ''}
                onChange={(e) => onChangeSettings({ sekolah_telepon: e.target.value })}
                placeholder="Contoh: (0541) 678901 / 08123456789"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Email Resmi Sekolah
              </label>
              <input
                type="email"
                value={settings.sekolah_email || ''}
                onChange={(e) => onChangeSettings({ sekolah_email: e.target.value })}
                placeholder="Contoh: info@smpn2kotabangun.sch.id"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PIMPINAN (KEPALA SEKOLAH) & TAHUN AJARAN */}
      {activeSubTab === 'pimpinan' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Identitas Pejabat Pengesah Dokumen Rekapitulasi</p>
              <p className="text-blue-700 text-[11px] mt-0.5">
                Nama dan NIP Kepala Sekolah berikut akan otomatis tercantum pada lembar pengesahan tanda tangan di dokumen PDF Rekapitulasi Siswa, Rekapitulasi Kelas, Surat Panggilan Wali Murid, dan berkas formal lainnya.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">
                Nama Lengkap Kepala Sekolah (beserta Gelar) *
              </label>
              <input
                type="text"
                value={settings.kepala_sekolah_nama || ''}
                onChange={(e) => onChangeSettings({ kepala_sekolah_nama: e.target.value })}
                placeholder="Contoh: Drs. H. Mulyadi, M.Pd"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nomor Induk Pegawai (NIP) Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.kepala_sekolah_nip || ''}
                onChange={(e) => onChangeSettings({ kepala_sekolah_nip: e.target.value })}
                placeholder="Contoh: 197003121995121001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Jabatan Penandatangan
              </label>
              <input
                type="text"
                value={settings.kepala_sekolah_jabatan || 'Kepala Sekolah'}
                onChange={(e) => onChangeSettings({ kepala_sekolah_jabatan: e.target.value })}
                placeholder="Contoh: Kepala Sekolah / Plt. Kepala Sekolah"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* TAHUN AJARAN & SEMESTER AKTIF */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Tahun Ajaran Aktif</span>
              </label>
              <input
                type="text"
                value={settings.tahun_ajaran_aktif || '2026/2027'}
                onChange={(e) => onChangeSettings({ tahun_ajaran_aktif: e.target.value })}
                placeholder="Contoh: 2026/2027"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Semester Aktif</span>
              </label>
              <select
                value={settings.semester_aktif || 'Ganjil'}
                onChange={(e) => onChangeSettings({ semester_aktif: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="Ganjil">Semester Ganjil (Juli - Desember)</option>
                <option value="Genap">Semester Genap (Januari - Juni)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tanggal Mulai Semester</span>
              </label>
              <input
                type="date"
                value={settings.semester_mulai || '2026-07-13'}
                onChange={(e) => onChangeSettings({ semester_mulai: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tanggal Akhir Semester (KBM)</span>
              </label>
              <input
                type="date"
                value={settings.semester_selesai || '2026-12-19'}
                onChange={(e) => onChangeSettings({ semester_selesai: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Tanggal Pembagian Rapor / Titimangsa Rekap Absensi</span>
              </label>
              <input
                type="date"
                value={settings.tanggal_bagi_rapor || '2026-12-19'}
                onChange={(e) => onChangeSettings({ tanggal_bagi_rapor: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500">
                Tanggal ini akan otomatis dicetak pada titimangsa lembar rekapitulasi presensi dan rapor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE PREVIEW KOP SURAT RESMI */}
      {activeSubTab === 'kop_preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Pratinjau berikut menampilkan tampilan kop surat dan tanda tangan persis seperti yang akan tampil saat diekspor ke PDF / dicetak.
            </span>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Real-Time Sync Aktif</span>
            </span>
          </div>

          {/* SIMULASI SELEMBAR KERTAS FORMAL */}
          <div className="p-8 bg-white border-2 border-slate-300 rounded-2xl shadow-sm text-slate-900 font-sans space-y-6">
            {/* KOP SURAT */}
            <div className="border-b-[3px] border-slate-900 pb-3 flex items-center justify-between text-center gap-4">
              {/* LOGO KIRI */}
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt="Logo Sekolah"
                    className="w-18 h-18 object-contain"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-16 h-16 fill-slate-800">
                    <path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                    <circle cx="50" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M30 75 Q50 60 70 75" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M45 20 L55 20 M50 15 L50 25" stroke="currentColor" strokeWidth="3" />
                  </svg>
                )}
              </div>

              {/* TEKS KOP */}
              <div className="flex-1 px-2 text-center">
                <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-700 leading-tight">
                  {settings.sekolah_dinas || 'PEMERINTAH KABUPATEN KUTAI KARTANEGARA • DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                </h4>
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 uppercase my-1">
                  {settings.sekolah_nama || 'SMP NEGERI 2 KOTA BANGUN'}
                </h1>
                <p className="text-[10px] text-slate-600 leading-snug">
                  Alamat: {settings.sekolah_alamat || 'Jl. Ki Hajar Dewantara No. 12'}, {settings.sekolah_kota || 'Kota Bangun'}
                  {settings.sekolah_npsn && ` | NPSN: ${settings.sekolah_npsn}`}
                  {settings.sekolah_akreditasi && ` | Akreditasi: ${settings.sekolah_akreditasi}`}
                </p>
                {(settings.sekolah_telepon || settings.sekolah_email) && (
                  <p className="text-[9px] text-slate-500 leading-snug mt-0.5">
                    {settings.sekolah_telepon && `Telp: ${settings.sekolah_telepon} `}
                    {settings.sekolah_email && `| Email: ${settings.sekolah_email}`}
                  </p>
                )}
              </div>

              {/* LOGO KANAN (SIMBOL RESMI SISTEM PRESENSI) */}
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex flex-col items-center justify-center p-1 text-center">
                  <Award className="w-7 h-7 text-slate-800" />
                  <span className="text-[7px] font-black uppercase mt-0.5 leading-none">
                    SIAK RESMI
                  </span>
                </div>
              </div>
            </div>

            {/* GARIS GANDA KOP */}
            <div className="border-b border-slate-900 -mt-5"></div>

            {/* DUMMY ISI DOKUMEN REKAP */}
            <div className="text-center py-4 space-y-1">
              <h2 className="text-sm font-black uppercase tracking-wider underline">
                LEMBAR REKAPITULASI PRESENSI & KEDISIPLINAN SISWA
              </h2>
              <p className="text-[11px] text-slate-600">
                Tahun Ajaran: <span className="font-bold text-slate-800">{settings.tahun_ajaran_aktif || '2026/2027'}</span> &bull; Semester: <span className="font-bold text-slate-800">{settings.semester_aktif || 'Ganjil'}</span>
              </p>
            </div>

            {/* SIMULASI TANDA TANGAN DOKUMEN */}
            <div className="pt-6 border-t border-dashed border-slate-200">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-600 mb-14">Wali Kelas / Guru Pengajar</p>
                  <p className="font-bold underline text-slate-900">( Nama Guru / Wali Kelas, S.Pd )</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. 198501152010011002</p>
                </div>

                <div className="relative">
                  <p className="text-slate-600 mb-14">
                    {settings.sekolah_kota?.split(',')[0] || 'Kota Bangun'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                    <strong>{settings.kepala_sekolah_jabatan || 'Kepala Sekolah'}</strong>
                  </p>

                  {/* STEMPEL FLYOVER JIKA ADA */}
                  {schoolStempel && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-24 h-24 pointer-events-none opacity-80">
                      <img
                        src={schoolStempel}
                        alt="Stempel Basah"
                        className="w-full h-full object-contain -rotate-6"
                      />
                    </div>
                  )}

                  <p className="font-bold underline text-slate-900">
                    {settings.kepala_sekolah_nama || 'Drs. H. Mulyadi, M.Pd'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP. {settings.kepala_sekolah_nip || '197003121995121001'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SAVE BUTTON DI BAWAH KARTU IDENTITAS */}
      {onSaveAll && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onSaveAll}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan Identitas...' : 'Simpan Identitas Sekolah'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
