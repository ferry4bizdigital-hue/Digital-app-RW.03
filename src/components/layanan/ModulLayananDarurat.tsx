import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  HelpCircle, 
  Building, 
  Search, 
  ExternalLink,
  ChevronRight,
  Info,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { EmergencyContact, User } from '../../types';
import { StorageService } from '../../services/storageService';

interface ModulLayananDaruratProps {
  currentUser?: User;
}

export const ModulLayananDarurat: React.FC<ModulLayananDaruratProps> = ({ currentUser }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => StorageService.getEmergencyContacts());
  const [search, setSearch] = useState('');
  
  // Admin modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<EmergencyContact | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Form states
  const [nama, setNama] = useState('');
  const [instansi, setInstansi] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [kategori, setKategori] = useState<EmergencyContact['kategori']>('Ketua RW');
  const [alamat, setAlamat] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setContacts(StorageService.getEmergencyContacts());
    });
    return unsubscribe;
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !nomorTelepon.trim() || !instansi.trim()) {
      setErrorMsg('Nama, Instansi, dan Nomor Telepon wajib diisi.');
      return;
    }

    StorageService.addEmergencyContact({
      nama: nama.trim(),
      instansi: instansi.trim(),
      nomorTelepon: nomorTelepon.trim(),
      kategori,
      alamat: alamat.trim() || undefined
    });

    setIsAddOpen(false);
    setNama('');
    setInstansi('');
    setNomorTelepon('');
    setAlamat('');
    setErrorMsg('');
    showNotification(`Kontak darurat ${nama} berhasil ditambahkan.`);
  };

  const handleConfirmDelete = () => {
    if (!contactToDelete || !isSuperAdmin) return;
    const targetName = contactToDelete.nama;
    const ok = StorageService.deleteEmergencyContact(contactToDelete.id);
    if (ok) {
      setContacts(StorageService.getEmergencyContacts());
      showNotification(`Kontak ${targetName} berhasil dihapus.`);
      setContactToDelete(null);
    }
  };

  const filtered = contacts.filter(c => 
    c.nama.toLowerCase().includes(search.toLowerCase()) ||
    c.kategori.toLowerCase().includes(search.toLowerCase()) ||
    c.instansi.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (kategori: string) => {
    if (kategori.includes('Polisi')) return <ShieldAlert className="w-5 h-5 text-blue-600" />;
    if (kategori.includes('TNI')) return <ShieldAlert className="w-5 h-5 text-emerald-700" />;
    if (kategori.includes('Damkar')) return <Flame className="w-5 h-5 text-rose-600" />;
    if (kategori.includes('Kesehatan')) return <HeartPulse className="w-5 h-5 text-rose-500" />;
    return <PhoneCall className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-emerald-700 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Emergency Header Hero */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Layanan Cepat Tanggap & Kontak Darurat 24 Jam</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            Bantuan Darurat RW 03 Kebon Kangkung
          </h2>
          <p className="text-xs text-rose-100/90 leading-relaxed max-w-2xl">
            Nomor darurat Bhabinkamtibmas, Babinsa, Puskesmas, Pemadam Kebakaran, dan Satgas RW 03. Klik tombol telepon untuk langsung melakukan panggilan darurat saat terjadi kondisi genting.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kontak</span>
          </button>
        )}
      </div>

      {/* Quick SOS Big Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a
          href="tel:112"
          className="p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 shadow-2xs flex flex-col items-center text-center transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <PhoneCall className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-900">112</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Darurat Nasional</span>
        </a>

        <a
          href="tel:113"
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-400 shadow-2xs flex flex-col items-center text-center transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-900">113</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Pemadam (Damkar)</span>
        </a>

        <a
          href="tel:110"
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-2xs flex flex-col items-center text-center transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-900">110</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Kepolisian RI</span>
        </a>

        <a
          href="tel:119"
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 shadow-2xs flex flex-col items-center text-center transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-900">119</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Ambulans Gawat</span>
        </a>
      </div>

      {/* Directory Search */}
      <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari kontak petugas Bhabinkamtibmas, Babinsa, Puskesmas, Damkar..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
        />
      </div>

      {/* Contacts List */}
      <div className="space-y-3">
        {filtered.map(contact => (
          <div
            key={contact.id}
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                {getIcon(contact.kategori)}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {contact.kategori}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{contact.nama}</h3>
                <span className="text-xs text-slate-500 block">{contact.instansi}</span>
                {contact.alamat && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">{contact.alamat}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="font-mono text-sm font-bold text-slate-900 tracking-wide">
                {contact.nomorTelepon}
              </span>
              <a
                href={`tel:${contact.nomorTelepon.replace(/\D/g, '')}`}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Hubungi</span>
              </a>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setContactToDelete(contact)}
                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                  title="Hapus Kontak (Khusus Super Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Card on Citizen Services */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-700" />
          Prosedur Pengurusan Administrasi & Surat di RW 03
        </h4>
        <p className="leading-relaxed">
          1. Warga mengajukan surat secara online melalui tab <strong>Surat</strong> aplikasi ini.<br/>
          2. Pengurus RT akan menerima notifikasi dan memverifikasi data sesuai Kartu Keluarga.<br/>
          3. Surat yang diverifikasi RT diteruskan ke Ketua RW 03 untuk penerbitan nomor surat dan tanda tangan digital.<br/>
          4. Surat selesai dapat langsung dicetak atau diunduh warga secara mandiri tanpa pungutan biaya liar.
        </p>
      </div>

      {/* Modal Add Contact - Super Admin */}
      {isAddOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                Tambah Kontak Darurat
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateContact} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Petugas / Kontak</label>
                <input
                  type="text"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Contoh: Aiptu Yudi Handoko"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instansi / Satuan</label>
                <input
                  type="text"
                  value={instansi}
                  onChange={e => setInstansi(e.target.value)}
                  placeholder="Contoh: Polsek Batununggal / Kel. Kebon Kangkung"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={nomorTelepon}
                    onChange={e => setNomorTelepon(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={e => setKategori(e.target.value as EmergencyContact['kategori'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="Polisi / Bhabinkamtibmas">Polisi / Bhabinkamtibmas</option>
                    <option value="TNI / Babinsa">TNI / Babinsa</option>
                    <option value="Kesehatan / Puskesmas">Kesehatan / Puskesmas</option>
                    <option value="Damkar">Damkar</option>
                    <option value="Ketua RW">Ketua RW</option>
                    <option value="Satgas Bencana">Satgas Bencana</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat / Pos (Opsional)</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={e => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Kebon Kangkung No. 12"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-sm cursor-pointer"
                >
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus - Super Admin */}
      {contactToDelete && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-slate-900 text-base">Hapus Kontak Darurat?</h4>
              <p className="text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <strong>{contactToDelete.nama}</strong> ({contactToDelete.instansi}) dari daftar kontak darurat RW 03?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
