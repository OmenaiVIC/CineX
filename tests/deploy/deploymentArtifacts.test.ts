/**
 * deploymentArtifacts.test.ts
 * ===========================
 * Tests for deployment artifact format validation,
 * address lookup completeness, and manifest structure.
 *
 * Satisfies: Engineering rules — "persist deployment artifacts"
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildDependencyGraph } from "../../scripts/lib/dependencyGraph.js";
import {
  buildManifest,
  writeAllArtifacts,
} from "../../scripts/lib/artifactWriter.js";
import type { DeployResult } from "../../scripts/lib/contractDeployer.js";
import type { InitResult } from "../../scripts/lib/contractInitializer.js";

const CLARINET_TOML = resolve("Clarinet.toml");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockDeployResults(
  contractNames: string[],
  status: "deployed" | "skipped" | "failed" = "deployed"
): DeployResult[] {
  return contractNames.map((name, i) => ({
    name,
    sourcePath: `contracts/${name}.clar`,
    type: name.includes("trait") ? ("trait" as const) : ("logic" as const),
    deployOrder: i,
    txId: status === "deployed" ? `0x${"a".repeat(64)}` : null,
    blockHeight: status === "deployed" ? 100000 + i : null,
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    fullContractId:
      status === "deployed"
        ? `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.${name}`
        : null,
    deployCost: 100000,
    status,
    deployedAt: status === "deployed" ? new Date().toISOString() : null,
    error: status === "failed" ? "mock error" : null,
    deployDurationMs: 5000,
  }));
}

function mockInitResults(
  contractNames: string[],
  status: "initialized" | "skipped" | "failed" = "initialized"
): InitResult[] {
  return contractNames.map((name) => ({
    contract: name,
    function: "initialize",
    txId: status === "initialized" ? `0x${"b".repeat(64)}` : null,
    status,
    error: status === "failed" ? "mock init error" : null,
    blockHeight: status === "initialized" ? 200000 : null,
  }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildManifest", () => {
  it("should build manifest with correct summary", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames, "deployed");
    const initResults = mockInitResults(contractNames, "initialized");

    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const manifest = buildManifest(
      { name: "testnet", deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" } as any,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    expect(manifest.version).toBe("1.0");
    expect(manifest.network).toBe("testnet");
    expect(manifest.summary.totalContracts).toBe(contractNames.length);
    expect(manifest.summary.deployed).toBe(contractNames.length);
    expect(manifest.summary.failed).toBe(0);
    expect(manifest.summary.initialized).toBe(contractNames.length);
    expect(manifest.contracts.length).toBe(contractNames.length);
  });

  it("should track failed deployments in summary", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames, "deployed");
    // Make some fail
    deployResults[0].status = "failed";
    deployResults[1].status = "failed";
    const initResults: InitResult[] = [];

    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const manifest = buildManifest(
      { name: "testnet", deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" } as any,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    expect(manifest.summary.failed).toBe(2);
    expect(manifest.summary.deployed).toBe(contractNames.length - 2);
  });

  it("should include dry-run flag", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames);
    const initResults: InitResult[] = [];
    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const manifest = buildManifest(
      { name: "testnet", deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" } as any,
      deployResults,
      initResults,
      new Date().toISOString(),
      true,
      contractDeps
    );

    expect(manifest.dryRun).toBe(true);
  });
});

describe("writeAllArtifacts", () => {
  it("should write all three artifact files", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames);
    const initResults = mockInitResults(contractNames);
    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const config = {
      name: "testnet" as const,
      deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    } as any;

    const manifest = buildManifest(
      config,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    const paths = writeAllArtifacts(config, manifest, deployResults);

    // Verify files exist
    expect(() => readFileSync(paths.manifest)).not.toThrow();
    expect(() => readFileSync(paths.addressLookup)).not.toThrow();
    expect(() => readFileSync(paths.report)).not.toThrow();
  });

  it("should write valid JSON manifest", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames);
    const initResults = mockInitResults(contractNames);
    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const config = {
      name: "testnet" as const,
      deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    } as any;

    const manifest = buildManifest(
      config,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    const paths = writeAllArtifacts(config, manifest, deployResults);
    const content = readFileSync(paths.manifest, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.version).toBe("1.0");
    expect(parsed.contracts).toBeInstanceOf(Array);
    expect(parsed.summary).toBeDefined();
  });

  it("address lookup should contain all deployed contracts", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames);
    const initResults: InitResult[] = [];
    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const config = {
      name: "testnet" as const,
      deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    } as any;

    const manifest = buildManifest(
      config,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    const paths = writeAllArtifacts(config, manifest, deployResults);
    const content = JSON.parse(readFileSync(paths.addressLookup, "utf-8"));

    expect(Object.keys(content.contracts).length).toBe(contractNames.length);
    for (const name of contractNames) {
      expect(content.contracts[name]).toBeDefined();
      expect(content.contracts[name]).toContain(name);
    }
  });

  it("markdown report should contain all contracts", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const contractNames = graph.ordered.map((c) => c.name);
    const deployResults = mockDeployResults(contractNames);
    const initResults = mockInitResults(contractNames);
    const contractDeps = new Map(graph.ordered.map((c) => [c.name, c.dependencies]));

    const config = {
      name: "testnet" as const,
      deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    } as any;

    const manifest = buildManifest(
      config,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    const paths = writeAllArtifacts(config, manifest, deployResults);
    const content = readFileSync(paths.report, "utf-8");

    for (const name of contractNames) {
      expect(content).toContain(name);
    }
    expect(content).toContain("CineX Deployment Report");
    expect(content).toContain("testnet");
  });
});

describe("Address lookup completeness", () => {
  it("should have entries for all 12 logic contracts", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);
    const logicContracts = Array.from(graph.contracts.values())
      .filter((c) => c.type === "logic")
      .map((c) => c.name);

    const deployResults = mockDeployResults(logicContracts);
    const initResults: InitResult[] = [];
    const contractDeps = new Map(logicContracts.map((n) => [n, []]));

    const config = {
      name: "testnet" as const,
      deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    } as any;

    const manifest = buildManifest(
      config,
      deployResults,
      initResults,
      new Date().toISOString(),
      false,
      contractDeps
    );

    const paths = writeAllArtifacts(config, manifest, deployResults);
    const content = JSON.parse(readFileSync(paths.addressLookup, "utf-8"));

    for (const name of logicContracts) {
      expect(content.contracts[name]).toBeDefined();
    }
  });
});
