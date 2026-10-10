import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  ShieldAlert,
  Plus,
  Volume2,
  Wallet,
  CheckCircle2,
  UserCheck,
  Store
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';
import { User, Resident, FamilyCard } from '../../types';

interface RwDashboardProps {
  currentUser?: User;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const RwDashboard: React.FC<RwDashboardProps> = ({ currentUser, onNavigateTab }) => {
  const activeUser = currentUser || StorageService.getCurrentUser();
  const [residents, setResidents] = useState<Resident[]>(() => StorageService.getResidents());
  const [families, setFamilies] = useState<FamilyCard[]>(() => StorageService.getFamilies());

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setResidents(StorageService.getResidents());
      setFamilies(StorageService.getFamilies());
    });
    return unsubscribe;
  }, []);

  const complaints = StorageService.getComplaints();
  const transactions = StorageService.getTransactions();
  const events = StorageService.getEvents();

  // Warga aktif (hanya yang berstatus tinggal aktif, bukan 'Meninggal' dan bukan 'Pindah')
  // Warga berstatus Meninggal atau Pindah tidak dihitung dalam jumlah total warga dashboard
  const activeResidents = residents.filter(r => r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah');
  const deceasedResidents = residents.filter(r => r.statusWarga === 'Meninggal');
  const movedResidents = residents.filter(r => r.statusWarga === 'Pindah');

  const totalWarga = activeResidents.length;
  const totalMeninggal = deceasedResidents.length;
  const totalPindah = movedResidents.length;
  const totalKk = families.length;
  const pengaduanAktif = complaints.filter(c => c.status === 'Baru' || c.status === 'Diproses').length;

  // Demographics: Residents per RT (hanya warga aktif)
  const rtList = ['01', '02', '03', '04', '05'];
  const wargaPerRt = rtList.map(rt => ({
    rt: `RT ${rt}`,
    count: activeResidents.filter(r => StorageService.normalizeRt(r.rt) === StorageService.normalizeRt(rt)).length
  }));
  const maxWargaInRt = Math.max(...wargaPerRt.map(w => w.count), 1);

  // Gender breakdown (hanya warga aktif)
  const totalLaki = activeResidents.filter(r => r.jenisKelamin === 'L').length;
  const totalPerempuan = activeResidents.filter(r => r.jenisKelamin === 'P').length;
  const persenLaki = totalWarga > 0 ? Math.round((totalLaki / totalWarga) * 100) : 50;
  const persenPerempuan = 100 - persenLaki;

  // Age groups: Balita (0-5), Anak/Remaja (6-17), Dewasa (18-59), Lansia (60+) (hanya warga aktif)
  const ageBalita = activeResidents.filter(r => r.usia <= 5).length;
  const ageAnak = activeResidents.filter(r => r.usia >= 6 && r.usia <= 17).length;
  const ageDewasa = activeResidents.filter(r => r.usia >= 18 && r.usia <= 59).length;
  const ageLansia = activeResidents.filter(r => r.usia >= 60).length;

  // Finance calculation (sinkron dengan Buku Kas dan Transparansi RW 03)
  const { totalMasuk: totalPemasukan, totalKeluar: totalPengeluaran, saldo: saldoKasRw } = StorageService.getKasRwSummary();

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Banner / Editorial Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">
            <span>
              {activeUser.role === 'super_admin' ? 'Dashboard Super Admin & IT RW 03' : activeUser.role === 'bendahara' ? 'Dashboard Eksekutif & Keuangan Bendahara RW 03' : 'Dashboard Eksekutif RW 03'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Kelurahan Kebon Kangkung</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Selamat Datang, {activeUser.nama}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {activeUser.role === 'super_admin'
              ? 'Akses pengelola sistem terpusat, administrasi data terpadu 5 Rukun Tetangga (RT 01 - RT 05), monitoring pelayanan warga, dan transparansi keuangan lingkungan secara real-time.'
              : 'Data administrasi terpadu untuk 5 Rukun Tetangga (RT 01 - RT 05). Pantau kependudukan warga, laporan keluhan, dan transparansi keuangan lingkungan secara real-time.'}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {activeUser.role === 'super_admin' && (
              <>
                <button
                  onClick={() => onNavigateTab('pengurus')}
                  className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-950" />
                  <span>Pendaftaran Pengurus RT/RW</span>
                </button>
                <button
                  onClick={() => onNavigateTab('ngontrak_usaha')}
                  className="px-3.5 py-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-slate-950" />
                  <span>Warga Ngontrak Usaha</span>
                </button>
              </>
            )}
            <button
              onClick={() => onNavigateTab('keuangan')}
              className="px-3 py-1.5 bg-white text-emerald-900 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kas & Keuangan</span>
            </button>
            <button
              onClick={() => onNavigateTab('warga')}
              className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Warga</span>
            </button>
            <button
              onClick={() => onNavigateTab('pengumuman')}
              className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Buat Pengumuman</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Warga */}
        <div 
          onClick={() => onNavigateTab('warga')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Warga Terdata</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {totalWarga}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center flex-wrap gap-1">
            <span className="text-emerald-700 font-semibold">{totalLaki} L</span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold">{totalPerempuan} P</span>
            <span>·</span>
            <span>5 RT</span>
            {(totalMeninggal > 0 || totalPindah > 0) && (
              <>
                <span>·</span>
                <span className="text-slate-400 font-medium">
                  {[
                    totalPindah > 0 ? `${totalPindah} Pindah` : '',
                    totalMeninggal > 0 ? `${totalMeninggal} Wafat` : ''
                  ].filter(Boolean).join(', ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Total KK */}
        <div 
          onClick={() => onNavigateTab('kk')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Kartu Keluarga</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {totalKk}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rata-rata 3-4 jiwa per keluarga
          </div>
        </div>

        {/* Pengaduan Warga */}
        <div 
          onClick={() => onNavigateTab('pengaduan')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pengaduan Warga</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">
            {pengaduanAktif}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {pengaduanAktif > 0 ? `${pengaduanAktif} laporan aktif butuh tindak lanjut` : 'Semua keluhan selesai'}
          </div>
        </div>

        {/* Saldo Kas RW */}
        <div 
          onClick={() => onNavigateTab('keuangan')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Saldo Kas RW</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-800 tabular-nums">
            Rp {saldoKasRw.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Transparan & terverifikasi
          </div>
        </div>
      </div>

      {/* Interactive Demographic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Warga Per RT Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Distribusi Warga per Rukun Tetangga (RT)</h3>
              <p className="text-xs text-slate-500">Jumlah jiwa penduduk terdaftar di RW 03</p>
            </div>
            <button
              onClick={() => onNavigateTab('warga')}
              className="text-xs text-emerald-700 hover:underline font-medium"
            >
              Lihat Detail
            </button>
          </div>

          <div className="space-y-3">
            {wargaPerRt.map(item => {
              const pct = Math.round((item.count / maxWargaInRt) * 100);
              return (
                <div key={item.rt} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.rt}</span>
                    <span className="font-mono text-slate-600 tabular-nums">{item.count} Warga</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Age Groups & Gender */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Piramida Kelompok Usia Penduduk</h3>
            <p className="text-xs text-slate-500 mb-4">Basis data perencanaan program Posyandu, Lansia & Karang Taruna</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Balita (0 - 5 Th)</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{ageBalita} Jiwa</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Target Posyandu Melati</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Anak & Remaja (6 - 17 Th)</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{ageAnak} Jiwa</span>
                <span className="text-[10px] text-indigo-700 block mt-0.5">Usia Pendidikan</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Dewasa Produktif (18 - 59 Th)</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{ageDewasa} Jiwa</span>
                <span className="text-[10px] text-blue-700 block mt-0.5">Tenaga Kerja & Usaha</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Lanjut Usia (60+ Th)</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{ageLansia} Jiwa</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Program Posbindu Lansia</span>
              </div>
            </div>
          </div>

          {/* Gender Ratio Bar */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600">Rasio Jenis Kelamin:</span>
              <span className="font-semibold text-slate-800">
                Laki-laki {persenLaki}% · Perempuan {persenPerempuan}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden">
              <div className="bg-emerald-600 h-full" style={{ width: `${persenLaki}%` }} />
              <div className="bg-pink-500 h-full" style={{ width: `${persenPerempuan}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Complaints & Upcoming Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Complaints */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Pengaduan & Aspirasi Warga ({pengaduanAktif} Aktif)
            </h3>
            <button
              onClick={() => onNavigateTab('pengaduan')}
              className="text-xs text-emerald-700 hover:underline font-medium"
            >
              Semua Aduan
            </button>
          </div>

          <div className="space-y-3">
            {complaints.slice(0, 3).map(cmp => (
              <div
                key={cmp.id}
                onClick={() => onNavigateTab('pengaduan')}
                className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{cmp.judul}</h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    cmp.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                    cmp.status === 'Diproses' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cmp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-1">{cmp.deskripsi}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
                  <span>Pelapor: {cmp.namaPelapor} (RT {cmp.rt})</span>
                  <span>·</span>
                  <span>{cmp.tanggalLaporan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Community Agenda */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 
              onClick={() => onNavigateTab('agenda')}
              className="font-bold text-slate-900 text-sm flex items-center gap-2 cursor-pointer hover:text-emerald-700 transition-colors"
              title="Buka Agenda Kegiatan Lingkungan"
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Agenda & Kegiatan Terdekat</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('agenda')}
              className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
            >
              Lihat Semua Agenda →
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 3).map(evt => (
              <div
                key={evt.id}
                onClick={() => onNavigateTab('agenda')}
                className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
              >
                <div className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-center font-mono shrink-0">
                  <span className="block text-[10px] uppercase font-bold text-emerald-900">
                    {evt.tanggal.substring(8, 10)}
                  </span>
                  <span className="block text-[9px]">SEP</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{evt.namaKegiatan}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{evt.lokasi} · {evt.waktu}</p>
                  <span className="text-[10px] text-slate-400 block mt-1">PJ: {evt.penanggungJawab}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
