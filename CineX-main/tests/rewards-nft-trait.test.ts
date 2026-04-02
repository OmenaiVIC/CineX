import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;

describe("rewards-nft-trait tests", () => {
  it("ensures rewards-nft-trait is deployed", () => {
    const source = simnet.getContractSource("rewards-nft-trait");
    expect(source).toBeDefined();
  });

  it("validates trait defines required functions", () => {
    const source = simnet.getContractSource("rewards-nft-trait");
    
    // Check for custom mint function
    expect(source).toContain("(mint (principal uint uint (string-ascii 150)) (response uint uint))");
    
    // Check for batch mint function
    expect(source).toContain("(batch-mint ((list 50 principal) (list 50 uint) (list 50 (string-ascii 150)) uint) (response uint uint))");
    
    // Check for token metadata function
    expect(source).toContain("(get-token-metadata (uint) (response {");
  });

  it("validates CineX-rewards-sip09 implements rewards-nft-trait", () => {
    const implementationSource = simnet.getContractSource("CineX-rewards-sip09");
    expect(implementationSource).toContain("impl-trait .rewards-nft-trait.rewards-nft-trait");
  });
});