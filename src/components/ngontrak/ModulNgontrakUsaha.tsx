import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  Filter, 
  ArrowLeft, 
  ShieldCheck, 
  X, 
  ExternalLink,
  Building2,
  Users,
  Briefcase,
  Wallet,
  Calendar
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { WargaNgontrakUsaha, User } from '../../types';
import { ActiveTab } from '../layout/BottomNav';

interface ModulNgontrakUsahaProps {
  currentUser: User;
  onNavigateTab: (tab: ActiveTab) => void;
  onBackToPengurus?: () => void;
}

const KATEGORI_USAHA_OPTIONS = [
  'Kuliner / Rumah Makan & Warung',
  'Kafe & Minuman Kekinian',
  'Jasa Laundry & Cuci Kiloan',
  'Toko Kelontong & Sembako',
  'Bengkel & Servis Kendaraan',
  'Pangkas Rambut & Barbershop',
  'Apotek, Obat & Kesehatan',
  'Jahit, Konveksi & Sablon',
  'Toko Pulsa & Aksesoris HP',
  'Jasa Fotokopi & ATK',
  'Usaha Lainnya'
];

export const ModulNgontrakUsaha: React.FC<ModulNgontrakUsahaProps> = ({
  currentUser,
  onNavigateTab,
  onBackToPengurus
}) => {
  const [dataList, setDataList] = useState<WargaNgontrakUsaha[]>(() => 
    StorageService.getWargaNgontrakUsaha()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRt, setSelectedRt] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Hak akses hapus data warga ngontrak usaha: KHUSUS Super Admin
  // Role RW, Bendahara, RT 01 s/d RT 05 tidak diberikan akses untuk menghapus
  const canDelete = currentUser.role === 'super_admin';

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WargaNgontrakUsaha | null>(null);
  const [detailItem, setDetailItem] = useState<WargaNgontrakUsaha | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<WargaNgontrakUsaha | null>(null);

  // Modal Input IWD untuk Usaha
  const [iwdModalItem, setIwdModalItem] = useState<WargaNgontrakUsaha | null>(null);
  const [iwdPeriode, setIwdPeriode] = useState('September 2026');
  const [iwdJenis, setIwdJenis] = useState<'IWD (Iuran Warga Digital)' | 'Sosial & Kematian' | 'Kebersihan'>('IWD (Iuran Warga Digital)');
  const [iwdNominal, setIwdNominal] = useState<number | ''>('');
  const [iwdStatus, setIwdStatus] = useState<'Belum Bayar' | 'Lunas'>('Belum Bayar');
  const [iwdTanggalBayar, setIwdTanggalBayar] = useState(new Date().toISOString().substring(0, 10));
  const [iwdMetodeBayar, setIwdMetodeBayar] = useState<'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT'>('Tunai ke Petugas RT');
  const [iwdToastWithLink, setIwdToastWithLink] = useState(false);

  // Form Fields
  const [formNamaCp, setFormNamaCp] = useState('');
  const [formNamaUsaha, setFormNamaUsaha] = useState('');
  const [formNomorHp, setFormNomorHp] = useState('');
  const [formRt, setFormRt] = useState('01');
  const [formJenisUsaha, setFormJenisUsaha] = useState(KATEGORI_USAHA_OPTIONS[0]);
  const [formAlamatLokasi, setFormAlamatLokasi] = useState('');
  const [formStatusSewa, setFormStatusSewa] = useState<'Aktif' | 'Selesai' | 'Menunggu Perpanjangan'>('Aktif');
  const [formTanggalMulai, setFormTanggalMulai] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState('');

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setDataList(StorageService.getWargaNgontrakUsaha());
    });
    return unsubscribe;
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormNamaCp('');
    setFormNamaUsaha('');
    setFormNomorHp('');
    setFormRt('01');
    setFormJenisUsaha(KATEGORI_USAHA_OPTIONS[0]);
    setFormAlamatLokasi('');
    setFormStatusSewa('Aktif');
    setFormTanggalMulai(new Date().toISOString().substring(0, 10));
    setFormKeterangan('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: WargaNgontrakUsaha) => {
    setEditingItem(item);
    setFormNamaCp(item.namaCp);
    setFormNamaUsaha(item.namaUsaha);
    setFormNomorHp(item.nomorHpCp || '');
    setFormRt(item.rt);
    setFormJenisUsaha(item.jenisUsaha || KATEGORI_USAHA_OPTIONS[0]);
    setFormAlamatLokasi(item.alamatLokasi || '');
    setFormStatusSewa(item.statusSewa || 'Aktif');
    setFormTanggalMulai(item.tanggalMulai || '');
    setFormKeterangan(item.keterangan || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveData = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCp = formNamaCp.trim();
    const cleanUsaha = formNamaUsaha.trim();

    if (!cleanCp) {
      setFormError('Nama CP (Contact Person) wajib diisi.');
      return;
    }
    if (!cleanUsaha) {
      setFormError('Nama Usaha wajib diisi.');
      return;
    }

    if (editingItem) {
      const success = StorageService.updateWargaNgontrakUsaha(editingItem.id, {
        namaCp: cleanCp,
        namaUsaha: cleanUsaha,
        nomorHpCp: formNomorHp.trim() || '-',
        rt: formRt,
        rw: '03',
        jenisUsaha: formJenisUsaha,
        alamatLokasi: formAlamatLokasi.trim() || `RT ${formRt} / RW 03 Kebon Kangkung`,
        statusSewa: formStatusSewa,
        tanggalMulai: formTanggalMulai || undefined,
        keterangan: formKeterangan.trim() || undefined
      });

      if (success) {
        showNotification(`Data warga ngontrak usaha ${cleanUsaha} berhasil diperbarui!`);
        setIsAddModalOpen(false);
      }
    } else {
      const created = StorageService.addWargaNgontrakUsaha({
        namaCp: cleanCp,
        namaUsaha: cleanUsaha,
        nomorHpCp: formNomorHp.trim() || '-',
        rt: formRt,
        rw: '03',
        jenisUsaha: formJenisUsaha,
        alamatLokasi: formAlamatLokasi.trim() || `RT ${formRt} / RW 03 Kebon Kangkung`,
        statusSewa: formStatusSewa,
        tanggalMulai: formTanggalMulai || new Date().toISOString().substring(0, 10),
        keterangan: formKeterangan.trim() || undefined
      });

      if (created) {
        showNotification(`Warga ngontrak usaha ${cleanUsaha} (CP: ${cleanCp}) berhasil ditambahkan dan tercatat pada Daftar Warga Terdata Ngontrak Usaha (A - Z)!`);
        setIsAddModalOpen(false);
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!canDelete || !deleteConfirmItem) return;
    const name = deleteConfirmItem.namaUsaha;
    const cp = deleteConfirmItem.namaCp;
    const id = deleteConfirmItem.id;

    const success = StorageService.deleteWargaNgontrakUsaha(id);
    if (success) {
      showNotification(`Data warga ngontrak usaha ${name} (CP: ${cp}) berhasil dihapus.`);
      setDeleteConfirmItem(null);
    }
  };

  // Handler Buka Modal Input IWD untuk Usaha Ini
  const handleOpenInputIwd = (item: WargaNgontrakUsaha) => {
    setIwdModalItem(item);
    setIwdPeriode('September 2026');
    setIwdJenis('IWD (Iuran Warga Digital)');
    setIwdNominal('');
    setIwdStatus('Belum Bayar');
    setIwdTanggalBayar(new Date().toISOString().substring(0, 10));
    setIwdMetodeBayar('Tunai ke Petugas RT');
  };

  // Handler Simpan Data IWD
  const handleSaveIwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iwdModalItem) return;
    if (iwdNominal === '' || iwdNominal <= 0) {
      showNotification('Besaran nominal iuran harus lebih besar dari Rp 0.');
      return;
    }

    const newBill = StorageService.addDueBill({
      jenisIuran: iwdJenis,
      periode: iwdPeriode,
      nominal: Number(iwdNominal),
      nomorKK: `USAHA-${iwdModalItem.rt}-${iwdModalItem.id.toUpperCase()}`,
      namaKepalaKeluarga: `${iwdModalItem.namaUsaha} (CP: ${iwdModalItem.namaCp})`,
      rt: iwdModalItem.rt,
      status: iwdStatus,
      tanggalBayar: iwdStatus === 'Lunas' ? `${iwdTanggalBayar} 10:00` : undefined,
      metodeBayar: iwdStatus === 'Lunas' ? iwdMetodeBayar : undefined,
      kategoriWarga: 'ngontrak_usaha',
      wargaNgontrakUsahaId: iwdModalItem.id,
      namaUsaha: iwdModalItem.namaUsaha,
      namaCp: iwdModalItem.namaCp
    });

    if (newBill) {
      const usahaNama = iwdModalItem.namaUsaha;
      const cpNama = iwdModalItem.namaCp;
      setIwdModalItem(null);
      setToastMessage(`Tagihan IWD untuk ${usahaNama} (CP: ${cpNama}) berhasil diinput ke Modul Iuran Warga Digital (IWD)!`);
      setIwdToastWithLink(true);
      setTimeout(() => {
        setToastMessage('');
        setIwdToastWithLink(false);
      }, 7000);
    }
  };

  // Filtered & Sorted (A - Z) List
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = dataList.filter(item => {
      // Filter RT
      if (selectedRt !== 'all' && item.rt !== selectedRt) return false;

      // Filter Status
      if (selectedStatus !== 'all' && (item.statusSewa || 'Aktif') !== selectedStatus) return false;

      // Search Query
      if (q) {
        const matchCp = item.namaCp.toLowerCase().includes(q);
        const matchUsaha = item.namaUsaha.toLowerCase().includes(q);
        const matchHp = (item.nomorHpCp || '').toLowerCase().includes(q);
        const matchJenis = (item.jenisUsaha || '').toLowerCase().includes(q);
        const matchAlamat = (item.alamatLokasi || '').toLowerCase().includes(q);
        if (!matchCp && !matchUsaha && !matchHp && !matchJenis && !matchAlamat) {
          return false;
        }
      }

      return true;
    });

    // Urutkan alfabetis A - Z berdasarkan Nama Usaha, lalu Nama CP
    return filtered.sort((a, b) => 
      a.namaUsaha.localeCompare(b.namaUsaha, 'id', { sensitivity: 'base' })
    );
  }, [dataList, searchQuery, selectedRt, selectedStatus]);

  // Statistics
  const totalCount = dataList.length;
  const activeCount = dataList.filter(d => (d.statusSewa || 'Aktif') === 'Aktif').length;
  const rtCounts = ['01', '02', '03', '04', '05'].map(rt => ({
    rt,
    count: dataList.filter(d => d.rt === rt).length
  }));

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['No', 'Nama Usaha', 'Nama CP (Contact Person)', 'No HP / WA', 'Wilayah RT', 'Jenis Usaha', 'Alamat Lokasi', 'Status Sewa'];
    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.namaUsaha}"`,
      `"${item.namaCp}"`,
      `"${item.nomorHpCp || '-'}"`,
      `"RT ${item.rt}"`,
      `"${item.jenisUsaha || '-'}"`,
      `"${item.alamatLokasi || '-'}"`,
      `"${item.statusSewa || 'Aktif'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `warga_ngontrak_usaha_rw03_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          {iwdToastWithLink && (
            <button
              type="button"
              onClick={() => onNavigateTab('iuran')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer shadow-2xs"
            >
              Lihat di Modul Iuran →
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-teal-800/50">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-teal-800/60 border border-teal-600/40">
                MODUL & LAYANAN RW 03
              </span>
              <span>·</span>
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                Data Warga Ngontrak Usaha
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
              <Store className="w-6 h-6 text-teal-400" />
              <span>Pengelolaan Data Warga Ngontrak Usaha</span>
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              Administrasi terpadu pendataan pelaku usaha, ruko, kios, dan warga yang mengontrak tempat usaha di lingkungan RW 03 (RT 01 s/d RT 05).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {onBackToPengurus && (
              <button
                type="button"
                onClick={onBackToPengurus}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Pengurus</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('iuran')}
              className="px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold border border-emerald-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Buka Input Iuran Warga Digital (IWD)"
            >
              <Wallet className="w-4 h-4" />
              <span>Input Iuran Warga Digital (IWD)</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Warga</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Total Usaha Ngontrak</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">RW 03</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalCount} <span className="text-xs font-normal text-slate-500 font-sans">Unit Usaha</span>
          </div>
          <div className="text-[11px] text-teal-700 mt-0.5">
            {activeCount} usaha berstatus aktif
          </div>
        </div>

        {rtCounts.map(item => (
          <div 
            key={item.rt}
            onClick={() => setSelectedRt(selectedRt === item.rt ? 'all' : item.rt)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedRt === item.rt 
                ? 'bg-teal-50 border-teal-500 shadow-xs' 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>RT {item.rt}</span>
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {item.count} <span className="text-[10px] font-normal text-slate-500 font-sans">Usaha</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Wilayah RT {item.rt}</div>
          </div>
        ))}
      </div>

      {/* Control Bar: Pencarian & Filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama usaha, nama CP, RT, alamat atau no HP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Unduh Data CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Warga</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 mr-2 text-[11px] font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Wilayah:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRt('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              selectedRt === 'all' 
                ? 'bg-teal-700 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua RT ({dataList.length})
          </button>

          {['01', '02', '03', '04', '05'].map(rt => {
            const count = dataList.filter(d => d.rt === rt).length;
            return (
              <button
                key={rt}
                type="button"
                onClick={() => setSelectedRt(rt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedRt === rt 
                    ? 'bg-teal-700 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                RT {rt} ({count})
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">Semua Status Sewa</option>
            <option value="Aktif">Status: Aktif</option>
            <option value="Menunggu Perpanjangan">Status: Menunggu Perpanjangan</option>
            <option value="Selesai">Status: Selesai</option>
          </select>
        </div>
      </div>

      {/* Main Table: Daftar Warga Terdata Ngontrak Usaha (A - Z) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Daftar Warga Terdata Ngontrak Usaha (A - Z)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Menampilkan {filteredList.length} dari {dataList.length} Unit Usaha
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Store className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700">Belum ada data warga ngontrak usaha yang sesuai.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Silakan sesuaikan kata kunci pencarian atau klik tombol &quot;Tambah Warga&quot; untuk menginput data baru.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Warga Sekarang</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View (block md:hidden) - Tampilan utuh tanpa terpotong di ponsel */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredList.map(item => {
                return (
                  <div key={item.id} className="p-3.5 space-y-2.5 transition-colors hover:bg-slate-50/70">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {item.namaUsaha}
                          </span>
                          <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                            {item.jenisUsaha || 'Usaha / Perdagangan'}
                          </span>
                        </div>
                      </div>

                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        item.statusSewa === 'Aktif' || !item.statusSewa
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.statusSewa === 'Menunggu Perpanjangan'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.statusSewa || 'Aktif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Nama CP & Kontak:</span>
                        <span className="font-semibold text-slate-800 block truncate">{item.namaCp}</span>
                        <span className="text-[10px] text-slate-500">{item.nomorHpCp || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Wilayah:</span>
                        <span className="font-semibold text-slate-800">RT {item.rt} / RW 03</span>
                        <span className="text-[10px] text-slate-500 block truncate">{item.alamatLokasi || '-'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenInputIwd(item)}
                        className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Input IWD</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {item.nomorHpCp && item.nomorHpCp !== '-' && (
                          <a
                            href={`https://wa.me/62${item.nomorHpCp.replace(/\D/g, '').replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                            title="Chat WhatsApp"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-700 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 min-w-[220px]">Nama Usaha & Kategori (A - Z)</th>
                  <th className="py-3 px-4 min-w-[190px]">Nama CP & Kontak</th>
                  <th className="py-3 px-4 min-w-[180px]">Wilayah & Alamat Lokasi</th>
                  <th className="py-3 px-4 min-w-[120px]">Status Sewa</th>
                  <th className="py-3 px-4 text-right min-w-[130px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(item => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama Usaha */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {item.namaUsaha}
                            </span>
                            <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                              {item.jenisUsaha || 'Usaha / Perdagangan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Nama CP & Kontak */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block text-xs">
                            {item.namaCp}
                          </span>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.nomorHpCp || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Wilayah & Lokasi */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            RT {item.rt} / RW 03
                          </span>
                          <span className="block text-[11px] text-slate-500 line-clamp-1">
                            {item.alamatLokasi || `Wilayah RT ${item.rt}`}
                          </span>
                        </div>
                      </td>

                      {/* Status Sewa */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.statusSewa === 'Aktif' || !item.statusSewa
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.statusSewa === 'Menunggu Perpanjangan'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.statusSewa || 'Aktif'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Input IWD Langsung */}
                          <button
                            type="button"
                            onClick={() => handleOpenInputIwd(item)}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Input data usaha ini ke Iuran Warga Digital (IWD)"
                          >
                            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Input IWD</span>
                          </button>

                          {/* Kontak WhatsApp jika no HP ada */}
                          {item.nomorHpCp && item.nomorHpCp !== '-' && (
                            <a
                              href={`https://wa.me/62${item.nomorHpCp.replace(/\D/g, '').replace(/^0/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                              title="Chat WhatsApp CP"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
                            title="Lihat Detail Usaha"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-teal-50 text-slate-600 hover:text-teal-800 transition-colors cursor-pointer"
                            title="Edit Data Usaha"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hapus Data Usaha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* Modal Form: Tambah / Edit Warga Ngontrak Usaha */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingItem ? 'Edit Data Warga Ngontrak Usaha' : 'Tambah Warga Ngontrak Usaha'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input data penanggung jawab (CP) dan identitas usaha kontrakan di RW 03
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveData} className="space-y-3.5">
              {/* 1. Nama Usaha (Wajib) */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Nama Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNamaUsaha}
                  onChange={e => setFormNamaUsaha(e.target.value)}
                  placeholder="Contoh: Warung Nasi Barokah, Laundry Express, dll"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* 2. Nama CP (Contact Person) (Wajib) */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Nama CP (Contact Person / Penanggung Jawab) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNamaCp}
                  onChange={e => setFormNamaCp(e.target.value)}
                  placeholder="Nama lengkap pemilik / pengelola usaha"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* 3. Kontak No HP / WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. HP / WhatsApp CP
                  </label>
                  <input
                    type="text"
                    value={formNomorHp}
                    onChange={e => setFormNomorHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Wilayah RT Usaha
                  </label>
                  <select
                    value={formRt}
                    onChange={e => setFormRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
              </div>

              {/* 4. Jenis Usaha & Status Sewa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jenis / Kategori Usaha
                  </label>
                  <select
                    value={formJenisUsaha}
                    onChange={e => setFormJenisUsaha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {KATEGORI_USAHA_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Sewa
                  </label>
                  <select
                    value={formStatusSewa}
                    onChange={e => setFormStatusSewa(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Menunggu Perpanjangan">Menunggu Perpanjangan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* 5. Alamat Lokasi Usaha */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alamat / Lokasi Kios / Ruko Usaha
                </label>
                <input
                  type="text"
                  value={formAlamatLokasi}
                  onChange={e => setFormAlamatLokasi(e.target.value)}
                  placeholder="Contoh: Jl. Babakan Sari I No. 12 (Kios Depan Pos RT 01)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* 6. Tanggal Mulai Kontrak & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Mulai Kontrak
                  </label>
                  <input
                    type="date"
                    value={formTanggalMulai}
                    onChange={e => setFormTanggalMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Catatan / Keterangan
                  </label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={e => setFormKeterangan(e.target.value)}
                    placeholder="Catatan tambahan (opsional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Data Warga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Usaha */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{detailItem.namaUsaha}</h3>
                  <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-medium">
                    {detailItem.jenisUsaha || 'Usaha / Perdagangan'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nama CP:</span>
                <span className="font-bold text-slate-900 text-xs">{detailItem.namaCp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nomor HP / WhatsApp:</span>
                <span className="font-mono font-semibold text-slate-800">{detailItem.nomorHpCp || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Wilayah:</span>
                <span className="font-semibold text-slate-800">RT {detailItem.rt} / RW 03</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status Sewa:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {detailItem.statusSewa || 'Aktif'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-0.5">Alamat Lokasi Usaha:</span>
                <span className="font-medium text-slate-800">{detailItem.alamatLokasi || '-'}</span>
              </div>
              {detailItem.keterangan && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-0.5">Catatan / Keterangan:</span>
                  <span className="text-slate-700 italic">{detailItem.keterangan}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const it = detailItem;
                  setDetailItem(null);
                  handleOpenInputIwd(it);
                }}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Input ke IWD</span>
              </button>
              {detailItem.nomorHpCp && detailItem.nomorHpCp !== '-' && (
                <a
                  href={`https://wa.me/62${detailItem.nomorHpCp.replace(/\D/g, '').replace(/^0/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp CP</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Iuran Warga Digital (IWD) untuk Usaha */}
      {iwdModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Input Iuran Warga Digital (IWD)
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Usaha: {iwdModalItem.namaUsaha}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIwdModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Box Usaha */}
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nama Usaha:</span>
                <span className="font-bold text-slate-900">{iwdModalItem.namaUsaha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nama CP:</span>
                <span className="font-semibold text-slate-800">{iwdModalItem.namaCp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Wilayah:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  RT {iwdModalItem.rt} / RW 03
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveIwd} className="space-y-3.5">
              {/* Jenis Iuran & Periode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Iuran:</label>
                  <select
                    value={iwdJenis}
                    onChange={e => setIwdJenis(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="IWD (Iuran Warga Digital)">IWD (Iuran Warga Digital)</option>
                    <option value="Sosial & Kematian">Sosial & Kematian</option>
                    <option value="Kebersihan">Kebersihan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periode Tagihan:</label>
                  <select
                    value={iwdPeriode}
                    onChange={e => setIwdPeriode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="September 2026">September 2026</option>
                    <option value="Oktober 2026">Oktober 2026</option>
                    <option value="November 2026">November 2026</option>
                    <option value="Desember 2026">Desember 2026</option>
                  </select>
                </div>
              </div>

              {/* Besaran Nominal */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 block">
                    Besaran Nominal IWD:
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Tarif Pelaku Usaha
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={iwdNominal}
                    onChange={e => {
                      const val = e.target.value;
                      setIwdNominal(val === '' ? '' : Math.max(0, Number(val)));
                    }}
                    step={1000}
                    min={0}
                    placeholder="Masukkan besaran nominal"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-emerald-300 bg-white text-base font-bold text-slate-900 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Status Pembayaran */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    iwdStatus === 'Belum Bayar' 
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="iwd_status"
                      checked={iwdStatus === 'Belum Bayar'}
                      onChange={() => setIwdStatus('Belum Bayar')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Belum Bayar</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    iwdStatus === 'Lunas' 
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="iwd_status"
                      checked={iwdStatus === 'Lunas'}
                      onChange={() => setIwdStatus('Lunas')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Lunas</span>
                  </label>
                </div>
              </div>

              {/* Tanggal & Metode if Lunas */}
              {iwdStatus === 'Lunas' && (
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal Bayar:</label>
                    <input
                      type="date"
                      value={iwdTanggalBayar}
                      onChange={e => setIwdTanggalBayar(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Metode Bayar:</label>
                    <select
                      value={iwdMetodeBayar}
                      onChange={e => setIwdMetodeBayar(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="Tunai ke Petugas RT">Tunai ke Petugas RT</option>
                      <option value="Transfer Bank">Transfer Bank</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const it = iwdModalItem;
                    setIwdModalItem(null);
                    sessionStorage.setItem('rw03_input_iwd_usaha', JSON.stringify(it));
                    onNavigateTab('iuran');
                  }}
                  className="text-teal-700 hover:text-teal-900 text-[11px] font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer order-2 sm:order-1"
                >
                  <span>Buka Form di Modul Iuran →</span>
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => setIwdModalItem(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Simpan ke IWD</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus - Khusus Super Admin */}
      {canDelete && deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-sm">Hapus Data Usaha?</h4>
              <p className="text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data usaha <strong>{deleteConfirmItem.namaUsaha}</strong> (CP: {deleteConfirmItem.namaCp}) dari daftar?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
