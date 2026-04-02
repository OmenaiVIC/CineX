# Frontend Developer Getting Started Guide

> Quick start guide for new developers joining the CineX frontend team

## 🎯 What We've Built So Far

### Phase 1 Complete ✅ - Authentication & Wallet Integration

We've successfully implemented a robust Stacks wallet authentication system with the following features:

```typescript
✅ Wallet Connection/Disconnection with Hiro & Xverse wallets
✅ Session Persistence across browser refreshes
✅ Real-time Balance Display (currently showing placeholder 100.0 STX)
✅ Connection Status Indicators (connected/connecting/disconnected)
✅ Comprehensive Error Handling for wallet failures
✅ Mobile-Responsive Design optimized for all devices
✅ Cross-Browser Compatibility (Chrome, Firefox, Safari)
```

## 🚀 Quick Setup (5 minutes)

```bash
# 1. Clone and navigate to frontend
git clone https://github.com/kidpreneur/CineX-project.git
cd CineX-project/frontend-integration

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5173
# 5. Install Hiro Wallet extension for testing
```

## 🧭 Code Tour - Understanding What's Built

### 1. Authentication System (`src/auth/StacksAuthContext.tsx`)

```typescript
// Our authentication system provides:
interface AuthContextType {
  userData: UserData | null;           // User wallet data
  isAuthenticated: boolean;            // Connection status
  balance: string | null;              // STX balance display
  connectionStatus: 'connected' | '...'; // Real-time status
  signIn: () => Promise<void>;         // Wallet connection
  signOut: () => void;                 // Disconnect wallet
  refreshBalance: () => Promise<void>; // Update balance
}

// Key features implemented:
- Session persistence via localStorage
- Automatic reconnection on app startup  
- Address extraction from mainnet/testnet
- Error handling for all failure scenarios
```

### 2. UI Components (`src/components/Layout/`)

```typescript
// Header.tsx - Main navigation with wallet integration
- Responsive hamburger menu for mobile
- Wallet connection button/status display
- Balance display with loading states
- Address truncation for better UX
- Disconnect functionality

// Features:
✅ Shows wallet address: SP3F1J...FCK1R
✅ Displays balance: 100.0 STX  
✅ Connection status with visual indicators
✅ Mobile-optimized responsive design
```

### 3. Styling System (`src/styles/Layout/`)

```css
/* CSS Modules architecture with: */
✅ Mobile-first responsive design
✅ Dark theme with gold accent (#FFBF00)
✅ Wallet section styling with animations
✅ Connection status indicators
✅ Hover effects and transitions
✅ Cross-browser compatibility
```

## 🎯 What's Next - Available Tasks

### Phase 2: Core Contract Integration (4 Tasks)
```typescript
// Tasks ready for development:
Task 2.1: Create service files for smart contract interaction
Task 2.2: Set up contract addresses and network configuration  
Task 2.3: Implement transaction status tracking
Task 2.4: Build reusable transaction confirmation modals
```

### Phase 3: Co-EP Pool Implementation (6 Tasks)
```typescript
// Major feature development:
Task 3.1: Pool creation form component
Task 3.2: Pool listing and discovery interface
Task 3.3: Pool detail view with member information
Task 3.4: Pool contribution interface
Task 3.5: Rotation schedule display
Task 3.6: Member verification indicators
```

## 🛠️ Development Patterns

### Component Structure
```typescript
// Follow this pattern for new components:
interface ComponentProps {
  // Define props with TypeScript
}

const Component: React.FC<ComponentProps> = ({ props }) => {
  // Use hooks at the top
  const { userData, isAuthenticated } = useAuth();
  
  // Helper functions
  const handleAction = () => {
    // Implementation
  };
  
  // JSX with CSS modules
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  );
};

export default Component;
```

### Service Layer Pattern
```typescript
// Pattern for smart contract services:
// src/services/exampleService.ts

import { UserSession } from '@stacks/connect';

export class ExampleService {
  constructor(private userSession: UserSession) {}
  
  async performAction(params: ActionParams): Promise<ActionResult> {
    try {
      // Contract interaction logic
      return { success: true, data: result };
    } catch (error) {
      console.error('Service error:', error);
      throw new Error('User-friendly error message');
    }
  }
}
```

## 🧪 Testing Your Changes

