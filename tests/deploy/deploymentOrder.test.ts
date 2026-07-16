/**
 * deploymentOrder.test.ts
 * =======================
 * Tests for dependency graph parsing, topological sort,
 * circular dependency detection, and layer grouping.
 *
 * Satisfies: Engineering rules — "prefer deterministic state transitions"
 */

import { describe, it, expect } from "vitest";
import { resolve } from "path";
import {
  parseClarinetToml,
  topologicalSort,
  validateDependencies,
  detectCycles,
  getDeploymentLayers,
  buildDependencyGraph,
  DependencyError,
  type ContractEntry,
} from "../../scripts/lib/dependencyGraph.js";

const CLARINET_TOML = resolve("Clarinet.toml");

function makeMockContracts(entries: Array<{ name: string; deps: string[] }>): Map<string, ContractEntry> {
  return new Map(entries.map((e) => [e.name, { name: e.name, sourcePath: `${e.name}.clar`, dependencies: e.deps, type: "logic" as const }]));
}

describe("parseClarinetToml", () => {
  it("should parse all contracts from Clarinet.toml", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    expect(contracts.size).toBeGreaterThan(0);
  });

  it("should identify trait contracts", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const traits = Array.from(contracts.values()).filter((c) => c.type === "trait");
    expect(traits.length).toBeGreaterThan(0);
    expect(traits.map((t) => t.name)).toContain("emergency-module-trait");
    expect(traits.map((t) => t.name)).toContain("milestone-escrow-trait");
  });

  it("should identify logic contracts", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const logic = Array.from(contracts.values()).filter((c) => c.type === "logic");
    expect(logic.length).toBeGreaterThan(0);
    expect(logic.map((l) => l.name)).toContain("milestone-escrow");
    expect(logic.map((l) => l.name)).toContain("funding-pool");
  });

  it("should extract dependencies correctly", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const milestoneEscrow = contracts.get("milestone-escrow");
    expect(milestoneEscrow).toBeDefined();
    expect(milestoneEscrow!.dependencies).toContain("milestone-escrow-trait");
    expect(milestoneEscrow!.dependencies).toContain("emergency-module-trait");
    expect(milestoneEscrow!.dependencies).toContain("project-verification-module");
    expect(milestoneEscrow!.dependencies).toContain("oracle-proxy");
  });

  it("should handle contracts with no dependencies", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const cinexMultisig = contracts.get("cinex-multisig");
    expect(cinexMultisig).toBeDefined();
    expect(cinexMultisig!.dependencies).toEqual([]);
  });

  it("should extract source paths", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const milestoneEscrow = contracts.get("milestone-escrow");
    expect(milestoneEscrow).toBeDefined();
    expect(milestoneEscrow!.sourcePath).toBe("contracts/milestone-escrow.clar");
  });
});

describe("validateDependencies", () => {
  it("should pass for valid dependency graph", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    expect(() => validateDependencies(contracts)).not.toThrow();
  });

  it("should detect missing dependencies", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    // Add a contract with a missing dependency
    contracts.set("fake-contract", {
      name: "fake-contract",
      sourcePath: "contracts/fake.clar",
      dependencies: ["non-existent-trait"],
      type: "logic",
    });

    expect(() => validateDependencies(contracts)).toThrow(DependencyError);
  });
});

describe("detectCycles", () => {
  it("should return null for acyclic graph", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const cycle = detectCycles(contracts);
    expect(cycle).toBeNull();
  });

  it("should detect a simple cycle", () => {
    const contracts = makeMockContracts([
      { name: "a", deps: ["b"] },
      { name: "b", deps: ["a"] },
    ]);
    const cycle = detectCycles(contracts);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThanOrEqual(2);
  });

  it("should detect a longer cycle", () => {
    const contracts = makeMockContracts([
      { name: "a", deps: ["b"] },
      { name: "b", deps: ["c"] },
      { name: "c", deps: ["a"] },
    ]);
    const cycle = detectCycles(contracts);
    expect(cycle).not.toBeNull();
  });

  it("should handle self-dependency", () => {
    const contracts = makeMockContracts([
      { name: "a", deps: ["a"] },
    ]);
    const cycle = detectCycles(contracts);
    expect(cycle).not.toBeNull();
  });
});

