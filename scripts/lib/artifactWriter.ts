/**
 * artifactWriter.ts
 * =================
 * Writes deployment artifacts: manifest JSON, address lookup,
 * and human-readable markdown report.
 *
 * Satisfies: Engineering rules — "persist deployment artifacts"
 *            "treat all settlement operations as auditable financial events"
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import type { NetworkConfig } from "./networkConfig.js";
import type { DeployResult } from "./contractDeployer.js";
import type { InitResult } from "./contractInitializer.js";
import { getExplorerTxUrl, getExplorerContractUrl } from "./networkConfig.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeploymentManifest {
  version: string;
  network: string;
  deployer: string;
  startedAt: string;
  completedAt: string;
  dryRun: boolean;
  contracts: Array<{
    name: string;
    sourcePath: string;
    type: string;
    deployOrder: number;
    txId: string | null;
    blockHeight: number | null;
    contractAddress: string | null;
    fullContractId: string | null;
    deployCost: number;
    status: string;
    deployedAt: string | null;
    dependencies: string[];
    deployDurationMs: number;
    initTxId: string | null;
    initStatus: string | null;
    initError: string | null;
  }>;
  summary: {
    totalContracts: number;
    deployed: number;
    skipped: number;
    failed: number;
    unconfirmed: number;
    initialized: number;
    initFailed: number;
    totalCost: number;
    totalDurationMs: number;
  };
}

// ─── Artifact Writer ─────────────────────────────────────────────────────────

function getArtifactDir(config: NetworkConfig): string {
  const dir = resolve("deployments", "artifacts", config.name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Build a deployment manifest from deploy and init results.
 */
export function buildManifest(
  config: NetworkConfig,
  deployResults: DeployResult[],
  initResults: InitResult[],
  startedAt: string,
  dryRun: boolean,
  contractDeps: Map<string, string[]>
): DeploymentManifest {
  const completedAt = new Date().toISOString();
  const initMap = new Map(initResults.map((r) => [r.contract, r]));

  const contracts = deployResults.map((d) => {
    const init = initMap.get(d.name);
    return {
      name: d.name,
      sourcePath: d.sourcePath,
      type: d.type,
      deployOrder: d.deployOrder,
      txId: d.txId,
      blockHeight: d.blockHeight,
      contractAddress: d.contractAddress,
      fullContractId: d.fullContractId,
      deployCost: d.deployCost,
      status: d.status,
      deployedAt: d.deployedAt,
      dependencies: contractDeps.get(d.name) ?? [],
      deployDurationMs: d.deployDurationMs,
      initTxId: init?.txId ?? null,
      initStatus: init?.status ?? null,
      initError: init?.error ?? null,
    };
  });

  const summary = {
    totalContracts: contracts.length,
    deployed: contracts.filter((c) => c.status === "deployed").length,
    skipped: contracts.filter((c) => c.status === "skipped").length,
    failed: contracts.filter((c) => c.status === "failed").length,
    unconfirmed: contracts.filter((c) => c.status === "unconfirmed").length,
    initialized: contracts.filter((c) => c.initStatus === "initialized").length,
    initFailed: contracts.filter((c) => c.initStatus === "failed").length,
    totalCost: contracts.reduce((sum, c) => sum + c.deployCost, 0),
    totalDurationMs: contracts.reduce((sum, c) => sum + c.deployDurationMs, 0),
  };

  return {
    version: "1.0",
    network: config.name,
    deployer: config.deployer,
    startedAt,
    completedAt,
    dryRun,
    contracts,
    summary,
  };
}

/**
 * Write deployment manifest to JSON file.
 */
export function writeManifest(config: NetworkConfig, manifest: DeploymentManifest): string {
  const dir = getArtifactDir(config);
  const filePath = resolve(dir, "deployment-manifest.json");
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
  return filePath;
}

/**
 * Write contract address lookup table.
 */
export function writeAddressLookup(
  config: NetworkConfig,
  deployResults: DeployResult[]
): string {
  const dir = getArtifactDir(config);
  const filePath = resolve(dir, "contract-addresses.json");

  const contracts: Record<string, string> = {};
  for (const r of deployResults) {
    if (r.fullContractId) {
      contracts[r.name] = r.fullContractId;
    }
  }

  const lookup = {
    network: config.name,
    deployer: config.deployer,
    contracts,
  };

  writeFileSync(filePath, JSON.stringify(lookup, null, 2), "utf-8");
  return filePath;
}

/**
 * Write human-readable markdown deployment report.
 */
