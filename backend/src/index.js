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
import { requireAuth } from './middleware/auth.js';
import { initDb } from './database.js';
import { seedIfEmpty } from './seed.js';
import contractService from './services/contractService.js';
import { initEmail } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
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

app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

app.use((err, req, res, next) => {
  const msg = (err && err.message) ? err.message : String(err);
  const stack = (err && err.stack) ? err.stack.split('\n').slice(0,5).join(' | ') : '(no stack)';
  console.error('[express] Unhandled error:', msg);
  console.error('[express] Stack:', stack);
  res.status(500).json({ error: msg });
});

async function start() {
  await initDb();
  await seedIfEmpty();
  contractService.init();
  initEmail();
  if (process.env.CREATOR_KEY && process.env.BACKER_KEY) {
    console.log('✅ Contract service initialized');
  } else {
    console.warn('⚠️  CREATOR_KEY or BACKER_KEY not set — demo write routes will fail');
  }
  app.listen(PORT, () => {
    console.log(`CineX backend running on http://localhost:${PORT}`);
  });
}

start();
