Here's how the **UI/UX interaction design** could be structured when each of those menu items is clicked, and what features should appear, including how the **hamburger menu** behaves:

---

### 🍔 **Hamburger Menu (Mobile & Tablet View)**

When clicked, it slides in or drops down to show:

* 🏠 Home
* 📊 Dashboard
* 💰 Funding Pool
* ✅ Verify Films
* 🔐 Login / Logout
* 👤 My Profile
* ⚙️ Settings
* 🌙 Dark Mode Toggle
* 📩 Notifications
* 📞 Contact / Support

---

### 🏠 **Home Page (when "Home" is clicked)**

**Display Features:**

* Hero section with welcome message or project summary
* CTA buttons (e.g., “Join a Pool”, “Submit Proposal”)
* Overview of platform purpose
* Recent film projects/funding stats preview
---

### 📊 **Dashboard Page (when "Dashboard" is clicked)**

**Display Features:**

* User profile summary (username, wallet address, balance)
* Stats: projects backed, funds contributed/received
* Buttons: “Submit Proposal”, “My Proposals”, “My Pools”
* Recent activity log (funds sent/received, proposal updates)
* Dynamic components depending on user role (admin, filmmaker, investor)

---
🎨 Crowdfunding Campaign Feature UI/UX (Stacks/Clarity Integration)

Overview:

    This feature enables creators to launch and fund campaigns on the Stacks blockchain.

    All campaign data is stored immutably in Clarity smart contracts.

User Flows:

    Create Campaign

        User connects wallet.

        Fills out form.

        Signs create-campaign transaction.

        Waits for confirmation.

    View Campaigns

        Loads campaigns via get-campaigns read-only call.

        Displays cards with funding progress.

    Fund Campaign

        User connects wallet.

        Opens modal to enter amount.

        Signs fund-campaign transaction.

        UI updates after confirmation.

    Close Campaign

        Creator can finalize funding after the goal or deadline.

Components:

    Campaign List

    Campaign Detail

    Create Campaign Form

    Fund Campaign Modal

Blockchain Integration:

    Wallet connect button on all pages.

    Show transaction status (pending/success/fail).

    Campaigns fetched live from the chain.
### 💰 **Funding Pool Page (when "Funding Pool" is clicked)**

**Display Features:**

* List of active funding pools (public & private)
* Join Pool button
* Create Pool button (if user is eligible)
* Pool details: project name, funding goal, amount raised
* Member list and contributions
* Sorting/filtering by popularity, date, or size

---

### ✅ **Verify Films Page (when "Verify Films" is clicked)**

**Display Features:**

* List of pending proposals for verification
* Buttons: “View Proposal”, “Verify”, “Reject”
* Film proposal metadata (title, description, file hashes, creator info)
* Voting or admin decision buttons
* Verified proposals archive

---

### 🔐 **Login Page (when "Login" is clicked)**

**Display Features:**

* Connect Stacks Wallet button
* Show wallet address once connected
* Optional: username setup form (one-time)
* After login, redirect to dashboard
* Handle and display connection state/errors

---




* General user features
* Co-Filmmaker collaboration
* Pool funding
* Crypto staking/investments
* Admin controls

---

### 📁 `docs/user-interface-mockup.md`

---

# 🎬 Group Film Investing Platform – UI Mockup

This document defines the **interactive UI layout** for all user types:

* 🎥 General Users (Investors)
* 🧑‍💻 Co-Filmmakers (Pool creators & project submitters)
* 🛠 Admins

---

## 🌐 1. Landing Page

* ✅ Welcome message & tagline: *“Invest Together. Create Together.”*
* ✅ Primary CTAs:

  * `Get Started`
  * `Login`
  * `Explore Pools`
* ✅ Intro video or hero animation
* 🔗 Nav Bar:

  * Home
  * About
  * Learn How It Works
  * Pools
  * Projects
  * Crypto Options
  * Login / Register

---

## 📝 2. Registration Flow

* Select role:

  * 🎥 Investor
  * 🧑‍💻 Co-Filmmaker