export function writeMarkdownReport(
  config: NetworkConfig,
  manifest: DeploymentManifest
): string {
  const dir = getArtifactDir(config);
  const filePath = resolve(dir, "deployment-report.md");

  const lines: string[] = [];
  lines.push("# CineX Deployment Report");
  lines.push("");
  lines.push(`**Network:** ${config.name}`);
  lines.push(`**Deployer:** \`${config.deployer}\``);
  lines.push(`**Started:** ${manifest.startedAt}`);
  lines.push(`**Completed:** ${manifest.completedAt}`);
  lines.push(`**Mode:** ${manifest.dryRun ? "DRY RUN" : "LIVE"}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total contracts | ${manifest.summary.totalContracts} |`);
  lines.push(`| Deployed | ${manifest.summary.deployed} |`);
  lines.push(`| Skipped (already deployed) | ${manifest.summary.skipped} |`);
  lines.push(`| Failed | ${manifest.summary.failed} |`);
  lines.push(`| Unconfirmed | ${manifest.summary.unconfirmed} |`);
  lines.push(`| Initialized | ${manifest.summary.initialized} |`);
  lines.push(`| Init failed | ${manifest.summary.initFailed} |`);
  lines.push(`| Total cost (micro-STX) | ${manifest.summary.totalCost.toLocaleString()} |`);
  lines.push(`| Total duration | ${(manifest.summary.totalDurationMs / 1000).toFixed(1)}s |`);
  lines.push("");

  // Contract details
  lines.push("## Contracts");
  lines.push("");
  lines.push("| # | Name | Type | Status | Block | Tx | Explorer |");
  lines.push("|---|------|------|--------|-------|-----|----------|");

  for (const c of manifest.contracts) {
    const status =
      c.status === "deployed" ? "✅" : c.status === "skipped" ? "⏭️" : "❌";
    const block = c.blockHeight ?? "—";
    const txLink = c.txId
      ? `[${c.txId.slice(0, 10)}...](${getExplorerTxUrl(config, c.txId)})`
      : "—";
    const contractLink = c.fullContractId
      ? `[View](${getExplorerContractUrl(config, c.fullContractId)})`
      : "—";

    lines.push(
      `| ${c.deployOrder + 1} | ${c.name} | ${c.type} | ${status} | ${block} | ${txLink} | ${contractLink} |`
    );
  }
  lines.push("");

  // Initialization results
  const initContracts = manifest.contracts.filter((c) => c.initStatus);
  if (initContracts.length > 0) {
    lines.push("## Initialization");
    lines.push("");
    lines.push("| Contract | Function | Status | Tx |");
    lines.push("|----------|----------|--------|-----|");
    for (const c of initContracts) {
      const status = c.initStatus === "initialized" ? "✅" : c.initStatus === "skipped" ? "⏭️" : "❌";
      const txLink = c.initTxId
        ? `[${c.initTxId.slice(0, 10)}...](${getExplorerTxUrl(config, c.initTxId)})`
        : "—";
      lines.push(`| ${c.name} | initialize | ${status} | ${txLink} |`);
    }
    lines.push("");
  }

  // Contract addresses
  lines.push("## Contract Addresses");
  lines.push("");
  lines.push("```json");
  const addresses: Record<string, string> = {};
  for (const c of manifest.contracts) {
    if (c.fullContractId) {
      addresses[c.name] = c.fullContractId;
    }
  }
  lines.push(JSON.stringify(addresses, null, 2));
  lines.push("```");
  lines.push("");

  // Error details
  const errors = manifest.contracts.filter((c) => c.status === "failed" || c.initError);
  if (errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const c of errors) {
      lines.push(`### ${c.name}`);
      if (c.status === "failed") {
        lines.push(`- **Deploy error:** ${c.deployDurationMs}ms`);
      }
      if (c.initError) {
        lines.push(`- **Init error:** ${c.initError}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Generated by CineX deploy.ts — ${new Date().toISOString()}*`);

  writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}

/**
 * Write all artifacts and return file paths.
 */
export function writeAllArtifacts(
  config: NetworkConfig,
  manifest: DeploymentManifest,
  deployResults: DeployResult[]
): { manifest: string; addressLookup: string; report: string } {
  const manifestPath = writeManifest(config, manifest);
  const addressPath = writeAddressLookup(config, deployResults);
  const reportPath = writeMarkdownReport(config, manifest);

  return {
    manifest: manifestPath,
    addressLookup: addressPath,
    report: reportPath,
  };
}
