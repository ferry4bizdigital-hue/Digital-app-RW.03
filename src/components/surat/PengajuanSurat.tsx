import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  Printer, 
  Check, 
  X, 
  ShieldCheck, 
  Send,
  AlertCircle,
  QrCode,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { LetterRequest, JenisSurat, User } from '../../types';
import { StorageService } from '../../services/storageService';

interface PengajuanSuratProps {
  currentUser: User;
}

export const PengajuanSurat: React.FC<PengajuanSuratProps> = ({ currentUser }) => {
  const [activeFilter, setActiveFilter] = useState<'semua' | 'diajukan' | 'disetujui_rt' | 'selesai' | 'ditolak'>('semua');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLetterForPrint, setSelectedLetterForPrint] = useState<LetterRequest | null>(null);

  // Delete modal state (Khusus Super Admin)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<LetterRequest | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Form states for new letter
  const [jenisSurat, setJenisSurat] = useState<JenisSurat>('Surat Pengantar KTP / KK');
  const [keperluan, setKeperluan] = useState('');
  const [formRt, setFormRt] = useState(currentUser.RT || '02');
  const [errorMsg, setErrorMsg] = useState('');

  // Approval note state
  const [approvalModalLetter, setApprovalModalLetter] = useState<LetterRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const [allLetters, setAllLetters] = useState<LetterRequest[]>(() => StorageService.getLetters());

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setAllLetters(StorageService.getLetters());
    });
    return unsubscribe;
  }, []);

  // Role permissions
  const isWarga = currentUser.role === 'warga';
  const isPengurusRt = currentUser.role === 'pengurus_rt';
  const isKetuaRw = currentUser.role === 'ketua_rw' || currentUser.role === 'bendahara';
  const isSuperAdmin = currentUser.role === 'super_admin';

  const handleOpenDelete = (letter: LetterRequest) => {
    if (!isSuperAdmin) return;
    setLetterToDelete(letter);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!isSuperAdmin || !letterToDelete) return;
    const ok = StorageService.deleteLetter(letterToDelete.id);
    if (ok) {
      setAllLetters(StorageService.getLetters());
      setToastMessage(`Pengajuan ${letterToDelete.jenisSurat} an. ${letterToDelete.namaPemohon} berhasil dihapus dari sistem.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      setIsDeleteModalOpen(false);
      setLetterToDelete(null);
    }
  };

  // Filter letters according to role
  const visibleLetters = allLetters.filter(l => {
    // If warga, see own letters
    if (isWarga && l.pemohonId !== currentUser.userId && l.nikPemohon !== currentUser.NIK) {
      return false;
    }
    // If RT, prioritize or lock to own RT
    if (isPengurusRt && l.rt !== currentUser.RT) {
      return false;
    }
    // Filter status
    if (activeFilter !== 'semua' && l.status !== activeFilter) {
      return false;
    }
    return true;
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keperluan.trim()) {
      setErrorMsg('Mohon isi penjelasan keperluan surat.');
      return;
    }

    StorageService.createLetterRequest({
      jenisSurat,
      pemohonId: currentUser.userId,
      namaPemohon: currentUser.nama,
      nikPemohon: currentUser.NIK,
      rt: currentUser.RT || formRt,
      rw: '03',
      keperluan: keperluan.trim()
    });

    setIsFormOpen(false);
    setKeperluan('');
    setErrorMsg('');
  };

  const handleProcessApproval = () => {
    if (!approvalModalLetter) return;

    if (approvalAction === 'approve') {
      if (isPengurusRt) {
        StorageService.approveLetterByRt(approvalModalLetter.id, approvalNotes || 'Disetujui dan data sesuai.');
      } else if (isKetuaRw || isSuperAdmin) {
        StorageService.approveLetterByRw(approvalModalLetter.id, approvalNotes || 'Disetujui dan ditandatangani RW.');
      }
    } else {
      if (!approvalNotes.trim()) {
        alert('Mohon cantumkan alasan penolakan.');
        return;
      }
      StorageService.rejectLetter(approvalModalLetter.id, approvalNotes);
    }

    setApprovalModalLetter(null);
    setApprovalNotes('');
  };

  const getStatusBadge = (status: LetterRequest['status']) => {
    switch (status) {
      case 'diajukan':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Menunggu Persetujuan RT
          </span>
        );
      case 'disetujui_rt':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Disetujui RT · Menunggu RW
          </span>
        );
      case 'selesai':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" />
            Selesai (Siap Unduh)
          </span>
        );
      case 'ditolak':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            Ditolak
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            Pelayanan Administrasi & Pengantar Surat RW 03
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isWarga 
              ? 'Ajukan surat pengantar dan keterangan secara digital tanpa harus menunggu lama di kantor.' 
              : 'Verifikasi dan tandatangani surat pengantar warga secara digital berjenjang (RT & RW).'}
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengajuan Surat</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
        <button
          onClick={() => setActiveFilter('semua')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeFilter === 'semua' ? 'bg-white text-emerald-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua ({allLetters.length})
        </button>
        <button
          onClick={() => setActiveFilter('diajukan')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeFilter === 'diajukan' ? 'bg-white text-amber-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Menunggu RT ({allLetters.filter(l => l.status === 'diajukan').length})
        </button>
        <button
          onClick={() => setActiveFilter('disetujui_rt')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeFilter === 'disetujui_rt' ? 'bg-white text-blue-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Menunggu RW ({allLetters.filter(l => l.status === 'disetujui_rt').length})
        </button>
        <button
          onClick={() => setActiveFilter('selesai')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeFilter === 'selesai' ? 'bg-white text-emerald-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Selesai ({allLetters.filter(l => l.status === 'selesai').length})
        </button>
      </div>

      {/* Letter Requests List */}
      <div className="space-y-3">
        {visibleLetters.length === 0 ? (
          <div className="py-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada pengajuan surat pada filter ini.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol "Buat Pengajuan Surat" untuk membuat permohonan baru.</p>
          </div>
        ) : (
          visibleLetters.map(letReq => {
            const canApproveRt = (isPengurusRt && letReq.rt === currentUser.RT && letReq.status === 'diajukan') || (isSuperAdmin && letReq.status === 'diajukan');
            const canApproveRw = (isKetuaRw || isSuperAdmin) && (letReq.status === 'disetujui_rt' || (isSuperAdmin && letReq.status === 'diajukan'));

            return (
              <div 
                key={letReq.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{letReq.jenisSurat}</span>
                      {getStatusBadge(letReq.status)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Pemohon: <strong className="text-slate-800">{letReq.namaPemohon}</strong> (NIK: {StorageService.maskNik(letReq.nikPemohon, false)}) · RT {letReq.rt} / RW 03
                    </div>
                  </div>

                  {letReq.nomorSurat && (
                    <div className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                      No: {letReq.nomorSurat}
                    </div>
                  )}
                </div>

                <div className="py-3 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-900">Keperluan: </span>
                    <span>{letReq.keperluan}</span>
                  </div>

                  {/* Verification Timeline logs */}
                  <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                    <div>
                      <span>Diajukan pada: </span>
                      <strong className="text-slate-700">{letReq.tanggalPengajuan}</strong>
                    </div>
                    {letReq.disetujuiRtPada && (
                      <div className="text-blue-700">
                        <span>✓ Diverifikasi RT: </span>
                        <strong>{letReq.disetujuiRtOleh}</strong> ({letReq.disetujuiRtPada})
                        {letReq.catatanRt && <span className="text-slate-600 block italic">"{letReq.catatanRt}"</span>}
                      </div>
                    )}
                    {letReq.disetujuiRwPada && (
                      <div className="text-emerald-700">
                        <span>✓ Ditandatangani Ketua RW: </span>
                        <strong>{letReq.disetujuiRwOleh}</strong> ({letReq.disetujuiRwPada})
                        {letReq.catatanRw && <span className="text-slate-600 block italic">"{letReq.catatanRw}"</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    ID Permohonan: #{letReq.id}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Print / Preview Official Letter button if completed */}
                    {letReq.status === 'selesai' && (
                      <button
                        onClick={() => setSelectedLetterForPrint(letReq)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Cetak / Unduh Surat Resmi</span>
                      </button>
                    )}

                    {/* RT Approval Button */}
                    {canApproveRt && (
                      <button
                        onClick={() => {
                          setApprovalModalLetter(letReq);
                          setApprovalAction('approve');
                          setApprovalNotes('Data pemohon terverifikasi sesuai Kartu Keluarga.');
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verifikasi & Setujui RT</span>
                      </button>
                    )}

                    {/* RW Approval Button */}
                    {canApproveRw && (
                      <button
                        onClick={() => {
                          setApprovalModalLetter(letReq);
                          setApprovalAction('approve');
                          setApprovalNotes('Telah disetujui & ditandatangani Ketua RW 03.');
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Tandatangani & Terbitkan No. Surat</span>
                      </button>
                    )}

                    {/* Reject Button for Admins */}
                    {(canApproveRt || canApproveRw) && (
                      <button
                        onClick={() => {
                          setApprovalModalLetter(letReq);
                          setApprovalAction('reject');
                          setApprovalNotes('');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        Tolak
                      </button>
                    )}

                    {/* Super Admin Delete Button */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleOpenDelete(letReq)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Hapus Pengajuan Surat (Khusus Super Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Letter Request Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">Form Pengajuan Surat Baru</h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {errorMsg}
                </div>
              )}

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-semibold text-emerald-900 block">Identitas Pemohon:</span>
                <span className="text-slate-800 font-bold block">{currentUser.nama}</span>
                <span className="text-slate-500 font-mono text-[11px] block">
                  NIK: {StorageService.maskNik(currentUser.NIK, false)} · RT {currentUser.RT} / RW 03
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Jenis Surat *</label>
                <select
                  value={jenisSurat}
                  onChange={e => setJenisSurat(e.target.value as JenisSurat)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="Surat Pengantar KTP / KK">Surat Pengantar KTP / KK</option>
                  <option value="Surat Keterangan Domisili">Surat Keterangan Domisili</option>
                  <option value="Surat Keterangan Usaha (SKU)">Surat Keterangan Usaha (SKU)</option>
                  <option value="Surat Keterangan Tidak Mampu (SKTM)">Surat Keterangan Tidak Mampu (SKTM)</option>
                  <option value="Surat Pengantar Nikah (N1-N4)">Surat Pengantar Nikah (N1-N4)</option>
                  <option value="Surat Keterangan Kematian">Surat Keterangan Kematian</option>
                  <option value="Surat Keterangan Kelakuan Baik">Surat Keterangan Kelakuan Baik</option>
                  <option value="Surat Izin Keramaian / Kegiatan">Surat Izin Keramaian / Kegiatan</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keperluan & Keterangan Pengajuan *</label>
                <textarea
                  rows={3}
                  value={keperluan}
                  onChange={e => setKeperluan(e.target.value)}
                  placeholder="Contoh: Untuk persyaratan pembuatan rekening payroll di Bank Mandiri Cabang Kiaracondong."
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
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Permohonan Surat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval / Rejection Modal */}
      {approvalModalLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {approvalAction === 'approve' 
                  ? (isPengurusRt ? 'Persetujuan Surat Tingkat RT' : 'Tanda Tangan Surat Tingkat RW') 
                  : 'Tolak Permohonan Surat'}
              </h3>
              <button onClick={() => setApprovalModalLetter(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block">{approvalModalLetter.jenisSurat}</span>
                <span className="text-slate-600 block">Pemohon: {approvalModalLetter.namaPemohon} (RT {approvalModalLetter.rt})</span>
                <span className="text-slate-500 block">Keperluan: {approvalModalLetter.keperluan}</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {approvalAction === 'approve' ? 'Catatan Rekomendasi (Opsional)' : 'Alasan Penolakan (Wajib) *'}
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  placeholder={approvalAction === 'approve' ? 'Data warga telah diverifikasi dan lunas iuran.' : 'Mohon lengkapi fotokopi KK terlebih dahulu.'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalLetter(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessApproval}
                  className={`px-4 py-2 text-white rounded-lg text-xs font-semibold ${
                    approvalAction === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {approvalAction === 'approve' ? 'Konfirmasi Persetujuan' : 'Tolak Surat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Indonesian Letter Printable Modal */}
      {selectedLetterForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-300 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">Preview Cetak Surat Resmi (Kop RW 03)</span>
              </div>
              <button onClick={() => setSelectedLetterForPrint(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-4 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 font-serif leading-relaxed text-xs">
              {/* Kop Surat Resmi */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h3 className="text-xs uppercase font-bold tracking-widest text-slate-800">
                  PEMERINTAH DAERAH KOTA BANDUNG
                </h3>
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-800">
                  KECAMATAN KIARACONDONG · KELURAHAN KEBON KANGKUNG
                </h4>
                <h2 className="text-base font-extrabold uppercase tracking-wide mt-1 text-black">
                  RUKUN WARGA 03
                </h2>
                <p className="text-[10px] font-sans text-slate-600 mt-0.5">
                  Sekretariat: Jl. Babakan Sari I No. 12, Kel. Kebon Kangkung, Kec. Kiaracondong, Kota Bandung 40284
                </p>
              </div>

              {/* Title & Number */}
              <div className="text-center mb-6">
                <h3 className="font-bold text-sm uppercase underline decoration-1 underline-offset-4">
                  {selectedLetterForPrint.jenisSurat}
                </h3>
                <p className="text-[11px] font-mono mt-1 text-slate-800">
                  Nomor: {selectedLetterForPrint.nomorSurat || '045/RT.02/RW.03/IX/2026'}
                </p>
              </div>

              {/* Body */}
              <div className="space-y-4 font-sans text-xs">
                <p>
                  Yang bertanda tangan di bawah ini, Ketua Rukun Warga 03 Kelurahan Kebon Kangkung, Kecamatan Kiaracondong, Kota Bandung, dengan ini menerangkan bahwa:
                </p>

                <div className="pl-6 space-y-1.5 font-medium text-slate-800">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-600">Nama Lengkap</span>
                    <span className="col-span-2 font-bold">: {selectedLetterForPrint.namaPemohon}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-600">NIK</span>
                    <span className="col-span-2 font-mono">: {selectedLetterForPrint.nikPemohon}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-600">Wilayah Domisili</span>
                    <span className="col-span-2">: RT {selectedLetterForPrint.rt} / RW 03 Kebon Kangkung</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-600">Keperluan</span>
                    <span className="col-span-2">: {selectedLetterForPrint.keperluan}</span>
                  </div>
                </div>

                <p className="leading-relaxed pt-2">
                  Berdasarkan data kependudukan dan surat pengantar dari Rukun Tetangga (RT) yang bersangkutan, nama tersebut di atas adalah benar-benar warga yang berdomisili sah di lingkungan kami dan memiliki kelakuan baik.
                </p>

                <p className="leading-relaxed">
                  Demikian surat pengantar / keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                </p>

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 text-center text-xs">
                  <div>
                    <span className="block text-slate-600">Mengetahui,</span>
                    <span className="block font-bold mt-1">Ketua RT {selectedLetterForPrint.rt}</span>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-700 font-mono font-bold border border-emerald-400 bg-emerald-50 px-2 py-0.5 rounded">
                        [TERVERIFIKASI DIGITAL RT]
                      </span>
                    </div>
                    <span className="font-bold underline block">{selectedLetterForPrint.disetujuiRtOleh || `Ketua RT ${selectedLetterForPrint.rt}`}</span>
                  </div>

                  <div>
                    <span className="block text-slate-600">Kebon Kangkung, {selectedLetterForPrint.tanggalPengajuan.substring(0, 10)}</span>
                    <span className="block font-bold mt-1">Ketua RW 03</span>
                    <div className="h-16 flex items-center justify-center">
                      <div className="border border-emerald-500 bg-emerald-50/80 px-2 py-1 rounded flex items-center gap-1.5">
                        <QrCode className="w-5 h-5 text-emerald-800" />
                        <span className="text-[9px] text-emerald-900 font-mono font-bold leading-tight text-left">
                          TTE DIGITAL RW.03<br/>KEBON KANGKUNG
                        </span>
                      </div>
                    </div>
                    <span className="font-bold underline block">{selectedLetterForPrint.disetujuiRwOleh || 'Drs. H. Bambang Suherman'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Verifikasi Dokumen: digitalrw.kebonkangkung.id/v/{selectedLetterForPrint.id}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedLetterForPrint(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Surat - Khusus Super Admin */}
      {isDeleteModalOpen && isSuperAdmin && letterToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-base">Hapus Pengajuan Surat?</h4>
              <p className="text-slate-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus permohonan <strong>{letterToDelete.jenisSurat}</strong> atas nama <strong>{letterToDelete.namaPemohon}</strong> (RT {letterToDelete.rt})? Tindakan ini akan menghapus data permanen.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1 text-[11px]">
              <div><span className="text-slate-400">Status:</span> <span className="font-semibold text-slate-700 capitalize">{letterToDelete.status.replace('_', ' ')}</span></div>
              <div><span className="text-slate-400">Keperluan:</span> <span className="text-slate-700">{letterToDelete.keperluan}</span></div>
              {letterToDelete.nomorSurat && (
                <div><span className="text-slate-400">No. Surat:</span> <span className="font-mono font-semibold text-emerald-700">{letterToDelete.nomorSurat}</span></div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setLetterToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-emerald-700 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
