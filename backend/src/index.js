import express from 'express';
import cors from 'cors';
import profilesRouter from './routes/profiles.js';
import userSettingsRouter from './routes/userSettings.js';
import feedRouter from './routes/feed.js';
import aiRouter from './routes/ai.js';
import poolsRouter from './routes/pools.js';
import walletsRouter from './routes/wallets.js';
import demoRouter from './routes/demo.js';
import { initDb } from './database.js';
import { seedIfEmpty } from './seed.js';
import contractService from './services/contractService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/warmup', (req, res) => {
  res.json({ status: 'ok', message: 'Backend warm' });
});

app.use('/api/profiles', profilesRouter);
app.use('/api/user-settings', userSettingsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/ai', aiRouter);
app.use('/api/pools', poolsRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/demo', demoRouter);

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
