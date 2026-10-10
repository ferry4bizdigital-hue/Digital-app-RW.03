import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCheck, 
  Bell, 
  FileText, 
  AlertCircle, 
  Calendar, 
  Volume2, 
  Wallet,
  Info,
  Trash2
} from 'lucide-react';
import { AppNotification } from '../../types';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [, setTick] = useState(0);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Subscribe to storage changes for reactive real-time updates across all roles
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const notifications = StorageService.getNotifications();
  const unreadCount = notifications.filter(n => !n.dibaca).length;

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsRead();
  };

  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.deleteNotification(id);
  };

  const handleClearAll = () => {
    StorageService.clearAllNotifications();
    setShowConfirmClear(false);
  };

  const handleItemClick = (notif: AppNotification) => {
    StorageService.markNotificationRead(notif.id);
    if (notif.linkTab) {
      onNavigateTab(notif.linkTab as ActiveTab);
      onClose();
    }
  };

  const getIcon = (type: AppNotification['tipe']) => {
    switch (type) {
      case 'surat':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'pengaduan':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'agenda':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'pengumuman':
        return <Volume2 className="w-4 h-4 text-blue-600" />;
      case 'iuran':
        return <Wallet className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md h-[90vh] max-h-[680px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">Pusat Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full">
                {unreadCount} Baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 hover:underline"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tandai Dibaca</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 hover:underline ml-1"
                title="Hapus semua notifikasi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kosongkan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clear All Confirmation Banner */}
        {showConfirmClear && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-2 animate-in slide-in-from-top-1 text-xs">
            <span className="text-rose-900 font-medium">Hapus semua ({notifications.length}) notifikasi?</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-2.5 py-1 rounded-md text-slate-600 hover:bg-rose-100 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-2xs"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bell className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600">Pusat Notifikasi Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Belum ada notifikasi baru. Pemberitahuan surat, pengumuman, pengaduan warga, dan iuran akan muncul di sini.
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`group p-3 rounded-xl transition-colors cursor-pointer flex items-start gap-3 relative ${
                  notif.dibaca ? 'hover:bg-slate-50' : 'bg-emerald-50/60 hover:bg-emerald-50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  {getIcon(notif.tipe)}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs truncate ${notif.dibaca ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
                      {notif.judul}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                      {notif.tanggal.substring(11, 16)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.pesan}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <span>{notif.tanggal.substring(0, 10)}</span>
                    {!notif.dibaca && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-semibold">Belum Dibaca</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete button available for all roles */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteSingle(notif.id, e)}
                  title="Hapus notifikasi ini"
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
