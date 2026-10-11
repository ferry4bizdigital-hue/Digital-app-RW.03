import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = express();

// Parse JSON and form payloads up to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json');
const TMP_DB_FILE = '/tmp/database.json';

let inMemoryDb: any = null;
let fbDb: any = null;

try {
  const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  fbDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn('[Vercel API] Firestore initialization note:', e);
}

const IT_ADMIN_USER = {
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

async function readCloudSnapshot(): Promise<any> {
  if (!fbDb) return null;
  try {
    const snap = await getDoc(doc(fbDb, 'system', 'database_snapshot'));
    if (snap.exists()) {
      const snapData = snap.data();
      let data = snapData.data;
      if (!data && snapData.dataJson) {
        try {
          data = JSON.parse(snapData.dataJson);
        } catch (e) {
          console.error('[Vercel API] Error parsing dataJson:', e);
        }
      }
      if (data && typeof data === 'object') {
        data.version = snapData.version || data.version || 20;
        data.lastSyncedAt = snapData.lastSyncedAt || data.lastSyncedAt || new Date().toISOString();
        data.isPublishedSnapshot = snapData.isPublishedSnapshot ?? true;

        if (!Array.isArray(data.users)) {
          data.users = [IT_ADMIN_USER];
        } else if (!data.users.some((u: any) => u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003')) {
          data.users.unshift(IT_ADMIN_USER);
        }

        inMemoryDb = data;
        return inMemoryDb;
      }
    }
  } catch (err) {
    console.warn('[Vercel API] Cloud snapshot read failed:', err);
  }
  return null;
}

async function writeCloudSnapshot(data: any): Promise<boolean> {
  if (!fbDb) return false;
  try {
    const nowIso = new Date().toISOString();
    await setDoc(doc(fbDb, 'system', 'database_snapshot'), {
      version: data.version || 20,
      lastSyncedAt: data.lastSyncedAt || nowIso,
      lastPublishedAt: data.isPublishedSnapshot ? nowIso : undefined,
      isPublishedSnapshot: data.isPublishedSnapshot ?? true,
      dataJson: JSON.stringify(data),
      updatedByRole: 'vercel_api',
      cloudPlatform: 'vercel'
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Vercel API] Cloud snapshot write failed:', err);
    return false;
  }
}

function readDatabase(): any {
  if (inMemoryDb) return inMemoryDb;

  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const content = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(content);
      return inMemoryDb;
    }
  } catch (err) {
    console.error('[Vercel API] Error reading /tmp/database.json:', err);
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(content);
    }
  } catch (err) {
    console.error('[Vercel API] Error reading data/database.json:', err);
  }

  if (inMemoryDb) {
    if (!Array.isArray(inMemoryDb.users)) {
      inMemoryDb.users = [IT_ADMIN_USER];
    } else if (!inMemoryDb.users.some((u: any) => u.userId === 'usr-it-rw03' || u.NIK === '3273162601780003')) {
      inMemoryDb.users.unshift(IT_ADMIN_USER);
    }
    return inMemoryDb;
  }

  // Fallback empty structure with IT Admin
  inMemoryDb = {
    version: 20,
    lastSyncedAt: new Date().toISOString(),
    isPublishedSnapshot: true,
    users: [IT_ADMIN_USER],
    residents: [],
    families: [],
    letters: [],
    announcements: [],
    events: [],
    complaints: [],
    dues: [],
    transactions: [],
    setoranRt: [],
    inventory: [],
    notifications: [],
    auditLogs: [],
    emergencyContacts: [],
    wargaNgontrakUsaha: []
  };
  return inMemoryDb;
}

function writeDatabase(data: any): boolean {
  inMemoryDb = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    // Vercel serverless has a read-only filesystem; persist to /tmp
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (tmpErr) {
      console.warn('[Vercel API] Memory fallback (filesystem read-only):', tmpErr);
      return true;
    }
  }
}

// Router for API endpoints
const router = express.Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    databaseExists: fs.existsSync(DB_FILE) || fs.existsSync(TMP_DB_FILE) || !!inMemoryDb
  });
});

// Get database
router.get('/data', async (req: Request, res: Response) => {
  let db = await readCloudSnapshot();
  if (!db) {
    db = readDatabase();
  }
  return res.json({
    success: true,
    version: db.version || 20,
    lastSyncedAt: db.lastSyncedAt || new Date().toISOString(),
    isPublishedSnapshot: db.isPublishedSnapshot ?? true,
    data: db,
    cloudSync: !!fbDb
  });
});

// Summary status of data
router.get('/data/status', async (req: Request, res: Response) => {
  let db = await readCloudSnapshot();
  if (!db) {
    db = readDatabase() || {};
  }
  res.json({
    success: true,
    version: db.version || 20,
    lastSyncedAt: db.lastSyncedAt || null,
    isPublishedSnapshot: db.isPublishedSnapshot ?? false,
    counts: {
      residents: Array.isArray(db.residents) ? db.residents.length : 0,
      families: Array.isArray(db.families) ? db.families.length : 0,
      users: Array.isArray(db.users) ? db.users.length : 0,
      dues: Array.isArray(db.dues) ? db.dues.length : 0,
      transactions: Array.isArray(db.transactions) ? db.transactions.length : 0,
      letters: Array.isArray(db.letters) ? db.letters.length : 0,
      inventory: Array.isArray(db.inventory) ? db.inventory.length : 0,
      complaints: Array.isArray(db.complaints) ? db.complaints.length : 0,
      announcements: Array.isArray(db.announcements) ? db.announcements.length : 0,
      events: Array.isArray(db.events) ? db.events.length : 0,
      setoranRt: Array.isArray(db.setoranRt) ? db.setoranRt.length : 0,
      wargaNgontrakUsaha: Array.isArray(db.wargaNgontrakUsaha) ? db.wargaNgontrakUsaha.length : 0
    }
  });
});

