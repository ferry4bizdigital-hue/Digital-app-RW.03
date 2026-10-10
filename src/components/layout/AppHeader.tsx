import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Code, 
  UserCheck, 
  User as UserIcon,
  LogOut,
  RotateCcw,
  ChevronDown,
  SlidersHorizontal,
  X,
  CloudCheck,
  HardDrive
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { User, AppNotification } from '../../types';
import { SyncPublishModal } from '../sync/SyncPublishModal';

interface AppHeaderProps {
  currentUser: User;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onOpenArchitecture: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onNavigateProfile?: () => void;
  onNavigateDrive?: () => void;
  onLogout?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  isMobileFrame,
  onToggleFrame,
  onOpenArchitecture,
  onOpenNotifications,
  unreadCount,
  onNavigateProfile,
  onNavigateDrive,
  onLogout
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() => StorageService.getSyncStatus());
  const isOffline = StorageService.isOffline();

  useEffect(() => {
    const unsub = StorageService.subscribeSync(() => {
      setSyncStatus(StorageService.getSyncStatus());
    });
    return unsub;
  }, []);

  const handleToggleOffline = () => {
    StorageService.toggleOffline();
  };

  const handleResetData = () => {
    StorageService.resetToDemoData();
    setShowResetConfirm(false);
    window.location.reload();
  };

  const roleLabelMap: Record<User['role'], string> = {
    super_admin: 'Super Admin',
    ketua_rw: 'Ketua RW 03',
    bendahara: 'Bendahara RW 03',
    pengurus_rt: `Pengurus RT ${StorageService.normalizeRt(currentUser.RT)}`,
    warga: `Warga (RT ${StorageService.normalizeRt(currentUser.RT)})`
  };

  const shortRoleLabel: Record<User['role'], string> = {
    super_admin: 'Admin',
    ketua_rw: 'RW 03',
    bendahara: 'Bendahara',
    pengurus_rt: `RT ${StorageService.normalizeRt(currentUser.RT)}`,
    warga: `RT ${StorageService.normalizeRt(currentUser.RT)}`
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Offline banner if enabled */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Mode Offline Aktif — Menggunakan data lokal ter-cache (Room DB).</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Zone 1: Single text element wordmark - adapts smoothly on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm shrink-0">
            RW
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-base font-bold tracking-tight text-slate-900 block leading-tight truncate sm:whitespace-nowrap">
              Digital RW 03 Kebon Kangkung
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 block leading-tight truncate">
              Kiaracondong, Kota Bandung
            </span>
          </div>
        </div>

        {/* Zone 2 & 3: Active User Info & Primary actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Logged-in User Badge & Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 shadow-2xs transition-colors cursor-pointer"
              title="Informasi Akun Pengguna"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden md:inline font-semibold">{currentUser.nama.split(',')[0].split(' ')[0]}</span>
              <span className="text-emerald-700 font-semibold text-[11px] sm:text-xs">
                <span className="inline sm:hidden">{shortRoleLabel[currentUser.role]}</span>
                <span className="hidden sm:inline">
                  ({currentUser.role === 'warga' ? `Warga RT ${StorageService.normalizeRt(currentUser.RT)}` : roleLabelMap[currentUser.role]})
                </span>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Akun Pengguna Aktif
                  </div>
                  <div className="text-xs text-slate-800 font-bold mt-0.5 truncate">
                    {currentUser.nama}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold truncate">
                    {currentUser.role === 'warga' ? `Warga RT ${StorageService.normalizeRt(currentUser.RT)}` : roleLabelMap[currentUser.role]}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </div>
                </div>

                <div className="space-y-1">
                  {onNavigateProfile && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigateProfile();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Profil & Pengaturan</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Keluar (Logout)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Only Tools: Sinkron Publish, Offline, Frame View, Architecture, Reset */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Tombol Sinkronisasi Publish */}
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Sinkronisasi Data ke Link Publish (Server Cloud)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <CloudCheck className="w-4 h-4 text-emerald-700" />
              <span className="hidden lg:inline">Sinkron Publish</span>
            </button>

            {/* Tombol Google Drive RW 03 */}
            {onNavigateDrive && (
              <button
                onClick={onNavigateDrive}
                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-xs font-semibold text-blue-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Google Drive RW 03: Penyimpanan & Cadangan Cloud"
              >
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span className="hidden lg:inline">Google Drive</span>
              </button>
            )}

            {/* Toggle Offline Simulator */}
            <button
              onClick={handleToggleOffline}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isOffline 
                  ? 'bg-amber-100 border-amber-300 text-amber-900' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={isOffline ? 'Klik untuk kembali Online' : 'Klik untuk simulasi Mode Offline'}
            >
              {isOffline ? <WifiOff className="w-4 h-4 text-amber-700" /> : <Wifi className="w-4 h-4 text-emerald-700" />}
              <span className="hidden lg:inline">{isOffline ? 'Offline' : 'Online'}</span>
            </button>

            {/* Device Frame View Toggle */}
            <button
              onClick={onToggleFrame}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isMobileFrame 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={isMobileFrame ? 'Tampilan Desktop / Layar Penuh' : 'Tampilan Simulasi Mobile Android'}
            >
              {isMobileFrame ? <Smartphone className="w-4 h-4 text-emerald-700" /> : <Monitor className="w-4 h-4 text-slate-600" />}
              <span className="hidden lg:inline">{isMobileFrame ? 'Mode Android' : 'Mode Layar Penuh'}</span>
            </button>

            {/* Architecture / Kotlin Blueprint button */}
            <button
              onClick={onOpenArchitecture}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1.5 transition-colors"
              title="Lihat Arsitektur Kotlin & Clean Architecture"
            >
              <Code className="w-4 h-4 text-indigo-700" />
              <span className="hidden lg:inline">Arsitektur</span>
            </button>

            {/* Reset Data Bawaan */}
            <div className="relative">
              <button
                onClick={() => setShowResetConfirm(!showResetConfirm)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                title="Reset Data Bawaan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {showResetConfirm && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                  <p className="text-xs text-slate-700 font-medium mb-2">
                    Kembalikan semua data ke pengaturan awal RW 03?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetData}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Ya, Reset
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Tools Dropdown Toggle (visible on < sm screens) */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileTools(!showMobileTools)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Menu Alat Pengembang / Simulasi"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {showMobileTools && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                  <span>Opsi Simulasi & Alat</span>
                  <button onClick={() => setShowMobileTools(false)} className="p-0.5 text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowMobileTools(false);
                      setShowSyncModal(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-emerald-50 flex items-center gap-2 text-emerald-800 font-semibold"
                  >
                    <CloudCheck className="w-4 h-4 text-emerald-700" />
                    <span>Sinkronisasi Data Publish</span>
                  </button>

                  {onNavigateDrive && (
                    <button
                      onClick={() => {
                        setShowMobileTools(false);
                        onNavigateDrive();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50 flex items-center gap-2 text-blue-800 font-semibold"
                    >
                      <HardDrive className="w-4 h-4 text-blue-600" />
                      <span>Google Drive RW 03</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onToggleFrame();
                      setShowMobileTools(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    {isMobileFrame ? <Monitor className="w-4 h-4 text-emerald-700" /> : <Smartphone className="w-4 h-4 text-emerald-700" />}
                    <span>{isMobileFrame ? 'Mode Layar Penuh' : 'Mode Bingkai Android'}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleToggleOffline();
                      setShowMobileTools(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    {isOffline ? <Wifi className="w-4 h-4 text-emerald-700" /> : <WifiOff className="w-4 h-4 text-amber-700" />}
                    <span>{isOffline ? 'Simulasi Online' : 'Simulasi Offline'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenArchitecture();
                      setShowMobileTools(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Code className="w-4 h-4 text-indigo-700" />
                    <span>Lihat Arsitektur Kotlin</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileTools(false);
                      setShowResetConfirm(true);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-2 text-rose-700 border-t border-slate-100 mt-1 pt-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Data Bawaan</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Button with Unread Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Notifikasi Masuk"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sync Publish Modal */}
      <SyncPublishModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </header>
  );
};
