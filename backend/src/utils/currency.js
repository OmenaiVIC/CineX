// NGN/USD exchange rate (configurable, default ~1500 following parallel market trends)
const NGN_PER_USD = Number(process.env.NGN_PER_USD) || 1500;

// STX price is in cents (100 = $1.00) from oracle-proxy
// Returns STX price in NGN, or null if oracle unavailable
export async function getNgnPerStx(getStxPrice) {
  try {
    const resp = await getStxPrice();
    const priceCents = resp?.ok === true ? Number(resp.ok) : null;
    if (!priceCents || priceCents <= 0) return null;
    const usdPerStx = priceCents / 100;
    return usdPerStx * NGN_PER_USD;
  } catch {
    return null;
  }
}

// Convert NGN kobo amount to microSTX (1 STX = 1,000,000 uSTX)
export function ngnToUstx(ngnAmount, ngnPerStx) {
  if (!ngnPerStx || ngnPerStx <= 0) return null;
  return Math.floor((Number(ngnAmount) * 1_000_000) / ngnPerStx);
}

// Convert microSTX to NGN (display helper)
export function ustxToNgn(ustxAmount, ngnPerStx) {
  if (!ngnPerStx || ngnPerStx <= 0) return null;
  return Math.floor((Number(ustxAmount) * ngnPerStx) / 1_000_000);
}
