import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { AuditLog, User as AppUser } from '../../types';
import { StorageService } from '../../services/storageService';

interface ModulAuditLogProps {
  currentUser?: AppUser;
}

export const ModulAuditLog: React.FC<ModulAuditLogProps> = ({ currentUser }) => {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Subscribe to storage changes for real-time reactivity
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const activeUser = currentUser || StorageService.getCurrentUser();
  // Hak akses penghapusan audit trail & log aktivitas khusus Role Super Admin
  const isSuperAdmin = activeUser.role === 'super_admin';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const logs = StorageService.getAuditLogs();

  const filtered = logs.filter(l => {
    if (selectedModule !== 'all' && l.module !== selectedModule) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUser = l.namaUser.toLowerCase().includes(q);
      const matchAction = l.action.toLowerCase().includes(q);
      const matchDetail = l.detail.toLowerCase().includes(q);
      if (!matchUser && !matchAction && !matchDetail) return false;
    }
    return true;
  });

  const handleConfirmDeleteSingle = () => {
    if (!isSuperAdmin || !deletingLog) return;
    StorageService.deleteAuditLog(deletingLog.id);
    setDeletingLog(null);
    showToast('Catatan audit log berhasil dihapus.');
  };

  const handleConfirmClearAll = () => {
    if (!isSuperAdmin) return;
    StorageService.clearAllAuditLogs();
    setShowConfirmClearAll(false);
    showToast('Seluruh riwayat audit trail berhasil dikosongkan.');
  };

  const getModuleBadge = (mod: AuditLog['module']) => {
    switch (mod) {
      case 'Warga':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">Warga</span>;
      case 'Surat':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">Surat</span>;
      case 'Pengaduan':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">Pengaduan</span>;
      case 'Iuran':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800">Iuran</span>;
      case 'Keuangan':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">Keuangan</span>;
      case 'Inventaris':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800">Inventaris</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{mod}</span>;
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            Audit Trail & Log Aktivitas Sistem RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan transparan seluruh mutasi data warga, verifikasi surat pengantar, dan aktivitas kas pengurus
          </p>
        </div>

        {/* Super Admin Actions */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              Hak Akses Super Admin
            </span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(true)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Kosongkan seluruh riwayat audit log"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Kosongkan Log</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama pengguna, aksi, atau detail audit..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        <select
          value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
        >
          <option value="all">Semua Modul</option>
          <option value="Warga">Modul Warga</option>
          <option value="Surat">Modul Surat</option>
          <option value="Pengaduan">Modul Pengaduan</option>
          <option value="Iuran">Modul Iuran</option>
          <option value="Keuangan">Modul Keuangan</option>
          <option value="Inventaris">Modul Inventaris</option>
          <option value="Autentikasi">Autentikasi & Akun</option>
          <option value="Sistem">Sistem</option>
        </select>
      </div>

      {/* Audit Logs Timeline List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada log aktivitas sesuai kriteria.</p>
          </div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs group">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{log.namaUser}</span>
                      <span className="text-[10px] text-slate-400">({log.role})</span>
                      {getModuleBadge(log.module)}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {log.timestamp}
                    </span>
                  </div>

                  <div className="mt-1 text-slate-700">
                    <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mr-1.5">
                      {log.action}
                    </span>
                    <span className="break-words">{log.detail}</span>
                  </div>
                </div>
              </div>

              {/* Super Admin Row Delete Action */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setDeletingLog(log)}
                  title="Hapus baris audit log ini"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Single Log Modal */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Hapus Catatan Audit Log?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Sebagai <span className="font-semibold text-slate-700">Role Super Admin</span>, Anda akan menghapus catatan aktivitas ini dari rekaman Audit Trail.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{deletingLog.namaUser}</span>
                <span className="font-mono text-[10px] text-slate-400">{deletingLog.timestamp}</span>
              </div>
              <div className="text-slate-600 line-clamp-2">
                <strong className="text-emerald-800">{deletingLog.action}:</strong> {deletingLog.detail}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Ya, Hapus Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Logs Modal */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Kosongkan Seluruh Audit Trail?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Tindakan ini hanya dapat dilakukan oleh <span className="font-semibold text-rose-700">Role Super Admin</span>. Seluruh riwayat mutasi ({logs.length} catatan) akan dihapus secara permanen.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Ya, Kosongkan Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
