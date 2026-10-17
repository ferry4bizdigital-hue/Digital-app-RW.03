import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  AlertCircle, 
  Plus, 
  Volume2, 
  Calendar,
  ArrowRight,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { User, Resident, FamilyCard } from '../../types';
import { ActiveTab } from '../layout/BottomNav';
import { FormWargaModal } from '../warga/FormWargaModal';

interface RtDashboardProps {
  currentUser: User;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const RtDashboard: React.FC<RtDashboardProps> = ({ currentUser, onNavigateTab }) => {
  const rtCode = StorageService.normalizeRt(currentUser.RT || '02');
  const [allResidents, setAllResidents] = useState<Resident[]>(() => StorageService.getResidents());
  const [allFamilies, setAllFamilies] = useState<FamilyCard[]>(() => StorageService.getFamilies());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setAllResidents(StorageService.getResidents());
      setAllFamilies(StorageService.getFamilies());
    });
    return unsubscribe;
  }, []);

  const residents = allResidents.filter(r => StorageService.normalizeRt(r.rt) === rtCode);
  const activeResidents = residents.filter(r => r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah');
  const deceasedResidents = residents.filter(r => r.statusWarga === 'Meninggal');
  const movedResidents = residents.filter(r => r.statusWarga === 'Pindah');
  const families = allFamilies.filter(f => StorageService.normalizeRt(f.rt) === rtCode);
  const complaints = StorageService.getComplaints().filter(c => StorageService.normalizeRt(c.rt) === rtCode);
  const events = StorageService.getEvents().filter(e => !e.rt || StorageService.normalizeRt(e.rt) === rtCode);
  const rtDues = StorageService.getDues().filter(d => StorageService.normalizeRt(d.rt) === rtCode);

  const handleSaveResident = (data: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>) => {
    data.rt = rtCode;
    const created = StorageService.addResident(data);
    setToastMessage(`Data warga baru an. ${created.namaLengkap} berhasil disimpan dan langsung tercatat pada Daftar Warga Terdata (A - Z)!`);
    setSuccessToast(true);
    setIsFormOpen(false);
    setTimeout(() => setSuccessToast(false), 5000);
  };

  const activeComplaints = complaints.filter(c => c.status === 'Baru' || c.status === 'Diproses');

  // Akurasi Kartu Keluarga: sinkron dengan data warga & kartu keluarga di RT
  const totalKkCount = families.length;

  // IWD RT Metrics
  const iwdTarget = rtDues.reduce((acc, curr) => acc + curr.nominal, 0);
  const iwdLunas = rtDues.filter(d => d.status === 'Lunas').reduce((acc, curr) => acc + curr.nominal, 0);
  const iwdTunggakan = iwdTarget - iwdLunas;

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-900 rounded-2xl p-5 text-white shadow-md">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 uppercase tracking-wider mb-1">
            <span>Wilayah Pelayanan Rukun Tetangga</span>
            <span aria-hidden="true">·</span>
            <span>RT {rtCode} / RW 03</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            Selamat Datang, {currentUser.nama}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Anda mengelola administrasi warga RT {rtCode}. Pengecekan data kependudukan, pemantauan kartu keluarga, pengelolaan iuran warga digital, dan koordinasi lingkungan terlaksana secara praktis.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-3.5 py-1.5 bg-white text-emerald-900 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Warga RT {rtCode}</span>
            </button>
            <button
              onClick={() => onNavigateTab('iuran')}
              className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Kelola Iuran (IWD) RT {rtCode}</span>
            </button>
            <button
              onClick={() => onNavigateTab('pengumuman')}
              className="px-3.5 py-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Info Khusus RT {rtCode}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Sinkron Kartu Keluarga dengan Data Warga) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Warga RT */}
        <div 
          onClick={() => onNavigateTab('warga')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Warga RT {rtCode}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {activeResidents.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Jiwa penduduk aktif di RT {rtCode}</span>
            {(deceasedResidents.length > 0 || movedResidents.length > 0) && (
              <span className="text-[10px] text-slate-400 font-medium">
                {[
                  movedResidents.length > 0 ? `${movedResidents.length} Pindah` : '',
                  deceasedResidents.length > 0 ? `${deceasedResidents.length} Meninggal` : ''
                ].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Kartu Keluarga (Sesuai dengan data warga) */}
        <div 
          onClick={() => {
            if (currentUser.role === 'super_admin') {
              onNavigateTab('kk');
            }
          }}
          className={`p-4 bg-white rounded-2xl border border-slate-200 transition-all shadow-2xs group ${
            currentUser.role === 'super_admin' ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Kartu Keluarga RT {rtCode}</span>
              {currentUser.role !== 'super_admin' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal">
                  Khusus Super Admin
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {totalKkCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Kepala keluarga terdaftar</span>
            {currentUser.role === 'super_admin' && (
              <span className="text-[10px] text-blue-700 font-semibold group-hover:underline">
                Kelola KK →
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Iuran Terkumpul RT */}
        <div 
          onClick={() => onNavigateTab('iuran')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Penerimaan IWD (Lunas)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums font-mono">
            Rp {iwdLunas.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {rtDues.filter(d => d.status === 'Lunas').length} dari {rtDues.length} KK telah lunas
          </div>
        </div>

        {/* Card 4: Pengaduan Lingkungan */}
        <div 
          onClick={() => onNavigateTab('pengaduan')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-700">Pengaduan RT {rtCode}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {activeComplaints.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeComplaints.length > 0 ? 'Perlu respon lingkungan' : 'Lingkungan kondusif'}
          </div>
        </div>
      </div>

      {/* Status Iuran Warga Digital (IWD) RT Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Iuran RT {rtCode}
              </span>
              <span className="text-xs text-slate-400">· Tarif Berbeda Tiap Warga</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              Status Penerimaan Iuran Warga Digital (IWD) RT {rtCode}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola besaran nominal iuran warga, tanggal pembayaran, dan status lunas warga RT {rtCode}.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('iuran')}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Kelola IWD RT {rtCode}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Metrics Cards for RT */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Target Penerimaan
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
              Rp {iwdTarget.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Berdasarkan {rtDues.length} data tagihan yang diinput RT {rtCode}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Penerimaan Terkumpul (Lunas)
            </span>
            <span className="text-xl font-bold text-emerald-900 font-mono block mt-1">
              Rp {iwdLunas.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              {rtDues.filter(d => d.status === 'Lunas').length} KK telah melunasi iuran
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              Tunggakan / Belum Lunas
            </span>
            <span className="text-xl font-bold text-rose-900 font-mono block mt-1">
              Rp {iwdTunggakan.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-rose-700 block mt-0.5">
              {rtDues.filter(d => d.status === 'Belum Bayar').length} KK belum membayar
            </span>
          </div>
        </div>
      </div>

      {/* Complaints in RT & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints in RT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Laporan Lingkungan RT {rtCode}
            </h3>
            <button
              onClick={() => onNavigateTab('pengaduan')}
              className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Buka Modul
            </button>
          </div>

          {complaints.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Belum ada laporan masalah lingkungan di RT {rtCode}.</p>
          ) : (
            <div className="space-y-3">
              {complaints.slice(0, 3).map(cmp => (
                <div
                  key={cmp.id}
                  onClick={() => onNavigateTab('pengaduan')}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{cmp.judul}</h4>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {cmp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{cmp.deskripsi}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Agenda */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Agenda Lingkungan RW & RT {rtCode}
            </h3>
            <button
              onClick={() => onNavigateTab('agenda')}
              className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 3).map(evt => (
              <div
                key={evt.id}
                onClick={() => onNavigateTab('agenda')}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
              >
                <div className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-mono text-center text-xs font-bold shrink-0">
                  {evt.tanggal.substring(8, 10)} SEP
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{evt.namaKegiatan}</h4>
                  <p className="text-[11px] text-slate-600">{evt.lokasi} · {evt.waktu}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => onNavigateTab('warga')}
            className="ml-2 text-emerald-400 underline hover:text-emerald-300 font-bold"
          >
            Lihat Daftar Warga (A - Z) →
          </button>
        </div>
      )}

      {/* Form Modal (Tambah Data Warga Baru) */}
      <FormWargaModal
        isOpen={isFormOpen}
        currentUser={currentUser}
        defaultRt={rtCode}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveResident}
      />
    </div>
  );
};
