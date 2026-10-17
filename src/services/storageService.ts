import {
  User,
  Resident,
  FamilyCard,
  LetterRequest,
  Announcement,
  CommunityEvent,
  Complaint,
  DueBill,
  FinancialTransaction,
  InventoryItem,
  AppNotification,
  AuditLog,
  EmergencyContact,
  StatusSurat,
  SetoranIwdRt,
  WargaNgontrakUsaha,
  SetoranRtChoice
} from '../types';
import { FirestoreSyncService } from './firestoreSyncService';

import {
  INITIAL_USERS,
  INITIAL_FAMILIES,
  INITIAL_RESIDENTS,
  INITIAL_LETTERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_EVENTS,
  INITIAL_COMPLAINTS,
  INITIAL_DUES,
  INITIAL_TRANSACTIONS,
  INITIAL_INVENTORY,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMERGENCY_CONTACTS,
  INITIAL_SETORAN_RT,
  INITIAL_WARGA_NGONTRAK_USAHA
} from '../data/mockData';

const STORAGE_KEYS = {
  CURRENT_USER: 'rw03_current_user',
  USERS: 'rw03_users',
  DELETED_USERS: 'rw03_deleted_users',
  RESIDENTS: 'rw03_residents',
  DELETED_RESIDENTS: 'rw03_deleted_residents',
  FAMILIES: 'rw03_families',
  DELETED_FAMILIES: 'rw03_deleted_families',
  LETTERS: 'rw03_letters',
  ANNOUNCEMENTS: 'rw03_announcements',
  EVENTS: 'rw03_events',
  COMPLAINTS: 'rw03_complaints',
  DUES: 'rw03_dues',
  TRANSACTIONS: 'rw03_transactions',
  SETORAN_RT: 'rw03_setoran_rt',
  INVENTORY: 'rw03_inventory',
  NOTIFICATIONS: 'rw03_notifications',
  AUDIT_LOGS: 'rw03_audit_logs',
  IS_OFFLINE: 'rw03_is_offline',
  WARGA_NGONTRAK_USAHA: 'rw03_warga_ngontrak_usaha',
  EMERGENCY_CONTACTS: 'rw03_emergency_contacts',
  LAST_SYNCED_AT: 'rw03_last_synced_at',
  SYNC_VERSION: 'rw03_sync_version'
};

const PURGE_FLAG_KEY = 'rw03_cleared_all_data_v2026_10_final';
if (typeof window !== 'undefined' && window.localStorage) {
  if (localStorage.getItem(PURGE_FLAG_KEY) !== 'true') {
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DELETED_RESIDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FAMILIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DELETED_FAMILIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETORAN_RT, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DUES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LETTERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.DELETED_USERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SYNC_VERSION, '20');
    localStorage.setItem(PURGE_FLAG_KEY, 'true');
  }
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    let raw = localStorage.getItem(key);
    if (!raw) return fallback;
    if (raw.includes('Kebonkangkung')) {
      raw = raw.replaceAll('Kebonkangkung', 'Kebon Kangkung');
      localStorage.setItem(key, raw);
    }
    if (key === STORAGE_KEYS.DUES && raw) {
      const demoWargaDueIds = ['due-01-06', 'due-02-01', 'due-02-02', 'due-03-05', 'due-04-06', 'due-05-01'];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.some((d: any) => demoWargaDueIds.includes(d.id))) {
          const cleaned = parsed.filter((d: any) => !demoWargaDueIds.includes(d.id));
          localStorage.setItem(key, JSON.stringify(cleaned));
          return cleaned as unknown as T;
        }
      } catch (e) {
        // ignore
      }
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return fallback;
  }
}

function setStorage<T>(key: string, data: T, triggerAutoSync: boolean = true): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    }
    if (
      triggerAutoSync &&
      key !== STORAGE_KEYS.IS_OFFLINE && 
      key !== STORAGE_KEYS.CURRENT_USER && 
      key !== STORAGE_KEYS.LAST_SYNCED_AT && 
      key !== STORAGE_KEYS.SYNC_VERSION
    ) {
      StorageService.scheduleAutoSync();
    }
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
}

export class StorageService {
  // Listeners for reactive updates
  private static listeners: Set<() => void> = new Set();
  private static syncListeners: Set<() => void> = new Set();

