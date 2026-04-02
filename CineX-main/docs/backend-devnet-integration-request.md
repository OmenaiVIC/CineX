Frontend–Backend Integration Request (Devnet)



To integrate the frontend with the devnet backend, please provide the details below. 

1.  API Configuration
- Base URL (devnet): e.g., `http://localhost:3000` or `https://api-devnet.cinex.com`
- API type: REST / GraphQL / WebSocket
- Authentication: None / API key / JWT / Session-based

2.  Contract Information (Devnet)
- Deployed contract addresses/IDs:
  - Main CineX contract: `SP... .cinex-core` (example format)
  - Co-EP module: `SP... .co-ep`
  - Crowdfunding module: `SP... .crowdfunding`
  - Rewards module: `SP... .rewards`
  - Any other deployed contracts: `SP... .<name>`

3.  Network Configuration
- Devnet RPC URL:
- Chain ID:
- Network name:

4.  API Endpoints (Brief Specs)
- Example: `GET /api/pools` — Fetch all Co-EP pools
- Example: `GET /api/pools/{id}` — Pool detail by ID
- Example: `POST /api/pools/{id}/join` — Join a pool
- Example: `GET /api/users/{address}` — User profile/portfolio

For each endpoint, please share:
- Path + method, required params/body
- Sample request/response (JSON)
- Error format

5.  Integration Architecture (Pick One)
- Option A: Backend handles all blockchain ops (Frontend → Backend → Blockchain)
- Option B: Hybrid (Off-chain via backend; wallet tx direct from frontend)
- Option C: Backend only for off-chain data (profiles/analytics); frontend talks to blockchain directly

6.  Response Format Standards
- Standard envelope? e.g., `{ success: boolean, data: any, error?: string }`
- Pagination pattern (if any)
- Any provided TypeScript types/OpenAPI/GraphQL schema?

## 7) Environment Configuration
- Separate configs for devnet, testnet, mainnet? (Y/N)
- Confirm env var names to use:
  - `VITE_API_BASE_URL`
  - `VITE_NETWORK` (devnet|testnet|mainnet)
  - `VITE_API_KEY` (if applicable)

Once we have these, I’ll wire up the service layer and we can test end-to-end on devnet.
