import express from 'express';
import cors from 'cors';
import profilesRouter from './routes/profiles.js';
import userSettingsRouter from './routes/userSettings.js';
import feedRouter from './routes/feed.js';
import aiRouter from './routes/ai.js';
import poolsRouter from './routes/pools.js';
import walletsRouter from './routes/wallets.js';
import demoRouter from './routes/demo.js';
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
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  const mnemonic = process.env.TESTNET_MNEMONIC;
  if (!mnemonic) {
    console.warn('⚠️  TESTNET_MNEMONIC not set — demo routes will fail');
  } else {
    await contractService.init(mnemonic);
    console.log('✅ Contract service initialized');
  }
  app.listen(PORT, () => {
    console.log(`CineX backend running on http://localhost:${PORT}`);
  });
}

start();
