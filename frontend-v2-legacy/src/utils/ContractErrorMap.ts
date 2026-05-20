const CONTRACT_PREFIXES: Record<string, string> = {
  'u200': 'CineX Main Hub',
  'u300': 'Crowdfunding',
  'u400': 'Co-EP Rotating Fund',
  'u1001': 'Project/Verification',
  'u3000': 'Rewards',
  'u4000': 'Escrow',
  'u5000': 'Asset Registry (Admin)',
  'u5100': 'Oracle Proxy',
  'u5200': 'Reputation',
  'u5400': 'Milestone Escrow',
  'u5500': 'Yield Escrow',
  'u5600': 'Milestone Verification / Bitflow Strategy',
  'u8000': 'Multi-Sig',
  'u8100': 'Timelock',
};

const ERROR_MAP: Record<number, { message: string; prefix: string }> = {
  // CineX Main Hub (u200–u221)
  200: { message: 'Not authorized', prefix: 'Hub' },
  201: { message: 'Module not configured', prefix: 'Hub' },
  202: { message: 'Campaign not found', prefix: 'Hub' },
  203: { message: 'STX transfer failed', prefix: 'Hub' },
  204: { message: 'System is paused', prefix: 'Hub' },
  205: { message: 'System is not paused', prefix: 'Hub' },
  206: { message: 'Invalid module', prefix: 'Hub' },
  207: { message: 'Invalid amount', prefix: 'Hub' },
  208: { message: 'No funds to recover', prefix: 'Hub' },
  209: { message: 'Insufficient funds', prefix: 'Hub' },
  210: { message: 'Invalid recipient', prefix: 'Hub' },
  211: { message: 'Cannot send to self', prefix: 'Hub' },
  212: { message: 'Above emergency withdrawal limit', prefix: 'Hub' },
  213: { message: 'Emergency withdrawal failed', prefix: 'Hub' },
  214: { message: 'Pause operation failed', prefix: 'Hub' },
  215: { message: 'Pause state check failed', prefix: 'Hub' },
  216: { message: 'Funding goal not reached', prefix: 'Hub' },
  217: { message: 'Already initialized', prefix: 'Hub' },
  218: { message: 'Duplicate module', prefix: 'Hub' },
  219: { message: 'Module status check failed', prefix: 'Hub' },
  220: { message: 'Transfer timed out', prefix: 'Hub' },
  221: { message: 'No pending transfer', prefix: 'Hub' },

  // Crowdfunding (u300–u322)
  300: { message: 'Not authorized', prefix: 'Crowdfunding' },
  301: { message: 'Invalid amount', prefix: 'Crowdfunding' },
  302: { message: 'Campaign not found', prefix: 'Crowdfunding' },
  303: { message: 'Campaign is inactive', prefix: 'Crowdfunding' },
  304: { message: 'Funding goal not reached', prefix: 'Crowdfunding' },
  305: { message: 'Already claimed', prefix: 'Crowdfunding' },
  306: { message: 'Transfer failed', prefix: 'Crowdfunding' },
  307: { message: 'Escrow balance not found', prefix: 'Crowdfunding' },
  308: { message: 'Invalid verification level', prefix: 'Crowdfunding' },
  309: { message: 'No verification', prefix: 'Crowdfunding' },
  310: { message: 'System is paused', prefix: 'Crowdfunding' },
  311: { message: 'System is not paused', prefix: 'Crowdfunding' },
  312: { message: 'Module is inactive', prefix: 'Crowdfunding' },
  313: { message: 'Invalid recipient', prefix: 'Crowdfunding' },
  314: { message: 'Insufficient funds', prefix: 'Crowdfunding' },
  315: { message: 'Campaign has expired', prefix: 'Crowdfunding' },
  316: { message: 'Invalid campaign duration', prefix: 'Crowdfunding' },
  317: { message: 'Invalid description', prefix: 'Crowdfunding' },
  318: { message: 'Invalid reward tiers', prefix: 'Crowdfunding' },
  319: { message: 'Funding goal exceeded', prefix: 'Crowdfunding' },
  320: { message: 'Duplicate contribution', prefix: 'Crowdfunding' },
  321: { message: 'Cannot contribute to own campaign', prefix: 'Crowdfunding' },
  322: { message: 'Funding cap exceeded', prefix: 'Crowdfunding' },

  // Co-EP Rotating Fund (u400–u421)
  400: { message: 'Not authorized', prefix: 'Co-EP' },
  401: { message: 'Connection already exists', prefix: 'Co-EP' },
  402: { message: 'Pool not found', prefix: 'Co-EP' },
  403: { message: 'Insufficient balance', prefix: 'Co-EP' },
  404: { message: 'Invalid pool size', prefix: 'Co-EP' },
  405: { message: 'Pool is full', prefix: 'Co-EP' },
  406: { message: 'Not a pool member', prefix: 'Co-EP' },
  407: { message: 'Already funded this rotation', prefix: 'Co-EP' },
  408: { message: 'Pool is inactive', prefix: 'Co-EP' },
  409: { message: 'Invalid rotation', prefix: 'Co-EP' },
  410: { message: 'Scheduled funding not yet complete', prefix: 'Co-EP' },
  411: { message: 'Filmmaker not found', prefix: 'Co-EP' },
  412: { message: 'Identity not verified', prefix: 'Co-EP' },
  413: { message: 'Project not found', prefix: 'Co-EP' },
  414: { message: 'No mutual project', prefix: 'Co-EP' },
  415: { message: 'Connection not found', prefix: 'Co-EP' },
  416: { message: 'System is paused', prefix: 'Co-EP' },
  417: { message: 'System is not paused', prefix: 'Co-EP' },
  418: { message: 'Invalid amount', prefix: 'Co-EP' },
  419: { message: 'Insufficient funds', prefix: 'Co-EP' },
  420: { message: 'Invalid recipient', prefix: 'Co-EP' },
  421: { message: 'Transfer failed', prefix: 'Co-EP' },

  // Project Verification (u1001–u1020)
  1001: { message: 'Not authorized', prefix: 'Verification' },
  1002: { message: 'Creator not found', prefix: 'Verification' },
  1003: { message: 'Invalid verification level', prefix: 'Verification' },
  1004: { message: 'Already registered', prefix: 'Verification' },
  1005: { message: 'Portfolio not found', prefix: 'Verification' },
  1006: { message: 'Endorsement not found', prefix: 'Verification' },
  1007: { message: 'Verification has expired', prefix: 'Verification' },
  1008: { message: 'Transfer failed', prefix: 'Verification' },
  1009: { message: 'Not verified', prefix: 'Verification' },
  1010: { message: 'System is not paused', prefix: 'Verification' },
  1011: { message: 'System is paused', prefix: 'Verification' },
  1012: { message: 'Invalid amount', prefix: 'Verification' },
  1013: { message: 'Insufficient funds', prefix: 'Verification' },
  1014: { message: 'Invalid recipient', prefix: 'Verification' },
  1015: { message: 'Transfer failed', prefix: 'Verification' },
  1016: { message: 'Not the owner', prefix: 'Verification' },
  1017: { message: 'Already initialized', prefix: 'Verification' },
  1018: { message: 'Not an admin', prefix: 'Verification' },
  1019: { message: 'Not an emergency admin', prefix: 'Verification' },
  1020: { message: 'Invalid project vertical', prefix: 'Verification' },

  // Rewards (u3000–u3011)
  3000: { message: 'Not authorized', prefix: 'Rewards' },
  3001: { message: 'Campaign not found', prefix: 'Rewards' },
  3002: { message: 'Invalid reward tier', prefix: 'Rewards' },
  3003: { message: 'Transfer failed', prefix: 'Rewards' },
  3004: { message: 'Reward minting failed', prefix: 'Rewards' },
  3005: { message: 'Lists have unequal length', prefix: 'Rewards' },
  3006: { message: 'Reward not found', prefix: 'Rewards' },
  3007: { message: 'System is not paused', prefix: 'Rewards' },
  3008: { message: 'System is paused', prefix: 'Rewards' },
  3009: { message: 'Invalid amount', prefix: 'Rewards' },
  3010: { message: 'Insufficient funds', prefix: 'Rewards' },
  3011: { message: 'Invalid recipient', prefix: 'Rewards' },

  // Escrow (u4000–u4009)
  4000: { message: 'Not authorized', prefix: 'Escrow' },
  4001: { message: 'Campaign not found', prefix: 'Escrow' },
  4002: { message: 'Transfer failed', prefix: 'Escrow' },
  4003: { message: 'Insufficient balance', prefix: 'Escrow' },
  4004: { message: 'System is not paused', prefix: 'Escrow' },
  4005: { message: 'System is paused', prefix: 'Escrow' },
  4006: { message: 'Invalid amount', prefix: 'Escrow' },
  4007: { message: 'Insufficient funds', prefix: 'Escrow' },
  4008: { message: 'Invalid recipient', prefix: 'Escrow' },
  4009: { message: 'Self-contract not initialized', prefix: 'Escrow' },

  // Asset Registry (u5000–u5009)
  5000: { message: 'Not an admin (asset registry)', prefix: 'Asset Registry' },
  5001: { message: 'Asset already exists', prefix: 'Asset Registry' },
  5002: { message: 'Asset not found', prefix: 'Asset Registry' },
  5003: { message: 'Asset is disabled', prefix: 'Asset Registry' },
  5004: { message: 'Not an emergency admin', prefix: 'Asset Registry' },
  5005: { message: 'Cannot remove STX', prefix: 'Asset Registry' },
  5006: { message: 'Invalid decimals', prefix: 'Asset Registry' },
  5007: { message: 'Already initialized', prefix: 'Asset Registry' },
  5008: { message: 'Not the owner', prefix: 'Asset Registry' },
  5009: { message: 'Empty name', prefix: 'Asset Registry' },
  5010: { message: 'Not allowed (Co-EP)', prefix: 'Co-EP' },

  // Oracle Proxy (u5100–u5105)
  5100: { message: 'Not an admin (oracle)', prefix: 'Oracle' },
  5101: { message: 'Not an emergency admin', prefix: 'Oracle' },
  5102: { message: 'Stale oracle price', prefix: 'Oracle' },
  5103: { message: 'Invalid oracle price', prefix: 'Oracle' },
  5104: { message: 'Already initialized', prefix: 'Oracle' },
  5105: { message: 'Not the owner', prefix: 'Oracle' },

  // Reputation (u5200–u5206)
  5200: { message: 'Cannot rate yourself', prefix: 'Reputation' },
  5201: { message: 'Duplicate rating — already rated this user', prefix: 'Reputation' },
  5202: { message: 'Invalid rating score (must be 1–5)', prefix: 'Reputation' },
  5203: { message: 'Not verified', prefix: 'Reputation' },
  5204: { message: 'Not an admin', prefix: 'Reputation' },
  5205: { message: 'Already initialized', prefix: 'Reputation' },
  5206: { message: 'Not the owner', prefix: 'Reputation' },

  // Milestone Escrow (u5400–u5423)
  5400: { message: 'Campaign not found', prefix: 'Milestone Escrow' },
  5401: { message: 'Milestone not found', prefix: 'Milestone Escrow' },
  5402: { message: 'Not authorized for this action', prefix: 'Milestone Escrow' },
  5403: { message: 'Campaign already exists', prefix: 'Milestone Escrow' },
  5404: { message: 'Insufficient funds in campaign', prefix: 'Milestone Escrow' },
  5405: { message: 'STX transfer failed', prefix: 'Milestone Escrow' },
  5406: { message: 'Invalid amount', prefix: 'Milestone Escrow' },
  5407: { message: 'Previous milestone not yet approved', prefix: 'Milestone Escrow' },
  5408: { message: 'Creator cannot approve their own milestone', prefix: 'Milestone Escrow' },
  5409: { message: 'Not a campaign contributor', prefix: 'Milestone Escrow' },
  5410: { message: 'Milestone already approved', prefix: 'Milestone Escrow' },
  5411: { message: 'Milestone funds already released', prefix: 'Milestone Escrow' },
  5412: { message: 'Campaign is already completed', prefix: 'Milestone Escrow' },
  5413: { message: 'Invalid milestone deadline', prefix: 'Milestone Escrow' },
  5414: { message: 'Maximum milestone limit reached', prefix: 'Milestone Escrow' },
  5415: { message: 'Campaign has expired', prefix: 'Milestone Escrow' },
  5416: { message: 'Funding cap exceeded', prefix: 'Milestone Escrow' },
  5417: { message: 'No proof submitted for this milestone', prefix: 'Milestone Escrow' },
  5418: { message: 'System is not paused', prefix: 'Milestone Escrow' },
  5419: { message: 'System is paused', prefix: 'Milestone Escrow' },
  5420: { message: 'Self-contract not initialized', prefix: 'Milestone Escrow' },
  5421: { message: 'Asset not supported', prefix: 'Milestone Escrow' },
  5422: { message: 'Oracle price fetch failed', prefix: 'Milestone Escrow' },
  5423: { message: 'Contract not initialized', prefix: 'Milestone Escrow' },

  // Yield Escrow (u5500–u5518)
  5500: { message: 'Not authorized', prefix: 'Yield Escrow' },
  5501: { message: 'Contract not initialized', prefix: 'Yield Escrow' },
  5502: { message: 'Already initialized', prefix: 'Yield Escrow' },
  5503: { message: 'Campaign not found', prefix: 'Yield Escrow' },
  5504: { message: 'Insufficient balance', prefix: 'Yield Escrow' },
  5505: { message: 'Transfer failed', prefix: 'Yield Escrow' },
  5506: { message: 'Invalid amount', prefix: 'Yield Escrow' },
  5507: { message: 'Strategy execution failed', prefix: 'Yield Escrow' },
  5508: { message: 'No yield available', prefix: 'Yield Escrow' },
  5509: { message: 'No strategy configured', prefix: 'Yield Escrow' },
  5510: { message: 'System is paused', prefix: 'Yield Escrow' },
  5511: { message: 'System is not paused', prefix: 'Yield Escrow' },
  5512: { message: 'No yield to claim', prefix: 'Yield Escrow' },
  5513: { message: 'Creator bonus already claimed', prefix: 'Yield Escrow' },
  5514: { message: 'Creator bonus forfeited', prefix: 'Yield Escrow' },
  5515: { message: 'Not a backer', prefix: 'Yield Escrow' },
  5516: { message: 'Not the campaign creator', prefix: 'Yield Escrow' },
  5517: { message: 'No yield snapshot available', prefix: 'Yield Escrow' },
  5518: { message: 'No accumulated yield', prefix: 'Yield Escrow' },

  // Milestone Verification / Bitflow Strategy (u5600–u5618)
  5600: { message: 'Not authorized', prefix: 'Milestone Verification' },
  5601: { message: 'Contract not initialized', prefix: 'Milestone Verification' },
  5602: { message: 'Already initialized', prefix: 'Milestone Verification' },
  5603: { message: 'Campaign not found', prefix: 'Milestone Verification' },
  5604: { message: 'Milestone not found', prefix: 'Milestone Verification' },
  5605: { message: 'Milestone already endorsed', prefix: 'Milestone Verification' },
  5606: { message: 'Verification deadline has passed', prefix: 'Milestone Verification' },
  5607: { message: 'Not the campaign creator', prefix: 'Milestone Verification' },
  5608: { message: 'Not a backer', prefix: 'Milestone Verification' },
  5609: { message: 'No submission exists', prefix: 'Milestone Verification' },
  5610: { message: 'Already finalized', prefix: 'Milestone Verification' },
  5611: { message: 'Within resubmission buffer period', prefix: 'Milestone Verification' },
  5612: { message: 'System is paused', prefix: 'Milestone Verification' },
  5613: { message: 'System is not paused', prefix: 'Milestone Verification' },
  5614: { message: 'Bonus already forfeited', prefix: 'Milestone Verification' },
  5615: { message: 'No pending submission', prefix: 'Milestone Verification' },
  5616: { message: 'Deadline has not yet passed', prefix: 'Milestone Verification' },
  5617: { message: 'Campaign milestones already set up', prefix: 'Milestone Verification' },
  5618: { message: 'Cannot set up with zero milestones', prefix: 'Milestone Verification' },

  // Multi-Sig (u8000–u8008)
  8000: { message: 'Not a signer', prefix: 'Multi-Sig' },
  8001: { message: 'Transaction not found', prefix: 'Multi-Sig' },
  8002: { message: 'Transaction already executed', prefix: 'Multi-Sig' },
  8003: { message: 'Not enough confirmations', prefix: 'Multi-Sig' },
  8004: { message: 'Signer already exists', prefix: 'Multi-Sig' },
  8005: { message: 'Signer not found', prefix: 'Multi-Sig' },
  8006: { message: 'Invalid replacement transaction', prefix: 'Multi-Sig' },
  8007: { message: 'Already confirmed this transaction', prefix: 'Multi-Sig' },
  8008: { message: 'Not the contract owner', prefix: 'Multi-Sig' },

  // Timelock (u8100–u8106)
  8100: { message: 'Only multisig can queue', prefix: 'Timelock' },
  8101: { message: 'Queue entry not found', prefix: 'Timelock' },
  8102: { message: 'Already executed', prefix: 'Timelock' },
  8103: { message: 'Already cancelled', prefix: 'Timelock' },
  8104: { message: 'Timelock delay not yet met', prefix: 'Timelock' },
  8105: { message: 'Inner contract call failed', prefix: 'Timelock' },
  8106: { message: 'Not the contract owner', prefix: 'Timelock' },
};

