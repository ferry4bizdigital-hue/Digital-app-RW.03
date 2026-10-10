import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  X, 
  Send, 
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Announcement, CommunityEvent, User as AppUser } from '../../types';
import { StorageService } from '../../services/storageService';

interface PengumumanAgendaProps {
  currentUser: AppUser;
  initialTab?: 'pengumuman' | 'agenda';
}

export const PengumumanAgenda: React.FC<PengumumanAgendaProps> = ({ currentUser, initialTab = 'pengumuman' }) => {
  const [activeTab, setActiveTab] = useState<'pengumuman' | 'agenda'>(initialTab);
  const [, setTick] = useState(0);

  // Sync with initialTab prop if changed from outside
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Subscribe to storage changes for instant real-time updates
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Toast message
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Hak akses edit & hapus diberikan kepada: Role RW (ketua_rw), Role Bendahara (bendahara), Role RT (pengurus_rt), dan Role Super Admin (super_admin)
  const canManage = currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara' || currentUser.role === 'pengurus_rt' || currentUser.role === 'super_admin';

  // --- Add Announcement State ---
  const [isAddAncOpen, setIsAddAncOpen] = useState(false);
  const [ancJudul, setAncJudul] = useState('');
  const [ancIsi, setAncIsi] = useState('');
  const [ancTarget, setAncTarget] = useState<Announcement['targetPenerima']>('semua_warga');
  const [ancTargetRt, setAncTargetRt] = useState('02');
  const [ancPrioritas, setAncPrioritas] = useState<Announcement['prioritas']>('normal');
  const [ancTanggalBerakhir, setAncTanggalBerakhir] = useState('');

  // --- Edit Announcement State ---
  const [editingAnc, setEditingAnc] = useState<Announcement | null>(null);
  const [editAncJudul, setEditAncJudul] = useState('');
  const [editAncIsi, setEditAncIsi] = useState('');
  const [editAncTarget, setEditAncTarget] = useState<Announcement['targetPenerima']>('semua_warga');
  const [editAncTargetRt, setEditAncTargetRt] = useState('02');
  const [editAncPrioritas, setEditAncPrioritas] = useState<Announcement['prioritas']>('normal');
  const [editAncTanggalBerakhir, setEditAncTanggalBerakhir] = useState('');

  // --- Delete Announcement State ---
  const [deletingAnc, setDeletingAnc] = useState<Announcement | null>(null);

  // --- Add Event State ---
  const [isAddEvtOpen, setIsAddEvtOpen] = useState(false);
  const [evtNama, setEvtNama] = useState('');
  const [evtDeskripsi, setEvtDeskripsi] = useState('');
  const [evtTanggal, setEvtTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [evtWaktu, setEvtWaktu] = useState('08:00 - 11:00 WIB');
  const [evtLokasi, setEvtLokasi] = useState('Balai RW 03');
  const [evtPJ, setEvtPJ] = useState(currentUser.nama);
  const [evtKategori, setEvtKategori] = useState<CommunityEvent['kategori']>('Kerja Bakti');

  // --- Edit Event State ---
  const [editingEvt, setEditingEvt] = useState<CommunityEvent | null>(null);
  const [editEvtNama, setEditEvtNama] = useState('');
  const [editEvtDeskripsi, setEditEvtDeskripsi] = useState('');
  const [editEvtTanggal, setEditEvtTanggal] = useState('');
  const [editEvtWaktu, setEditEvtWaktu] = useState('');
  const [editEvtLokasi, setEditEvtLokasi] = useState('');
  const [editEvtPJ, setEditEvtPJ] = useState('');
  const [editEvtKategori, setEditEvtKategori] = useState<CommunityEvent['kategori']>('Kerja Bakti');
  const [editEvtStatus, setEditEvtStatus] = useState<CommunityEvent['status']>('Akan Datang');

  // --- Delete Event State ---
  const [deletingEvt, setDeletingEvt] = useState<CommunityEvent | null>(null);

  const announcements = StorageService.getAnnouncements();
  const events = StorageService.getEvents();

  // Create Announcement Handler
  const handleCreateAnc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!ancJudul.trim() || !ancIsi.trim()) return;

    StorageService.addAnnouncement({
      judul: ancJudul.trim(),
      isi: ancIsi.trim(),
      targetPenerima: ancTarget,
      targetRt: ancTarget === 'rt_tertentu' ? ancTargetRt : undefined,
      penulis: currentUser.nama,
      penulisRole: currentUser.role === 'ketua_rw' 
        ? 'Ketua RW 03' 
        : currentUser.role === 'bendahara'
        ? 'Bendahara RW 03'
        : currentUser.role === 'pengurus_rt' 
        ? `Pengurus RT ${currentUser.RT}` 
        : 'Super Admin RW 03',
      prioritas: ancPrioritas,
      tanggalBerakhir: ancTanggalBerakhir.trim() || undefined
    });

    setIsAddAncOpen(false);
    setAncJudul('');
    setAncIsi('');
    setAncTanggalBerakhir('');
    showToast('Pengumuman baru berhasil dipublikasikan!');
  };

  // Open Edit Announcement Handler
  const handleOpenEditAnc = (anc: Announcement) => {
    if (!canManage) return;
    setEditingAnc(anc);
    setEditAncJudul(anc.judul);
    setEditAncIsi(anc.isi);
    setEditAncTarget(anc.targetPenerima);
    setEditAncTargetRt(anc.targetRt || '02');
    setEditAncPrioritas(anc.prioritas);
    setEditAncTanggalBerakhir(anc.tanggalBerakhir || '');
  };

  // Save Edit Announcement Handler
  const handleSaveEditAnc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !editingAnc) return;
    if (!editAncJudul.trim() || !editAncIsi.trim()) return;

    StorageService.updateAnnouncement(editingAnc.id, {
      judul: editAncJudul.trim(),
      isi: editAncIsi.trim(),
      targetPenerima: editAncTarget,
      targetRt: editAncTarget === 'rt_tertentu' ? editAncTargetRt : undefined,
      prioritas: editAncPrioritas,
      tanggalBerakhir: editAncTanggalBerakhir.trim() || undefined
    });

    setEditingAnc(null);
    showToast('Pengumuman berhasil diperbarui!');
  };

  // Confirm Delete Announcement Handler
  const handleConfirmDeleteAnc = () => {
    if (!canManage || !deletingAnc) return;
    StorageService.deleteAnnouncement(deletingAnc.id);
    setDeletingAnc(null);
    showToast('Pengumuman berhasil dihapus.');
  };

  // Create Event Handler
  const handleCreateEvt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!evtNama.trim()) return;

    StorageService.addEvent({
      namaKegiatan: evtNama.trim(),
      deskripsi: evtDeskripsi.trim(),
      tanggal: evtTanggal,
      waktu: evtWaktu.trim(),
      lokasi: evtLokasi.trim(),
      penanggungJawab: evtPJ.trim(),
      status: 'Akan Datang',
      kategori: evtKategori
    });

    setIsAddEvtOpen(false);
    setEvtNama('');
    setEvtDeskripsi('');
    showToast('Agenda kegiatan baru berhasil dijadwalkan!');
  };

  // Open Edit Event Handler
  const handleOpenEditEvt = (evt: CommunityEvent) => {
    if (!canManage) return;
    setEditingEvt(evt);
    setEditEvtNama(evt.namaKegiatan);
    setEditEvtDeskripsi(evt.deskripsi);
    setEditEvtTanggal(evt.tanggal);
    setEditEvtWaktu(evt.waktu);
    setEditEvtLokasi(evt.lokasi);
    setEditEvtPJ(evt.penanggungJawab);
    setEditEvtKategori(evt.kategori);
    setEditEvtStatus(evt.status);
  };

  // Save Edit Event Handler
  const handleSaveEditEvt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !editingEvt) return;
    if (!editEvtNama.trim()) return;

    StorageService.updateEvent(editingEvt.id, {
      namaKegiatan: editEvtNama.trim(),
      deskripsi: editEvtDeskripsi.trim(),
      tanggal: editEvtTanggal,
      waktu: editEvtWaktu.trim(),
      lokasi: editEvtLokasi.trim(),
      penanggungJawab: editEvtPJ.trim(),
      kategori: editEvtKategori,
      status: editEvtStatus
    });

    setEditingEvt(null);
    showToast('Agenda kegiatan lingkungan berhasil diperbarui!');
  };

  // Confirm Delete Event Handler
  const handleConfirmDeleteEvt = () => {
    if (!canManage || !deletingEvt) return;
    StorageService.deleteEvent(deletingEvt.id);
    setDeletingEvt(null);
    showToast('Agenda kegiatan lingkungan berhasil dihapus.');
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
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
            <Volume2 className="w-5 h-5 text-emerald-700" />
            Informasi Publik, Pengumuman & Agenda RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kanal resmi komunikasi pengurus RW 03 Kebon Kangkung kepada seluruh warga
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            {activeTab === 'pengumuman' ? (
              <button
                type="button"
                onClick={() => setIsAddAncOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengumuman</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddEvtOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Jadwalkan Agenda</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Switch Tab */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pengumuman')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'pengumuman' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Pengumuman Warga ({announcements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'agenda' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda Kegiatan Lingkungan ({events.length})</span>
        </button>
      </div>

      {/* Content: Pengumuman Tab */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Belum ada pengumuman warga yang dipublikasikan.
            </div>
          ) : (
            announcements.map(anc => (
              <div
                key={anc.id}
                className={`p-4 rounded-xl border bg-white shadow-2xs space-y-2 transition-all ${
                  anc.prioritas === 'darurat' ? 'border-rose-300 ring-1 ring-rose-200' :
                  anc.prioritas === 'penting' ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {anc.penulisRole}
                    </span>
                    {anc.targetPenerima === 'rt_tertentu' && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                        Khusus RT {anc.targetRt}
                      </span>
                    )}
                    {anc.prioritas !== 'normal' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        anc.prioritas === 'darurat' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {anc.prioritas}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Dipublikasikan: {anc.tanggalPublikasi}
                    </span>

                    {/* Akses Edit & Hapus Pengumuman untuk Role RW, Role RT, dan Super Admin */}
                    {canManage && (
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAnc(anc)}
                          className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Edit Pengumuman Warga"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAnc(anc)}
                          className="px-2 py-1 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Hapus Pengumuman Warga"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {anc.judul}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {anc.isi}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Penulis: {anc.penulis}</span>
                  {anc.tanggalBerakhir && <span>Berlaku hingga: {anc.tanggalBerakhir}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content: Agenda Tab */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs col-span-full">
              Belum ada agenda kegiatan lingkungan yang dijadwalkan.
            </div>
          ) : (
            events.map(evt => (
              <div
                key={evt.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {evt.kategori}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        evt.status === 'Selesai' 
                          ? 'bg-slate-100 text-slate-600' 
                          : evt.status === 'Dibatalkan'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {evt.status}
                      </span>

                      {/* Akses Edit & Hapus Agenda Kegiatan untuk Role RW, Role RT, dan Super Admin */}
                      {canManage && (
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvt(evt)}
                            className="p-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all cursor-pointer"
                            title="Edit Agenda Kegiatan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvt(evt)}
                            className="p-1 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg transition-all cursor-pointer"
                            title="Hapus Agenda Kegiatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">{evt.namaKegiatan}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {evt.deskripsi}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{evt.tanggal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{evt.waktu}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{evt.lokasi}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Penanggung Jawab: {evt.penanggungJawab}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Announcement Modal */}
      {isAddAncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Publikasikan Pengumuman Baru</h3>
              <button 
                type="button"
                onClick={() => setIsAddAncOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnc} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Pengumuman *</label>
                <input
                  type="text"
                  value={ancJudul}
                  onChange={e => setAncJudul(e.target.value)}
                  placeholder="Contoh: Kerja Bakti Saluran Air Menjelang Musim Hujan"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sasaran Warga</label>
                  <select
                    value={ancTarget}
                    onChange={e => setAncTarget(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="semua_warga">Semua Warga RW 03</option>
                    <option value="rt_tertentu">RT Tertentu Saja</option>
                    <option value="pengurus_saja">Khusus Pengurus RT/RW</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tingkat Prioritas</label>
                  <select
                    value={ancPrioritas}
                    onChange={e => setAncPrioritas(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="penting">Penting</option>
                    <option value="darurat">Darurat</option>
                  </select>
                </div>
              </div>

              {ancTarget === 'rt_tertentu' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Wilayah RT</label>
                  <select
                    value={ancTargetRt}
                    onChange={e => setAncTargetRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Isi Pesan Pengumuman *</label>
                <textarea
                  rows={4}
                  value={ancIsi}
                  onChange={e => setAncIsi(e.target.value)}
                  placeholder="Tuliskan detail pengumuman secara jelas untuk warga..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Berakhir (Opsional)</label>
                <input
                  type="date"
                  value={ancTanggalBerakhir}
                  onChange={e => setAncTanggalBerakhir(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAncOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim & Notifikasi Warga</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-700" />
                <span>Edit Pengumuman Warga</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingAnc(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAnc} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Pengumuman *</label>
                <input
                  type="text"
                  value={editAncJudul}
                  onChange={e => setEditAncJudul(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sasaran Warga</label>
                  <select
                    value={editAncTarget}
                    onChange={e => setEditAncTarget(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="semua_warga">Semua Warga RW 03</option>
                    <option value="rt_tertentu">RT Tertentu Saja</option>
                    <option value="pengurus_saja">Khusus Pengurus RT/RW</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tingkat Prioritas</label>
                  <select
                    value={editAncPrioritas}
                    onChange={e => setEditAncPrioritas(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="penting">Penting</option>
                    <option value="darurat">Darurat</option>
                  </select>
                </div>
              </div>

              {editAncTarget === 'rt_tertentu' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Wilayah RT</label>
                  <select
                    value={editAncTargetRt}
                    onChange={e => setEditAncTargetRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Isi Pesan Pengumuman *</label>
                <textarea
                  rows={4}
                  value={editAncIsi}
                  onChange={e => setEditAncIsi(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Berakhir (Opsional)</label>
                <input
                  type="date"
                  value={editAncTanggalBerakhir}
                  onChange={e => setEditAncTanggalBerakhir(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAnc(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Announcement Confirmation Modal */}
      {deletingAnc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-auto p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hapus Pengumuman Ini?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus pengumuman <strong>"{deletingAnc.judul}"</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingAnc(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAnc}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {isAddEvtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Jadwalkan Agenda Kegiatan Baru</h3>
              <button 
                type="button"
                onClick={() => setIsAddEvtOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvt} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={evtNama}
                  onChange={e => setEvtNama(e.target.value)}
                  placeholder="Contoh: Senam Pagi Bersama Warga"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={evtKategori}
                    onChange={e => setEvtKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Kerja Bakti">Kerja Bakti</option>
                    <option value="Kesehatan / Posyandu">Kesehatan / Posyandu</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Rapat">Rapat</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={evtTanggal}
                    onChange={e => setEvtTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Waktu</label>
                  <input
                    type="text"
                    value={evtWaktu}
                    onChange={e => setEvtWaktu(e.target.value)}
                    placeholder="08:00 - 11:00 WIB"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={evtPJ}
                    onChange={e => setEvtPJ(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lokasi Kegiatan</label>
                <input
                  type="text"
                  value={evtLokasi}
                  onChange={e => setEvtLokasi(e.target.value)}
                  placeholder="Contoh: Balai RW 03 / Lapangan RT 04"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={2}
                  value={evtDeskripsi}
                  onChange={e => setEvtDeskripsi(e.target.value)}
                  placeholder="Keterangan susunan acara atau perlengkapan yang perlu dibawa..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEvtOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-700" />
                <span>Edit Agenda Kegiatan</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingEvt(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEvt} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={editEvtNama}
                  onChange={e => setEditEvtNama(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={editEvtKategori}
                    onChange={e => setEditEvtKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Kerja Bakti">Kerja Bakti</option>
                    <option value="Kesehatan / Posyandu">Kesehatan / Posyandu</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Rapat">Rapat</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Kegiatan</label>
                  <select
                    value={editEvtStatus}
                    onChange={e => setEditEvtStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={editEvtTanggal}
                    onChange={e => setEditEvtTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Waktu</label>
                  <input
                    type="text"
                    value={editEvtWaktu}
                    onChange={e => setEditEvtWaktu(e.target.value)}
                    placeholder="08:00 - 11:00 WIB"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Kegiatan</label>
                  <input
                    type="text"
                    value={editEvtLokasi}
                    onChange={e => setEditEvtLokasi(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={editEvtPJ}
                    onChange={e => setEditEvtPJ(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={2}
                  value={editEvtDeskripsi}
                  onChange={e => setEditEvtDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvt(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {deletingEvt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-auto p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hapus Agenda Ini?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus agenda kegiatan <strong>"{deletingEvt.namaKegiatan}"</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingEvt(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvt}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
