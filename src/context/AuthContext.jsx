import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getUserMetadataAndRole } from '../lib/supabase';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = {
  admin: {
    role: 'admin',
    name: 'Administrator SIAK',
    identifier: 'admin@siak.sekolah.id',
    password: 'password123',
    badge: 'Full Access & Master Data',
  },
  guru: {
    role: 'guru',
    name: 'Bpk. Ahmad Fauzi, S.Pd',
    identifier: '198501152010011002',
    password: 'password123',
    badge: 'Dynamic QR & Scanner',
  },
  murid: {
    role: 'murid',
    name: 'Budi Pratama (Kelas VII-A)',
    identifier: '202409001',
    password: 'password123',
    badge: 'GPS Anti-Cheat & Streak',
  },
  ortu: {
    role: 'ortu',
    name: 'Bpk. Bambang / Ibu Siti',
    identifier: 'ortu@siak.sekolah.id',
    password: 'password123',
    badge: 'WA Alert & Pantau Anak',
  },
};

export function getAdminProfileDetails() {
  try {
    const saved = localStorage.getItem('siak_admin_profile');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    nama: 'Administrator SIAK',
    username: 'admin_siak',
    email: 'admin@siak.sekolah.id',
    nip: '198205202008011003',
    no_telepon: '081234567890',
    jabatan: 'Koordinator Sistem Informasi & IT Sekolah',
    bio: 'Pengelola utama data master siswa, presensi terpadu, jadwal KBM, dan konfigurasi sistem SIAK.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    !import.meta.env.VITE_SUPABASE_URL.includes('<project-id>') &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('<anon-key-anda>')
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Ambil session saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Gagal membaca session auth:', err);
      setLoading(false);
    });

    // 2. Listener perubahan status autentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  async function loadUserProfile(userId) {
    setLoading(true);
    const profile = await getUserMetadataAndRole(userId);
    if (profile.success) {
      if (profile.role === 'admin' && !profile.details) {
        profile.details = getAdminProfileDetails();
      }
      setUserProfile(profile);
    }
    setLoading(false);
  }

  // Smart Login: Mendukung login via Email, NIS, NIP, atau Akun Buatan Admin
  async function smartLogin(identifier, password) {
    const trimmed = identifier.trim();

    // 1. Cek akun kustom yang dibuat atau diatur oleh Admin
    try {
      const customCreds = JSON.parse(localStorage.getItem('siak_user_credentials') || '{}');
      const matchedKey = Object.keys(customCreds).find((key) => {
        const acc = customCreds[key];
        return (
          key.toLowerCase() === trimmed.toLowerCase() ||
          acc.nip?.toLowerCase() === trimmed.toLowerCase() ||
          acc.nis?.toLowerCase() === trimmed.toLowerCase() ||
          acc.email?.toLowerCase() === trimmed.toLowerCase() ||
          acc.username?.toLowerCase() === trimmed.toLowerCase()
        );
      });

      if (matchedKey) {
        const acc = customCreds[matchedKey];
        if (acc.status === 'nonaktif') {
          throw new Error('Akun ini sedang dinonaktifkan oleh administrator sekolah.');
        }
        if (acc.password && acc.password !== password) {
          throw new Error('Password salah. Silakan periksa kembali atau hubungi admin sekolah.');
        }

        if (acc.role === 'ortu') {
          const isPortalActive = localStorage.getItem('siak_parent_portal_enabled') !== 'false';
          if (!isPortalActive) {
            throw new Error('Portal login orang tua sedang dinonaktifkan sementara oleh administrator sekolah. Silakan gunakan fitur Cek Mandiri NIS.');
          }
        }

        // Login sukses akun custom
        if (acc.role === 'admin') {
          setSession({ user: { id: 'acc-admin-main' } });
          setUserProfile({
            role: 'admin',
            username: acc.username || 'admin_siak',
            details: getAdminProfileDetails(),
          });
          return { user: { email: acc.email || trimmed } };
        }

        setSession({ user: { id: `acc-${acc.role}-${acc.nip || acc.nis}` } });
        setUserProfile({
          role: acc.role,
          username: acc.nip || acc.nis || acc.username,
          details: acc.details || {
            nip: acc.nip,
            nis: acc.nis,
            nama: acc.nama,
            foto_profil: acc.foto_profil,
            foto_wajah: acc.foto_wajah,
            mapel_utama: acc.mapel_utama,
            kelas: acc.kelas,
          },
        });
        return { user: { email: acc.email || trimmed } };
      }
    } catch (e) {
      if (e.message.includes('Akun ini') || e.message.includes('Password salah') || e.message.includes('Portal login')) {
        throw e;
      }
    }

    // 2. Cek apakah pengguna menginputkan akun demo bawaan
    for (const [key, acc] of Object.entries(DEMO_ACCOUNTS)) {
      let isMatch = (trimmed === acc.identifier || trimmed === acc.role);
      let expectedPass = acc.password;

      if (acc.role === 'admin') {
        const storedAdminProfile = getAdminProfileDetails();
        const customPass = localStorage.getItem('siak_admin_password');
        if (customPass) expectedPass = customPass;
        if (
          trimmed.toLowerCase() === 'admin' ||
          trimmed.toLowerCase() === 'admin_siak' ||
          trimmed.toLowerCase() === acc.identifier.toLowerCase() ||
          trimmed.toLowerCase() === (storedAdminProfile?.email || '').toLowerCase() ||
          trimmed.toLowerCase() === (storedAdminProfile?.username || '').toLowerCase()
        ) {
          isMatch = true;
        }
      }

      if (acc.role === 'ortu') {
        const customOrtuPass = localStorage.getItem('siak_ortu_password');
        if (customOrtuPass) expectedPass = customOrtuPass;
        if (
          trimmed.toLowerCase() === 'ortu' ||
          trimmed.toLowerCase() === 'ortu_budi' ||
          trimmed.toLowerCase() === acc.identifier.toLowerCase()
        ) {
          isMatch = true;
        }
      }

      if (isMatch && password === expectedPass) {
        if (acc.role === 'ortu') {
          const isPortalActive = localStorage.getItem('siak_parent_portal_enabled') !== 'false';
          if (!isPortalActive) {
            throw new Error('Portal login orang tua sedang dinonaktifkan sementara oleh administrator sekolah. Silakan gunakan fitur Cek Mandiri NIS.');
          }
        }
        loginAsDemoRole(acc.role);
        return { user: { email: acc.identifier } };
      }
    }

    // 3. Login langsung ke Supabase Auth
    let emailToUse = trimmed;
    if (!emailToUse.includes('@')) {
      emailToUse = `${emailToUse.toLowerCase()}@siak.sekolah.id`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  // Login instan mode demo
  function loginAsDemoRole(role) {
    if (role === 'ortu') {
      const isPortalActive = localStorage.getItem('siak_parent_portal_enabled') !== 'false';
      if (!isPortalActive) {
        return {
          success: false,
          error: 'Portal login orang tua sedang dinonaktifkan sementara oleh administrator sekolah. Silakan gunakan fitur Cek Mandiri NIS.',
        };
      }
    }
    const demoProfiles = {
      murid: {
        role: 'murid',
        username: '202409001',
        details: {
          nis: '202409001',
          nama: 'Budi Pratama',
          foto_wajah: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
          qr_token_pribadi: 'TOKEN-BUDI-202409001-SECURE',
          streak_sekarang: 14,
          streak_tertinggi: 28,
          kelas: { nama_kelas: 'VII-A' },
        },
      },
      guru: {
        role: 'guru',
        username: '198501152010011002',
        details: {
          nip: '198501152010011002',
          nama: 'Bpk. Ahmad Fauzi, S.Pd',
          foto_profil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
      },
      ortu: {
        role: 'ortu',
        username: 'ortu_budi',
        details: (() => {
          try {
            const saved = JSON.parse(localStorage.getItem('siak_ortu_profile') || 'null');
            return {
              id_ortu: 'b0000000-0000-0000-0000-000000000001',
              nama_ayah: saved?.nama_ayah || 'Bpk. Bambang Sutrisno',
              nama_ibu: saved?.nama_ibu || 'Ibu Siti Aminah',
              no_whatsapp: saved?.no_whatsapp || '6281234567890',
              no_whatsapp_ibu: saved?.no_whatsapp_ibu || '6281345678901',
              nis: '202409001',
              nama_siswa: 'Budi Pratama',
              kelas: 'VII-A',
            };
          } catch (e) {
            return {
              id_ortu: 'b0000000-0000-0000-0000-000000000001',
              nama_ayah: 'Bpk. Bambang Sutrisno',
              nama_ibu: 'Ibu Siti Aminah',
              no_whatsapp: '6281234567890',
              no_whatsapp_ibu: '6281345678901',
              nis: '202409001',
              nama_siswa: 'Budi Pratama',
              kelas: 'VII-A',
            };
          }
        })(),
      },
      admin: {
        role: 'admin',
        username: 'admin_siak',
        details: getAdminProfileDetails(),
      },
    };

    setSession({ user: { id: `demo-${role}` } });
    setUserProfile(demoProfiles[role]);
    return { success: true };
  }

  async function logout() {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    setSession(null);
    setUserProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        userProfile,
        loading,
        isSupabaseConfigured,
        smartLogin,
        loginAsDemoRole,
        logout,
        setUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
