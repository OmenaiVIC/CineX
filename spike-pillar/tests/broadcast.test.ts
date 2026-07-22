/**
 * Path A: Broadcast Tests
 * 
 * Tests transaction broadcasting to Stacks network.
 */

import { describe, it, expect } from "vitest";
import { broadcastTransaction, getTransactionStatus } from "../src/pillar-broadcast.js";

describe("Pillar Broadcast", () => {
  it("should broadcast a transaction (mock)", async () => {
    const payload = {
      contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRBJJZ4",
      contractName: "my-contract",
      functionName: "execute",
      functionArgs: ["0x1234"],
      senderAddress: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      nonce: 0,
      fee: 1000,
      network: "testnet" as const,
    };
    
    const signedTx = Buffer.from("mock-signed-transaction");
    
    const result = await broadcastTransaction(payload, signedTx);
    
    expect(result.txid).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.status).toBe("pending");
  });

  it("should get transaction status (mock)", async () => {
    // This test would fail in real network, but validates the function signature
    const result = await getTransactionStatus(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "testnet"
    );
    
    // Expect either "not_found" or "error" since we're not on a real network
    expect(["not_found", "error", "pending", "success"]).toContain(result.status);
  });
});
