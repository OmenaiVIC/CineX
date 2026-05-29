const ERROR_MAP: Record<number, { message: string; prefix: string }> = {
  5400: { message: 'Campaign not found', prefix: 'Milestone Escrow' },
  5401: { message: 'Milestone not found', prefix: 'Milestone Escrow' },
  5402: { message: 'Not authorized for this action', prefix: 'Milestone Escrow' },
  5403: { message: 'Campaign already exists', prefix: 'Milestone Escrow' },
  5404: { message: 'Insufficient funds in campaign', prefix: 'Milestone Escrow' },
   5405: { message: 'Transfer failed', prefix: 'Milestone Escrow' },
  5406: { message: 'Invalid amount', prefix: 'Milestone Escrow' },
  5407: { message: 'Previous milestone not yet approved', prefix: 'Milestone Escrow' },
  5408: { message: 'Creator cannot approve their own milestone', prefix: 'Milestone Escrow' },
  5409: { message: 'Not a campaign contributor', prefix: 'Milestone Escrow' },
  5410: { message: 'Milestone already approved', prefix: 'Milestone Escrow' },
  5411: { message: 'Milestone funds already released', prefix: 'Milestone Escrow' },
  5412: { message: 'Campaign is already completed', prefix: 'Milestone Escrow' },
  5415: { message: 'Campaign has expired', prefix: 'Milestone Escrow' },
  5416: { message: 'Funding cap exceeded', prefix: 'Milestone Escrow' },
  5417: { message: 'No proof submitted for this milestone', prefix: 'Milestone Escrow' },
  5419: { message: 'System is paused', prefix: 'Milestone Escrow' },
  5423: { message: 'Contract not initialized', prefix: 'Milestone Escrow' },
  5600: { message: 'Not authorized', prefix: 'Milestone Verification' },
  5601: { message: 'Contract not initialized', prefix: 'Milestone Verification' },
  5603: { message: 'Campaign not found', prefix: 'Milestone Verification' },
  5604: { message: 'Milestone not found', prefix: 'Milestone Verification' },
  5605: { message: 'Milestone already endorsed', prefix: 'Milestone Verification' },
  5607: { message: 'Not the campaign creator', prefix: 'Milestone Verification' },
  5608: { message: 'Not a backer', prefix: 'Milestone Verification' },
  5609: { message: 'No submission exists', prefix: 'Milestone Verification' },
  5610: { message: 'Already finalized', prefix: 'Milestone Verification' },
  5614: { message: 'Bonus already forfeited', prefix: 'Milestone Verification' },
  5200: { message: 'Cannot rate yourself', prefix: 'Reputation' },
  5201: { message: 'Duplicate rating — already rated this user', prefix: 'Reputation' },
  5202: { message: 'Invalid rating score (must be 1-5)', prefix: 'Reputation' },
  5203: { message: 'Not verified', prefix: 'Reputation' },
};

export function contractErrorToHuman(error: unknown): string {
  if (typeof error === 'number' && ERROR_MAP[error]) {
    return `[${ERROR_MAP[error].prefix}] ${ERROR_MAP[error].message}`;
  }
  if (typeof error === 'string') {
    const match = error.match(/(\d{3,5})/);
    if (match) {
      const code = parseInt(match[0], 10);
      if (ERROR_MAP[code]) {
        return `[${ERROR_MAP[code].prefix}] ${ERROR_MAP[code].message}`;
      }
    }
    if (error.includes('cancelled') || error.includes('Cancelled')) return 'Transaction was cancelled.';
    if (error.includes('timeout')) return 'Transaction timed out. Please try again.';
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}
