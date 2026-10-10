import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Plus, 
  Users, 
  Eye, 
  X, 
  MapPin, 
  UserCheck, 
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { FamilyCard, Resident, User } from '../../types';
import { StorageService } from '../../services/storageService';

interface DaftarKkProps {
  currentUser: User;
}

export const DaftarKk: React.FC<DaftarKkProps> = ({ currentUser }) => {
  const [families, setFamilies] = useState<FamilyCard[]>(() => StorageService.getFamilies());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRt, setSelectedRt] = useState<string>(
    currentUser.role === 'pengurus_rt' ? currentUser.RT : 'all'
  );
  const [selectedFamily, setSelectedFamily] = useState<FamilyCard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Delete modal state (Khusus Super Admin)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState<FamilyCard | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Form states
  const [formNomorKk, setFormNomorKk] = useState('');
  const [formKepala, setFormKepala] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formRt, setFormRt] = useState(currentUser.RT || '02');
  const [formNomorRumah, setFormNomorRumah] = useState('');
  const [formStatusRumah, setFormStatusRumah] = useState<FamilyCard['statusRumah']>('Milik Sendiri');
  const [errorMsg, setErrorMsg] = useState('');

  // Subscribe to Storage changes
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setFamilies(StorageService.getFamilies());
    });
    return unsubscribe;
  }, []);

  const isPrivileged = currentUser.role !== 'warga';
  const { family: myFamily } = StorageService.getFamilyForUser(currentUser);

  const filteredFamilies = families.filter(f => {
    // If citizen (warga), strictly only can access their own family card!
    if (currentUser.role === 'warga') {
      return f.nomorKK === myFamily.nomorKK;
    }
    if (currentUser.role === 'pengurus_rt' && f.rt !== currentUser.RT) return false;
    if (selectedRt !== 'all' && f.rt !== selectedRt) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKk = f.nomorKK.includes(q);
      const matchName = f.namaKepalaKeluarga.toLowerCase().includes(q);
      const matchAlamat = f.alamat.toLowerCase().includes(q);
      if (!matchKk && !matchName && !matchAlamat) return false;
    }
    return true;
  });

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomorKk || formNomorKk.length < 16) {
      setErrorMsg('Nomor KK harus 16 digit angka.');
      return;
    }
    if (!formKepala.trim()) {
      setErrorMsg('Nama kepala keluarga wajib diisi.');
      return;
    }

    StorageService.addFamily({
      nomorKK: formNomorKk,
      namaKepalaKeluarga: formKepala.trim(),
      alamat: formAlamat.trim() || `Jl. Kebon Kangkung II No. ${formNomorRumah || '01'}`,
      rt: formRt,
      rw: '03',
      nomorRumah: formNomorRumah || '01',
      statusRumah: formStatusRumah
    });

    setIsAddOpen(false);
    setFormNomorKk('');
    setFormKepala('');
    setErrorMsg('');
  };

  const handleOpenDelete = (fam: FamilyCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentUser.role !== 'super_admin') return;
    setFamilyToDelete(fam);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!familyToDelete || currentUser.role !== 'super_admin') return;
    const kkNum = familyToDelete.nomorKK;
    const name = familyToDelete.namaKepalaKeluarga;
    const success = StorageService.deleteFamily(kkNum);
    if (success) {
      setFamilies(StorageService.getFamilies());
      if (selectedFamily?.nomorKK === kkNum) {
        setSelectedFamily(null);
      }
      setIsDeleteModalOpen(false);
      setFamilyToDelete(null);
      setToastMessage(`Data Kartu Keluarga an. ${name} (No. KK: ${kkNum}) berhasil dihapus dari sistem!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }
  };

  const familyMembers = selectedFamily 
    ? StorageService.getFamilyMembers(selectedFamily.nomorKK) 
    : [];

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-emerald-700 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-700" />
            {currentUser.role === 'warga' 
              ? `Data Kartu Keluarga Anda (Keluarga ${myFamily.namaKepalaKeluarga})` 
              : 'Data Kartu Keluarga (KK) RW 03 Kebon Kangkung'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'warga' 
              ? 'Hanya Anda dan keluarga bersangkutan yang memiliki hak akses terhadap data ini' 
              : 'Daftar kepala keluarga dan hubungan anggota keluarga terdaftar'}
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kartu Keluarga</span>
          </button>
        )}
      </div>

      {/* Search & RT Filter for Pengurus, or Privacy Notice for Warga */}
      {currentUser.role === 'warga' ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
              Akses Terbatas
            </span>
            <span>Data keluarga terproteksi. Warga hanya dapat mengakses data keluarga yang bersangkutan.</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 hidden sm:inline">RT {myFamily.rt} / RW {myFamily.rw}</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari No. KK, nama kepala keluarga, atau alamat..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
            />
          </div>

          {currentUser.role !== 'pengurus_rt' && (
            <select
              value={selectedRt}
              onChange={e => setSelectedRt(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">Semua RT (01 - 05)</option>
              <option value="01">RT 01</option>
              <option value="02">RT 02</option>
              <option value="03">RT 03</option>
              <option value="04">RT 04</option>
              <option value="05">RT 05</option>
            </select>
          )}
        </div>
      )}

      {/* Grid of Family Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFamilies.map(fam => {
          const members = StorageService.getFamilyMembers(fam.nomorKK);
          const maskedKk = StorageService.maskNik(fam.nomorKK, false);

          return (
            <div
              key={fam.nomorKK}
              onClick={() => setSelectedFamily(fam)}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-100 transition-colors">
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      RT {fam.rt} / RW {fam.rw}
                    </span>
                  </div>

                  {currentUser.role === 'super_admin' && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenDelete(fam, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Kartu Keluarga (Khusus Super Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                  {fam.namaKepalaKeluarga}
                </h3>
                <span className="font-mono text-xs text-slate-500 block mt-0.5 tracking-wider">
                  No. KK: {maskedKk}
                </span>
                <p className="text-xs text-slate-600 mt-2 line-clamp-1">
                  {fam.alamat}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <strong className="text-slate-800 tabular-nums">{members.length || fam.jumlahAnggota}</strong> Jiwa
                </span>
                <span className="text-[11px] text-slate-400">{fam.statusRumah}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Family Modal with linked Members list */}
      {selectedFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Keluarga {selectedFamily.namaKepalaKeluarga}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    No. KK: {selectedFamily.nomorKK}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedFamily(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Wilayah</span>
                  <span className="font-semibold text-slate-800">RT {selectedFamily.rt} / RW {selectedFamily.rw}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">No. Rumah</span>
                  <span className="font-semibold text-slate-800">No. {selectedFamily.nomorRumah}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Status Hunian</span>
                  <span className="font-semibold text-slate-800">{selectedFamily.statusRumah}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Total Anggota</span>
                  <span className="font-semibold text-slate-800">{familyMembers.length} Jiwa</span>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Daftar Anggota Keluarga Terdaftar:</span>
                  <span className="text-emerald-700 font-semibold">{familyMembers.length} Orang</span>
                </h4>

                {familyMembers.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center italic">
                    Belum ada anggota keluarga individual yang ditautkan ke KK ini.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {familyMembers.map((m, idx) => (
                      <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{m.namaLengkap}</div>
                            <div className="font-mono text-[10px] text-slate-500">
                              NIK: {StorageService.maskNik(m.NIK, false)} · {m.jenisKelamin === 'L' ? 'L' : 'P'} · {m.usia} thn
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                            {m.hubunganKeluarga}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {m.pekerjaan || m.pendidikan}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div>
                {currentUser.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(selectedFamily)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus KK</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedFamily(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add KK Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Kartu Keluarga Baru</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFamily} className="p-6 space-y-3 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Kartu Keluarga (16 Digit) *</label>
                <input
                  type="text"
                  maxLength={16}
                  value={formNomorKk}
                  onChange={e => setFormNomorKk(e.target.value.replace(/\D/g, ''))}
                  placeholder="327318..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kepala Keluarga *</label>
                <input
                  type="text"
                  value={formKepala}
                  onChange={e => setFormKepala(e.target.value)}
                  placeholder="Nama Lengkap Kepala Keluarga"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wilayah RT</label>
                  <select
                    value={formRt}
                    onChange={e => setFormRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Rumah</label>
                  <input
                    type="text"
                    value={formNomorRumah}
                    onChange={e => setFormNomorRumah(e.target.value)}
                    placeholder="Contoh: 18B"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Kepemilikan Rumah</label>
                <select
                  value={formStatusRumah}
                  onChange={e => setFormStatusRumah(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="Milik Sendiri">Milik Sendiri</option>
                  <option value="Sewa / Kontrak">Sewa / Kontrak</option>
                  <option value="Rumah Dinas">Rumah Dinas</option>
                  <option value="Menumpang">Menumpang</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  value={formAlamat}
                  onChange={e => setFormAlamat(e.target.value)}
                  placeholder="Jl. Kebon Kangkung..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan KK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete KK Confirmation Modal (Khusus Super Admin) */}
      {isDeleteModalOpen && familyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 text-xs animate-in zoom-in-95">
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">
                Aksi Khusus Super Admin
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1">Hapus Kartu Keluarga (KK)?</h4>
              <p className="text-slate-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus data Kartu Keluarga ini? Tindakan ini akan dicatat ke dalam Audit Trail Sistem.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">No. KK:</span>
                <span className="font-mono font-bold text-slate-800">{familyToDelete.nomorKK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kepala Keluarga:</span>
                <span className="font-semibold text-slate-800">{familyToDelete.namaKepalaKeluarga}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wilayah:</span>
                <span className="font-medium text-slate-700">RT {familyToDelete.rt} / RW {familyToDelete.rw}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alamat:</span>
                <span className="font-medium text-slate-700 truncate max-w-[180px]">{familyToDelete.alamat}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setFamilyToDelete(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus KK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
