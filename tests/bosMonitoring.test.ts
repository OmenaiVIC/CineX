// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * BOS Monitoring Tests
 *
 * Unit tests for:
 * 1. thresholdConfig — SLA thresholds, reaper multipliers
 * 2. alertDeduplicator — dedup logic, record/acknowledge
 * 3. notifier — Slack, Email, Composite (mocked)
 * 4. monitorJob — check functions (mocked DB)
 * 5. dashboardQueries — read queries (mocked DB)
 *
 * All DB interactions are mocked — no live database needed.
 */

// ─── thresholdConfig ────────────────────────────────────────────────
describe("thresholdConfig", () => {
  let mod: typeof import("../backend/src/services/bos/monitoring/thresholdConfig.js").default;

  beforeEach(async () => {
    mod = (await import("../backend/src/services/bos/monitoring/thresholdConfig.js")).default;
  });

  it("has expected SLA thresholds", () => {
    expect(mod.THRESHOLDS_MS.burn_timeout).toBe(600_000);
    expect(mod.THRESHOLDS_MS.attestation_timeout).toBe(900_000);
    expect(mod.THRESHOLDS_MS.destination_release_failure).toBe(3_600_000);
    expect(mod.THRESHOLDS_MS.yellowcard_api_failure).toBe(900_000);
    expect(mod.THRESHOLDS_MS.webhook_timeout).toBe(900_000);
    expect(mod.THRESHOLDS_MS.payout_timeout).toBe(1_800_000);
    expect(mod.THRESHOLDS_MS.stuck_in_state).toBe(1_800_000);
  });

  it("getStateThresholdMs returns correct threshold for known state", () => {
    expect(mod.getStateThresholdMs("burn_timeout")).toBe(600_000);
    expect(mod.getStateThresholdMs("attestation_timeout")).toBe(900_000);
  });

  it("getStateThresholdMs falls back to stuck_in_state for unknown", () => {
    expect(mod.getStateThresholdMs("unknown_state")).toBe(mod.THRESHOLDS_MS.stuck_in_state);
  });

  it("getReaperThresholdMs applies default 2x multiplier", () => {
    const result = mod.getReaperThresholdMs("initiated", 600_000);
    expect(result).toBe(1_200_000);
  });

  it("getReaperThresholdMs applies 7x multiplier for manual_review", () => {
    const result = mod.getReaperThresholdMs("manual_review", 1_800_000);
    expect(result).toBe(12_600_000);
  });

  it("DEDUP_WINDOW_MS is 30 minutes", () => {
    expect(mod.DEDUP_WINDOW_MS).toBe(30 * 60_000);
  });

  it("MONITOR_INTERVAL_MS is 5 minutes", () => {
    expect(mod.MONITOR_INTERVAL_MS).toBe(5 * 60_000);
  });

  it("EXCHANGE_RATE_STALE_MS is 5 minutes", () => {
    expect(mod.EXCHANGE_RATE_STALE_MS).toBe(5 * 60_000);
  });

  it("ALERT_SEVERITY maps all alert types", () => {
    expect(mod.ALERT_SEVERITY.burn_timeout).toBe("critical");
    expect(mod.ALERT_SEVERITY.attestation_timeout).toBe("critical");
    expect(mod.ALERT_SEVERITY.destination_release_failure).toBe("critical");
    expect(mod.ALERT_SEVERITY.yellowcard_api_failure).toBe("critical");
    expect(mod.ALERT_SEVERITY.webhook_timeout).toBe("warning");
    expect(mod.ALERT_SEVERITY.stuck_in_state).toBe("warning");
    expect(mod.ALERT_SEVERITY.rate_stale).toBe("warning");
  });
});