### Manual Testing Checklist
```bash
# Before committing changes:
✅ Test wallet connection/disconnection
✅ Verify session persistence (refresh page)
✅ Check mobile responsiveness
✅ Test error scenarios (reject wallet)
✅ Verify balance display
✅ Test across different browsers
```

### Code Quality
```bash
# Run these before committing:
npm run lint        # Check code quality
npm run build       # Verify production build
npm run preview     # Test production build locally
```

## 📁 File Organization

### Where to Add New Features
```bash
src/
├── components/           # Add new UI components here
│   ├── CoEP/            # Co-EP pool related components
│   ├── Forms/           # Form components
│   └── Modals/          # Modal dialogs
├── services/            # Add smart contract services here
│   ├── coepService.ts   # Co-EP pool interactions
│   └── crowdfundingService.ts
├── pages/               # Add new page components here
│   ├── Dashboard.tsx    # User dashboard
│   └── CoEPPools.tsx    # Pool listing page
└── types/               # Add TypeScript types here
    └── coep.ts          # Co-EP related types
```

## 🎨 Design System

### Colors & Theme
```css
/* Primary colors to use: */
--primary-gold: #FFBF00;      /* CineX brand color */
--background-dark: #121212;    /* Main background */
--text-light: #ffffff;         /* Primary text */
--accent-gray: #a0a0a0;        /* Secondary text */
--success-green: #4CAF50;      /* Success states */
--error-red: #F44336;          /* Error states */
```

### Typography
```css
/* Font sizes and weights: */
--heading-large: 2.2rem;       /* Main headings */
--heading-medium: 1.05rem;     /* Section headings */
--body-text: 0.95rem;          /* Regular text */
--small-text: 0.85rem;         /* Secondary text */
--mono-text: monospace;        /* Addresses, balances */
```

## 🔧 Common Development Tasks

### Adding a New Page
```typescript
// 1. Create component in src/pages/
// 2. Add route in App.tsx
// 3. Add navigation link in Header.tsx
// 4. Create corresponding CSS module
// 5. Test responsive design
```

### Integrating with Smart Contracts
```typescript
// 1. Create service in src/services/
// 2. Define TypeScript interfaces in src/types/
// 3. Add contract addresses to src/lib/contracts.ts
// 4. Implement error handling
// 5. Add transaction status tracking
```

### Creating Forms
```typescript
// 1. Create form component in src/components/Forms/
// 2. Add form validation logic
// 3. Integrate with authentication context
// 4. Add loading and error states
// 5. Style with CSS modules
```

## 🚨 Common Gotchas & Solutions

### Authentication Issues
```typescript
// Problem: Wallet not connecting
// Solution: Check browser extension is installed and enabled

// Problem: Session not persisting
// Solution: Verify localStorage is working and not blocked

// Problem: Balance showing as null
// Solution: Check address extraction logic for mainnet/testnet
```

### Styling Issues
```typescript
// Problem: Styles not applying
// Solution: Ensure CSS module import is correct

// Problem: Mobile not responsive
// Solution: Add media queries and test on actual devices

// Problem: Dark theme not consistent
// Solution: Use CSS custom properties for consistent theming
```

## 📖 Key Documentation

### Must-Read Files
1. `docs/november.md` - Complete 40+ task breakdown
2. `src/auth/StacksAuthContext.tsx` - Authentication implementation
3. `src/components/Layout/Header.tsx` - Main UI component
4. `docs/frontend actions.md` - Frontend interaction patterns

### Helpful Resources
- **Stacks Connect Docs**: https://docs.hiro.so/stacks.js/modules/connect
- **React TypeScript**: https://react-typescript-cheatsheet.netlify.app/
- **Vite Docs**: https://vitejs.dev/guide/
- **CSS Modules**: https://github.com/css-modules/css-modules

## 🤝 Getting Help

### Quick Help Steps
1. **Check existing code**: Look for similar implementations
2. **Review documentation**: Check `docs/november.md` for task details
3. **Test locally**: Use `npm run dev` to test changes
4. **Ask for help**: Create GitHub issues for blockers

### Team Communication
- **Code Reviews**: All changes go through pull request review
- **Testing**: Manual testing checklist before merging
- **Documentation**: Update docs when adding new features

---

## 🎉 Ready to Contribute!

You now have everything needed to start contributing to the CineX frontend. Pick a task from Phase 2-8 in `docs/november.md`, create a feature branch, and start building the future of decentralized film crowdfunding!

**Happy coding! 🚀**