  // Server sync state
  private static autoSyncTimer: any = null;
  private static isSyncingInProgress: boolean = false;
  private static lastSyncMessage: string = 'Tersinkron ke Server & Link Publik';
  private static lastSyncTime: string | null = null;
  private static isServerConnected: boolean = true;

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public static subscribeSync(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private static notify(): void {
    this.listeners.forEach(fn => fn());
  }

  private static notifySync(): void {
    this.syncListeners.forEach(fn => fn());
  }

  // --- OFFLINE SIMULATOR ---
  public static isOffline(): boolean {
    return getStorage<boolean>(STORAGE_KEYS.IS_OFFLINE, false);
  }

  public static toggleOffline(): boolean {
    const next = !this.isOffline();
    setStorage(STORAGE_KEYS.IS_OFFLINE, next);
    this.notify();
    return next;
  }

  // --- SERVER & PUBLISH SYNCHRONIZATION ---
  public static getSyncStatus() {
    return {
      isSyncing: this.isSyncingInProgress,
      isOnline: !this.isOffline() && this.isServerConnected,
      lastSyncMessage: this.lastSyncMessage,
      lastSyncTime: this.lastSyncTime || getStorage<string | null>(STORAGE_KEYS.LAST_SYNCED_AT, null),
      version: getStorage<number>(STORAGE_KEYS.SYNC_VERSION, 1)
    };
  }

  public static scheduleAutoSync(): void {
    if (this.isOffline()) return;
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.pushToServer(false).catch(() => {});
    }, 2500);
  }

  public static getAllDataPayload(): Record<string, any> {
    return {
      users: this.getUsers(),
      deletedUsers: this.getDeletedUserIds(),
      residents: this.getResidents(),
      deletedResidents: this.getDeletedResidentIds(),
      families: this.getFamilies(),
      deletedFamilies: this.getDeletedFamilyKks(),
      letters: this.getLetters(),
      announcements: this.getAnnouncements(),
      events: this.getEvents(),
      complaints: this.getComplaints(),
      dues: this.getDues(),
      transactions: this.getTransactions(),
      setoranRt: this.getSetoranRt(),
      inventory: this.getInventory(),
      notifications: this.getNotifications(),
      auditLogs: this.getAuditLogs(),
      emergencyContacts: this.getEmergencyContacts(),
      wargaNgontrakUsaha: this.getWargaNgontrakUsaha()
    };
  }

  public static applyServerData(serverData: Record<string, any>): void {
    if (!serverData || typeof serverData !== 'object') return;

    // 1. Simpan daftar ID/NIK/KK yang telah dihapus secara mutlak terlebih dahulu
    const deletedUserIds: string[] = Array.isArray(serverData.deletedUsers)
      ? serverData.deletedUsers
      : this.getDeletedUserIds();
    setStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds, false);

    const deletedResidents: string[] = Array.isArray(serverData.deletedResidents)
      ? serverData.deletedResidents
      : this.getDeletedResidentIds();
    setStorage(STORAGE_KEYS.DELETED_RESIDENTS, deletedResidents, false);

    const deletedFamilies: string[] = Array.isArray(serverData.deletedFamilies)
      ? serverData.deletedFamilies
      : this.getDeletedFamilyKks();
    setStorage(STORAGE_KEYS.DELETED_FAMILIES, deletedFamilies, false);

    // 2. Terapkan data Pengguna (Users) - pastikan IT Admin selalu aman dan user terhapus dibuang
    if (Array.isArray(serverData.users)) {
      const cleanUsers = serverData.users.filter((u: User) => {
        if (u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003') return true;
        return !deletedUserIds.includes(u.userId) && (!u.NIK || u.NIK === '-' || !deletedUserIds.includes(u.NIK));
      });

      const itAdmin: User = {
        userId: 'usr-it-rw03',
        nama: 'IT RW 03',
        email: 'admin@kebonkangkung.id',
        nomorHP: '081226017803',
        NIK: '3273162601780003',
        password: 'Randu#106',
        role: 'super_admin',
        jabatan: 'Pengelola IT RW 03',
        RT: '01',
        RW: '03',
        alamat: 'Kantor Sekretariat RW 03 Kebon Kangkung',
        statusAkun: 'aktif',
        createdAt: '2026-01-01 00:00',
        updatedAt: '2026-09-26 19:00'
      };

      if (!cleanUsers.some((u: User) => u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003')) {
        cleanUsers.unshift(itAdmin);
      }

      setStorage(STORAGE_KEYS.USERS, cleanUsers, false);
    }

    // 3. Warga (Residents) - Terapkan langsung dari server snapshot, buang warga terhapus
    if (Array.isArray(serverData.residents)) {
      const cleanResidents = serverData.residents.filter((r: Resident) => {
        return !deletedResidents.includes(r.id) && (!r.NIK || !deletedResidents.includes(r.NIK));
      });
      setStorage(STORAGE_KEYS.RESIDENTS, cleanResidents, false);
    }

    // 4. Kartu Keluarga (Families) - Terapkan langsung dari server snapshot, buang KK terhapus
    if (Array.isArray(serverData.families)) {
      const cleanFamilies = serverData.families.filter((f: FamilyCard) => {
        return !deletedFamilies.includes(f.nomorKK);
      });
      setStorage(STORAGE_KEYS.FAMILIES, cleanFamilies, false);
    }

    // 5. Surat Pengantar (Letters) - Sinkron penuh
    if (Array.isArray(serverData.letters)) {
      setStorage(STORAGE_KEYS.LETTERS, serverData.letters, false);
    }

    // 6. Pengumuman (Announcements) - Sinkron penuh
    if (Array.isArray(serverData.announcements)) {
      setStorage(STORAGE_KEYS.ANNOUNCEMENTS, serverData.announcements, false);
    }

    // 7. Agenda Kegiatan (Events) - Sinkron penuh
    if (Array.isArray(serverData.events)) {
      setStorage(STORAGE_KEYS.EVENTS, serverData.events, false);
    }

    // 8. Pengaduan & Aspirasi Warga (Complaints) - Sinkron penuh
    if (Array.isArray(serverData.complaints)) {
      setStorage(STORAGE_KEYS.COMPLAINTS, serverData.complaints, false);
    }

    // 9. Iuran Warga (Dues) - Sinkron penuh
    if (Array.isArray(serverData.dues)) {
      setStorage(STORAGE_KEYS.DUES, serverData.dues, false);
    }

    // 10. Transaksi Keuangan Kas (Transactions) - Sinkron penuh
    if (Array.isArray(serverData.transactions)) {
      setStorage(STORAGE_KEYS.TRANSACTIONS, serverData.transactions, false);
    }

    // 11. Setoran RT ke RW (Setoran RT) - Sinkron penuh
    if (Array.isArray(serverData.setoranRt)) {
      setStorage(STORAGE_KEYS.SETORAN_RT, serverData.setoranRt, false);
    }

    // 12. Inventaris (Inventory) - Sinkron penuh
    if (Array.isArray(serverData.inventory)) {
      setStorage(STORAGE_KEYS.INVENTORY, serverData.inventory, false);
    }

    // 13. Notifikasi - Sinkron penuh
    if (Array.isArray(serverData.notifications)) {
      setStorage(STORAGE_KEYS.NOTIFICATIONS, serverData.notifications, false);
    }

    // 14. Audit Logs - Sinkron penuh
    if (Array.isArray(serverData.auditLogs)) {
      setStorage(STORAGE_KEYS.AUDIT_LOGS, serverData.auditLogs, false);
    }

    // 15. Warga Ngontrak & Tempat Usaha - Sinkron penuh
    if (Array.isArray(serverData.wargaNgontrakUsaha)) {
      setStorage(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, serverData.wargaNgontrakUsaha, false);
    }

    // 16. Kontak Darurat - Sinkron penuh
    if (Array.isArray(serverData.emergencyContacts)) {
      setStorage(STORAGE_KEYS.EMERGENCY_CONTACTS, serverData.emergencyContacts, false);
    }

    this.notify();
  }

  private static realtimeUnsubscribe: (() => void) | null = null;

  public static setupFirestoreRealtime(): void {
    if (this.realtimeUnsubscribe) return;
    this.realtimeUnsubscribe = FirestoreSyncService.subscribeToUpdates((payload) => {
      if (this.isOffline()) return;
      if (payload && payload.data) {
        const localVer = getStorage<number>(STORAGE_KEYS.SYNC_VERSION, 1);
        if (payload.version >= localVer || payload.isPublishedSnapshot) {
          console.log('[StorageService] Real-time online update received from Firestore (v' + payload.version + ')');
          this.applyServerData(payload.data);
          this.lastSyncTime = payload.lastSyncedAt;
          setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
          setStorage(STORAGE_KEYS.SYNC_VERSION, payload.version, false);
          this.lastSyncMessage = 'Tersinkronisasi online real-time via Cloud Firestore.';
          this.notifySync();
        }
      }
    });
  }

  public static async pushToServer(isPublishedSnapshot: boolean = false): Promise<{ success: boolean; message: string; counts?: any }> {
    if (this.isOffline()) {
      return { success: false, message: 'Mode offline aktif, data tersimpan di penyimpanan lokal browser.' };
    }
    this.isSyncingInProgress = true;
    this.notifySync();

    const payload = this.getAllDataPayload();
    const currentVer = getStorage<number>(STORAGE_KEYS.SYNC_VERSION, 1);
    const nextVer = currentVer + 1;

    let firestoreSuccess = false;
    let apiSuccess = false;
    let counts: any = null;

    // 1. Simpan ke Cloud Firestore online untuk sinkronisasi publik real-time
    try {
      const fRes = await FirestoreSyncService.saveSnapshot(payload, nextVer, isPublishedSnapshot);
      if (fRes.success) {
        firestoreSuccess = true;
        this.lastSyncTime = fRes.lastSyncedAt;
        setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
        setStorage(STORAGE_KEYS.SYNC_VERSION, nextVer, false);
      }
    } catch (fErr) {
      console.warn('[StorageService] Firestore saveSnapshot error:', fErr);
    }

    // 2. Simpan juga ke API backend (server.ts / api/index.ts)
    try {
      const endpoint = isPublishedSnapshot ? '/api/data/publish' : '/api/data/sync';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload, isPublishedSnapshot })
      });
      if (res.ok) {
        const resData = await res.json();
        apiSuccess = true;
        counts = resData.counts;
        if (!firestoreSuccess && resData.version) {
          setStorage(STORAGE_KEYS.SYNC_VERSION, resData.version, false);
          this.lastSyncTime = resData.lastSyncedAt || new Date().toISOString();
          setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
        }
      }
    } catch (apiErr) {
      console.warn('[StorageService] API push failed:', apiErr);
    }

    this.isSyncingInProgress = false;
    this.isServerConnected = firestoreSuccess || apiSuccess;

    if (firestoreSuccess || apiSuccess) {
      this.lastSyncMessage = isPublishedSnapshot 
        ? 'Seluruh data input dari semua Role berhasil disinkronkan & dipublikasikan secara online ke Cloud Firestore dan link publik!' 
        : 'Data berhasil disinkronkan ke Cloud Database pusat.';
      this.notifySync();

      return {
        success: true,
        message: this.lastSyncMessage,
        counts
      };
    } else {
      this.lastSyncMessage = 'Server offline sementara. Data Anda tetap aman di browser ini.';
      this.notifySync();
      return { success: false, message: this.lastSyncMessage };
    }
  }

  public static async pullFromServer(): Promise<boolean> {
    if (this.isOffline()) return false;
    this.isSyncingInProgress = true;
    this.notifySync();

    // 1. Coba ambil dari Cloud Firestore terlebih dahulu
    try {
      const cloudSnap = await FirestoreSyncService.fetchSnapshot();
      if (cloudSnap && cloudSnap.data) {
        this.applyServerData(cloudSnap.data);
        this.isServerConnected = true;
        this.isSyncingInProgress = false;
        this.lastSyncTime = cloudSnap.lastSyncedAt;
        setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
        setStorage(STORAGE_KEYS.SYNC_VERSION, cloudSnap.version, false);
        this.lastSyncMessage = 'Data terbaru berhasil dimuat secara online dari Cloud Firestore.';
        this.notifySync();
        return true;
      }
    } catch (e) {
      console.warn('[StorageService] Pull from Firestore error:', e);
    }

    // 2. Fallback ke endpoint /api/data
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.applyServerData(json.data);
          this.isServerConnected = true;
          this.isSyncingInProgress = false;
          this.lastSyncTime = json.lastSyncedAt || new Date().toISOString();
          setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
          if (json.version) setStorage(STORAGE_KEYS.SYNC_VERSION, json.version, false);
          this.lastSyncMessage = 'Data terbaru berhasil dimuat dari server pusat.';
          this.notifySync();
          return true;
        }
      }
    } catch (err) {
      console.warn('[StorageService] Pull from server API failed:', err);
      this.isServerConnected = false;
    }

    this.isSyncingInProgress = false;
    this.notifySync();
    return false;
  }

  public static async initSync(): Promise<void> {
    if (this.isOffline()) return;
    this.isSyncingInProgress = true;
    this.notifySync();

    let syncedFromCloud = false;

    // 1. Ambil data snapshot dari Cloud Firestore secara online
    try {
      const cloudSnap = await FirestoreSyncService.fetchSnapshot();
      if (cloudSnap && cloudSnap.data) {
        console.log('[StorageService] Synchronized with Cloud Firestore (v' + cloudSnap.version + ')');
        this.applyServerData(cloudSnap.data);
        this.isServerConnected = true;
        this.lastSyncTime = cloudSnap.lastSyncedAt;
        setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
        setStorage(STORAGE_KEYS.SYNC_VERSION, cloudSnap.version, false);
        this.lastSyncMessage = 'Data semua Role tersinkronisasi online dari Cloud Firestore & Publik.';
        syncedFromCloud = true;
      }
    } catch (e) {
      console.warn('[StorageService] Cloud Firestore init fetch error:', e);
    }

    // 2. Fallback ke endpoint /api/data jika Firestore belum merespons
    if (!syncedFromCloud) {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            this.isServerConnected = true;
            this.applyServerData(json.data);
            this.lastSyncTime = json.lastSyncedAt || new Date().toISOString();
            setStorage(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncTime, false);
            if (json.version) setStorage(STORAGE_KEYS.SYNC_VERSION, json.version, false);
            this.lastSyncMessage = 'Data terbaru berhasil dimuat dari server.';
            syncedFromCloud = true;
          }
        }
      } catch (e) {
        console.warn('[StorageService] Server API sync check failed:', e);
      }
    }

    this.isSyncingInProgress = false;
    this.notifySync();

    // 3. Pasang pendengar real-time Firestore untuk sinkronisasi antar perangkat & peran
    this.setupFirestoreRealtime();
  }

  public static exportDatabaseJson(): string {
    const data = this.getAllDataPayload();
    return JSON.stringify({
      app: 'Digital RW 03 Kebon Kangkung',
      exportedAt: new Date().toISOString(),
      version: getStorage<number>(STORAGE_KEYS.SYNC_VERSION, 1),
      data
    }, null, 2);
  }

  public static async importDatabaseJson(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      this.applyServerData(data);
      await this.pushToServer(true);
      return true;
    } catch (e) {
      console.error('[StorageService] Failed to import database json:', e);
      return false;
    }
  }

  // --- AUTH & CURRENT USER ---
  public static getCurrentUser(): User {
    const deletedUserIds = this.getDeletedUserIds();
    const defaultUser = INITIAL_USERS.find(u => !deletedUserIds.includes(u.userId)) || INITIAL_USERS[0];
    const current = getStorage<User>(STORAGE_KEYS.CURRENT_USER, defaultUser);
    if (
      current.userId === 'usr-bendahara-01' ||
      current.email === 'nina.bendahara@kebonkangkung.id' ||
      current.userId === 'usr-warga-rt01' ||
      current.email === 'yayan.mulyana@gmail.com' ||
      (current.role === 'warga' && (current.RT === '01' || current.RT === '1') && current.userId === 'usr-warga-rt01') ||
      deletedUserIds.includes(current.userId) || 
      (current.NIK && current.NIK !== '-' && deletedUserIds.includes(current.NIK))
    ) {
      setStorage(STORAGE_KEYS.CURRENT_USER, defaultUser);
      return defaultUser;
    }
    return current;
  }

  public static setCurrentUser(user: User): void {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
    this.logAction(
      user.userId,
      user.nama,
      user.role,
      'SWITCH_USER',
      'Autentikasi',
      undefined,
      `Beralih akun ke ${user.nama} (${user.role})`
    );
    this.notify();
  }

  public static getDeletedUserIds(): string[] {
    return getStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
  }

  public static getUsers(): User[] {
    const deletedUserIds = this.getDeletedUserIds();
    let list = getStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let changed = false;

    // Bersihkan persona lama Fajar Nugraha jika tersimpan di cache
    const initialLen = list.length;
    list = list.filter(u => u.userId !== 'usr-admin-01' && !u.nama.toLowerCase().includes('fajar nugraha'));
    if (list.length !== initialLen) {
      changed = true;
    }

    // Bersihkan role demo bendahara dan warga RT 01 jika tersimpan di cache
    const demoFilterLen = list.length;
    list = list.filter(u => 
      u.userId !== 'usr-bendahara-01' && 
      u.email !== 'nina.bendahara@kebonkangkung.id' &&
      u.userId !== 'usr-warga-rt01' && 
      u.email !== 'yayan.mulyana@gmail.com' &&
      !(u.role === 'warga' && (u.RT === '01' || u.RT === '1') && u.userId === 'usr-warga-rt01')
    );
    if (list.length !== demoFilterLen) {
      changed = true;
    }

    // Pastikan akun IT ADMIN tidak pernah terhapus atau diblokir
    if (deletedUserIds.includes('usr-it-rw03') || deletedUserIds.includes('3273162601780003')) {
      const cleanDeleted = deletedUserIds.filter(id => id !== 'usr-it-rw03' && id !== '3273162601780003');
      setStorage(STORAGE_KEYS.DELETED_USERS, cleanDeleted);
    }

    if (deletedUserIds.length > 0) {
      const prevLen = list.length;
      list = list.filter(u => {
        if (u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003') return true;
        return !deletedUserIds.includes(u.userId) && (!u.NIK || u.NIK === '-' || !deletedUserIds.includes(u.NIK));
      });
      if (list.length !== prevLen) {
        changed = true;
      }
    }

    for (const u of INITIAL_USERS) {
      const isItAdmin = u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003';
      if (!isItAdmin && (deletedUserIds.includes(u.userId) || (u.NIK && u.NIK !== '-' && deletedUserIds.includes(u.NIK)))) {
        continue;
      }
      const idx = list.findIndex(existing => existing.userId === u.userId || existing.NIK === u.NIK);
      if (idx === -1) {
        list.push(u);
        changed = true;
      } else {
        if (u.password && list[idx].password !== u.password) {
          list[idx].password = u.password;
          changed = true;
        }
        if (u.userId === 'usr-it-rw03') {
          if (list[idx].nama !== u.nama) {
            list[idx].nama = u.nama;
            changed = true;
          }
          if (list[idx].NIK !== '3273162601780003') {
            list[idx].NIK = '3273162601780003';
            changed = true;
          }
          if (list[idx].password !== 'Randu#106') {
            list[idx].password = 'Randu#106';
            changed = true;
          }
        }
      }
    }

    // Pastikan IT Admin mutlak ada dalam list
    if (!list.some(u => u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003')) {
      list.unshift(INITIAL_USERS[0]);
      changed = true;
    }

    if (changed) {
      setStorage(STORAGE_KEYS.USERS, list);
    }
    return list;
  }

  public static addUser(user: User): void {
    const deletedUserIds = this.getDeletedUserIds();
    const filteredDeleted = deletedUserIds.filter(id => id !== user.userId && (!user.NIK || id !== user.NIK));
    if (filteredDeleted.length !== deletedUserIds.length) {
      setStorage(STORAGE_KEYS.DELETED_USERS, filteredDeleted);
    }
    const list = this.getUsers();
    const existingIdx = list.findIndex(u => u.userId === user.userId || (u.NIK && user.NIK && u.NIK !== '-' && u.NIK === user.NIK));
    if (existingIdx >= 0) {
      list[existingIdx] = user;
    } else {
      list.push(user);
    }
    setStorage(STORAGE_KEYS.USERS, list);
    this.notify();
    this.pushToServer(true).catch(() => {});
  }

  public static updateUser(userId: string, data: Partial<User>): User | null {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.userId === userId);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    setStorage(STORAGE_KEYS.USERS, list);
    this.notify();
    this.pushToServer(true).catch(() => {});
    return list[idx];
  }

  public static deleteUser(userId: string): boolean {
    const list = this.getUsers();
    const target = list.find(u => u.userId === userId || (u.NIK && u.NIK !== '-' && u.NIK === userId));
    if (!target) return false;

    // Larang penghapusan akun IT Admin
    if (target.userId === 'usr-it-rw03' || target.NIK === '3273162601780003' || target.role === 'super_admin') {
      console.warn('[StorageService] Akun IT Admin tidak boleh dihapus.');
      return false;
    }

    // 1. Simpan ke daftar ID/NIK terhapus permanen agar tidak pernah muncul lagi dari seed maupun cache
    const deletedUserIds = this.getDeletedUserIds();
    if (target.userId && !deletedUserIds.includes(target.userId)) {
      deletedUserIds.push(target.userId);
    }
    if (target.NIK && target.NIK !== '-' && !deletedUserIds.includes(target.NIK)) {
      deletedUserIds.push(target.NIK);
    }
    setStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds);

    // 2. Hapus secara permanen dari daftar USERS di storage
    const filtered = list.filter(u => 
      u.userId !== target.userId && 
      (!target.NIK || target.NIK === '-' || u.NIK !== target.NIK)
    );
    setStorage(STORAGE_KEYS.USERS, filtered);

    // 3. Benar-benar hapus dari seluruh data terkait warga (RESIDENTS) jika terdata dengan NIK atau ID yang sama
    if (target.NIK && target.NIK !== '-') {
      const residents = this.getResidents();
      const residentTarget = residents.find(r => r.NIK === target.NIK || r.id === target.userId);
      if (residentTarget) {
        const deletedResidentIds = this.getDeletedResidentIds();
        if (residentTarget.id && !deletedResidentIds.includes(residentTarget.id)) deletedResidentIds.push(residentTarget.id);
        if (residentTarget.NIK && !deletedResidentIds.includes(residentTarget.NIK)) deletedResidentIds.push(residentTarget.NIK);
        setStorage(STORAGE_KEYS.DELETED_RESIDENTS, deletedResidentIds);

        const filteredResidents = residents.filter(r => r.id !== residentTarget.id && r.NIK !== residentTarget.NIK);
        setStorage(STORAGE_KEYS.RESIDENTS, filteredResidents);

        if (residentTarget.nomorKK) {
          const families = this.getFamilies();
          const famIndex = families.findIndex(f => f.nomorKK === residentTarget.nomorKK);
          if (famIndex !== -1) {
            const remaining = filteredResidents.filter(r => r.nomorKK === residentTarget.nomorKK);
            families[famIndex].jumlahAnggota = remaining.length;
            setStorage(STORAGE_KEYS.FAMILIES, families);
          }
        }
      }
    }

    // 4. Jika akun yang dihapus sedang aktif sebagai currentUser, beralih ke Super Admin
    const cur = this.getCurrentUser();
    if (cur && (cur.userId === target.userId || (target.NIK && target.NIK !== '-' && cur.NIK === target.NIK))) {
      const fallbackUser = filtered.find(u => u.role === 'super_admin') || 
                           INITIAL_USERS.find(u => u.role === 'super_admin') || 
                           INITIAL_USERS[0];
      setStorage(STORAGE_KEYS.CURRENT_USER, fallbackUser);
    }

    this.notify();
    return true;
  }

  // --- RESIDENTS (DATA WARGA) ---
  public static getDeletedResidentIds(): string[] {
    return getStorage<string[]>(STORAGE_KEYS.DELETED_RESIDENTS, []);
  }

  public static getResidents(): Resident[] {
    const deletedIds = this.getDeletedResidentIds();
    let list = getStorage<Resident[]>(STORAGE_KEYS.RESIDENTS, []);

    // Pastikan resident yang sudah pernah dihapus tidak muncul kembali
    if (deletedIds.length > 0) {
      const prevLength = list.length;
      list = list.filter(r => !deletedIds.includes(r.id) && !deletedIds.includes(r.NIK));
      if (list.length !== prevLength) {
        setStorage(STORAGE_KEYS.RESIDENTS, list);
      }
    }
    return list;
  }

  // Warga aktif: hanya warga yang berstatus tinggal aktif (bukan 'Meninggal' dan bukan 'Pindah')
  public static getActiveResidents(): Resident[] {
    return this.getResidents().filter(r => r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah');
  }

  public static normalizeRt(val?: string | number): string {
    if (val === undefined || val === null) return '02';
    const str = String(val).replace(/\D/g, '');
    return str ? String(parseInt(str, 10)).padStart(2, '0') : String(val).trim();
  }

  public static addResident(residentData: Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>): Resident {
    const residents = this.getResidents();
    const effectiveRt = this.normalizeRt(residentData.rt);
    const effectiveRw = residentData.rw || '03';

    const newResident: Resident = {
      ...residentData,
      rt: effectiveRt,
      rw: effectiveRw,
      id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    // Bersihkan dari daftar warga terhapus jika NIK pernah dihapus sebelumnya
    const deletedIds = this.getDeletedResidentIds();
    if (deletedIds.includes(newResident.id) || (newResident.NIK && deletedIds.includes(newResident.NIK))) {
      const cleaned = deletedIds.filter(id => id !== newResident.id && id !== newResident.NIK);
      setStorage(STORAGE_KEYS.DELETED_RESIDENTS, cleaned);
    }

    // Jika warga dengan NIK ini sudah pernah terdaftar, perbarui agar tidak terjadi duplikasi
    const existingIndex = newResident.NIK 
      ? residents.findIndex(r => r.NIK === newResident.NIK) 
      : -1;

    if (existingIndex >= 0) {
      newResident.id = residents[existingIndex].id;
      newResident.createdAt = residents[existingIndex].createdAt;
      residents[existingIndex] = newResident;
    } else {
      residents.push(newResident);
    }

    // Susun terurut alfabetis (A - Z) berdasarkan nama lengkap
    residents.sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, 'id', { sensitivity: 'base' }));
    setStorage(STORAGE_KEYS.RESIDENTS, residents);

    // Bersihkan KK dari daftar terhapus jika nomor KK ini pernah terhapus
    if (newResident.nomorKK) {
      const deletedKks = this.getDeletedFamilyKks();
      if (deletedKks.includes(newResident.nomorKK)) {
        setStorage(STORAGE_KEYS.DELETED_FAMILIES, deletedKks.filter(k => k !== newResident.nomorKK));
      }
    }

    // Update Family Card count if exists or create new KK automatically
    const families = this.getFamilies();
    const familyIndex = families.findIndex(f => f.nomorKK === newResident.nomorKK);
    const isInactiveResident = newResident.statusWarga === 'Meninggal' || newResident.statusWarga === 'Pindah';

    if (familyIndex >= 0) {
      families[familyIndex].jumlahAnggota = residents.filter(
        r => r.nomorKK === newResident.nomorKK && r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah'
      ).length;
      if (newResident.hubunganKeluarga === 'Kepala Keluarga' && !isInactiveResident) {
        families[familyIndex].namaKepalaKeluarga = newResident.namaLengkap;
      }
      setStorage(STORAGE_KEYS.FAMILIES, families);
    } else if (newResident.nomorKK) {
      // Buat Kartu Keluarga otomatis jika belum ada di sistem
      const newFamily: FamilyCard = {
        nomorKK: newResident.nomorKK,
        namaKepalaKeluarga: newResident.hubunganKeluarga === 'Kepala Keluarga' 
          ? newResident.namaLengkap 
          : `Keluarga ${newResident.namaLengkap}`,
        alamat: newResident.alamat || `Jl. Kebon Kangkung RT ${effectiveRt}/RW ${effectiveRw}`,
        rt: effectiveRt,
        rw: effectiveRw,
        nomorRumah: '01',
        statusRumah: 'Milik Sendiri',
        jumlahAnggota: isInactiveResident ? 0 : 1,
        createdAt: new Date().toISOString().substring(0, 10)
      };
      families.unshift(newFamily);
      setStorage(STORAGE_KEYS.FAMILIES, families);
    }

    // Buat akun user warga otomatis jika belum ada di data pengguna
    try {
      const users = this.getUsers();
      if (newResident.NIK && !users.some(u => u.NIK === newResident.NIK)) {
        const newWargaUser: User = {
          userId: `usr-warga-${newResident.id}`,
          nama: newResident.namaLengkap,
          email: newResident.email || `${newResident.NIK}@warga.kebonkangkung.id`,
          nomorHP: newResident.nomorHP || '-',
          NIK: newResident.NIK,
          password: 'Warga#123',
          role: 'warga',
          RT: effectiveRt,
          RW: effectiveRw,
          alamat: newResident.alamat || `Jl. Kebon Kangkung RT ${effectiveRt}/RW ${effectiveRw}`,
          statusAkun: isInactiveResident ? 'nonaktif' : 'aktif',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        users.push(newWargaUser);
        setStorage(STORAGE_KEYS.USERS, users);
      }
    } catch (e) {
      console.warn('Failed to sync user account for new resident', e);
    }

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_WARGA',
      'Warga',
      newResident.id,
      `Menambahkan warga baru: ${newResident.namaLengkap} (NIK: ${newResident.NIK}, RT ${newResident.rt}, Status: ${newResident.statusWarga})`
    );

    this.notify();
    return newResident;
  }

  public static updateResident(id: string, updates: Partial<Resident>): boolean {
    const residents = this.getResidents();
    const index = residents.findIndex(r => r.id === id);
    if (index === -1) return false;

    residents[index] = {
      ...residents[index],
      ...updates,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setStorage(STORAGE_KEYS.RESIDENTS, residents);

    // Update jumlah anggota KK aktif (tidak termasuk warga meninggal atau pindah)
    if (residents[index].nomorKK) {
      const families = this.getFamilies();
      const famIndex = families.findIndex(f => f.nomorKK === residents[index].nomorKK);
      if (famIndex !== -1) {
        const remainingLiving = residents.filter(
          r => r.nomorKK === residents[index].nomorKK && r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah'
        );
        families[famIndex].jumlahAnggota = remainingLiving.length;
        setStorage(STORAGE_KEYS.FAMILIES, families);
      }
    }

    // Jika status dirubah menjadi Meninggal atau Pindah, nonaktifkan akun user login terkait
    const isNowInactive = residents[index].statusWarga === 'Meninggal' || residents[index].statusWarga === 'Pindah';
    if (residents[index].NIK && isNowInactive) {
      const users = this.getUsers();
      const userIdx = users.findIndex(u => u.NIK === residents[index].NIK);
      if (userIdx !== -1 && users[userIdx].role === 'warga') {
        users[userIdx].statusAkun = 'nonaktif';
        setStorage(STORAGE_KEYS.USERS, users);
      }
    }

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'EDIT_WARGA',
      'Warga',
      id,
      `Memperbarui data warga: ${residents[index].namaLengkap} (Status: ${residents[index].statusWarga})`
    );

    this.notify();
    return true;
  }

  public static deleteResident(id: string): boolean {
    const residents = this.getResidents();
    const target = residents.find(r => r.id === id);
    if (!target) return false;

    // Catat ID dan NIK warga yang dihapus agar tidak muncul kembali
    const deletedIds = this.getDeletedResidentIds();
    if (!deletedIds.includes(target.id)) deletedIds.push(target.id);
    if (target.NIK && !deletedIds.includes(target.NIK)) deletedIds.push(target.NIK);
    setStorage(STORAGE_KEYS.DELETED_RESIDENTS, deletedIds);

    const filtered = residents.filter(r => r.id !== id && (!target.NIK || r.NIK !== target.NIK));
    setStorage(STORAGE_KEYS.RESIDENTS, filtered);

    // Update family member count jika nomorKK ada
    if (target.nomorKK) {
      const families = this.getFamilies();
      const famIndex = families.findIndex(f => f.nomorKK === target.nomorKK);
      if (famIndex !== -1) {
        const remaining = filtered.filter(r => r.nomorKK === target.nomorKK);
        families[famIndex].jumlahAnggota = remaining.length;
        setStorage(STORAGE_KEYS.FAMILIES, families);
      }
    }

    // Bersihkan juga akun user terkait di USERS jika ada
    if (target.NIK) {
      const users = this.getUsers();
      const userTarget = users.find(u => (u.NIK && u.NIK === target.NIK) || u.userId === `usr-warga-${target.id}`);
      if (userTarget && userTarget.role !== 'super_admin') {
        const deletedUserIds = this.getDeletedUserIds();
        if (!deletedUserIds.includes(userTarget.userId)) deletedUserIds.push(userTarget.userId);
        if (userTarget.NIK && userTarget.NIK !== '-' && !deletedUserIds.includes(userTarget.NIK)) deletedUserIds.push(userTarget.NIK);
        setStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds);
        const filteredUsers = users.filter(u => u.userId !== userTarget.userId && u.NIK !== target.NIK);
        setStorage(STORAGE_KEYS.USERS, filteredUsers);
      }
    }

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_WARGA',
      'Warga',
      id,
      `Menghapus data warga: ${target.namaLengkap} (NIK: ${target.NIK}, RT ${target.rt})`
    );

    this.notify();
    return true;
  }

  // --- KARTU KELUARGA (KK) ---
  public static getDeletedFamilyKks(): string[] {
    return getStorage<string[]>(STORAGE_KEYS.DELETED_FAMILIES, []);
  }

  public static getFamilies(): FamilyCard[] {
    const deletedKks = this.getDeletedFamilyKks();
    let list = getStorage<FamilyCard[]>(STORAGE_KEYS.FAMILIES, []);

    if (deletedKks.length > 0) {
      const prevLen = list.length;
      list = list.filter(f => !deletedKks.includes(f.nomorKK));
      if (list.length !== prevLen) {
        setStorage(STORAGE_KEYS.FAMILIES, list);
      }
    }

    return list;
  }

  public static getFamilyMembers(nomorKK: string): Resident[] {
    return this.getResidents().filter(r => r.nomorKK === nomorKK);
  }

  /**
   * Menemukan data Kartu Keluarga dan Anggota Keluarga yang akurat sesuai Pengguna/Warga yang Login.
   * Pencocokan dilakukan berurutan: NIK Warga -> Nama Lengkap Warga -> Kepala Keluarga -> RT -> Sintesis Baru.
   */
  public static getFamilyForUser(user: User): { family: FamilyCard; members: Resident[] } {
    const families = this.getFamilies();
    const residents = this.getResidents();
    const cleanNik = (user.NIK || '').trim();
    const cleanNama = (user.nama || '').trim().toLowerCase();
    const userRt = this.normalizeRt(user.RT || '02');

    // 1. Pencocokan NIK Warga yang login dengan Data Kependudukan (Resident)
    if (cleanNik && cleanNik !== '-') {
      const matchRes = residents.find(r => r.NIK === cleanNik);
      if (matchRes && matchRes.nomorKK) {
        const fam = families.find(f => f.nomorKK === matchRes.nomorKK);
        if (fam) {
          return {
            family: fam,
            members: this.getFamilyMembers(fam.nomorKK)
          };
        }
      }
    }

    // 2. Pencocokan Nama Lengkap Warga yang login dengan Data Kependudukan
    const matchResByName = residents.find(r => {
      const rName = r.namaLengkap.trim().toLowerCase();
      return rName === cleanNama || rName.includes(cleanNama) || cleanNama.includes(rName);
    });
    if (matchResByName && matchResByName.nomorKK) {
      const fam = families.find(f => f.nomorKK === matchResByName.nomorKK);
      if (fam) {
        return {
          family: fam,
          members: this.getFamilyMembers(fam.nomorKK)
        };
      }
    }

    // 3. Pencocokan langsung dengan nama Kepala Keluarga di daftar Kartu Keluarga
    const famByKepala = families.find(f => {
      const fKepala = f.namaKepalaKeluarga.trim().toLowerCase();
      return fKepala === cleanNama || fKepala.includes(cleanNama) || cleanNama.includes(fKepala);
    });
    if (famByKepala) {
      return {
        family: famByKepala,
        members: this.getFamilyMembers(famByKepala.nomorKK)
      };
    }

    // 4. Pencocokan berdasarkan wilayah RT yang sama dengan Warga
    const famsInSameRt = families.filter(f => this.normalizeRt(f.rt) === userRt);
    if (famsInSameRt.length > 0) {
      const bestRtFam = famsInSameRt.find(f => 
        f.namaKepalaKeluarga.toLowerCase().includes(cleanNama) || cleanNama.includes(f.namaKepalaKeluarga.toLowerCase())
      ) || famsInSameRt[0];

      return {
        family: bestRtFam,
        members: this.getFamilyMembers(bestRtFam.nomorKK)
      };
    }

    // 5. Jika akun warga mandiri/baru mendaftar dan belum ada KK, buatkan data KK resmi yang terverifikasi
    const generatedKk = cleanNik.length >= 12
      ? `327318${cleanNik.slice(6, 12)}0001`
      : `32731824050800${userRt}`;

    const newFamily: FamilyCard = {
      nomorKK: generatedKk,
      namaKepalaKeluarga: user.nama,
      alamat: user.alamat || `Jl. Kebon Kangkung RT ${userRt} / RW 03`,
      rt: userRt,
      rw: '03',
      nomorRumah: '10',
      statusRumah: 'Milik Sendiri',
      jumlahAnggota: 1,
      createdAt: user.createdAt?.substring(0, 10) || new Date().toISOString().substring(0, 10)
    };

    const newResident: Resident = {
      id: `res-${user.userId || Date.now()}`,
      NIK: cleanNik || `327318${Date.now().toString().slice(-10)}`,
      nomorKK: generatedKk,
      namaLengkap: user.nama,
      tempatLahir: 'Bandung',
      tanggalLahir: '1990-01-01',
      usia: 35,
      jenisKelamin: 'L',
      agama: 'Islam',
      statusPerkawinan: 'Kawin',
      hubunganKeluarga: 'Kepala Keluarga',
      pendidikan: 'SMA/Sederajat',
      pekerjaan: 'Wiraswasta',
      nomorHP: user.nomorHP || '-',
      email: user.email,
      alamat: newFamily.alamat,
      rt: newFamily.rt,
      rw: '03',
      statusDomisili: 'KTP & Domisili',
      statusWarga: 'Tetap',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.addFamily(newFamily);
    this.addResident(newResident);

    return {
      family: newFamily,
      members: [newResident]
    };
  }

  public static addFamily(family: Omit<FamilyCard, 'createdAt' | 'jumlahAnggota'>): FamilyCard {
    const deletedKks = this.getDeletedFamilyKks();
    if (deletedKks.includes(family.nomorKK)) {
      setStorage(STORAGE_KEYS.DELETED_FAMILIES, deletedKks.filter(k => k !== family.nomorKK));
    }

    const families = this.getFamilies();
    const newFamily: FamilyCard = {
      ...family,
      jumlahAnggota: 1,
      createdAt: new Date().toISOString().substring(0, 10)
    };
    families.unshift(newFamily);
    setStorage(STORAGE_KEYS.FAMILIES, families);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_KK',
      'Warga',
      newFamily.nomorKK,
      `Menambahkan Kartu Keluarga baru No. ${newFamily.nomorKK} an. ${newFamily.namaKepalaKeluarga}`
    );

    this.notify();
    return newFamily;
  }

  public static deleteFamily(nomorKK: string): boolean {
    const families = this.getFamilies();
    const target = families.find(f => f.nomorKK === nomorKK);
    if (!target) return false;

    const deletedKks = this.getDeletedFamilyKks();
    if (!deletedKks.includes(nomorKK)) {
      deletedKks.push(nomorKK);
      setStorage(STORAGE_KEYS.DELETED_FAMILIES, deletedKks);
    }

    const filtered = families.filter(f => f.nomorKK !== nomorKK);
    setStorage(STORAGE_KEYS.FAMILIES, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_WARGA',
      'Warga',
      nomorKK,
      `Super Admin menghapus data Kartu Keluarga No. ${nomorKK} an. ${target.namaKepalaKeluarga} (RT ${target.rt}/RW ${target.rw})`
    );

    this.notify();
    return true;
  }

  // --- PENGAJUAN SURAT ---
  public static getLetters(): LetterRequest[] {
    return getStorage<LetterRequest[]>(STORAGE_KEYS.LETTERS, []);
  }

  public static createLetterRequest(request: Omit<LetterRequest, 'id' | 'status' | 'tanggalPengajuan' | 'nomorSurat'>): LetterRequest {
    const letters = this.getLetters();
    const newLetter: LetterRequest = {
      ...request,
      id: `let-${Date.now()}`,
      status: 'diajukan',
      tanggalPengajuan: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    letters.unshift(newLetter);
    setStorage(STORAGE_KEYS.LETTERS, letters);

    // Push notification to RT
    this.addNotification({
      judul: 'Pengajuan Surat Baru',
      pesan: `${newLetter.namaPemohon} mengajukan ${newLetter.jenisSurat} di RT ${newLetter.rt}.`,
      tipe: 'surat',
      targetRole: 'pengurus_rt',
      targetRt: newLetter.rt,
      linkTab: 'surat'
    });

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'AJUKAN_SURAT',
      'Surat',
      newLetter.id,
      `Mengajukan ${newLetter.jenisSurat} untuk keperluan: ${newLetter.keperluan.substring(0, 30)}...`
    );

    this.notify();
    return newLetter;
  }

  public static approveLetterByRt(id: string, notes: string): boolean {
    const letters = this.getLetters();
    const index = letters.findIndex(l => l.id === id);
    if (index === -1) return false;

    const cur = this.getCurrentUser();
    letters[index].status = 'disetujui_rt';
    letters[index].catatanRt = notes;
    letters[index].disetujuiRtOleh = cur.nama;
    letters[index].disetujuiRtPada = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setStorage(STORAGE_KEYS.LETTERS, letters);

    // Notify RW
    this.addNotification({
      judul: 'Surat Terverifikasi RT',
      pesan: `Surat an. ${letters[index].namaPemohon} telah disetujui RT ${letters[index].rt} & siap ditandatangani RW.`,
      tipe: 'surat',
      targetRole: 'ketua_rw',
      linkTab: 'surat'
    });

    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'SETUJUI_SURAT_RT',
      'Surat',
      id,
      `Pengurus RT ${letters[index].rt} menyetujui pengajuan surat: ${letters[index].jenisSurat}`
    );

    this.notify();
    return true;
  }

  public static approveLetterByRw(id: string, notes: string): boolean {
    const letters = this.getLetters();
    const index = letters.findIndex(l => l.id === id);
    if (index === -1) return false;

    const cur = this.getCurrentUser();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const now = new Date();
    const month = romanMonths[now.getMonth()];
    const year = now.getFullYear();
    const count = letters.filter(l => l.status === 'selesai' || l.status === 'disetujui_rw').length + 50;

    letters[index].status = 'selesai';
    letters[index].nomorSurat = `${String(count).padStart(3, '0')}/RT.${letters[index].rt}/RW.03/${month}/${year}`;
    letters[index].catatanRw = notes;
    letters[index].disetujuiRwOleh = cur.nama;
    letters[index].disetujuiRwPada = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setStorage(STORAGE_KEYS.LETTERS, letters);

    // Notify citizen
    this.addNotification({
      judul: 'Surat Resmi Telah Selesai',
      pesan: `Surat ${letters[index].jenisSurat} Anda telah ditandatangani Ketua RW dan dapat diunduh/dicetak.`,
      tipe: 'surat',
      targetUserId: letters[index].pemohonId,
      linkTab: 'surat'
    });

    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'SETUJUI_SURAT_RW',
      'Surat',
      id,
      `Ketua RW menyetujui & menerbitkan No. Surat ${letters[index].nomorSurat}`
    );

    this.notify();
    return true;
  }

  public static rejectLetter(id: string, reason: string): boolean {
    const letters = this.getLetters();
    const index = letters.findIndex(l => l.id === id);
    if (index === -1) return false;

    const cur = this.getCurrentUser();
    letters[index].status = 'ditolak';
    if (cur.role === 'pengurus_rt') {
      letters[index].catatanRt = `Ditolak: ${reason}`;
    } else {
      letters[index].catatanRw = `Ditolak: ${reason}`;
    }

    setStorage(STORAGE_KEYS.LETTERS, letters);

    this.addNotification({
      judul: 'Pengajuan Surat Ditolak',
      pesan: `Pengajuan ${letters[index].jenisSurat} belum dapat diproses: ${reason}`,
      tipe: 'surat',
      targetUserId: letters[index].pemohonId,
      linkTab: 'surat'
    });

    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TOLAK_SURAT',
      'Surat',
      id,
      `Menolak pengajuan surat dengan alasan: ${reason}`
    );

    this.notify();
    return true;
  }

  public static deleteLetter(id: string): boolean {
    const letters = this.getLetters();
    const target = letters.find(l => l.id === id);
    if (!target) return false;

    const filtered = letters.filter(l => l.id !== id);
    setStorage(STORAGE_KEYS.LETTERS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_SURAT',
      'Surat',
      id,
      `Super Admin menghapus pengajuan ${target.jenisSurat} pemohon: ${target.namaPemohon} (NIK: ${target.nikPemohon})`
    );

    this.notify();
    this.scheduleAutoSync();
    return true;
  }

  // --- PENGUMUMAN ---
  public static getAnnouncements(): Announcement[] {
    return getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, []);
  }

  public static addAnnouncement(item: Omit<Announcement, 'id' | 'tanggalPublikasi'>): Announcement {
    const list = this.getAnnouncements();
    const newAnc: Announcement = {
      ...item,
      id: `anc-${Date.now()}`,
      tanggalPublikasi: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(newAnc);
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, list);

    this.addNotification({
      judul: `Pengumuman: ${newAnc.judul}`,
      pesan: newAnc.isi.substring(0, 100) + '...',
      tipe: 'pengumuman',
      targetRt: newAnc.targetRt,
      linkTab: 'pengumuman'
    });

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'BUAT_PENGUMUMAN',
      'Pengumuman',
      newAnc.id,
      `Mempublikasikan pengumuman: ${newAnc.judul}`
    );

    this.notify();
    return newAnc;
  }

  public static updateAnnouncement(id: string, updates: Partial<Announcement>): boolean {
    const list = this.getAnnouncements();
    const index = list.findIndex(a => a.id === id);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      ...updates
    };
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'UPDATE_PENGUMUMAN',
      'Pengumuman',
      id,
      `Memperbarui pengumuman: ${list[index].judul}`
    );

    this.notify();
    return true;
  }

  public static deleteAnnouncement(id: string): boolean {
    const list = this.getAnnouncements();
    const target = list.find(a => a.id === id);
    if (!target) return false;

    const filtered = list.filter(a => a.id !== id);
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_PENGUMUMAN',
      'Pengumuman',
      id,
      `Menghapus pengumuman: ${target.judul}`
    );

    this.notify();
    return true;
  }

  // --- AGENDA / KEGIATAN ---
  public static getEvents(): CommunityEvent[] {
    return getStorage<CommunityEvent[]>(STORAGE_KEYS.EVENTS, []);
  }

  public static addEvent(event: Omit<CommunityEvent, 'id'>): CommunityEvent {
    const list = this.getEvents();
    const newEvt: CommunityEvent = {
      ...event,
      id: `evt-${Date.now()}`
    };
    list.unshift(newEvt);
    setStorage(STORAGE_KEYS.EVENTS, list);

    this.addNotification({
      judul: `Agenda Baru: ${newEvt.namaKegiatan}`,
      pesan: `Pelaksanaan: ${newEvt.tanggal} jam ${newEvt.waktu} di ${newEvt.lokasi}`,
      tipe: 'agenda',
      linkTab: 'agenda'
    });

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'BUAT_AGENDA',
      'Pengumuman',
      newEvt.id,
      `Menambahkan agenda baru: ${newEvt.namaKegiatan}`
    );

    this.notify();
    return newEvt;
  }

  public static updateEvent(id: string, updates: Partial<CommunityEvent>): boolean {
    const list = this.getEvents();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      ...updates
    };
    setStorage(STORAGE_KEYS.EVENTS, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'UPDATE_AGENDA',
      'Pengumuman',
      id,
      `Memperbarui agenda kegiatan: ${list[index].namaKegiatan}`
    );

    this.notify();
    return true;
  }

  public static deleteEvent(id: string): boolean {
    const list = this.getEvents();
    const target = list.find(e => e.id === id);
    if (!target) return false;

    const filtered = list.filter(e => e.id !== id);
    setStorage(STORAGE_KEYS.EVENTS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_AGENDA',
      'Pengumuman',
      id,
      `Menghapus agenda kegiatan: ${target.namaKegiatan}`
    );

    this.notify();
    return true;
  }

  // --- PENGADUAN WARGA ---
  public static getComplaints(): Complaint[] {
    return getStorage<Complaint[]>(STORAGE_KEYS.COMPLAINTS, []);
  }

  public static addComplaint(item: Omit<Complaint, 'id' | 'status' | 'tanggalLaporan' | 'komentar'>): Complaint {
    const list = this.getComplaints();
    const newCmp: Complaint = {
      ...item,
      id: `cmp-${Date.now()}`,
      status: 'Baru',
      tanggalLaporan: new Date().toISOString().replace('T', ' ').substring(0, 16),
      komentar: []
    };
    list.unshift(newCmp);
    setStorage(STORAGE_KEYS.COMPLAINTS, list);

    // Notify RT & RW
    this.addNotification({
      judul: 'Laporan Warga Masuk',
      pesan: `Warga melapor masalah "${newCmp.judul}" di wilayah RT ${newCmp.rt}.`,
      tipe: 'pengaduan',
      targetRole: 'pengurus_rt',
      targetRt: newCmp.rt,
      linkTab: 'pengaduan'
    });

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'BUAT_PENGADUAN',
      'Pengaduan',
      newCmp.id,
      `Mengirimkan aduan lingkungan: ${newCmp.judul}`
    );

    this.notify();
    return newCmp;
  }

  public static updateComplaintStatus(id: string, status: Complaint['status'], responseText?: string): boolean {
    const list = this.getComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return false;

    const cur = this.getCurrentUser();
    list[index].status = status;
    if (responseText) {
      list[index].tanggapanPengurus = responseText;
      list[index].komentar.push({
        id: `c-${Date.now()}`,
        nama: `${cur.nama} (${cur.role === 'ketua_rw' ? 'Ketua RW' : cur.role === 'bendahara' ? 'Bendahara RW' : 'Pengurus RT'})`,
        role: cur.role,
        pesan: responseText,
        tanggal: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    setStorage(STORAGE_KEYS.COMPLAINTS, list);

    this.addNotification({
      judul: `Status Pengaduan Diperbarui: ${status}`,
      pesan: `Pengaduan "${list[index].judul}" sekarang berstatus: ${status}`,
      tipe: 'pengaduan',
      targetUserId: list[index].pelaporId,
      linkTab: 'pengaduan'
    });

    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'UPDATE_PENGADUAN',
      'Pengaduan',
      id,
      `Mengubah status pengaduan menjadi "${status}"`
    );

    this.notify();
    return true;
  }

  public static deleteComplaint(id: string): boolean {
    const list = this.getComplaints();
    const target = list.find(c => c.id === id);
    if (!target) return false;

    const filtered = list.filter(c => c.id !== id);
    setStorage(STORAGE_KEYS.COMPLAINTS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_PENGADUAN',
      'Pengaduan',
      id,
      `Menghapus laporan pengaduan: ${target.judul} (Status: ${target.status})`
    );

    this.notify();
    return true;
  }

  // --- IURAN WARGA ---
  public static getDues(): DueBill[] {
    return getStorage<DueBill[]>(STORAGE_KEYS.DUES, []);
  }

  public static addDueBill(item: Omit<DueBill, 'id'>): DueBill {
    const dues = this.getDues();

    // Validasi Duplikat: Cegah input ganda untuk Kepala Keluarga dengan Jenis Iuran dan Periode yang sama
    const isDuplicate = dues.some(d => {
      const samePeriod = d.periode.trim().toLowerCase() === item.periode.trim().toLowerCase();
      if (!samePeriod) return false;

      const sameJenis = (d.jenisIuran || '').trim().toLowerCase() === (item.jenisIuran || '').trim().toLowerCase();
      if (!sameJenis) return false;

      if (item.kategoriWarga === 'ngontrak_usaha' || item.wargaNgontrakUsahaId) {
        const sameUsaha = item.wargaNgontrakUsahaId && d.wargaNgontrakUsahaId === item.wargaNgontrakUsahaId;
        const sameNama = d.namaKepalaKeluarga.trim().toLowerCase() === item.namaKepalaKeluarga.trim().toLowerCase();
        return sameUsaha || sameNama;
      }

      const cleanKk = (item.nomorKK || '').trim();
      const sameKk = cleanKk && cleanKk !== '3273180000000000' && d.nomorKK.trim() === cleanKk;
      const sameNama = d.namaKepalaKeluarga.trim().toLowerCase() === item.namaKepalaKeluarga.trim().toLowerCase();
      return sameKk || sameNama;
    });

    if (isDuplicate) {
      console.warn('Gagal menambah iuran: Duplikat Kepala Keluarga dan Periode Tagihan.');
      return null as any;
    }

    const newBill: DueBill = {
      ...item,
      id: `due-${Date.now()}`
    };
    dues.unshift(newBill);
    setStorage(STORAGE_KEYS.DUES, dues);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_IURAN',
      'Iuran',
      newBill.id,
      `Menambahkan iuran ${newBill.jenisIuran} an. ${newBill.namaKepalaKeluarga} Rp ${newBill.nominal.toLocaleString('id-ID')} (${newBill.status})`
    );

    this.notify();
    return newBill;
  }

  public static updateDueBill(id: string, updates: Partial<DueBill>): boolean {
    const dues = this.getDues();
    const index = dues.findIndex(d => d.id === id);
    if (index === -1) return false;

    dues[index] = {
      ...dues[index],
      ...updates
    };

    setStorage(STORAGE_KEYS.DUES, dues);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'EDIT_IURAN',
      'Iuran',
      id,
      `Memperbarui iuran ${dues[index].jenisIuran} an. ${dues[index].namaKepalaKeluarga}: Rp ${dues[index].nominal.toLocaleString('id-ID')} (${dues[index].status})`
    );

    this.notify();
    return true;
  }

  public static deleteDueBill(id: string): boolean {
    const dues = this.getDues();
    const target = dues.find(d => d.id === id);
    if (!target) return false;

    const remaining = dues.filter(d => d.id !== id);
    setStorage(STORAGE_KEYS.DUES, remaining);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_IURAN',
      'Iuran',
      id,
      `Menghapus tagihan iuran ${target.jenisIuran} an. ${target.namaKepalaKeluarga} (${target.periode})`
    );

    this.notify();
    return true;
  }

  public static payDueBill(id: string, method: 'QRIS' | 'Transfer Bank' | 'Tunai ke Petugas RT'): boolean {
    const dues = this.getDues();
    const index = dues.findIndex(d => d.id === id);
    if (index === -1) return false;

    dues[index].status = 'Lunas';
    dues[index].metodeBayar = method;
    dues[index].tanggalBayar = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setStorage(STORAGE_KEYS.DUES, dues);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'BAYAR_IURAN',
      'Iuran',
      id,
      `Pembayaran iuran ${dues[index].jenisIuran} Rp ${dues[index].nominal.toLocaleString('id-ID')} (${method})`
    );

    this.notify();
    return true;
  }

  // --- KEUANGAN (BUKU KAS & TRANSPARANSI RW 03) ---
  // Buku Kas RW 03 dikelola secara transparan dan berubah jika ada penginputan Catat Transaksi dan Catat Pengeluaran
  public static getTransactions(): FinancialTransaction[] {
    let list = getStorage<FinancialTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    
    // Bersihkan transaksi sisa tagihan individu (trx-due-*) jika ada agar Buku Kas bersih dan murni dari Catat Transaksi & Catat Pengeluaran
    const hasDueTransactions = list.some(t => t.id.startsWith('trx-due-'));
    if (hasDueTransactions) {
      list = list.filter(t => !t.id.startsWith('trx-due-'));
      setStorage(STORAGE_KEYS.TRANSACTIONS, list);
    }

    let changed = false;
    for (const t of list) {
      if (t.pencatat && t.pencatat.toLowerCase().includes('fajar nugraha')) {
        t.pencatat = 'IT RW 03 (Super Admin)';
        changed = true;
      }
      if (t.id === 'trx-11' && t.lingkup === 'RT') {
        t.lingkup = 'RW';
        t.kategori = 'Setoran Kas RT 02';
        t.keterangan = 'Setoran kas lingkungan terkoordinasi dari RT 02 ke RW 03';
        changed = true;
      }
      if (!t.jenisSetoran) {
        t.jenisSetoran = this.isSosialTransaction(t) ? 'Sosial & Kematian' : 'IWD';
        changed = true;
      }
      if (!t.sumberDana) {
        t.sumberDana = t.jenisSetoran || (this.isSosialTransaction(t) ? 'Sosial & Kematian' : 'IWD');
        changed = true;
      }
    }
    if (changed) {
      setStorage(STORAGE_KEYS.TRANSACTIONS, list);
    }
    return list;
  }

  public static addTransaction(item: Omit<FinancialTransaction, 'id'>): FinancialTransaction {
    const list = this.getTransactions();
    const newTrx: FinancialTransaction = {
      ...item,
      id: `trx-${Date.now()}`
    };
    list.unshift(newTrx);
    setStorage(STORAGE_KEYS.TRANSACTIONS, list);

    // Jika transaksi memiliki data setoranRt, sinkronkan ke Buku Kas Setoran RT
    if (newTrx.setoranRt) {
      const setoranList = this.getSetoranRt();
      const newSetoran: SetoranIwdRt = {
        id: `setor-${Date.now()}`,
        setoranRt: newTrx.setoranRt,
        tanggalSetor: newTrx.tanggal,
        jumlahSetor: newTrx.nominal,
        keterangan: newTrx.keterangan,
        pencatat: newTrx.pencatat,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setoranList.unshift(newSetoran);
      setStorage(STORAGE_KEYS.SETORAN_RT, setoranList);
    }

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'CATAT_TRANSAKSI',
      'Keuangan',
      newTrx.id,
      `${newTrx.tipe} Rp ${newTrx.nominal.toLocaleString('id-ID')} (${newTrx.setoranRt || newTrx.kategori}): ${newTrx.keterangan}`
    );

    this.notify();
    return newTrx;
  }

  public static updateTransaction(id: string, updated: Partial<FinancialTransaction>): FinancialTransaction | null {
    const list = this.getTransactions();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const newTrx: FinancialTransaction = {
      ...existing,
      ...updated,
      id: existing.id
    };
    list[index] = newTrx;
    setStorage(STORAGE_KEYS.TRANSACTIONS, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'EDIT_TRANSAKSI',
      'Keuangan',
      newTrx.id,
      `Edit ${newTrx.tipe} Rp ${newTrx.nominal.toLocaleString('id-ID')} (${newTrx.setoranRt || newTrx.kategori}): ${newTrx.keterangan}`
    );

    this.notify();
    return newTrx;
  }

  public static deleteTransaction(id: string): boolean {
    const list = this.getTransactions();
    const existing = list.find(t => t.id === id);
    if (!existing) return false;

    const filtered = list.filter(t => t.id !== id);
    setStorage(STORAGE_KEYS.TRANSACTIONS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_TRANSAKSI',
      'Keuangan',
      id,
      `Hapus ${existing.tipe} Rp ${existing.nominal.toLocaleString('id-ID')} (${existing.setoranRt || existing.kategori}): ${existing.keterangan}`
    );

    this.notify();
    return true;
  }

  public static isSosialTransaction(t: FinancialTransaction): boolean {
    if (t.jenisSetoran === 'Sosial & Kematian' || t.sumberDana === 'Sosial & Kematian') return true;
    if (t.jenisSetoran === 'IWD' || t.sumberDana === 'IWD') return false;
    const kat = (t.kategori || '').toLowerCase();
    const ket = (t.keterangan || '').toLowerCase();
    return (
      kat.includes('sosial') ||
      kat.includes('kematian') ||
      kat.includes('santunan') ||
      kat.includes('duka') ||
      kat.includes('takziah') ||
      ket.includes('sosial') ||
      ket.includes('kematian') ||
      ket.includes('santunan') ||
      ket.includes('duka') ||
      ket.includes('takziah')
    );
  }

  public static getKasSosialSummary() {
    const transactions = this.getTransactions();
    const totalMasuk = transactions
      .filter(t => t.tipe === 'Pemasukan' && this.isSosialTransaction(t))
      .reduce((acc, curr) => acc + curr.nominal, 0);
    const totalKeluar = transactions
      .filter(t => t.tipe === 'Pengeluaran' && this.isSosialTransaction(t))
      .reduce((acc, curr) => acc + curr.nominal, 0);
    const saldo = totalMasuk - totalKeluar;
    return { totalMasuk, totalKeluar, saldo };
  }

  public static getKasRwSummary() {
    const transactions = this.getTransactions();
    // Jenis Setoran Sosial & Kematian tidak ditotalkan pada Total Pemasukan Kas RW, Total Pengeluaran Kas RW dan Saldo Kas RW 03
    const totalMasuk = transactions
      .filter(t => t.tipe === 'Pemasukan' && !this.isSosialTransaction(t))
      .reduce((acc, curr) => acc + curr.nominal, 0);
    const totalKeluar = transactions
      .filter(t => t.tipe === 'Pengeluaran' && !this.isSosialTransaction(t))
      .reduce((acc, curr) => acc + curr.nominal, 0);
    const saldo = totalMasuk - totalKeluar;
    return { totalMasuk, totalKeluar, saldo };
  }

  // --- REKAPITULASI IWD UNTUK SINKRONISASI BUKU KAS ---
  public static getIwdSyncSummary() {
    const dues = this.getDues();
    const lunasDues = dues.filter(d => d.status === 'Lunas');
    const totalLunas = lunasDues.reduce((acc, curr) => acc + curr.nominal, 0);
    const countLunas = lunasDues.length;

    const rtBreakdown: Record<'01' | '02' | '03' | '04' | '05', { countLunas: number; lunas: number; countTotal: number; total: number }> = {
      '01': { countLunas: 0, lunas: 0, countTotal: 0, total: 0 },
      '02': { countLunas: 0, lunas: 0, countTotal: 0, total: 0 },
      '03': { countLunas: 0, lunas: 0, countTotal: 0, total: 0 },
      '04': { countLunas: 0, lunas: 0, countTotal: 0, total: 0 },
      '05': { countLunas: 0, lunas: 0, countTotal: 0, total: 0 }
    };

    dues.forEach(d => {
      const rawRt = d.rt || '01';
      const rtKey = (rawRt.replace(/[^0-9]/g, '') || '01').padStart(2, '0') as '01' | '02' | '03' | '04' | '05';
      if (rtBreakdown[rtKey]) {
        rtBreakdown[rtKey].countTotal += 1;
        rtBreakdown[rtKey].total += d.nominal;
        if (d.status === 'Lunas') {
          rtBreakdown[rtKey].countLunas += 1;
          rtBreakdown[rtKey].lunas += d.nominal;
        }
      }
    });

    return {
      countLunas,
      totalLunas,
      rtBreakdown
    };
  }

  // --- SETORAN IWD RT (BUKU KAS SETORAN RT) ---
  public static getSetoranRt(): SetoranIwdRt[] {
    return getStorage<SetoranIwdRt[]>(STORAGE_KEYS.SETORAN_RT, []);
  }

  public static addSetoranRt(data: Omit<SetoranIwdRt, 'id' | 'createdAt'>): SetoranIwdRt {
    const list = this.getSetoranRt();
    const newRecord: SetoranIwdRt = {
      ...data,
      id: `setor-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    list.unshift(newRecord);
    setStorage(STORAGE_KEYS.SETORAN_RT, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'CATAT_SETORAN_RT',
      'Keuangan',
      newRecord.id,
      `Catat Setoran IWD ${data.setoranRt} Rp ${data.jumlahSetor.toLocaleString('id-ID')}: ${data.keterangan}`
    );

    // Otomatis sinkronisasi tercatat ke Buku Kas Keuangan RW sebagai Pemasukan
    const trxList = this.getTransactions();
    const newTrx: FinancialTransaction = {
      id: `trx-setor-${Date.now()}`,
      tipe: 'Pemasukan',
      kategori: `Setoran IWD ${data.setoranRt}`,
      nominal: data.jumlahSetor,
      tanggal: data.tanggalSetor,
      keterangan: data.keterangan,
      lingkup: 'RW',
      setoranRt: data.setoranRt,
      pencatat: data.pencatat
    };
    trxList.unshift(newTrx);
    setStorage(STORAGE_KEYS.TRANSACTIONS, trxList);

    this.notify();
    return newRecord;
  }

  // --- INVENTARIS ---
  public static getInventory(): InventoryItem[] {
    return getStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY, []);
  }

  public static addInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const list = this.getInventory();
    const newInv: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`
    };
    list.unshift(newInv);
    setStorage(STORAGE_KEYS.INVENTORY, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_INVENTARIS',
      'Inventaris',
      newInv.id,
      `Menambahkan inventaris baru: ${newInv.namaBarang} (${newInv.jumlahTotal} unit)`
    );

    this.notify();
    return newInv;
  }

  public static borrowInventory(id: string, borrowerName: string, rt: string, purpose: string, returnDate: string): boolean {
    const list = this.getInventory();
    const index = list.findIndex(i => i.id === id);
    if (index === -1 || list[index].jumlahTersedia <= 0) return false;

    list[index].jumlahTersedia -= 1;
    list[index].status = 'Sedang Dipinjam';
    list[index].peminjamSaatIni = {
      nama: borrowerName,
      rt,
      keperluan: purpose,
      tglPinjam: new Date().toISOString().substring(0, 10),
      rencanaKembali: returnDate
    };

    setStorage(STORAGE_KEYS.INVENTORY, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'PINJAM_INVENTARIS',
      'Inventaris',
      id,
      `Peminjaman ${list[index].namaBarang} oleh ${borrowerName} (RT ${rt})`
    );

    this.notify();
    return true;
  }

  public static returnInventory(id: string): boolean {
    const list = this.getInventory();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return false;

    list[index].jumlahTersedia += 1;
    list[index].status = list[index].jumlahTersedia === list[index].jumlahTotal ? 'Tersedia' : 'Sedang Dipinjam';
    list[index].peminjamSaatIni = undefined;

    setStorage(STORAGE_KEYS.INVENTORY, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'KEMBALIKAN_INVENTARIS',
      'Inventaris',
      id,
      `Pengembalian inventaris: ${list[index].namaBarang}`
    );

    this.notify();
    return true;
  }

  public static updateInventoryItem(id: string, updates: Partial<Omit<InventoryItem, 'id'>>): boolean {
    const list = this.getInventory();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      ...updates
    };
    setStorage(STORAGE_KEYS.INVENTORY, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'EDIT_INVENTARIS',
      'Inventaris',
      id,
      `Memperbarui data inventaris: ${list[index].namaBarang}`
    );

    this.notify();
    return true;
  }

  public static deleteInventoryItem(id: string): boolean {
    const list = this.getInventory();
    const itemToDelete = list.find(i => i.id === id);
    const filtered = list.filter(i => i.id !== id);
    if (filtered.length === list.length) return false;

    setStorage(STORAGE_KEYS.INVENTORY, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_INVENTARIS',
      'Inventaris',
      id,
      `Menghapus data inventaris: ${itemToDelete?.namaBarang || id}`
    );

    this.notify();
    return true;
  }

  // --- NOTIFIKASI ---
  public static getNotifications(): AppNotification[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const clearedFlag = localStorage.getItem('rw03_notif_cleared_v1');
      if (!clearedFlag) {
        setStorage(STORAGE_KEYS.NOTIFICATIONS, []);
        localStorage.setItem('rw03_notif_cleared_v1', 'true');
        return [];
      }
    }
    return getStorage<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  public static addNotification(item: Omit<AppNotification, 'id' | 'tanggal' | 'dibaca'>): void {
    const list = this.getNotifications();
    const newNotif: AppNotification = {
      ...item,
      id: `notif-${Date.now()}`,
      tanggal: new Date().toISOString().replace('T', ' ').substring(0, 16),
      dibaca: false
    };
    list.unshift(newNotif);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
    this.notify();
  }

  public static markNotificationRead(id: string): void {
    const list = this.getNotifications();
    const index = list.findIndex(n => n.id === id);
    if (index >= 0) {
      list[index].dibaca = true;
      setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
      this.notify();
    }
  }

  public static markAllNotificationsRead(): void {
    const list = this.getNotifications().map(n => ({ ...n, dibaca: true }));
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
    this.notify();
  }

  public static deleteNotification(id: string): boolean {
    const list = this.getNotifications();
    const filtered = list.filter(n => n.id !== id);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, filtered);
    this.notify();
    return true;
  }

  public static clearAllNotifications(): void {
    setStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    this.notify();
  }

  // --- AUDIT LOGS ---
  public static getAuditLogs(): AuditLog[] {
    return getStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public static logAction(
    userId: string,
    namaUser: string,
    role: string,
    action: string,
    module: AuditLog['module'],
    targetId?: string,
    detail: string = '',
    metadata?: Record<string, any>
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      namaUser,
      role,
      action,
      module,
      targetId,
      detail,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      metadata
    };
    logs.unshift(newLog);
    // Keep last 150 logs in storage
    if (logs.length > 150) logs.length = 150;
    setStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  public static deleteAuditLog(id: string): boolean {
    const logs = this.getAuditLogs();
    const filtered = logs.filter(l => l.id !== id);
    setStorage(STORAGE_KEYS.AUDIT_LOGS, filtered);
    this.notify();
    return true;
  }

  public static clearAllAuditLogs(): void {
    setStorage(STORAGE_KEYS.AUDIT_LOGS, []);
    this.notify();
  }

  // --- EMERGENCY CONTACTS ---
  public static getEmergencyContacts(): EmergencyContact[] {
    return getStorage<EmergencyContact[]>(STORAGE_KEYS.EMERGENCY_CONTACTS, INITIAL_EMERGENCY_CONTACTS);
  }

  public static addEmergencyContact(item: Omit<EmergencyContact, 'id'>): EmergencyContact {
    const list = this.getEmergencyContacts();
    const newContact: EmergencyContact = {
      ...item,
      id: `emg-${Date.now()}`
    };
    list.push(newContact);
    setStorage(STORAGE_KEYS.EMERGENCY_CONTACTS, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_KONTAK',
      'Sistem',
      newContact.id,
      `Menambahkan kontak darurat: ${newContact.nama} (${newContact.kategori})`
    );

    this.notify();
    this.scheduleAutoSync();
    return newContact;
  }

  public static deleteEmergencyContact(id: string): boolean {
    const list = this.getEmergencyContacts();
    const target = list.find(c => c.id === id);
    if (!target) return false;

    const filtered = list.filter(c => c.id !== id);
    setStorage(STORAGE_KEYS.EMERGENCY_CONTACTS, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_KONTAK',
      'Sistem',
      id,
      `Super Admin menghapus kontak darurat: ${target.nama} (${target.kategori})`
    );

    this.notify();
    this.scheduleAutoSync();
    return true;
  }

  // --- WARGA NGONTRAK USAHA ---
  public static getWargaNgontrakUsaha(): WargaNgontrakUsaha[] {
    return getStorage<WargaNgontrakUsaha[]>(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, []);
  }

  public static addWargaNgontrakUsaha(item: Omit<WargaNgontrakUsaha, 'id' | 'createdAt' | 'updatedAt'>): WargaNgontrakUsaha {
    const list = this.getWargaNgontrakUsaha();
    const newItem: WargaNgontrakUsaha = {
      ...item,
      id: `wng-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(newItem);
    setStorage(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'TAMBAH_NGONTRAK_USAHA',
      'Sistem',
      newItem.id,
      `Mendaftarkan warga ngontrak usaha baru: ${newItem.namaUsaha} (Nama CP: ${newItem.namaCp}, RT ${newItem.rt})`
    );

    this.notify();
    return newItem;
  }

  public static updateWargaNgontrakUsaha(id: string, updates: Partial<WargaNgontrakUsaha>): boolean {
    const list = this.getWargaNgontrakUsaha();
    const idx = list.findIndex(w => w.id === id);
    if (idx === -1) return false;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setStorage(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, list);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'EDIT_NGONTRAK_USAHA',
      'Sistem',
      id,
      `Memperbarui data warga ngontrak usaha: ${list[idx].namaUsaha} (Nama CP: ${list[idx].namaCp})`
    );

    this.notify();
    return true;
  }

  public static deleteWargaNgontrakUsaha(id: string): boolean {
    const list = this.getWargaNgontrakUsaha();
    const target = list.find(w => w.id === id);
    if (!target) return false;

    const filtered = list.filter(w => w.id !== id);
    setStorage(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, filtered);

    const cur = this.getCurrentUser();
    this.logAction(
      cur.userId,
      cur.nama,
      cur.role,
      'HAPUS_NGONTRAK_USAHA',
      'Sistem',
      id,
      `Menghapus data warga ngontrak usaha: ${target.namaUsaha} (Nama CP: ${target.namaCp})`
    );

    this.notify();
    return true;
  }

  // --- RESET ALL DATA TO DEMO SEED ---
  public static async resetToDemoData(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
    setStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStorage(STORAGE_KEYS.DELETED_USERS, []);
    setStorage(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    setStorage(STORAGE_KEYS.RESIDENTS, INITIAL_RESIDENTS);
    setStorage(STORAGE_KEYS.DELETED_RESIDENTS, []);
    setStorage(STORAGE_KEYS.FAMILIES, INITIAL_FAMILIES);
    setStorage(STORAGE_KEYS.DELETED_FAMILIES, []);
    setStorage(STORAGE_KEYS.LETTERS, INITIAL_LETTERS);
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    setStorage(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    setStorage(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    setStorage(STORAGE_KEYS.DUES, INITIAL_DUES);
    setStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    setStorage(STORAGE_KEYS.SETORAN_RT, INITIAL_SETORAN_RT);
    setStorage(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    setStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setStorage(STORAGE_KEYS.WARGA_NGONTRAK_USAHA, INITIAL_WARGA_NGONTRAK_USAHA);
    setStorage(STORAGE_KEYS.IS_OFFLINE, false);
    await this.pushToServer(true);
    this.notify();
  }

  // Helper for masking NIK
  public static maskNik(nik: string, isPrivileged: boolean = false): string {
    if (isPrivileged) return nik;
    if (!nik || nik.length < 12) return '****************';
    return `${nik.substring(0, 6)}******${nik.substring(nik.length - 4)}`;
  }
}
