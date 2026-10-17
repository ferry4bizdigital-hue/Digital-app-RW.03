import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  AlertCircle, 
  Plus, 
  Volume2, 
  Calendar,
  ArrowRight,
  Wallet,
  CheckCircle2,
  Activity,
  TrendingUp,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Baby
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { User, Resident, FamilyCard } from '../../types';
import { ActiveTab } from '../layout/BottomNav';
import { FormWargaModal } from '../warga/FormWargaModal';

interface RtDashboardProps {
  currentUser: User;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const RtDashboard: React.FC<RtDashboardProps> = ({ currentUser, onNavigateTab }) => {
  const rtCode = StorageService.normalizeRt(currentUser.RT || '02');
  const [allResidents, setAllResidents] = useState<Resident[]>(() => StorageService.getResidents());
  const [allFamilies, setAllFamilies] = useState<FamilyCard[]>(() => StorageService.getFamilies());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setAllResidents(StorageService.getResidents());
      setAllFamilies(StorageService.getFamilies());
    });
    return unsubscribe;
  }, []);

  const residents = allResidents.filter(r => StorageService.normalizeRt(r.rt) === rtCode);
  const activeResidents = residents.filter(r => r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah');
  const deceasedResidents = residents.filter(r => r.statusWarga === 'Meninggal');
  const movedResidents = residents.filter(r => r.statusWarga === 'Pindah');
  const families = allFamilies.filter(f => StorageService.normalizeRt(f.rt) === rtCode);
  const complaints = StorageService.getComplaints().filter(c => StorageService.normalizeRt(c.rt) === rtCode);
  const events = StorageService.getEvents().filter(e => !e.rt || StorageService.normalizeRt(e.rt) === rtCode);
  const rtDues = StorageService.getDues().filter(d => StorageService.normalizeRt(d.rt) === rtCode);

  // Perhitungan Piramida Kelompok Usia Penduduk RT
  const balitaL = activeResidents.filter(r => r.usia <= 5 && r.jenisKelamin === 'L').length;
  const balitaP = activeResidents.filter(r => r.usia <= 5 && r.jenisKelamin === 'P').length;
  const balitaTotal = balitaL + balitaP;

  const anakL = activeResidents.filter(r => r.usia >= 6 && r.usia <= 17 && r.jenisKelamin === 'L').length;
  const anakP = activeResidents.filter(r => r.usia >= 6 && r.usia <= 17 && r.jenisKelamin === 'P').length;
  const anakTotal = anakL + anakP;

  const dewasaMudaL = activeResidents.filter(r => r.usia >= 18 && r.usia <= 39 && r.jenisKelamin === 'L').length;
  const dewasaMudaP = activeResidents.filter(r => r.usia >= 18 && r.usia <= 39 && r.jenisKelamin === 'P').length;
  const dewasaMudaTotal = dewasaMudaL + dewasaMudaP;

  const dewasaMadyaL = activeResidents.filter(r => r.usia >= 40 && r.usia <= 59 && r.jenisKelamin === 'L').length;
  const dewasaMadyaP = activeResidents.filter(r => r.usia >= 40 && r.usia <= 59 && r.jenisKelamin === 'P').length;
  const dewasaMadyaTotal = dewasaMadyaL + dewasaMadyaP;

  const lansiaL = activeResidents.filter(r => r.usia >= 60 && r.jenisKelamin === 'L').length;
  const lansiaP = activeResidents.filter(r => r.usia >= 60 && r.jenisKelamin === 'P').length;
  const lansiaTotal = lansiaL + lansiaP;

  const totalWarga = activeResidents.length;
  const totalLaki = activeResidents.filter(r => r.jenisKelamin === 'L').length;
  const totalPerempuan = activeResidents.filter(r => r.jenisKelamin === 'P').length;
  const persenLaki = totalWarga > 0 ? Math.round((totalLaki / totalWarga) * 100) : 0;
  const persenPerempuan = totalWarga > 0 ? 100 - persenLaki : 0;

  const totalProduktif = dewasaMudaTotal + dewasaMadyaTotal;
  const persenProduktif = totalWarga > 0 ? Math.round((totalProduktif / totalWarga) * 100) : 0;
  const totalNonProduktif = balitaTotal + anakTotal + lansiaTotal;
  const rasioKetergantungan = totalProduktif > 0 ? Math.round((totalNonProduktif / totalProduktif) * 100) : 0;

  // Nilai maksimum per kelompok gender untuk penskalaan visual bar piramida
  const maxGenderCount = Math.max(
    balitaL, balitaP,
    anakL, anakP,
    dewasaMudaL, dewasaMudaP,
    dewasaMadyaL, dewasaMadyaP,
    lansiaL, lansiaP,
    1
  );

  const agePyramidTiers = [
    {
      groupKey: 'lansia',
      title: 'Lanjut Usia (Lansia)',
      ageRange: '60+ Tahun',
      badge: 'Posbindu Lansia',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      countL: lansiaL,
      countP: lansiaP,
      total: lansiaTotal,
      desc: 'Pelayanan pemeriksaan tensi & senam lansia',
      filterGroup: 'lansia'
    },
    {
      groupKey: 'dewasa_madya',
      title: 'Dewasa Madya',
      ageRange: '40 - 59 Tahun',
      badge: 'Pekerja Mapan',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      countL: dewasaMadyaL,
      countP: dewasaMadyaP,
      total: dewasaMadyaTotal,
      desc: 'Kepala keluarga, wirausaha & tokoh lingkungan RT',
      filterGroup: 'dewasa'
    },
    {
      groupKey: 'dewasa_muda',
      title: 'Dewasa Muda',
      ageRange: '18 - 39 Tahun',
      badge: 'Usia Produktif',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      countL: dewasaMudaL,
      countP: dewasaMudaP,
      total: dewasaMudaTotal,
      desc: 'Tenaga kerja, pemuda Karang Taruna & profesional',
      filterGroup: 'dewasa'
    },
    {
      groupKey: 'anak',
      title: 'Anak & Remaja',
      ageRange: '6 - 17 Tahun',
      badge: 'Wajib Belajar',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      countL: anakL,
      countP: anakP,
      total: anakTotal,
      desc: 'Pelajar SD/SMP/SMA & bimbingan belajar lingkungan',
      filterGroup: 'anak'
    },
    {
      groupKey: 'balita',
      title: 'Balita & Batita',
      ageRange: '0 - 5 Tahun',
      badge: 'Posyandu Melati',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      countL: balitaL,
      countP: balitaP,
      total: balitaTotal,
      desc: 'Sasaran timbangan bulanan, imunisasi & gizi balita',
      filterGroup: 'balita'
    }
  ];

  const handleSaveResident = (data: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>) => {
    data.rt = rtCode;
    const created = StorageService.addResident(data);
    setToastMessage(`Data warga baru an. ${created.namaLengkap} berhasil disimpan dan langsung tercatat pada Daftar Warga Terdata (A - Z)!`);
    setSuccessToast(true);
    setIsFormOpen(false);
    setTimeout(() => setSuccessToast(false), 5000);
  };

  const activeComplaints = complaints.filter(c => c.status === 'Baru' || c.status === 'Diproses');

  // Akurasi Kartu Keluarga: sinkron dengan data warga & kartu keluarga di RT
  const totalKkCount = families.length;

  // IWD RT Metrics
  const iwdTarget = rtDues.reduce((acc, curr) => acc + curr.nominal, 0);
  const iwdLunas = rtDues.filter(d => d.status === 'Lunas').reduce((acc, curr) => acc + curr.nominal, 0);
  const iwdTunggakan = iwdTarget - iwdLunas;

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-900 rounded-2xl p-5 text-white shadow-md">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 uppercase tracking-wider mb-1">
            <span>Wilayah Pelayanan Rukun Tetangga</span>
            <span aria-hidden="true">·</span>
            <span>RT {rtCode} / RW 03</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Selamat Datang, {currentUser.nama}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Anda mengelola administrasi warga RT {rtCode}. Pengecekan data kependudukan, pemantauan kartu keluarga, pengelolaan iuran warga digital, dan koordinasi lingkungan terlaksana secara praktis.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-3.5 py-1.5 bg-white text-emerald-900 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Warga RT {rtCode}</span>
            </button>
            <button
              onClick={() => onNavigateTab('iuran')}
              className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Kelola Iuran (IWD) RT {rtCode}</span>
            </button>
            <button
              onClick={() => onNavigateTab('pengumuman')}
              className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Info Khusus RT {rtCode}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Sinkron Kartu Keluarga dengan Data Warga) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Warga RT */}
        <div 
          onClick={() => onNavigateTab('warga')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Warga RT {rtCode}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {activeResidents.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Jiwa penduduk aktif di RT {rtCode}</span>
            {(deceasedResidents.length > 0 || movedResidents.length > 0) && (
              <span className="text-[10px] text-slate-400 font-medium">
                {[
                  movedResidents.length > 0 ? `${movedResidents.length} Pindah` : '',
                  deceasedResidents.length > 0 ? `${deceasedResidents.length} Meninggal` : ''
                ].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Kartu Keluarga (Sesuai dengan data warga) */}
        <div 
          onClick={() => {
            onNavigateTab('kk');
          }}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Kartu Keluarga RT {rtCode}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Lihat & Kelola
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {totalKkCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Kepala keluarga terdaftar</span>
            {currentUser.role === 'super_admin' && (
              <span className="text-[10px] text-blue-700 font-semibold group-hover:underline">
                Kelola KK →
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Iuran Terkumpul RT */}
        <div 
          onClick={() => onNavigateTab('iuran')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Penerimaan IWD (Lunas)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums font-mono">
            Rp {iwdLunas.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {rtDues.filter(d => d.status === 'Lunas').length} dari {rtDues.length} KK telah lunas
          </div>
        </div>

        {/* Card 4: Pengaduan Lingkungan */}
        <div 
          onClick={() => onNavigateTab('pengaduan')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Pengaduan RT {rtCode}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {activeComplaints.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeComplaints.length > 0 ? 'Perlu respon lingkungan' : 'Lingkungan kondusif'}
          </div>
        </div>
      </div>

      {/* Status Iuran Warga Digital (IWD) RT Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Iuran RT {rtCode}
              </span>
              <span className="text-xs text-slate-400">· Tarif Berbeda Tiap Warga</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              Status Penerimaan Iuran Warga Digital (IWD) RT {rtCode}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola besaran nominal iuran warga, tanggal pembayaran, dan status lunas warga RT {rtCode}.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('iuran')}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Kelola IWD RT {rtCode}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Metrics Cards for RT */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Target Penerimaan
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
              Rp {iwdTarget.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Berdasarkan {rtDues.length} data tagihan yang diinput RT {rtCode}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Penerimaan Terkumpul (Lunas)
            </span>
            <span className="text-xl font-bold text-emerald-900 font-mono block mt-1">
              Rp {iwdLunas.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              {rtDues.filter(d => d.status === 'Lunas').length} KK telah melunasi iuran
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              Tunggakan / Belum Lunas
            </span>
            <span className="text-xl font-bold text-rose-900 font-mono block mt-1">
              Rp {iwdTunggakan.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-rose-700 block mt-0.5">
              {rtDues.filter(d => d.status === 'Belum Bayar').length} KK belum membayar
            </span>
          </div>
        </div>
      </div>

      {/* Piramida Kelompok Usia Penduduk RT {rtCode} */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Demografi RT {rtCode}
              </span>
              <span className="text-xs text-slate-400">· Basis Data Program Lingkungan</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              PIRAMIDA KELOMPOK USIA PENDUDUK RT {rtCode}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi kelompok umur dan rasio jenis kelamin penduduk RT {rtCode} sebagai acuan program Posyandu Melati, Karang Taruna, dan Posbindu Lansia.
            </p>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('rw03_filter_age_group');
              onNavigateTab('warga');
            }}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lihat Seluruh Warga RT {rtCode}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Demographic Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Penduduk RT {rtCode}</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-0.5">{totalWarga} Jiwa</div>
            <span className="text-[10px] text-slate-500 block mt-0.5">{totalLaki} L · {totalPerempuan} P</span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">Usia Produktif (18-59)</span>
            <div className="text-lg sm:text-xl font-bold text-emerald-900 font-mono mt-0.5">{totalProduktif} Jiwa</div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">{persenProduktif}% Populasi RT {rtCode}</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">Lansia & Balita</span>
            <div className="text-lg sm:text-xl font-bold text-amber-900 font-mono mt-0.5">{lansiaTotal + balitaTotal} Jiwa</div>
            <span className="text-[10px] text-amber-700 block mt-0.5">Prioritas Layanan Kesehatan</span>
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200">
            <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider block">Beban Ketergantungan</span>
            <div className="text-lg sm:text-xl font-bold text-indigo-900 font-mono mt-0.5">{rasioKetergantungan}%</div>
            <span className="text-[10px] text-indigo-700 block mt-0.5">Dependency Ratio RT</span>
          </div>
        </div>

        {/* Piramida Penduduk Bilateral Visual Chart */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold pb-2.5 mb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-1.5 text-blue-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
              <span>Laki-Laki ({totalLaki} Jiwa · {persenLaki}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Bagan Piramida Penduduk RT {rtCode}</span>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span>Perempuan ({totalPerempuan} Jiwa · {persenPerempuan}%)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            </div>
          </div>

          {/* Pyramid Tiers */}
          <div className="space-y-2">
            {agePyramidTiers.map(tier => {
              const pctL = maxGenderCount > 0 ? (tier.countL / maxGenderCount) * 100 : 0;
              const pctP = maxGenderCount > 0 ? (tier.countP / maxGenderCount) * 100 : 0;
              const shareOfRt = totalWarga > 0 ? Math.round((tier.total / totalWarga) * 100) : 0;

              return (
                <div 
                  key={tier.groupKey}
                  onClick={() => {
                    sessionStorage.setItem('rw03_filter_age_group', tier.filterGroup);
                    onNavigateTab('warga');
                  }}
                  className="p-2 sm:p-2.5 bg-white rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
                  title={`Klik untuk melihat daftar warga ${tier.title} (${tier.ageRange}) di RT ${rtCode}`}
                >
                  <div className="grid grid-cols-12 items-center gap-2">
                    {/* Left side: Male Bar */}
                    <div className="col-span-4 flex items-center justify-end gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                        {tier.countL}
                        <span className="hidden sm:inline text-[10px] text-slate-400 font-normal ml-1">
                          ({totalWarga > 0 ? Math.round((tier.countL / totalWarga) * 100) : 0}%)
                        </span>
                      </span>
                      <div className="w-20 sm:w-36 h-4 bg-slate-100 rounded-l-md overflow-hidden flex justify-end">
                        <div 
                          className="h-full bg-blue-600 rounded-l-md transition-all duration-500 group-hover:bg-blue-700"
                          style={{ width: `${Math.max(pctL, tier.countL > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Center: Age group label */}
                    <div className="col-span-4 text-center px-1">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {tier.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{tier.ageRange}</div>
                      <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${tier.badgeColor}`}>
                        {tier.total} Jiwa ({shareOfRt}%)
                      </span>
                    </div>

                    {/* Right side: Female Bar */}
                    <div className="col-span-4 flex items-center justify-start gap-2">
                      <div className="w-20 sm:w-36 h-4 bg-slate-100 rounded-r-md overflow-hidden flex justify-start">
                        <div 
                          className="h-full bg-rose-500 rounded-r-md transition-all duration-500 group-hover:bg-rose-600"
                          style={{ width: `${Math.max(pctP, tier.countP > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                        {tier.countP}
                        <span className="hidden sm:inline text-[10px] text-slate-400 font-normal ml-1">
                          ({totalWarga > 0 ? Math.round((tier.countP / totalWarga) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gender Ratio Bar */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600 font-medium">Perbandingan Gender Penduduk RT {rtCode}:</span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                {totalLaki} Laki-laki ({persenLaki}%) · {totalPerempuan} Perempuan ({persenPerempuan}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full flex overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${persenLaki}%` }} />
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${persenPerempuan}%` }} />
            </div>
          </div>
        </div>

        {/* 4 Program Planning Cards for RT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div 
            onClick={() => {
              sessionStorage.setItem('rw03_filter_age_group', 'balita');
              onNavigateTab('warga');
            }}
            className="p-3.5 bg-teal-50/60 hover:bg-teal-50 rounded-xl border border-teal-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-teal-800 mb-1.5">
              <Baby className="w-4 h-4" />
              <span className="text-xs font-bold">Posyandu Balita</span>
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
              {balitaTotal} <span className="text-xs font-normal text-slate-500">Balita (0-5 Th)</span>
            </div>
            <p className="text-[11px] text-teal-800/90 mt-1 leading-snug">
              Sasaran timbangan bulanan, vitamin A & pemantauan gizi balita di Posyandu Melati.
            </p>
          </div>

          <div 
            onClick={() => {
              sessionStorage.setItem('rw03_filter_age_group', 'anak');
              onNavigateTab('warga');
            }}
            className="p-3.5 bg-indigo-50/60 hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-indigo-800 mb-1.5">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs font-bold">Usia Pendidikan</span>
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
              {anakTotal} <span className="text-xs font-normal text-slate-500">Anak (6-17 Th)</span>
            </div>
            <p className="text-[11px] text-indigo-800/90 mt-1 leading-snug">
              Target program wajib belajar, bimbingan belajar, dan beasiswa pendidikan anak RT {rtCode}.
            </p>
          </div>

          <div 
            onClick={() => {
              sessionStorage.setItem('rw03_filter_age_group', 'dewasa');
              onNavigateTab('warga');
            }}
            className="p-3.5 bg-blue-50/60 hover:bg-blue-50 rounded-xl border border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-blue-800 mb-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs font-bold">Tenaga Kerja & Usaha</span>
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
              {totalProduktif} <span className="text-xs font-normal text-slate-500">Produktif (18-59 Th)</span>
            </div>
            <p className="text-[11px] text-blue-800/90 mt-1 leading-snug">
              Potensi penggerak ekonomi warga, pelaku usaha, dan pemuda Karang Taruna RT {rtCode}.
            </p>
          </div>

          <div 
            onClick={() => {
              sessionStorage.setItem('rw03_filter_age_group', 'lansia');
              onNavigateTab('warga');
            }}
            className="p-3.5 bg-amber-50/60 hover:bg-amber-50 rounded-xl border border-amber-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-amber-800 mb-1.5">
              <HeartPulse className="w-4 h-4" />
              <span className="text-xs font-bold">Posbindu Lansia</span>
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
              {lansiaTotal} <span className="text-xs font-normal text-slate-500">Lansia (60+ Th)</span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-1 leading-snug">
              Pemeriksaan tensi rutin, senam bugar lansia, dan perhatian sosial warga senior RT {rtCode}.
            </p>
          </div>
        </div>
      </div>

      {/* Complaints in RT & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints in RT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Laporan Lingkungan RT {rtCode}
            </h3>
            <button
              onClick={() => onNavigateTab('pengaduan')}
              className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Buka Modul
            </button>
          </div>

          {complaints.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Belum ada laporan masalah lingkungan di RT {rtCode}.</p>
          ) : (
            <div className="space-y-3">
              {complaints.slice(0, 3).map(cmp => (
                <div
                  key={cmp.id}
                  onClick={() => onNavigateTab('pengaduan')}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{cmp.judul}</h4>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {cmp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{cmp.deskripsi}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Agenda */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Agenda Lingkungan RW & RT {rtCode}
            </h3>
            <button
              onClick={() => onNavigateTab('agenda')}
              className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 3).map(evt => (
              <div
                key={evt.id}
                onClick={() => onNavigateTab('agenda')}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
              >
                <div className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-mono text-center text-xs font-bold shrink-0">
                  {evt.tanggal.substring(8, 10)} SEP
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{evt.namaKegiatan}</h4>
                  <p className="text-[11px] text-slate-600">{evt.lokasi} · {evt.waktu}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => onNavigateTab('warga')}
            className="ml-2 text-emerald-400 underline hover:text-emerald-300 font-bold"
          >
            Lihat Daftar Warga (A - Z) →
          </button>
        </div>
      )}

      {/* Form Modal (Tambah Data Warga Baru) */}
      <FormWargaModal
        isOpen={isFormOpen}
        currentUser={currentUser}
        defaultRt={rtCode}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveResident}
      />
    </div>
  );
};
