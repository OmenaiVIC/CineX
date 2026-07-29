export const DEFAULT_THRESHOLDS = Object.freeze({
  balance: {
    minStx: 50_000_000,
    minUsdcx: 10_000_000,
  },
  volume: {
    dailyMaxStx: 5_000_000_000,
    dailyMaxUsdcx: 1_000_000_000,
  },
  failureRate: {
    maxPercent: 15,
    windowSize: 50,
  },
  stuckTime: {
    maxMinutes: 30,
  },
  burnConfirmations: {
    min: 6,
  },
});

export function getThresholds(config) {
  const custom = config?.monitoring || {};
  return {
    balance: {
      minStx: custom.minStx ?? DEFAULT_THRESHOLDS.balance.minStx,
      minUsdcx: custom.minUsdcx ?? DEFAULT_THRESHOLDS.balance.minUsdcx,
    },
    volume: {
      dailyMaxStx: custom.dailyMaxStx ?? DEFAULT_THRESHOLDS.volume.dailyMaxStx,
      dailyMaxUsdcx: custom.dailyMaxUsdcx ?? DEFAULT_THRESHOLDS.volume.dailyMaxUsdcx,
    },
    failureRate: {
      maxPercent: custom.maxFailureRatePercent ?? DEFAULT_THRESHOLDS.failureRate.maxPercent,
      windowSize: custom.failureRateWindowSize ?? DEFAULT_THRESHOLDS.failureRate.windowSize,
    },
    stuckTime: {
      maxMinutes: custom.maxStuckTimeMinutes ?? DEFAULT_THRESHOLDS.stuckTime.maxMinutes,
    },
    burnConfirmations: {
      min: custom.minBurnConfirmations ?? DEFAULT_THRESHOLDS.burnConfirmations.min,
    },
  };
}
