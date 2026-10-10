import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Wallet, 
  X,
  FileSpreadsheet,
  Building,
  Calendar,
  User as UserIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Pencil,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Check,
  HeartHandshake,
  Receipt
} from 'lucide-react';
import { FinancialTransaction, SetoranRtChoice, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';

interface ModulKeuanganProps {
  currentUser: User;
  onNavigateTab?: (tab: ActiveTab) => void;
}

type FilterOption = 'all' | 'setoran' | 'iwd' | 'sosial' | 'pengeluaran' | SetoranRtChoice;

export const ModulKeuangan: React.FC<ModulKeuanganProps> = ({ currentUser, onNavigateTab }) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);

  // Subscribe to storage changes for instant reactive updates
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Success toast
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form states for "Catat Transaksi" (Setoran RT) - Khusus Super Admin
  const [setoranRt, setSetoranRt] = useState<SetoranRtChoice>('RT 01');
  const [jenisSetoran, setJenisSetoran] = useState<'IWD' | 'Sosial & Kematian'>('IWD');
  const [tanggalSetor, setTanggalSetor] = useState(new Date().toISOString().substring(0, 10));
  const [jumlahSetor, setJumlahSetor] = useState<string>('');
  const [keterangan, setKeterangan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for "Catat Pengeluaran" - Khusus Super Admin
  const [sumberDanaPengeluaran, setSumberDanaPengeluaran] = useState<'IWD' | 'Sosial & Kematian'>('IWD');
  const [tanggalPengeluaran, setTanggalPengeluaran] = useState(new Date().toISOString().substring(0, 10));
  const [nominalPengeluaran, setNominalPengeluaran] = useState<string>('');
  const [keteranganPengeluaran, setKeteranganPengeluaran] = useState('');
  const [expenseErrorMsg, setExpenseErrorMsg] = useState('');

  // Edit states (Khusus Super Admin - bisa edit Catat Transaksi & Catat Pengeluaran)
  const [editItem, setEditItem] = useState<FinancialTransaction | null>(null);
  const [editRt, setEditRt] = useState<SetoranRtChoice>('RT 01');
  const [editJenisSetoran, setEditJenisSetoran] = useState<'IWD' | 'Sosial & Kematian'>('IWD');
  const [editSumberDana, setEditSumberDana] = useState<'IWD' | 'Sosial & Kematian'>('IWD');
  const [editTanggal, setEditTanggal] = useState('');
  const [editNominal, setEditNominal] = useState<number>(0);
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editError, setEditError] = useState('');

  // Delete states (Khusus Super Admin - bisa hapus Catat Transaksi & Catat Pengeluaran)
  const [itemToDelete, setItemToDelete] = useState<FinancialTransaction | null>(null);

  const transactions = StorageService.getTransactions();

  // Hak Akses Catat Transaksi, Catat Pengeluaran, Edit & Hapus HANYA diberikan kepada Super Admin
  // Role RW dan RT tidak diberikan akses untuk melakukan Catat Transaksi dan Catat Pengeluaran
  const isSuperAdmin = currentUser.role === 'super_admin';

  const filtered = transactions.filter(t => {
    const isPengeluaran = t.tipe === 'Pengeluaran';
    const isSetoran = t.tipe === 'Pemasukan';
    const itemRt = t.setoranRt || (t.rt ? `RT ${t.rt}` : undefined);

    if (selectedFilter === 'pengeluaran') {
      if (!isPengeluaran) return false;
    } else if (selectedFilter === 'setoran') {
      if (!isSetoran) return false;
    } else if (selectedFilter === 'iwd') {
      const isIwd = (t.jenisSetoran === 'IWD' || t.kategori.includes('IWD') || t.kategori.includes('Iuran') || t.id.startsWith('trx-due-')) && !StorageService.isSosialTransaction(t);
      if (!isIwd || !isSetoran) return false;
    } else if (selectedFilter === 'sosial') {
      if (!StorageService.isSosialTransaction(t)) return false;
    } else if (selectedFilter !== 'all') {
      if (itemRt !== selectedFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKeterangan = t.keterangan?.toLowerCase().includes(q);
      const matchPencatat = t.pencatat?.toLowerCase().includes(q);
      const matchTanggal = t.tanggal?.toLowerCase().includes(q);
      const matchRt = itemRt?.toLowerCase().includes(q);
      const matchTipe = t.tipe?.toLowerCase().includes(q);
      if (!matchKeterangan && !matchPencatat && !matchTanggal && !matchRt && !matchTipe) {
        return false;
      }
    }
    return true;
  });

  // Sinkronisasi sentral Saldo Kas RW 03 Kebon Kangkung (sama persis dengan Dashboard Warga)
  const { totalMasuk, totalKeluar, saldo } = StorageService.getKasRwSummary();
  const { totalMasuk: totalMasukSosial, totalKeluar: totalKeluarSosial, saldo: saldoSosial } = StorageService.getKasSosialSummary();
  const iwdSummary = StorageService.getIwdSyncSummary();

  // Hitung Saldo Berjalan (Running Balance) untuk setiap transaksi secara kronologis (dari awal hingga akhir)
  // Perhatian: Jenis Setoran / Sumber Dana Sosial & Kematian TIDAK ditotalkan pada Saldo Kas RW 03
  const sortedChronological = [...transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  let runningRw = 0;
  let runningSosial = 0;
  const runningBalanceMap = new Map<string, { saldo: number; isSosial: boolean }>();
  for (const t of sortedChronological) {
    const isSosial = StorageService.isSosialTransaction(t);
    if (isSosial) {
      if (t.tipe === 'Pemasukan') {
        runningSosial += t.nominal;
      } else {
        runningSosial -= t.nominal;
      }
      runningBalanceMap.set(t.id, { saldo: runningSosial, isSosial: true });
    } else {
      if (t.tipe === 'Pemasukan') {
        runningRw += t.nominal;
      } else {
        runningRw -= t.nominal;
      }
      runningBalanceMap.set(t.id, { saldo: runningRw, isSosial: false });
    }
  }

  // Tampilkan data di tabel dengan urutan tanggal terbaru di atas (newest first)
  const sortedFiltered = [...filtered].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Rekapitulasi subtotal untuk transaksi yang sedang ditampilkan di tabel
  const filteredMasuk = filtered
    .filter(t => t.tipe === 'Pemasukan')
    .reduce((acc, curr) => acc + curr.nominal, 0);
  const filteredKeluar = filtered
    .filter(t => t.tipe === 'Pengeluaran')
    .reduce((acc, curr) => acc + curr.nominal, 0);
  const filteredSaldo = filteredMasuk - filteredKeluar;

  // Buka Modal Catat Transaksi (Setoran RT)
  const handleOpenAddModal = () => {
    if (!isSuperAdmin) return;
    setSetoranRt(currentUser.RT ? (`RT ${currentUser.RT}` as SetoranRtChoice) : 'RT 01');
    setJenisSetoran('IWD');
    setTanggalSetor(new Date().toISOString().substring(0, 10));
    setJumlahSetor('');
    setKeterangan('');
    setErrorMsg('');
    setIsAddOpen(true);
  };

  // Buka Modal Catat Pengeluaran
  const handleOpenExpenseModal = () => {
    if (!isSuperAdmin) return;
    setSumberDanaPengeluaran('IWD');
    setTanggalPengeluaran(new Date().toISOString().substring(0, 10));
    setNominalPengeluaran('');
    setKeteranganPengeluaran('');
    setExpenseErrorMsg('');
    setIsExpenseOpen(true);
  };

  // Simpan Catat Transaksi (Setoran RT)
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    if (!tanggalSetor) {
      setErrorMsg('Tanggal setor wajib diisi.');
      return;
    }
    const cleanNominal = parseInt(jumlahSetor.replace(/\D/g, ''), 10) || 0;
    if (cleanNominal <= 0) {
      setErrorMsg('Jumlah setoran harus lebih dari Rp 0.');
      return;
    }
    if (keterangan.length > 100) {
      setErrorMsg('Keterangan maksimal 100 karakter.');
      return;
    }

    const pencatatName = `${currentUser.nama} (Super Admin)`;
    const defaultKeterangan = jenisSetoran === 'Sosial & Kematian'
      ? `Setoran Iuran Sosial & Kematian ${setoranRt}`
      : `Setoran IWD ${setoranRt}`;

    StorageService.addTransaction({
      tipe: 'Pemasukan',
      kategori: jenisSetoran === 'Sosial & Kematian' ? `Setoran Sosial & Kematian ${setoranRt}` : `Setoran IWD ${setoranRt}`,
      nominal: cleanNominal,
      tanggal: tanggalSetor,
      setoranRt,
      jenisSetoran,
      sumberDana: jenisSetoran,
      keterangan: keterangan.trim() || defaultKeterangan,
      lingkup: 'RW',
      rt: setoranRt.replace('RT ', ''),
      pencatat: pencatatName
    });

    setIsAddOpen(false);
    setJumlahSetor('');
    setKeterangan('');
    setErrorMsg('');
    setToastMessage(`Catat Transaksi (${jenisSetoran} ${setoranRt}) berhasil disimpan ke Buku Kas!`);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  // Simpan Catat Pengeluaran
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    if (!tanggalPengeluaran) {
      setExpenseErrorMsg('Tanggal pengeluaran wajib diisi.');
      return;
    }
    const cleanNominal = parseInt(nominalPengeluaran.replace(/\D/g, ''), 10) || 0;
    if (cleanNominal <= 0) {
      setExpenseErrorMsg('Nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }
    if (keteranganPengeluaran.length > 100) {
      setExpenseErrorMsg('Keterangan maksimal 100 karakter.');
      return;
    }

    const pencatatName = `${currentUser.nama} (Super Admin)`;

    StorageService.addTransaction({
      tipe: 'Pengeluaran',
      kategori: sumberDanaPengeluaran === 'Sosial & Kematian' ? 'Bantuan Sosial & Santunan Duka' : 'Pengeluaran Kas RW',
      nominal: cleanNominal,
      tanggal: tanggalPengeluaran,
      sumberDana: sumberDanaPengeluaran,
      jenisSetoran: sumberDanaPengeluaran,
      keterangan: keteranganPengeluaran.trim() || (sumberDanaPengeluaran === 'Sosial & Kematian' ? 'Santunan duka cita / bantuan sosial' : 'Pengeluaran operasional RW 03'),
      lingkup: 'RW',
      pencatat: pencatatName
    });

    setIsExpenseOpen(false);
    setNominalPengeluaran('');
    setKeteranganPengeluaran('');
    setExpenseErrorMsg('');
    setToastMessage(`Catat Pengeluaran (Sumber Dana: ${sumberDanaPengeluaran}) berhasil disimpan ke Buku Kas!`);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  // Buka Modal Edit (Bisa untuk Catat Transaksi maupun Catat Pengeluaran)
  const handleOpenEdit = (item: FinancialTransaction) => {
    if (!isSuperAdmin) return;
    setEditItem(item);
    setEditTanggal(item.tanggal);
    setEditNominal(item.nominal);
    setEditKeterangan(item.keterangan || '');
    setEditRt((item.setoranRt || (item.rt ? `RT ${item.rt}` : 'RT 01')) as SetoranRtChoice);
    setEditJenisSetoran(item.jenisSetoran || (StorageService.isSosialTransaction(item) ? 'Sosial & Kematian' : 'IWD'));
    setEditSumberDana(item.sumberDana || item.jenisSetoran || (StorageService.isSosialTransaction(item) ? 'Sosial & Kematian' : 'IWD'));
    setEditError('');
    setIsEditOpen(true);
  };

  // Simpan Edit (Bisa untuk Catat Transaksi maupun Catat Pengeluaran)
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editItem) return;

    if (!editTanggal) {
      setEditError('Tanggal transaksi wajib diisi.');
      return;
    }
    if (!editNominal || editNominal <= 0) {
      setEditError('Nominal harus lebih besar dari Rp 0.');
      return;
    }
    if (editKeterangan.length > 100) {
      setEditError('Keterangan maksimal 100 karakter.');
      return;
    }

    const isSetoran = editItem.tipe === 'Pemasukan';
    const updateData: Partial<FinancialTransaction> = {
      tanggal: editTanggal,
      nominal: editNominal,
      keterangan: editKeterangan.trim(),
      ...(isSetoran ? {
        setoranRt: editRt,
        rt: editRt.replace('RT ', ''),
        jenisSetoran: editJenisSetoran,
        sumberDana: editJenisSetoran,
        kategori: editJenisSetoran === 'Sosial & Kematian' ? `Setoran Sosial & Kematian ${editRt}` : `Setoran IWD ${editRt}`
      } : {
        sumberDana: editSumberDana,
        jenisSetoran: editSumberDana,
        kategori: editSumberDana === 'Sosial & Kematian' ? 'Bantuan Sosial & Santunan Duka' : 'Pengeluaran Kas RW'
      })
    };

    StorageService.updateTransaction(editItem.id, updateData);

    const jenisLabel = isSetoran ? 'Catat Transaksi (Setoran RT)' : 'Catat Pengeluaran';
    setIsEditOpen(false);
    setEditItem(null);
    setToastMessage(`Data ${jenisLabel} berhasil diperbarui!`);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  // Buka Dialog Konfirmasi Hapus (Bisa untuk Catat Transaksi maupun Catat Pengeluaran)
  const handleOpenDelete = (item: FinancialTransaction) => {
    if (!isSuperAdmin) return;
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  // Konfirmasi Eksekusi Hapus (Bisa untuk Catat Transaksi maupun Catat Pengeluaran)
  const handleConfirmDelete = () => {
    if (!isSuperAdmin || !itemToDelete) return;

    const jenisLabel = itemToDelete.tipe === 'Pemasukan' ? 'Catat Transaksi (Setoran RT)' : 'Catat Pengeluaran';
    StorageService.deleteTransaction(itemToDelete.id);
    setIsDeleteOpen(false);
    setItemToDelete(null);
    setToastMessage(`Data ${jenisLabel} berhasil dihapus dari Buku Kas RW 03!`);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  const handleExportCsv = () => {
    const headers = ['Tanggal & Lingkup', 'Jenis Catatan', 'Sumber Dana / Jenis Setoran', 'Pencatat', 'Nominal (Rp)', 'Keterangan'];
    const rows = filtered.map(t => {
      const isOut = t.tipe === 'Pengeluaran';
      const jenis = isOut ? 'Catat Pengeluaran' : 'Catat Transaksi';
      const rtLabel = isOut ? 'Pengeluaran RW' : (t.setoranRt || (t.rt ? `RT ${t.rt}` : 'Kas RW'));
      const sumber = StorageService.isSosialTransaction(t) ? 'Sosial & Kematian' : 'IWD';
      return [
        `"${t.tanggal} (${rtLabel})"`,
        `"${jenis}"`,
        `"${sumber}"`,
        `"${t.pencatat}"`,
        isOut ? -t.nominal : t.nominal,
        `"${t.keterangan}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `buku_kas_rw03_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRupiah = (val: number) => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Keuangan Lingkungan
            </span>
            <span className="text-[11px] text-slate-400">· Tingkat RW 03 Kebon Kangkung</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            Buku Kas dan Transparansi RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan transparansi keuangan terpadu, rekapitulasi setoran RT, pengeluaran kas, dan saldo kas RW 03
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV Buku Kas"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Buku Kas</span>
          </button>

          {/* Tombol Catat Transaksi & Catat Pengeluaran: KHUSUS SUPER ADMIN */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Catat Setoran IWD RT (Super Admin)"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Transaksi</span>
              </button>

              <button
                onClick={handleOpenExpenseModal}
                className="px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Catat Pengeluaran Kas RW (Super Admin)"
              >
                <TrendingDown className="w-4 h-4" />
                <span>Catat Pengeluaran</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Akses Catat, Edit & Hapus: Khusus Super Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Status Banner */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-3.5 rounded-2xl border border-slate-700 text-white flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-300 block text-xs">
                Mode Akses Super Admin Aktif
              </span>
              <span className="text-[11px] text-slate-300">
                Anda memiliki akses penuh untuk melakukan <strong className="text-white">Edit</strong> dan <strong className="text-white">Hapus</strong> pada setiap hasil input <strong>Catat Transaksi</strong> maupun <strong>Catat Pengeluaran</strong>.
              </span>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Akses Edit & Hapus Siap
          </span>
        </div>
      )}

      {/* Financial Stat Cards (Sinkron Penuh dengan Dashboard Warga & RW) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-semibold">Total Pemasukan Kas RW</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-emerald-900 tabular-nums block font-mono">
            {formatRupiah(totalMasuk)}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">Penerimaan & Setoran RT</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-[11px] font-semibold">Total Pengeluaran Kas RW</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-rose-900 tabular-nums block font-mono">
            {formatRupiah(totalKeluar)}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">Operasional & Fasilitas RW</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[11px] font-semibold">Saldo Kas RW 03</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums block font-mono">
            {formatRupiah(saldo)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">Total Pemasukan - Pengeluaran</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[11px] font-semibold">Transaksi Tercatat</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums block font-mono">
            {filtered.length} / {transactions.length} <span className="text-xs font-normal text-slate-500">catatan</span>
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {selectedFilter === 'all' 
              ? 'Seluruh buku kas aktif' 
              : selectedFilter === 'setoran' 
              ? 'Hasil Catat Transaksi' 
              : selectedFilter === 'pengeluaran' 
              ? 'Hasil Catat Pengeluaran' 
              : selectedFilter === 'sosial'
              ? 'Pos Sosial & Kematian'
              : `Lingkup ${selectedFilter}`}
          </span>
        </div>
      </div>

      {/* Matrik Khusus Kas Sosial & Kematian RW 03 */}
      <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-rose-100 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <HeartHandshake className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Matrik Kas Sosial & Kematian RW 03
              </h4>
              <p className="text-[10px] text-slate-500">
                Alokasi khusus dana santunan duka cita & bantuan darurat sosial warga
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            Khusus Dana Sosial & Kematian
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Total Pemasukan Kas Sosial & Kematian RW */}
          <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-semibold">Total Pemasukan Kas Sosial & Kematian RW</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-emerald-900 tabular-nums block font-mono">
              {formatRupiah(totalMasukSosial)}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Penerimaan & Setoran Sosial RT</span>
          </div>

          {/* 2. Total Pengeluaran Kas Sosial & Kematian RW */}
          <div className="p-3.5 bg-white rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-[11px] font-semibold">Total Pengeluaran Kas Sosial & Kematian RW</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-rose-900 tabular-nums block font-mono">
              {formatRupiah(totalKeluarSosial)}
            </span>
            <span className="text-[10px] text-rose-700 block mt-0.5">Santunan Duka Cita & Bantuan</span>
          </div>

          {/* 3. Saldo Kas Sosial & Kematian */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-700 mb-1">
              <span className="text-[11px] font-semibold">Saldo Kas Sosial & Kematian</span>
              <Wallet className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <span className={`text-lg sm:text-xl font-bold tabular-nums block font-mono ${saldoSosial >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
              {formatRupiah(saldoSosial)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Pemasukan Sosial - Pengeluaran Sosial</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

            {/* Semua */}
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Catatan
            </button>

            {/* Filter Penerimaan IWD */}
            <button
              onClick={() => setSelectedFilter('iwd')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'iwd'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              Penerimaan IWD ({iwdSummary.countLunas})
            </button>

            {/* Filter Catat Transaksi */}
            <button
              onClick={() => setSelectedFilter('setoran')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'setoran'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Catat Transaksi (Setoran)
            </button>

            {/* Filter Pos Kas Sosial & Kematian */}
            <button
              onClick={() => setSelectedFilter('sosial')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'sosial'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Sosial & Kematian
            </button>

            {/* Filter Catat Pengeluaran */}
            <button
              onClick={() => setSelectedFilter('pengeluaran')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedFilter === 'pengeluaran'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Catat Pengeluaran
            </button>

            <span className="text-slate-300 mx-0.5">|</span>

            {/* RT 01 - 05 */}
            {(['RT 01', 'RT 02', 'RT 03', 'RT 04', 'RT 05'] as const).map(rt => {
              const isActive = selectedFilter === rt;
              return (
                <button
                  key={rt}
                  onClick={() => setSelectedFilter(rt)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rt}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari pencatat / keterangan..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: Daftar Catatan Transaksi Buku Kas RW 03 */}
      {/* Kolom berurutan: 
          1. Tanggal Setor & Lingkup
          2. Pencatat
          3. Nominal
          4. Keterangan
          5. Aksi (Khusus Super Admin: Tombol Edit & Hapus untuk Catat Transaksi & Catat Pengeluaran)
      */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Daftar Catatan Transaksi Buku Kas RW 03
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {filtered.length} Catatan Ditampilkan
          </span>
        </div>

        {/* Mobile Card View (block md:hidden) - Tampilan utuh tanpa terpotong di HP */}
        <div className="block md:hidden divide-y divide-slate-100">
          {sortedFiltered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700 text-xs">Belum ada transaksi tercatat.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isSuperAdmin 
                  ? 'Gunakan tombol "Catat Transaksi" atau "Catat Pengeluaran" di atas untuk menambah data baru.' 
                  : 'Belum ada transaksi untuk filter ini.'}
              </p>
            </div>
          ) : (
            sortedFiltered.map(item => {
              const isPengeluaran = item.tipe === 'Pengeluaran';
              const isSosial = StorageService.isSosialTransaction(item);
              const rtLabel = isPengeluaran 
                ? 'Pengeluaran Kas RW' 
                : (item.setoranRt || (item.rt ? `RT ${item.rt}` : 'Kas RW'));
              const runningInfo = runningBalanceMap.get(item.id);

              return (
                <div key={item.id} className="p-3.5 space-y-2.5 transition-colors hover:bg-slate-50/80">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPengeluaran ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {isPengeluaran ? <TrendingDown className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block leading-tight">
                          {formatDateDisplay(item.tanggal)}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPengeluaran ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isPengeluaran ? 'Catat Pengeluaran' : `Catat Transaksi (${rtLabel})`}
                          </span>
                          {isPengeluaran ? (
                            isSosial ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <HeartHandshake className="w-2.5 h-2.5" />
                                <span>Sumber: Sosial & Kematian</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                                <Receipt className="w-2.5 h-2.5" />
                                <span>Sumber: IWD</span>
                              </span>
                            )
                          ) : (
                            isSosial ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <HeartHandshake className="w-2.5 h-2.5" />
                                <span>Jenis: Sosial & Kematian</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                                <Receipt className="w-2.5 h-2.5" />
                                <span>Jenis: IWD</span>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm block ${
                        isPengeluaran ? 'text-rose-700' : 'text-emerald-800'
                      }`}>
                        {isPengeluaran ? `- ${formatRupiah(item.nominal)}` : `+ ${formatRupiah(item.nominal)}`}
                      </span>
                      <span className={`text-[10px] font-mono block ${runningInfo?.isSosial ? 'text-rose-600' : 'text-slate-500'}`}>
                        {runningInfo?.isSosial 
                          ? `Saldo Sosial: ${formatRupiah(runningInfo.saldo)}` 
                          : `Saldo Kas RW: ${formatRupiah(runningInfo?.saldo ?? 0)}`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                    {item.keterangan}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Pencatat: <strong className="text-slate-700">{item.pencatat}</strong></span>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                {/* 1. Tanggal Setor & Lingkup */}
                <th scope="col" className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap min-w-[200px]">
                  1. Tanggal Setor & Lingkup
                </th>
                {/* 2. Pencatat */}
                <th scope="col" className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap min-w-[150px]">
                  2. Pencatat
                </th>
                {/* 3. Arus Kas (Masuk / Keluar) */}
                <th scope="col" className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap min-w-[160px]">
                  3. Arus Kas
                </th>
                {/* 4. Saldo Kas RW (Berjalan) */}
                <th scope="col" className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap min-w-[160px]">
                  4. Saldo Kas RW
                </th>
                {/* 5. Keterangan */}
                <th scope="col" className="py-3 px-4 font-bold text-slate-800 min-w-[210px]">
                  5. Keterangan
                </th>
                {/* 6. Aksi (Khusus Super Admin: Edit & Hapus) */}
                {isSuperAdmin && (
                  <th scope="col" className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap text-right min-w-[160px]">
                    6. Aksi (Super Admin)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-700 text-xs">Belum ada transaksi tercatat.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isSuperAdmin 
                        ? 'Gunakan tombol "Catat Transaksi" atau "Catat Pengeluaran" di atas untuk menambah data baru.' 
                        : 'Belum ada transaksi untuk filter ini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedFiltered.map(item => {
                  const isPengeluaran = item.tipe === 'Pengeluaran';
                  const isSosial = StorageService.isSosialTransaction(item);
                  const rtLabel = isPengeluaran 
                    ? 'Pengeluaran Kas RW' 
                    : (item.setoranRt || (item.rt ? `RT ${item.rt}` : 'Kas RW'));
                  const runningInfo = runningBalanceMap.get(item.id);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Kolom 1: Tanggal Setor & Lingkup */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isPengeluaran 
                              ? 'bg-rose-50 text-rose-700' 
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {isPengeluaran ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <Calendar className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {formatDateDisplay(item.tanggal)}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {isPengeluaran ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    <span>Catat Pengeluaran</span>
                                  </span>
                                  {isSosial ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                      <HeartHandshake className="w-2.5 h-2.5" />
                                      <span>Sumber: Sosial & Kematian</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                                      <Receipt className="w-2.5 h-2.5" />
                                      <span>Sumber: IWD</span>
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Building className="w-2.5 h-2.5" />
                                    <span>Catat Transaksi ({rtLabel})</span>
                                  </span>
                                  {isSosial ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                      <HeartHandshake className="w-2.5 h-2.5" />
                                      <span>Jenis: Sosial & Kematian</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                                      <Receipt className="w-2.5 h-2.5" />
                                      <span>Jenis: IWD</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Pencatat */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 text-[11px] font-bold">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {item.pencatat}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Petugas Pencatat
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 3: Arus Kas (Masuk / Keluar) */}
                      <td className="py-3 px-4">
                        <span className={`font-mono font-bold text-sm tabular-nums block ${
                          isPengeluaran ? 'text-rose-700' : 'text-emerald-800'
                        }`}>
                          {isPengeluaran ? `- ${formatRupiah(item.nominal)}` : `+ ${formatRupiah(item.nominal)}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {isPengeluaran ? 'Pengeluaran Kas' : 'Penerimaan Kas'}
                        </span>
                      </td>

                      {/* Kolom 4: Saldo Kas RW (Saldo Berjalan) */}
                      <td className="py-3 px-4">
                        {runningInfo?.isSosial ? (
                          <>
                            <span className="font-mono font-bold text-xs sm:text-sm text-rose-800 tabular-nums block">
                              {formatRupiah(runningInfo.saldo)}
                            </span>
                            <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                              Saldo Kas Sosial berjalan
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tabular-nums block">
                              {formatRupiah(runningInfo?.saldo ?? 0)}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                              Saldo Kas RW berjalan
                            </span>
                          </>
                        )}
                      </td>

                      {/* Kolom 5: Keterangan */}
                      <td className="py-3 px-4 text-slate-700">
                        <p className="text-xs leading-relaxed max-w-md break-words font-medium">
                          {item.keterangan || (isPengeluaran ? 'Pengeluaran Kas RW' : `Setoran ${rtLabel}`)}
                        </p>
                      </td>

                      {/* Kolom 6: Aksi (Edit & Hapus Khusus Super Admin) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Edit */}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title={`Edit hasil input ${isPengeluaran ? 'Catat Pengeluaran' : 'Catat Transaksi'}`}
                            >
                              <Pencil className="w-3 h-3 text-blue-600" />
                              <span>Edit</span>
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              onClick={() => handleOpenDelete(item)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title={`Hapus hasil input ${isPengeluaran ? 'Catat Pengeluaran' : 'Catat Transaksi'}`}
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedFiltered.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 text-xs">
                <tr className="font-semibold text-slate-800">
                  <td colSpan={2} className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block text-xs">
                      {selectedFilter === 'all' && !searchQuery.trim()
                        ? 'Total Rekap Buku Kas RW 03'
                        : `Subtotal Rekap Filter (${selectedFilter === 'setoran' ? 'Catat Transaksi' : selectedFilter === 'pengeluaran' ? 'Catat Pengeluaran' : selectedFilter})`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Menampilkan {sortedFiltered.length} dari {transactions.length} catatan transaksi
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 font-mono tabular-nums">
                      <div className="text-emerald-700 font-bold text-xs">
                        Masuk: +{formatRupiah(filteredMasuk)}
                      </div>
                      <div className="text-rose-700 font-bold text-xs">
                        Keluar: -{formatRupiah(filteredKeluar)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-black text-sm text-slate-900 tabular-nums">
                      {formatRupiah(saldo)}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      Saldo Kas RW 03 Sinkron
                    </span>
                  </td>
                  <td colSpan={isSuperAdmin ? 2 : 1} className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed">
                    Jumlah saldo kas RW 03 sama persis dengan total penerimaan ({formatRupiah(totalMasuk)}) dikurangi total pengeluaran ({formatRupiah(totalKeluar)}) = <strong className="text-slate-900">{formatRupiah(saldo)}</strong>.
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal 1: Catat Transaksi (Setoran RT) - Khusus Super Admin */}
      {isAddOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">Catat Transaksi Setoran RT</h3>
                  <span className="text-[10px] text-emerald-200">Buku Kas & Transparansi RW 03 (Super Admin)</span>
                </div>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)} 
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddTransaction} className="p-5 sm:p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Setoran RT (RT 01, RT 02, RT 03, RT 04, RT 05) */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Setoran RT *</span>
                  <span className="text-[11px] font-normal text-slate-400">Pilih RT penyetor</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['RT 01', 'RT 02', 'RT 03', 'RT 04', 'RT 05'] as const).map(rt => {
                    const isSelected = setoranRt === rt;
                    return (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => {
                          setSetoranRt(rt);
                          if (!keterangan || keterangan.startsWith('Setoran ')) {
                            setKeterangan(`Setoran ${jenisSetoran} ${rt}`);
                          }
                        }}
                        className={`py-2 text-center rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {rt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pilihan Input: IWD vs Sosial & Kematian */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>2. Pilihan Jenis Setoran *</span>
                  <span className="text-[11px] font-normal text-slate-400">Pilih jenis iuran setoran</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJenisSetoran('IWD');
                      if (!keterangan || keterangan.startsWith('Setoran ')) {
                        setKeterangan(`Setoran IWD ${setoranRt}`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      jenisSetoran === 'IWD'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/30 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      jenisSetoran === 'IWD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight font-bold">IWD</span>
                      <span className="text-[10px] font-normal text-slate-500 block">Iuran Warga Digital</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJenisSetoran('Sosial & Kematian');
                      if (!keterangan || keterangan.startsWith('Setoran ')) {
                        setKeterangan(`Setoran Sosial & Kematian ${setoranRt}`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      jenisSetoran === 'Sosial & Kematian'
                        ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-600/30 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      jenisSetoran === 'Sosial & Kematian' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight font-bold">Sosial & Kematian</span>
                      <span className="text-[10px] font-normal text-slate-500 block">Dana Santunan & Duka</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Tanggal Setor */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  3. Tanggal Setor *
                </label>
                <input
                  type="date"
                  value={tanggalSetor}
                  onChange={e => setTanggalSetor(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* 4. Jumlah Setor (nilai rupiah) */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>4. Jumlah Setoran (Nilai Rupiah) *</span>
                  {(() => {
                    const parsed = parseInt(jumlahSetor.replace(/\D/g, ''), 10) || 0;
                    return parsed > 0 ? (
                      <span className="font-mono text-emerald-800 font-bold">
                        {formatRupiah(parsed)}
                      </span>
                    ) : null;
                  })()}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={jumlahSetor}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (!raw) {
                        setJumlahSetor('');
                      } else {
                        const num = parseInt(raw, 10);
                        setJumlahSetor(num.toLocaleString('id-ID'));
                      }
                    }}
                    required
                    placeholder="Masukkan jumlah setoran"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. Keterangan (bebas maksimal 100 karakter) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800">
                    5. Keterangan *
                  </label>
                  <span className={`text-[10px] ${keterangan.length > 90 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {keterangan.length}/100 karakter
                  </span>
                </div>
                <textarea
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value.slice(0, 100))}
                  maxLength={100}
                  rows={2}
                  placeholder={jenisSetoran === 'Sosial & Kematian' ? "Contoh: Setoran Iuran Sosial & Kematian bulan September 2026 tahap 1" : "Contoh: Setoran IWD bulan September 2026 tahap 1"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-none"
                />
              </div>

              {/* Pencatat (Otomatis dari Akun Super Admin) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Pencatat (Otomatis)
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{currentUser.nama}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Super Admin
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Catat Pengeluaran - Khusus Super Admin */}
      {isExpenseOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">Catat Pengeluaran Kas</h3>
                  <span className="text-[10px] text-rose-200">Buku Kas & Transparansi RW 03 (Super Admin)</span>
                </div>
              </div>
              <button 
                onClick={() => setIsExpenseOpen(false)} 
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Pengeluaran */}
            <form onSubmit={handleAddExpense} className="p-5 sm:p-6 space-y-4 text-xs">
              {expenseErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{expenseErrorMsg}</span>
                </div>
              )}

              {/* 1. Sumber Dana Pengeluaran (IWD vs Sosial & Kematian) */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>1. Sumber Dana Pengeluaran *</span>
                  <span className="text-[11px] font-normal text-slate-400">Pilih sumber kas pengeluaran</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSumberDanaPengeluaran('IWD');
                      if (!keteranganPengeluaran || keteranganPengeluaran === 'Santunan duka cita / bantuan sosial') {
                        setKeteranganPengeluaran('Pengeluaran operasional RW 03');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      sumberDanaPengeluaran === 'IWD'
                        ? 'bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-600/30 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      sumberDanaPengeluaran === 'IWD' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight font-bold">IWD</span>
                      <span className="text-[10px] font-normal text-slate-500 block">Kas Operasional / IWD</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSumberDanaPengeluaran('Sosial & Kematian');
                      if (!keteranganPengeluaran || keteranganPengeluaran === 'Pengeluaran operasional RW 03') {
                        setKeteranganPengeluaran('Santunan duka cita / bantuan sosial');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      sumberDanaPengeluaran === 'Sosial & Kematian'
                        ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-600/30 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      sumberDanaPengeluaran === 'Sosial & Kematian' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight font-bold">Sosial & Kematian</span>
                      <span className="text-[10px] font-normal text-slate-500 block">Kas Sosial & Kematian</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Tanggal Pengeluaran */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  2. Tanggal Pengeluaran *
                </label>
                <input
                  type="date"
                  value={tanggalPengeluaran}
                  onChange={e => setTanggalPengeluaran(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
              </div>

              {/* 3. Nominal (diisi bebas dalam nilai rupiah) */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>3. Nominal Pengeluaran (Nilai Rupiah) *</span>
                  {(() => {
                    const parsed = parseInt(nominalPengeluaran.replace(/\D/g, ''), 10) || 0;
                    return parsed > 0 ? (
                      <span className="font-mono text-rose-700 font-bold">
                        {formatRupiah(parsed)}
                      </span>
                    ) : null;
                  })()}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nominalPengeluaran}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (!raw) {
                        setNominalPengeluaran('');
                      } else {
                        const num = parseInt(raw, 10);
                        setNominalPengeluaran(num.toLocaleString('id-ID'));
                      }
                    }}
                    required
                    placeholder="Masukkan nominal pengeluaran"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:ring-2 focus:ring-rose-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Keterangan (bebas maksimal 100 karakter) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800">
                    4. Keterangan Pengeluaran *
                  </label>
                  <span className={`text-[10px] ${keteranganPengeluaran.length > 90 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {keteranganPengeluaran.length}/100 karakter
                  </span>
                </div>
                <textarea
                  value={keteranganPengeluaran}
                  onChange={e => setKeteranganPengeluaran(e.target.value.slice(0, 100))}
                  maxLength={100}
                  rows={2.5}
                  placeholder="Contoh: Pembelian 6 buah lampu PJU LED dan kabel sambungan RT 02"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-600 focus:outline-none resize-none"
                />
              </div>

              {/* 5. Pencatat (Otomatis Super Admin) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  5. Pencatat (Otomatis)
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{currentUser.nama}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Super Admin
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Transaksi / Pengeluaran - KHUSUS SUPER ADMIN */}
      {isEditOpen && isSuperAdmin && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b border-slate-200 flex items-center justify-between text-white ${
              editItem.tipe === 'Pengeluaran'
                ? 'bg-gradient-to-r from-rose-900 to-slate-900'
                : 'bg-gradient-to-r from-emerald-900 to-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {editItem.tipe === 'Pengeluaran' 
                      ? 'Edit Hasil Input Catat Pengeluaran' 
                      : 'Edit Hasil Input Catat Transaksi (Setoran RT)'}
                  </h3>
                  <span className="text-[10px] text-white/80">Hak Akses Penuh: Super Admin</span>
                </div>
              </div>
              <button 
                onClick={() => { setIsEditOpen(false); setEditItem(null); }} 
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Edit */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Setoran RT (Khusus Hasil Input Catat Transaksi / Setoran) */}
              {editItem.tipe === 'Pemasukan' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                      <span>1. Pilihan Setoran RT *</span>
                      <span className="text-[11px] font-normal text-slate-400">Pilih RT</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['RT 01', 'RT 02', 'RT 03', 'RT 04', 'RT 05'] as const).map(rt => {
                        const isSelected = editRt === rt;
                        return (
                          <button
                            key={rt}
                            type="button"
                            onClick={() => setEditRt(rt)}
                            className={`py-2 text-center rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {rt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                      <span>2. Pilihan Jenis Setoran *</span>
                      <span className="text-[11px] font-normal text-slate-400">Pilih jenis iuran setoran</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditJenisSetoran('IWD')}
                        className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          editJenisSetoran === 'IWD'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/30 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          editJenisSetoran === 'IWD' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold">IWD</span>
                          <span className="text-[10px] font-normal text-slate-500 block">Iuran Warga Digital</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditJenisSetoran('Sosial & Kematian')}
                        className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          editJenisSetoran === 'Sosial & Kematian'
                            ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-600/30 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          editJenisSetoran === 'Sosial & Kematian' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <HeartHandshake className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold">Sosial & Kematian</span>
                          <span className="text-[10px] font-normal text-slate-500 block">Dana Santunan & Duka</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Sumber Dana Pengeluaran (Khusus Catat Pengeluaran) */}
              {editItem.tipe === 'Pengeluaran' && (
                <div>
                  <label className="font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                    <span>1. Pilihan Sumber Dana Pengeluaran *</span>
                    <span className="text-[11px] font-normal text-slate-400">Pilih sumber kas pengeluaran</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSumberDana('IWD')}
                      className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        editSumberDana === 'IWD'
                          ? 'bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-600/30 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        editSumberDana === 'IWD' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block leading-tight font-bold">IWD</span>
                        <span className="text-[10px] font-normal text-slate-500 block">Kas Operasional / IWD</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditSumberDana('Sosial & Kematian')}
                      className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        editSumberDana === 'Sosial & Kematian'
                          ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-600/30 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        editSumberDana === 'Sosial & Kematian' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <HeartHandshake className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block leading-tight font-bold">Sosial & Kematian</span>
                        <span className="text-[10px] font-normal text-slate-500 block">Kas Sosial & Kematian</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  {editItem.tipe === 'Pengeluaran' ? 'Tanggal Pengeluaran *' : 'Tanggal Setor *'}
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={e => setEditTanggal(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Nominal */}
              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>Nominal Transaksi (Nilai Rupiah) *</span>
                  {editNominal > 0 && (
                    <span className={`font-mono font-bold ${
                      editItem.tipe === 'Pengeluaran' ? 'text-rose-700' : 'text-emerald-800'
                    }`}>
                      {formatRupiah(editNominal)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="10000"
                    value={editNominal}
                    onChange={e => setEditNominal(Math.max(0, Number(e.target.value)))}
                    required
                    placeholder="Contoh: 2000000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800">
                    Keterangan (Maksimal 100 Karakter) *
                  </label>
                  <span className={`text-[10px] ${editKeterangan.length > 90 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {editKeterangan.length}/100 karakter
                  </span>
                </div>
                <textarea
                  value={editKeterangan}
                  onChange={e => setEditKeterangan(e.target.value.slice(0, 100))}
                  maxLength={100}
                  rows={2.5}
                  placeholder="Keterangan transaksi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-none"
                />
              </div>

              {/* Pencatat Asal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Pencatat Awal
                </span>
                <span className="font-bold text-slate-800">{editItem.pencatat}</span>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditOpen(false); setEditItem(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer active:scale-95 transition-all ${
                    editItem.tipe === 'Pengeluaran'
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Konfirmasi Hapus Transaksi / Pengeluaran - KHUSUS SUPER ADMIN */}
      {isDeleteOpen && isSuperAdmin && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">
                {itemToDelete.tipe === 'Pengeluaran' 
                  ? 'Hapus Hasil Catat Pengeluaran?' 
                  : 'Hapus Hasil Catat Transaksi?'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menghapus data ini dari Buku Kas RW 03? Tindakan penghapusan ini akan otomatis tercatat dalam audit log sistem.
              </p>

              {/* Preview Data yang akan dihapus */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kategori:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    itemToDelete.tipe === 'Pengeluaran' 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {itemToDelete.tipe === 'Pengeluaran' 
                      ? 'Catat Pengeluaran' 
                      : `Catat Transaksi (${itemToDelete.setoranRt || 'Setoran RT'})`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-semibold text-slate-800">{formatDateDisplay(itemToDelete.tanggal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nominal:</span>
                  <span className={`font-mono font-bold ${
                    itemToDelete.tipe === 'Pengeluaran' ? 'text-rose-700' : 'text-emerald-800'
                  }`}>
                    {formatRupiah(itemToDelete.nominal)}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Keterangan:</span>
                  <span className="font-medium text-slate-800 text-xs block leading-tight mt-0.5">
                    {itemToDelete.keterangan || '-'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsDeleteOpen(false); setItemToDelete(null); }}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  Ya, Hapus Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
