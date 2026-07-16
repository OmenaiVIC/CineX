#!/usr/bin/env npx tsx
/**
 * deploy.ts
 * =========
 * Unified CineX contract deployment entrypoint.
 *
 * Usage:
 *   npx tsx scripts/deploy.ts --network mainnet
 *   npx tsx scripts/deploy.ts --network testnet --dry-run
 *   npx tsx scripts/deploy.ts --network testnet --skip-init
 *   npx tsx scripts/deploy.ts --network testnet --init-only
 *   npx tsx scripts/deploy.ts --network testnet --contract milestone-escrow
 *
 * Satisfies:
 *   PRD §4 Smart Contract Status — Testnet Complete
 *   PRD §1.1 Architectural Ground Truth — "Grant contract deliverable", "Contract deployment status"
 *   Epic 1+2 — Week 1 (deployment scripts), Week 3 (mainnet deploy)
 *   Engineering rules — deterministic state transitions, idempotency, audit trail
 */

import { resolve } from "path";
import { buildDependencyGraph, printDeploymentGraph } from "./lib/dependencyGraph.js";
import { loadNetworkConfig } from "./lib/networkConfig.js";
import { deployAll, type DeployResult } from "./lib/contractDeployer.js";
import { initializeAll, type InitResult } from "./lib/contractInitializer.js";
import {
  buildManifest,
  writeAllArtifacts,
} from "./lib/artifactWriter.js";
import { verifyDeployment, verifyInitialization } from "./lib/verification.js";

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

interface CliArgs {
  network: "devnet" | "testnet" | "mainnet";
  dryRun: boolean;
  skipInit: boolean;
  initOnly: boolean;
  specificContract: string | null;
  skipVerification: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    network: "testnet",
    dryRun: false,
    skipInit: false,
    initOnly: false,
    specificContract: null,
    skipVerification: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--network":
      case "-n":
        result.network = args[++i] as "devnet" | "testnet" | "mainnet";
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--skip-init":
        result.skipInit = true;
        break;
      case "--init-only":
        result.initOnly = true;
        break;
      case "--contract":
      case "-c":
        result.specificContract = args[++i];
        break;
      case "--skip-verification":
        result.skipVerification = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
CineX Contract Deployment System
══════════════════════════════════

Usage:
  npx tsx scripts/deploy.ts [options]

Options:
  --network, -n <network>    Target network: devnet | testnet | mainnet (default: testnet)
  --dry-run                  Validate without broadcasting transactions
  --skip-init                Deploy contracts but skip initialization
  --init-only                Skip deployment, run initialization only
  --contract, -c <name>      Deploy a specific contract and its dependencies
  --skip-verification        Skip post-deploy verification
  --help, -h                 Show this help message

Examples:
  # Full testnet deployment with initialization
  npx tsx scripts/deploy.ts --network testnet

  # Dry-run for mainnet (validate only)
  npx tsx scripts/deploy.ts --network mainnet --dry-run

  # Deploy only milestone-escrow and its dependencies
  npx tsx scripts/deploy.ts --network testnet --contract milestone-escrow