// ─── alertDeduplicator ──────────────────────────────────────────────
describe("alertDeduplicator", () => {
  let dedup: typeof import("../backend/src/services/bos/monitoring/alertDeduplicator.js").default;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      get: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1 }),
      release: vi.fn(),
    };

    vi.doMock("../backend/src/database.js", () => ({
      getDb: vi.fn().mockResolvedValue(mockDb),
    }));

    // Re-import to pick up mocked DB
    dedup = (await import("../backend/src/services/bos/monitoring/alertDeduplicator.js")).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("shouldSuppress returns false when no recent alert exists", async () => {
    mockDb.get.mockResolvedValue(null);
    const result = await dedup.shouldSuppress("test_key:123");
    expect(result).toBe(false);
  });

  it("shouldSuppress returns true when recent alert exists", async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    const result = await dedup.shouldSuppress("test_key:123");
    expect(result).toBe(true);
  });

  it("recordAlert inserts when not suppressed", async () => {
    mockDb.get.mockResolvedValue(null); // not suppressed
    const result = await dedup.recordAlert({
      alertKey: "burn_timeout:abc",
      alertType: "burn_timeout",
      severity: "critical",
      disbursementId: "abc",
      details: { test: true },
    });
    expect(result).toBe(true);
    expect(mockDb.run).toHaveBeenCalled();
  });

  it("recordAlert returns false when suppressed", async () => {
    mockDb.get.mockResolvedValue({ id: 1 }); // suppressed
    const result = await dedup.recordAlert({
      alertKey: "burn_timeout:abc",
      alertType: "burn_timeout",
      severity: "critical",
      disbursementId: "abc",
    });
    expect(result).toBe(false);
  });

  it("acknowledgeAlert calls update query", async () => {
    await dedup.acknowledgeAlert(42);
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE bos_alerts SET acknowledged = true"),
      [42]
    );
  });

  it("getUnacknowledgedAlerts returns all when no type filter", async () => {
    mockDb.all.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await dedup.getUnacknowledgedAlerts();
    expect(result).toHaveLength(2);
    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining("WHERE acknowledged = false"),
      []
    );
  });

  it("getUnacknowledgedAlerts filters by type when provided", async () => {
    mockDb.all.mockResolvedValue([{ id: 1 }]);
    const result = await dedup.getUnacknowledgedAlerts("burn_timeout");
    expect(result).toHaveLength(1);
    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining("alert_type = $1"),
      ["burn_timeout"]
    );
  });

  it("getAlertStats groups by type and severity", async () => {
    mockDb.all.mockResolvedValue([
      { alert_type: "burn_timeout", severity: "critical", count: 3 },
    ]);
    const result = await dedup.getAlertStats();
    expect(result).toHaveLength(1);
    expect(result[0].alert_type).toBe("burn_timeout");
  });

  it("getAlertStats respects since parameter", async () => {
    mockDb.all.mockResolvedValue([]);
    await dedup.getAlertStats(600_000);
    expect(mockDb.all).toHaveBeenCalledWith(
      expect.stringContaining("created_at > NOW()"),
      [600_000]
    );
  });
});

// ─── notifier ───────────────────────────────────────────────────────
describe("notifier", () => {
  let buildNotifier: typeof import("../backend/src/services/bos/monitoring/notifier.js").buildNotifier;
  let CompositeNotifier: typeof import("../backend/src/services/bos/monitoring/notifier.js").CompositeNotifier;

  beforeEach(async () => {
    const mod = await import("../backend/src/services/bos/monitoring/notifier.js");
    buildNotifier = mod.buildNotifier;
    CompositeNotifier = mod.CompositeNotifier;
  });

  it("buildNotifier returns console fallback when no env vars set", () => {
    delete process.env.SLACK_BOS_WEBHOOK_URL;
    delete process.env.BOS_ALERT_EMAIL_RECIPIENTS;
    const notifier = buildNotifier();
    expect(notifier).toBeDefined();
    expect(typeof notifier.send).toBe("function");
  });

  it("CompositeNotifier sends to all notifiers", async () => {
    const mock1 = { send: vi.fn().mockResolvedValue(undefined) };
    const mock2 = { send: vi.fn().mockResolvedValue(undefined) };
    const composite = new CompositeNotifier([mock1, mock2]);

    await composite.send({
      alertType: "burn_timeout",
      severity: "critical",
      message: "test alert",
      details: {},
    });

    expect(mock1.send).toHaveBeenCalledOnce();
    expect(mock2.send).toHaveBeenCalledOnce();
  });

  it("CompositeNotifier handles notifier failures gracefully", async () => {
    const mockOk = { send: vi.fn().mockResolvedValue(undefined) };
    const mockFail = { send: vi.fn().mockRejectedValue(new Error("network error")) };
    const composite = new CompositeNotifier([mockFail, mockOk]);

    // Should not throw
    await composite.send({
      alertType: "burn_timeout",
      severity: "critical",
      message: "test",
      details: {},
    });

    expect(mockOk.send).toHaveBeenCalledOnce();
  });
});

