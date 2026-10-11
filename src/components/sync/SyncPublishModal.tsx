import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudUpload, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Home, 
  Wallet, 
  FileText, 
  Package, 
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Loader2,
  Store,
  Receipt,
  Calendar,
  Bell,
  MessageSquareWarning,
  Building2
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { isGoogleConnected, getCurrentGoogleUser, googleSignIn, subscribeGoogleAuth } from '../../services/googleAuthService';

interface SyncPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncPublishModal: React.FC<SyncPublishModalProps> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState(() => StorageService.getSyncStatus());
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(isGoogleConnected());
  const [googleUser, setGoogleUser] = useState(getCurrentGoogleUser());

  const [serverStatus, setServerStatus] = useState<any>(null);
  const [isLoadingServerStatus, setIsLoadingServerStatus] = useState(false);

  const fetchServerStatus = async () => {
    setIsLoadingServerStatus(true);
    try {
      const res = await fetch('/api/data/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setServerStatus(json);
        }
      }
    } catch {
      // offline or server error
    } finally {
      setIsLoadingServerStatus(false);
    }
  };

  // Subscribe to Google auth & sync state changes
  useEffect(() => {
    fetchServerStatus();
    const unsubSync = StorageService.subscribeSync(() => {
      setSyncStatus(StorageService.getSyncStatus());
    });
    const unsubAuth = subscribeGoogleAuth((user, token) => {
      setIsDriveConnected(!!token && !!user);
      setGoogleUser(user);
    });
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  const handleBackupToGoogleDrive = async () => {
    setIsDriveBackingUp(true);
    setFeedback(null);
    try {
      if (!isGoogleConnected()) {
        await googleSignIn();
      }
      const payload = StorageService.getAllDataPayload();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Backup_RW03_Kebon_Kangkung_${timestamp}.json`;

      await GoogleDriveService.uploadJsonBackup(payload, fileName);
      setFeedback({
        type: 'success',
        message: `Basis data RW 03 berhasil dicadangkan langsung ke Google Drive (${fileName})!`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Gagal mencadangkan ke Google Drive: ${err.message || 'Kesalahan koneksi'}`
      });
    } finally {
      setIsDriveBackingUp(false);
    }
  };

  if (!isOpen) return null;

  // Counts of current active demo and input data
  const residentsCount = StorageService.getResidents().length;
  const familiesCount = StorageService.getFamilies().length;
  const wargaNgontrakCount = StorageService.getWargaNgontrakUsaha().length;
  const duesCount = StorageService.getDues().length;
  const transactionsCount = StorageService.getTransactions().length;
  const setoranRtCount = StorageService.getSetoranRt().length;
  const lettersCount = StorageService.getLetters().length;
  const inventoryCount = StorageService.getInventory().length;
  const complaintsCount = StorageService.getComplaints().length;
  const announcementsCount = StorageService.getAnnouncements().length;
  const eventsCount = StorageService.getEvents().length;
  const usersCount = StorageService.getUsers().length;

  const handlePushPublish = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await StorageService.pushToServer(true);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Berhasil! Seluruh data input dari semua Role telah disinkronkan & dipublikasikan secara online ke Cloud Firestore dan deploy Vercel publik.'
        });
        await fetchServerStatus();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Gagal menyinkronkan data ke server.'
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat menyinkronkan data.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullServer = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const ok = await StorageService.pullFromServer();
      if (ok) {
        setFeedback({
          type: 'success',
          message: 'Data terbaru dari server berhasil ditarik dan dimuat ke aplikasi.'
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Gagal mengambil data dari server atau server belum memiliki data tambahan.'
        });
      }
    } catch (e) {
      setFeedback({
        type: 'error',
        message: 'Gagal mengambil data dari server.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJson = () => {
    try {
      const json = StorageService.exportDatabaseJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().substring(0, 10);
      a.href = url;
      a.download = `backup_data_rw03_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'info',
        message: 'File cadangan JSON berhasil diunduh ke komputer Anda.'
      });
    } catch (e) {
      setFeedback({
        type: 'error',
        message: 'Gagal mengekspor file cadangan.'
      });
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        setIsProcessing(true);
        const ok = await StorageService.importDatabaseJson(text);
        if (ok) {
          setFeedback({
            type: 'success',
            message: 'Data cadangan berhasil diimpor dan disinkronkan ke server pusat!'
          });
        } else {
          setFeedback({
            type: 'error',
            message: 'Format file JSON tidak sesuai.'
          });
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          message: 'Gagal memproses file cadangan.'
        });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const formatLastSync = (timeStr: string | null) => {
    if (!timeStr) return 'Belum pernah disinkronkan sesi ini';
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' WIB';
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <CloudCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Sinkronisasi Data ke Link Publish
              </h2>
              <p className="text-xs text-emerald-100">
                Penyelarasan data input lokal dengan server cloud publik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Indicator Bar */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0" />
            <div className="flex-1 text-xs text-emerald-900">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <span>Status Sinkronisasi Online:</span>
                <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                  {syncStatus.isOnline ? 'Online & Terhubung ke Cloud Database' : 'Offline'}
                </span>
              </div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                Semua data yang diinput oleh semua Role (Warga, Pengurus RT 01-05, Bendahara, Ketua RW, dan IT Admin) disinkronkan secara online ke Cloud Database (Firestore) dan deploy Vercel publik. Siapapun yang mengakses tautan publik akan melihat data yang telah disinkronkan secara terpadu.
              </p>
              <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span>Waktu Terakhir Disinkronkan:</span>
                <span className="font-semibold text-slate-800">{formatLastSync(syncStatus.lastSyncTime)}</span>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{feedback.message}</div>
            </div>
          )}

          {/* Summary of Active Data Ready to Publish */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ringkasan Data yang Akan Ditampilkan di Link Publik</span>
              </h3>
              {serverStatus?.counts && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Link Publik: Snapshot v{serverStatus.version || 1} Aktif</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Semua modul data di bawah ini telah disinkronkan dari kondisi demo dan inputan saat ini. Ketika Anda menyinkronkan data atau membagikan tautan link publik, pengguna lain akan melihat data ini secara utuh dan terpadu.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {/* 1. Total Warga */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Total Warga</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{residentsCount} Jiwa</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Penduduk RT 01-05</div>
              </div>

              {/* 2. Kartu Keluarga */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Kartu Keluarga</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{familiesCount} KK</div>
                <div className="text-[10px] text-blue-700 font-medium mt-0.5">KK Terdaftar</div>
              </div>

              {/* 3. Warga Ngontrak & Usaha */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Ngontrak & Usaha</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{wargaNgontrakCount} Data</div>
                <div className="text-[10px] text-teal-700 font-medium mt-0.5">Pelaku Usaha/Kontrakan</div>
              </div>

              {/* 4. Iuran Warga */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-cyan-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Iuran Warga (IWD)</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{duesCount} Tagihan</div>
                <div className="text-[10px] text-cyan-700 font-medium mt-0.5">Lunas & Tagihan Berjalan</div>
              </div>

              {/* 5. Transaksi Kas RW */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Buku Kas RW</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{transactionsCount} Catatan</div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">Pemasukan & Pengeluaran</div>
              </div>

              {/* 6. Setoran Kas RT */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Setoran Kas RT</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{setoranRtCount} Setoran</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Distribusi Kas RT 01-05</div>
              </div>

              {/* 7. Surat Pengantar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Surat Pengantar</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{lettersCount} Berkas</div>
                <div className="text-[10px] text-purple-700 font-medium mt-0.5">Pengajuan Administrasi</div>
              </div>

              {/* 8. Inventaris RW */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Inventaris RW</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{inventoryCount} Item</div>
                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">Barang & Aset Warga</div>
              </div>

              {/* 9. Pengaduan Warga */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-rose-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Pengaduan Warga</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{complaintsCount} Laporan</div>
                <div className="text-[10px] text-rose-700 font-medium mt-0.5">Aspirasi & Laporan Lingkungan</div>
              </div>

              {/* 10. Pengumuman */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-violet-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Pengumuman</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{announcementsCount} Info</div>
                <div className="text-[10px] text-violet-700 font-medium mt-0.5">Informasi Publik RW</div>
              </div>

              {/* 11. Agenda Kegiatan */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Agenda Kegiatan</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{eventsCount} Agenda</div>
                <div className="text-[10px] text-sky-700 font-medium mt-0.5">Jadwal Acara Warga</div>
              </div>

              {/* 12. Pengguna Sistem */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 truncate">Pengguna Sistem</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{usersCount} Akun</div>
                <div className="text-[10px] text-slate-600 font-medium mt-0.5">Warga & IT Super Admin</div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={handlePushPublish}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Menyinkronkan Data ke Server Cloud...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-5 h-5" />
                  <span>🚀 Sinkronkan Data Saat Ini ke Link Publish Sekarang</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Tombol ini akan membakar (commit) seluruh inputan saat ini ke server pusat sehingga siapapun yang membuka tautan publik melihat data yang sama.
            </p>
          </div>

          {/* Backup & Restore Utility */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Opsi Cadangan & Pemulihan Tambahan</span>
            </div>
            {/* Google Drive Direct Cloud Backup */}
            <div className="mb-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-emerald-50/80 border border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                    <span>Google Drive Cloud Backup</span>
                    {isDriveConnected && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        Terhubung
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {isDriveConnected && googleUser 
                      ? `Akun: ${googleUser.email || googleUser.displayName}`
                      : 'Simpan snapshot basis data ke Google Drive Anda'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackupToGoogleDrive}
                disabled={isDriveBackingUp}
                className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs transition-colors shrink-0"
              >
                {isDriveBackingUp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencadangkan ke Drive...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{isDriveConnected ? 'Cadangkan ke Google Drive' : 'Hubungkan & Cadangkan ke Drive'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Unduh Cadangan JSON (.json)</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Pulihkan dari File JSON</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-emerald-700" />
            <span>Digital RW 03 Full-Stack Persistence Engine</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