* Form input for profile (email, wallet, name, role)
* Optional KYC or ID verification
* Connect Wallet (Stacks / BTC / ETH)

---

## 🏠 3. General User Dashboard

* Profile snapshot (name, role, wallet, balance)
* Tabs / Features:

  * 🎬 Invest in Projects
  * 👥 Join a Pool
  * 📊 Coin-Staked Gains
  * 💼 My Investments
  * 💬 Inbox
  * 🔐 Wallet & Security
* Recent activity & investment news

---

## 🎥 4. Film Project Page

* Movie info: title, synopsis, trailer
* Progress bar (Goal vs Funded)
* Support options:

  * Fiat
  * Crypto
  * Stake tokens
* CTA:

  * `Support this Film`
  * `Join Co-Filmmaker Pool`
* Returns:

  * 🎞 Film launch bonus
  * 📈 Crypto token profit (if staked)

---

## 🎬 5. Co-Filmmaker Dashboard

* Active + past projects
* 📂 Tabs:

  * Pools I Created
  * Pool History
  * Proposals Submitted
* Actions:

  * `Create New Pool`
  * `Submit New Project`
  * `Stake Pool Funds in Token`
  * `Track Voting Results`
  * `Withdraw from Pool`

---

## ➕ 6. Pool Creation Page

* Form inputs:

  * Pool Name & Description
  * Contribution Amount
  * No. of Rounds / Members
  * Pool Logic: FIFO / Voting / Random
  * Add members via email/wallet
  * \[Optional] ✅ Enable Coin-Staking
  * Select coin (STX, BTC, ETH, SOL, USDC, Custom)

---

## 👥 7. Shared Pool Dashboard

* Pool Overview:

  * Pool Type (Public/Private)
  * Contribution status (who has paid)
  * Pool Balance: Fiat + Crypto
* Beneficiary status:

  * Who’s next to be funded
  * Timeline of disbursement
* 📈 Staking gains if enabled
* 🗳 Vote system (if configured)
* 🧾 Logs: contribution & release records
* 💬 Group Chat or Comments

---

## 📊 8. Crypto Dashboard

* Wallet Overview (Fiat + Tokens)
* Coins Staked & Performance
* Graph: Coin Value vs Pool Value
* Withdrawable balance
* Risk notice or warning panel

---

## 🛠 9. Admin Dashboard

* View platform stats
* Manage:

  * All Users
  * All Pools
  * All Projects
* Override votes / Force payout
* Resolve disputes
* Audit smart contract activity
* Ban / Flag / Recover content

---

## 🔐 10. Auth Pages

* Login
* Register (choose role)
* Forgot Password
* Connect Wallet
* Email + Wallet verification

---

## 🛎 11. Notifications & UX

* Toasts for:

  * Payment success
  * Vote result
  * Pool payout
  * Crypto gain/loss
* Notification drawer/panel
* Global loader spinner & state transitions

---

## 🌍 12. Global Navigation Bar

```txt
[ Home ] | [ Pools ] | [ Projects ] | [ Dashboard ] | [ Wallet ] | [ Crypto Gains ] | [ Admin* ] | [ Logout ]
```

\*Visible only for admins

---

## 🎨 13. Theme & UI Style

* Design: Minimalist, film-grain textured background
* Color Palette:

  * 🎞 Film tones: black, gold, warm beige
  * 📈 Staking tones: greens and reds
* Responsive: Mobile / Tablet friendly
* CSS: All scoped with `*.module.css` per component

---

## ✅ Summary of Features Covered

| Feature                    | Supported | Notes                               |
| -------------------------- | --------- | ----------------------------------- |
| Group Pooling              | ✅         | With voting, tracking, disbursement |
| Film Project Submissions   | ✅         | With support tiers                  |
| Crypto Staking Integration | ✅         | Coin tracking + smart gain system   |
| Multiple Dashboards        | ✅         | General User, Co-Filmmaker, Admin   |
| Investment Tracking        | ✅         | With visual breakdowns              |
| Wallet Management          | ✅         | STX, BTC, ETH supported             |
| UI Scalability             | ✅         | Modular, easily expandable          |

---

