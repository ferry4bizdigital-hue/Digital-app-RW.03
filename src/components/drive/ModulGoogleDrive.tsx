import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileArchive, 
  FileCode, 
  File as FileGeneric, 
  Upload, 
  FolderPlus, 
  RefreshCw, 
  Download, 
  Trash2, 
  ExternalLink, 
  Search, 
  ChevronRight, 
  HardDrive, 
  CloudCheck, 
  AlertTriangle, 
  Database, 
  CheckCircle2, 
  X, 
  Loader2, 
  LogOut,
  FolderTree,
  Sparkles
} from 'lucide-react';
import { GoogleDriveService, DriveItem, DriveQuota } from '../../services/googleDriveService';
import { 
  googleSignIn, 
  logoutGoogle, 
  subscribeGoogleAuth, 
  getCurrentGoogleUser, 
  isGoogleConnected 
} from '../../services/googleAuthService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { StorageService } from '../../services/storageService';
import { User as AppUser } from '../../types';

interface ModulGoogleDriveProps {
  currentUser?: AppUser;
}

interface BreadcrumbItem {
  id?: string;
  name: string;
}

export const ModulGoogleDrive: React.FC<ModulGoogleDriveProps> = ({ currentUser }) => {
  const [isConnected, setIsConnected] = useState(isGoogleConnected());
  const [googleUser, setGoogleUser] = useState(getCurrentGoogleUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive state
  const [items, setItems] = useState<DriveItem[]>([]);
  const [quota, setQuota] = useState<DriveQuota>({});
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: undefined, name: 'Drive Saya' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Confirmation dialogs (MANDATORY for destructive ops)
  const [fileToDelete, setFileToDelete] = useState<DriveItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Backup & Restore
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  const [fileToRestore, setFileToRestore] = useState<DriveItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // Subscribe to auth state
  useEffect(() => {
    const unsub = subscribeGoogleAuth((user, token) => {
      setIsConnected(!!token && !!user);
      setGoogleUser(user);
    });
    return unsub;
  }, []);

  // Load drive items
  const loadDriveContents = useCallback(async (folderId?: string, query?: string) => {
    if (!isConnected) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const [listResult, quotaResult] = await Promise.all([
        GoogleDriveService.listFiles(folderId, query),
        GoogleDriveService.getAboutInfo()
      ]);
      setItems(listResult.files);
      setQuota(quotaResult);
    } catch (err: any) {
      console.error('Error fetching drive content:', err);
      setAuthError(err.message || 'Gagal mengambil data dari Google Drive');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      loadDriveContents(currentFolderId, searchQuery);
    }
  }, [isConnected, currentFolderId, loadDriveContents]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsConnected(true);
        setGoogleUser(res.user);
        loadDriveContents();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk dengan Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setIsConnected(false);
      setGoogleUser(null);
      setItems([]);
      setBreadcrumbs([{ id: undefined, name: 'Drive Saya' }]);
      setCurrentFolderId(undefined);
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  };

  const handleOpenFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setSearchQuery('');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await GoogleDriveService.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadDriveContents(currentFolderId);
    } catch (err: any) {
      alert(`Gagal membuat folder: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSetupRwFolders = async () => {
    setIsLoading(true);
    try {
      const res = await GoogleDriveService.ensureRwFolderStructure();
      setBackupSuccessMessage(`Struktur folder "Digital RW 03 Kebon Kangkung" berhasil disiapkan di Google Drive!`);
      // Open the RW 03 folder
      setCurrentFolderId(res.rootFolder.id);
      setBreadcrumbs([
        { id: undefined, name: 'Drive Saya' },
        { id: res.rootFolder.id, name: res.rootFolder.name }
      ]);
      await loadDriveContents(res.rootFolder.id);
    } catch (err: any) {
      alert(`Gagal menyiapkan folder: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await GoogleDriveService.uploadFile(selectedFile, currentFolderId, uploadFileName.trim() || undefined);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadFileName('');
      await loadDriveContents(currentFolderId);
    } catch (err: any) {
      alert(`Gagal mengunggah file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Perform single-click full RW 03 database backup to Drive
  const handleBackupRwToDrive = async () => {
    setIsBackingUp(true);
    setBackupSuccessMessage(null);
    try {
      const payload = StorageService.getAllDataPayload();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Backup_RW03_Kebon_Kangkung_${timestamp}.json`;

      await GoogleDriveService.uploadJsonBackup(payload, fileName, currentFolderId);
      setBackupSuccessMessage(`Berhasil mencadangkan database RW 03 ke Google Drive (${fileName})!`);
      await loadDriveContents(currentFolderId);
    } catch (err: any) {
      alert(`Gagal mencadangkan ke Google Drive: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore database from Drive file
  const handleConfirmRestore = async () => {
    if (!fileToRestore) return;
    setIsRestoring(true);
    try {
      const textContent = await GoogleDriveService.downloadFileText(fileToRestore.id);
      const parsed = JSON.parse(textContent);
      
      const success = await StorageService.importDatabaseJson(parsed);
      if (success) {
        setRestoreSuccessMessage(`Data berhasil dipulihkan dari "${fileToRestore.name}". Memuat ulang halaman...`);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        alert('Gagal memulihkan data: Format berkas JSON tidak sesuai struktur RW 03');
      }
    } catch (err: any) {
      alert(`Gagal memulihkan database dari Drive: ${err.message}`);
    } finally {
      setIsRestoring(false);
      setFileToRestore(null);
    }
  };

  // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE ACTION
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await GoogleDriveService.deleteFile(fileToDelete.id);
      setFileToDelete(null);
      await loadDriveContents(currentFolderId);
    } catch (err: any) {
      alert(`Gagal menghapus file: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (item: DriveItem) => {
    if (item.isFolder) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    const name = item.name.toLowerCase();
    const mime = item.mimeType.toLowerCase();

    if (name.endsWith('.json') || mime.includes('json')) {
      return <FileCode className="w-5 h-5 text-emerald-600" />;
    }
    if (mime.includes('image') || name.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      return <FileImage className="w-5 h-5 text-purple-600" />;
    }
    if (mime.includes('spreadsheet') || mime.includes('excel') || name.match(/\.(xlsx|xls|csv)$/)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-700" />;
    }
    if (mime.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) {
      return <FileArchive className="w-5 h-5 text-indigo-600" />;
    }
    return <FileGeneric className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '-';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Format quota display
  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 GB';
    const num = parseInt(bytesStr, 10);
    if (isNaN(num)) return '0 GB';
    return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const quotaPercent = quota.limit && quota.usage 
    ? Math.min(100, Math.round((parseInt(quota.usage, 10) / parseInt(quota.limit, 10)) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4 animate-in fade-in duration-200">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-emerald-500 to-amber-500 p-0.5 shadow-sm shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Google Drive Digital RW 03</h1>
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terhubung
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Simpan berkas surat pengantar, bukti kas & iuran, serta cadangkan seluruh database warga ke Google Drive cloud secara aman.
            </p>
          </div>
        </div>

        {/* Account Status / Connect Button */}
        <div>
          {isConnected && googleUser ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 sm:px-3 sm:py-2 rounded-xl">
              {googleUser.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt={googleUser.displayName || 'Google User'} 
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                  {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 pr-1">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {googleUser.displayName || 'Akun Google'}
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                  {googleUser.email}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Putuskan Akun Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={handleSignIn}
              isLoading={isLoggingIn}
              text="Hubungkan Google Drive"
            />
          )}
        </div>
      </div>

      {authError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Perhatian:</span> {authError}
          </div>
          <button onClick={() => setAuthError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {backupSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{backupSuccessMessage}</div>
          <button onClick={() => setBackupSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {restoreSuccessMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{restoreSuccessMessage}</div>
        </div>
      )}

      {!isConnected ? (
        /* Empty / Not Connected State */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <HardDrive className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
            Integrasikan Google Drive ke Sistem RW 03
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Hubungkan akun Google Drive Anda untuk mulai mencadangkan basis data kependudukan RW 03 secara otomatis, mengarsipkan surat pengantar resmi, serta menyimpan dokumen lingkungan tanpa batas lokal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <Database className="w-5 h-5 text-emerald-700 mb-1.5" />
              <div className="font-bold text-xs text-slate-800">Cadangan Cloud 1-Klik</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Simpan snapshot database lengkap ke Google Drive kapan saja.</div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <FolderTree className="w-5 h-5 text-blue-600 mb-1.5" />
              <div className="font-bold text-xs text-slate-800">Folder Resmi RW 03</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Otomatis buat struktur folder Arsip Surat, Kas & Iuran.</div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <CloudCheck className="w-5 h-5 text-amber-600 mb-1.5" />
              <div className="font-bold text-xs text-slate-800">Sinkron Aman</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Token tersimpan aman di memori sesuai protokol resmi Google.</div>
            </div>
          </div>

          <GoogleSignInButton
            onClick={handleSignIn}
            isLoading={isLoggingIn}
            text="Hubungkan dengan Google Drive Sekarang"
            className="w-full sm:w-auto"
          />
        </div>
      ) : (
        /* Connected Google Drive Explorer */
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Left Actions: Backup RW, Setup Folders, New Folder, Upload */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBackupRwToDrive}
                disabled={isBackingUp}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                title="Cadangkan seluruh database RW 03 ke Google Drive"
              >
                {isBackingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>Cadangkan Data RW 03</span>
              </button>

              <button
                onClick={handleSetupRwFolders}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Buat struktur folder standar RW 03 di Google Drive"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Folder Standar RW 03</span>
                <span className="sm:hidden">Struktur RW</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Unggah File</span>
              </button>

              <button
                onClick={() => setShowCreateFolder(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Folder Baru</span>
              </button>

              <button
                onClick={() => loadDriveContents(currentFolderId, searchQuery)}
                disabled={isLoading}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Segarkan"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-700' : ''}`} />
              </button>
            </div>

            {/* Right: Search & Quota */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari berkas di Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadDriveContents(currentFolderId, searchQuery);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-slate-50/50"
                />
              </div>

              {/* Storage Quota widget */}
              {quota.limit && (
                <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${quotaPercent > 85 ? 'bg-rose-500' : 'bg-emerald-600'}`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">
                    {formatBytes(quota.usage)} / {formatBytes(quota.limit)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 overflow-x-auto">
            <span className="font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> Lokasi:
            </span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || 'root'}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                <button
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  className={`hover:text-emerald-700 font-medium px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    idx === breadcrumbs.length - 1 ? 'text-emerald-800 font-bold bg-emerald-50' : 'text-slate-600'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* File & Folder Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-700 mb-2" />
                <p className="text-xs">Memuat berkas dari Google Drive...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Folder className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Folder ini kosong</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan tombol &quot;Unggah File&quot; atau &quot;Cadangkan Data RW 03&quot; untuk mulai menyimpan berkas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <div className="bg-slate-50/80 px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-6 sm:col-span-6">Nama Berkas</span>
                  <span className="col-span-3 sm:col-span-3">Terakhir Diubah</span>
                  <span className="hidden sm:inline sm:col-span-1">Ukuran</span>
                  <span className="col-span-3 sm:col-span-2 text-right">Aksi</span>
                </div>

                {items.map((item) => {
                  const isBackupJson = item.name.toLowerCase().startsWith('backup_rw03') && item.name.endsWith('.json');

                  return (
                    <div 
                      key={item.id}
                      className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50/80 transition-colors text-xs text-slate-700"
                    >
                      {/* Name & Icon */}
                      <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0 pr-2">
                        <div className="shrink-0">{getFileIcon(item)}</div>
                        <div className="min-w-0 flex-1">
                          {item.isFolder ? (
                            <button
                              onClick={() => handleOpenFolder(item)}
                              className="font-bold text-slate-900 hover:text-emerald-700 truncate block text-left cursor-pointer"
                            >
                              {item.name}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-medium text-slate-900 truncate">{item.name}</span>
                              {isBackupJson && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                  Backup RW
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 truncate sm:hidden">
                            {formatFileSize(item.size)} • {formatDate(item.modifiedTime)}
                          </div>
                        </div>
                      </div>

                      {/* Modified Date */}
                      <div className="col-span-3 sm:col-span-3 text-slate-500 text-[11px] truncate">
                        {formatDate(item.modifiedTime)}
                      </div>

                      {/* Size */}
                      <div className="hidden sm:inline sm:col-span-1 text-slate-500 text-[11px]">
                        {formatFileSize(item.size)}
                      </div>

                      {/* Action buttons */}
                      <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                        {/* Restore button if it's a backup JSON file */}
                        {isBackupJson && (
                          <button
                            onClick={() => setFileToRestore(item)}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Pulihkan database RW 03 dari cadangan ini"
                          >
                            <Database className="w-3 h-3 text-emerald-700" />
                            <span className="hidden md:inline">Restore</span>
                          </button>
                        )}

                        {/* Open in Google Drive */}
                        {item.webViewLink && (
                          <a
                            href={item.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors"
                            title="Buka di Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Download link if available */}
                        {item.webContentLink && (
                          <a
                            href={item.webContentLink}
                            download
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                            title="Unduh Berkas"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* MANDATORY: Delete with confirmation dialog */}
                        <button
                          onClick={() => setFileToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus dari Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: Buat Folder Baru --- */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-600" /> Buat Folder Baru
              </h3>
              <button onClick={() => setShowCreateFolder(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Arsip Surat 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Buat Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Unggah File --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Unggah Berkas ke Google Drive
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Berkas dari Perangkat
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !uploadFileName) {
                      setUploadFileName(f.name);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Simpan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    Ukuran: {formatFileSize(selectedFile.size.toString())}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Mulai Unggah</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: MANDATORY USER CONFIRMATION FOR DESTRUCTIVE DELETE --- */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Konfirmasi Hapus Berkas dari Google Drive
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus berkas <strong className="text-slate-900">&quot;{fileToDelete.name}&quot;</strong> dari Google Drive?
                </p>
                <p className="text-[11px] text-rose-600 font-medium mt-2 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                  Tindakan ini tidak dapat dibatalkan dan berkas akan dihapus secara permanen dari penyimpanan Google Drive Anda.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: RESTORE CONFIRMATION DIALOG --- */}
      {fileToRestore && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Pulihkan Basis Data dari Cadangan Drive
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Anda akan memulihkan data RW 03 dari file <strong className="text-slate-900">&quot;{fileToRestore.name}&quot;</strong>.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <strong>Penting:</strong> Data kependudukan, iuran, kas, dan surat yang saat ini ada di sistem akan digantikan oleh isi data dari cadangan ini.
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setFileToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Ya, Pulihkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
