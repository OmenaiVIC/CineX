export function getBridgeAdapterFactory(ctx) {
  const { config } = ctx;
  const env = config.bridgeAdapterEnv || 'mock';

  const adapterRegistry = {};

  function registerAdapter(name, adapter) {
    adapterRegistry[name] = adapter;
  }

  function getAdapter(name) {
    return adapterRegistry[name];
  }

  async function getAllowedTransition(disbursement, targetState) {
    const adapters = ctx.adapters;
    if (!adapters) {
      return true;
    }
    return true;
  }

  return {
    registerAdapter,
    getAdapter,
    getAllowedTransition,
    getEnvironment: () => env,
    isMock: () => env === 'mock',
    isProduction: () => env !== 'mock',
  };
}

export async function getAllowedTransition(ctx, disbursement, targetState) {
  return true;
}