// Sync data endpoint
router.post('/data/sync', async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.data) {
    return res.status(400).json({ success: false, error: 'Invalid payload. Expecting { data: {...} }' });
  }

  const currentDb = (await readCloudSnapshot()) || readDatabase() || {};
  const incomingData = payload.data;

  const collections = [
    'users',
    'deletedUsers',
    'residents',
    'deletedResidents',
    'families',
    'deletedFamilies',
    'letters',
    'announcements',
    'events',
    'complaints',
    'dues',
    'transactions',
    'setoranRt',
    'inventory',
    'notifications',
    'auditLogs',
    'emergencyContacts',
    'wargaNgontrakUsaha'
  ];

  const updatedDb: any = { ...currentDb };

  collections.forEach((colKey) => {
    if (Array.isArray(incomingData[colKey])) {
      updatedDb[colKey] = incomingData[colKey];
    }
  });

  updatedDb.version = (currentDb.version || 20) + 1;
  updatedDb.lastSyncedAt = new Date().toISOString();
  if (payload.isPublishedSnapshot) {
    updatedDb.isPublishedSnapshot = true;
  }

  writeDatabase(updatedDb);
  await writeCloudSnapshot(updatedDb);

  return res.json({
    success: true,
    message: 'Data berhasil disinkronkan ke Cloud Firestore & server Vercel',
    version: updatedDb.version,
    lastSyncedAt: updatedDb.lastSyncedAt,
    isPublishedSnapshot: updatedDb.isPublishedSnapshot,
    counts: {
      residents: updatedDb.residents?.length || 0,
      families: updatedDb.families?.length || 0,
      users: updatedDb.users?.length || 0,
      dues: updatedDb.dues?.length || 0,
      transactions: updatedDb.transactions?.length || 0,
      letters: updatedDb.letters?.length || 0,
      inventory: updatedDb.inventory?.length || 0,
      complaints: updatedDb.complaints?.length || 0,
      announcements: updatedDb.announcements?.length || 0,
      events: updatedDb.events?.length || 0,
      setoranRt: updatedDb.setoranRt?.length || 0,
      wargaNgontrakUsaha: updatedDb.wargaNgontrakUsaha?.length || 0
    }
  });
});

// Publish endpoint
router.post('/data/publish', async (req: Request, res: Response) => {
  const payload = req.body || {};
  const incomingData = payload.data;
  const currentDb = (await readCloudSnapshot()) || readDatabase() || {};

  const updatedDb: any = { ...currentDb };
  if (incomingData && typeof incomingData === 'object') {
    const collections = [
      'users',
      'deletedUsers',
      'residents',
      'deletedResidents',
      'families',
      'deletedFamilies',
      'letters',
      'announcements',
      'events',
      'complaints',
      'dues',
      'transactions',
      'setoranRt',
      'inventory',
      'notifications',
      'auditLogs',
      'emergencyContacts',
      'wargaNgontrakUsaha'
    ];
    collections.forEach((colKey) => {
      if (Array.isArray(incomingData[colKey])) {
        updatedDb[colKey] = incomingData[colKey];
      }
    });
  }

  updatedDb.version = (currentDb.version || 20) + 1;
  updatedDb.lastSyncedAt = new Date().toISOString();
  updatedDb.isPublishedSnapshot = true;
  updatedDb.lastPublishedAt = updatedDb.lastSyncedAt;

  writeDatabase(updatedDb);
  await writeCloudSnapshot(updatedDb);

  return res.json({
    success: true,
    message: 'Data berhasil disinkronkan dan dipublikasikan secara online ke Cloud Firestore & link publik!',
    version: updatedDb.version,
    lastSyncedAt: updatedDb.lastSyncedAt,
    lastPublishedAt: updatedDb.lastPublishedAt,
    counts: {
      residents: updatedDb.residents?.length || 0,
      families: updatedDb.families?.length || 0,
      users: updatedDb.users?.length || 0,
      dues: updatedDb.dues?.length || 0,
      transactions: updatedDb.transactions?.length || 0,
      letters: updatedDb.letters?.length || 0,
      inventory: updatedDb.inventory?.length || 0,
      complaints: updatedDb.complaints?.length || 0,
      announcements: updatedDb.announcements?.length || 0,
      events: updatedDb.events?.length || 0,
      setoranRt: updatedDb.setoranRt?.length || 0,
      wargaNgontrakUsaha: updatedDb.wargaNgontrakUsaha?.length || 0
    }
  });
});

// Support both /api/... (when rewritten) and /... (when path prefix stripped)
app.use('/api', router);
app.use('/', router);

export default app;
