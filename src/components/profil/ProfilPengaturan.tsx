import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Home, 
  Phone, 
  Mail, 
  Shield, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  Settings,
  Bell,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storageService';

interface ProfilPengaturanProps {
  currentUser: User;
  onLogout: () => void;
}

export const ProfilPengaturan: React.FC<ProfilPengaturanProps> = ({ currentUser, onLogout }) => {
  const [showNik, setShowNik] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isWarga = currentUser.role === 'warga';

  // Edit fields
  const [nomorHp, setNomorHp] = useState(currentUser.nomorHP);
  const [email, setEmail] = useState(currentUser.email);
  const [alamat, setAlamat] = useState(currentUser.alamat);

  const roleNameMap: Record<User['role'], string> = {
    super_admin: 'Super Admin Sistem',
    ketua_rw: 'Ketua Rukun Warga (RW 03)',
    bendahara: 'Bendahara Rukun Warga (RW 03)',
    pengurus_rt: `Pengurus Rukun Tetangga (RT ${currentUser.RT})`,
    warga: `Warga Tetap RT ${currentUser.RT} / RW 03`
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWarga) return; // Strictly disallow warga from modifying account and contact info
    const users = StorageService.getUsers();
    const idx = users.findIndex(u => u.userId === currentUser.userId);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        nomorHP: nomorHp,
        email,
        alamat,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      StorageService.setCurrentUser(users[idx]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white font-bold text-xl flex items-center justify-center shadow-sm">
          {currentUser.nama.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 truncate">{currentUser.nama}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {currentUser.statusAkun}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{roleNameMap[currentUser.role]}</p>
          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
            ID: {currentUser.userId}
          </span>
        </div>
      </div>

      {/* Profile Edit / View Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Informasi Akun & Kontak</h3>
            {isWarga && (
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" /> Hanya Lihat
              </span>
            )}
          </div>
          {isSaved && !isWarga && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Data Tersimpan
            </span>
          )}
        </div>

        {/* Notice for Warga */}
        {isWarga && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-xs text-amber-900">
                Akses Perubahan Data Akun & Kontak Dikunci
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Warga tidak diberikan akses untuk merubah informasi akun dan kontak secara mandiri. Untuk permohonan pembaruan nomor kontak WhatsApp, alamat email, atau domisili, silakan hubungi Pengurus RT {currentUser.RT}.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Nomor Induk Kependudukan (NIK)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={showNik ? currentUser.NIK : StorageService.maskNik(currentUser.NIK, false)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-600 text-xs"
            />
            <button
              type="button"
              onClick={() => setShowNik(!showNik)}
              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {showNik ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showNik ? 'Tutup' : 'Lihat'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp / HP</label>
            <input
              type="text"
              value={nomorHp}
              readOnly={isWarga}
              onChange={e => !isWarga && setNomorHp(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs transition-colors ${
                isWarga 
                  ? 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-not-allowed font-medium' 
                  : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none'
              }`}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Alamat Email</label>
            <input
              type="email"
              value={email}
              readOnly={isWarga}
              onChange={e => !isWarga && setEmail(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs transition-colors ${
                isWarga 
                  ? 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-not-allowed font-medium' 
                  : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Alamat Domisili</label>
          <input
            type="text"
            value={alamat}
            readOnly={isWarga}
            onChange={e => !isWarga && setAlamat(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-xs transition-colors ${
              isWarga 
                ? 'border-slate-200 bg-slate-50/90 text-slate-700 cursor-not-allowed font-medium' 
                : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none'
            }`}
          />
        </div>

        {/* Action Button: only visible for non-warga roles */}
        {!isWarga && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        )}
      </form>

      {/* Security & System Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-2">Keamanan & Sistem</h3>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div>
            <span className="font-semibold text-slate-800 block">Autentikasi Dua Faktor (2FA)</span>
            <span className="text-[11px] text-slate-500">Verifikasi SMS / WhatsApp OTP</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700">Aktif</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div>
            <span className="font-semibold text-slate-800 block">Penyimpanan Offline (Room DB Cache)</span>
            <span className="text-[11px] text-slate-500">Data tersimpan lokal untuk akses tanpa sinyal</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700">Sinkron</span>
        </div>

        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Aplikasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
