/**
 * Check balance and request more faucet STX
 */
const addr = "ST3482KEKEA7152W4XX938392QSN9Z5EAZCX1NWH3";

async function main() {
  // 1. Check balance from v2 API
  const v2Res = await fetch(`https://api.testnet.hiro.so/v2/accounts/${addr}?proof=0`);
  const v2 = await v2Res.json();
  console.log("v2 API balance:", v2.balance, "nonce:", v2.nonce);
  console.log("v2 balance as decimal:", BigInt(v2.balance).toString());
  console.log("v2 balance as STX:", Number(BigInt(v2.balance)) / 1e6);

  // 2. Check balance from extended API
  const extRes = await fetch(`https://api.testnet.hiro.so/extended/v1/address/${addr}/balances`);
  const ext = await extRes.json();
  console.log("\nextended API balance:", ext.stx?.balance);
  console.log("extended locked:", ext.stx?.locked);
  console.log("extended total_sent:", ext.stx?.total_sent);
  console.log("extended total_received:", ext.stx?.total_received);

  // 3. Request more faucet STX
  console.log("\nRequesting faucet STX...");
  const faucetRes = await fetch(
    `https://api.testnet.hiro.so/extended/v1/faucets/stx?address=${addr}&stacking=false`,
    { method: "POST" }
  );
  const faucetData = await faucetRes.json();
  console.log("faucet response:", JSON.stringify(faucetData));
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
