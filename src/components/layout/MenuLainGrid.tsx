import React from 'react';
import { 
  Users, 
  Home, 
  FileText, 
  AlertCircle, 
  Wallet, 
  TrendingUp, 
  Package, 
  Volume2, 
  Calendar, 
  PhoneCall, 
  ShieldCheck, 
  User, 
  Settings,
  ChevronRight,
  Sparkles,
  Receipt,
  UserCheck,
  Store,
  HardDrive
} from 'lucide-react';
import { UserRole } from '../../types';
import { ActiveTab } from '../layout/BottomNav';

interface MenuLainGridProps {
  role: UserRole;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenArchitecture: () => void;
}

export const MenuLainGrid: React.FC<MenuLainGridProps> = ({
  role,
  onNavigateTab,
  onOpenArchitecture
}) => {
  const isPengurus = role !== 'warga';

  const menuItems = [
    {
      id: 'pengurus' as ActiveTab,
      title: 'Pendaftaran Pengurus RT/RW',
      desc: 'Kelola Role RW, Bendahara & Role RT 01-05',
      icon: UserCheck,
      color: 'bg-emerald-100 text-emerald-900 font-bold',
      allowed: role === 'super_admin',
      isSpecial: true
    },
    {
      id: 'ngontrak_usaha' as ActiveTab,
      title: 'Data Warga Ngontrak Usaha',
      desc: 'Kelola warga & pelaku usaha kontrakan',
      icon: Store,
      color: 'bg-teal-100 text-teal-900 font-bold',
      allowed: role === 'super_admin' || role === 'ketua_rw' || role === 'bendahara' || role === 'pengurus_rt',
      isSpecial: true
    },
    {
      id: 'google_drive' as ActiveTab,
      title: 'Google Drive RW 03',
      desc: 'Penyimpanan cloud, arsip & cadangan data',
      icon: HardDrive,
      color: 'bg-gradient-to-br from-blue-50 to-emerald-50 text-emerald-800 font-bold border border-emerald-200/60',
      allowed: true,
      isSpecial: true
    },
    {
      id: 'warga' as ActiveTab,
      title: 'Data Warga',
      desc: 'Master kependudukan RT 01-05',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-700',
      allowed: true
    },
    {
      id: 'kk' as ActiveTab,
      title: 'Kartu Keluarga',
      desc: 'Daftar KK & hubungan famili',
      icon: Home,
      color: 'bg-blue-50 text-blue-700',
      allowed: true
    },
    {
      id: 'surat' as ActiveTab,
      title: 'Pengajuan Surat',
      desc: 'Pengantar RT/RW digital',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-700',
      allowed: true
    },
    {
      id: 'pengaduan' as ActiveTab,
      title: 'Pengaduan Warga',
      desc: 'Laporan keluhan & aspirasi',
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-700',
      allowed: true
    },
    {
      id: 'iuran' as ActiveTab,
      title: 'Iuran Digital',
      desc: 'Tagihan IWD & kas lingkungan',
      icon: Wallet,
      color: 'bg-purple-50 text-purple-700',
      allowed: true
    },
    {
      id: 'keuangan' as ActiveTab,
      title: 'Kas & Keuangan',
      desc: 'Penerimaan & pengeluaran RW',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-700',
      allowed: true
    },
    {
      id: 'inventaris' as ActiveTab,
      title: 'Aset & Inventaris',
      desc: 'Tenda, kursi, sound & pompa',
      icon: Package,
      color: 'bg-teal-50 text-teal-700',
      allowed: true
    },
    {
      id: 'pengumuman' as ActiveTab,
      title: 'Pengumuman',
      desc: 'Siaran kabar & surat edaran',
      icon: Volume2,
      color: 'bg-sky-50 text-sky-700',
      allowed: true
    },
    {
      id: 'agenda' as ActiveTab,
      title: 'Agenda & Kegiatan',
      desc: 'Jadwal kerja bakti & posyandu',
      icon: Calendar,
      color: 'bg-orange-50 text-orange-700',
      allowed: true
    },
    {
      id: 'layanan' as ActiveTab,
      title: 'Layanan Darurat',
      desc: 'Polisi, Babinsa & Damkar',
      icon: PhoneCall,
      color: 'bg-rose-50 text-rose-700',
      allowed: true
    },
    {
      id: 'audit' as ActiveTab,
      title: 'Audit Trail',
      desc: 'Log aktivitas pengurus & warga',
      icon: ShieldCheck,
      color: 'bg-slate-100 text-slate-700',
      allowed: isPengurus
    },
    {
      id: 'profil' as ActiveTab,
      title: 'Profil & Akun',
      desc: 'Pengaturan akun & sandi',
      icon: User,
      color: 'bg-slate-100 text-slate-700',
      allowed: true
    }
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">
          Semua Modul & Layanan RW 03
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Akses seluruh fitur administrasi digital RW 03 Kebon Kangkung
        </p>
      </div>

      {/* Super Admin Special Banner */}
      {role === 'super_admin' && (
        <div 
          onClick={() => onNavigateTab('pengurus')}
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white cursor-pointer hover:shadow-md transition-all flex items-center justify-between border border-emerald-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
                  Layanan Khusus Super Admin
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mt-1">Pendaftaran & Kelola Pengurus RT / RW</h3>
              <p className="text-xs text-emerald-100/80">Daftarkan akun pengurus baru berdasarkan role: Role RW, Role RT 01 s/d RT 05</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-300 shrink-0" />
        </div>
      )}

      {/* Grid Menu */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {menuItems.filter(m => m.allowed).map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => onNavigateTab(item.id)}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {item.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between text-xs text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Buka</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Developer / Architecture Banner */}
      <div 
        onClick={onOpenArchitecture}
        className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white cursor-pointer hover:opacity-95 transition-opacity flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs">Lihat Arsitektur Produksi Android (Kotlin & Jetpack Compose)</h4>
            <p className="text-[11px] text-slate-300">Clean Architecture, MVVM, Room DB Caching, & Cloud Firestore Rules</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-300" />
      </div>
    </div>
  );
};
