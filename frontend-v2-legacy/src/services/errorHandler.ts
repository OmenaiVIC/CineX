// Error handling utilities for CineX services
// Provides consistent error formatting, validation, and user-friendly messages

import type { ServiceResponse } from '../types';

/**
 * Custom error class for CineX service operations
 */
export class CineXServiceError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly details?: any;

  constructor(code: string, message: string, userMessage: string, details?: any) {
    super(message);
    this.name = 'CineXServiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

/**
 * Standard error codes used across CineX services
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_SESSION: 'INVALID_SESSION',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  INVALID_PARAMS: 'INVALID_PARAMS',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_DATE: 'INVALID_DATE',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',

  // Campaign specific errors
  CAMPAIGN_EXPIRED: 'CAMPAIGN_EXPIRED',
  CAMPAIGN_FULLY_FUNDED: 'CAMPAIGN_FULLY_FUNDED',
  CAMPAIGN_NOT_ACTIVE: 'CAMPAIGN_NOT_ACTIVE',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // Pool specific errors
  POOL_FULL: 'POOL_FULL',
  POOL_NOT_ACTIVE: 'POOL_NOT_ACTIVE',
  ALREADY_POOL_MEMBER: 'ALREADY_POOL_MEMBER',
  NOT_POOL_MEMBER: 'NOT_POOL_MEMBER',
  ROTATION_IN_PROGRESS: 'ROTATION_IN_PROGRESS',

  // Escrow specific errors
  ESCROW_LOCKED: 'ESCROW_LOCKED',
  ESCROW_ALREADY_RELEASED: 'ESCROW_ALREADY_RELEASED',
  UNAUTHORIZED_WITHDRAWAL: 'UNAUTHORIZED_WITHDRAWAL',
  INSUFFICIENT_ESCROW_BALANCE: 'INSUFFICIENT_ESCROW_BALANCE',

  // Verification specific errors
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  INSUFFICIENT_VERIFICATION_BOND: 'INSUFFICIENT_VERIFICATION_BOND',
  INVALID_DOCUMENTS: 'INVALID_DOCUMENTS',

  // Network and transaction errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  CONTRACT_ERROR: 'CONTRACT_ERROR',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * User-friendly error messages mapped to error codes
 */
export const ErrorMessages: Record<string, string> = {
  [ErrorCodes.AUTH_REQUIRED]: 'Please connect your wallet to continue.',
  [ErrorCodes.INVALID_SESSION]: 'Your session has expired. Please reconnect your wallet.',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',

  [ErrorCodes.INVALID_PARAMS]: 'The provided information is invalid. Please check your input.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ErrorCodes.INVALID_AMOUNT]: 'Please enter a valid amount.',
  [ErrorCodes.INVALID_ADDRESS]: 'Please enter a valid Stacks address.',
  [ErrorCodes.INVALID_DATE]: 'Please select a valid date.',

  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'This item already exists.',
  [ErrorCodes.RESOURCE_UNAVAILABLE]: 'This item is currently unavailable.',

  [ErrorCodes.CAMPAIGN_EXPIRED]: 'This campaign has already ended.',
  [ErrorCodes.CAMPAIGN_FULLY_FUNDED]: 'This campaign has reached its funding goal.',
  [ErrorCodes.CAMPAIGN_NOT_ACTIVE]: 'This campaign is not currently accepting contributions.',
  [ErrorCodes.INSUFFICIENT_FUNDS]: 'You do not have enough STX for this transaction.',

  [ErrorCodes.POOL_FULL]: 'This Co-EP pool is full and not accepting new members.',
  [ErrorCodes.POOL_NOT_ACTIVE]: 'This Co-EP pool is not currently active.',
  [ErrorCodes.ALREADY_POOL_MEMBER]: 'You are already a member of this Co-EP pool.',
  [ErrorCodes.NOT_POOL_MEMBER]: 'You are not a member of this Co-EP pool.',
  [ErrorCodes.ROTATION_IN_PROGRESS]: 'Cannot perform this action while pool rotation is in progress.',

  [ErrorCodes.ESCROW_LOCKED]: 'These funds are currently locked in escrow.',
  [ErrorCodes.ESCROW_ALREADY_RELEASED]: 'These escrow funds have already been released.',
  [ErrorCodes.UNAUTHORIZED_WITHDRAWAL]: 'You are not authorized to withdraw these funds.',
  [ErrorCodes.INSUFFICIENT_ESCROW_BALANCE]: 'Insufficient funds in escrow for this withdrawal.',

  [ErrorCodes.VERIFICATION_PENDING]: 'Your verification is still pending review.',
  [ErrorCodes.VERIFICATION_REJECTED]: 'Your verification was rejected. Please check the feedback and resubmit.',
  [ErrorCodes.INSUFFICIENT_VERIFICATION_BOND]: 'The verification bond amount is insufficient.',
  [ErrorCodes.INVALID_DOCUMENTS]: 'Please upload valid verification documents.',

  [ErrorCodes.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ErrorCodes.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
  [ErrorCodes.TRANSACTION_TIMEOUT]: 'Transaction timed out. Please check your wallet and try again.',
  [ErrorCodes.CONTRACT_ERROR]: 'Smart contract error. Please try again later.',

  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
};

/**
 * Creates a standardized error response
 */
export function createErrorResponse<T>(
  code: string,
  message?: string,
  details?: any
): ServiceResponse<T> {
  const userMessage = ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
  
  return {
    success: false,
    error: message || userMessage,
    data: {
      code,
      userMessage,
      details,
    } as any, // We cast to any since error responses don't have typed data
  };
}

/**
 * Wraps async service operations with standardized error handling
 */
export async function handleServiceOperation<T>(
  operation: () => Promise<ServiceResponse<T>>,
  context?: string
): Promise<ServiceResponse<T>> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Service operation failed${context ? ` in ${context}` : ''}:`, error);
    
    // Handle known CineX service errors
    if (error instanceof CineXServiceError) {
      return createErrorResponse(error.code, error.message, error.details);
    }
    
    // Handle network/connectivity errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createErrorResponse(ErrorCodes.NETWORK_ERROR);
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return createErrorResponse(ErrorCodes.TRANSACTION_TIMEOUT);
    }
    
    // Default to unknown error
    return createErrorResponse(
      ErrorCodes.UNKNOWN_ERROR,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Validation utilities for common input types
 */
export const ValidationUtils = {
  /**
   * Validates STX address format
   */
  isValidSTXAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return /^S[TP][0-9A-Z]{38,40}$/.test(address);
  },

  /**
   * Validates STX amount in microSTX
   */
  isValidSTXAmount(amount: string): { valid: boolean; parsed?: number } {
    if (!amount || typeof amount !== 'string') {
      return { valid: false };
    }
    
    const parsed = parseInt(amount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return { valid: false };
    }
    
    return { valid: true, parsed };
  },

  /**
   * Validates email format
   */
  isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validates URL format
   */
  isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validates future timestamp
   */
  isValidFutureTimestamp(timestamp: number): boolean {
    if (!timestamp || typeof timestamp !== 'number') return false;
    return timestamp > Date.now();
  },

  /**
   * Validates campaign title
   */
  isValidCampaignTitle(title: string): boolean {
    if (!title || typeof title !== 'string') return false;
    return title.trim().length >= 3 && title.trim().length <= 100;
  },

  /**
   * Validates campaign description
   */
  isValidCampaignDescription(description: string): boolean {
    if (!description || typeof description !== 'string') return false;
    return description.trim().length >= 50 && description.trim().length <= 2000;
  },

  /**
   * Validates filmmaker bio
   */
  isValidBio(bio: string): boolean {
    if (!bio || typeof bio !== 'string') return false;
    return bio.trim().length >= 50 && bio.trim().length <= 1000;
  },
};

/**
 * Service-specific validation patterns
 */
export const ServiceValidators = {
  /**
   * Validates campaign creation parameters
   */
  validateCampaignCreation(params: {
    title: string;
    description: string;
    targetAmount: string;
    deadline: number;
  }): { valid: boolean; error?: string } {
    if (!ValidationUtils.isValidCampaignTitle(params.title)) {
      return { valid: false, error: 'Campaign title must be between 3 and 100 characters' };
    }

    if (!ValidationUtils.isValidCampaignDescription(params.description)) {
      return { valid: false, error: 'Campaign description must be between 50 and 2000 characters' };
    }

    const amountValidation = ValidationUtils.isValidSTXAmount(params.targetAmount);
    if (!amountValidation.valid) {
      return { valid: false, error: 'Invalid target amount' };
    }

    if (!ValidationUtils.isValidFutureTimestamp(params.deadline)) {
      return { valid: false, error: 'Campaign deadline must be in the future' };
    }

    return { valid: true };
  },

  /**
   * Validates contribution parameters
   */
  validateContribution(params: {
    amount: string;
    campaignId: string;
  }): { valid: boolean; error?: string } {
    if (!params.campaignId || params.campaignId.trim().length === 0) {
      return { valid: false, error: 'Campaign ID is required' };
    }

    const amountValidation = ValidationUtils.isValidSTXAmount(params.amount);
    if (!amountValidation.valid) {
      return { valid: false, error: 'Invalid contribution amount' };
    }

    // Minimum contribution check (0.1 STX = 100,000 microSTX)
    if (amountValidation.parsed! < 100000) {
      return { valid: false, error: 'Minimum contribution is 0.1 STX' };
    }

    return { valid: true };
  },

  /**
   * Validates verification application parameters
   */
  validateVerificationApplication(params: {
    name: string;
    bio: string;
    bondAmount: string;
    previousWorks: string[];
  }): { valid: boolean; error?: string } {
    if (!params.name || params.name.trim().length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters' };
    }

    if (!ValidationUtils.isValidBio(params.bio)) {
      return { valid: false, error: 'Bio must be between 50 and 1000 characters' };
    }

    if (!params.previousWorks || params.previousWorks.length === 0) {
      return { valid: false, error: 'At least one previous work is required' };
    }

    const bondValidation = ValidationUtils.isValidSTXAmount(params.bondAmount);
    if (!bondValidation.valid || bondValidation.parsed! < 1000000000) { // Minimum 1,000 STX
      return { valid: false, error: 'Verification bond must be at least 1,000 STX' };
    }

    return { valid: true };
  },
};

/**
 * Retry utility for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retry, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

/**
 * Transaction status checker utility
 */
export const TransactionUtils = {
  /**
   * Polls for transaction confirmation
   */
  async waitForTransaction(
    _txId: string,
    timeout: number = 30000,
    pollInterval: number = 2000
  ): Promise<{ confirmed: boolean; error?: string }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // TODO: Replace with actual Stacks API call
        // For now, simulate transaction confirmation
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // Mock confirmation logic
        const isConfirmed = Math.random() > 0.3; // 70% chance of confirmation per check
        if (isConfirmed) {
          return { confirmed: true };
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    }
    
    return { 
      confirmed: false, 
      error: 'Transaction confirmation timeout' 
    };
  },
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Export singleton rate limiter instance
export const defaultRateLimiter = new RateLimiter();