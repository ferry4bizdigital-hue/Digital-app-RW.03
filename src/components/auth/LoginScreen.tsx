import React, { useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storageService';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [emailOrNik, setEmailOrNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Register state
  const [regNama, setRegNama] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regHp, setRegHp] = useState('');
  const [regRt, setRegRt] = useState('02');
  const [regSuccess, setRegSuccess] = useState(false);

  const [quickLoginTarget, setQuickLoginTarget] = useState<User | null>(null);

  const isVercelDeploy = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('vercel.dev')
  );

  const handleNormalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = emailOrNik.trim();
    const cleanPass = password.trim();

    if (!cleanInput || !cleanPass) {
      setErrorMsg('Mohon isi email/NIK dan kata sandi.');
      return;
    }

    // Ambil data user terbaru dari penyimpanan
    const usersList = StorageService.getUsers();

    // Cocokkan data user dari penyimpanan berdasarkan Email, NIK, atau userId
    const found = usersList.find(
      u => (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) || 
           (u.NIK && u.NIK === cleanInput) ||
           (u.userId && u.userId.toLowerCase() === cleanInput.toLowerCase())
    );

    if (found) {
      // Periksa kecocokan kata sandi jika akun memiliki password terdaftar
      if (found.password && found.password !== cleanPass) {
        setErrorMsg('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        return;
      }
      StorageService.setCurrentUser(found);
      onLoginSuccess(found);
    } else {
      setErrorMsg('Akun dengan Email atau NIK tersebut tidak terdaftar.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = regNama.trim();
    const cleanNik = regNik.trim();
    const cleanPass = regPassword.trim();

    if (!cleanNama || !cleanNik) {
      setErrorMsg('Nama lengkap dan NIK wajib diisi.');
      return;
    }

    if (cleanNik.length !== 16) {
      setErrorMsg('Nomor Induk Kependudukan (NIK) harus terdiri dari 16 digit angka.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Kata sandi wajib dibuat untuk login akun Anda.');
      return;
    }

    // Ambil daftar pengguna terkini
    const usersList = StorageService.getUsers();
    const existing = usersList.find(u => u.NIK === cleanNik);

    // KASUS 1: NIK sudah terdaftar sebagai akun Pengurus (Super Admin / RW / Bendahara / RT)
    if (existing && existing.role !== 'warga') {
      setQuickLoginTarget(existing);
      setErrorMsg(`NIK ${cleanNik} terdaftar sebagai akun Pengurus (${existing.jabatan || existing.role}) an. ${existing.nama}. Silakan login pada halaman Masuk.`);
      return;
    }

    // KASUS 2: NIK sudah terdaftar sebagai Akun Warga (baik data bawaan, RT, atau registrasi sebelumnya)
    // Jangan tolak dengan pesan gagal/sudah terdaftar, tapi langsung perbarui password dan aktifkan akun!
    if (existing && existing.role === 'warga') {
      const updatedUser: User = {
        ...existing,
        nama: cleanNama || existing.nama,
        email: regEmail.trim() || existing.email || `${cleanNik}@warga.kebonkangkung.id`,
        nomorHP: regHp.trim() || existing.nomorHP || '-',
        password: cleanPass,
        RT: regRt,
        statusAkun: 'aktif',
        updatedAt: new Date().toISOString()
      };

      StorageService.updateUser(existing.userId, updatedUser);
      StorageService.setCurrentUser(updatedUser);

      // Sinkronkan ke data kependudukan (residents) jika ada
      const residents = StorageService.getResidents();
      const res = residents.find(r => r.NIK === cleanNik);
      if (res) {
        StorageService.updateResident(res.id, {
          namaLengkap: cleanNama,
          rt: regRt,
          nomorHP: regHp.trim() || res.nomorHP,
          email: regEmail.trim() || res.email
        });
      } else {
        StorageService.addResident({
          NIK: cleanNik,
          nomorKK: `327318${regRt}${cleanNik.slice(-8)}`,
          namaLengkap: cleanNama,
          jenisKelamin: 'L',
          tempatLahir: 'Bandung',
          tanggalLahir: '1990-01-01',
          usia: 35,
          agama: 'Islam',
          pendidikan: 'SMA/Sederajat',
          pekerjaan: '-',
          statusPerkawinan: 'Kawin',
          hubunganKeluarga: 'Kepala Keluarga',
          statusDomisili: 'KTP & Domisili',
          statusWarga: 'Tetap',
          alamat: `RT ${regRt} / RW 03 Kebon Kangkung`,
          rt: regRt,
          rw: '03',
          nomorHP: regHp.trim() || '-',
          email: regEmail.trim() || `${cleanNik}@warga.kebonkangkung.id`
        });
      }

      setRegSuccess(true);
      setErrorMsg('');

      // Sinkronkan ke server secara langsung
      StorageService.pushToServer(true).catch(() => {});

      setTimeout(() => {
        onLoginSuccess(updatedUser);
      }, 1200);
      return;
    }

    // KASUS 3: Warga pendaftar baru
    const newUser: User = {
      userId: `usr-warga-${Date.now()}`,
      nama: cleanNama,
      email: regEmail.trim() || `${cleanNik}@warga.kebonkangkung.id`,
      nomorHP: regHp.trim() || '-',
      NIK: cleanNik,
      password: cleanPass,
      role: 'warga',
      RT: regRt,
      RW: '03',
      alamat: `RT ${regRt} / RW 03 Kebon Kangkung`,
      statusAkun: 'aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StorageService.addUser(newUser);

    // Otomatis tambahkan data kependudukan warga agar terdata di RT
    const residents = StorageService.getResidents();
    if (!residents.some(r => r.NIK === cleanNik)) {
      StorageService.addResident({
        NIK: cleanNik,
        nomorKK: `327318${regRt}${cleanNik.slice(-8)}`,
        namaLengkap: cleanNama,
        jenisKelamin: 'L',
        tempatLahir: 'Bandung',
        tanggalLahir: '1990-01-01',
        usia: 35,
        agama: 'Islam',
        pendidikan: 'SMA/Sederajat',
        pekerjaan: '-',
        statusPerkawinan: 'Kawin',
        hubunganKeluarga: 'Kepala Keluarga',
        statusDomisili: 'KTP & Domisili',
        statusWarga: 'Tetap',
        alamat: `RT ${regRt} / RW 03 Kebon Kangkung`,
        rt: regRt,
        rw: '03',
        nomorHP: regHp.trim() || '-',
        email: regEmail.trim() || `${cleanNik}@warga.kebonkangkung.id`
      });
    }

    setRegSuccess(true);
    setErrorMsg('');

    // Sinkronkan ke server secara langsung
    StorageService.pushToServer(true).catch(() => {});

    setTimeout(() => {
      StorageService.setCurrentUser(newUser);
      onLoginSuccess(newUser);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Editorial Brand Header */}
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl shadow-inner">
            RW
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Digital RW 03 Kebon Kangkung
          </h1>
          <p className="text-xs text-emerald-200/90 mt-1">
            Sistem Informasi Pelayanan Warga & Administrasi Lingkungan
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p>{errorMsg}</p>
              {quickLoginTarget && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailOrNik(quickLoginTarget.NIK || quickLoginTarget.email);
                    setPassword('');
                    setIsRegisterMode(false);
                    setErrorMsg('');
                    setQuickLoginTarget(null);
                  }}
                  className="mt-2 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-lg cursor-pointer transition-colors block text-left"
                >
                  → Masuk Sekarang Menggunakan NIK {quickLoginTarget.NIK} ({quickLoginTarget.nama})
                </button>
              )}
            </div>
          )}

          {!isRegisterMode && (
            <form onSubmit={handleNormalLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email atau NIK Warga</label>
                <input
                  type="text"
                  value={emailOrNik}
                  onChange={e => setEmailOrNik(e.target.value)}
                  placeholder="Email atau NIK Warga"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kata Sandi</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Masuk ke Aplikasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 text-center text-slate-500 text-[11px]">
                Belum terdaftar sebagai warga?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setErrorMsg('');
                    setQuickLoginTarget(null);
                  }}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Daftar Akun Baru
                </button>
              </div>

              {/* Quick Fill / Demo Accounts: Tersembunyi saat di-deploy ke Vercel sesuai permintaan */}
              {!isVercelDeploy && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2 text-center">
                    Masuk Cepat Akun Pengurus (Uji Coba)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailOrNik('admin@kebonkangkung.id');
                        setPassword('SuperAdmin#2026');
                        setErrorMsg('');
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors text-[11px] cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 block">Super Admin IT</span>
                      <span className="text-[10px] text-slate-400">admin@...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmailOrNik('bambang.rw03@kebonkangkung.id');
                        setPassword('Rw03#Bambang');
                        setErrorMsg('');
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors text-[11px] cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 block">Ketua RW 03</span>
                      <span className="text-[10px] text-slate-400">bambang...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmailOrNik('bendahara.rw03@kebonkangkung.id');
                        setPassword('Bendahara#Rw03');
                        setErrorMsg('');
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors text-[11px] cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 block">Bendahara RW</span>
                      <span className="text-[10px] text-slate-400">bendahara...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmailOrNik('rahmat.rt01@kebonkangkung.id');
                        setPassword('Rt01#Rahmat');
                        setErrorMsg('');
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-colors text-[11px] cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 block">Ketua RT 01</span>
                      <span className="text-[10px] text-slate-400">rahmat...</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Register View */}
          {isRegisterMode && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">Registrasi Akun Warga RW 03</h3>
              
              {regSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pendaftaran berhasil! Akun Anda aktif langsung tanpa menunggu verifikasi. Sedang mengarahkan ke dashboard...</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Sesuai KTP *</label>
                <input
                  type="text"
                  value={regNama}
                  onChange={e => setRegNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Induk Kependudukan (NIK) *</label>
                <input
                  type="text"
                  maxLength={16}
                  value={regNik}
                  onChange={e => setRegNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="16 digit NIK sesuai KTP"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kata Sandi Akun Baru *</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Buat kata sandi akun Anda"
                    required
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showRegPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wilayah RT</label>
                  <select
                    value={regRt}
                    onChange={e => setRegRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={regHp}
                    onChange={e => setRegHp(e.target.value)}
                    placeholder="08..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-colors"
              >
                Daftar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMsg('');
                }}
                className="w-full py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Kembali ke Halaman Masuk
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
