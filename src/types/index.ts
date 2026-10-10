export type UserRole = 'super_admin' | 'ketua_rw' | 'bendahara' | 'pengurus_rt' | 'warga';

export interface User {
  userId: string;
  nama: string;
  email: string;
  nomorHP: string;
  NIK: string;
  password?: string;
  role: UserRole;
  jabatan?: string;
  RT: string; // e.g. "02"
  RW: string; // e.g. "03"
  alamat: string;
  statusAkun: 'aktif' | 'menunggu_verifikasi' | 'nonaktif';
  fotoProfil?: string;
  createdAt: string;
  updatedAt: string;
}

export type JenisKelamin = 'L' | 'P';
export type Agama = 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Konghucu';
export type StatusPerkawinan = 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
export type StatusHubunganKeluarga = 'Kepala Keluarga' | 'Istri' | 'Anak' | 'Orang Tua' | 'Famili Lain';
export type StatusDomisili = 'KTP & Domisili' | 'KTP Saja' | 'Domisili Saja';
export type StatusWarga = 'Tetap' | 'Kontrak/Kos' | 'Pindah' | 'Meninggal';

export interface Resident {
  id: string;
  NIK: string;
  nomorKK: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  usia: number;
  jenisKelamin: JenisKelamin;
  agama: Agama;
  statusPerkawinan: StatusPerkawinan;
  hubunganKeluarga: StatusHubunganKeluarga;
  pendidikan: string;
  pekerjaan: string;
  nomorHP: string;
  email?: string;
  alamat: string;
  rt: string;
  rw: string;
  statusDomisili: StatusDomisili;
  statusWarga: StatusWarga;
  foto?: string;
  dokumenPendukung?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyCard {
  nomorKK: string;
  namaKepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  nomorRumah: string;
  statusRumah: 'Milik Sendiri' | 'Sewa / Kontrak' | 'Rumah Dinas' | 'Menumpang';
  jumlahAnggota: number;
  createdAt: string;
}

export type JenisSurat = 
  | 'Surat Pengantar KTP / KK'
  | 'Surat Keterangan Domisili'
  | 'Surat Keterangan Usaha (SKU)'
  | 'Surat Keterangan Tidak Mampu (SKTM)'
  | 'Surat Pengantar Nikah (N1-N4)'
  | 'Surat Keterangan Kematian'
  | 'Surat Keterangan Kelakuan Baik'
  | 'Surat Izin Keramaian / Kegiatan';

export type StatusSurat = 
  | 'diajukan' 
  | 'disetujui_rt' 
  | 'disetujui_rw' 
  | 'selesai' 
  | 'ditolak';

export interface LetterRequest {
  id: string;
  nomorSurat?: string;
  jenisSurat: JenisSurat;
  pemohonId: string;
  namaPemohon: string;
  nikPemohon: string;
  rt: string;
  rw: string;
  keperluan: string;
  lampiranUrl?: string;
  status: StatusSurat;
  tanggalPengajuan: string;
  catatanRt?: string;
  catatanRw?: string;
  disetujuiRtOleh?: string;
  disetujuiRtPada?: string;
  disetujuiRwOleh?: string;
  disetujuiRwPada?: string;
}

export type TargetPenerima = 'semua_warga' | 'rt_tertentu' | 'pengurus_saja';

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  foto?: string;
  lampiran?: string;
  targetPenerima: TargetPenerima;
  targetRt?: string; // e.g. "02" if targetPenerima === 'rt_tertentu'
  tanggalPublikasi: string;
  tanggalBerakhir?: string;
  penulis: string;
  penulisRole: string;
  prioritas: 'normal' | 'penting' | 'darurat';
}

export interface CommunityEvent {
  id: string;
  namaKegiatan: string;
  deskripsi: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  lokasi: string;
  penanggungJawab: string;
  rt?: string; // empty means all RW
  poster?: string;
  status: 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai' | 'Dibatalkan';
  kategori: 'Kerja Bakti' | 'Kesehatan / Posyandu' | 'Keagamaan' | 'Rapat' | 'Olahraga' | 'Lainnya';
}

export type KategoriPengaduan = 
  | 'Lampu Jalan / PJU' 
  | 'Jalan Rusak / Fasum' 
  | 'Sampah & Kebersihan' 
  | 'Keamanan & Ketertiban' 
  | 'Drainase & Banjir' 
  | 'Masalah Sosial' 
  | 'Lainnya';

export type StatusPengaduan = 'Baru' | 'Diterima' | 'Diproses' | 'Selesai' | 'Ditolak';

export interface ComplaintComment {
  id: string;
  nama: string;
  role: string;
  pesan: string;
  tanggal: string;
}