// ─── monitorJob ─────────────────────────────────────────────────────
describe("monitorJob", () => {
  let monitorJob: typeof import("../backend/src/services/bos/monitoring/monitorJob.js").default;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      get: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1 }),
      release: vi.fn(),
    };

    vi.doMock("../backend/src/database.js", () => ({
      getDb: vi.fn().mockResolvedValue(mockDb),
    }));

    // Mock notifier
    vi.doMock("../backend/src/services/bos/monitoring/notifier.js", () => ({
      default: { buildNotifier: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }) },
      buildNotifier: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
    }));

    monitorJob = (await import("../backend/src/services/bos/monitoring/monitorJob.js")).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("getStatus returns correct shape", () => {
    const status = monitorJob.getStatus();
    expect(status).toHaveProperty("running");
    expect(status).toHaveProperty("intervalMs");
    expect(status).toHaveProperty("inProgress");
    expect(status.running).toBe(false);
    expect(status.intervalMs).toBe(5 * 60_000);
  });

  it("checkStateAgeThresholds returns empty when no disbursements", async () => {
    mockDb.all.mockResolvedValue([]);
    const alerts = await monitorJob.checkStateAgeThresholds();
    expect(alerts).toEqual([]);
  });

  it("checkStateAgeThresholds detects stuck disbursements", async () => {
    // Disbursement stuck for 2 hours (well past 2x multiplier of 30min stuck_in_state)
    mockDb.all.mockResolvedValue([{
      id: "test-id-1",
      status: "initiated",
      created_at: new Date(Date.now() - 7_200_000).toISOString(),
      updated_at: new Date(Date.now() - 7_200_000).toISOString(),
      ms_in_state: 7_200_000,
    }]);

    const alerts = await monitorJob.checkStateAgeThresholds();
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].alertType).toBe("stuck_in_state");
  });

  it("checkBurnTimeouts returns empty when no disbursements", async () => {
    mockDb.all.mockResolvedValue([]);
    const alerts = await monitorJob.checkBurnTimeouts();
    expect(alerts).toEqual([]);
  });

  it("checkBurnTimeouts detects timed-out burns", async () => {
    mockDb.all.mockResolvedValue([{
      id: "burn-id-1",
      status: "burn_submitted",
      created_at: new Date(Date.now() - 900_000).toISOString(),
      ms_since_created: 900_000,
    }]);

    const alerts = await monitorJob.checkBurnTimeouts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].alertType).toBe("burn_timeout");
    expect(alerts[0].severity).toBe("critical");
  });

  it("checkAttestationTimeouts returns empty when no disbursements", async () => {
    mockDb.all.mockResolvedValue([]);
    const alerts = await monitorJob.checkAttestationTimeouts();
    expect(alerts).toEqual([]);
  });

  it("checkDestinationReleaseFailures returns empty when no disbursements", async () => {
    mockDb.all.mockResolvedValue([]);
    const alerts = await monitorJob.checkDestinationReleaseFailures();
    expect(alerts).toEqual([]);
  });

  it("checkWebhookTimeouts returns empty when no disbursements", async () => {
    mockDb.all.mockResolvedValue([]);
    const alerts = await monitorJob.checkWebhookTimeouts();
    expect(alerts).toEqual([]);
  });

  it("checkExchangeRateStaleness returns warning when no rate exists", async () => {
    mockDb.get.mockResolvedValue(null);
    const alerts = await monitorJob.checkExchangeRateStaleness();
    expect(alerts.length).toBe(1);
    expect(alerts[0].alertType).toBe("rate_stale");
  });

  it("checkExchangeRateStaleness returns empty when rate is fresh", async () => {
    mockDb.get.mockResolvedValue({
      last_update: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
    });
    const alerts = await monitorJob.checkExchangeRateStaleness();
    expect(alerts).toEqual([]);
  });

  it("checkExchangeRateStaleness detects stale rate", async () => {
    // First call: exchange rate query returns stale rate (10 min old)
    // Second call: dedup check inside recordAlert returns null (not suppressed)
    mockDb.get
      .mockResolvedValueOnce({ last_update: new Date(Date.now() - 600_000).toISOString() })
      .mockResolvedValueOnce(null);
    const alerts = await monitorJob.checkExchangeRateStaleness();
    expect(alerts.length).toBe(1);
    expect(alerts[0].alertType).toBe("rate_stale");
  });

  it("runChecks returns result with alerts array", async () => {
    mockDb.all.mockResolvedValue([]);
    mockDb.get.mockResolvedValue(null);
    const result = await monitorJob.runChecks();
    expect(result).toHaveProperty("alerts");
    expect(result).toHaveProperty("duration");
    expect(result).toHaveProperty("timestamp");
    expect(Array.isArray(result.alerts)).toBe(true);
  });

  it("start/stop cycle works", () => {
    monitorJob.start();
    expect(monitorJob.getStatus().running).toBe(true);
    monitorJob.stop();
    expect(monitorJob.getStatus().running).toBe(false);
  });
});

