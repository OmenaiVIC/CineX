/**
 * profileService.ts
 * =================
 * Off-chain user profile CRUD.
 *
 * Public methods:
 *   getProfile(address)         — fetch a single profile
 *   updateProfile(changes)      — update display fields (mock only)
 *   searchProfiles(query)       — find profiles by display name / bio
 *   getRecentProfiles()         — newest profiles (for discovery)
 */

import type { ServiceResponse, Profile } from "../types";

interface UserSession {
  isUserSignedIn(): boolean;
  loadUserData(): { profile: { stxAddress: { testnet: string; mainnet: string } } };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const MOCK_PROFILES: Profile[] = [
  {
    address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    displayName: "Alice Filmmaker",
    bio: "Independent documentary filmmaker based in Nairobi.  Passionate about telling untold African stories.",
    avatarUrl: "",
    isOnboarded: true,
    joinedAt: Date.now() - 86_400_000 * 120,
    socialLinks: { twitter: "@alice_film", website: "https://alicefilms.example" },
    reputationScore: 4.5,
    ratingCount: 2,
  },
  {
    address: "SP3X6QWWETNB4GB6B6W6Z1S2SQE3X6QWWETNB4GB",
    displayName: "Bob Producer",
    bio: "Award-winning producer with 10+ years in the industry.  Currently producing my first feature.",
    avatarUrl: "",
    isOnboarded: true,
    joinedAt: Date.now() - 86_400_000 * 60,
    socialLinks: { twitter: "@bob_producer" },
    reputationScore: 5.0,
    ratingCount: 1,
  },
  {
    address: "ST2VTFJEEJQN93Z6P3AFF6QN7M3WXY85ZPNDR3G51",
    displayName: "Carol Editor",
    bio: "Video editor and colourist.  Let's make your footage shine.",
    avatarUrl: "",
    isOnboarded: false,
    joinedAt: Date.now() - 86_400_000 * 7,
    socialLinks: {},
    reputationScore: 0,
    ratingCount: 0,
  },
];

export class ProfileService {
  private userSession: UserSession | null;

  constructor(userSession: UserSession | null) {
    this.userSession = userSession;
  }

  /**
   * getProfile
   * ----------
   * Fetch a single profile by Stacks address.
   * Returns the profile or an error when not found.
   */
  async getProfile(address: string): Promise<ServiceResponse<Profile>> {
    const profile = MOCK_PROFILES.find((p) => p.address === address);
    if (!profile) return { success: false, error: "Profile not found" };
    return { success: true, data: profile };
  }

  /**
   * updateProfile
   * -------------
   * Update the current user's off-chain profile.
   * Mock-only — returns a success with the merged changes.
   * @param changes - Partial profile fields to apply
   */
  async updateProfile(changes: Partial<Profile>): Promise<ServiceResponse<Profile>> {
    const address =
      this.userSession?.loadUserData()?.profile?.stxAddress?.testnet ?? "unknown";
    const existing = MOCK_PROFILES.find((p) => p.address === address);
    const updated: Profile = { ...(existing ?? {}), ...changes, address } as Profile;
    return { success: true, data: updated, transactionId: `mock_tx_${Date.now()}` };
  }

  /**
   * searchProfiles
   * --------------
   * Simple substring match against displayName and bio.
   * @param query - Free-text search term
   */
  async searchProfiles(query: string): Promise<ServiceResponse<Profile[]>> {
    const lower = query.toLowerCase();
    const results = MOCK_PROFILES.filter(
      (p) =>
        p.displayName?.toLowerCase().includes(lower) ||
        p.bio?.toLowerCase().includes(lower),
    );
    return { success: true, data: results };
  }

  /**
   * getRecentProfiles
   * -----------------
   * Return the newest profiles sorted by joinedAt descending.
   * @param limit - Max results (default 10)
   */
  async getRecentProfiles(limit = 10): Promise<ServiceResponse<Profile[]>> {
    return {
      success: true,
      data: [...MOCK_PROFILES].sort((a, b) => b.joinedAt - a.joinedAt).slice(0, limit),
    };
  }
}

export function createProfileService(us: UserSession | null): ProfileService {
  return new ProfileService(us);
}
