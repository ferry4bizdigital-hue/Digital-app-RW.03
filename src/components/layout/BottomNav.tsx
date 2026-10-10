import React from 'react';
import { 
  Home, 
  FileText, 
  AlertCircle, 
  Wallet, 
  User, 
  Users, 
  Grid,
  ClipboardList,
  TrendingUp,
  Package,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../../types';

export type ActiveTab = 
  | 'beranda' 
  | 'warga' 
  | 'kk' 
  | 'surat' 
  | 'pengaduan' 
  | 'iuran' 
  | 'keuangan' 
  | 'inventaris' 
  | 'pengumuman' 
  | 'agenda' 
  | 'layanan' 
  | 'audit' 
  | 'profil'
  | 'menu_lain'
  | 'pengurus'
  | 'ngontrak_usaha'
  | 'google_drive';

interface BottomNavProps {
  role: UserRole;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingSuratCount?: number;
  pendingComplaintCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  activeTab,
  onTabChange,
  pendingSuratCount = 0,
  pendingComplaintCount = 0
}) => {
  const isWarga = role === 'warga';

  // Warga bottom navigation tabs
  const wargaNavItems = [
    { id: 'beranda' as ActiveTab, label: 'Beranda', icon: Home },
    { id: 'surat' as ActiveTab, label: 'Surat', icon: FileText, badge: pendingSuratCount > 0 ? pendingSuratCount : undefined },
    { id: 'pengaduan' as ActiveTab, label: 'Aduan', icon: AlertCircle },
    { id: 'iuran' as ActiveTab, label: 'Iuran', icon: Wallet },
    { id: 'profil' as ActiveTab, label: 'Profil', icon: User }
  ];

  // Pengurus RT bottom navigation tabs (tanpa pelayanan administrasi/surat, fokus IWD & warga)
  const rtNavItems = [
    { id: 'beranda' as ActiveTab, label: 'Dashboard', icon: Home },
    { id: 'warga' as ActiveTab, label: 'Warga', icon: Users },
    { id: 'iuran' as ActiveTab, label: 'Iuran', icon: Wallet },
    { id: 'pengaduan' as ActiveTab, label: 'Aduan', icon: AlertCircle, badge: pendingComplaintCount > 0 ? pendingComplaintCount : undefined },
    { id: 'menu_lain' as ActiveTab, label: 'Menu Lain', icon: Grid }
  ];

  // Pengurus RW (Ketua RW) bottom navigation tabs (tanpa pelayanan surat)
  const rwNavItems = [
    { id: 'beranda' as ActiveTab, label: 'Dashboard', icon: Home },
    { id: 'warga' as ActiveTab, label: 'Warga', icon: Users },
    { id: 'keuangan' as ActiveTab, label: 'Keuangan', icon: TrendingUp },
    { id: 'pengaduan' as ActiveTab, label: 'Aduan', icon: AlertCircle, badge: pendingComplaintCount > 0 ? pendingComplaintCount : undefined },
    { id: 'menu_lain' as ActiveTab, label: 'Menu Lain', icon: Grid }
  ];

  // Super Admin bottom navigation tabs (tanpa pelayanan surat)
  const superAdminNavItems = [
    { id: 'beranda' as ActiveTab, label: 'Dashboard', icon: Home },
    { id: 'pengurus' as ActiveTab, label: 'Pengurus', icon: UserCheck },
    { id: 'warga' as ActiveTab, label: 'Warga', icon: Users },
    { id: 'pengaduan' as ActiveTab, label: 'Aduan', icon: AlertCircle, badge: pendingComplaintCount > 0 ? pendingComplaintCount : undefined },
    { id: 'menu_lain' as ActiveTab, label: 'Menu Lain', icon: Grid }
  ];

  const items = isWarga 
    ? wargaNavItems 
    : role === 'pengurus_rt' 
      ? rtNavItems 
      : (role === 'ketua_rw' || role === 'bendahara')
        ? rwNavItems
        : superAdminNavItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {items.map(item => {
          const Icon = item.icon;
          const isItemInBottomNav = items.some(it => it.id === activeTab);
          const isActive = activeTab === item.id || (item.id === 'menu_lain' && !isItemInBottomNav && ['keuangan', 'inventaris', 'pengumuman', 'agenda', 'layanan', 'audit', 'kk', 'iuran', 'surat', 'pengurus'].includes(activeTab));
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors group"
            >
              <div className="relative">
                <div
                  className={`w-10 h-7 flex items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
                </div>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 truncate max-w-[64px] ${
                  isActive ? 'text-emerald-800 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
