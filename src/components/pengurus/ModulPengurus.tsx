import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  ShieldCheck, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  RefreshCw, 
  X,
  Phone,
  Mail,
  MapPin,
  Lock,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';

interface ModulPengurusProps {
  currentUser: User;
  onNavigateTab: (tab: ActiveTab) => void;
}

type RoleFilter = 'semua' | 'rw' | 'bendahara' | '01' | '02' | '03' | '04' | '05';

export const ModulPengurus: React.FC<ModulPengurusProps> = ({ currentUser, onNavigateTab }) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('semua');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Subscribe to storage changes
  React.useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setUsers(StorageService.getUsers());
    });
    return unsubscribe;
  }, []);

  // Form states for Add / Edit
  const [formRoleType, setFormRoleType] = useState<'rw' | 'bendahara' | '01' | '02' | '03' | '04' | '05'>('01');
  const [formNama, setFormNama] = useState('');
  const [formJabatan, setFormJabatan] = useState('Ketua RT');
  const [formNik, setFormNik] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Password visibility map for list view
  const [visiblePasswords, setVisiblePasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reset password form state
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const refreshUserList = () => {
    setUsers(StorageService.getUsers());
  };

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Filter pengurus (role ketua_rw, bendahara, dan pengurus_rt)
  const pengurusList = users.filter(u => u.role === 'ketua_rw' || u.role === 'bendahara' || u.role === 'pengurus_rt');

  // Filter berdasarkan tab role
  const filteredPengurus = pengurusList.filter(u => {
    // Role filter
    if (roleFilter === 'rw' && u.role !== 'ketua_rw') return false;
    if (roleFilter === 'bendahara' && u.role !== 'bendahara') return false;
    if (roleFilter === '01' && (u.role !== 'pengurus_rt' || u.RT !== '01')) return false;
    if (roleFilter === '02' && (u.role !== 'pengurus_rt' || u.RT !== '02')) return false;
    if (roleFilter === '03' && (u.role !== 'pengurus_rt' || u.RT !== '03')) return false;
    if (roleFilter === '04' && (u.role !== 'pengurus_rt' || u.RT !== '04')) return false;
    if (roleFilter === '05' && (u.role !== 'pengurus_rt' || u.RT !== '05')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNama = u.nama.toLowerCase().includes(q);
      const matchNik = u.NIK.includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchHp = u.nomorHP.includes(q);
      const matchJabatan = (u.jabatan || '').toLowerCase().includes(q);
      return matchNama || matchNik || matchEmail || matchHp || matchJabatan;
    }
    return true;
  });

  // Hitung jumlah pengurus per role
  const countRw = pengurusList.filter(u => u.role === 'ketua_rw').length;
  const countBendahara = pengurusList.filter(u => u.role === 'bendahara').length;
  const countRt01 = pengurusList.filter(u => u.role === 'pengurus_rt' && u.RT === '01').length;
  const countRt02 = pengurusList.filter(u => u.role === 'pengurus_rt' && u.RT === '02').length;
  const countRt03 = pengurusList.filter(u => u.role === 'pengurus_rt' && u.RT === '03').length;
  const countRt04 = pengurusList.filter(u => u.role === 'pengurus_rt' && u.RT === '04').length;
  const countRt05 = pengurusList.filter(u => u.role === 'pengurus_rt' && u.RT === '05').length;

  const handleOpenAddModal = (defaultRole: 'rw' | 'bendahara' | '01' | '02' | '03' | '04' | '05' = '01') => {
    setFormRoleType(defaultRole);
    setFormNama('');
    setFormJabatan(defaultRole === 'rw' ? 'Ketua RW 03' : defaultRole === 'bendahara' ? 'Bendahara RW 03' : `Ketua RT ${defaultRole}`);
    setFormNik('');
    setFormEmail('');
    setFormHp('');
    setFormPassword(defaultRole === 'rw' ? 'Rw03#2026' : defaultRole === 'bendahara' ? 'Bendahara#2026' : `Rt${defaultRole}#2026`);
    setFormAlamat('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleNikChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setFormNik(clean);
    if (clean.length === 16) {
      const foundWarga = users.find(u => u.NIK === clean);
      const foundResident = StorageService.getResidents().find(r => r.NIK === clean);
      const autoName = foundWarga?.nama || foundResident?.namaLengkap;
      if (autoName && !formNama.trim()) {
        setFormNama(autoName);
      }
    }
  };

  const handleRoleTypeChange = (val: 'rw' | 'bendahara' | '01' | '02' | '03' | '04' | '05') => {
    setFormRoleType(val);
    if (val === 'rw') {
      setFormJabatan('Ketua RW 03');
      setFormPassword('Rw03#2026');
    } else if (val === 'bendahara') {
      setFormJabatan('Bendahara RW 03');
      setFormPassword('Bendahara#2026');
    } else {
      setFormJabatan(`Ketua RT ${val}`);
      setFormPassword(`Rt${val}#2026`);
    }
  };

  const handleSaveNewPengurus = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNama = formNama.trim();
    const cleanNik = formNik.trim();
    const cleanPass = formPassword.trim();

    if (!cleanNama || !cleanNik || !cleanPass) {
      setFormError('Nama, NIK, dan Kata Sandi wajib diisi.');
      return;
    }

    if (cleanNik.length !== 16) {
      setFormError('Nomor Induk Kependudukan (NIK) harus tepat 16 digit.');
      return;
    }

    // Periksa apakah NIK sudah digunakan oleh pengurus lain yang sedang aktif di modul ini
    const existingPengurus = users.find(
      u => (u.role === 'ketua_rw' || u.role === 'bendahara' || u.role === 'pengurus_rt') && u.NIK === cleanNik
    );
    if (existingPengurus) {
      setFormError(`NIK ${cleanNik} sudah terdaftar sebagai pengurus aktif (${existingPengurus.jabatan || existingPengurus.role}) an. ${existingPengurus.nama}. Silakan perbarui data melalui menu edit jika diperlukan.`);
      return;
    }

    const isRw = formRoleType === 'rw';
    const isBendahara = formRoleType === 'bendahara';
    const role: UserRole = isBendahara ? 'bendahara' : isRw ? 'ketua_rw' : 'pengurus_rt';
    const rt = (isRw || isBendahara) ? '03' : formRoleType;

    // Jika warga sudah pernah terdaftar (misal akun warga biasa), angkat / jadikan sebagai Pengurus RT/RW
    const existingWarga = users.find(u => u.NIK === cleanNik);
    const userId = existingWarga ? existingWarga.userId : `usr-${isBendahara ? 'bendahara' : isRw ? 'rw' : `rt${rt}`}-${Date.now().toString().slice(-4)}`;

    const newUser: User = {
      ...(existingWarga || {}),
      userId: userId,
      nama: cleanNama,
      email: formEmail.trim() || (existingWarga?.email && existingWarga.email !== '-' ? existingWarga.email : '-'),
      nomorHP: formHp.trim() || (existingWarga?.nomorHP && existingWarga.nomorHP !== '-' ? existingWarga.nomorHP : '-'),
      NIK: cleanNik,
      password: cleanPass,
      role: role,
      jabatan: formJabatan.trim() || (isBendahara ? 'Bendahara RW 03' : isRw ? 'Pengurus RW 03' : `Pengurus RT ${rt}`),
      RT: rt,
      RW: '03',
      alamat: formAlamat.trim() || (existingWarga?.alamat && existingWarga.alamat !== '-' ? existingWarga.alamat : '-'),
      statusAkun: 'aktif',
      createdAt: existingWarga?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StorageService.addUser(newUser);
    StorageService.logAction(
      currentUser.userId,
      currentUser.nama,
      currentUser.role,
      'CREATE_USER',
      'Sistem',
      newUser.userId,
      `Super Admin IT RW 03 mendaftarkan Pengurus baru: ${newUser.nama} (${newUser.jabatan || newUser.role})`
    );

    refreshUserList();
    setIsAddModalOpen(false);
    showNotification(`Pengurus ${newUser.nama} (${newUser.jabatan}) berhasil didaftarkan dan langsung aktif!`);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormNama(user.nama);
    setFormJabatan(user.jabatan || (user.role === 'bendahara' ? 'Bendahara RW 03' : user.role === 'ketua_rw' ? 'Ketua RW 03' : `Pengurus RT ${user.RT}`));
    setFormNik(user.NIK);
    setFormEmail(user.email && user.email !== '-' ? user.email : '');
    setFormHp(user.nomorHP && user.nomorHP !== '-' ? user.nomorHP : '');
    setFormAlamat(user.alamat && user.alamat !== '-' ? user.alamat : '');
    setFormRoleType(user.role === 'bendahara' ? 'bendahara' : user.role === 'ketua_rw' ? 'rw' : (user.RT as any) || '01');
    setFormError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const isRw = formRoleType === 'rw';
    const isBendahara = formRoleType === 'bendahara';
    const updatedRole: UserRole = isBendahara ? 'bendahara' : isRw ? 'ketua_rw' : 'pengurus_rt';
    const updatedRt = (isRw || isBendahara) ? '03' : formRoleType;

    const updated = StorageService.updateUser(editingUser.userId, {
      nama: formNama.trim(),
      jabatan: formJabatan.trim(),
      email: formEmail.trim() || '-',
      nomorHP: formHp.trim() || '-',
      alamat: formAlamat.trim() || '-',
      role: updatedRole,
      RT: updatedRt
    });

    if (updated) {
      StorageService.logAction(
        currentUser.userId,
        currentUser.nama,
        currentUser.role,
        'UPDATE_USER',
        'Sistem',
        editingUser.userId,
        `Super Admin IT RW 03 memperbarui profil Pengurus: ${updated.nama}`
      );
      refreshUserList();
      setEditingUser(null);
      showNotification(`Data pengurus ${updated.nama} berhasil diperbarui.`);
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setResettingUser(user);
    const suggested = user.role === 'bendahara' ? 'Bendahara#Baru2026' : user.role === 'ketua_rw' ? 'Rw03#Baru2026' : `Rt${user.RT}#Baru2026`;
    setNewPassword(suggested);
    setShowNewPassword(true);
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword.trim()) return;

    StorageService.updateUser(resettingUser.userId, {
      password: newPassword.trim()
    });

    StorageService.logAction(
      currentUser.userId,
      currentUser.nama,
      currentUser.role,
      'RESET_PASSWORD',
      'Sistem',
      resettingUser.userId,
      `Super Admin IT RW 03 mereset kata sandi akun ${resettingUser.nama}`
    );

    refreshUserList();
    showNotification(`Kata sandi akun ${resettingUser.nama} berhasil diperbarui menjadi: ${newPassword.trim()}`);
    setResettingUser(null);
  };

  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    
    // Cegah penghapusan akun super_admin
    if (deleteConfirmUser.role === 'super_admin') {
      showNotification('Akun Super Admin IT RW 03 tidak dapat dihapus demi keamanan sistem.');
      setDeleteConfirmUser(null);
      return;
    }

    const name = deleteConfirmUser.nama;
    const roleDesc = deleteConfirmUser.jabatan || deleteConfirmUser.role;
    const deletedId = deleteConfirmUser.userId;
    const deletedNik = deleteConfirmUser.NIK;

    const success = StorageService.deleteUser(deletedId);
    if (success) {
      // Perbarui state lokal secara instan
      setUsers(prev => prev.filter(u => u.userId !== deletedId && (!deletedNik || deletedNik === '-' || u.NIK !== deletedNik)));

      StorageService.logAction(
        currentUser.userId,
        currentUser.nama,
        currentUser.role,
        'DELETE_USER',
        'Sistem',
        deletedId,
        `Super Admin IT RW 03 menghapus akun Pengurus: ${name} (${roleDesc})`
      );

      refreshUserList();
      showNotification(`Akun pengurus an. ${name} (${roleDesc}) telah berhasil dihapus permanen dari seluruh data.`);
      setDeleteConfirmUser(null);
    } else {
      showNotification(`Gagal menghapus data pengurus ${name}. Data mungkin sudah tidak ada.`);
      setDeleteConfirmUser(null);
      refreshUserList();
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = formRoleType === 'rw' ? 'Rw03' : `Rt${formRoleType}`;
    setFormPassword(`${prefix}#${res}`);
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2 border border-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner - Khusus Super Admin */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-emerald-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-800/60 border border-emerald-600/40">
                MODUL & LAYANAN RW 03
              </span>
              <span>·</span>
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Khusus Super Admin
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-400" />
              <span>Pendaftaran & Manajemen Pengurus RT / RW</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Daftarkan dan tetapkan kredensial login akun Pengurus RW serta Pengurus RT (RT 01 s/d RT 05). Seluruh akun yang didaftarkan langsung aktif dan dapat digunakan untuk masuk ke sistem.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal('01')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Pengurus Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Jumlah Pengurus per Role */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        <div 
          onClick={() => setRoleFilter('rw')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'rw' 
              ? 'bg-emerald-50 border-emerald-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RW</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">RW 03</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRw} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Ketua RW 03</div>
        </div>

        <div 
          onClick={() => setRoleFilter('bendahara')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'bendahara' 
              ? 'bg-teal-50 border-teal-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Bendahara</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-100 text-teal-800 font-bold">RW 03</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countBendahara} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-teal-700 mt-0.5">Akses Setara RW</div>
        </div>

        <div 
          onClick={() => setRoleFilter('01')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === '01' 
              ? 'bg-sky-50 border-sky-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RT 01</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-100 text-sky-800 font-bold">RT 01</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRt01} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-sky-700 mt-0.5">Pengurus RT 01</div>
        </div>

        <div 
          onClick={() => setRoleFilter('02')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === '02' 
              ? 'bg-blue-50 border-blue-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RT 02</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">RT 02</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRt02} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-blue-700 mt-0.5">Pengurus RT 02</div>
        </div>

        <div 
          onClick={() => setRoleFilter('03')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === '03' 
              ? 'bg-indigo-50 border-indigo-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RT 03</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold">RT 03</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRt03} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-indigo-700 mt-0.5">Pengurus RT 03</div>
        </div>

        <div 
          onClick={() => setRoleFilter('04')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === '04' 
              ? 'bg-purple-50 border-purple-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RT 04</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">RT 04</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRt04} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-purple-700 mt-0.5">Pengurus RT 04</div>
        </div>

        <div 
          onClick={() => setRoleFilter('05')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            roleFilter === '05' 
              ? 'bg-amber-50 border-amber-500 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Role RT 05</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">RT 05</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{countRt05} <span className="text-xs font-normal text-slate-500">Akun</span></div>
          <div className="text-[10px] text-amber-700 mt-0.5">Pengurus RT 05</div>
        </div>
      </div>

      {/* Control Bar: Pencarian & Filter Role */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengurus, NIK, jabatan, email, atau no HP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRoleFilter('semua');
                setSearchQuery('');
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Tab Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setRoleFilter('semua')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === 'semua'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Pengurus ({pengurusList.length})
          </button>
          <button
            onClick={() => setRoleFilter('rw')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === 'rw'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Role RW ({countRw})
          </button>
          <button
            onClick={() => setRoleFilter('bendahara')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === 'bendahara'
                ? 'bg-teal-700 text-white font-semibold'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            Role Bendahara ({countBendahara})
          </button>
          <button
            onClick={() => setRoleFilter('01')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === '01'
                ? 'bg-sky-700 text-white font-semibold'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            Role RT 01 ({countRt01})
          </button>
          <button
            onClick={() => setRoleFilter('02')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === '02'
                ? 'bg-blue-700 text-white font-semibold'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Role RT 02 ({countRt02})
          </button>
          <button
            onClick={() => setRoleFilter('03')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === '03'
                ? 'bg-indigo-700 text-white font-semibold'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Role RT 03 ({countRt03})
          </button>
          <button
            onClick={() => setRoleFilter('04')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === '04'
                ? 'bg-purple-700 text-white font-semibold'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            Role RT 04 ({countRt04})
          </button>
          <button
            onClick={() => setRoleFilter('05')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              roleFilter === '05'
                ? 'bg-amber-700 text-white font-semibold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Role RT 05 ({countRt05})
          </button>
        </div>
      </div>

      {/* Daftar Pengurus */}
      <div className="space-y-3">
        {filteredPengurus.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Pengurus yang Sesuai</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ditemukan data akun pengurus untuk kriteria pencarian atau filter role ini.
            </p>
            <button
              onClick={() => handleOpenAddModal(roleFilter === 'semua' ? '01' : roleFilter)}
              className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Daftarkan Pengurus Baru</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPengurus.map(p => {
              const isRw = p.role === 'ketua_rw';
              const isBendahara = p.role === 'bendahara';
              const roleBadgeColor = isRw
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : isBendahara
                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                  : p.RT === '01'
                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                    : p.RT === '02'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : p.RT === '03'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : p.RT === '04'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300';

              const roleLabel = isRw ? 'ROLE RW (RW 03)' : isBendahara ? 'ROLE BENDAHARA (RW 03)' : `ROLE RT ${p.RT}`;
              const isPasswordVisible = !!visiblePasswords[p.userId];
              const displayPassword = p.password || 'Rt02#2026';

              return (
                <div
                  key={p.userId}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Nama, Jabatan & Badge Role */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
                          {p.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                            <span>{p.nama}</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Akun Aktif" />
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            {p.jabatan || (isBendahara ? 'Bendahara RW 03' : isRw ? 'Ketua RW 03' : `Pengurus RT ${p.RT}`)}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${roleBadgeColor} whitespace-nowrap uppercase tracking-wider`}>
                        {roleLabel}
                      </span>
                    </div>

                    {/* Kredensial Login (Khusus Super Admin untuk Mengelola) */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5 text-xs mb-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Kredensial Login Sistem</span>
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Status: Aktif</span>
                      </div>

                      {/* NIK (Username) */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>NIK Warga:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold text-slate-800">{p.NIK}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.NIK, `nik-${p.userId}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title="Salin NIK"
                          >
                            {copiedId === `nik-${p.userId}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Email Akun:</span>
                        </span>
                        <div className="flex items-center gap-1 max-w-[200px] truncate">
                          <span className="font-mono text-slate-700 truncate">
                            {p.email && p.email !== '-' ? p.email : '-'}
                          </span>
                          {p.email && p.email !== '-' && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.email, `email-${p.userId}`)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                              title="Salin Email"
                            >
                              {copiedId === `email-${p.userId}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>Kata Sandi:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {isPasswordVisible ? displayPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(p.userId)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title={isPasswordVisible ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(displayPassword, `pass-${p.userId}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title="Salin Kata Sandi"
                          >
                            {copiedId === `pass-${p.userId}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Informasi Kontak & Domisili */}
                    <div className="space-y-1 text-slate-600 text-xs mb-3">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>WhatsApp: {p.nomorHP || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{p.alamat && p.alamat !== '-' ? p.alamat : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Pengurus */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenResetPassword(p)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-amber-200"
                    >
                      <Key className="w-3 h-3" />
                      <span>Reset Sandi</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data Pengurus"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmUser(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Akun Pengurus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: DAFTARKAN PENGURUS BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  MODUL & LAYANAN RW 03
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Daftarkan Akun Pengurus RT / RW</span>
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveNewPengurus} className="p-5 sm:p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Pilih Hak Akses / Role */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  1. Pilih Hak Akses & Role Pengurus *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('rw')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === 'rw'
                        ? 'bg-emerald-800 text-white font-bold border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RW</div>
                    <div className="text-[9px] opacity-80">Ketua RW</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('bendahara')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === 'bendahara'
                        ? 'bg-teal-800 text-white font-bold border-teal-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                    }`}
                  >
                    <div className="text-[11px]">Role Bendahara</div>
                    <div className="text-[9px] opacity-80">Bendahara RW</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('01')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === '01'
                        ? 'bg-sky-800 text-white font-bold border-sky-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RT 01</div>
                    <div className="text-[9px] opacity-80">Wilayah 01</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('02')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === '02'
                        ? 'bg-blue-800 text-white font-bold border-blue-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RT 02</div>
                    <div className="text-[9px] opacity-80">Wilayah 02</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('03')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === '03'
                        ? 'bg-indigo-800 text-white font-bold border-indigo-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RT 03</div>
                    <div className="text-[9px] opacity-80">Wilayah 03</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('04')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === '04'
                        ? 'bg-purple-800 text-white font-bold border-purple-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RT 04</div>
                    <div className="text-[9px] opacity-80">Wilayah 04</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTypeChange('05')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      formRoleType === '05'
                        ? 'bg-amber-800 text-white font-bold border-amber-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    <div className="text-[11px]">Role RT 05</div>
                    <div className="text-[9px] opacity-80">Wilayah 05</div>
                  </button>
                </div>
              </div>

              {/* 2. Nama Lengkap & Jabatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={e => setFormNama(e.target.value)}
                    placeholder="Contoh: Rahmat Hidayat, S.E."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jabatan Struktural *
                  </label>
                  <input
                    type="text"
                    value={formJabatan}
                    onChange={e => setFormJabatan(e.target.value)}
                    placeholder={formRoleType === 'rw' ? 'Ketua RW 03 / Sekretaris RW' : formRoleType === 'bendahara' ? 'Bendahara RW 03' : `Ketua RT ${formRoleType} / Bendahara RT`}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. NIK (16 Digit untuk Login) */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nomor Induk Kependudukan (NIK) * <span className="font-normal text-slate-500 text-[11px]">(Digunakan untuk Login NIK)</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={formNik}
                  onChange={e => handleNikChange(e.target.value)}
                  placeholder="16 digit NIK pengurus"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {(() => {
                  if (formNik.length < 10) return null;
                  const foundW = users.find(u => u.NIK === formNik);
                  const foundR = StorageService.getResidents().find(r => r.NIK === formNik);
                  const wName = foundW?.nama || foundR?.namaLengkap;
                  if (!wName) return null;
                  const isAlreadyPengurus = foundW && (foundW.role === 'ketua_rw' || foundW.role === 'bendahara' || foundW.role === 'pengurus_rt');
                  return (
                    <div className={`mt-1.5 p-2 rounded-xl text-[11px] flex items-center justify-between ${
                      isAlreadyPengurus ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}>
                      <div>
                        <span className="font-bold">{isAlreadyPengurus ? 'Pengurus Terdaftar:' : 'Warga Terdata:'}</span> {wName}
                        <span className="block text-[10px] opacity-80">
                          {isAlreadyPengurus ? `Sudah aktif sebagai ${foundW.jabatan || foundW.role}.` : 'Akun warga ini akan langsung ditetapkan sebagai Pengurus RT/RW.'}
                        </span>
                      </div>
                      {!formNama && (
                        <button
                          type="button"
                          onClick={() => setFormNama(wName)}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-semibold cursor-pointer shrink-0 ml-2"
                        >
                          Pakai Nama
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 4. Kata Sandi Login */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Kata Sandi Akun Baru *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-emerald-700 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    Acak Sandi Aman
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Contoh: Rt01#2026"
                    required
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showFormPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 5. Kontak: Email & No. WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email Akun <span className="font-normal text-slate-400 text-[11px]">(Opsional - Tidak Wajib)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="Kosongkan jika tidak ada (opsional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Kolom email ini tidak wajib diisi.</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. WhatsApp / HP <span className="font-normal text-slate-400 text-[11px]">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formHp}
                    onChange={e => setFormHp(e.target.value)}
                    placeholder="0812... (opsional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Alamat Domisili */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alamat Kantor / Domisili <span className="font-normal text-slate-400 text-[11px]">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={formAlamat}
                  onChange={e => setFormAlamat(e.target.value)}
                  placeholder="Kosongkan jika tidak ada (opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Simpan & Terbitkan Akun Pengurus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DATA PENGURUS */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  EDIT PENGURUS
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                  <span>Ubah Profil {editingUser.nama}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Wilayah & Role
                  </label>
                  <select
                    value={formRoleType}
                    onChange={e => setFormRoleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="rw">Role RW (RW 03)</option>
                    <option value="bendahara">Role Bendahara (Bendahara RW 03)</option>
                    <option value="01">Role RT 01</option>
                    <option value="02">Role RT 02</option>
                    <option value="03">Role RT 03</option>
                    <option value="04">Role RT 04</option>
                    <option value="05">Role RT 05</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jabatan Struktural
                  </label>
                  <input
                    type="text"
                    value={formJabatan}
                    onChange={e => setFormJabatan(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Akun <span className="font-normal text-slate-400 text-[11px]">(Opsional - Tidak Wajib)</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Kosongkan jika tidak ada (opsional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    No. WhatsApp <span className="font-normal text-slate-400 text-[11px]">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formHp}
                    onChange={e => setFormHp(e.target.value)}
                    placeholder="0812... (opsional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Alamat Domisili / Kantor <span className="font-normal text-slate-400 text-[11px]">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formAlamat}
                    onChange={e => setFormAlamat(e.target.value)}
                    placeholder="Kosongkan jika tidak ada (opsional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET KATA SANDI */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                <h3 className="font-bold text-sm">Reset Kata Sandi Akun</h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Masukkan kata sandi baru untuk akun pengurus <strong>{resettingUser.nama}</strong> ({resettingUser.jabatan || resettingUser.role}):
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Terapkan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-sm">Hapus Akun Pengurus?</h4>
              <p className="text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus akun pengurus <strong>{deleteConfirmUser.nama}</strong> ({deleteConfirmUser.jabatan || deleteConfirmUser.role})? Akun ini tidak akan dapat login lagi ke sistem.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
