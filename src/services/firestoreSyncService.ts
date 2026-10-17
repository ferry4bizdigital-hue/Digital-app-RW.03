import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  Firestore, 
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.warn('[FirestoreSyncService] Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Inisialisasi Firebase App & Firestore
let app: any = null;
let db: Firestore | null = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('[FirestoreSyncService] Failed to initialize Firestore:', err);
}

export interface SyncPayload {
  version: number;
  lastSyncedAt: string;
  lastPublishedAt?: string;
  isPublishedSnapshot?: boolean;
  data: Record<string, any>;
  source?: string;
}

export class FirestoreSyncService {
  private static readonly SNAPSHOT_COLLECTION = 'system';
  private static readonly SNAPSHOT_DOC_ID = 'database_snapshot';
  private static isConnected: boolean = true;
  private static activeUnsubscribe: Unsubscribe | null = null;

  public static isAvailable(): boolean {
    return !!db;
  }

  /**
   * Mengambil snapshot basis data terbaru dari cloud Firestore
   */
  public static async fetchSnapshot(): Promise<SyncPayload | null> {
    if (!db) return null;
    const docPath = `${this.SNAPSHOT_COLLECTION}/${this.SNAPSHOT_DOC_ID}`;

    try {
      const docRef = doc(db, this.SNAPSHOT_COLLECTION, this.SNAPSHOT_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const snapData = docSnap.data();
        let payloadData: any = null;

        // Mendukung penyimpanan baik berupa JSON string terkompresi maupun object map
        if (snapData.dataJson) {
          try {
            payloadData = JSON.parse(snapData.dataJson);
          } catch (e) {
            console.error('[FirestoreSyncService] Error parsing dataJson:', e);
          }
        }
        if (!payloadData && snapData.data) {
          payloadData = snapData.data;
        }

        this.isConnected = true;
        return {
          version: snapData.version || 1,
          lastSyncedAt: snapData.lastSyncedAt || new Date().toISOString(),
          lastPublishedAt: snapData.lastPublishedAt,
          isPublishedSnapshot: snapData.isPublishedSnapshot ?? true,
          data: payloadData || {},
          source: 'firestore_cloud'
        };
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Menyimpan snapshot basis data terpadu ke cloud Firestore
   * Agar dapat diakses online oleh semua Role dan publik di deploy Vercel
   */
  public static async saveSnapshot(
    dataPayload: Record<string, any>, 
    version: number, 
    isPublishedSnapshot: boolean = true
  ): Promise<{ success: boolean; version: number; lastSyncedAt: string; error?: string }> {
    if (!db) {
      return { 
        success: false, 
        version, 
        lastSyncedAt: new Date().toISOString(), 
        error: 'Firestore belum terinisialisasi' 
      };
    }

    const docPath = `${this.SNAPSHOT_COLLECTION}/${this.SNAPSHOT_DOC_ID}`;
    const nowIso = new Date().toISOString();

    try {
      const docRef = doc(db, this.SNAPSHOT_COLLECTION, this.SNAPSHOT_DOC_ID);
      const jsonString = JSON.stringify(dataPayload);

      await setDoc(docRef, {
        version,
        lastSyncedAt: nowIso,
        lastPublishedAt: isPublishedSnapshot ? nowIso : undefined,
        isPublishedSnapshot,
        dataJson: jsonString,
        counts: {
          users: Array.isArray(dataPayload.users) ? dataPayload.users.length : 0,
          residents: Array.isArray(dataPayload.residents) ? dataPayload.residents.length : 0,
          families: Array.isArray(dataPayload.families) ? dataPayload.families.length : 0,
          letters: Array.isArray(dataPayload.letters) ? dataPayload.letters.length : 0,
          dues: Array.isArray(dataPayload.dues) ? dataPayload.dues.length : 0,
          transactions: Array.isArray(dataPayload.transactions) ? dataPayload.transactions.length : 0,
          complaints: Array.isArray(dataPayload.complaints) ? dataPayload.complaints.length : 0,
          announcements: Array.isArray(dataPayload.announcements) ? dataPayload.announcements.length : 0,
          events: Array.isArray(dataPayload.events) ? dataPayload.events.length : 0,
        },
        updatedByRole: 'multi_role_sync',
        cloudPlatform: 'vercel_online'
      });

      this.isConnected = true;
      return {
        success: true,
        version,
        lastSyncedAt: nowIso
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
      this.isConnected = false;
      return {
        success: false,
        version,
        lastSyncedAt: nowIso,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Berlangganan (listen) perubahan real-time dari Firestore
   * Setiap ada role lain (RT, RW, Bendahara, IT Admin, Warga) yang memperbarui data,
   * listener ini akan langsung menerima pembaruan otomatis tanpa perlu refresh halaman
   */
  public static subscribeToUpdates(onUpdate: (payload: SyncPayload) => void): () => void {
    if (!db) {
      return () => {};
    }

    const docPath = `${this.SNAPSHOT_COLLECTION}/${this.SNAPSHOT_DOC_ID}`;
    try {
      const docRef = doc(db, this.SNAPSHOT_COLLECTION, this.SNAPSHOT_DOC_ID);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const snapData = docSnap.data();
          let payloadData: any = null;

          if (snapData.dataJson) {
            try {
              payloadData = JSON.parse(snapData.dataJson);
            } catch (e) {
              console.error('[FirestoreSyncService] Error parsing snapshot dataJson:', e);
            }
          }
          if (!payloadData && snapData.data) {
            payloadData = snapData.data;
          }

          if (payloadData) {
            onUpdate({
              version: snapData.version || 1,
              lastSyncedAt: snapData.lastSyncedAt || new Date().toISOString(),
              lastPublishedAt: snapData.lastPublishedAt,
              isPublishedSnapshot: snapData.isPublishedSnapshot ?? true,
              data: payloadData,
              source: 'firestore_realtime'
            });
          }
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, docPath);
      });

      this.activeUnsubscribe = unsubscribe;
      return () => {
        if (this.activeUnsubscribe) {
          this.activeUnsubscribe();
          this.activeUnsubscribe = null;
        }
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
      return () => {};
    }
  }

  public static getIsConnected(): boolean {
    return this.isConnected;
  }
}
