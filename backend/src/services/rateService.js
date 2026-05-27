import { getDb } from '../database.js';
import crypto from 'crypto';

const CACHE_TTL = 5 * 60 * 1000;
const QUOTE_TTL = 60 * 1000;
const FX_SPREAD = 0.0075;
const ASTRUM_API = 'https://api.astrumapi.com/api/v1/free/naira/parallel';

let rateCache = {
  ngnUsd: null,
  usdBtc: null,
  ngnUsdFetchedAt: null,
  usdBtcFetchedAt: null,
};

let quoteStore = new Map();

function now() {
  return Date.now();
}

async function fetchAstrumRate() {
  try {
    const resp = await fetch(ASTRUM_API, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!resp.ok) throw new Error(`Astrum API returned ${resp.status}`);
    const data = await resp.json();
    if (data.status !== 'success' || !data.data?.provider?.length) throw new Error('Invalid Astrum response');
    const rates = data.data.provider.filter(p => p.sell > 0).map(p => p.sell);
    if (!rates.length) throw new Error('No valid provider rates');
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  } catch (err) {
    console.error('Astrum rate fetch error:', err.message);
    return null;
  }
}

export async function getNgnUsdRate() {
  const cacheAge = rateCache.ngnUsdFetchedAt ? now() - rateCache.ngnUsdFetchedAt : Infinity;

  if (cacheAge < CACHE_TTL && rateCache.ngnUsd !== null) {
    return { rate: rateCache.ngnUsd, source: 'cache', stale: false };
  }

  const fresh = await fetchAstrumRate();
  if (fresh !== null) {
    rateCache.ngnUsd = fresh;
    rateCache.ngnUsdFetchedAt = now();
    return { rate: fresh, source: 'astrum', stale: false };
  }

  if (rateCache.ngnUsd !== null) {
    return { rate: rateCache.ngnUsd, source: 'stale-cache', stale: true, warning: 'Rate may be outdated' };
  }

  const db = await getDb();
  const setting = await db.get("SELECT value FROM admin_settings WHERE key = 'fallback_ngn_usd'");
  db.release();
  const fallback = setting ? parseInt(setting.value) : 1400;
  return { rate: fallback, source: 'fallback', stale: true, warning: 'Using fallback rate. Update via admin.' };
}

export function getUsdBtcRate() {
  return { rate: 96000, source: 'estimate', stale: false };
}

function applySpread(rate, direction) {
  if (direction === 'buy') {
    return Math.round(rate * (1 + FX_SPREAD));
  }
  return Math.round(rate * (1 - FX_SPREAD));
}

export async function convert(amount, from, to, rates) {
  if (!rates) {
    rates = {
      ngnUsd: await getNgnUsdRate(),
      usdBtc: getUsdBtcRate(),
    };
  }

  const ngnPerUsd = rates.ngnUsd.rate;
  const usdPerBtc = rates.usdBtc.rate;
  const satsPerBtc = 100000000;

  if (from === 'NGN' && to === 'USD') {
    const buyRate = applySpread(ngnPerUsd, 'buy');
    const usdAmount = Math.floor(amount / buyRate * 100) / 100;
    return { amount: usdAmount, rate: buyRate, direction: 'buy', spread: FX_SPREAD };
  }

  if (from === 'USD' && to === 'NGN') {
    const sellRate = applySpread(ngnPerUsd, 'sell');
    const ngnAmount = Math.round(amount * sellRate);
    return { amount: ngnAmount, rate: sellRate, direction: 'sell', spread: FX_SPREAD };
  }

  if (from === 'NGN' && to === 'sBTC') {
    const buyRate = applySpread(ngnPerUsd, 'buy');
    const sats = Math.floor((amount / buyRate) / usdPerBtc * satsPerBtc);
    return { amount: String(sats), rate: buyRate, usdPerBtc, direction: 'buy' };
  }

  if (from === 'USD' && to === 'sBTC') {
    const sats = Math.floor((amount / usdPerBtc) * satsPerBtc);
    return { amount: String(sats), rate: usdPerBtc, direction: 'sell' };
  }

  if (from === 'sBTC' && to === 'USD') {
    const usdAmount = Math.floor(parseInt(amount) / satsPerBtc * usdPerBtc * 100) / 100;
    return { amount: usdAmount, rate: usdPerBtc, direction: 'buy' };
  }

  if (from === 'sBTC' && to === 'NGN') {
    const sellRate = applySpread(ngnPerUsd, 'sell');
    const usdAmount = parseInt(amount) / satsPerBtc * usdPerBtc;
    const ngnAmount = Math.round(usdAmount * sellRate);
    return { amount: ngnAmount, rate: sellRate, direction: 'sell' };
  }

  throw new Error(`Unsupported conversion: ${from} → ${to}`);
}

export function createQuote(userId, from, to, amount) {
  const quoteId = `Q-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  quoteStore.set(quoteId, {
    userId, from, to, amount,
    createdAt: now(),
    expiresAt: now() + QUOTE_TTL,
  });
  if (quoteStore.size > 2000) {
    for (const [id, q] of quoteStore) {
      if (q.expiresAt < now()) quoteStore.delete(id);
    }
  }
  return { quoteId, expiresAt: now() + QUOTE_TTL };
}

export function getQuote(quoteId) {
  const q = quoteStore.get(quoteId);
  if (!q) return null;
  if (q.expiresAt < now()) {
    quoteStore.delete(quoteId);
    return null;
  }
  return q;
}

export function consumeQuote(quoteId) {
  const q = quoteStore.get(quoteId);
  if (!q) return null;
  if (q.expiresAt < now()) {
    quoteStore.delete(quoteId);
    return null;
  }
  quoteStore.delete(quoteId);
  return q;
}

export function getFxSpread() {
  return FX_SPREAD;
}

export async function getAllRates() {
  const ngnUsd = await getNgnUsdRate();
  const usdBtc = getUsdBtcRate();
  return { ngnUsd, usdBtc, spread: FX_SPREAD };
}
