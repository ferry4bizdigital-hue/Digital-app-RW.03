import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  CreditCard, 
  ArrowUpRight, 
  X, 
  ShieldCheck, 
  Download,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Check,
  Building,
  UserCheck,
  Receipt,
  Store,
  Users,
  HeartHandshake
} from 'lucide-react';
import { DueBill, User, JenisIuran, WargaNgontrakUsaha } from '../../types';
import { StorageService } from '../../services/storageService';
import { ActiveTab } from '../layout/BottomNav';

interface ModulIuranProps {
  currentUser: User;
  onNavigateTab?: (tab: ActiveTab) => void;
}

type SortOption = 
  | 'status-unpaid' 
  | 'status-paid' 
  | 'nama-asc' 
  | 'nama-desc' 
  | 'nominal-desc' 
  | 'nominal-asc' 
  | 'tanggal-desc'
  | 'tanggal-asc';

export const ModulIuran: React.FC<ModulIuranProps> = ({ currentUser, onNavigateTab }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('status-unpaid');

  // Modal states
  const [paymentModalBill, setPaymentModalBill] = useState<DueBill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT'>('QRIS');
  const [isSuccessModal, setIsSuccessModal] = useState(false);

  // RT Input / Edit Modal States
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<DueBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<DueBill | null>(null);

  // Filter and Category States
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'keluarga' | 'ngontrak_usaha'>('all');

  // Form Fields for Add / Edit
  const [formWajibIuranTipe, setFormWajibIuranTipe] = useState<'keluarga' | 'ngontrak_usaha' | 'manual'>('keluarga');
  const [formWargaNgontrakId, setFormWargaNgontrakId] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formNomorKk, setFormNomorKk] = useState('');
  const [formRt, setFormRt] = useState(currentUser.RT || '02');
  const [formJenisIuran, setFormJenisIuran] = useState<JenisIuran>('IWD (Iuran Warga Digital)');
  const [formPeriode, setFormPeriode] = useState('September 2026');
  const [formNominal, setFormNominal] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState<'Belum Bayar' | 'Lunas'>('Belum Bayar');
  const [formTanggalBayar, setFormTanggalBayar] = useState(new Date().toISOString().substring(0, 10));
  const [formMetodeBayar, setFormMetodeBayar] = useState<'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT'>('Tunai ke Petugas RT');
  const [formError, setFormError] = useState('');

  const [dues, setDues] = useState<DueBill[]>(() => StorageService.getDues());
  const [allFamilies, setAllFamilies] = useState(() => StorageService.getFamilies());
  const [allWargaNgontrak, setAllWargaNgontrak] = useState<WargaNgontrakUsaha[]>(() => 
    StorageService.getWargaNgontrakUsaha()
  );

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setDues(StorageService.getDues());
      setAllFamilies(StorageService.getFamilies());
      setAllWargaNgontrak(StorageService.getWargaNgontrakUsaha());
    });
    return unsubscribe;
  }, []);

  const isWarga = currentUser.role === 'warga';
  const isRt = currentUser.role === 'pengurus_rt';
  const isKetuaRw = currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara';
  const isPrivileged = currentUser.role !== 'warga';
  // Hak akses input, ubah, dan hapus iuran: Pengurus RT, Super Admin, Ketua RW, dan Bendahara
  const canManageDues = currentUser.role === 'pengurus_rt' || currentUser.role === 'super_admin' || currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara';

  const { family: myWargaFamily } = StorageService.getFamilyForUser(currentUser);
  const isMatchWargaDue = (d: DueBill) => {
    return d.nomorKK === myWargaFamily.nomorKK || 
      d.namaKepalaKeluarga.toLowerCase() === myWargaFamily.namaKepalaKeluarga.toLowerCase() ||
      d.namaKepalaKeluarga.toLowerCase() === currentUser.nama.toLowerCase();
  };

  // Available families in current RT for quick dropdown selection sorted A - Z
  const rtFamilies = useMemo(() => {
    const targetRt = StorageService.normalizeRt(formRt || (isRt ? currentUser.RT : '01'));
    return allFamilies
      .filter(f => StorageService.normalizeRt(f.rt) === targetRt)
      .sort((a, b) => a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, 'id', { sensitivity: 'base' }));
  }, [allFamilies, isRt, currentUser.RT, formRt]);

  // Available ngontrak usaha sorted alphabetically (A - Z) by Nama Usaha
  const rtWargaNgontrak = useMemo(() => {
    return allWargaNgontrak
      .filter(w => isRt ? StorageService.normalizeRt(w.rt) === StorageService.normalizeRt(currentUser.RT) : true)
      .sort((a, b) => a.namaUsaha.localeCompare(b.namaUsaha, 'id', { sensitivity: 'base' }));
  }, [allWargaNgontrak, isRt, currentUser.RT]);

  // Check if directed from Daftar Warga Ngontrak Usaha to input IWD
  useEffect(() => {
    const rawTarget = sessionStorage.getItem('rw03_input_iwd_usaha');
    if (rawTarget) {
      sessionStorage.removeItem('rw03_input_iwd_usaha');
      try {
        const item: WargaNgontrakUsaha = JSON.parse(rawTarget);
        if (item && canManageDues) {
          handleOpenAddModal('ngontrak_usaha', item.id);
        }
      } catch (e) {
        console.warn('Failed parsing target usaha for IWD', e);
      }
    }
  }, [canManageDues, allWargaNgontrak]);

  // Filter dues based on Role & Criteria
  const filteredAndSortedDues = useMemo(() => {
    let list = dues.filter(d => {
      // If warga, see own bills only
      if (isWarga && !isMatchWargaDue(d)) {
        return false;
      }
      // If RT, strictly filter by their RT
      if (isRt && d.rt !== currentUser.RT) {
        return false;
      }
      // Filter Category
      if (selectedCategory === 'ngontrak_usaha') {
        const isUsaha = d.kategoriWarga === 'ngontrak_usaha' || !!d.wargaNgontrakUsahaId || d.nomorKK.startsWith('USAHA');
        if (!isUsaha) return false;
      } else if (selectedCategory === 'keluarga') {
        const isUsaha = d.kategoriWarga === 'ngontrak_usaha' || !!d.wargaNgontrakUsahaId || d.nomorKK.startsWith('USAHA');
        if (isUsaha) return false;
      }
      // Filter Status
      if (selectedStatus !== 'all' && d.status !== selectedStatus) {
        return false;
      }
      // Filter Period
      if (selectedPeriod !== 'all' && d.periode !== selectedPeriod) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.namaKepalaKeluarga.toLowerCase().includes(q);
        const matchKk = d.nomorKK.toLowerCase().includes(q);
        const matchJenis = d.jenisIuran.toLowerCase().includes(q);
        const matchUsaha = (d.namaUsaha || '').toLowerCase().includes(q);
        const matchCp = (d.namaCp || '').toLowerCase().includes(q);
        if (!matchName && !matchKk && !matchJenis && !matchUsaha && !matchCp) return false;
      }
      return true;
    });

    // Sorting for RT & Admin
    list.sort((a, b) => {
      switch (sortBy) {
        case 'status-unpaid': // Belum Bayar first
          if (a.status === 'Belum Bayar' && b.status !== 'Belum Bayar') return -1;
          if (a.status !== 'Belum Bayar' && b.status === 'Belum Bayar') return 1;
          return a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga);

        case 'status-paid': // Lunas first
          if (a.status === 'Lunas' && b.status !== 'Lunas') return -1;
          if (a.status !== 'Lunas' && b.status === 'Lunas') return 1;
          return a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga);

        case 'nama-asc':
          return a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga);

        case 'nama-desc':
          return b.namaKepalaKeluarga.localeCompare(a.namaKepalaKeluarga);

        case 'nominal-desc':
          return b.nominal - a.nominal;

        case 'nominal-asc':
          return a.nominal - b.nominal;

        case 'tanggal-desc':
          return (b.tanggalBayar || '').localeCompare(a.tanggalBayar || '');

        case 'tanggal-asc':
          return (a.tanggalBayar || '').localeCompare(b.tanggalBayar || '');

        default:
          return 0;
      }
    });

    return list;
  }, [dues, isWarga, isRt, currentUser, selectedStatus, selectedPeriod, searchQuery, sortBy]);

  // Dynamic Analytics Calculation based strictly on RT input data
  const rtScopeDues = useMemo(() => {
    return dues.filter(d => {
      if (isWarga) return isMatchWargaDue(d);
      if (isRt) return StorageService.normalizeRt(d.rt) === StorageService.normalizeRt(currentUser.RT);
      return true;
    });
  }, [dues, isWarga, isRt, currentUser.RT]);

  // 1. Matrik Iuran Warga Digital (IWD)
  const iwdDues = useMemo(() => {
    return rtScopeDues.filter(d => 
      !d.jenisIuran || d.jenisIuran.includes('IWD') || d.jenisIuran.includes('Digital')
    );
  }, [rtScopeDues]);

  const totalTargetIwd = iwdDues.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalLunasIwd = iwdDues
    .filter(d => d.status === 'Lunas')
    .reduce((acc, curr) => acc + curr.nominal, 0);
  const totalTunggakanIwd = totalTargetIwd - totalLunasIwd;
  const persenTerkumpulIwd = totalTargetIwd > 0 
    ? Math.round((totalLunasIwd / totalTargetIwd) * 100) 
    : 0;

  // 2. Matrik Iuran Sosial & Kematian
  const sosialDues = useMemo(() => {
    return rtScopeDues.filter(d => 
      d.jenisIuran && (d.jenisIuran.includes('Sosial') || d.jenisIuran.includes('Kematian'))
    );
  }, [rtScopeDues]);

  const totalTargetSosial = sosialDues.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalLunasSosial = sosialDues
    .filter(d => d.status === 'Lunas')
    .reduce((acc, curr) => acc + curr.nominal, 0);
  const totalTunggakanSosial = totalTargetSosial - totalLunasSosial;
  const persenTerkumpulSosial = totalTargetSosial > 0 
    ? Math.round((totalLunasSosial / totalTargetSosial) * 100) 
    : 0;

  // Total Keseluruhan
  const totalTargetPenerimaan = totalTargetIwd + totalTargetSosial;
  const totalLunas = totalLunasIwd + totalLunasSosial;
  const totalTunggakan = totalTargetPenerimaan - totalLunas;

  // Handlers for RT Input
  const handleOpenAddModal = (source: 'keluarga' | 'ngontrak_usaha' = 'keluarga', targetUsahaId?: string) => {
    if (!canManageDues) return;
    setEditingBill(null);
    setFormWajibIuranTipe(source);

    if (source === 'ngontrak_usaha') {
      const target = (targetUsahaId && allWargaNgontrak.find(w => w.id === targetUsahaId)) || rtWargaNgontrak[0];
      if (target) {
        setFormWargaNgontrakId(target.id);
        setFormNama(`${target.namaUsaha} (CP: ${target.namaCp})`);
        setFormNomorKk(`USAHA-${target.rt}-${target.id.toUpperCase()}`);
        setFormRt(target.rt);
      } else {
        setFormWargaNgontrakId('');
        setFormNama('');
        setFormNomorKk(`USAHA-${currentUser.RT || '02'}`);
        setFormRt(currentUser.RT || '02');
      }
    } else {
      const activeRt = StorageService.normalizeRt(currentUser.RT || '01');
      const sortedFamiliesInRt = allFamilies
        .filter(f => StorageService.normalizeRt(f.rt) === activeRt)
        .sort((a, b) => a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, 'id', { sensitivity: 'base' }));
      const firstFam = sortedFamiliesInRt[0];

      setFormWargaNgontrakId('');
      setFormNama(firstFam?.namaKepalaKeluarga || '');
      setFormNomorKk(firstFam?.nomorKK || '3273182405080001');
      setFormRt(activeRt);
    }

    setFormJenisIuran('IWD (Iuran Warga Digital)');
    setFormPeriode('September 2026');
    setFormNominal('');
    setFormStatus('Belum Bayar');
    setFormTanggalBayar(new Date().toISOString().substring(0, 10));
    setFormMetodeBayar('Tunai ke Petugas RT');
    setFormError('');
    setIsInputModalOpen(true);
  };

  const handleOpenEditModal = (bill: DueBill) => {
    if (!canManageDues) return;
    setEditingBill(bill);
    setFormWajibIuranTipe(bill.kategoriWarga || (bill.wargaNgontrakUsahaId ? 'ngontrak_usaha' : 'keluarga'));
    setFormWargaNgontrakId(bill.wargaNgontrakUsahaId || '');
    setFormNama(bill.namaKepalaKeluarga);
    setFormNomorKk(bill.nomorKK);
    setFormRt(bill.rt);
    setFormJenisIuran(bill.jenisIuran);
    setFormPeriode(bill.periode);
    setFormNominal(bill.nominal);
    setFormStatus(bill.status === 'Lunas' ? 'Lunas' : 'Belum Bayar');
    setFormTanggalBayar(bill.tanggalBayar ? bill.tanggalBayar.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setFormMetodeBayar(bill.metodeBayar || 'Tunai ke Petugas RT');
    setFormError('');
    setIsInputModalOpen(true);
  };

  const handleSelectFamily = (kkNomor: string) => {
    const fam = allFamilies.find(f => f.nomorKK === kkNomor);
    if (fam) {
      setFormNama(fam.namaKepalaKeluarga);
      setFormNomorKk(fam.nomorKK);
      setFormRt(fam.rt);
    }
  };

  const handleSelectNgontrakUsaha = (usahaId: string) => {
    setFormWargaNgontrakId(usahaId);
    const target = allWargaNgontrak.find(w => w.id === usahaId);
    if (target) {
      setFormNama(`${target.namaUsaha} (CP: ${target.namaCp})`);
      setFormNomorKk(`USAHA-${target.rt}-${target.id.toUpperCase()}`);
      setFormRt(target.rt);
    }
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageDues) return;
    if (!formNama.trim()) {
      setFormError('Nama wajib iuran wajib diisi.');
      return;
    }
    if (formNominal === '' || formNominal <= 0) {
      setFormError('Besaran nominal iuran harus lebih dari 0.');
      return;
    }

    // Validasi Duplikat: Cegah jika terjadi dua kali input Pilih Kepala Keluarga dengan Jenis Iuran dan Periode Tagihan yang sama
    const duplicateBill = dues.find(d => {
      if (editingBill && d.id === editingBill.id) return false;
      const samePeriod = d.periode.trim().toLowerCase() === formPeriode.trim().toLowerCase();
      if (!samePeriod) return false;

      const sameJenis = (d.jenisIuran || '').trim().toLowerCase() === formJenisIuran.trim().toLowerCase();
      if (!sameJenis) return false;

      if (formWajibIuranTipe === 'ngontrak_usaha') {
        const sameUsaha = formWargaNgontrakId && d.wargaNgontrakUsahaId === formWargaNgontrakId;
        const sameNama = d.namaKepalaKeluarga.trim().toLowerCase() === formNama.trim().toLowerCase();
        return sameUsaha || sameNama;
      }

      // Kategori Keluarga: cocokkan berdasarkan Nomor KK atau Nama Kepala Keluarga
      const cleanFormKk = (formNomorKk || '').trim();
      const sameKk = cleanFormKk && cleanFormKk !== '3273180000000000' && d.nomorKK.trim() === cleanFormKk;
      const sameNama = d.namaKepalaKeluarga.trim().toLowerCase() === formNama.trim().toLowerCase();
      return sameKk || sameNama;
    });

    if (duplicateBill) {
      setFormError(`Peringatan: Data tagihan ${formJenisIuran} untuk Kepala Keluarga "${formNama}" pada Periode "${formPeriode}" sudah ada sebelumnya. Penyimpanan digagalkan untuk mencegah data ganda.`);
      return;
    }

    const selectedUsaha = allWargaNgontrak.find(w => w.id === formWargaNgontrakId);
    const payload: Omit<DueBill, 'id'> = {
      jenisIuran: formJenisIuran,
      periode: formPeriode,
      nominal: Number(formNominal),
      nomorKK: formNomorKk || (formWajibIuranTipe === 'ngontrak_usaha' ? `USAHA-${formRt}` : '3273180000000000'),
      namaKepalaKeluarga: formNama.trim(),
      rt: formRt,
      status: formStatus,
      tanggalBayar: formStatus === 'Lunas' ? `${formTanggalBayar} 10:00` : undefined,
      metodeBayar: formStatus === 'Lunas' ? formMetodeBayar : undefined,
      kategoriWarga: formWajibIuranTipe,
      wargaNgontrakUsahaId: formWajibIuranTipe === 'ngontrak_usaha' ? formWargaNgontrakId : undefined,
      namaUsaha: selectedUsaha?.namaUsaha,
      namaCp: selectedUsaha?.namaCp
    };

    if (editingBill) {
      StorageService.updateDueBill(editingBill.id, payload);
    } else {
      StorageService.addDueBill(payload);
    }

    setIsInputModalOpen(false);
    setEditingBill(null);
  };

  const handleDeleteBill = () => {
    if (!canManageDues || !deletingBill) return;
    StorageService.deleteDueBill(deletingBill.id);
    setDeletingBill(null);
  };

  const handleQuickMarkPaid = (bill: DueBill) => {
    if (!canManageDues) return;
    const todayStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    StorageService.updateDueBill(bill.id, {
      status: 'Lunas',
      tanggalBayar: todayStr,
      metodeBayar: 'Tunai ke Petugas RT'
    });
  };

  const handleConfirmPaymentWarga = () => {
    if (!paymentModalBill) return;
    StorageService.payDueBill(paymentModalBill.id, paymentMethod);
    setPaymentModalBill(null);
    setIsSuccessModal(true);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {isRt 
                ? `Wilayah Kerja RT ${currentUser.RT} / RW 03` 
                : isKetuaRw 
                  ? 'Tingkat RW 03 · Monitoring Seluruh RT (Read-Only)' 
                  : isWarga 
                    ? 'Layanan Iuran Warga' 
                    : 'Tingkat RW 03'}
            </span>
            <span className="text-[11px] text-slate-400">· Tarif Berbeda Per Warga</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-700" />
            Pengelolaan Iuran Warga Digital (IWD) RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRt 
              ? `Input data, atur nominal spesifik per warga, verifikasi tanggal pembayaran & status lunas RT ${currentUser.RT}.`
              : isKetuaRw
                ? 'Rekapitulasi dan pemantauan data penerimaan Iuran Warga Digital (IWD) dari RT 01-05 (Read-Only).'
                : 'Sistem pencatatan dan pembayaran iuran lingkungan transparan dan akuntabel.'}
          </p>
        </div>

        {/* Action Button for RT / Super Admin / RW */}
        {canManageDues && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => handleOpenAddModal('keluarga')}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Input Iuran Warga Digital (IWD)"
            >
              <Plus className="w-4 h-4" />
              <span>Input Iuran Warga Digital (IWD)</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Stat Cards based on RT input data */}
      {isWarga ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <span className="text-xs text-emerald-800 font-medium block mb-1">
              Sudah Dibayarkan (Lunas)
            </span>
            <span className="text-xl font-bold text-emerald-800 tabular-nums">
              {totalLunas > 0 ? `Rp ${totalLunas.toLocaleString('id-ID')}` : '-'}
            </span>
            <span className="text-[11px] text-emerald-700 block mt-1">Telah diverifikasi sistem</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
            <span className="text-xs text-rose-800 font-medium block mb-1">
              Belum Dibayar
            </span>
            <span className="text-xl font-bold text-rose-800 tabular-nums">
              {totalTunggakan > 0 ? `Rp ${totalTunggakan.toLocaleString('id-ID')}` : '-'}
            </span>
            <span className="text-[11px] text-rose-700 block mt-1">
              {totalTunggakan > 0 ? 'Menunggu pembayaran' : 'Seluruh iuran tuntas'}
            </span>
          </div>
        </div>
      ) : (
        /* View for RT & Pengurus - Matrik IWD & Matrik Iuran Sosial & Kematian */
        <div className="space-y-4">
          {/* Matrik 1: Iuran Warga Digital (IWD) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: TOTAL TARGET PENERIMAAN IWD */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  TOTAL TARGET PENERIMAAN IWD
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1">
                Rp {totalTargetIwd.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                <span>{isRt ? `Data IWD RT ${currentUser.RT}` : 'Seluruh RT terdaftar'}</span>
                <span>{iwdDues.length} Tagihan Warga</span>
              </div>
            </div>

            {/* Card 2: PENERIMAAN IWD TERKUMPUL (LUNAS) */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  PENERIMAAN IWD TERKUMPUL (LUNAS)
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {persenTerkumpulIwd}%
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-900 tabular-nums font-mono mt-1">
                Rp {totalLunasIwd.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700 mt-2 pt-2 border-t border-emerald-100">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Disetorkan via Catat Transaksi</span>
                </span>
                <span>{iwdDues.filter(d => d.status === 'Lunas').length} KK Lunas</span>
              </div>
            </div>

            {/* Card 3: TUNGGAKAN IWD / BELUM LUNAS */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  TUNGGAKAN IWD / BELUM LUNAS
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-900 tabular-nums font-mono mt-1">
                Rp {totalTunggakanIwd.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-rose-700 mt-2 pt-2 border-t border-rose-100">
                <span>{totalTunggakanIwd > 0 ? 'Perlu tindak lanjut / penagihan RT' : 'Semua warga telah lunas'}</span>
                <span>{iwdDues.filter(d => d.status === 'Belum Bayar').length} KK Belum</span>
              </div>
            </div>
          </div>

          {/* Matrik 2: Iuran Sosial & Kematian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: TOTAL TARGET PENERIMAAN IURAN SOSIAL & KEMATIAN */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  TOTAL TARGET PENERIMAAN IURAN SOSIAL & KEMATIAN
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1">
                Rp {totalTargetSosial.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                <span>{isRt ? `Data Sosial & Kematian RT ${currentUser.RT}` : 'Seluruh RT terdaftar'}</span>
                <span>{sosialDues.length} Tagihan Warga</span>
              </div>
            </div>

            {/* Card 2: PENERIMAAN IURAN SOSIAL & KEMATIAN TERKUMPUL (LUNAS) */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  PENERIMAAN IURAN SOSIAL & KEMATIAN TERKUMPUL (LUNAS)
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {persenTerkumpulSosial}%
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-900 tabular-nums font-mono mt-1">
                Rp {totalLunasSosial.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700 mt-2 pt-2 border-t border-emerald-100">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Santunan duka & bantuan warga</span>
                </span>
                <span>{sosialDues.filter(d => d.status === 'Lunas').length} KK Lunas</span>
              </div>
            </div>

            {/* Card 3: TUNGGAKAN / BELUM LUNAS IURAN SOSIAL & KEMATIAN */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  TUNGGAKAN / BELUM LUNAS IURAN SOSIAL & KEMATIAN
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-900 tabular-nums font-mono mt-1">
                Rp {totalTunggakanSosial.toLocaleString('id-ID')}
              </div>
              <div className="flex items-center justify-between text-[11px] text-rose-700 mt-2 pt-2 border-t border-rose-100">
                <span>{totalTunggakanSosial > 0 ? 'Menunggu setoran dana sosial warga' : 'Semua iuran sosial tuntas'}</span>
                <span>{sosialDues.filter(d => d.status === 'Belum Bayar').length} KK Belum</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Keterhubungan & Sinkronisasi dengan Buku Kas RW 03 */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs border border-emerald-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-200">
                Terhubung & Sinkron Langsung ke Buku Kas dan Transparansi RW 03
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30 uppercase tracking-wider">
                Real-Time
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-0.5 leading-relaxed">
              Setiap pembayaran warga & usaha berstatus <strong className="text-white">Lunas</strong> ({rtScopeDues.filter(d => d.status === 'Lunas').length} data · Rp {totalLunas.toLocaleString('id-ID')}) otomatis dicatat ke Buku Kas RW 03 sebagai Pemasukan.
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('keuangan')}
            className="px-3.5 py-2 bg-white text-emerald-950 font-bold rounded-xl text-xs hover:bg-emerald-100 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-sm active:scale-95"
            title="Buka Buku Kas dan Transparansi RW 03"
          >
            <span>Lihat Buku Kas RW 03</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Controls: Search, Sortir, and Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama kepala keluarga, nomor KK, atau jenis iuran..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs text-slate-800 bg-slate-50/50"
            />
          </div>

          {/* Sortir Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium px-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Sortir:</span>
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="status-unpaid">Status: Belum Bayar Dahulu</option>
              <option value="status-paid">Status: Lunas Dahulu</option>
              <option value="nama-asc">Nama Warga (A - Z)</option>
              <option value="nama-desc">Nama Warga (Z - A)</option>
              <option value="nominal-desc">Nominal IWD Tertinggi</option>
              <option value="nominal-asc">Nominal IWD Terendah</option>
              <option value="tanggal-desc">Tanggal Bayar (Terbaru)</option>
              <option value="tanggal-asc">Tanggal Bayar (Terlama)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status & Kategori Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Kategori:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({rtScopeDues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('keluarga')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedCategory === 'keluarga' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Warga/KK ({rtScopeDues.filter(d => d.kategoriWarga !== 'ngontrak_usaha' && !d.wargaNgontrakUsahaId && !d.nomorKK.startsWith('USAHA')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ngontrak_usaha')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'ngontrak_usaha' ? 'bg-teal-600 text-white shadow-2xs font-bold' : 'text-teal-700 hover:text-teal-900'
                  }`}
                >
                  <Store className="w-3 h-3" />
                  <span>Ngontrak Usaha ({rtScopeDues.filter(d => d.kategoriWarga === 'ngontrak_usaha' || !!d.wargaNgontrakUsahaId || d.nomorKK.startsWith('USAHA')).length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Status:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('Belum Bayar')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedStatus === 'Belum Bayar' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Belum Bayar ({rtScopeDues.filter(d => d.status === 'Belum Bayar').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('Lunas')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    selectedStatus === 'Lunas' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Lunas ({rtScopeDues.filter(d => d.status === 'Lunas').length})
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Periode:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">Semua Periode</option>
              <option value="September 2026">September 2026</option>
              <option value="Oktober 2026">Oktober 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dues Bills List */}
      <div className="space-y-3">
        {filteredAndSortedDues.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada data tagihan pada filter ini.</p>
            {canManageDues && (
              <button
                onClick={() => handleOpenAddModal('keluarga')}
                className="mt-3 px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input Iuran Pertama</span>
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedDues.map(due => {
            const isPaid = due.status === 'Lunas';
            return (
              <div
                key={due.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all ${
                  isPaid ? 'border-slate-200 hover:border-emerald-300' : 'border-rose-200 bg-rose-50/10 hover:border-rose-300'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{due.jenisIuran}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">({due.periode})</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPaid 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {isPaid ? '✓ Lunas' : 'Belum Bayar'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full">
                      RT {due.rt} / RW 03
                    </span>
                    {(due.kategoriWarga === 'ngontrak_usaha' || due.wargaNgontrakUsahaId || due.namaUsaha || due.nomorKK.startsWith('USAHA')) && (
                      <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                        <Store className="w-3 h-3 text-teal-600" />
                        <span>Ngontrak Usaha</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>
                      {(due.kategoriWarga === 'ngontrak_usaha' || due.wargaNgontrakUsahaId || due.namaUsaha || due.nomorKK.startsWith('USAHA'))
                        ? 'Nama Usaha / CP:' 
                        : 'Kepala Keluarga:'}{' '}
                      <strong className="text-slate-900">{due.namaKepalaKeluarga}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {(due.nomorKK.startsWith('USAHA')) ? `ID Usaha: ${due.nomorKK}` : `No. KK: ${StorageService.maskNik(due.nomorKK, false)}`}
                    </span>
                  </div>

                  {due.tanggalBayar && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dibayar pada: <strong>{due.tanggalBayar}</strong> via <strong>{due.metodeBayar || 'Tunai ke Petugas RT'}</strong></span>
                    </div>
                  )}

                  {!due.tanggalBayar && isPrivileged && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Menunggu pembayaran dari warga</span>
                    </div>
                  )}
                </div>

                {/* Right side: Nominal & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Nominal Khusus Warga</span>
                    <span className="font-bold text-lg sm:text-xl text-slate-900 tabular-nums font-mono">
                      Rp {due.nominal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Actions for RT / Super Admin */}
                  {canManageDues ? (
                    <div className="flex items-center gap-1.5">
                      {!isPaid && (
                        <button
                          onClick={() => handleQuickMarkPaid(due)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                          title="Tandai Pembayaran Lunas (Terima Tunai/Transfer)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tandai Lunas</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(due)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Ubah Nominal, Tanggal Bayar, atau Status"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingBill(due)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Data Tagihan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isWarga ? (
                    /* Warga payment button */
                    due.status === 'Belum Bayar' ? (
                      <button
                        onClick={() => setPaymentModalBill(due)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Bayar Sekarang</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lunas</span>
                      </span>
                    )
                  ) : (
                    /* Read-only status for Ketua RW */
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isPaid ? '✓ Terverifikasi Lunas' : 'Menunggu Setoran RT'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Input / Edit Data Iuran Warga (Khusus RT & Pengurus) */}
      {isInputModalOpen && canManageDues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingBill ? 'Ubah Data Iuran Warga' : 'Input Iuran Warga Digital (IWD)'}
                </h3>
              </div>
              <button 
                onClick={() => setIsInputModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-5 sm:p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Pilihan Sumber Wajib Iuran */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Kategori Wajib Iuran:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormWajibIuranTipe('keluarga');
                      if (rtFamilies.length > 0) {
                        setFormNama(rtFamilies[0].namaKepalaKeluarga);
                        setFormNomorKk(rtFamilies[0].nomorKK);
                        setFormRt(rtFamilies[0].rt);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      formWajibIuranTipe === 'keluarga'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>Warga / KK ({rtFamilies.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormWajibIuranTipe('ngontrak_usaha');
                      if (rtWargaNgontrak.length > 0) {
                        handleSelectNgontrakUsaha(rtWargaNgontrak[0].id);
                      } else {
                        setFormNama('');
                        setFormNomorKk(`USAHA-${formRt}`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      formWajibIuranTipe === 'ngontrak_usaha'
                        ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Store className="w-4 h-4 text-teal-700" />
                    <span>Warga Ngontrak Usaha ({rtWargaNgontrak.length})</span>
                  </button>
                </div>
              </div>

              {/* Input Fields Sesuai Kategori */}
              {formWajibIuranTipe === 'ngontrak_usaha' ? (
                <div className="space-y-3 p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl">
                  <div>
                    <label className="font-bold text-teal-950 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-teal-700" />
                        <span>Pilih dari Daftar Warga Terdata Ngontrak Usaha (A - Z):</span>
                      </span>
                      <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full font-bold">
                        RT {formRt}
                      </span>
                    </label>

                    {rtWargaNgontrak.length > 0 ? (
                      <select
                        value={formWargaNgontrakId}
                        onChange={e => handleSelectNgontrakUsaha(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-teal-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none font-semibold shadow-2xs"
                      >
                        {rtWargaNgontrak.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.namaUsaha} — CP: {w.namaCp} (RT {w.rt} / RW 03)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Belum ada data warga ngontrak usaha di RT {formRt}. Anda dapat mengetikkan nama usaha dan CP secara manual di bawah.
                      </p>
                    )}
                  </div>

                  {/* Detail Kartu Informasi Warga Ngontrak Usaha Terpilih */}
                  {(() => {
                    const sel = allWargaNgontrak.find(w => w.id === formWargaNgontrakId);
                    if (!sel) return null;
                    return (
                      <div className="p-3 bg-white/90 border border-teal-200/80 rounded-xl space-y-1.5 text-xs text-teal-950 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-950 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-teal-700" />
                            <span>{sel.namaUsaha}</span>
                          </span>
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                            RT {sel.rt} / RW 03
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1 border-t border-teal-100">
                          <div>
                            <span className="text-teal-700 font-medium">Nama CP:</span>{' '}
                            <strong>{sel.namaCp}</strong>
                          </div>
                          <div>
                            <span className="text-teal-700 font-medium">No. HP / WA:</span>{' '}
                            <span className="font-mono">{sel.nomorHpCp || '-'}</span>
                          </div>
                          <div>
                            <span className="text-teal-700 font-medium">Kategori Usaha:</span>{' '}
                            <span>{sel.jenisUsaha || 'Usaha / Perdagangan'}</span>
                          </div>
                          <div>
                            <span className="text-teal-700 font-medium">Status Kontrak:</span>{' '}
                            <span className="font-semibold text-emerald-700">{sel.statusSewa || 'Aktif'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-teal-700 font-medium">Lokasi Kios:</span>{' '}
                            <span className="text-slate-700">{sel.alamatLokasi || `Wilayah RT ${sel.rt} / RW 03`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Usaha & Penanggung Jawab (CP):
                    </label>
                    <input
                      type="text"
                      value={formNama}
                      onChange={e => setFormNama(e.target.value)}
                      placeholder="Contoh: Warung Nasi Barokah (CP: Ahmad Kosasih)"
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-white text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* 1. Pilih Warga / Kepala Keluarga */
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pilih Kepala Keluarga di RT {formRt}:
                  </label>
                  {rtFamilies.length > 0 && !editingBill ? (
                    <select
                      value={formNomorKk}
                      onChange={e => handleSelectFamily(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {rtFamilies.map(f => (
                        <option key={f.nomorKK} value={f.nomorKK}>
                          {f.namaKepalaKeluarga} · RT {f.rt} (No. KK: {f.nomorKK})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formNama}
                      onChange={e => setFormNama(e.target.value)}
                      placeholder="Nama Kepala Keluarga"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-semibold"
                    />
                  )}
                </div>
              )}

              {/* Grid KK & Wilayah */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Kartu Keluarga (KK):</label>
                  <input
                    type="text"
                    value={formNomorKk}
                    onChange={e => setFormNomorKk(e.target.value)}
                    placeholder="327318..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wilayah RT:</label>
                  <input
                    type="text"
                    value={`RT ${formRt} / RW 03`}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Periode & Jenis Iuran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Iuran:</label>
                  <select
                    value={formJenisIuran}
                    onChange={e => setFormJenisIuran(e.target.value as JenisIuran)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="IWD (Iuran Warga Digital)">IWD (Iuran Warga Digital)</option>
                    <option value="Sosial & Kematian">Sosial & Kematian</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periode Tagihan:</label>
                  <select
                    value={formPeriode}
                    onChange={e => setFormPeriode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="September 2026">September 2026</option>
                    <option value="Oktober 2026">Oktober 2026</option>
                    <option value="November 2026">November 2026</option>
                    <option value="Desember 2026">Desember 2026</option>
                  </select>
                </div>
              </div>

              {/* 2. Besaran Nominal Iuran (Masing-masing warga berbeda) */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 block">
                    Besaran Nominal IWD Warga Ini:
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Tarif Berbeda Tiap Warga
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={typeof formNominal === 'number' && formNominal > 0 ? formNominal.toLocaleString('id-ID') : (formNominal || '')}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setFormNominal(raw === '' ? '' : parseInt(raw, 10));
                    }}
                    placeholder="Masukkan besaran nominal"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-emerald-300 bg-white text-base font-bold text-slate-900 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 pt-0.5">
                  Ketikkan nominal iuran warga secara langsung sesuai ketetapan masing-masing warga.
                </p>
              </div>

              {/* 3. Status Pembayaran & Tanggal Bayar */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Pembayaran:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      formStatus === 'Belum Bayar' 
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="status"
                        checked={formStatus === 'Belum Bayar'}
                        onChange={() => setFormStatus('Belum Bayar')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Belum Bayar</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      formStatus === 'Lunas' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="status"
                        checked={formStatus === 'Lunas'}
                        onChange={() => setFormStatus('Lunas')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Lunas (Sudah Dibayar)</span>
                    </label>
                  </div>
                </div>

                {/* Conditional Fields if Lunas: Tanggal Bayar & Metode */}
                {formStatus === 'Lunas' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tanggal Pembayaran:</span>
                      </label>
                      <input
                        type="date"
                        value={formTanggalBayar}
                        onChange={e => setFormTanggalBayar(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Metode Bayar:</label>
                      <select
                        value={formMetodeBayar}
                        onChange={e => setFormMetodeBayar(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="Tunai ke Petugas RT">Tunai ke Petugas RT</option>
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="QRIS">QRIS</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {editingBill ? 'Simpan Perubahan' : 'Simpan Data Iuran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBill && canManageDues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus Data Iuran?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Yakin ingin menghapus tagihan <strong>{deletingBill.jenisIuran}</strong> an. <strong>{deletingBill.namaKepalaKeluarga}</strong> ({deletingBill.periode}) sebesar Rp {deletingBill.nominal.toLocaleString('id-ID')}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingBill(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteBill}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Simulator Modal for Warga (QRIS & Bank Transfer) */}
      {paymentModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Pembayaran Iuran Digital</h3>
              <button onClick={() => setPaymentModalBill(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-emerald-900 font-semibold block">{paymentModalBill.jenisIuran}</span>
                <div className="flex items-center justify-between text-slate-800">
                  <span>Periode {paymentModalBill.periode}</span>
                  <strong className="text-base text-emerald-900 font-bold tabular-nums">
                    Rp {paymentModalBill.nominal.toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-2">Pilih Kanal Pembayaran:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      paymentMethod === 'QRIS' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1" />
                    <span>QRIS Instan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer Bank')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      paymentMethod === 'Transfer Bank' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span>Virtual Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Tunai ke Petugas RT')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      paymentMethod === 'Tunai ke Petugas RT' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-2xs' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-5 h-5 mb-1" />
                    <span>Tunai ke RT</span>
                  </button>
                </div>
              </div>

              {/* QRIS Display Container */}
              {paymentMethod === 'QRIS' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="w-36 h-36 bg-white p-2 border border-slate-300 rounded-xl mx-auto flex items-center justify-center shadow-inner">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    NMID: ID1020260903001 (QRIS RW.03 Kebon Kangkung)
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Dapat di-scan dengan GoPay, OVO, Dana, BCA Mobile, Livin, dll.
                  </span>
                </div>
              )}

              {paymentMethod === 'Transfer Bank' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-slate-500 text-[11px] block">Nomor Virtual Account Bank BJB:</span>
                  <div className="font-mono text-base font-bold text-slate-900 select-all">
                    8832-7318-0302-0001
                  </div>
                  <span className="text-[11px] text-slate-600 block">
                    Atas Nama: Kas RW 03 Kebon Kangkung
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setPaymentModalBill(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmPaymentWarga}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Konfirmasi Pembayaran Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      {isSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Pembayaran Berhasil!</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Iuran Anda telah tercatat lunas dan bukti pembayaran otomatis tersimpan di buku kas RW.
            </p>
            <button
              onClick={() => setIsSuccessModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
