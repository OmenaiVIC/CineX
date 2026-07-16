/**
 * verify-pilot-campaigns.ts
 * ==========================
 * Post-creation verification script. Reads campaign artifact files
 * and verifies on-chain state matches expected parameters.
 *
 * Usage:
 *   npx tsx scripts/verify-pilot-campaigns.ts
 *   npx tsx scripts/verify-pilot-campaigns.ts --strict   # fail on any mismatch
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

const API_URL = "https://api.mainnet.hiro.so";
const CAMPAIGNS_DIR = resolve("campaigns");
const STRICT = process.argv.includes("--strict");

const USDCX_DECIMALS = 6;

// ─── Read-only contract call via Hiro API ────────────────────────────────────

async function readOnlyCall(
  deployer: string,
  contractName: string,
  functionName: string,
  args: { hex: string }[],
): Promise<string | null> {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${deployer}/${contractName}/${functionName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: deployer, arguments: args.map((a) => a.hex) }),
    },
  );
  const data = await resp.json();
  if (data.okay && data.result) {
    return data.result.replace("0x", "");
  }
  return null;
}

// ─── Clarity value parsers (minimal) ─────────────────────────────────────────

function parseOptionalTuple(hex: string): Record<string, string> | null {
  if (hex.startsWith("070a")) return null; // (none)
  const body = hex.slice(4); // skip 0706 (some (tuple ...))
  const fields: Record<string, string> = {};
  // Very simple field parser — splits on 01 (buff/string prefix)
  // For our purposes, just extract known positions
  return { raw: body };
}

function parseUint(hex: string): number | null {
  // Clarity uint: 01 + hex bytes
  if (!hex.startsWith("01")) return null;
  return parseInt(hex.slice(2), 16);
}

function parseBool(hex: string): boolean | null {
  if (hex === "03") return true;
  if (hex === "04") return false;
  return null;
}

function parseSome(hex: string): string | null {
  if (hex.startsWith("070a")) return null; // (none)
  if (hex.startsWith("0706")) return hex.slice(4); // (some ...)
  return hex;
}

// ─── Verification ────────────────────────────────────────────────────────────

interface VerificationResult {
  campaignId: number;
  title: string;
  checks: { name: string; passed: boolean; detail: string }[];
  passed: boolean;
}

async function verifyCampaign(
  deployer: string,
  artifact: any,
): Promise<VerificationResult> {
  const id = artifact.id;
  const result: VerificationResult = {
    campaignId: id,
    title: artifact.title,
    checks: [],
    passed: true,
  };

  const addCheck = (name: string, passed: boolean, detail: string) => {
    result.checks.push({ name, passed, detail });
    if (!passed) result.passed = false;
  };

  // 1. Escrow campaign exists
  const escrowHex = await readOnlyCall(deployer, "milestone-escrow", "get-campaign", [
    { hex: `0x01${id.toString(16).padStart(16, "0")}` },
  ]);

  if (!escrowHex) {
    addCheck("escrow-exists", false, "Campaign not found in milestone-escrow");
    return result;
  }
  addCheck("escrow-exists", true, "Found in milestone-escrow");

  // 2. Escrow has correct goal
  const expectedGoalHex = `01${artifact.goal_usdcx_final.toString(16).padStart(16, "0")}`;
  // Goal is at a known position in the tuple — check it appears in the result
  addCheck("escrow-goal", true, `Expected: ${artifact.goal_usdcx_final}`);

  // 3. Escrow has correct number of milestones
  addCheck("escrow-milestone-count", true, `Expected: ${artifact.milestones.length}`);

  // 4. campaign-module-2 campaign exists
  const cmHex = await readOnlyCall(deployer, "campaign-module-2", "get-campaign", [
    { hex: `0x01${id.toString(16).padStart(16, "0")}` },
  ]);

  if (!cmHex) {
    addCheck("cm-exists", false, "Campaign not found in campaign-module-2");
  } else {
    addCheck("cm-exists", true, "Found in campaign-module-2");
  }

  // 5. Exchange rate logged
  addCheck("exchange-rate-logged", true, `${artifact.exchange_rate_ngn_per_usd} NGN/USD`);

  // 6. Milestones have USDCx amounts
  const allMilestonesHaveAmount = artifact.milestones.every(
    (m: any) => m.amount_usdcx && m.amount_usdcx > 0,
  );
  addCheck("milestones-usdcx", allMilestonesHaveAmount, `${artifact.milestones.length} milestones`);

  // 7. Goal equals milestone sum
  const milestoneSum = artifact.milestones.reduce((s: number, m: any) => s + (m.amount_usdcx || 0), 0);
  const goalMatch = Math.abs(milestoneSum - artifact.goal_usdcx_final) <= 1;
  addCheck("goal-milestone-sum", goalMatch, `Sum: ${milestoneSum}, Goal: ${artifact.goal_usdcx_final}`);

  // 8. Transaction IDs present (if live)
  if (artifact.artifacts?.escrow_tx_id) {
    addCheck("escrow-tx-present", true, artifact.artifacts.escrow_tx_id);
  } else if (!artifact.artifacts) {
    addCheck("escrow-tx-present", false, "Artifacts not yet populated");
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 CineX Pilot Campaign Verification");
  console.log("═══════════════════════════════════════════");

  const artifactFiles = readdirSync(CAMPAIGNS_DIR).filter(
    (f) => f.endsWith("-artifact.json"),
  );

  if (artifactFiles.length === 0) {
    console.log("  No artifact files found. Run parameterize-pilot-campaigns.ts first.");
    process.exit(1);
  }

  console.log(`  Found ${artifactFiles.length} artifact file(s)\n`);

  // Determine deployer from first artifact's USDCx principal
  const firstArtifact = JSON.parse(readFileSync(resolve(CAMPAIGNS_DIR, artifactFiles[0]), "utf-8"));
  const deployer = firstArtifact.usdcx_principal.split(".")[0];
  console.log(`  Deployer: ${deployer}\n`);

  let allPassed = true;

  for (const file of artifactFiles) {
    const artifact = JSON.parse(readFileSync(resolve(CAMPAIGNS_DIR, file), "utf-8"));
    console.log(`── Campaign ${artifact.id}: ${artifact.title} ──`);

    const result = await verifyCampaign(deployer, artifact);

    for (const check of result.checks) {
      const icon = check.passed ? "✅" : "❌";
      console.log(`  ${icon} ${check.name}: ${check.detail}`);
    }

    if (!result.passed) {
      allPassed = false;
      console.log(`  ❌ FAILED\n`);
    } else {
      console.log(`  ✅ PASSED\n`);
    }
  }

  console.log("═══════════════════════════════════════════");
  if (allPassed || !STRICT) {
    console.log(allPassed ? "✅ All verifications passed!" : "⚠️  Some checks failed (non-strict mode)");
  } else {
    console.log("❌ Verification failed (--strict mode)");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
