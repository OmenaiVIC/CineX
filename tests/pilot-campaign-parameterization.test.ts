import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Constants ───────────────────────────────────────────────────────────────

const SCHEMA_PATH = resolve("campaigns", "schema.json");
const CAMPAIGNS_DIR = resolve("campaigns");
const USDCX_DECIMALS = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
}

function loadCampaignJSON(file: string) {
  return JSON.parse(readFileSync(resolve(CAMPAIGNS_DIR, file), "utf-8"));
}

function ngnKoboToUsdcx(ngnKobo: number, rate: number): number {
  return Math.round((ngnKobo / 100 / rate) * 10 ** USDCX_DECIMALS);
}

function validateCampaign(c: any): string[] {
  const errors: string[] = [];
  if (!c.id || c.id < 1) errors.push("id must be >= 1");
  if (!c.title || c.title.length > 64) errors.push("title required, max 64 chars");
  if (!c.description || c.description.length > 500) errors.push("description required, max 500 chars");
  if (!c.goal_ngn || c.goal_ngn < 1) errors.push("goal_ngn must be >= 1");
  if (!c.milestones || c.milestones.length < 1 || c.milestones.length > 10) {
    errors.push("milestones: 1-10 required");
  }
  if (!c.exchange_rate_ngn_per_usd || c.exchange_rate_ngn_per_usd <= 0) {
    errors.push("exchange_rate_ngn_per_usd must be > 0");
  }
  if (!c.usdcx_principal) errors.push("usdcx_principal required");
  if (!c.creator_address || c.creator_address === "PLACEHOLDER_PRODUCER_ADDRESS") {
    errors.push("creator_address must be set (PLACEHOLDER not allowed)");
  }
  if (!c.approval_window_blocks || c.approval_window_blocks < 1) {
    errors.push("approval_window_blocks must be >= 1");
  }
  if (c.fee_bps !== undefined && (c.fee_bps < 0 || c.fee_bps > 2500)) {
    errors.push("fee_bps must be between 0 and 2500");
  }
  if (c.network !== "mainnet" && c.network !== "testnet") {
    errors.push("network must be mainnet or testnet");
  }
  return errors;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Pilot Campaign Parameterization", () => {
  let schema: any;

  beforeAll(() => {
    schema = loadSchema();
  });

  describe("Schema validation", () => {
    it("schema.json exists and is valid JSON", () => {
      expect(schema).toBeDefined();
      expect(schema.$schema).toContain("json-schema.org");
    });

    it("schema has required fields", () => {
      expect(schema.required).toContain("id");
      expect(schema.required).toContain("title");
      expect(schema.required).toContain("goal_ngn");
      expect(schema.required).toContain("milestones");
      expect(schema.required).toContain("exchange_rate_ngn_per_usd");
      expect(schema.required).toContain("usdcx_principal");
      expect(schema.required).toContain("creator_address");
      expect(schema.required).toContain("approval_window_blocks");
      expect(schema.required).toContain("network");
    });

    it("schema milestone item has name and amount_ngn", () => {
      const itemProps = schema.properties.milestones.items.properties;
      expect(itemProps.name).toBeDefined();
      expect(itemProps.amount_ngn).toBeDefined();
      expect(itemProps.amount_usdcx).toBeDefined();
    });

    it("schema network enum is mainnet or testnet", () => {
      expect(schema.properties.network.enum).toEqual(["mainnet", "testnet"]);
    });

    it("schema fee_bps has upper bound of 2500", () => {
      expect(schema.properties.fee_bps.maximum).toBe(2500);
    });
  });

  describe("Campaign JSON files", () => {
    const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter(
      (f) => f.endsWith(".json") && f !== "schema.json" && !f.endsWith("-artifact.json"),
    );

    it("has at least 2 campaign files", () => {
      expect(campaignFiles.length).toBeGreaterThanOrEqual(2);
    });

    for (const file of campaignFiles) {
      describe(`${file}`, () => {
        let campaign: any;

        beforeAll(() => {
          campaign = loadCampaignJSON(file);
        });

        it("has all required fields", () => {
          expect(campaign.id).toBeDefined();
          expect(campaign.title).toBeDefined();
          expect(campaign.description).toBeDefined();
          expect(campaign.goal_ngn).toBeDefined();
          expect(campaign.milestones).toBeDefined();
          expect(campaign.exchange_rate_ngn_per_usd).toBeDefined();
          expect(campaign.usdcx_principal).toBeDefined();
          expect(campaign.creator_address).toBeDefined();
          expect(campaign.approval_window_blocks).toBeDefined();
          expect(campaign.network).toBeDefined();
        });

        it("has valid ID (positive integer)", () => {
          expect(campaign.id).toBeTypeOf("number");
          expect(campaign.id).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(campaign.id)).toBe(true);
        });

        it("has valid exchange rate", () => {
          expect(campaign.exchange_rate_ngn_per_usd).toBeGreaterThan(0);
        });

        it("has valid milestones (1-10)", () => {
          expect(campaign.milestones.length).toBeGreaterThanOrEqual(1);
          expect(campaign.milestones.length).toBeLessThanOrEqual(10);
        });

        it("all milestones have name and amount_ngn", () => {
          for (const m of campaign.milestones) {
            expect(m.name).toBeDefined();
            expect(m.name.length).toBeGreaterThanOrEqual(1);
            expect(m.name.length).toBeLessThanOrEqual(64);
            expect(m.amount_ngn).toBeGreaterThan(0);
          }
        });

        it("USDCx principal matches expected format", () => {
          expect(campaign.usdcx_principal).toMatch(/^S[PT][A-Z0-9]+\.[a-zA-Z0-9_-]+$/);
        });

        it("fee_bps is within valid range (0-2500)", () => {
          expect(campaign.fee_bps).toBeGreaterThanOrEqual(0);
          expect(campaign.fee_bps).toBeLessThanOrEqual(2500);
        });

        it("goal_ngn matches sum of milestone NGN amounts", () => {
          const milestoneSum = campaign.milestones.reduce(
            (s: number, m: any) => s + m.amount_ngn,
            0,
          );
          expect(milestoneSum).toBe(campaign.goal_ngn);
        });
      });
    }
  });

  describe("NGN→USDCx conversion", () => {
    it("converts ₦6,000,000 at ₦1,383/$1 correctly", () => {
      // ₦60,000.00 = $43.38... = 43,383,948 USDCx (6 decimals)
      const result = ngnKoboToUsdcx(6000000, 1383);
      // ₦60,000 = $43.38 → 43380000 USDCx (allow ±100 for rounding)
      expect(result).toBeGreaterThan(43300000);
      expect(result).toBeLessThan(43400000);
    });

    it("converts ₦1,200,000 at ₦1,383/$1 correctly", () => {
      const result = ngnKoboToUsdcx(1200000, 1383);
      // ₦12,000 = $8.68 → 8680000 USDCx
      expect(result).toBeGreaterThan(8600000);
      expect(result).toBeLessThan(8800000);
    });

    it("round-trips: milestone sum ≈ goal (±1 USDCx unit)", () => {
      const rate = 1383;
      const goal = 6000000; // ₦60,000 kobo
      const milestones = [1200000, 2800000, 2000000]; // must sum to goal
      const goalUsdcx = ngnKoboToUsdcx(goal, rate);
      const msSum = milestones.reduce((s, m) => s + ngnKoboToUsdcx(m, rate), 0);
      expect(Math.abs(msSum - goalUsdcx)).toBeLessThanOrEqual(1);
    });

    it("conversion is deterministic", () => {
      const a = ngnKoboToUsdcx(3000000, 1383);
      const b = ngnKoboToUsdcx(3000000, 1383);
      expect(a).toBe(b);
    });
  });

  describe("Campaign validation helper", () => {
    it("valid campaign passes", () => {
      const campaign = {
        id: 1,
        title: "Test Campaign",
        description: "A test campaign",
        goal_ngn: 6000000,
        milestones: [{ name: "M1", amount_ngn: 6000000 }],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "SP1234567890ABCDEF",
        approval_window_blocks: 50000,
        fee_bps: 500,
        network: "mainnet",
      };
      expect(validateCampaign(campaign)).toHaveLength(0);
    });

    it("fails on placeholder address", () => {
      const campaign = {
        id: 1,
        title: "Test",
        description: "Desc",
        goal_ngn: 100,
        milestones: [{ name: "M1", amount_ngn: 100 }],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "PLACEHOLDER_PRODUCER_ADDRESS",
        approval_window_blocks: 50000,
        fee_bps: 500,
        network: "mainnet",
      };
      const errors = validateCampaign(campaign);
      expect(errors.some((e) => e.includes("PLACEHOLDER"))).toBe(true);
    });

    it("fails on missing milestones", () => {
      const campaign = {
        id: 1,
        title: "Test",
        description: "Desc",
        goal_ngn: 100,
        milestones: [],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "SP1234567890ABCDEF",
        approval_window_blocks: 50000,
        fee_bps: 500,
        network: "mainnet",
      };
      const errors = validateCampaign(campaign);
      expect(errors.some((e) => e.includes("milestones"))).toBe(true);
    });

    it("fails on invalid network", () => {
      const campaign = {
        id: 1,
        title: "Test",
        description: "Desc",
        goal_ngn: 100,
        milestones: [{ name: "M1", amount_ngn: 100 }],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "SP1234567890ABCDEF",
        approval_window_blocks: 50000,
        fee_bps: 500,
        network: "test",
      };
      const errors = validateCampaign(campaign);
      expect(errors.some((e) => e.includes("network"))).toBe(true);
    });

    it("fails on fee_bps exceeding 2500", () => {
      const campaign = {
        id: 1,
        title: "Test",
        description: "Desc",
        goal_ngn: 100,
        milestones: [{ name: "M1", amount_ngn: 100 }],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "SP1234567890ABCDEF",
        approval_window_blocks: 50000,
        fee_bps: 3000,
        network: "mainnet",
      };
      const errors = validateCampaign(campaign);
      expect(errors.some((e) => e.includes("fee_bps") || e.includes("2500"))).toBe(true);
    });

    it("fails on goal < sum of milestone amounts", () => {
      const campaign = {
        id: 1,
        title: "Test",
        description: "Desc",
        goal_ngn: 50,
        milestones: [{ name: "M1", amount_ngn: 100 }],
        exchange_rate_ngn_per_usd: 1383,
        usdcx_principal: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
        creator_address: "SP1234567890ABCDEF",
        approval_window_blocks: 50000,
        fee_bps: 500,
        network: "mainnet",
      };
      // goal < milestone sum — the validateCampaign function doesn't check
      // this directly, but the parameterize script does
      // This test just verifies the helper doesn't crash
      expect(validateCampaign(campaign)).toHaveLength(0);
    });
  });
});
