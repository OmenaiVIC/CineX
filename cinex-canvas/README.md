# CineX Canvas

Follow the prompt instructions below to work on developing the most fluid and elegant experience for Users on CineX:

` ` ` 
Build a React + TypeScript + Vite + Tailwind CSS frontend for CineX, a milestone‑based financing platform for Africa's creative economy. Use dark cinematic theme, mint-green primary actions, Space Grotesk for headings, Inter for body text. Mobile-first responsive at 375px, 768px, 1024px.

---

## Core Experiences to Build

### 1. Creator Profile Page

- **Registration**: name, email, role (Creative/Backer/Gatekeeper)

- **Profile view**: name, verification tier badge (Unverified/Basic/Standard), reputation score

- **Portfolio section**: list of past work (title, description, media URL, year, category)

- **Endorsements display**: list of endorsements from gatekeepers (endorser name, letter, URL, timestamp)

**Data Fields:**

- `name` (string)

- `email` (string)

- `role` (Creative | Backer | Gatekeeper)

- `verificationTier` (Unverified | Basic | Standard)

- `reputationScore` (number)

- `portfolio` (array of { id, title, description, mediaUrl, year, category })

- `endorsements` (array of { endorserName, letter, url, timestamp })

---

### 2. Portfolio Management (New)

- **Add Portfolio Item**: form with title, description, media URL (YouTube, Vimeo, SoundCloud, image), year, category (Film, Music, Fashion, Visual Art, Game, Other)

- **Edit Portfolio Item**: update existing entries

- **Delete Portfolio Item**: remove entries

- **Display**: grid or list view of portfolio items on profile page

**Data Fields for Portfolio Item:**

- `title` (string, required)

- `description` (string, max 500 chars)

- `mediaUrl` (string, URL to hosted work)

- `year` (number)

- `category` (Film | Music | Fashion | Visual Art | Game | Other)

---

### 3. Campaign Creation Flow

- Form: project title, description, funding target, milestone list (2–8 milestones)

- Each milestone: description + amount

- Funding cap enforcement: If user is Unverified, show upgrade prompt when target exceeds $1,000. Basic: $10,000 cap. Standard: no cap.

- Submit button (UI only — no blockchain logic in Bolt)

**Data Fields:**

- `title` (string)

- `description` (string)

- `fundingTarget` (number)

- `milestones` (array of { description, amount })

---

### 4. Wallet Dashboard

- Display NGN balance and USDCx balance

- "Add Funds" button (placeholder)

- "Withdraw" button (placeholder)

- Recent transaction feed: list of disbursement status updates (Pending, Approved, Released)

**Data Fields:**

- `ngnBalance` (number)

- `usdcxBalance` (number)

- `transactions` (array of { type, amount, status, timestamp })

---

### 5. Milestone Tracking UI

- Progress indicators for each milestone (Pending / Approved / Released)

- Backer voting: YES/NO buttons with vote weight display

- Release status: show if milestone is releasable, pending, or disputed

**Data Fields:**

- `milestones` (array of { description, amount, status, votes })

---

### 6. Gatekeeper Endorsement Flow

- Submission form: endorser name, endorsement letter, endorsement URL

- Creative search: gatekeeper can search for a creative to endorse

- "Become an Endorser" button: greyed out with "Coming Soon" tooltip (contract does not support self-registration yet)

**Data Fields:**

- `endorserName` (string)

- `endorsementLetter` (string)

- `endorsementUrl` (string)

- `creativeId` (string)

---

## Role-Based Views

- **Creative**: Profile, Portfolio Management, Campaign Creation, Dashboard, Milestone Tracking

- **Backer**: Dashboard, Campaign Discovery, Milestone Voting

- **Gatekeeper**: Profile, Endorsement Submission, Creative Search

---

## State Management

- Use React Context or Zustand for user session, role persistence, and portfolio data

- Store: user, role, authentication status, portfolio items

---

## Routing

- React Router with protected routes based on role

- Routes: /login, /register, /dashboard, /profile, /profile/edit, /portfolio/add, /create-campaign, /campaign/:id, /endorse

---

## Component Structure

- Reusable components: Button, Card, Modal, Form, Badge, Skeleton, LoadingSpinner, FileUpload

- Layout components: Header, Footer, Sidebar

- Portfolio components: PortfolioGrid, PortfolioCard, PortfolioForm

---

## States to Include

- Loading states (skeleton screens)

- Empty states ("No portfolio items yet. Add your first work.")

- Error states (network errors, form validation)

- Success states (confirmation modals, "Portfolio item added")

---

## Design System

- Dark cinematic background: #0a0a0f

- Mint-green primary: #4ade80

- Text: #f9fafb (primary), #9ca3af (secondary)

- Fonts: Space Grotesk for headings, Inter for body

- Rounded/pill buttons, generous spacing, premium feel

---

## Output

Generate the complete codebase: components, pages, routing, state management, and Tailwind configuration. Provide a live preview in Bolt.

` ` ` 

Context:

` ` ` 
CineX is a transparent financing platform that connects verified African creatives with global investors as well as help creatives cross-collaborate across different creative verticals. We replace traditional credit checks with community trust and smart contracts to make funding safe and accessible.

Here is how the experience flows for users:

Trust Verification: Before raising capital, a creator’s identity and project must be vouched for by an established industry Gatekeeper, such as a guild leader.

Secure Funding: Global backers invest in the project using USD. These funds are held safely in a "productive escrow" that generates yield within the current existing credible Bitcoin DeFi yield protocols (Bitflow as our beachhead yield integration) while waiting to be deployed.

Milestone-Gated Releases: Capital is not handed over all at once. The project is divided into clear deliverables.As the creative completes each milestone and backers verify the work, the next tranche of capital is automatically released by smart contracts. If the work stops, the remaining capital stays protected.

Frictionless Payouts: We abstract the underlying blockchain completely. While backers fund in USD, creatives receive their milestone payouts automatically in local currency (NGN) via a simple dual-currency wallet, completely avoiding gas fees and crypto complexities.
` ` `

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
