# CineX Frontend Integration Overview – Co-EP Rotating Fundings

## 1. Purpose
This document explains how CineX smart contracts interact with each other, and how the frontend integrates with them using Stacks.js, based strictly on:

- Mapped frontend actions to real CineX contracts (precisely the deployed Co-EP Rotating Fundings, Core and Crowdfunding modules)
  
- Demonstrated **proper Stacks.js methodology** for transactions and read-only calls.

- Deterministic devnet deployment and contract IDs

- Provided **mock transaction examples** with realistic CineX deployments.

- Hiro Devnet API

### 1.1 Project Context

CineX is a modular, multi-contract system enabling filmmakers to:

- Create film projects
- Raise funds (crowdfunding + rotating Co-EP model)
- Validate filmmaker identity
- Manage rewards
- Escrow mechanisms
- On-chain verification flows

CineX's devnet deployment uses deterministic contract IDs, enabling stable local testing and frontend integration.

---

## 2. Prerequisites

### 2.1 Install Dependencies

```bash
npm install @stacks/connect @stacks/transactions @stacks/network




### 2.2 Configure Devvnet Network


import { StacksTestnet } from '@stacks/network';

const network = new StacksTestnet({
  url: 'https://api.platform.hiro.so/v1/ext/1ec08f6d3c031b532aa987f5a0398f37/stacks-blockchain-api'
});



### 2.3 Key Variables 
const CONTRACT_OWNER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

const COEP_CONTRACT = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.Co-EP-rotating-fundings';
const CROWDFUNDING_CONTRACT = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.crowdfunding-module';
const CORE_CONTRACT = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.CineX-project';
const VERIFICATION_CONTRACT = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.film-verification-module';
const ESCROW_CONTRACT = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.escrow-module';
```

## 3. Contract-to-Frontend Mapping

### 3.1 Co-EP Rotating Fundings Module

| Function                         |  Description                                      |  
| -------------------------------------------------------------------------------------                   
| `contribute-to-existing-pool`    | Contribute STX to pool ;updates `has-contributed` | 

| Frontend Integration (Stack.js)  |
----------------------------------
| ```javascript                                                        
import { callPublicFunction, uintCV } from '@stacks/transactions'; |                                                   

const txOptions = {
contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
contractName: 'Co-EP-rotating-fundings',
functionName: 'contribute-to-existing-pool',
functionArgs: [uintCV(poolId)],
network,
senderKey: userPrivateKey
};

const tx = await callPublicFunction(txOptions);



| Function                   |  Description  
|----------------------------------------------------------------------------------------------------------------------|  
| `execute-rotation-funding` | Transfers funds to beneficiary, triggers linked crowdfunding campaign, advances rotation 

| Frontend Integration (Stack.js)                                               |
|-------------------------------------------------------------------------------|
| ```javascript                                                                  

import { callPublicFunction, uintCV, principalCV } from '@stacks/transactions';

const tx = await callPublicFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'Co-EP-rotating-fundings',
  functionName: 'execute-rotation-funding',
  functionArgs: [
    uintCV(poolId),
    principalCV(CROWDFUNDING_CONTRACT),
    principalCV(VERIFICATION_CONTRACT)
  ],
  network,
  senderKey: CONTRACT_OWNER_KEY
});


``` |
| Function                   |  Description                                                                            |
|----------------------------------------------------------------------------------------------------------------------|  
| `update-rotation-project-details` | Allows the beneficiary to update project metadata before their rotation 

| Frontend Integration (Stack.js)                                                                       |
|-------------------------------------------------------------------------------------------------------|
| Use `stringUtf8CV`, `stringAsciiCV`, `uintCV` types for title, description, completion, reward tiers. |

**Helper Notes:**

- `verify-all-contributions` and `advance-rotation` are **private**—frontend does **not call them directly**.
- Always **catch errors** returned from `asserts!` for robust UI feedback.
- Event logs (`print`) can be captured in frontend for **notifications and auditing**.

---
```
### 3.2 CineX Core Contract (CineX-project)

| Function     | Description                                                  |                         
|------------- |--------------------------------------------------------------|
| `initialize` | Sets up core addresses for crowdfunding, verification, escrow 

| Frontend Integration                                                         |
|------------------------------------------------------------------------------|
| ```javascript         |
await callPublicFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'CineX-project',
  functionName: 'initialize',
  functionArgs: [
    principalCV(CORE_CONTRACT),
    principalCV(CROWDFUNDING_CONTRACT),
    principalCV(VERIFICATION_CONTRACT),
    principalCV(ESCROW_CONTRACT)
  ],
  network,
  senderKey: CONTRACT_OWNER_KEY
});
``` |

