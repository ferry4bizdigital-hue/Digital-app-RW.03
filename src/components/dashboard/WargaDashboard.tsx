import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Users, 
  Calendar, 
  Volume2, 
  ChevronRight, 
  AlertCircle,
  HeartHandshake,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowUpRight,
  ShieldCheck,
  Home,
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  Receipt,
  Search,
  Check,
  Building2
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { User, DueBill } from '../../types';
import { ActiveTab } from '../layout/BottomNav';

interface WargaDashboardProps {
  currentUser: User;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const WargaDashboard: React.FC<WargaDashboardProps> = ({ currentUser, onNavigateTab }) => {
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT'>('QRIS');
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [rtFilter, setRtFilter] = useState<'all' | 'lunas' | 'belum'>('all');
  const [rtSearch, setRtSearch] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const announcements = StorageService.getAnnouncements();
  const events = StorageService.getEvents();
  const dues = StorageService.getDues();

  // Warga Family info yang sesuai 100% dengan Data Warga yang Login
  const { family: myFamily, members: familyMembers } = StorageService.getFamilyForUser(currentUser);
  const currentRt = StorageService.normalizeRt(currentUser.RT || myFamily.rt || '02');

  // 1. Saldo Kas RW Calculation (sinkron langsung dengan Buku Kas dan Transparansi RW 03)
  const { totalMasuk: totalMasukRW, totalKeluar: totalKeluarRW, saldo: saldoKasRW } = StorageService.getKasRwSummary();

  // 2. Data Iuran Wajib Warga (IWD) untuk Warga yang login
  const myDue = dues.find(d => 
    (d.nomorKK === myFamily.nomorKK || 
     d.namaKepalaKeluarga.toLowerCase() === myFamily.namaKepalaKeluarga.toLowerCase() ||
     d.namaKepalaKeluarga.toLowerCase() === currentUser.nama.toLowerCase()) &&
    (d.jenisIuran.includes('IWD') || d.jenisIuran.includes('Digital'))
  );

  const isMyDueLunas = myDue ? myDue.status === 'Lunas' : false;
  const nominalIWD = myDue && myDue.nominal > 0 ? myDue.nominal : 0;
  const periodeIWD = myDue ? myDue.periode : 'September 2026';

  // 3. Data Iuran Wajib Warga di wilayah RT warga yang login (Transparansi RT)
  const rtDues = dues.filter(d => 
    StorageService.normalizeRt(d.rt) === currentRt && 
    (d.jenisIuran.includes('IWD') || d.jenisIuran.includes('Digital'))
  );

  const totalRtKk = rtDues.length;
  const lunasRtCount = rtDues.filter(d => d.status === 'Lunas').length;
  const belumRtCount = rtDues.filter(d => d.status !== 'Lunas').length;
  const persenLunas = totalRtKk > 0 ? Math.round((lunasRtCount / totalRtKk) * 100) : 0;
  const totalDanaTerkumpulRt = rtDues
    .filter(d => d.status === 'Lunas')
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const filteredRtDues = rtDues.filter(d => {
    if (rtFilter === 'lunas' && d.status !== 'Lunas') return false;
    if (rtFilter === 'belum' && d.status === 'Lunas') return false;
    if (rtSearch.trim()) {
      const q = rtSearch.toLowerCase();
      const matchName = d.namaKepalaKeluarga.toLowerCase().includes(q);
      const matchKk = d.nomorKK.includes(q);
      return matchName || matchKk;
    }
    return true;
  });

  // Nominal Iuran Sosial & Kematian
  const sosialDue = dues.find(d => 
    (d.nomorKK === myFamily.nomorKK || 
     d.namaKepalaKeluarga.toLowerCase() === myFamily.namaKepalaKeluarga.toLowerCase() ||
     d.namaKepalaKeluarga.toLowerCase() === currentUser.nama.toLowerCase()) &&
    (d.jenisIuran.includes('Sosial') || d.jenisIuran.includes('Kematian'))
  );
  const nominalSosial = sosialDue && sosialDue.nominal > 0 ? sosialDue.nominal : 0;

  // Bulan-bulan untuk Riwayat Iuran Wajib Warga (-1 bulan s/d +2 bulan dari bulan berjalan)
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Tentukan bulan berjalan dari periodeIWD (default September 2026)
  let currentMonthIndex = 8; // September (0-indexed)
  if (periodeIWD) {
    const foundIdx = indonesianMonths.findIndex(m => 
      periodeIWD.toLowerCase().includes(m.toLowerCase())
    );
    if (foundIdx !== -1) {
      currentMonthIndex = foundIdx;
    }
  }

  // Hitung rentang -1 bulan s/d +2 bulan dari bulan berjalan (total 4 bulan)
  const monthOffsets = [-1, 0, 1, 2];
  const historyMonths = monthOffsets.map(offset => {
    let targetIdx = (currentMonthIndex + offset) % 12;
    if (targetIdx < 0) targetIdx += 12;
    const monthName = indonesianMonths[targetIdx];

    // Cari data tagihan keluarga untuk bulan ini di tabel dues
    const dueForMonth = dues.find(d => 
      (d.nomorKK === myFamily.nomorKK || 
       d.namaKepalaKeluarga.toLowerCase() === myFamily.namaKepalaKeluarga.toLowerCase() ||
       d.namaKepalaKeluarga.toLowerCase() === currentUser.nama.toLowerCase()) &&
      (d.jenisIuran.includes('IWD') || d.jenisIuran.includes('Digital')) &&
      d.periode.toLowerCase().includes(monthName.toLowerCase())
    );

    let isLunas = false;
    if (dueForMonth) {
      isLunas = dueForMonth.status === 'Lunas';
    } else if (offset === 0) {
      isLunas = isMyDueLunas;
    } else if (offset < 0) {
      // Bulan sebelumnya (-1 bulan) dianggap lunas
      isLunas = true;
    } else {
      // Bulan berikutnya (+1 dan +2) belum lunas jika belum dibayar
      isLunas = false;
    }

    return {
      monthName,
      isCurrent: offset === 0,
      isLunas
    };
  });

  // Handler Pembayaran IWD
  const handleConfirmPayment = () => {
    if (myDue) {
      StorageService.payDueBill(myDue.id, selectedPayMethod);
    } else {
      StorageService.addDueBill({
        jenisIuran: 'IWD (Iuran Warga Digital)',
        periode: periodeIWD,
        nominal: nominalIWD || 0,
        nomorKK: myFamily.nomorKK,
        namaKepalaKeluarga: myFamily.namaKepalaKeluarga,
        rt: currentRt,
        status: 'Lunas',
        tanggalBayar: new Date().toISOString().replace('T', ' ').substring(0, 16),
        metodeBayar: selectedPayMethod
      });
    }

    setPaySuccessMsg(`Pembayaran Iuran Wajib Warga (${periodeIWD}) sebesar Rp ${nominalIWD.toLocaleString('id-ID')} via ${selectedPayMethod} berhasil dikonfirmasi.`);
    setTimeout(() => {
      setIsPayModalOpen(false);
      setPaySuccessMsg('');
    }, 1500);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Brand Header Banner for Warga — Teks utuh tidak terpotong */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
            RW
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 leading-tight truncate sm:whitespace-nowrap">
              Digital RW 03 Kebon Kangkung
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight line-clamp-1 sm:line-clamp-none">
              Kiaracondong, Kota Bandung · Portal Mandiri Pelayanan Warga
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Warga RT {currentRt} Terverifikasi</span>
        </span>
      </div>

      {/* Resident Identity Digital Card */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-emerald-100">
                Digital RW 03 Kebon Kangkung
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full">
                Warga Tetap RT {currentRt} / RW 03
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentUser.nama}
            </h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              {currentUser.alamat || myFamily.alamat}
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-mono font-bold text-lg shrink-0">
            RT {currentRt}
          </div>
        </div>

        {/* Micro Family Glance */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-[11px] text-emerald-200 block">No. Kartu Keluarga Anda:</span>
            <span className="font-mono text-xs font-semibold">{myFamily.nomorKK}</span>
          </div>
          <button
            onClick={() => setIsFamilyModalOpen(true)}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Buka Data Kartu Keluarga Anda"
          >
            <Users className="w-3.5 h-3.5 text-emerald-300" />
            <span>{familyMembers.length} Anggota Keluarga</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRIK DATA IURAN WAJIB WARGA (IWD) DI ROLE WARGA                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">Data Iuran Wajib Warga (IWD)</h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Sinkron Kas RW 03
          </span>
        </div>

        {/* Kartu Status Utama: Iuran Wajib Anda (Keluarga yang Login) */}
        <div className={`rounded-2xl p-4 border shadow-sm transition-all ${
          isMyDueLunas 
            ? 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border-emerald-200' 
            : 'bg-gradient-to-br from-rose-50/80 via-white to-amber-50/40 border-rose-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status Iuran Wajib Anda
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  Periode {periodeIWD}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {nominalIWD > 0 ? `Rp ${nominalIWD.toLocaleString('id-ID')}` : '-'}
                </span>
                {nominalIWD > 0 && <span className="text-xs text-slate-500">/ bulan / KK</span>}
              </div>
            </div>

            {/* Badge Status Pembayaran: SUDAH BAYAR / BELUM BAYAR / BELUM DITETAPKAN */}
            {isMyDueLunas ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-2xs shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>SUDAH BAYAR</span>
              </div>
            ) : nominalIWD > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs shadow-2xs shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>BELUM BAYAR</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-bold text-xs shadow-2xs shrink-0">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>BELUM DITETAPKAN</span>
              </div>
            )}
          </div>

          {/* Rincian Keterangan Sesuai Akun Warga yang Login */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Keluarga Terdaftar:</span>
              <span className="font-semibold text-slate-800">{myFamily.namaKepalaKeluarga}</span>
              <span className="text-[10px] font-mono text-slate-400 block truncate">No. KK: {myFamily.nomorKK}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Keterangan Pembayaran:</span>
              {isMyDueLunas ? (
                <div>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Lunas via {myDue?.metodeBayar || 'QRIS'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Tgl: {myDue?.tanggalBayar || '05 September 2026 10:20'}
                  </span>
                </div>
              ) : nominalIWD > 0 ? (
                <div>
                  <span className="font-semibold text-rose-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Menunggu Pembayaran</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Jatuh Tempo: 20 September 2026</span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-slate-500 flex items-center gap-1">
                    <span>Belum ada tagihan iuran</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">Menunggu input dari Pengurus RT</span>
                </div>
              )}
            </div>

            <div className="flex sm:justify-end items-center">
              {isMyDueLunas ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kewajiban Terpenuhi</span>
                </div>
              ) : nominalIWD > 0 ? (
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bayar IWD Sekarang</span>
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Menunggu input dari Pengurus RT
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Iuran Wajib Warga (Tahun 2026) */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Riwayat Iuran Wajib Warga (Tahun 2026)
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
              {historyMonths.map((item) => (
                <div 
                  key={item.monthName}
                  className={`p-2 rounded-lg border transition-colors ${
                    item.isLunas 
                      ? 'bg-emerald-100/60 border-emerald-200' 
                      : 'bg-rose-100/80 border-rose-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 block">
                    {item.monthName}
                  </span>
                  <span className={`text-[11px] font-bold ${
                    item.isLunas ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {item.isLunas ? 'Lunas' : 'Belum Lunas'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transparansi Iuran Warga RT Warga yang Login */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Transparansi Iuran Wajib Warga RT {currentRt}</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Status pembayaran IWD warga tetangga di lingkungan RT {currentRt} / RW 03
              </p>
            </div>

            {/* Quick Filter Status */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
              <button
                onClick={() => setRtFilter('all')}
                className={`flex-1 sm:flex-initial text-center px-2 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                  rtFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({totalRtKk})
              </button>
              <button
                onClick={() => setRtFilter('lunas')}
                className={`flex-1 sm:flex-initial text-center px-2 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                  rtFilter === 'lunas' ? 'bg-emerald-700 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sudah Bayar ({lunasRtCount})
              </button>
              <button
                onClick={() => setRtFilter('belum')}
                className={`flex-1 sm:flex-initial text-center px-2 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                  rtFilter === 'belum' ? 'bg-rose-700 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum Bayar ({belumRtCount})
              </button>
            </div>
          </div>

          {/* Mini Ringkasan Capaian RT */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block truncate">Kepatuhan</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-emerald-700">{persenLunas}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block truncate">Sudah Bayar</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-800">{lunasRtCount} / {totalRtKk} KK</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block truncate">Dana RT</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-emerald-700 truncate block">Rp {totalDanaTerkumpulRt.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* List Warga RT & Keterangan Bayar */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
            {filteredRtDues.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada data warga di RT {currentRt} yang cocok.
              </div>
            ) : (
              filteredRtDues.map((item) => {
                const isMine = item.nomorKK === myFamily.nomorKK || 
                  item.namaKepalaKeluarga.toLowerCase() === myFamily.namaKepalaKeluarga.toLowerCase() ||
                  item.namaKepalaKeluarga.toLowerCase() === currentUser.nama.toLowerCase();

                const isPaid = item.status === 'Lunas';

                return (
                  <div 
                    key={item.id} 
                    className={`p-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                      isMine ? 'bg-emerald-50/70 hover:bg-emerald-50 border-l-3 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate">
                          {item.namaKepalaKeluarga}
                        </span>
                        {isMine && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-200 text-emerald-900 shrink-0">
                            Keluarga Anda
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>KK: {StorageService.maskNik(item.nomorKK, false)}</span>
                        <span>·</span>
                        <span>Rp {item.nominal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isPaid ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Sudah Bayar</span>
                          </span>
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            {item.metodeBayar || 'Lunas'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <Clock className="w-3 h-3 text-rose-600" />
                            <span>Belum Bayar</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transparansi Kas RW & Info Iuran Warga */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">Transparansi Keuangan Kas RW 03</h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Kas Terbuka
          </span>
        </div>

        {/* 1. Saldo Kas RW Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-4 text-white shadow-md border border-slate-700 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-medium mb-1">
                <Wallet className="w-3.5 h-3.5" />
                <span>Saldo Kas RW 03 Kebon Kangkung</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                Rp {saldoKasRW.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-400" />
                <span>Dikelola secara transparan & akuntabel untuk warga</span>
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('keuangan')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Lihat Rincian Pembukuan Kas RW"
            >
              <span>Rincian</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Total Pemasukan RW</span>
                <span className="text-xs font-semibold text-emerald-300 font-mono">
                  +Rp {totalMasukRW.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Total Pengeluaran RW</span>
                <span className="text-xs font-semibold text-rose-300 font-mono">
                  -Rp {totalKeluarRW.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 & 3. Nominal IWD & Nominal Iuran Sosial & Kematian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card: Nominal IWD (Iuran Warga Digital) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Iuran Wajib
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-600">Nominal IWD</h4>
            <p className="text-[11px] text-slate-400 -mt-0.5">(Iuran Warga Digital)</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-900 font-mono">
                {nominalIWD > 0 ? `Rp ${nominalIWD.toLocaleString('id-ID')}` : '-'}
              </span>
              {nominalIWD > 0 && <span className="text-[11px] text-slate-500 font-medium">/ bulan / KK</span>}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Mencakup operasional RW, kebersihan lingkungan, dan pemeliharaan fasilitas umum.
            </p>
          </div>

          {/* Card: Nominal Iuran Sosial & Kematian */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-rose-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                Dana Sosial
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-600">Nominal Iuran</h4>
            <p className="text-[11px] text-slate-400 -mt-0.5">Sosial & Kematian</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-900 font-mono">
                {nominalSosial > 0 ? `Rp ${nominalSosial.toLocaleString('id-ID')}` : '-'}
              </span>
              {nominalSosial > 0 && <span className="text-[11px] text-slate-500 font-medium">/ bulan / KK</span>}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Dialokasikan khusus untuk santunan duka cita keluarga wafat & bantuan darurat warga.
            </p>
          </div>
        </div>
      </div>

      {/* Shortcut Pengaduan Lingkungan & Data Keluarga */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateTab('pengaduan')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 active:scale-98 transition-all shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">Pengaduan Warga</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Lapor masalah lingkungan</p>
          </div>
        </button>

        <button
          onClick={() => setIsFamilyModalOpen(true)}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 active:scale-98 transition-all shadow-2xs group text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">Data Keluarga Anda</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Akses data keluarga sendiri</p>
          </div>
        </button>
      </div>

      {/* Announcements Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">Pengumuman Terkini RW 03</h3>
          </div>
          <button
            onClick={() => onNavigateTab('pengumuman')}
            className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Lihat Semua
          </button>
        </div>

        <div className="space-y-3">
          {announcements.slice(0, 2).map(anc => (
            <div
              key={anc.id}
              onClick={() => onNavigateTab('pengumuman')}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {anc.penulisRole}
                </span>
                <span className="text-[10px] text-slate-400">
                  {anc.tanggalPublikasi.substring(0, 10)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{anc.judul}</h4>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                {anc.isi}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">Agenda Kegiatan Mendatang</h3>
          </div>
          <button
            onClick={() => onNavigateTab('agenda')}
            className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Kalender
          </button>
        </div>

        <div className="space-y-2.5">
          {events.slice(0, 2).map(evt => (
            <div
              key={evt.id}
              onClick={() => onNavigateTab('agenda')}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center shrink-0 border border-emerald-100">
                <span className="text-[11px] font-bold leading-none">{evt.tanggal.substring(8, 10)}</span>
                <span className="text-[9px] uppercase font-semibold text-emerald-600 mt-0.5">SEP</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">{evt.namaKegiatan}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{evt.lokasi} · {evt.waktu}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DATA KARTU KELUARGA ANDA (100% SESUAI WARGA LOGIN)                 */}
      {/* ========================================================================= */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Home className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Data Kartu Keluarga Anda
                  </h3>
                  <span className="text-[11px] text-emerald-200">
                    Keluarga {myFamily.namaKepalaKeluarga}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsFamilyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Privacy Notice Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[11px] block">Akses Eksklusif Warga</span>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Sesuai privasi kependudukan, Anda hanya berhak mengakses data keluarga yang bersangkutan. Informasi ini tersinkronisasi langsung dengan akun login Anda ({currentUser.nama}).
                  </p>
                </div>
              </div>

              {/* KK Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">No. Kartu Keluarga</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">{myFamily.nomorKK}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Kepala Keluarga</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{myFamily.namaKepalaKeluarga}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Wilayah Domisili</span>
                  <span className="font-semibold text-slate-800 text-[11px]">RT {myFamily.rt} / RW 03</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Status Rumah</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{myFamily.statusRumah} (No. {myFamily.nomorRumah})</span>
                </div>
              </div>

              {/* List of Family Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Daftar Anggota Keluarga ({familyMembers.length} Orang)</span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {familyMembers.map((m, idx) => {
                    const isCurrentUser = m.NIK === currentUser.NIK || m.namaLengkap.toLowerCase() === currentUser.nama.toLowerCase();

                    return (
                      <div key={m.id} className="p-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{m.namaLengkap}</span>
                                {isCurrentUser && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                    Akun Anda
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                                NIK: {StorageService.maskNik(m.NIK, false)}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                            {m.hubunganKeluarga}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Lahir & Usia:</span>
                            <span>{m.tempatLahir}, {m.usia} thn</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Gender & Agama:</span>
                            <span>{m.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · {m.agama}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Pekerjaan:</span>
                            <span className="truncate block">{m.pekerjaan}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsFamilyModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Tutup Data Keluarga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PEMBAYARAN IURAN WAJIB WARGA (IWD)                                */}
      {/* ========================================================================= */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Pembayaran Iuran Wajib Warga
                  </h3>
                  <span className="text-[11px] text-emerald-200">
                    Periode {periodeIWD} · RT {currentRt}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {paySuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{paySuccessMsg}</span>
                </div>
              )}

              {/* Tagihan Summary Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Kewajiban IWD</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{nominalIWD > 0 ? `Rp ${nominalIWD.toLocaleString('id-ID')}` : '-'}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Keluarga: {myFamily.namaKepalaKeluarga}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  RT {currentRt}
                </div>
              </div>

              {/* Pilih Metode Pembayaran */}
              <div>
                <label className="font-bold text-slate-700 block mb-2">Pilih Metode Pembayaran</label>
                <div className="space-y-2">
                  <label 
                    onClick={() => setSelectedPayMethod('QRIS')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPayMethod === 'QRIS' 
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">QRIS RW 03 (Instan)</div>
                        <div className="text-[10px] text-slate-500">BCA, Mandiri, BRI, GoPay, OVO, ShopeePay</div>
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="payMethod" 
                      checked={selectedPayMethod === 'QRIS'} 
                      onChange={() => setSelectedPayMethod('QRIS')}
                      className="text-emerald-600 focus:ring-emerald-500" 
                    />
                  </label>

                  <label 
                    onClick={() => setSelectedPayMethod('Transfer Bank')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPayMethod === 'Transfer Bank' 
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Transfer Rekening Kas RW</div>
                        <div className="text-[10px] text-slate-500">Bank bjb: 0038927110901 a/n Kas RW 03</div>
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="payMethod" 
                      checked={selectedPayMethod === 'Transfer Bank'} 
                      onChange={() => setSelectedPayMethod('Transfer Bank')}
                      className="text-emerald-600 focus:ring-emerald-500" 
                    />
                  </label>

                  <label 
                    onClick={() => setSelectedPayMethod('Tunai ke Petugas RT')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPayMethod === 'Tunai ke Petugas RT' 
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Tunai ke Petugas RT {currentRt}</div>
                        <div className="text-[10px] text-slate-500">Diserahkan langsung ke Bendahara/Ketua RT</div>
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="payMethod" 
                      checked={selectedPayMethod === 'Tunai ke Petugas RT'} 
                      onChange={() => setSelectedPayMethod('Tunai ke Petugas RT')}
                      className="text-emerald-600 focus:ring-emerald-500" 
                    />
                  </label>
                </div>
              </div>

              {/* QR Code Graphic if QRIS selected */}
              {selectedPayMethod === 'QRIS' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="w-36 h-36 mx-auto bg-white rounded-lg p-2 border border-slate-200 shadow-2xs flex flex-col items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-800" />
                    <span className="text-[9px] font-bold text-emerald-800 -mt-1">QRIS STANDAR RW 03</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Buka aplikasi e-wallet / mobile banking Anda dan pindai QR di atas untuk menyelesaikan iuran.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran Selesai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
