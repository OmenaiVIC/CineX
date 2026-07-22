/**
 * Path A: Pillar Address Derivation
 *
 * In Pillar, the user's Stacks "address" is their Vault contract address.
 * The contract address = deployer address + contract name.
 * No private key derivation — the Vault IS the account.
 */

/**
 * Derive the vault contract ID from deployer address and contract name.
 * This is the user's "address" in the Pillar model.
 *
 * Example: deriveVaultAddress("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "cinex-smart-vault-001")
 *        → "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.cinex-smart-vault-001"
 */
export function deriveVaultAddress(
  deployerAddress: string,
  contractName: string
): string {
  return `${deployerAddress}.${contractName}`;
}

/**
 * Generate a deterministic contract name for a user.
 * Uses sequential numbering: cinex-smart-vault-{n}
 */
export function generateContractName(userId: string | number): string {
  const id = typeof userId === "number"
    ? String(userId).padStart(6, "0")
    : userId;
  return `cinex-smart-vault-${id}`;
}
