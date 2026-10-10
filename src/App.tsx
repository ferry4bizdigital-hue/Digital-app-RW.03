import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { User } from './types';
import { AppHeader } from './components/layout/AppHeader';
import { AndroidFrame } from './components/layout/AndroidFrame';
import { BottomNav, ActiveTab } from './components/layout/BottomNav';
import { NotificationDrawer } from './components/notifikasi/NotificationDrawer';
import { AndroidArchitectureModal } from './components/architecture/AndroidArchitectureModal';
import { LoginScreen } from './components/auth/LoginScreen';

// Dashboards
import { RwDashboard } from './components/dashboard/RwDashboard';
import { RtDashboard } from './components/dashboard/RtDashboard';
import { WargaDashboard } from './components/dashboard/WargaDashboard';

// Modules
import { DaftarWarga } from './components/warga/DaftarWarga';
import { DaftarKk } from './components/kk/DaftarKk';
import { PengajuanSurat } from './components/surat/PengajuanSurat';
import { ModulPengaduan } from './components/pengaduan/ModulPengaduan';
import { ModulIuran } from './components/iuran/ModulIuran';
import { ModulKeuangan } from './components/keuangan/ModulKeuangan';
import { ModulInventaris } from './components/inventaris/ModulInventaris';
import { PengumumanAgenda } from './components/pengumuman/PengumumanAgenda';
import { ModulLayananDarurat } from './components/layanan/ModulLayananDarurat';
import { ModulAuditLog } from './components/audit/ModulAuditLog';
import { ProfilPengaturan } from './components/profil/ProfilPengaturan';
import { MenuLainGrid } from './components/layout/MenuLainGrid';
import { ModulPengurus } from './components/pengurus/ModulPengurus';
import { ModulNgontrakUsaha } from './components/ngontrak/ModulNgontrakUsaha';
import { ModulGoogleDrive } from './components/drive/ModulGoogleDrive';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Subscribe to storage changes & initial server sync
  useEffect(() => {
    // Sync with canonical server database
    StorageService.initSync();

    const unsubscribe = StorageService.subscribe(() => {
      setCurrentUser(StorageService.getCurrentUser());
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const notifications = StorageService.getNotifications();
  const unreadCount = notifications.filter(n => !n.dibaca).length;

  const letters = StorageService.getLetters();
  const pendingSuratCount = letters.filter(l => 
    currentUser.role === 'pengurus_rt' 
      ? (l.status === 'diajukan' && l.rt === currentUser.RT)
      : (currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara') 
        ? l.status === 'disetujui_rt'
        : l.status === 'selesai' && l.pemohonId === currentUser.userId
  ).length;

  const complaints = StorageService.getComplaints();
  const pendingComplaintCount = complaints.filter(c => 
    currentUser.role === 'pengurus_rt' 
      ? (c.status === 'Baru' && c.rt === currentUser.RT)
      : c.status === 'Baru'
  ).length;

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActiveTab('beranda');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Screen content based on activeTab and role
  const renderScreenContent = () => {
    switch (activeTab) {
      case 'beranda':
        if (currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara' || currentUser.role === 'super_admin') {
          return <RwDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
        }
        if (currentUser.role === 'pengurus_rt') {
          return <RtDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
        }
        return <WargaDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;

      case 'warga':
        return <DaftarWarga currentUser={currentUser} />;

      case 'kk':
        return <DaftarKk currentUser={currentUser} />;

      case 'surat':
        if (currentUser.role === 'pengurus_rt') {
          return <RtDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
        }
        if (currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara' || currentUser.role === 'super_admin') {
          return <RwDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
        }
        return <PengajuanSurat currentUser={currentUser} />;

      case 'pengaduan':
        return <ModulPengaduan currentUser={currentUser} />;

      case 'iuran':
        return <ModulIuran currentUser={currentUser} onNavigateTab={setActiveTab} />;

      case 'keuangan':
        return <ModulKeuangan currentUser={currentUser} onNavigateTab={setActiveTab} />;

      case 'inventaris':
        return <ModulInventaris currentUser={currentUser} />;

      case 'pengumuman':
        return <PengumumanAgenda currentUser={currentUser} initialTab="pengumuman" />;

      case 'agenda':
        return <PengumumanAgenda currentUser={currentUser} initialTab="agenda" />;

      case 'layanan':
        return <ModulLayananDarurat currentUser={currentUser} />;

      case 'audit':
        return <ModulAuditLog currentUser={currentUser} />;

      case 'pengurus':
        if (currentUser.role !== 'super_admin') {
          return <RwDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
        }
        return <ModulPengurus currentUser={currentUser} onNavigateTab={setActiveTab} />;

      case 'ngontrak_usaha':
        return (
          <ModulNgontrakUsaha 
            currentUser={currentUser} 
            onNavigateTab={setActiveTab}
            onBackToPengurus={() => setActiveTab('pengurus')}
          />
        );

      case 'google_drive':
        return <ModulGoogleDrive currentUser={currentUser} />;

      case 'profil':
        return <ProfilPengaturan currentUser={currentUser} onLogout={handleLogout} />;

      case 'menu_lain':
        return (
          <MenuLainGrid 
            role={currentUser.role} 
            onNavigateTab={setActiveTab} 
            onOpenArchitecture={() => setIsArchModalOpen(true)} 
          />
        );

      default:
        return <RwDashboard currentUser={currentUser} onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* App Universal Top Bar */}
      <AppHeader
        currentUser={currentUser}
        isMobileFrame={isMobileFrame}
        onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        unreadCount={unreadCount}
        onNavigateProfile={() => setActiveTab('profil')}
        onNavigateDrive={() => setActiveTab('google_drive')}
        onLogout={handleLogout}
      />

      {/* Main Viewport Container with safe bottom clearance */}
      <main className="flex-1 pb-24 sm:pb-20">
        <AndroidFrame isMobile={isMobileFrame}>
          {renderScreenContent()}
        </AndroidFrame>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        role={currentUser.role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingSuratCount={pendingSuratCount}
        pendingComplaintCount={pendingComplaintCount}
      />

      {/* Notification Drawer Modal */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onNavigateTab={setActiveTab}
      />

      {/* Android Kotlin & Compose Architecture Modal */}
      <AndroidArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
}