  # Initialize contracts that are already deployed
  npx tsx scripts/deploy.ts --network testnet --init-only

Environment Variables:
  CINEX_TESTNET_DEPLOYER     Override testnet deployer address
  CINEX_MAINNET_DEPLOYER     (Required for mainnet) Mainnet deployer address
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const startedAt = new Date().toISOString();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   CineX Contract Deployment System           ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`  Network:  ${args.network}`);
  console.log(`  Mode:     ${args.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Init:     ${args.skipInit ? "SKIPPED" : args.initOnly ? "INIT ONLY" : "YES"}`);
  if (args.specificContract) {
    console.log(`  Contract: ${args.specificContract}`);
  }
  console.log(`  Started:  ${startedAt}\n`);

  // 1. Load network config
  console.log("── Step 1: Loading network config ──");
  const config = await loadNetworkConfig(args.network);
  console.log(`  ✅ Config loaded: ${config.name}`);
  console.log(`  Deployer: ${config.deployerAddress}`);
  console.log(`  API: ${config.networkUrl}\n`);

  // 2. Build dependency graph
  console.log("── Step 2: Building dependency graph ──");
  const tomlPath = resolve("Clarinet.toml");
  const graph = buildDependencyGraph(tomlPath);
  printDeploymentGraph(graph);

  // 3. Deploy contracts (unless init-only)
  let deployResults: DeployResult[] = [];
  if (!args.initOnly) {
    console.log("\n── Step 3: Deploying contracts ──");
    deployResults = await deployAll(config, graph.ordered, {
      dryRun: args.dryRun,
      specificContract: args.specificContract ?? undefined,
    });

    const deployed = deployResults.filter((r) => r.status === "deployed").length;
    const skipped = deployResults.filter((r) => r.status === "skipped").length;
    const failed = deployResults.filter((r) => r.status === "failed").length;
    const unconfirmed = deployResults.filter((r) => r.status === "unconfirmed").length;

    console.log(`\n  📊 Deploy Summary:`);
    console.log(`     Deployed:   ${deployed}`);
    console.log(`     Skipped:    ${skipped}`);
    console.log(`     Failed:     ${failed}`);
    console.log(`     Unconfirmed: ${unconfirmed}`);
  } else {
    console.log("\n── Step 3: Skipping deployment (init-only mode) ──");
    // Load existing deployment results from manifest if available
    try {
      const manifestPath = resolve("deployments", "artifacts", args.network, "deployment-manifest.json");
      const manifest = JSON.parse(require("fs").readFileSync(manifestPath, "utf-8"));
      deployResults = manifest.contracts.map((c: any, i: number) => ({
        name: c.name,
        sourcePath: c.sourcePath,
        type: c.type,
        deployOrder: c.deployOrder,
        txId: c.txId,
        blockHeight: c.blockHeight,
        contractAddress: c.contractAddress,
        fullContractId: c.fullContractId,
        deployCost: c.deployCost,
        status: c.status,
        deployedAt: c.deployedAt,
        error: null,
        deployDurationMs: c.deployDurationMs,
      }));
      console.log(`  📄 Loaded ${deployResults.length} contracts from existing manifest`);
    } catch {
      console.log("  ❌ No existing deployment manifest found. Run deploy first.");
      process.exit(1);
    }
  }

  // 4. Initialize contracts
  let initResults: InitResult[] = [];
  if (!args.skipInit || args.initOnly) {
    console.log("\n── Step 4: Initializing contracts ──");

    // Build contract address lookup from deploy results
    const contractAddresses: Record<string, string> = {};
    for (const r of deployResults) {
      if (r.fullContractId) {
        contractAddresses[r.name] = r.fullContractId;
      }
    }

    initResults = await initializeAll(config, contractAddresses, args.dryRun);

    const initialized = initResults.filter((r) => r.status === "initialized").length;
    const initSkipped = initResults.filter((r) => r.status === "skipped").length;
    const initFailed = initResults.filter((r) => r.status === "failed").length;

    console.log(`\n  📊 Init Summary:`);
    console.log(`     Initialized: ${initialized}`);
    console.log(`     Skipped:     ${initSkipped}`);
    console.log(`     Failed:      ${initFailed}`);
  } else {
    console.log("\n── Step 4: Skipping initialization ──");
  }

  // 5. Verify
  if (!args.skipVerification && !args.dryRun) {
    console.log("\n── Step 5: Verifying deployment ──");
    const deployVerification = await verifyDeployment(config, deployResults);
    const initVerification = await verifyInitialization(config, deployResults);
  } else {
    console.log("\n── Step 5: Skipping verification ──");
  }

  // 6. Write artifacts
  console.log("\n── Step 6: Writing deployment artifacts ──");
  const contractDeps = new Map(
    graph.ordered.map((c) => [c.name, c.dependencies])
  );
  const manifest = buildManifest(
    config,
    deployResults,
    initResults,
    startedAt,
    args.dryRun,
    contractDeps
  );
  const artifacts = writeAllArtifacts(config, manifest, deployResults);
  console.log(`  📄 Manifest:    ${artifacts.manifest}`);
  console.log(`  📄 Addresses:   ${artifacts.addressLookup}`);
  console.log(`  📄 Report:      ${artifacts.report}`);

  // 7. Final summary
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Deployment Complete                        ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const totalDuration = Date.now() - new Date(startedAt).getTime();
  console.log(`  Network:    ${config.name}`);
  console.log(`  Mode:       ${args.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Contracts:  ${manifest.summary.deployed} deployed, ${manifest.summary.skipped} skipped, ${manifest.summary.failed} failed`);
  console.log(`  Init:       ${manifest.summary.initialized} initialized, ${manifest.summary.initFailed} failed`);
  console.log(`  Duration:   ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Artifacts:  ${resolve("deployments", "artifacts", config.name)}\n`);

  if (manifest.summary.failed > 0 || manifest.summary.initFailed > 0) {
    console.log("⚠️  Some contracts failed. Review the deployment report for details.");
    console.log(`   Report: ${artifacts.report}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
