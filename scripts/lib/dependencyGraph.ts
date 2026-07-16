/**
 * dependencyGraph.ts
 * ==================
 * Parses Clarinet.toml, computes topological deployment order,
 * validates dependencies, and detects cycles.
 *
 * Satisfies: PRD §4 (Smart Contract Status), §1.1 (Contract deployment status)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContractEntry {
  name: string;
  sourcePath: string;
  dependencies: string[];
  type: "trait" | "logic";
}

export interface DeploymentLayer {
  layer: number;
  contracts: ContractEntry[];
}

export interface DependencyGraph {
  contracts: Map<string, ContractEntry>;
  ordered: ContractEntry[];
  layers: DeploymentLayer[];
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse Clarinet.toml and extract all contract entries with dependencies.
 * This is a simplified TOML parser that handles the specific format of Clarinet.toml.
 */
export function parseClarinetToml(tomlPath: string): Map<string, ContractEntry> {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const contracts = new Map<string, ContractEntry>();

  // Match [contracts.NAME] blocks
  const contractBlocks = raw.split(/\[contracts\./).slice(1);

  for (const block of contractBlocks) {
    // Extract contract name (everything up to the next ])
    const nameMatch = block.match(/^([^\]]+)\]/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    // Extract path
    const pathMatch = block.match(/path\s*=\s*'([^']+)'/);
    if (!pathMatch) continue;
    const sourcePath = pathMatch[1].replace(/\\/g, "/");

    // Extract depends_on array
    const depsMatch = block.match(/depends_on\s*=\s*\[([^\]]*)\]/);
    const dependencies: string[] = [];
    if (depsMatch) {
      const depEntries = depsMatch[1].match(/'([^']+)'/g);
      if (depEntries) {
        for (const dep of depEntries) {
          dependencies.push(dep.replace(/'/g, "").trim());
        }
      }
    }

    // Determine type from path
    const type: "trait" | "logic" = sourcePath.includes("-trait") ? "trait" : "logic";

    contracts.set(name, { name, sourcePath, dependencies, type });
  }

  return contracts;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export class DependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DependencyError";
  }
}

/**
 * Validate that all dependencies referenced in depends_on exist in the contract map.
 * Fails fast with a clear error message listing all missing dependencies.
 */
export function validateDependencies(contracts: Map<string, ContractEntry>): void {
  const missing: Array<{ contract: string; missingDep: string }> = [];

  for (const [name, entry] of contracts) {
    for (const dep of entry.dependencies) {
      if (!contracts.has(dep)) {
        missing.push({ contract: name, missingDep: dep });
      }
    }
  }

  if (missing.length > 0) {
    const details = missing
      .map((m) => `  - ${m.contract} depends on missing contract: ${m.missingDep}`)
      .join("\n");
    throw new DependencyError(
      `Missing dependencies detected:\n${details}\n\n` +
        `Total missing: ${missing.length}`
    );
  }
}

/**
 * Check for circular dependencies using DFS.
 * Returns the cycle path if detected, null otherwise.
 */
export function detectCycles(contracts: Map<string, ContractEntry>): string[] | null {
  const WHITE = 0; // unvisited
  const GRAY = 1; // in progress
  const BLACK = 2; // done

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const name of contracts.keys()) {
    color.set(name, WHITE);
    parent.set(name, null);
  }

  function dfs(u: string): string[] | null {
    color.set(u, GRAY);

    const entry = contracts.get(u);
    if (entry) {
      for (const v of entry.dependencies) {
        if (!contracts.has(v)) continue;
        const vColor = color.get(v) ?? WHITE;
        if (vColor === GRAY) {
          // Found cycle — reconstruct path
          const cycle: string[] = [v, u];
          let current = u;
          while (current !== v) {
            current = parent.get(current) ?? v;
            if (current !== v) cycle.push(current);
          }
          cycle.reverse();
          return cycle;
        }
        if (vColor === WHITE) {
          parent.set(v, u);
          const cycle = dfs(v);
          if (cycle) return cycle;
        }
      }
    }

    color.set(u, BLACK);
    return null;
  }

  for (const name of contracts.keys()) {
    if (color.get(name) === WHITE) {
      const cycle = dfs(name);
      if (cycle) return cycle;
    }
  }

  return null;
}

// ─── Topological Sort ────────────────────────────────────────────────────────

/**
 * Kahn's algorithm for topological sort.
 * Returns contracts in deployment order (traits first, then logic).
 * Throws DependencyError on circular dependencies.
 */
