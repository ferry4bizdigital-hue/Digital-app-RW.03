import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  X, 
  RotateCcw, 
  MapPin, 
  Calendar,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, User } from '../../types';
import { StorageService } from '../../services/storageService';

interface ModulInventarisProps {
  currentUser: User;
}

export const ModulInventaris: React.FC<ModulInventarisProps> = ({ currentUser }) => {
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [borrowModalItem, setBorrowModalItem] = useState<InventoryItem | null>(null);

  // Form states for Add
  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState<InventoryItem['kategori']>('Tenda & Kursi');
  const [jumlahTotal, setJumlahTotal] = useState<number>(10);
  const [kondisi, setKondisi] = useState<InventoryItem['kondisi']>('Baik');
  const [lokasi, setLokasi] = useState('Gudang Sekretariat RW 03');
  const [tahunPerolehan, setTahunPerolehan] = useState<number>(2025);
  const [estimasiNilai, setEstimasiNilai] = useState<number>(1500000);

  // Edit & Delete states for Super Admin
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [editNamaBarang, setEditNamaBarang] = useState('');
  const [editKategori, setEditKategori] = useState<InventoryItem['kategori']>('Tenda & Kursi');
  const [editJumlahTotal, setEditJumlahTotal] = useState<number>(10);
  const [editKondisi, setEditKondisi] = useState<InventoryItem['kondisi']>('Baik');
  const [editLokasi, setEditLokasi] = useState('');
  const [editTahunPerolehan, setEditTahunPerolehan] = useState<number>(2025);
  const [editStatus, setEditStatus] = useState<InventoryItem['status']>('Tersedia');
  const [editError, setEditError] = useState('');

  // Borrow state
  const [borrowerName, setBorrowerName] = useState(currentUser.nama);
  const [borrowerRt, setBorrowerRt] = useState(currentUser.RT || '02');
  const [borrowPurpose, setBorrowPurpose] = useState('');
  const [returnDate, setReturnDate] = useState('2026-09-30');

  const inventory = StorageService.getInventory();

  const isPrivileged = currentUser.role !== 'warga';
  // Hapus akses RT untuk Tambah Aset Inventaris (Ketua RW, Bendahara & Super Admin)
  const canAddInventory = currentUser.role === 'super_admin' || currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara';
  // Akses Edit dan Hapus Aset Inventaris diberikan untuk Super Admin
  const canEditDelete = currentUser.role === 'super_admin';

  const filtered = inventory.filter(i => {
    if (selectedKategori !== 'all' && i.kategori !== selectedKategori) return false;
    if (selectedStatus !== 'all' && i.status !== selectedStatus) return false;
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddInventory) return;
    if (!namaBarang.trim()) return;

    StorageService.addInventoryItem({
      namaBarang: namaBarang.trim(),
      kategori,
      jumlahTotal,
      jumlahTersedia: jumlahTotal,
      kondisi,
      lokasi,
      tahunPerolehan,
      estimasiNilai,
      status: 'Tersedia'
    });

    setIsAddOpen(false);
    setNamaBarang('');
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditNamaBarang(item.namaBarang);
    setEditKategori(item.kategori);
    setEditJumlahTotal(item.jumlahTotal);
    setEditKondisi(item.kondisi);
    setEditLokasi(item.lokasi);
    setEditTahunPerolehan(item.tahunPerolehan);
    setEditStatus(item.status);
    setEditError('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDelete || !editingItem) return;
    if (!editNamaBarang.trim()) {
      setEditError('Nama barang wajib diisi');
      return;
    }
    if (editJumlahTotal <= 0) {
      setEditError('Jumlah unit harus lebih dari 0');
      return;
    }

    const diff = editJumlahTotal - editingItem.jumlahTotal;
    const newTersedia = Math.max(0, editingItem.jumlahTersedia + diff);

    StorageService.updateInventoryItem(editingItem.id, {
      namaBarang: editNamaBarang.trim(),
      kategori: editKategori,
      jumlahTotal: editJumlahTotal,
      jumlahTersedia: newTersedia,
      kondisi: editKondisi,
      lokasi: editLokasi.trim(),
      tahunPerolehan: editTahunPerolehan,
      status: editStatus
    });

    setEditingItem(null);
  };

  const handleDelete = () => {
    if (!canEditDelete || !deletingItem) return;
    StorageService.deleteInventoryItem(deletingItem.id);
    setDeletingItem(null);
  };

  const handleConfirmBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowModalItem || !borrowPurpose.trim()) return;

    StorageService.borrowInventory(
      borrowModalItem.id,
      borrowerName,
      borrowerRt,
      borrowPurpose.trim(),
      returnDate
    );

    setBorrowModalItem(null);
    setBorrowPurpose('');
  };

  const handleReturn = (id: string) => {
    StorageService.returnInventory(id);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-700" />
            Pengelolaan Aset & Inventaris RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar fasilitas bersama: tenda lipat, kursi, sound system, alat kebersihan, dan pompa banjir
          </p>
        </div>

        {canAddInventory && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Inventaris</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <select
          value={selectedKategori}
          onChange={e => setSelectedKategori(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
        >
          <option value="all">Semua Kategori Inventaris</option>
          <option value="Tenda & Kursi">Tenda & Kursi</option>
          <option value="Elektronik & Sound">Elektronik & Sound</option>
          <option value="Kebersihan">Kebersihan</option>
          <option value="Keamanan">Keamanan</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
        >
          <option value="all">Semua Status Ketersediaan</option>
          <option value="Tersedia">Tersedia untuk Dipinjam</option>
          <option value="Sedang Dipinjam">Sedang Dipinjam Warga</option>
        </select>
      </div>

      {/* Inventory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {item.kategori}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.status === 'Tersedia' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {item.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-1">{item.namaBarang}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.lokasi}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Ketersediaan</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {item.jumlahTersedia} / {item.jumlahTotal} Unit
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Kondisi Fisik</span>
                  <span className="font-semibold text-emerald-700">{item.kondisi}</span>
                </div>
              </div>

              {item.peminjamSaatIni && (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-[11px] text-amber-900 space-y-0.5">
                  <span className="font-semibold block">Dipinjam: {item.peminjamSaatIni.nama} (RT {item.peminjamSaatIni.rt})</span>
                  <span className="block text-slate-600">Keperluan: {item.peminjamSaatIni.keperluan}</span>
                  <span className="block text-slate-500 font-mono text-[10px]">Rencana Kembali: {item.peminjamSaatIni.rencanaKembali}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Pengadaan Th {item.tahunPerolehan}</span>

              <div className="flex items-center gap-1.5">
                {canEditDelete && (
                  <div className="flex items-center gap-1 mr-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Edit Aset Inventaris"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Aset Inventaris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {item.jumlahTersedia > 0 && (
                  <button
                    onClick={() => setBorrowModalItem(item)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Ajukan Pinjam
                  </button>
                )}

                {item.peminjamSaatIni && isPrivileged && (
                  <button
                    onClick={() => handleReturn(item.id)}
                    className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Catat Pengembalian Barang"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Borrow Modal */}
      {borrowModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Form Peminjaman Inventaris</h3>
              <button onClick={() => setBorrowModalItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBorrow} className="p-6 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 block">Barang Dipinjam:</span>
                <span className="font-bold text-slate-900 text-sm">{borrowModalItem.namaBarang}</span>
                <span className="text-[11px] text-slate-500 block">Tersedia: {borrowModalItem.jumlahTersedia} unit</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Peminjam *</label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={e => setBorrowerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wilayah RT</label>
                  <select
                    value={borrowerRt}
                    onChange={e => setBorrowerRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rencana Kembali</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keperluan Penggunaan *</label>
                <textarea
                  rows={2}
                  value={borrowPurpose}
                  onChange={e => setBorrowPurpose(e.target.value)}
                  placeholder="Contoh: Acara pengajian bulanan keluarga di rumah..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowModalItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  Konfirmasi Peminjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Item Modal */}
      {isAddOpen && canAddInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Registrasi Aset Inventaris Baru</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Barang / Fasilitas *</label>
                <input
                  type="text"
                  value={namaBarang}
                  onChange={e => setNamaBarang(e.target.value)}
                  placeholder="Contoh: Tenda Gazebo 3x4m, Pompa Air 2 Inch"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={e => setKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Tenda & Kursi">Tenda & Kursi</option>
                    <option value="Elektronik & Sound">Elektronik & Sound</option>
                    <option value="Kebersihan">Kebersihan</option>
                    <option value="Keamanan">Keamanan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Unit</label>
                  <input
                    type="number"
                    min="1"
                    value={jumlahTotal}
                    onChange={e => setJumlahTotal(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lokasi Penyimpanan</label>
                <input
                  type="text"
                  value={lokasi}
                  onChange={e => setLokasi(e.target.value)}
                  placeholder="Contoh: Gudang Balai RW 03"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inventory Item Modal (Super Admin) */}
      {editingItem && canEditDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Edit Data Aset Inventaris</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-3.5 text-xs">
              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Barang / Fasilitas *</label>
                <input
                  type="text"
                  value={editNamaBarang}
                  onChange={e => setEditNamaBarang(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={editKategori}
                    onChange={e => setEditKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Tenda & Kursi">Tenda & Kursi</option>
                    <option value="Elektronik & Sound">Elektronik & Sound</option>
                    <option value="Kebersihan">Kebersihan</option>
                    <option value="Peralatan Masak">Peralatan Masak</option>
                    <option value="Keamanan">Keamanan</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Total Unit</label>
                  <input
                    type="number"
                    min="1"
                    value={editJumlahTotal}
                    onChange={e => setEditJumlahTotal(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi Fisik</label>
                  <select
                    value={editKondisi}
                    onChange={e => setEditKondisi(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Ketersediaan</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Sedang Dipinjam">Sedang Dipinjam</option>
                    <option value="Dalam Perbaikan">Dalam Perbaikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Penyimpanan</label>
                  <input
                    type="text"
                    value={editLokasi}
                    onChange={e => setEditLokasi(e.target.value)}
                    placeholder="Contoh: Gudang RW 03"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tahun Perolehan</label>
                  <input
                    type="number"
                    value={editTahunPerolehan}
                    onChange={e => setEditTahunPerolehan(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Super Admin) */}
      {deletingItem && canEditDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus Aset Inventaris?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Yakin ingin menghapus aset <strong>{deletingItem.namaBarang}</strong> ({deletingItem.jumlahTotal} unit)? Data fasilitas ini akan dihapus dari daftar inventaris RW 03.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                Hapus Aset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