export interface Complaint {
  id: string;
  judul: string;
  kategori: KategoriPengaduan;
  deskripsi: string;
  foto?: string;
  lokasi: string;
  rt: string;
  rw: string;
  pelaporId: string;
  namaPelapor: string;
  tanggalLaporan: string;
  status: StatusPengaduan;
  tanggapanPengurus?: string;
  komentar: ComplaintComment[];
}

export type JenisIuran = 'IWD (Iuran Warga Digital)' | 'Kas RT' | 'Kas RW' | 'Sosial & Kematian' | 'Kebersihan';

export interface DueBill {
  id: string;
  jenisIuran: JenisIuran;
  periode: string; // e.g. "September 2026"
  nominal: number;
  nomorKK: string;
  namaKepalaKeluarga: string;
  rt: string;
  status: 'Belum Bayar' | 'Menunggu Konfirmasi' | 'Lunas';
  tanggalBayar?: string;
  metodeBayar?: 'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT';
  buktiBayar?: string;
  kategoriWarga?: 'keluarga' | 'ngontrak_usaha' | 'manual';
  wargaNgontrakUsahaId?: string;
  namaUsaha?: string;
  namaCp?: string;
}

export interface FinancialTransaction {
  id: string;
  tipe: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string;
  lingkup: 'RW' | 'RT';
  rt?: string;
  setoranRt?: SetoranRtChoice;
  jenisSetoran?: 'IWD' | 'Sosial & Kematian';
  sumberDana?: 'IWD' | 'Sosial & Kematian';
  pencatat: string;
  buktiTransaksi?: string;
  runningSaldo?: number;
}

export type KondisiBarang = 'Sangat Baik' | 'Baik' | 'Perlu Perbaikan' | 'Rusak';
export type StatusBarang = 'Tersedia' | 'Sedang Dipinjam' | 'Dalam Perbaikan';

export interface InventoryItem {
  id: string;
  namaBarang: string;
  kategori: 'Tenda & Kursi' | 'Elektronik & Sound' | 'Kebersihan' | 'Peralatan Masak' | 'Keamanan';
  jumlahTotal: number;
  jumlahTersedia: number;
  kondisi: KondisiBarang;
  lokasi: string;
  tahunPerolehan: number;
  estimasiNilai: number;
  foto?: string;
  status: StatusBarang;
  peminjamSaatIni?: {
    nama: string;
    rt: string;
    keperluan: string;
    tglPinjam: string;
    rencanaKembali: string;
  };
}

export interface AppNotification {
  id: string;
  judul: string;
  pesan: string;
  tipe: 'pengumuman' | 'agenda' | 'pengaduan' | 'surat' | 'iuran' | 'info';
  targetUserId?: string; // empty means broadcast to role
  targetRole?: UserRole;
  targetRt?: string;
  tanggal: string;
  dibaca: boolean;
  linkTab?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  namaUser: string;
  role: string;
  action: string; // e.g. "TAMBAH_WARGA", "SETUJUI_SURAT", "LOGIN", "CATAT_TRANSAKSI"
  module: 'Warga' | 'Surat' | 'Pengaduan' | 'Pengumuman' | 'Iuran' | 'Keuangan' | 'Inventaris' | 'Autentikasi' | 'Sistem';
  targetId?: string;
  detail: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EmergencyContact {
  id: string;
  nama: string;
  instansi: string;
  nomorTelepon: string;
  kategori: 'Polisi / Bhabinkamtibmas' | 'TNI / Babinsa' | 'Kesehatan / Puskesmas' | 'Damkar' | 'Ketua RW' | 'Satgas Bencana';
  alamat?: string;
}

export type SetoranRtChoice = 'RT 01' | 'RT 02' | 'RT 03' | 'RT 04' | 'RT 05';

export interface SetoranIwdRt {
  id: string;
  setoranRt: SetoranRtChoice;
  tanggalSetor: string;
  jumlahSetor: number;
  keterangan: string;
  pencatat: string;
  createdAt?: string;
}

export interface WargaNgontrakUsaha {
  id: string;
  namaCp: string;          // Nama CP (Contact Person / Penanggung Jawab Usaha)
  namaUsaha: string;       // Nama Usaha
  nomorHpCp?: string;      // No HP / WhatsApp CP
  jenisUsaha?: string;     // Jenis/Bidang Usaha (e.g. Kuliner/Warung, Laundry, Jasa, Toko Sembako, dll)
  rt: string;              // RT lokasi usaha (01 - 05)
  rw: string;              // RW (03)
  alamatLokasi?: string;   // Alamat detail lokasi usaha / ruko / kios
  statusSewa?: 'Aktif' | 'Selesai' | 'Menunggu Perpanjangan';
  tanggalMulai?: string;   // Tanggal mulai kontrak usaha
  keterangan?: string;     // Catatan tambahan
  createdAt: string;
  updatedAt: string;
}