| Function                   |  Description            |
|------------------------------------------------------| 
| `set-pause-state` | Emergency pause for the protocol | 


| Frontend Integration                                                         |
|------------------------------------------------------------------------------|
Call with `boolCV(true|false)`; only core contract can execute. |

---
```

### 3.3 Crowdfunding Module

| Function               | Description 
|----------|-------------|-----------------------------------------|
| `create-campaign`      | Creates a public campaign for a project | 

| Frontend Integration |
Called internally by `execute-rotation-funding`; **frontend can optionally query for status** via read-only calls. |

---
```
## 4. Read-Only Calls

Examples for **UI state retrieval**:

```javascript
import { callReadOnlyFunction, uintCV } from '@stacks/transactions';

// Get pool members
const members = await callReadOnlyFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'Co-EP-rotating-fundings',
  functionName: 'get-pool-members',
  functionArgs: [uintCV(poolId)],
  senderAddress: userStxAddress,
  network
});

// Check if system paused
const paused = await callReadOnlyFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'CineX-project',
  functionName: 'is-system-paused',
  functionArgs: [],
  senderAddress: userStxAddress,
  network
});
```

## 5. Mock Transaction Example (Critical Functions)

### Step 1: Contributor joins pool and contributes

await callPublicFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'Co-EP-rotating-fundings',
  functionName: 'contribute-to-existing-pool',
  functionArgs: [uintCV(1)],
  network,
  senderKey: contributorKey
});
```

### Step 2: Execute rotation funding (funds to beneficiary and trigger crowdfunding)

await callPublicFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'Co-EP-rotating-fundings',
  functionName: 'execute-rotation-funding',
  functionArgs: [
    uintCV(1),
    principalCV(CROWDFUNDING_CONTRACT),
    principalCV(VERIFICATION_CONTRACT)
  ],
  network,
  senderKey: CONTRACT_OWNER_KEY
});
```

### Step 3: Update project details (beneficiary only)

await callPublicFunction({
  contractAddress: 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9',
  contractName: 'Co-EP-rotating-fundings',
  functionName: 'update-rotation-project-details',
  functionArgs: [
    uintCV(1),
    uintCV(1),
    stringUtf8CV("Updated Title"),
    stringAsciiCV("Updated Description"),
    uintCV(120),
    uintCV(3),
    stringAsciiCV("Tiered rewards description")
  ],
  network,
  senderKey: beneficiaryKey
});

## 3. Deterministic Devnet Contract IDs

Based on CienX's Auto-generated deployment ***default.devnet-plan.yaml*** plan created by Hiro for devnet and Hiro Devnet setup, all CineX contracts are deployed by:

ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM



Examples of the important contract IDs used in this document:
| Contract                 | Contract ID                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| CineX core               | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.CineX-project`            |
| Crowdfunding Module      | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.crowdfunding-module`      |
| Co-EP Rotating Funding   | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.Co-EP-rotating-fundings`  |
| Film Verification Module | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.film-verification-module` |
| Escrow Module            | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.escrow-module`            |
``
## 4. Contract-to-Contract Integration Architecture
Below is the coded, reviewer-friendly mermaid diagram showing the functional relationships across CineX modules:

flowchart TD
    A[CineX-project (Core Contract)] --> B[Crowdfunding Module]
    A --> C[Co-EP Rotating Fundings]
    A --> D[Film Verification Module]

    B --> E[Escrow Module]
    C --> E[Escrow Module]
    D --> A

    C -->|requires| D
    B -->|requires| D

Explanation:

- CineX-project orchestrates film creation, module references, and global state.

- Crowdfunding-module handles pledge creation, campaign status, and investor logic.

- Co-EP-rotating-fundings manages rotating equity contributions.

- Film-verification-module verifies filmmaker identity and film authenticity.

- Escrow-module ensures secure locked fund releases.

This structure ensures deterministic flows and modular upgradeability
``

## 6. Devnet Deployment Notes (Using default.devnet-plan.yaml)
The following are guaranteed during deployment:

ALL contract IDs remain stable across devnet resets

Deployment order is deterministic

Traits are deployed first → modules → extension modules

The CineX core is deployed after traits ensuring trait-check validation

All modules reference the same principal ensuring consistent cross-contract logic

For frontend work, this ensures:

✔ No contract ID mismatches
✔ No missing trait implementations
✔ No broken module reference graphs



✔CineX contracts are deployed automatically on the Hiro Devnet through the project dashboard. Frontend developers do NOT therefore run Clarinet deployments locally