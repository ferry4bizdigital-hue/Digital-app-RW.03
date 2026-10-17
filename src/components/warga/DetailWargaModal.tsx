import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  User, 
  Home, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Calendar, 
  ShieldCheck,
  Printer,
  Edit,
  Trash2
} from 'lucide-react';
import { Resident, User as AppUser } from '../../types';
import { StorageService } from '../../services/storageService';

interface DetailWargaModalProps {
  resident: Resident | null;
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (resident: Resident) => void;
  onDelete?: (resident: Resident) => void;
}

export const DetailWargaModal: React.FC<DetailWargaModalProps> = ({
  resident,
  currentUser,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [showFullNik, setShowFullNik] = useState(false);

  if (!isOpen || !resident) return null;

  // Check role authorization for unmasking NIK
  const canViewFullNik = 
    currentUser.role === 'super_admin' || 
    currentUser.role === 'ketua_rw' || 
    currentUser.role === 'bendahara' || 
    (currentUser.role === 'pengurus_rt' && StorageService.normalizeRt(currentUser.RT) === StorageService.normalizeRt(resident.rt)) ||
    currentUser.NIK === resident.NIK;

  const displayNik = (showFullNik && canViewFullNik)
    ? resident.NIK
    : StorageService.maskNik(resident.NIK, false);

  const displayKk = (showFullNik && canViewFullNik)
    ? resident.nomorKK
    : StorageService.maskNik(resident.nomorKK, false);

  const canEdit = 
    currentUser.role === 'super_admin' || 
    currentUser.role === 'ketua_rw' ||
    currentUser.role === 'bendahara' ||
    (currentUser.role === 'pengurus_rt' && StorageService.normalizeRt(currentUser.RT) === StorageService.normalizeRt(resident.rt));

  const canDelete = currentUser.role === 'super_admin';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
              {resident.namaLengkap.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{resident.namaLengkap}</h3>
              <p className="text-xs text-slate-500">
                RT {resident.rt} / RW {resident.rw} · Status {resident.statusWarga}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
              title="Cetak Biodata"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* NIK & KK Box with Privacy Enforcement */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-900 block">
                  Nomor Induk Kependudukan (NIK)
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                  {displayNik}
                </span>
              </div>
              {canViewFullNik ? (
                <button
                  onClick={() => setShowFullNik(!showFullNik)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  {showFullNik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showFullNik ? 'Tutup NIK' : 'Lihat Penuh'}</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 italic">Disamarkan demi privasi</span>
              )}
            </div>

            <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-900 block">
                  Nomor Kartu Keluarga (KK)
                </span>
                <span className="font-mono text-xs font-semibold text-slate-800">
                  {displayKk}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                {resident.hubunganKeluarga}
              </span>
            </div>
          </div>

          {/* Demographic Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] mb-0.5">Tempat & Tanggal Lahir</span>
              <span className="font-semibold text-slate-800 block">
                {resident.tempatLahir}, {resident.tanggalLahir}
              </span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Usia: {resident.usia} Tahun</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] mb-0.5">Jenis Kelamin & Agama</span>
              <span className="font-semibold text-slate-800 block">
                {resident.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
              </span>
              <span className="text-slate-500 text-[10px] block mt-0.5">{resident.agama}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] mb-0.5">Status Perkawinan</span>
              <span className="font-semibold text-slate-800 block">
                {resident.statusPerkawinan}
              </span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Pendidikan: {resident.pendidikan}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] mb-0.5">Pekerjaan</span>
              <span className="font-semibold text-slate-800 block">
                {resident.pekerjaan || '-'}
              </span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Status: {resident.statusDomisili}</span>
            </div>
          </div>

          {/* Address & Contact */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <span className="text-slate-500 text-[10px] block mb-0.5">Alamat Tempat Tinggal</span>
              <p className="font-semibold text-slate-800 leading-relaxed">
                {resident.alamat}, RT {resident.rt} / RW {resident.rw}, Kebon Kangkung, Kiaracondong, Bandung
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500 text-[10px] block">No. HP / WhatsApp:</span>
                <span className="font-mono font-medium">{resident.nomorHP || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Email:</span>
                <span className="font-medium truncate block">{resident.email || '-'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span>Terdaftar: {resident.createdAt}</span>
            <span>Update Terakhir: {resident.updatedAt}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          
          <div className="flex items-center gap-2">
            {canDelete && onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(resident);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="Hapus data warga ini dari sistem (Khusus Super Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Warga</span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(resident);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer active:scale-95"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Data Warga</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