// ─── dashboardQueries ───────────────────────────────────────────────
describe("dashboardQueries", () => {
  let dashboardQueries: typeof import("../backend/src/services/bos/monitoring/dashboardQueries.js").default;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      get: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1 }),
      release: vi.fn(),
    };

    vi.doMock("../backend/src/database.js", () => ({
      getDb: vi.fn().mockResolvedValue(mockDb),
    }));

    dashboardQueries = (await import("../backend/src/services/bos/monitoring/dashboardQueries.js")).default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("getPipelineSummary returns correct shape", async () => {
    mockDb.all.mockResolvedValue([
      { status: "settled", count: 10 },
      { status: "initiated", count: 3 },
    ]);
    mockDb.get.mockResolvedValue({
      total: 13,
      settled: 10,
      failed: 0,
      cancelled: 0,
      total_volume_sats: 5000000,
      avg_settlement_seconds: 1200,
    });

    const result = await dashboardQueries.getPipelineSummary();
    expect(result).toHaveProperty("byStatus");
    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("successRate");
    expect(result.successRate).toBe("76.9");
  });

  it("getActiveDisbursements returns paginated results", async () => {
    mockDb.all.mockResolvedValue([
      { id: "abc", status: "initiated" },
    ]);
    mockDb.get.mockResolvedValue({ count: 1 });

    const result = await dashboardQueries.getActiveDisbursements({ limit: 10, offset: 0 });
    expect(result.disbursements).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("getRecentAlerts returns paginated results", async () => {
    mockDb.all.mockResolvedValue([{ id: 1, alert_type: "burn_timeout" }]);
    mockDb.get.mockResolvedValue({ count: 1 });

    const result = await dashboardQueries.getRecentAlerts({ limit: 20, offset: 0 });
    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("getDisbursementTimeline returns full lifecycle", async () => {
    mockDb.get.mockResolvedValue({ id: "abc", status: "settled" });
    mockDb.all
      .mockResolvedValueOnce([{ action: "created" }])  // audit
      .mockResolvedValueOnce([]);                       // alerts

    const result = await dashboardQueries.getDisbursementTimeline("abc");
    expect(result.disbursement).toBeDefined();
    expect(result.audit).toHaveLength(1);
    expect(result.alerts).toHaveLength(0);
  });

  it("getManualReviewQueue returns disbursements in manual_review", async () => {
    mockDb.all.mockResolvedValue([{ id: "xyz", status: "manual_review" }]);
    const result = await dashboardQueries.getManualReviewQueue();
    expect(result.disbursements).toHaveLength(1);
  });

  it("getAlertStats groups by type and severity", async () => {
    mockDb.all.mockResolvedValue([
      { alert_type: "burn_timeout", severity: "critical", count: 2 },
    ]);
    const result = await dashboardQueries.getAlertStats();
    expect(result).toHaveLength(1);
  });
});
