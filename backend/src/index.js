import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import profilesRouter from './routes/profiles.js';
import userSettingsRouter from './routes/userSettings.js';
import feedRouter from './routes/feed.js';
import aiRouter from './routes/ai.js';
import poolsRouter from './routes/pools.js';
import walletsRouter from './routes/wallets.js';
import demoRouter from './routes/demo.js';
import campaignsRouter from './routes/campaigns.js';
import milestonesRouter from './routes/milestones.js';
import verificationRouter from './routes/verification.js';
import deployRouter from './routes/deploy.js';
import authRouter from './routes/auth.js';
import contactRouter from './routes/contact.js';
import yieldRouter from './routes/yield.js';
import escrowRouter from './routes/escrow.js';
import adminRouter from './routes/admin.js';
import passkeyRouter from './routes/passkey.js';
import bosMonitoringRouter from './routes/bosMonitoring.js';
import webhooksRouter from './routes/webhooks.js';
import { requireAuth } from './middleware/auth.js';
import { initDb } from './database.js';
import { seedIfEmpty } from './seed.js';
import contractService from './services/contractService.js';
import * as passkeyService from './services/passkeyService.js';
import { initEmail } from './services/emailService.js';
import monitorJob from './services/bos/monitoring/monitorJob.js';
import * as stuckReaper from './services/bos/stuckStateReaper.js';
import * as reconciliationWorker from './services/bos/reconciliationWorker.js';
import * as disbursementService from './services/bos/disbursementService.js';
import { initIndexer, startIndexer, stopIndexer } from './services/indexerWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.use(cors({
  origin: [
    'https://cine-x-iota.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ],
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/warmup', (req, res) => {
  res.json({ status: 'ok', message: 'Backend warm' });
});

app.use('/api/uploads', express.static(uploadDir));

// Lazy init — runs once per cold start (Vercel serverless) or once at boot (local)
let _initialized = false;
let stopRelayMonitor = null;
async function ensureInit() {
  if (_initialized) return;
  _initialized = true;

  // Critical: init passkey relay FIRST (no DB dependency, must not be blocked by other failures)
  passkeyService.init();

  await initDb();
  await seedIfEmpty();
  contractService.init();
  initEmail();
  if (process.env.CREATOR_KEY && process.env.BACKER_KEY) {
    console.log('✅ Contract service initialized');
  } else {
    console.warn('⚠️  CREATOR_KEY or BACKER_KEY not set — demo write routes will fail');
  }

  // Initialize and start BOS workers
  const { getDb } = await import('./database.js');
  const { getXReserveAdapter, getStacksAdapter, getYellowCardAdapter } = await import('./services/bos/bridgeAdapterFactory.js');

  const bosCtx = {
    getDb: () => getDb(),
    adapters: {
      stacks: getStacksAdapter(contractService),
      xreserve: getXReserveAdapter(),
      yellowcard: getYellowCardAdapter(),
    },
    emitEvent: async (event) => {
      try {
        const db = getDb();
        await db.run(
          `INSERT INTO disbursement_audit (disbursement_id, old_status, new_status, action, details, triggered_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [event.disbursement_id, event.old_status, event.new_status, event.action,
           JSON.stringify(event.details || {}), event.triggered_by]
        );
      } catch (err) {
        console.error('[bos] Failed to emit audit event:', err.message);
      }
    },
    getLogger: (component) => ({
      info:  (obj, msg) => console.log(`[${component}]`, msg || '', obj || ''),
      warn:  (obj, msg) => console.warn(`[${component}]`, msg || '', obj || ''),
      error: (obj, msg) => console.error(`[${component}]`, msg || '', obj || ''),
      debug: (obj, msg) => {}, // silence debug in production
    }),
  };

  disbursementService.init(bosCtx);
  stuckReaper.init(bosCtx);
  reconciliationWorker.init(bosCtx);

  // Start BOS monitor job
  monitorJob.start();
  stuckReaper.start();       // 60s interval — flags stuck disbursements
  reconciliationWorker.start(); // 5min interval — reconciles unrecorded burns/payouts

  // Start pipeline worker — the core BOS heartbeat that advances disbursements
  const { default: pipelineWorker } = await import('./services/bos/pipelineWorker.js');
  pipelineWorker.init(bosCtx);
  pipelineWorker.start();    // 30s interval — scans and advances all actionable disbursements
  console.log('✅ Pipeline worker started');

  // Initialize and start Activity Feed Indexer — polls Hiro API for contract events
  try {
    const db = await getDb();
    await initIndexer(db);
    db.release();
    startIndexer({ query: async (sql, params) => {
      const c = await getDb();
      const result = await c.run(sql, params);
      c.release();
      return result;
    }});
    console.log('✅ Activity Feed Indexer started');
  } catch (err) {
    console.warn(`⚠️  Indexer init failed: ${err.message}`);
  }

  // Start relay wallet balance monitor (5min interval)
  if (process.env.RELAY_ADDRESS) {
    const { startMonitoring } = await import('./services/relayMonitor.js');
    stopRelayMonitor = startMonitoring(300000);
    console.log('✅ Relay wallet monitor started');
  } else {
    console.warn('⚠️  RELAY_ADDRESS not set — relay balance monitoring disabled');
  }
}

// Vercel: wait for init BEFORE any routes to avoid cold-start race conditions
const initPromise = ensureInit().catch(err => {
  console.error('[init] Failed:', err.message);
});
if (process.env.VERCEL) {
  app.use((_req, _res, next) => {
    initPromise.then(() => next()).catch(next);
  });
}

app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = `${req.protocol}://${req.get('host')}/api/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});

app.use('/api/profiles', profilesRouter);
app.use('/api/user-settings', userSettingsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/ai', aiRouter);
app.use('/api/pools', poolsRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/demo', demoRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/deploy', deployRouter);
app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);
app.use('/api/yield', yieldRouter);
app.use('/api/escrow', escrowRouter);
app.use('/api/admin', adminRouter);
app.use('/api/passkey', passkeyRouter);
app.use('/api/bos/monitoring', bosMonitoringRouter);
app.use('/api/bos/webhooks', webhooksRouter);

app.use((err, req, res, next) => {
  const msg = (err && err.message) ? err.message : String(err);
  const stack = (err && err.stack) ? err.stack.split('\n').slice(0,5).join(' | ') : '(no stack)';
  console.error('[express] Unhandled error:', msg);
  console.error('[express] Stack:', stack);
  res.status(500).json({ error: msg });
});

// Graceful shutdown
function shutdown() {
  console.log('[shutdown] Stopping BOS workers...');
  monitorJob.stop();
  stuckReaper.stop();
  reconciliationWorker.stop();
  stopIndexer();
  if (stopRelayMonitor) stopRelayMonitor();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Local dev: init + listen
if (!process.env.VERCEL) {
  ensureInit().then(() => {
    app.listen(PORT, () => {
      console.log(`CineX backend running on http://localhost:${PORT}`);
    });
  });
}

export default app;
