import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User as UserIcon, Calendar, CheckCircle2 } from 'lucide-react';
import { Resident, User, JenisKelamin, Agama, StatusPerkawinan, StatusHubunganKeluarga, StatusDomisili, StatusWarga } from '../../types';
import { StorageService } from '../../services/storageService';

interface FormWargaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Resident;
  defaultRt?: string;
  currentUser?: User;
}

const MONTHS = [
  { value: '01', name: 'Januari' },
  { value: '02', name: 'Februari' },
  { value: '03', name: 'Maret' },
  { value: '04', name: 'April' },
  { value: '05', name: 'Mei' },
  { value: '06', name: 'Juni' },
  { value: '07', name: 'Juli' },
  { value: '08', name: 'Agustus' },
  { value: '09', name: 'September' },
  { value: '10', name: 'Oktober' },
  { value: '11', name: 'November' },
  { value: '12', name: 'Desember' }
];

// Rentang tahun dari 2026 mundur ke 1920
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => CURRENT_YEAR - i);

export const FormWargaModal: React.FC<FormWargaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultRt = '02',
  currentUser
}) => {
  const isPengurusRt = currentUser?.role === 'pengurus_rt';
  const effectiveDefaultRt = (isPengurusRt && currentUser?.RT) ? currentUser.RT : (defaultRt || '02');

  // State isian data warga
  const [nik, setNik] = useState('');
  const [nomorKK, setNomorKK] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  
  // Tanggal Lahir (Hari, Bulan, Tahun)
  const [birthDay, setBirthDay] = useState('01');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthYear, setBirthYear] = useState('1995');
  const [tanggalLahir, setTanggalLahir] = useState('1995-01-01');

  const [usia, setUsia] = useState<number>(0);
  const [jenisKelamin, setJenisKelamin] = useState<JenisKelamin>('L');
  const [agama, setAgama] = useState<Agama>('Islam');
  const [statusPerkawinan, setStatusPerkawinan] = useState<StatusPerkawinan>('Belum Kawin');
  const [hubunganKeluarga, setHubunganKeluarga] = useState<StatusHubunganKeluarga>('Kepala Keluarga');
  const [pendidikan, setPendidikan] = useState('SMA / SMK');
  const [pekerjaan, setPekerjaan] = useState('');
  const [nomorHP, setNomorHP] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState(effectiveDefaultRt);
  const [rw] = useState('03');
  const [statusDomisili, setStatusDomisili] = useState<StatusDomisili>('KTP & Domisili');
  const [statusWarga, setStatusWarga] = useState<StatusWarga>('Tetap');
  const [errorMsg, setErrorMsg] = useState('');

  // Menghitung jumlah hari maksimal berdasarkan bulan dan tahun
  const daysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };

  // Hitung usia presisi
  const computeAge = (y: number, m: number, d: number) => {
    const today = new Date();
    let age = today.getFullYear() - y;
    const monthDiff = today.getMonth() - (m - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
      age--;
    }
    return Math.max(0, age);
  };

  // Sinkronkan perubahan tanggal
  const syncDate = (day: string, month: string, year: string) => {
    const yNum = parseInt(year, 10) || 1995;
    const mNum = parseInt(month, 10) || 1;
    const maxDays = daysInMonth(yNum, mNum);
    let dNum = parseInt(day, 10) || 1;
    if (dNum > maxDays) dNum = maxDays;

    const formattedDay = String(dNum).padStart(2, '0');
    const formattedMonth = String(mNum).padStart(2, '0');
    const formattedYear = String(yNum);

    setBirthDay(formattedDay);
    setBirthMonth(formattedMonth);
    setBirthYear(formattedYear);

    const fullDate = `${formattedYear}-${formattedMonth}-${formattedDay}`;
    setTanggalLahir(fullDate);
    setUsia(computeAge(yNum, mNum, dNum));
  };

  // Sinkronkan semua kolom isian dengan data warga sebelum di edit (initialData)
  useEffect(() => {
    if (isOpen) {
      const activeRt = (currentUser?.role === 'pengurus_rt' && currentUser?.RT) 
        ? currentUser.RT 
        : (defaultRt || '02');

      if (initialData) {
        // Mode Ubah Data Warga: Isi seluruh kolom sesuai data warga asli sebelum diedit
        setNik(initialData.NIK || '');
        setNomorKK(initialData.nomorKK || '');
        setNamaLengkap(initialData.namaLengkap || '');
        setTempatLahir(initialData.tempatLahir || '');

        const dateVal = initialData.tanggalLahir || '1995-01-01';
        setTanggalLahir(dateVal);

        const parts = dateVal.split('-');
        if (parts.length === 3) {
          const y = parts[0] || '1995';
          const m = (parts[1] || '01').padStart(2, '0');
          const d = (parts[2] || '01').padStart(2, '0');
          setBirthYear(y);
          setBirthMonth(m);
          setBirthDay(d);
          setUsia(computeAge(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10)));
        } else {
          setBirthYear('1995');
          setBirthMonth('01');
          setBirthDay('01');
          setUsia(initialData.usia !== undefined ? initialData.usia : 31);
        }

        setJenisKelamin(initialData.jenisKelamin || 'L');
        setAgama(initialData.agama || 'Islam');
        setStatusPerkawinan(initialData.statusPerkawinan || 'Belum Kawin');
        setHubunganKeluarga(initialData.hubunganKeluarga || 'Kepala Keluarga');
        setPendidikan(initialData.pendidikan || 'SMA / SMK');
        setPekerjaan(initialData.pekerjaan || '');
        setNomorHP(initialData.nomorHP || '');
        setEmail(initialData.email || '');
        setAlamat(initialData.alamat || '');
        setRt(initialData.rt || activeRt);
        setStatusDomisili(initialData.statusDomisili || 'KTP & Domisili');
        setStatusWarga(initialData.statusWarga || 'Tetap');
      } else {
        // Mode Registrasi Baru: Form kosong / nilai awal
        setNik('');
        setNomorKK('');
        setNamaLengkap('');
        setTempatLahir('Bandung');
        
        // Default tahun lahir 1995 (usia 31 tahun)
        setBirthYear('1995');
        setBirthMonth('01');
        setBirthDay('01');
        setTanggalLahir('1995-01-01');
        setUsia(computeAge(1995, 1, 1));

        setJenisKelamin('L');
        setAgama('Islam');
        setStatusPerkawinan('Belum Kawin');
        setHubunganKeluarga('Kepala Keluarga');
        setPendidikan('SMA / SMK');
        setPekerjaan('');
        setNomorHP('');
        setEmail('');
        setAlamat(`Jl. Kebon Kangkung No. ... RT ${activeRt} / RW 03`);
        setRt(activeRt);
        setStatusDomisili('KTP & Domisili');
        setStatusWarga('Tetap');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialData, defaultRt, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik || nik.length < 16) {
      setErrorMsg('NIK harus terdiri dari 16 digit angka.');
      return;
    }
    if (!nomorKK || nomorKK.length < 16) {
      setErrorMsg('Nomor Kartu Keluarga harus terdiri dari 16 digit angka.');
      return;
    }
    if (!namaLengkap.trim()) {
      setErrorMsg('Nama lengkap warga wajib diisi.');
      return;
    }

    const activeRt = StorageService.normalizeRt(
      (currentUser?.role === 'pengurus_rt' && currentUser?.RT) 
        ? currentUser.RT 
        : (defaultRt || '02')
    );

    // Pastikan wilayah RT untuk role pengurus_rt selalu sesuai hak akses RT-nya
    const finalRt = StorageService.normalizeRt(
      (currentUser?.role === 'pengurus_rt' && currentUser?.RT) 
        ? currentUser.RT 
        : (rt || activeRt || '02')
    );

    let cleanNik = nik.replace(/\D/g, '');
    if (!cleanNik) {
      setErrorMsg('Nomor Induk Kependudukan (NIK) wajib diisi.');
      return;
    }
    // Jika digit NIK kurang dari 16 digit, lengkapi otomatis agar tidak gagal simpan
    if (cleanNik.length < 16) {
      cleanNik = cleanNik.padEnd(16, '0');
    }

    let cleanKk = nomorKK.replace(/\D/g, '');
    if (!cleanKk) {
      cleanKk = `327318${finalRt}${Date.now().toString().slice(-8)}`;
    } else if (cleanKk.length < 16) {
      cleanKk = cleanKk.padEnd(16, '0');
    }

    if (!namaLengkap.trim()) {
      setErrorMsg('Nama lengkap warga wajib diisi.');
      return;
    }

    onSave({
      NIK: cleanNik,
      nomorKK: cleanKk,
      namaLengkap: namaLengkap.trim(),
      tempatLahir: tempatLahir.trim() || 'Bandung',
      tanggalLahir,
      usia,
      jenisKelamin,
      agama,
      statusPerkawinan,
      hubunganKeluarga,
      pendidikan,
      pekerjaan: pekerjaan.trim() || '-',
      nomorHP: nomorHP.trim(),
      email: email.trim(),
      alamat: alamat.trim() || `Jl. Kebon Kangkung RT ${finalRt} / RW 03`,
      rt: finalRt,
      rw,
      statusDomisili,
      statusWarga
    });

    onClose();
  };

  // Helper untuk membuat NIK & No KK simulasi cepat 16 digit
  const handleGenerateSampleNikKk = () => {
    const curRt = StorageService.normalizeRt(
      (currentUser?.role === 'pengurus_rt' && currentUser?.RT) ? currentUser.RT : rt
    );
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateFormatted = birthYear.slice(-2) + birthMonth + birthDay;
    const generatedNik = `327318${dateFormatted}${randomSuffix}`;
    const generatedKk = `327318${curRt}01${randomSuffix}`;
    setNik(generatedNik);
    setNomorKK(generatedKk);
    setErrorMsg('');
  };

  const maxDayCurrentMonth = daysInMonth(parseInt(birthYear, 10) || 1995, parseInt(birthMonth, 10) || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-2">
                <span>{initialData ? 'Ubah Data Warga' : 'Form Registrasi Warga Baru'}</span>
                {currentUser?.role === 'pengurus_rt' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    RT {StorageService.normalizeRt(currentUser.RT)}
                  </span>
                )}
                {initialData && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Sinkron: {initialData.namaLengkap}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
                {initialData 
                  ? `Mengubah informasi data warga RT ${initialData.rt} / RW 03 Kebon Kangkung` 
                  : currentUser?.role === 'pengurus_rt'
                  ? `Pendaftaran warga baru untuk wilayah RT ${StorageService.normalizeRt(currentUser.RT)} / RW 03 Kebon Kangkung (Langsung tercatat pada Daftar Warga Terdata A - Z)`
                  : 'Pendaftaran warga baru lingkungan RW 03 Kebon Kangkung (Langsung tercatat pada Daftar Warga Terdata A - Z)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info Banner Khusus Pengurus RT */}
          {currentUser?.role === 'pengurus_rt' && !initialData && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <div className="text-[11px] leading-relaxed">
                  Anda mendaftarkan warga baru untuk <strong>RT {StorageService.normalizeRt(currentUser.RT)}</strong>. Setelah menekan tombol <strong>Simpan Data Warga Baru</strong>, data akan langsung tercatat dan masuk ke urutan <strong>Daftar Warga Terdata (A - Z)</strong>.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateSampleNikKk}
                className="shrink-0 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-semibold border border-emerald-300 transition-colors"
                title="Isi contoh NIK & No. KK 16 digit otomatis"
              >
                Buat NIK & KK Acak
              </button>
            </div>
          )}

          {/* NIK & Nomor KK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 block">
                  Nomor Induk Kependudukan (NIK) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSampleNikKk}
                  className="text-[10px] text-emerald-700 hover:underline font-medium"
                >
                  Generate NIK
                </button>
              </div>
              <input
                type="text"
                maxLength={16}
                value={nik}
                onChange={e => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="16 digit NIK sesuai KTP"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nomor Kartu Keluarga (KK) *
              </label>
              <input
                type="text"
                maxLength={16}
                value={nomorKK}
                onChange={e => setNomorKK(e.target.value.replace(/\D/g, ''))}
                placeholder="16 digit Nomor Kartu Keluarga"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-xs"
              />
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nama Lengkap Sesuai KTP *
            </label>
            <input
              type="text"
              value={namaLengkap}
              onChange={e => setNamaLengkap(e.target.value)}
              placeholder="Contoh: Ahmad Yani"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
            />
          </div>

          {/* Tempat Lahir & Usia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={tempatLahir}
                onChange={e => setTempatLahir(e.target.value)}
                placeholder="Kota Kelahiran (Contoh: Bandung)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Usia Terhitung</span>
                <span className="text-[10px] text-emerald-700 font-normal">Otomatis dari tanggal lahir</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={usia}
                  onChange={e => setUsia(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800 text-xs"
                />
                <span className="text-slate-500 font-semibold text-xs whitespace-nowrap">Tahun</span>
              </div>
            </div>
          </div>

          {/* Tanggal Lahir (Pilihan Hari, Bulan, dan Tahun) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Tanggal Lahir *</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Tanggal (Hari) */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Tanggal
                </label>
                <select
                  value={birthDay}
                  onChange={e => syncDate(e.target.value, birthMonth, birthYear)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                >
                  {Array.from({ length: maxDayCurrentMonth }, (_, i) => {
                    const val = String(i + 1).padStart(2, '0');
                    return (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bulan Lahir */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Bulan
                </label>
                <select
                  value={birthMonth}
                  onChange={e => syncDate(birthDay, e.target.value, birthYear)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tahun Lahir */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Tahun
                </label>
                <select
                  value={birthYear}
                  onChange={e => syncDate(birthDay, birthMonth, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                >
                  {YEARS.map(y => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Jenis Kelamin, Agama, Hubungan Keluarga */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
              <select
                value={jenisKelamin}
                onChange={e => setJenisKelamin(e.target.value as JenisKelamin)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Agama</label>
              <select
                value={agama}
                onChange={e => setAgama(e.target.value as Agama)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Hubungan Keluarga</label>
              <select
                value={hubunganKeluarga}
                onChange={e => setHubunganKeluarga(e.target.value as StatusHubunganKeluarga)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="Kepala Keluarga">Kepala Keluarga</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Famili Lain">Famili Lain</option>
              </select>
            </div>
          </div>

          {/* Status Perkawinan, Pendidikan Terakhir, Pekerjaan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status Perkawinan</label>
              <select
                value={statusPerkawinan}
                onChange={e => setStatusPerkawinan(e.target.value as StatusPerkawinan)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="Belum Kawin">Belum Kawin</option>
                <option value="Kawin">Kawin</option>
                <option value="Cerai Hidup">Cerai Hidup</option>
                <option value="Cerai Mati">Cerai Mati</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pendidikan Terakhir</label>
              <select
                value={pendidikan}
                onChange={e => setPendidikan(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="Tidak / Belum Sekolah">Tidak / Belum Sekolah</option>
                <option value="SD / Sederajat">SD / Sederajat</option>
                <option value="SMP / Sederajat">SMP / Sederajat</option>
                <option value="SMA / SMK">SMA / SMK</option>
                <option value="D3">Diploma (D3)</option>
                <option value="S1 / D4">Sarjana (S1 / D4)</option>
                <option value="S2">Magister (S2)</option>
                <option value="S3">Doktor (S3)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pekerjaan</label>
              <input
                type="text"
                value={pekerjaan}
                onChange={e => setPekerjaan(e.target.value)}
                placeholder="Contoh: Karyawan Swasta, Wiraswasta"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
          </div>

          {/* RT, Status Domisili, Status Kependudukan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Wilayah RT</span>
                {currentUser?.role === 'pengurus_rt' && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Wilayah RT Anda
                  </span>
                )}
              </label>
              <select
                value={currentUser?.role === 'pengurus_rt' ? StorageService.normalizeRt(currentUser.RT) : StorageService.normalizeRt(rt)}
                disabled={currentUser?.role === 'pengurus_rt'}
                onChange={e => setRt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-800 disabled:font-semibold"
              >
                <option value="01">RT 01</option>
                <option value="02">RT 02</option>
                <option value="03">RT 03</option>
                <option value="04">RT 04</option>
                <option value="05">RT 05</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status Domisili</label>
              <select
                value={statusDomisili}
                onChange={e => setStatusDomisili(e.target.value as StatusDomisili)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="KTP & Domisili">KTP & Domisili</option>
                <option value="KTP Saja">KTP Saja</option>
                <option value="Domisili Saja">Domisili Saja</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status Kependudukan</label>
              <select
                value={statusWarga}
                onChange={e => setStatusWarga(e.target.value as StatusWarga)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs bg-white"
              >
                <option value="Tetap">Tetap</option>
                <option value="Kontrak/Kos">Kontrak/Kos</option>
                <option value="Pindah">Pindah</option>
                <option value="Meninggal">Meninggal</option>
              </select>
            </div>
          </div>

          {/* Alamat Domisili */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Alamat Domisili Lengkap</label>
            <input
              type="text"
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              placeholder="Jl. Kebon Kangkung No. ... RT ... / RW 03"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
            />
          </div>

          {/* Nomor WhatsApp & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                value={nomorHP}
                onChange={e => setNomorHP(e.target.value)}
                placeholder="08..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email (Opsional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors flex items-center gap-1.5 text-xs shadow-sm cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{initialData ? 'Simpan Perubahan Warga' : 'Simpan Data Warga Baru'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
