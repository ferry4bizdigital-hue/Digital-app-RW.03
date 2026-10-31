import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  FileSpreadsheet, 
  ArrowRight,
  ShieldCheck,
  Check,
  Receipt,
  FileText,
  Building,
  RefreshCw
} from 'lucide-react';
import { User, RtExpenseItem, DueBill } from '../../types';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';

interface ModulKeuanganRtProps {
  currentUser: User;
  onNavigateTab?: (tab: ActiveTab) => void;
}

const RT_CATEGORIES = [
  'Kebersihan & Lingkungan',
  'Keamanan & Ronda',
  'Konsumsi Rapat & Kerja Bakti',
  'Perbaikan Fasum & PJU',
  'Sosial & Santunan Warga',
  'Operasional RT & ATK',
  'Kegiatan Pemuda & Olahraga',
  'Lainnya'
] as const;

export const ModulKeuanganRt: React.FC<ModulKeuanganRtProps> = ({ currentUser, onNavigateTab }) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isRtOfficer = currentUser.role === 'pengurus_rt';
  const userRt = StorageService.normalizeRt(currentUser.RT || '01');

  // Selected RT for IT Admin / Super Admin (defaults to user's RT or '01')
  const [selectedRt, setSelectedRt] = useState<string>(isRtOfficer ? userRt : '01');
  const [activeSubTab, setActiveSubTab] = useState<'pengeluaran' | 'penerimaan_iwd' | 'rekap_semua_rt'>('pengeluaran');

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tick, setTick] = useState(0);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<RtExpenseItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<RtExpenseItem | null>(null);

  // Form states for Catat / Edit Pengeluaran RT
  const [formRt, setFormRt] = useState<string>(selectedRt);
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formKategori, setFormKategori] = useState<string>(RT_CATEGORIES[0]);
  const [formNominal, setFormNominal] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formPencatat, setFormPencatat] = useState<string>(currentUser.nama);
  const [formError, setFormError] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string>('');

  // Reactive subscription
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsub;
  }, []);

  // Sync selectedRt when user role changes
  useEffect(() => {
    if (isRtOfficer) {
      setSelectedRt(userRt);
    }
  }, [isRtOfficer, userRt]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Get financial summary for current selected RT
  const currentSummary = useMemo(() => {
    return StorageService.getRtKasSummary(selectedRt);
  }, [selectedRt, tick]);

  // Summary for all RTs (01 - 05)
  const allRtSummaries = useMemo(() => {
    return StorageService.getAllRtKasSummary();
  }, [tick]);

  // Grand totals across all RTs
  const grandTotal = useMemo(() => {
    return allRtSummaries.reduce(
      (acc, curr) => {
        acc.penerimaan += curr.totalPenerimaanIwd;
        acc.pengeluaran += curr.totalPengeluaran;
        acc.saldo += curr.sisaSaldo;
        acc.countLunas += curr.countIwdLunas;
        acc.countPengeluaran += curr.countPengeluaran;
        return acc;
      },
      { penerimaan: 0, pengeluaran: 0, saldo: 0, countLunas: 0, countPengeluaran: 0 }
    );
  }, [allRtSummaries]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return currentSummary.expenses.filter(item => {
      if (categoryFilter !== 'all' && item.kategori !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKet = item.keterangan.toLowerCase().includes(q);
        const matchKat = item.kategori.toLowerCase().includes(q);
        const matchPencatat = item.pencatat.toLowerCase().includes(q);
        const matchNominal = item.nominal.toString().includes(q);
        const matchTanggal = item.tanggal.includes(q);
        if (!matchKet && !matchKat && !matchPencatat && !matchNominal && !matchTanggal) {
          return false;
        }
      }
      return true;
    });
  }, [currentSummary.expenses, categoryFilter, searchQuery]);

  // Filtered paid dues list (Penerimaan IWD)
  const filteredPaidDues = useMemo(() => {
    return currentSummary.paidDues.filter(due => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = due.namaKepalaKeluarga?.toLowerCase().includes(q);
        const matchKk = due.nomorKK?.toLowerCase().includes(q);
        const matchPeriode = due.periode?.toLowerCase().includes(q);
        const matchUsaha = due.namaUsaha?.toLowerCase().includes(q);
        const matchMetode = due.metodeBayar?.toLowerCase().includes(q);
        if (!matchNama && !matchKk && !matchPeriode && !matchUsaha && !matchMetode) {
          return false;
        }
      }
      return true;
    });
  }, [currentSummary.paidDues, searchQuery]);

  // Handlers for Add Expense
  const handleOpenAddModal = () => {
    setFormRt(selectedRt);
    setFormTanggal(new Date().toISOString().substring(0, 10));
    setFormKategori(RT_CATEGORIES[0]);
    setFormNominal('');
    setFormKeterangan('');
    setFormPencatat(currentUser.nama + (isSuperAdmin ? ' (IT Admin)' : ` (Pengurus RT ${selectedRt})`));
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNominal = parseInt(formNominal.replace(/\D/g, ''), 10);
    if (!cleanNominal || cleanNominal <= 0) {
      setFormError('Nominal pengeluaran harus berupa angka lebih besar dari Rp 0.');
      return;
    }
    if (!formKeterangan.trim()) {
      setFormError('Keterangan rincian pengeluaran wajib diisi.');
      return;
    }

    StorageService.addRtExpense({
      rt: isRtOfficer ? userRt : formRt,
      tanggal: formTanggal,
      kategori: formKategori,
      nominal: cleanNominal,
      keterangan: formKeterangan.trim(),
      pencatat: formPencatat.trim() || currentUser.nama
    });

    setIsAddModalOpen(false);
    showToast(`Pengeluaran RT ${isRtOfficer ? userRt : formRt} sebesar Rp ${cleanNominal.toLocaleString('id-ID')} berhasil dicatat.`);
  };

  // Handlers for Edit Expense
  const handleOpenEditModal = (item: RtExpenseItem) => {
    setItemToEdit(item);
    setFormRt(item.rt);
    setFormTanggal(item.tanggal);
    setFormKategori(item.kategori);
    setFormNominal(item.nominal.toString());
    setFormKeterangan(item.keterangan);
    setFormPencatat(item.pencatat);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const cleanNominal = parseInt(formNominal.replace(/\D/g, ''), 10);
    if (!cleanNominal || cleanNominal <= 0) {
      setFormError('Nominal pengeluaran harus berupa angka lebih besar dari Rp 0.');
      return;
    }
    if (!formKeterangan.trim()) {
      setFormError('Keterangan rincian pengeluaran wajib diisi.');
      return;
    }

    StorageService.updateRtExpense(itemToEdit.id, {
      rt: isRtOfficer ? userRt : formRt,
      tanggal: formTanggal,
      kategori: formKategori,
      nominal: cleanNominal,
      keterangan: formKeterangan.trim(),
      pencatat: formPencatat.trim() || currentUser.nama
    });

    setIsEditModalOpen(false);
    setItemToEdit(null);
    showToast(`Perubahan pengeluaran RT berhasil diperbarui.`);
  };

  // Handlers for Delete Expense
  const handleOpenDeleteModal = (item: RtExpenseItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    StorageService.deleteRtExpense(itemToDelete.id);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    showToast(`Pengeluaran sebesar Rp ${itemToDelete.nominal.toLocaleString('id-ID')} berhasil dihapus.`);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['No', 'Tanggal', 'RT', 'Kategori', 'Keterangan', 'Nominal (Rp)', 'Pencatat'];
    const rows = filteredExpenses.map((exp, idx) => [
      idx + 1,
      exp.tanggal,
      `RT ${exp.rt}`,
      `"${exp.kategori}"`,
      `"${exp.keterangan.replace(/"/g, '""')}"`,
      exp.nominal,
      `"${exp.pencatat}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kas_Pengeluaran_RT_${selectedRt}_RW03_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500/40 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage('')} 
            className="text-slate-400 hover:text-white ml-2 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-6 h-6 stroke-[2.2px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isSuperAdmin ? 'IT Admin Super RW 03' : `Pengurus RT ${userRt}`}
                </span>
                <span className="text-xs text-slate-400">· Buku Kas Lingkungan</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
                Kas & Keuangan RT {isRtOfficer ? userRt : selectedRt} RW 03
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Penerimaan otomatis dari total iuran IWD terkumpul, pencatatan pengeluaran RT, dan kalkulasi sisa saldo kas aktif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.4px]" />
              <span>Catat Pengeluaran RT</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh Laporan CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* RT Selector Pill Tabs for Super Admin / IT Admin */}
        {isSuperAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Pilih Wilayah RT:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['01', '02', '03', '04', '05'] as const).map(rtNum => {
                  const isSelected = selectedRt === rtNum;
                  return (
                    <button
                      key={rtNum}
                      onClick={() => {
                        setSelectedRt(rtNum);
                        if (activeSubTab === 'rekap_semua_rt') setActiveSubTab('pengeluaran');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-700 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      RT {rtNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mode Role Play IT Admin: Memiliki akses penuh kelola RT 01 s/d RT 05</span>
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Cards: Sisa Saldo, Penerimaan IWD, Total Pengeluaran */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Sisa Saldo Kas & Keuangan RT (Highlight) */}
        <div className={`p-5 rounded-2xl border transition-all shadow-xs relative overflow-hidden ${
          currentSummary.sisaSaldo >= 0 
            ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-emerald-300' 
            : 'bg-gradient-to-br from-rose-50 via-white to-orange-50/50 border-rose-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-700" />
              Sisa Saldo Kas RT {selectedRt}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentSummary.sisaSaldo >= 0 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {currentSummary.sisaSaldo >= 0 ? 'Surplus / Tersedia' : 'Defisit Kas'}
            </span>
          </div>

          <div className="mt-2">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
              currentSummary.sisaSaldo >= 0 ? 'text-emerald-900' : 'text-rose-800'
            }`}>
              Rp {currentSummary.sisaSaldo.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Sisa Kas = Penerimaan - Pengeluaran</span>
              <span className="font-semibold text-emerald-700">
                RT {selectedRt} Kebon Kangkung
              </span>
            </div>
          </div>

          {/* Progress bar visual comparison */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Rasio Penggunaan Dana</span>
              <span className="font-mono font-medium">
                {currentSummary.totalPenerimaanIwd > 0 
                  ? Math.min(100, Math.round((currentSummary.totalPengeluaran / currentSummary.totalPenerimaanIwd) * 100))
                  : 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  currentSummary.sisaSaldo >= 0 ? 'bg-emerald-600' : 'bg-rose-500'
                }`}
                style={{
                  width: `${currentSummary.totalPenerimaanIwd > 0 
                    ? Math.min(100, (currentSummary.totalPengeluaran / currentSummary.totalPenerimaanIwd) * 100) 
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Penerimaan IWD Terkumpul (Lunas) */}
        <div 
          onClick={() => setActiveSubTab('penerimaan_iwd')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Penerimaan IWD (Lunas)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800 font-mono">
              Rp {currentSummary.totalPenerimaanIwd.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{currentSummary.countIwdLunas} tagihan telah lunas</span>
              <span className="text-[11px] font-semibold text-emerald-700 group-hover:underline flex items-center gap-0.5">
                Rincian →
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Sumber dana otomatis dari modul Iuran Warga Digital (IWD) RT {selectedRt}.
          </div>
        </div>

        {/* Card 3: Total Pengeluaran RT */}
        <div 
          onClick={() => setActiveSubTab('pengeluaran')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Total Pengeluaran RT
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-700 font-mono">
              Rp {currentSummary.totalPengeluaran.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{currentSummary.countPengeluaran} pos pengeluaran tercatat</span>
              <span className="text-[11px] font-semibold text-rose-700 group-hover:underline flex items-center gap-0.5">
                Lihat Data →
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Dapat diinput & diedit pengurus</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddModal();
              }}
              className="text-[11px] font-semibold text-emerald-800 hover:underline flex items-center gap-0.5"
            >
              + Catat Baru
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pengeluaran')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'pengeluaran'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Pengeluaran RT {selectedRt} ({currentSummary.countPengeluaran})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('penerimaan_iwd')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'penerimaan_iwd'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Penerimaan IWD ({currentSummary.countIwdLunas} Lunas)</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveSubTab('rekap_semua_rt')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'rekap_semua_rt'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Rekapitulasi Semua RT (01 - 05)</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: DAFTAR PENGELUARAN RT */}
      {activeSubTab === 'pengeluaran' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pengeluaran, keterangan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">Semua Kategori</option>
                  {RT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 w-full sm:w-auto text-right">
              Menampilkan <span className="font-semibold text-slate-800">{filteredExpenses.length}</span> dari {currentSummary.countPengeluaran} pengeluaran
            </div>
          </div>

          {/* Table / List */}
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Pengeluaran Dicatat</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Catat pengeluaran untuk operasional, kebersihan, ronda, perbaikan lingkungan RT {selectedRt}.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Pengeluaran RT Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pos / Kategori</th>
                    <th className="py-3 px-4">Keterangan Pengeluaran</th>
                    <th className="py-3 px-4">Dicatat Oleh</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {item.tanggal}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-slate-900">{item.keterangan}</div>
                        <div className="text-[10px] text-slate-400">ID: {item.id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.pencatat}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700 font-mono whitespace-nowrap text-sm">
                        - Rp {item.nominal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Edit Pengeluaran"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                            title="Hapus Pengeluaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                      Total Pengeluaran RT {selectedRt}:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                      Rp {filteredExpenses.reduce((sum, e) => sum + e.nominal, 0).toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: RINCIAN PENERIMAAN IWD (SUMBER KAS) */}
      {activeSubTab === 'penerimaan_iwd' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Penerimaan Iuran Warga Digital (IWD) Terkumpul RT {selectedRt}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar pembayaran warga RT {selectedRt} yang telah berstatus Lunas.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kepala keluarga / no KK..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('iuran')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Buka Modul Iuran</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredPaidDues.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada IWD Lunas Terkumpul</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tagihan iuran berstatus Lunas pada RT {selectedRt} akan otomatis tercatat sebagai penerimaan kas di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Kepala Keluarga / Usaha</th>
                    <th className="py-3 px-4">No. Kartu Keluarga (KK)</th>
                    <th className="py-3 px-4">Periode Tagihan</th>
                    <th className="py-3 px-4">Metode Bayar</th>
                    <th className="py-3 px-4">Tanggal Bayar</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPaidDues.map((due, idx) => (
                    <tr key={due.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {due.namaKepalaKeluarga}
                          {due.namaUsaha && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded ml-1.5">
                              {due.namaUsaha}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {due.kategoriWarga === 'ngontrak_usaha' ? 'Warga Ngontrak Usaha' : 'Warga Keluarga Tetap'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {due.nomorKK || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px]">
                          {due.periode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {due.metodeBayar || 'Tunai ke Petugas RT'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {due.tanggalBayar || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800 font-mono whitespace-nowrap text-sm">
                        + Rp {due.nominal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                      Total Penerimaan IWD Terkumpul RT {selectedRt}:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                      Rp {filteredPaidDues.reduce((sum, d) => sum + d.nominal, 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: REKAPITULASI SEMUA RT (KHUSUS IT ADMIN / SUPER ADMIN) */}
      {isSuperAdmin && activeSubTab === 'rekap_semua_rt' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-700" />
                Rekapitulasi Kas & Keuangan Seluruh RT (RT 01 s/d RT 05) RW 03
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan penerimaan IWD, pengeluaran RT dan sisa saldo kas per unit RT.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Wilayah RT</th>
                  <th className="py-3.5 px-4 text-center">KK Lunas</th>
                  <th className="py-3.5 px-4 text-right">Penerimaan IWD (Lunas)</th>
                  <th className="py-3.5 px-4 text-center">Pengeluaran Diinput</th>
                  <th className="py-3.5 px-4 text-right">Total Pengeluaran RT</th>
                  <th className="py-3.5 px-4 text-right">Sisa Saldo Kas RT</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRtSummaries.map(item => (
                  <tr key={item.rt} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {item.rt}
                        </span>
                        <span>RT {item.rt} Kebon Kangkung</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {item.countIwdLunas} KK
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                      Rp {item.totalPenerimaanIwd.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {item.countPengeluaran} item
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-700">
                      Rp {item.totalPengeluaran.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                      <span className={item.sisaSaldo >= 0 ? 'text-emerald-900' : 'text-rose-800'}>
                        Rp {item.sisaSaldo.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedRt(item.rt);
                          setActiveSubTab('pengeluaran');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Buka RT {item.rt} →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                <tr>
                  <td className="py-4 px-4 uppercase tracking-wider">
                    Total Keseluruhan RT 01-05:
                  </td>
                  <td className="py-4 px-4 text-center font-mono">
                    {grandTotal.countLunas} KK
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-900 text-sm">
                    Rp {grandTotal.penerimaan.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-4 text-center font-mono">
                    {grandTotal.countPengeluaran} item
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-rose-800 text-sm">
                    Rp {grandTotal.pengeluaran.toLocaleString('id-ID')}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-950 font-extrabold text-base">
                    Rp {grandTotal.saldo.toLocaleString('id-ID')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CATAT PENGELUARAN RT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 stroke-[2.4px]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Catat Pengeluaran Kas RT {isRtOfficer ? userRt : formRt}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input rincian transaksi pengeluaran operasional lingkungan RT
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddExpense} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target RT Selection (If Super Admin) */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wilayah RT Target
                  </label>
                  <select
                    value={formRt}
                    onChange={e => setFormRt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
              )}

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pos / Kategori
                  </label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {RT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nominal Pengeluaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pengeluaran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="Contoh: 150000"
                    value={formNominal}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormNominal(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Keterangan Rincian */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Pengeluaran
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan rincian keperluan belanja / kegiatan (misal: Pembelian sapu lidi & kantong sampah kerja bakti)..."
                  value={formKeterangan}
                  onChange={e => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Pencatat */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Petugas Pencatat
                </label>
                <input
                  type="text"
                  value={formPencatat}
                  onChange={e => setFormPencatat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.4px]" />
                  <span>Simpan Pengeluaran RT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PENGELUARAN RT */}
      {isEditModalOpen && itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Ubah Pengeluaran RT {itemToEdit.rt}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID Transaksi: {itemToEdit.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setItemToEdit(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pos / Kategori
                  </label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {RT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nominal Pengeluaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pengeluaran (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={formNominal}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormNominal(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Pengeluaran
                </label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={e => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Pencatat */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Petugas Pencatat
                </label>
                <input
                  type="text"
                  value={formPencatat}
                  onChange={e => setFormPencatat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setItemToEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.4px]" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HAPUS PENGELUARAN RT */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 p-5">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Pengeluaran RT?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mempengaruhi sisa saldo kas RT</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 mb-4">
              <div><span className="text-slate-500">Tanggal:</span> <span className="font-semibold">{itemToDelete.tanggal}</span></div>
              <div><span className="text-slate-500">Kategori:</span> <span className="font-semibold">{itemToDelete.kategori}</span></div>
              <div><span className="text-slate-500">Keterangan:</span> <span className="font-semibold">{itemToDelete.keterangan}</span></div>
              <div><span className="text-slate-500">Nominal:</span> <span className="font-bold text-rose-700 font-mono">Rp {itemToDelete.nominal.toLocaleString('id-ID')}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Ya, Hapus Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
