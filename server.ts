import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const DB_FILE = path.resolve(__dirname, 'data', 'database.json');

// Helper to safely read database
function harmonizeFamilies(db: any): void {
  if (!db || typeof db !== 'object') return;
  if (!Array.isArray(db.residents)) return;
  if (!Array.isArray(db.families)) db.families = [];

  const activeResidentKks = new Set<string>();
  db.residents.forEach((r: any) => {
    if (r.nomorKK && r.statusWarga !== 'Meninggal' && r.statusWarga !== 'Pindah') {
      activeResidentKks.add(r.nomorKK);
    }
  });

  // 1. Bersihkan deletedFamilies dari nomor KK yang dimiliki warga aktif
  if (Array.isArray(db.deletedFamilies)) {
    db.deletedFamilies = db.deletedFamilies.filter((k: string) => !activeResidentKks.has(k));
  }

  // 2. Buang KK yang benar-benar ada di deletedFamilies
  if (Array.isArray(db.deletedFamilies) && db.deletedFamilies.length > 0) {
    db.families = db.families.filter((f: any) => !db.deletedFamilies.includes(f.nomorKK));
  }

  // 3. Pastikan setiap KK dari warga aktif memiliki catatan Kartu Keluarga
  const existingKkMap = new Map<string, any>();
  db.families.forEach((f: any) => existingKkMap.set(f.nomorKK, f));

  db.residents.forEach((r: any) => {
    if (!r.nomorKK || r.statusWarga === 'Meninggal' || r.statusWarga === 'Pindah') return;
    const members = db.residents.filter(
      (m: any) => m.nomorKK === r.nomorKK && m.statusWarga !== 'Meninggal' && m.statusWarga !== 'Pindah'
    );
    const existing = existingKkMap.get(r.nomorKK);
    if (!existing) {
      const kepala = members.find((m: any) => m.hubunganKeluarga === 'Kepala Keluarga') || r;
      const rtStr = String(r.rt || '01').padStart(2, '0');
      const newFam = {
        nomorKK: r.nomorKK,
        namaKepalaKeluarga: kepala.namaLengkap,
        alamat: r.alamat || `Jl. Kebon Kangkung RT ${rtStr} / RW ${r.rw || '03'}`,
        rt: rtStr,
        rw: r.rw || '03',
        nomorRumah: '01',
        statusRumah: 'Milik Sendiri',
        jumlahAnggota: members.length || 1,
        createdAt: r.createdAt ? String(r.createdAt).substring(0, 10) : new Date().toISOString().substring(0, 10)
      };
      existingKkMap.set(r.nomorKK, newFam);
      db.families.push(newFam);
    } else {
      existing.jumlahAnggota = members.length;
      if (r.hubunganKeluarga === 'Kepala Keluarga' && existing.namaKepalaKeluarga !== r.namaLengkap) {
        existing.namaKepalaKeluarga = r.namaLengkap;
      }
    }
  });
}

function readDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      harmonizeFamilies(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('[Server] Error reading database.json:', err);
  }
  return null;
}

// Helper to safely write database
function writeDatabase(data: any): boolean {
  try {
    harmonizeFamilies(data);
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server] Error writing database.json:', err);
    return false;
  }
}

async function startServer() {
  const app = express();

  // Allow parsing large JSON payloads (e.g. photos, full database sync)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure DB file exists on launch
  if (!fs.existsSync(DB_FILE)) {
    console.log('[Server] database.json not found, initializing default empty structure...');
    writeDatabase({
      version: 1,
      lastSyncedAt: new Date().toISOString(),
      isPublishedSnapshot: true,
      users: [],
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
    });
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      databaseExists: fs.existsSync(DB_FILE)
    });
  });

  // Get current server database
  app.get('/api/data', (req, res) => {
    const db = readDatabase();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database unreadable' });
    }
    return res.json({
      success: true,
      version: db.version || 1,
      lastSyncedAt: db.lastSyncedAt || new Date().toISOString(),
      isPublishedSnapshot: db.isPublishedSnapshot ?? true,
      data: db
    });
  });

  // Summary status of server data
  app.get('/api/data/status', (req, res) => {
    const db = readDatabase() || {};
    res.json({
      success: true,
      version: db.version || 1,
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

  // Sync / Push data to server
  app.post('/api/data/sync', (req, res) => {
    const payload = req.body;
    if (!payload || !payload.data) {
      return res.status(400).json({ success: false, error: 'Invalid payload. Expecting { data: {...} }' });
    }

    const currentDb = readDatabase() || {};
    const incomingData = payload.data;

    // Keys that represent collections
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

    updatedDb.version = (currentDb.version || 0) + 1;
    updatedDb.lastSyncedAt = new Date().toISOString();
    if (payload.isPublishedSnapshot) {
      updatedDb.isPublishedSnapshot = true;
    }

    const saved = writeDatabase(updatedDb);
    if (!saved) {
      return res.status(500).json({ success: false, error: 'Failed to write to database' });
    }

    console.log(`[Server] Synced version ${updatedDb.version} from client at ${updatedDb.lastSyncedAt}. Residents: ${updatedDb.residents?.length || 0}`);

    return res.json({
      success: true,
      message: 'Data berhasil disinkronkan ke server',
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

  // Dedicated publish sync endpoint: seals data as official published snapshot
  app.post('/api/data/publish', (req, res) => {
    const payload = req.body || {};
    const incomingData = payload.data;
    const currentDb = readDatabase() || {};

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

    updatedDb.version = (currentDb.version || 0) + 1;
    updatedDb.lastSyncedAt = new Date().toISOString();
    updatedDb.isPublishedSnapshot = true;
    updatedDb.lastPublishedAt = updatedDb.lastSyncedAt;

    writeDatabase(updatedDb);

    console.log(`[Server] Data officially sealed for publish at ${updatedDb.lastPublishedAt}. Version ${updatedDb.version}`);

    return res.json({
      success: true,
      message: 'Data berhasil disinkronkan dan dipublikasikan ke semua link (termasuk link publik)!',
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

  // Setup Vite dev server or static file serving
  if (!isProd) {
    console.log('[Server] Running in DEVELOPMENT mode with Vite middlewares');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Running in PRODUCTION mode');
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[Server] dist directory does not exist! Run npm run build first.');
      app.get('/', (req, res) => {
        res.send('Server running. Please build client first using npm run build.');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Digital RW 03 Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