export function topologicalSort(contracts: Map<string, ContractEntry>): ContractEntry[] {
  // Validate first
  validateDependencies(contracts);

  // Check for cycles
  const cycle = detectCycles(contracts);
  if (cycle) {
    throw new DependencyError(
      `Circular dependency detected: ${cycle.join(" → ")} → ${cycle[0]}`
    );
  }

  // Kahn's algorithm
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const name of contracts.keys()) {
    inDegree.set(name, 0);
    adjList.set(name, []);
  }

  for (const [name, entry] of contracts) {
    for (const dep of entry.dependencies) {
      if (!contracts.has(dep)) continue;
      // dep → name (dep must be deployed before name)
      adjList.get(dep)!.push(name);
      inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
    }
  }

  // Start with nodes that have no dependencies
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  // Sort queue alphabetically for deterministic output within same in-degree
  queue.sort();

  const result: ContractEntry[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    result.push(contracts.get(u)!);

    for (const v of adjList.get(u) ?? []) {
      const newDegree = (inDegree.get(v) ?? 1) - 1;
      inDegree.set(v, newDegree);
      if (newDegree === 0) {
        // Insert in sorted position for deterministic order
        const insertIdx = queue.findIndex(
          (name) => (inDegree.get(name) ?? 0) > newDegree || name > v
        );
        if (insertIdx === -1) {
          queue.push(v);
        } else {
          queue.splice(insertIdx, 0, v);
        }
      }
    }
  }

  if (result.length !== contracts.size) {
    throw new DependencyError(
      `Topological sort produced ${result.length} entries but expected ${contracts.size}. ` +
        `This indicates an undetected cycle or missing node.`
    );
  }

  return result;
}

// ─── Layer Grouping ──────────────────────────────────────────────────────────

/**
 * Group contracts into deployment layers.
 * Layer 0 = contracts with no dependencies (traits).
 * Layer N = contracts whose max dependency layer is N-1.
 */
export function getDeploymentLayers(
  _contracts: Map<string, ContractEntry>,
  ordered: ContractEntry[]
): DeploymentLayer[] {
  const layerOf = new Map<string, number>();

  for (const entry of ordered) {
    let maxDepLayer = -1;
    for (const dep of entry.dependencies) {
      const depLayer = layerOf.get(dep);
      if (depLayer !== undefined && depLayer > maxDepLayer) {
        maxDepLayer = depLayer;
      }
    }
    layerOf.set(entry.name, maxDepLayer + 1);
  }

  const layersMap = new Map<number, ContractEntry[]>();
  for (const entry of ordered) {
    const layer = layerOf.get(entry.name) ?? 0;
    if (!layersMap.has(layer)) layersMap.set(layer, []);
    layersMap.get(layer)!.push(entry);
  }

  const layers: DeploymentLayer[] = [];
  for (const [layerNum, contracts] of layersMap) {
    layers.push({ layer: layerNum, contracts });
  }

  layers.sort((a, b) => a.layer - b.layer);
  return layers;
}

// ─── Full Graph Build ────────────────────────────────────────────────────────

/**
 * Build the complete dependency graph from Clarinet.toml.
 * Returns a DependencyGraph with contracts, ordered list, and layers.
 */
export function buildDependencyGraph(tomlPath: string): DependencyGraph {
  const contracts = parseClarinetToml(tomlPath);

  if (contracts.size === 0) {
    throw new DependencyError(`No contracts found in ${tomlPath}`);
  }

  const ordered = topologicalSort(contracts);
  const layers = getDeploymentLayers(contracts, ordered);

  return { contracts, ordered, layers };
}

// ─── CLI Helper ──────────────────────────────────────────────────────────────

/**
 * Print the deployment graph to console.
 */
export function printDeploymentGraph(graph: DependencyGraph): void {
  console.log("\n📊 Deployment Graph");
  console.log("═".repeat(60));
  console.log(`  Total contracts: ${graph.contracts.size}`);
  console.log(`  Total layers: ${graph.layers.length}`);
  console.log(`  Traits: ${Array.from(graph.contracts.values()).filter((c) => c.type === "trait").length}`);
  console.log(`  Logic: ${Array.from(graph.contracts.values()).filter((c) => c.type === "logic").length}`);

  for (const layer of graph.layers) {
    console.log(`\n  Layer ${layer.layer} (${layer.contracts.length} contract${layer.contracts.length > 1 ? "s" : ""}):`);
    for (const contract of layer.contracts) {
      const depStr =
        contract.dependencies.length > 0
          ? ` [deps: ${contract.dependencies.join(", ")}]`
          : " [no deps]";
      console.log(`    ${contract.type === "trait" ? "📄" : "⚙️"}  ${contract.name}${depStr}`);
    }
  }
  console.log("\n" + "═".repeat(60));
}
