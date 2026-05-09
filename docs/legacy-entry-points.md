--
Legacy Entry Points — CineX Platform
1. Clarity Public Functions
CineX-project.clar (Main Hub)
define-public
#	Function	Parameters	Return Type
1	set-admin	(new-admin principal, is-admin bool)	(ok bool)
2	safe-propose-admin-transfer	(new-admin principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
3	accept-pending-admin-transfer	()	(ok true)
4	cancel-admin-transfer	()	(ok true)
5	validate-safe-module	(module-base <core-module-base>, emergency-module <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
6	emergency-pause-or-not-pause-system	(pause bool, verification-contract <core-emergency-module>, crowdfunding-contract <core-emergency-module>, rewards-module-contract <core-emergency-module>, escrow-contract <core-emergency-module>)	(ok true)
7	get-system-pause-status	(verification-contract <core-emergency-module>, crowdfunding-contract <core-emergency-module>, rewards-module-contract <core-emergency-module>, escrow-contract <core-emergency-module>)	(ok {...})
8	emergency-fund-recovery	(module <core-emergency-module>, module-base <core-module-base>, amount uint, recipient principal, recovery-reason (string-ascii 100), verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
9	set-film-verification-module	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
10	set-crowdfunding-module	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
11	set-rewards-module	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
12	set-escrow-module	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
13	set-co-ep-module	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
14	set-verification-ext	(new-module principal, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(ok true)
15	check-is-portfolio-present	(new-filmmaker principal, new-id uint, verification-contract <hub-verification-trait>)	(delegates to verification module)
16	check-is-filmmaker-verified	(new-filmmaker principal, verification-contract <hub-verification-trait>)	(delegates to verification module)
17	check-endorsement-status	(new-filmmaker principal, new-id uint, verification-contract <hub-verification-trait>)	(delegates to verification module)
18	create-campaign-via-hub	(description (string-ascii 500), crowdfunding-contract <hub-crowdfunding-trait>, crowdfunding-base <core-module-base>, crowdfunding-emergency <core-emergency-module>, funding-goal uint, duration uint, reward-tiers uint, reward-description (string-ascii 150), verification-contract-address <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract-address <hub-escrow-trait>)	(delegates to crowdfunding module)
19	contribute-to-campaign	(campaign-id uint, amount uint, crowdfunding-base <core-module-base>, crowdfunding-emergency <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract-address <hub-escrow-trait>)	(delegates to crowdfunding module)
20	claim-campaign-funds	(campaign-id uint, crowdfunding-base <core-module-base>, crowdfunding-emergency <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract-address <hub-escrow-trait>)	(ok true)
21	deposit-to-escrow-via-hub	(campaign-id uint, amount uint, escrow-base <core-module-base>, escrow-emergency <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract-address <hub-escrow-trait>)	(delegates to escrow module)
22	withdraw-from-escrow-via-hub	(campaign-id uint, amount uint, escrow-base <core-module-base>, escrow-emergency <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract-address <hub-escrow-trait>)	(delegates to escrow module)
23	award-reward-via-hub	(campaign-id uint, contributor principal, tier uint, description (string-ascii 150), rewards-module-contract <hub-rewards-trait>, rewards-base <core-module-base>, rewards-emergency <core-emergency-module>, verification-contract <hub-verification-trait>, crowdfunding-contract <hub-crowdfunding-trait>, rewards-module-contract <hub-rewards-trait>, escrow-contract <hub-escrow-trait>)	(delegates to rewards module)
24	initialize-platform	(verification principal, crowdfunding principal, rewards principal, escrow principal, co-ep principal, verf-ext principal)	(ok true)
define-read-only
#	Function	Parameters	Return Type
1	get-pending-admin	()	(ok (optional {...}))
2	check-admin-status	(user principal)	bool
3	is-system-paused	()	bool
4	get-total-recoverable-funds	()	{ escrow-balance, crowdfunding-balance, rewards-balance, hub-balance, total-recoverable-balance }
5	get-specific-module-recoverable-balance	(module-address principal)	(optional { module-balance, has-balance })
6	get-fund-recovery-log	(fund-recovery-ops-id uint)	(optional {...})
7	get-fund-recovery-counter	()	uint
8	get-verification-module	()	principal
9	get-crowdfunding-module	()	principal
10	get-rewards-module	()	principal
11	get-escrow-module	()	principal
12	get-co-ep-module	()	principal
13	get-platform-stats	()	{ crowdfunding-module, rewards-module, escrow-module, film-verification-module, co-ep-module, verification-mgt }
14	get-initialization-status	()	{ is-initialized, initialized-at, admin }
---
crowdfunding-module.clar
define-public
#	Function	Parameters	Return Type
1	create-campaign	(description (string-ascii 500), campaign-id uint, funding-goal uint, duration uint, reward-tiers uint, reward-description (string-ascii 150), verification-address <crwd-verification-trait>)	(ok uint) (new campaign ID)
2	contribute-to-campaign	(campaign-id uint, amount uint, escrow-address <crwd-escrow-trait>)	(ok true)
3	claim-campaign-funds	(campaign-id uint, escrow-address <crwd-escrow-trait>)	(ok true)
4	initialize	(core principal)	(ok true)
5	set-verification-contract	(verification principal)	(ok true)
6	set-escrow-contract	(escrow principal)	(ok true)
7	set-pause-state	(pause bool)	(ok true)
8	emergency-withdraw	(amount uint, recipient principal)	(ok true)
define-read-only
#	Function	Parameters	Return Type
1	get-total-campaigns	()	(ok uint)
2	get-campaign	(campaign-id uint)	(ok {...})
3	is-active-campaign	(campaign-id uint)	(ok bool)
4	get-campaign-funding-goal	(campaign-id uint)	(ok uint)
5	get-total-raised-funds	(campaign-id uint)	(ok uint)
6	get-campaign-owner	(campaign-id uint)	(ok principal)
7	get-filmmaker-verification	(campaign-id uint)	(optional bool)
8	get-emergency-ops-log	(ops-id uint)	(optional {...})
9	get-campaign-contributions	(campaign-id uint, contributor principal)	(optional {...})
10	module-status	()	{ version, active, paused, total-campaigns, total-fees-collected, emergency-ops-count }
11	is-system-paused	()	(ok bool)
12	get-module-version	()	(ok uint)
13	is-module-active	()	(ok bool)
14	get-module-name	()	(ok "crowdfunding-module")
---
escrow-module.clar
define-public
#	Function	Parameters	Return Type
1	deposit-to-campaign	(campaign-id uint, amount uint)	(ok true)
2	authorize-withdrawal	(campaign-id uint, new-requester principal)	(ok bool)
3	authorize-fee-collection	(campaign-id uint, requester principal)	(ok true)
4	withdraw-from-campaign	(campaign-id uint, amount uint)	(ok true)
5	collect-campaign-fee	(campaign-id uint, fee-amount uint)	(ok true)
6	initialize	(core principal, crowdfunding principal, escrow principal)	(ok true)
7	set-crowdfunding	(crowdfunding principal)	(ok true)
8	set-escrow	(escrow principal)	(ok true)
9	set-pause-state	(pause bool)	(ok true)
10	emergency-withdraw	(amount uint, recipient principal)	(ok true)
define-read-only
#	Function	Parameters	Return Type
1	get-campaign-balance	(campaign-id uint)	(ok uint)
2	is-system-paused	()	(ok bool)
3	get-emergency-ops-count	()	(ok uint)
4	get-module-version	()	(ok uint)
5	is-module-active	()	(ok bool)
6	get-module-name	()	(ok "escrow-module")
---
film-verification-module.clar
define-public
#	Function	Parameters
1	register-filmmaker-id	(new-filmmaker principal, new-full-name (string-ascii 100), new-profile-url (string-ascii 255), new-identity-hash (buff 32), new-choice-verification-level uint, new-choice-verification-level-expiration uint)
2	add-filmmaker-portfolio	(new-added-filmmaker principal, new-added-project-name (string-ascii 100), new-added-project-url (string-ascii 255), new-added-project-desc (string-ascii 500), new-added-project-completion-year uint)
3	pay-verification-fee	(verification-level uint)
4	verify-filmmaker-identity	(filmmaker principal, new-expiration-block uint)
5	update-filmmaker-expiration-period	(new-filmmaker principal, new-expiration-period uint)
6	add-filmmaker-endorsement	(new-added-filmmaker principal, new-endorser-name (string-ascii 100), new-endorsement-letter (string-ascii 255), new-endorsement-url (string-ascii 255))
7	set-contract-admin	(new-admin principal)
8	set-core-contract	(new-core principal)
9	set-renewal-extension-contract	(extension-contract principal)
10	set-third-party-endorser	(new-endorser principal)
11	set-pause-state	(pause bool)
12	emergency-withdraw	(amount uint, recipient principal)
define-read-only
#	Function	Parameters	Return Type
1	is-portfolio-available	(new-filmmaker principal, new-id uint)	(ok bool)
2	is-filmmaker-currently-verified	(new-filmmaker principal)	(response bool uint)
3	is-endorsement-available	(new-filmmaker principal, new-id uint)	(ok bool)
4	get-filmmaker-identity	(new-filmmaker principal)	(ok (optional {...}))
5	get-filmmaker-portfolio	(new-filmmaker principal, new-id uint)	(optional {...})
6	get-filmmaker-endorsements	(new-filmmaker principal, new-id uint)	(optional {...})
7	get-total-filmmakers	()	uint
8	get-total-verification-fees	()	uint
9	get-total-registered-filmmaker-portfolios	()	uint
10	get-total-filmmaker-endorsements	()	uint
11	get-core	()	principal
12	get-third-party-address	()	principal
13	get-contract-admin	()	(ok principal)
14	is-system-paused	()	(ok bool)
15	get-module-version	()	(ok uint)
16	is-module-active	()	(ok bool)
17	get-module-name	()	(ok "film-verification-module")
---
Co-EP-rotating-fundings.clar
define-public
#	Function	Parameters
1	add-filmmaker-project	(new-project-name (string-utf8 100), new-project-type (string-ascii 30), new-role (string-ascii 50), new-collaborators (list 50 principal), project-start-date uint, project-end-date uint, new-project-url (string-ascii 255), verification-address <coep-verification-trait>)
2	verify-mutual-project	(new-project-id uint, new-collaborator principal)
3	create-mutual-connection	(new-requester principal, new-target principal, new-connection-type (string-ascii 30), new-mutual-project-ids (list 10 uint), verification-address <coep-verification-trait>)
4	create-new-rotating-funding-pool	(new-project-id uint, new-pool-name (string-utf8 100), standard-max-members uint, standard-contribution-per-member uint, pool-cycle-duration uint, pool-legal-agreement-hash (buff 32), pool-category (string-ascii 30), pool-geographic-focus (string-ascii 50), verification-address <coep-verification-trait>)
5	join-existing-pool	(existing-pool-id uint, referrer principal, mutual-project-ids (list 10 uint), new-title (string-utf8 100), new-description (string-ascii 500), expected-completion uint)
6	contribute-to-existing-pool	(existing-pool-id uint)
7	execute-rotation-funding	(existing-pool-id uint, crowdfunding-address <coep-crowdfunding-trait>, verification-contract-address <coep-verification-trait>)
8	update-rotation-project-details	(existing-pool-id uint, current-rotation-number uint, current-title (string-utf8 100), current-project-description (string-ascii 500), current-expected-completion uint, current-reward-tiers uint, current-reward-description (string-ascii 500))
9	initialize	(core principal, crowdfunding principal, verification principal, escrow principal)
10	set-crowdfunding	(crowdfunding principal)
11	set-verification	(verification principal)
12	set-pause-state	(pause bool)
13	emergency-withdraw	(amount uint, recipient principal)
define-read-only
#	Function	Parameters	Return Type
1	get-verified-collaboration	(new-filmmaker principal, new-project-id uint)	bool
2	get-filmmaker-project	(new-filmmaker principal, new-project-id uint)	(optional {...})
3	get-project-counts	(new-filmmaker principal)	uint
4	get-social-connections	(new-requester principal, new-target principal)	(ok (string-ascii 24))
5	get-pool-members	(existing-pool-id uint)	(ok (list 20 principal))
6	is-system-paused	()	(ok bool)
7	get-module-version	()	(ok uint)
8	is-module-active	()	(ok bool)
9	get-module-name	()	(ok "Co-EP-rotating-fundings")
---
emergency-module.clar
define-public
#	Function	Parameters	Return Type
1	emergency-withdraw	(amount uint, recipient principal)	(ok true)
2	set-pause-state	(pause bool)	(ok true)
define-read-only
#	Function	Parameters	Return Type
1	is-system-paused	()	(ok bool)
---
rewards-module.clar
define-public
#	Function	Parameters
1	award-campaign-reward	(campaign-id uint, new-contributor principal, new-reward-tier uint, new-reward-desc (string-ascii 150), crowdfunding-address <rewards-crowdfunding-trait>)
2	batch-award-campaign-rewards	(campaign-id uint, contributors (list 50 principal), reward-tiers (list 50 uint), reward-descriptions (list 50 (string-ascii 150)), crowdfunding-address <rewards-crowdfunding-trait>)
3	initialize	(core principal, crowdfunding principal, rewards principal)
4	set-crowdfunding	(crowdfunding principal)
5	set-rewards	(rewards principal)
6	set-pause-state	(pause bool)
7	emergency-withdraw	(amount uint, recipient principal)
define-read-only
#	Function	Parameters	Return Type
1	get-contributor-reward	(campaign-id uint, contributor principal)	(ok {...})
2	is-system-paused	()	(ok bool)
3	get-module-version	()	(ok uint)
4	is-module-active	()	(ok bool)
5	get-module-name	()	(ok "rewards-module")
---
CineX-rewards-sip09.clar (NFT Token)
define-public
#	Function	Parameters	Return Type
1	set-authorized-minter	(new-minter principal)	(ok principal)
2	mint	(recipient principal, campaign-id uint, new-reward-tier uint, new-reward-desc (string-ascii 150))	(ok uint)
3	batch-mint	(recipients (list 50 principal), reward-tiers (list 50 uint), reward-descriptions (list 50 (string-ascii 150)), campaign-id uint)	(ok uint)
4	transfer	(token-id uint, sender principal, recipient principal)	(ok bool)
define-read-only
#	Function	Parameters	Return Type
1	get-last-token-id	()	(ok uint)
2	get-owner	(token-id uint)	(ok (optional principal))
3	get-token-metadata	(token-id uint)	(ok {...})
4	get-token-uri	(token-id uint)	(ok none)
---
verification-mgt-extension.clar
define-public
#	Function	Parameters	Return Type
1	set-verification-module	(new-module principal)	(ok true)
2	set-platform	(new-platform principal, verification-contract-address <verf-mgt-trait>)	(ok principal)
3	set-verifier	(new-verifier principal, verification-contract-address <verf-mgt-trait>)	(ok principal)
4	verification-renewal	(new-filmmaker principal, verification-contract <verf-mgt-trait>)	(ok {...})
5	distribute-revenue-for-period	(verification-contract <verf-mgt-trait>)	(ok {...})
6	adjust-fee-multiplier	(new-multiplier uint, verification-contract <verf-mgt-trait>)	(ok uint)
7	set-pause-state	(pause bool)	(ok true)
8	emergency-withdraw	(amount uint, recipient principal)	(ok true)
define-read-only
#	Function	Parameters	Return Type
1	get-current-verification-fees	()	{ basic-fee, standard-fee, basic-renewal-fee, standard-renewal-fee }
2	get-filmmaker-payment-history	(new-filmmaker principal)	{ total-payment, last-payment }
3	get-current-adjusted-fee-status	()	{ fee-multiplier, cureent-adjusted-fee }
4	get-revenue-distribution	(period uint)	(optional {...})
5	get-available-balance-for-distribution	()	uint
6	is-system-paused	()	(ok bool)
7	get-module-version	()	(ok uint)
8	is-module-active	()	(ok bool)
9	get-module-name	()	(ok "verification-mgt-ext")
---
module-base.clar
define-read-only
#	Function	Parameters	Return Type
1	get-module-version	()	(ok u1)
2	is-module-active	()	(ok bool)
3	get-module-name	()	(ok "BASE-MODULE")
---
### Trait-Only Files (no deployable public functions)
- `crowdfunding-module-traits.clar`
- `emergency-module-trait.clar`
- `escrow-module-trait.clar`
- `film-verification-module-trait.clar`
- `module-base-trait.clar`
- `rewards-module-trait.clar`
- `rewards-nft-trait.clar`
### Commented-Out File
- `film-verification-dummy.clar` — all functions commented out
---
2. Frontend Routes (from frontend-v2)
Routes are defined in frontend-v2/src/app/router.jsx using createBrowserRouter:
Path	Route Name	Component	Shows in Nav
/	home	@routes/home	Yes
/about	about	@routes/about	Yes
/waitlist	waitlist	@routes/waitlist	Yes
/active-pools	active-pools	@routes/active-pools	Yes
/active-pools/:slug	pool-single	@routes/pool	No
/dashboard	dashboard	@routes/dashboard	Yes
/dashboard/public	dashboard-public	@routes/dashboard-public	No
/dashboard/filmmaker	dashboard-filmmaker	@routes/dashboard-filmmaker	No
/dashboard/filmmaker/crowdfunding	filmmaker-crowdfunding	@routes/filmmaker-crowdfunding	No
/dashboard/filmmaker/create-campaign	create-campaign	@routes/create-campaign	No
/dashboard/endorser	dashboard-endorser	@routes/dashboard-endorser	No
/contact	contact	@routes/contact	Yes
/login	login	@routes/login	No
/register	register	@routes/register	No
Additionally: there is a standalone page component at src/pages/CampaignCreate.tsx (used independently, not through the router).
---
3. API Endpoints Called in the Frontend
Stacks Blockchain API Endpoints (Environment-Configured)
URL / Pattern	Source File	Usage
VITE_STACKS_API_URL (env) → default: https://api.testnet.hiro.so	src/utils/network.ts:18	Stacks API for contract calls
VITE_EXPLORER_URL (env) → default: https://explorer.hiro.so	src/utils/network.ts:112,118	Explorer links for transactions/addresses
VITE_API_URL (env) → default: http://localhost:3001	src/services/index.ts:77	Backend API base URL (not yet used, placeholder)
https://stacks-node-api.testnet.stacks.co	src/services/index.ts:78	Fallback Stacks node API
https://explorer.stacks.co/txid/${txId}?chain=devnet	src/app/routes/create-campaign.jsx:236, src/pages/CampaignCreate.tsx:159	Stacks Explorer link (display only)
https://explorer.stacks.co/txid/${txId}?chain=testnet	src/features/active-pools/components/contribution-modal.jsx:83	Stacks Explorer link (display only)
https://explorer.hiro.so/txid/${txId}?chain=testnet	src/components/Rewards/ContractCallExample.tsx:133	Stacks Explorer link (display only)
fetch() / axios Calls
Method	URL / Endpoint	Source File	Status
fetch (raw)	Used in frontend-v1 lib/networkUtils.ts:116	frontend-v1/frontend-integration/src/lib/networkUtils.ts	frontend-v1 only, not in v2
Key finding: The frontend-v2 codebase uses no direct fetch() or axios calls anywhere. All blockchain interaction is done through @stacks/connect's openContractCall and @stacks/transactions' fetchCallReadOnlyFunction, which internally hit the configured Stacks API URL.
External Image / Content URLs (display only, non-API)
URL	Source
https://images.unsplash.com/...	Pools section hero images
https://www.youtube.com/embed/t06RUxPbp_c	Home page hero video
https://example.com/trailer1.mp4	Mock campaign media (services)
https://randomuser.me/api/portraits/...	Testimonial avatars (frontend-v1)
https://forms.gle/VPsAYm3PUmyGTnGq7	Waitlist form redirect
https://xverse.app/, https://wallet.hiro.so/	Wallet installation links
https://twitter.com, https://facebook.com, https://instagram.com	Social media links (frontend-v1 footer)
---
4. Clarity Functions Called by Frontend Components
Direct openContractCall invocations (via service layer)
Note: No frontend component calls openContractCall directly; all contract calls go through service classes.
Service Class	Frontend Component(s)	Clarity Function Called	Contract
CrowdfundingService.createCampaign()	create-campaign.jsx, dashboard-filmmaker.jsx, CampaignCreate.tsx	create-campaign	crowdfunding-module.clar
CrowdfundingService.contributeToCampaign()	(via service)	contribute-to-campaign	crowdfunding-module.clar
CoEPService.createPool()	(via service)	create-new-rotating-funding-pool	Co-EP-rotating-fundings.clar
CoEPService.joinPool()	(via service)	contribute-to-existing-pool	Co-EP-rotating-fundings.clar
CoEPService.contributeToPool()	(via service)	contribute-to-existing-pool	Co-EP-rotating-fundings.clar
CoEPService.executeRotation()	(via service)	execute-rotation-funding	Co-EP-rotating-fundings.clar
CoEPService.updateRotationProjectDetails()	(via service)	update-rotation-project-details	Co-EP-rotating-fundings.clar
EscrowService.depositToEscrow()	(via service)	deposit-to-campaign	escrow-module.clar
EmergencyService.pauseSystem()	(via service)	pause-system	crowdfunding-module.clar
EmergencyService.resumeSystem()	(via service)	resume-system	crowdfunding-module.clar
Read-only calls via fetchCallReadOnlyFunction
Service Method	Clarity Function	Contract
EmergencyService.getSystemStatus()	is-system-paused	Any module
EmergencyService.getModuleVersion()	get-module-version	Any module
EmergencyService.isModuleActive()	is-module-active	Any module
Stubbed / Not Yet Integrated (TODO)
The following verification service functions have stubs awaiting integration:
Stub Function	Expected Clarity Function	Contract
registerFilmmakerId()	register-filmmaker-id	film-verification-module.clar
addFilmmakerPortfolio()	add-filmmaker-portfolio	film-verification-module.clar
getFilmmakerIdentity()	get-filmmaker-identity	film-verification-module.clar
getFilmmakerPortfolioItem()	get-filmmaker-portfolio	film-verification-module.clar
getFilmmakerEndorsementItem()	get-filmmaker-endorsements	film-verification-module.clar
isPortfolioAvailable()	is-portfolio-available	film-verification-module.clar
isFilmmakerCurrentlyVerified()	is-filmmaker-currently-verified	film-verification-module.clar
isEndorsementAvailable()	is-endorsement-available	film-verification-module.clar