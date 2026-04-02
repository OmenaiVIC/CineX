import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;

describe("CineX-rewards-sip09 functional tests", () => {
  it("mints a single CineX reward NFT successfully", () => {
    const result = simnet.callPublicFn(
      "CineX-rewards-sip09",
      "mint",
      [
        Cl.principal(user1),
        Cl.uint(1),
        Cl.uint(2),
        Cl.stringAscii("Gold Tier Reward"),
      ],
      deployer
    );

    // 7 → ok response type
    expect(result.result.type).toBe(7);
  });

  it("fails mint when unauthorized caller tries to mint", () => {
    const result = simnet.callPublicFn(
      "CineX-rewards-sip09",
      "mint",
      [
        Cl.principal(user2),
        Cl.uint(1),
        Cl.uint(3),
        Cl.stringAscii("Unauthorized Mint Attempt"),
      ],
      user2
    );

    // 8 → err response type
    expect(result.result.type).toBe(8);
  });

  it("successfully performs batch minting for multiple contributors", () => {
    const recipients = [user1, user2];
    const tiers = [Cl.uint(1), Cl.uint(2)];
    const descriptions = [
      Cl.stringAscii("Gold Tier Reward"),
      Cl.stringAscii("Platinum Tier Reward"),
    ];

    const result = simnet.callPublicFn(
      "CineX-rewards-sip09",
      "batch-mint",
      [
        Cl.list(recipients.map((r) => Cl.principal(r))),
        Cl.list(tiers),
        Cl.list(descriptions),
        Cl.uint(10),
      ],
      deployer
    );

    expect(result.result.type).toBe(7);
  });

  it("fails batch mint when arrays length mismatch", () => {
    const recipients = [user1];
    const tiers = [Cl.uint(1), Cl.uint(2)];
    const descriptions = [Cl.stringAscii("Extra Tier")];

    const result = simnet.callPublicFn(
      "CineX-rewards-sip09",
      "batch-mint",
      [
        Cl.list(recipients.map((r) => Cl.principal(r))),
        Cl.list(tiers),
        Cl.list(descriptions),
        Cl.uint(10),
      ],
      deployer
    );

    expect(result.result.type).toBe(8);
  });

  it("retrieves correct token metadata after minting", () => {
    // Step 1: mint a reward token
    const mintResult = simnet.callPublicFn(
      "CineX-rewards-sip09",
      "mint",
      [
        Cl.principal(user1),
        Cl.uint(5),
        Cl.uint(3),
        Cl.stringAscii("Silver Tier Reward"),
      ],
      deployer
    );

    expect(mintResult.result.type).toBe(7);

    // Step 2: read metadata for token-id u1 (since first mint starts from u1)
    const metaResult = simnet.callReadOnlyFn(
      "CineX-rewards-sip09",
      "get-token-metadata",
      [Cl.uint(1)],
      user1
    );

    // It should return a successful response
    expect(metaResult.result.type).toBe(7);

    // Optional: log or verify expected fields
    console.log("Metadata result:", metaResult);
  });

});
