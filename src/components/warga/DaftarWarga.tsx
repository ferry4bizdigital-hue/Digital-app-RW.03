import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Resident, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { FormWargaModal } from './FormWargaModal';
import { DetailWargaModal } from './DetailWargaModal';

interface DaftarWargaProps {
  currentUser: User;
}

export const DaftarWarga: React.FC<DaftarWargaProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRt, setSelectedRt] = useState<string>(
    currentUser.role === 'pengurus_rt' ? currentUser.RT : 'all'
  );
  const [selectedGender, setSelectedGender] = useState<'all' | 'L' | 'P'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | undefined>(undefined);
  const [detailResident, setDetailResident] = useState<Resident | null>(null);
  const [highlightedResidentId, setHighlightedResidentId] = useState<string | null>(null);

  // State untuk modal konfirmasi hapus data warga (Role RT, RW & Super Admin)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);

  // Toast Notifikasi
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // State daftar warga dengan langganan StorageService real-time
  const [residents, setResidents] = useState<Resident[]>(() => StorageService.getResidents());

  React.useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setResidents(StorageService.getResidents());
    });
    return unsubscribe;
  }, []);

  // Periksa apakah navigasi dari dashboard meminta membuka Form Tambah Warga Baru otomatis
  React.useEffect(() => {
    const shouldOpen = sessionStorage.getItem('rw03_open_tambah_warga');
    if (shouldOpen === 'true') {
      sessionStorage.removeItem('rw03_open_tambah_warga');
      setEditingResident(undefined);
      setIsFormOpen(true);
    }
  }, []);

  // Pastikan filter RT selalu sinkron dengan wilayah akun pengurus RT
  React.useEffect(() => {
    if (currentUser.role === 'pengurus_rt') {
      setSelectedRt(StorageService.normalizeRt(currentUser.RT));
    }
  }, [currentUser.role, currentUser.RT]);

  // Role permissions:
  // Role Super Admin: Full akses (Tambah, Edit, Hapus data warga se-RW 03)
  // Role Ketua RW & Bendahara: Tambah, Edit data warga se-RW 03 (Tidak diberikan akses untuk menghapus)
  // Role RT (RT 01 s/d RT 05): Tambah, Edit untuk wilayah RT masing-masing (Tidak diberikan akses untuk menghapus)
  // Role Warga: Hanya melihat anggota keluarga sendiri
  const isPengurus = currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara' || currentUser.role === 'super_admin' || currentUser.role === 'pengurus_rt';
  const canAdd = currentUser.role === 'super_admin' || currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara' || currentUser.role === 'pengurus_rt';
  const canDeleteResident = currentUser.role === 'super_admin';
  const { family: myFamily } = StorageService.getFamilyForUser(currentUser);

  // Filtered and sorted (A - Z) list
  const filteredResidents = useMemo(() => {
    const userRtNormalized = currentUser.RT ? StorageService.normalizeRt(currentUser.RT) : '';

    const list = residents.filter(r => {
      const resRtNormalized = StorageService.normalizeRt(r.rt);

      // If citizen (warga), strictly lock to own family members only!
      if (currentUser.role === 'warga') {
        return r.nomorKK === myFamily.nomorKK;
      }

      // If pengurus RT (RT 01, RT 02, RT 03, RT 04, RT 05), strictly lock to their RT
      if (currentUser.role === 'pengurus_rt') {
        if (resRtNormalized !== userRtNormalized) return false;
      } else {
        // Filter RT for Super Admin & Ketua RW
        if (selectedRt !== 'all' && resRtNormalized !== StorageService.normalizeRt(selectedRt)) return false;
      }

      // Filter Gender
      if (selectedGender !== 'all' && r.jenisKelamin !== selectedGender) return false;

      // Filter Status
      if (selectedStatus !== 'all' && r.statusWarga !== selectedStatus) return false;

      // Filter Age Group
      if (selectedAgeGroup === 'balita' && r.usia > 5) return false;
      if (selectedAgeGroup === 'anak' && (r.usia < 6 || r.usia > 17)) return false;
      if (selectedAgeGroup === 'dewasa' && (r.usia < 18 || r.usia > 59)) return false;
      if (selectedAgeGroup === 'lansia' && r.usia < 60) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.namaLengkap.toLowerCase().includes(q);
        const matchNik = r.NIK.includes(q);
        const matchKk = r.nomorKK.includes(q);
        const matchPekerjaan = (r.pekerjaan || '').toLowerCase().includes(q);
        const matchAlamat = r.alamat.toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchKk && !matchPekerjaan && !matchAlamat) {
          return false;
        }
      }

      return true;
    });

    // Data warga yang sudah diinput, disusun terurut alfabet (A - Z)
    return list.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, 'id', { sensitivity: 'base' }));
  }, [residents, searchQuery, selectedRt, selectedGender, selectedStatus, selectedAgeGroup, currentUser]);

  const handleSaveResident = (data: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => {
    if (currentUser.role === 'warga') return;

    let targetId: string | null = null;
    const targetEditId = editId || editingResident?.id;
    const effectiveRt = currentUser.role === 'pengurus_rt' 
      ? StorageService.normalizeRt(currentUser.RT) 
      : StorageService.normalizeRt(data.rt || '02');
    
    data.rt = effectiveRt;

    if (targetEditId) {
      StorageService.updateResident(targetEditId, data);
      targetId = targetEditId;
      setToastMessage(`Data warga an. ${data.namaLengkap} berhasil diperbarui!`);
      StorageService.pushToServer(true).catch(() => {});
    } else {
      const created = StorageService.addResident(data);
      targetId = created.id;
      setToastMessage(`Data warga baru an. ${data.namaLengkap} berhasil disimpan dan langsung tercatat pada Daftar Warga Terdata (A - Z)!`);
      StorageService.pushToServer(true).catch(() => {});
    }

    // Ambil data mutakhir langsung dari storage
    const latestResidents = StorageService.getResidents();
    setResidents(latestResidents);
    setEditingResident(undefined);
    setIsFormOpen(false);

    // Reset filter pencarian dan kategori agar warga baru yang diinput langsung terlihat pada tabel A-Z
    setSearchQuery('');
    setSelectedGender('all');
    setSelectedStatus('all');
    setSelectedAgeGroup('all');
    if (currentUser.role === 'pengurus_rt') {
      setSelectedRt(effectiveRt);
    }

    // Berikan penanda visual pada warga yang baru diinput dan scroll ke baris warga
    if (targetId) {
      setHighlightedResidentId(targetId);
      setTimeout(() => {
        const el = document.getElementById(`resident-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      setTimeout(() => setHighlightedResidentId(null), 5000);
    }

    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  // Buka Modal Konfirmasi Hapus Data Warga - Khusus Role Super Admin
  const handleOpenDelete = (resident: Resident) => {
    if (currentUser.role !== 'super_admin') return;

    setResidentToDelete(resident);
    setIsDeleteModalOpen(true);
  };

  // Konfirmasi Eksekusi Hapus Warga - Khusus Role Super Admin
  const handleConfirmDelete = () => {
    if (!residentToDelete) return;
    if (currentUser.role !== 'super_admin') return;

    const name = residentToDelete.namaLengkap;
    const deletedId = residentToDelete.id;
    const success = StorageService.deleteResident(deletedId);

    if (success) {
      setResidents(StorageService.getResidents());
      setIsDeleteModalOpen(false);
      setResidentToDelete(null);

      setToastMessage(`Data warga an. ${name} berhasil dihapus dari sistem!`);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['NIK (Masked)', 'Nomor KK', 'Nama Lengkap', 'Jenis Kelamin', 'Usia', 'RT', 'RW', 'Alamat', 'Pekerjaan', 'Status Warga'];
    const rows = filteredResidents.map(r => [
      StorageService.maskNik(r.NIK, currentUser.role === 'super_admin'),
      StorageService.maskNik(r.nomorKK, currentUser.role === 'super_admin'),
      `"${r.namaLengkap}"`,
      r.jenisKelamin,
      r.usia,
      r.rt,
      r.rw,
      `"${r.alamat}"`,
      `"${r.pekerjaan}"`,
      r.statusWarga
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `data_warga_rw03_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Users className="w-3 h-3" />
              {currentUser.role === 'pengurus_rt' ? `Wilayah RT ${currentUser.RT}` : 'Kependudukan Digital'}
            </span>
            <span className="text-[11px] text-slate-400">· RW 03 Kebon Kangkung</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            {currentUser.role === 'warga' 
              ? `Data Anggota Keluarga Anda (${myFamily.namaKepalaKeluarga})`
              : currentUser.role === 'pengurus_rt'
              ? `Pengelolaan Data Warga RT ${currentUser.RT} / RW 03 Kebon Kangkung`
              : 'Pengelolaan Data Warga RW 03 Kebon Kangkung'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'warga'
              ? `Menampilkan ${filteredResidents.length} anggota keluarga terdaftar dalam No. KK ${myFamily.nomorKK}`
              : currentUser.role === 'pengurus_rt'
              ? `Menampilkan ${filteredResidents.length} warga terdata di RT ${currentUser.RT} (Urutan A - Z)`
              : `Menampilkan ${filteredResidents.length} dari ${residents.length} total warga terdaftar (Urutan A - Z)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPengurus && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export CSV Data Warga"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {canAdd && (
            <button
              onClick={() => {
                setEditingResident(undefined);
                setIsFormOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{currentUser.role === 'pengurus_rt' ? `Tambah Warga RT ${currentUser.RT}` : 'Tambah Warga'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama lengkap, NIK, No. KK, pekerjaan, atau alamat..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns (Hanya untuk Pengurus RW, RT, Super Admin) */}
        {currentUser.role !== 'warga' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
            {/* Filter RT */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Wilayah RT
              </label>
              <select
                value={selectedRt}
                disabled={currentUser.role === 'pengurus_rt'}
                onChange={e => setSelectedRt(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
              >
                {currentUser.role !== 'pengurus_rt' && <option value="all">Semua RT (01 - 05)</option>}
                <option value="01">RT 01</option>
                <option value="02">RT 02</option>
                <option value="03">RT 03</option>
                <option value="04">RT 04</option>
                <option value="05">RT 05</option>
              </select>
            </div>

            {/* Filter Jenis Kelamin */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Jenis Kelamin
              </label>
              <select
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">Semua JK</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            {/* Filter Status Warga */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Status Warga
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">Semua Status</option>
                <option value="Tetap">Tetap</option>
                <option value="Kontrak/Kos">Kontrak/Kos</option>
                <option value="Pindah">Pindah</option>
                <option value="Meninggal">Meninggal</option>
              </select>
            </div>

            {/* Filter Rentang Usia */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Kelompok Usia
              </label>
              <select
                value={selectedAgeGroup}
                onChange={e => setSelectedAgeGroup(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">Semua Usia</option>
                <option value="balita">Balita (0 - 5 Thn)</option>
                <option value="anak">Anak/Remaja (6 - 17 Thn)</option>
                <option value="dewasa">Dewasa (18 - 59 Thn)</option>
                <option value="lansia">Lansia (60+ Thn)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Daftar Warga Terdata (A - Z){currentUser.role === 'pengurus_rt' ? ` · RT ${currentUser.RT}` : ''}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredResidents.length} Jiwa Warga
          </span>
        </div>

        {filteredResidents.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada data warga yang cocok.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Coba sesuaikan kata kunci pencarian atau ubah filter.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (block md:hidden) - Tampilan utuh tanpa terpotong di layar ponsel */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredResidents.map(res => {
                const maskedNik = StorageService.maskNik(res.NIK, false);
                const isHighlighted = highlightedResidentId === res.id;
                const canEdit = 
                  currentUser.role === 'super_admin' || 
                  currentUser.role === 'ketua_rw' ||
                  currentUser.role === 'bendahara' ||
                  (currentUser.role === 'pengurus_rt' && StorageService.normalizeRt(currentUser.RT) === StorageService.normalizeRt(res.rt));

                const canDelete = currentUser.role === 'super_admin';

                return (
                  <div 
                    key={res.id} 
                    id={`resident-card-${res.id}`}
                    className={`p-3.5 space-y-2 transition-colors ${
                      isHighlighted ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{res.namaLengkap}</span>
                          {isHighlighted && (
                            <span className="text-[9px] font-bold uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              ✓ Baru
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          NIK: {maskedNik}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        res.statusWarga === 'Tetap' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : res.statusWarga === 'Kontrak/Kos'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {res.statusWarga}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Wilayah:</span>
                        <span className="font-semibold text-slate-800">RT {res.rt} / RW 03</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">JK / Usia:</span>
                        <span>{res.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · {res.usia} thn</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[9px]">Pekerjaan:</span>
                        <span className="truncate block">{res.pekerjaan || '-'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{res.alamat}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setDetailResident(res)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail</span>
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingResident(res);
                              setIsFormOpen(true);
                            }}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-700 cursor-pointer"
                            title="Ubah"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleOpenDelete(res)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 cursor-pointer"
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
                  <th className="py-3 px-4 min-w-[200px]">Nama Lengkap (A - Z) & NIK</th>
                  <th className="py-3 px-4 min-w-[130px]">Wilayah</th>
                  <th className="py-3 px-4 min-w-[110px]">JK / Usia</th>
                  <th className="py-3 px-4 min-w-[140px]">Pekerjaan</th>
                  <th className="py-3 px-4 min-w-[120px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[130px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidents.map(res => {
                  const maskedNik = StorageService.maskNik(res.NIK, false);
                  const isHighlighted = highlightedResidentId === res.id;
                  // Hak edit: Super Admin, Ketua RW, Bendahara, Pengurus RT
                  // Hak hapus: KHUSUS Super Admin (Role RW, Bendahara, RT 01 - RT 05 tidak diberikan akses hapus)
                  const canEdit = 
                    currentUser.role === 'super_admin' || 
                    currentUser.role === 'ketua_rw' ||
                    currentUser.role === 'bendahara' ||
                    (currentUser.role === 'pengurus_rt' && StorageService.normalizeRt(currentUser.RT) === StorageService.normalizeRt(res.rt));

                  const canDelete = currentUser.role === 'super_admin';

                  return (
                    <tr 
                      key={res.id} 
                      id={`resident-row-${res.id}`}
                      className={`transition-colors ${
                        isHighlighted 
                          ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600' 
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{res.namaLengkap}</span>
                          {isHighlighted && (
                            <span className="text-[9px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded shadow-2xs animate-pulse">
                              ✓ Langsung Tercatat (A - Z)
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tracking-wider">
                          {maskedNik}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">RT {res.rt} / RW 03</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                          {res.alamat}
                        </span>
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <span className="font-medium text-slate-800">
                          {res.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {res.usia} Tahun
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800">{res.pekerjaan || '-'}</span>
                        <span className="text-[10px] text-slate-400 block">{res.hubunganKeluarga}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          res.statusWarga === 'Tetap' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          res.statusWarga === 'Kontrak/Kos' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          res.statusWarga === 'Pindah' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 
                          res.statusWarga === 'Meninggal' ? 'bg-slate-100 text-slate-800 font-bold border border-slate-300' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {res.statusWarga}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{res.statusDomisili}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Lihat Detail */}
                          <button
                            onClick={() => setDetailResident(res)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer shadow-2xs"
                            title="Lihat Detail Biodata"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Ubah (Role RT, RW, Bendahara, Super Admin) & Hapus (Khusus Super Admin) */}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingResident(res);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              title="Ubah Data Warga"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleOpenDelete(res)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title="Hapus Data Warga"
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

      {/* Form Modal (Tambah / Ubah Data Warga) */}
      <FormWargaModal
        key={editingResident ? `edit-${editingResident.id}` : `new-warga-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        currentUser={currentUser}
        onClose={() => {
          setIsFormOpen(false);
          setEditingResident(undefined);
        }}
        onSave={handleSaveResident}
        initialData={editingResident}
        defaultRt={currentUser.RT}
      />

      {/* Detail Modal */}
      <DetailWargaModal
        resident={detailResident}
        currentUser={currentUser}
        isOpen={!!detailResident}
        onClose={() => setDetailResident(null)}
        onEdit={res => {
          setDetailResident(null);
          setEditingResident(res);
          setIsFormOpen(true);
        }}
        onDelete={res => {
          setDetailResident(null);
          handleOpenDelete(res);
        }}
      />

      {/* Modal Dialog Konfirmasi Hapus Data Warga - KHUSUS ROLE SUPER ADMIN */}
      {isDeleteModalOpen && residentToDelete && currentUser.role === 'super_admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Hapus Data Warga?
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menghapus data warga ini dari Pengelolaan Data Warga RW 03 Kebon Kangkung? Tindakan ini akan dicatat dalam Audit Log Sistem.
              </p>

              {/* Preview Warga yang akan dihapus */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 mb-4">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500">Nama Lengkap:</span>
                  <span className="font-bold text-slate-900 text-right">{residentToDelete.namaLengkap}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">NIK:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {StorageService.maskNik(residentToDelete.NIK, false)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">No. KK:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {StorageService.maskNik(residentToDelete.nomorKK, false)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Wilayah:</span>
                  <span className="font-semibold text-emerald-800">
                    RT {residentToDelete.rt} / RW {residentToDelete.rw}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500">Status Warga:</span>
                  <span className="font-semibold text-slate-800">
                    {residentToDelete.statusWarga} ({residentToDelete.hubunganKeluarga})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setResidentToDelete(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Warga</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