function extractErrorCode(error: unknown): number | null {
  if (typeof error === 'number') return error;
  if (typeof error === 'string') {
    const match = error.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : null;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.value === 'number') return obj.value;
    if (typeof obj.code === 'number') return obj.code;
    if (typeof obj.errorCode === 'number') return obj.errorCode;
    const str = JSON.stringify(error);
    const match = str.match(/(\d{3,5})/);
    return match ? parseInt(match[0], 10) : null;
  }
  return null;
}

export function contractErrorToHuman(error: unknown): string {
  const code = extractErrorCode(error);

  if (code !== null && ERROR_MAP[code]) {
    const { prefix, message } = ERROR_MAP[code];
    return `[${prefix}] ${message}`;
  }

  if (typeof error === 'string') {
    if (error.includes('Insufficient funds')) return 'Insufficient STX balance in your wallet.';
    if (error.includes('cancelled') || error.includes('Cancelled')) return 'Transaction was cancelled.';
    if (error.includes('timeout') || error.includes('Timeout')) return 'Transaction timed out. Please try again.';
    if (error.includes('nonce') || error.includes('Nonce')) return 'Wallet nonce mismatch. Please reconnect your wallet and try again.';
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function getContractPrefix(code: number): string {
  return CONTRACT_PREFIXES[`u${code}`] || 'Unknown Contract';
}
