import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Plus, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  X, 
  Send, 
  Image as ImageIcon,
  Check,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Complaint, KategoriPengaduan, StatusPengaduan, User } from '../../types';
import { StorageService } from '../../services/storageService';

interface ModulPengaduanProps {
  currentUser: User;
}

export const ModulPengaduan: React.FC<ModulPengaduanProps> = ({ currentUser }) => {
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeComplaintDetail, setActiveComplaintDetail] = useState<Complaint | null>(null);
  const [deletingComplaint, setDeletingComplaint] = useState<Complaint | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<KategoriPengaduan>('Lampu Jalan / PJU');
  const [deskripsi, setDeskripsi] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [formRt, setFormRt] = useState(currentUser.RT || '02');
  const [errorMsg, setErrorMsg] = useState('');

  // Comment / response state
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<StatusPengaduan>('Diproses');

  // Re-render on storage changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const complaints = StorageService.getComplaints();

  const isPengurus = currentUser.role !== 'warga';
  // Hak akses hapus pengaduan khusus untuk Role Super Admin dan Role RW (ketua_rw)
  // Role Bendahara tidak diberikan akses untuk menghapus Layanan Pengaduan & Aspirasi Lingkungan Warga yang berubah status menjadi selesai atau ditolak
  const canDeleteComplaint = currentUser.role === 'super_admin' || currentUser.role === 'ketua_rw';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const filteredComplaints = complaints.filter(c => {
    if (selectedKategori !== 'all' && c.kategori !== selectedKategori) return false;
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    return true;
  });

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !deskripsi.trim()) {
      setErrorMsg('Mohon isi judul dan rincian deskripsi pengaduan.');
      return;
    }

    StorageService.addComplaint({
      judul: judul.trim(),
      kategori,
      deskripsi: deskripsi.trim(),
      lokasi: lokasi.trim() || `Lingkungan RT ${formRt} / RW 03`,
      rt: currentUser.RT || formRt,
      rw: '03',
      pelaporId: currentUser.userId,
      namaPelapor: currentUser.nama
    });

    setIsFormOpen(false);
    setJudul('');
    setDeskripsi('');
    setLokasi('');
    setErrorMsg('');
    showToast('Laporan pengaduan berhasil dikirim.');
  };

  const handleUpdateStatusAndRespond = () => {
    if (!activeComplaintDetail) return;
    StorageService.updateComplaintStatus(activeComplaintDetail.id, newStatus, responseText);
    const updated = StorageService.getComplaints().find(c => c.id === activeComplaintDetail.id);
    if (updated) setActiveComplaintDetail(updated);
    setResponseText('');
    showToast(`Status pengaduan berhasil diubah menjadi "${newStatus}".`);
  };

  const handleConfirmDelete = () => {
    if (!deletingComplaint) return;
    if (currentUser.role !== 'super_admin' && !canDeleteComplaint) return;
    const targetId = deletingComplaint.id;
    const targetTitle = deletingComplaint.judul;
    StorageService.deleteComplaint(targetId);
    if (activeComplaintDetail && activeComplaintDetail.id === targetId) {
      setActiveComplaintDetail(null);
    }
    setDeletingComplaint(null);
    showToast(`Laporan pengaduan "${targetTitle}" berhasil dihapus.`);
  };

  const getStatusBadge = (status: StatusPengaduan) => {
    switch (status) {
      case 'Baru':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Baru Diterima</span>;
      case 'Diterima':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Diverifikasi Pengurus</span>;
      case 'Diproses':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">Sedang Ditindaklanjuti</span>;
      case 'Selesai':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Selesai / Tuntas</span>;
      case 'Ditolak':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">Ditolak</span>;
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Layanan Pengaduan & Aspirasi Lingkungan Warga
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporkan masalah lampu jalan padam, saluran mampet, jalan rusak, sampah, dan ketertiban.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <select
          value={selectedKategori}
          onChange={e => setSelectedKategori(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">Semua Kategori Masalah</option>
          <option value="Lampu Jalan / PJU">Lampu Jalan / PJU</option>
          <option value="Jalan Rusak / Fasum">Jalan Rusak / Fasum</option>
          <option value="Sampah & Kebersihan">Sampah & Kebersihan</option>
          <option value="Keamanan & Ketertiban">Keamanan & Ketertiban</option>
          <option value="Drainase & Banjir">Drainase & Banjir</option>
          <option value="Masalah Sosial">Masalah Sosial</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="all">Semua Status</option>
          <option value="Baru">Baru</option>
          <option value="Diterima">Diterima</option>
          <option value="Diproses">Diproses</option>
          <option value="Selesai">Selesai</option>
          <option value="Ditolak">Ditolak</option>
        </select>
      </div>

      {/* Complaints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredComplaints.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada laporan pengaduan ditemukan.</p>
          </div>
        ) : (
          filteredComplaints.map(cmp => (
            <div
              key={cmp.id}
              onClick={() => {
                setActiveComplaintDetail(cmp);
                setNewStatus(cmp.status);
              }}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {cmp.kategori}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(cmp.status)}
                    {(currentUser.role === 'super_admin' || (canDeleteComplaint && (cmp.status === 'Selesai' || cmp.status === 'Ditolak'))) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingComplaint(cmp);
                        }}
                        title={`Hapus Laporan Pengaduan (${cmp.status})`}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 transition-colors">
                  {cmp.judul}
                </h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {cmp.deskripsi}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{cmp.lokasi}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Pelapor: {cmp.namaPelapor} (RT {cmp.rt})</span>
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {cmp.komentar.length} Tanggapan
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Complaint Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Form Laporan Pengaduan Warga</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Laporan *</label>
                <input
                  type="text"
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  placeholder="Contoh: Lampu PJU Mati di Tikungan RT 02"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Masalah</label>
                  <select
                    value={kategori}
                    onChange={e => setKategori(e.target.value as KategoriPengaduan)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Lampu Jalan / PJU">Lampu Jalan / PJU</option>
                    <option value="Jalan Rusak / Fasum">Jalan Rusak / Fasum</option>
                    <option value="Sampah & Kebersihan">Sampah & Kebersihan</option>
                    <option value="Keamanan & Ketertiban">Keamanan & Ketertiban</option>
                    <option value="Drainase & Banjir">Drainase & Banjir</option>
                    <option value="Masalah Sosial">Masalah Sosial</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wilayah RT</label>
                  <select
                    value={formRt}
                    onChange={e => setFormRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lokasi Detail *</label>
                <input
                  type="text"
                  value={lokasi}
                  onChange={e => setLokasi(e.target.value)}
                  placeholder="Contoh: Depan Pos Kamling Jl. Kebon Kangkung II No. 19"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Lengkap *</label>
                <textarea
                  rows={3}
                  value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  placeholder="Ceritakan kronologi atau kondisi masalah secara rinci..."
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Detail & Comment Modal */}
      {activeComplaintDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{activeComplaintDetail.judul}</h3>
                <span className="text-[11px] text-slate-500">
                  Pelapor: {activeComplaintDetail.namaPelapor} (RT {activeComplaintDetail.rt}) · {activeComplaintDetail.tanggalLaporan}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(currentUser.role === 'super_admin' || (canDeleteComplaint && (activeComplaintDetail.status === 'Selesai' || activeComplaintDetail.status === 'Ditolak' || newStatus === 'Selesai' || newStatus === 'Ditolak'))) && (
                  <button
                    type="button"
                    onClick={() => setDeletingComplaint(activeComplaintDetail)}
                    className="px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Hapus Laporan Pengaduan"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus</span>
                  </button>
                )}
                <button onClick={() => setActiveComplaintDetail(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  {activeComplaintDetail.kategori}
                </span>
                {getStatusBadge(activeComplaintDetail.status)}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-slate-800 leading-relaxed">{activeComplaintDetail.deskripsi}</p>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeComplaintDetail.lokasi}</span>
                </div>
              </div>

              {/* Comments / Responses Thread */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  Tindak Lanjut & Tanggapan Pengurus:
                </h4>

                {activeComplaintDetail.komentar.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] py-2">
                    Belum ada tanggapan pengurus untuk laporan ini.
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {activeComplaintDetail.komentar.map(cmt => (
                      <div key={cmt.id} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-emerald-900">{cmt.nama}</span>
                          <span className="text-slate-400 font-mono">{cmt.tanggal}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{cmt.pesan}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pengurus Response Input Form */}
              {isPengurus && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 block">
                    Update Status & Beri Tanggapan Pengurus:
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Status Baru:</span>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as StatusPengaduan)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Diterima">Diterima</option>
                      <option value="Diproses">Diproses</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>

                  {/* Akses hapus pengaduan jika Status Baru berubah menjadi Selesai atau Ditolak bagi Role Super Admin dan Role RW */}
                  {canDeleteComplaint && (newStatus === 'Selesai' || newStatus === 'Ditolak') && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-950">
                            Status Baru Dipilih: <span className="underline font-extrabold">{newStatus}</span>
                          </p>
                          <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                            Hak akses khusus <strong>{currentUser.role === 'super_admin' ? 'Role Super Admin' : 'Role RW'}</strong>: Laporan dengan status selesai atau ditolak dapat langsung dihapus permanen.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeletingComplaint(activeComplaintDetail)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Pengaduan</span>
                      </button>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Tuliskan tindakan perbaikan yang telah/sedang dilakukan..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleUpdateStatusAndRespond}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Perbarui Laporan</span>
                    </button>

                    {(currentUser.role === 'super_admin' || (canDeleteComplaint && (activeComplaintDetail.status === 'Selesai' || activeComplaintDetail.status === 'Ditolak' || newStatus === 'Selesai' || newStatus === 'Ditolak'))) && (
                      <button
                        type="button"
                        onClick={() => setDeletingComplaint(activeComplaintDetail)}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus Laporan</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Hapus Laporan Pengaduan?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus laporan pengaduan ini dari sistem? Tindakan ini hanya dapat dilakukan oleh <span className="font-semibold text-slate-700">Role Super Admin</span> dan <span className="font-semibold text-slate-700">Role RW</span> untuk laporan yang berstatus <span className="font-semibold text-emerald-700">Selesai</span> atau <span className="font-semibold text-rose-700">Ditolak</span>.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-5 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm line-clamp-2">{deletingComplaint.judul}</div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Pelapor: {deletingComplaint.namaPelapor} (RT {deletingComplaint.rt})</span>
                <span className="font-medium text-slate-600">{deletingComplaint.kategori}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500">Status Laporan:</span>
                {getStatusBadge(deletingComplaint.status)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingComplaint(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Ya, Hapus Pengaduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