describe("topologicalSort", () => {
  it("should produce valid deployment order for CineX contracts", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);

    expect(ordered.length).toBe(contracts.size);
  });

  it("should place traits before their implementations", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);

    const nameToIndex = new Map(ordered.map((c, i) => [c.name, i]));

    // emergency-module-trait must come before project-verification-module
    const traitIdx = nameToIndex.get("emergency-module-trait")!;
    const logicIdx = nameToIndex.get("project-verification-module")!;
    expect(traitIdx).toBeLessThan(logicIdx);
  });

  it("should place cinex-multisig before oracle-proxy", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);

    const nameToIndex = new Map(ordered.map((c, i) => [c.name, i]));
    const multisigIdx = nameToIndex.get("cinex-multisig")!;
    const oracleIdx = nameToIndex.get("oracle-proxy")!;
    expect(multisigIdx).toBeLessThan(oracleIdx);
  });

  it("should place project-verification-module before reputation", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);

    const nameToIndex = new Map(ordered.map((c, i) => [c.name, i]));
    const verificationIdx = nameToIndex.get("project-verification-module")!;
    const reputationIdx = nameToIndex.get("reputation")!;
    expect(verificationIdx).toBeLessThan(reputationIdx);
  });

  it("should place milestone-escrow before funding-pool", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);

    const nameToIndex = new Map(ordered.map((c, i) => [c.name, i]));
    const escrowIdx = nameToIndex.get("milestone-escrow")!;
    const fundingIdx = nameToIndex.get("funding-pool")!;
    expect(escrowIdx).toBeLessThan(fundingIdx);
  });

  it("should be deterministic (same order on repeated calls)", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const order1 = topologicalSort(contracts).map((c) => c.name);
    const order2 = topologicalSort(contracts).map((c) => c.name);
    expect(order1).toEqual(order2);
  });

  it("should throw DependencyError on circular dependency", () => {
    const contracts = makeMockContracts([
      { name: "a", deps: ["b"] },
      { name: "b", deps: ["a"] },
    ]);
    expect(() => topologicalSort(contracts)).toThrow(DependencyError);
  });
});

describe("getDeploymentLayers", () => {
  it("should group contracts into layers", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);
    const layers = getDeploymentLayers(contracts, ordered);

    expect(layers.length).toBeGreaterThan(0);
    expect(layers[0].layer).toBe(0); // First layer is always 0
  });

  it("should place traits in layer 0", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);
    const layers = getDeploymentLayers(contracts, ordered);

    const layer0Names = layers[0].contracts.map((c) => c.name);
    expect(layer0Names).toContain("emergency-module-trait");
    expect(layer0Names).toContain("milestone-escrow-trait");
    expect(layer0Names).toContain("asset-registry-trait");
  });

  it("should ensure no contract appears in multiple layers", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);
    const layers = getDeploymentLayers(contracts, ordered);

    const allNames = layers.flatMap((l) => l.contracts.map((c) => c.name));
    const uniqueNames = new Set(allNames);
    expect(allNames.length).toBe(uniqueNames.size);
  });

  it("should have all contracts across all layers", () => {
    const contracts = parseClarinetToml(CLARINET_TOML);
    const ordered = topologicalSort(contracts);
    const layers = getDeploymentLayers(contracts, ordered);

    const allNames = layers.flatMap((l) => l.contracts.map((c) => c.name));
    expect(allNames.length).toBe(contracts.size);
  });
});

describe("buildDependencyGraph", () => {
  it("should build complete graph from Clarinet.toml", () => {
    const graph = buildDependencyGraph(CLARINET_TOML);

    expect(graph.contracts.size).toBeGreaterThan(0);
    expect(graph.ordered.length).toBe(graph.contracts.size);
    expect(graph.layers.length).toBeGreaterThan(0);
  });

  it("should produce consistent results", () => {
    const graph1 = buildDependencyGraph(CLARINET_TOML);
    const graph2 = buildDependencyGraph(CLARINET_TOML);

    expect(graph1.ordered.map((c) => c.name)).toEqual(
      graph2.ordered.map((c) => c.name)
    );
  });
});
