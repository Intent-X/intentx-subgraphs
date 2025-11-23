# Subgraph Analysis Scripts

This directory contains TypeScript scripts for querying user trading data from IntentX and Carbon subgraphs.

## Overview

The analysis suite consists of three main files:

- **`library.ts`** - Shared constants, types, and utility functions
- **`carbon-analysis.ts`** - Functions for querying Carbon trading data
- **`intentx-analysis.ts`** - Functions for querying IntentX trading data

## Key Features

### Data Format

- All volume and fees are returned in **wei format** (as strings)
- Simplified response structure with only essential fields:
  - `volume` - Trading volume in wei
  - `generatedFees` - Generated fees in wei
  - `quotesCount` - Number of quotes/trades
  - `timestamp` - Unix timestamp
  - `chainId` - Chain identifier (when querying multiple chains)

### Supported Chains

**IntentX (MultiAccount):**

- Base: `0x8Ab178C07184ffD44F0ADfF4eA2ce6cFc33F3b86`
- Blast: `0x083267D20Dbe6C2b0A83Bd0E601dC2299eD99015`
- Mantle: `0xECbd0788bB5a72f9dFDAc1FFeAAF9B7c2B26E456`
- Polygon: `0xffE2C25404525D2D4351D75177B92F18D9DaF4Af`
- Arbitrum: `0x141269E29a770644C34e05B127AB621511f20109`

**Carbon:**

- Base: `0x39EcC772f6073242d6FD1646d81FA2D87fe95314`

## Usage Examples

### Carbon Analysis

```typescript
import {
  getCarbonUserDailyHistory,
  getCarbonUserTotalHistory,
  getAllCarbonUserDailyHistories,
  SupportedChainId,
} from "./carbon-analysis";

// Get daily history for a specific user
const dailyData = await getCarbonUserDailyHistory(
  "0x1234...", // wallet address
  SupportedChainId.BASE, // chain ID
  1000, // first (pagination)
  0 // skip (pagination)
);

// Get total history for a specific user
const totalData = await getCarbonUserTotalHistory(
  "0x1234...", // wallet address
  SupportedChainId.BASE
);

// Get all user daily histories (batch query)
const allDaily = await getAllCarbonUserDailyHistories(SupportedChainId.BASE);
```

### IntentX Analysis

```typescript
import {
  getIntentXUserDailyHistory,
  getIntentXUserTotalHistory,
  getAllIntentXUserDailyHistoriesMultiChain,
  SupportedChainId,
} from "./intentx-analysis";

// Get daily history for a specific user on a specific chain
const dailyData = await getIntentXUserDailyHistory(
  "0x1234...", // wallet address
  SupportedChainId.BASE, // chain ID
  1000, // first (pagination)
  0 // skip (pagination)
);

// Get data across multiple chains
const multiChainData = await getAllIntentXUserDailyHistoriesMultiChain([
  SupportedChainId.BASE,
  SupportedChainId.ARBITRUM,
  SupportedChainId.MANTLE,
]);
```

## Function Categories

### Individual User Queries

- `getCarbonUserDailyHistory()` / `getIntentXUserDailyHistory()`
- `getCarbonUserTotalHistory()` / `getIntentXUserTotalHistory()`

### Batch Queries (with pagination)

- `getCarbonUserDailyHistoriesBatch()` / `getIntentXUserDailyHistoriesBatch()`
- `getCarbonUserTotalHistoriesBatch()` / `getIntentXUserTotalHistoriesBatch()`

### Complete Data Queries (auto-pagination)

- `getAllCarbonUserDailyHistories()` / `getAllIntentXUserDailyHistories()`
- `getAllCarbonUserTotalHistories()` / `getAllIntentXUserTotalHistories()`

### Multi-User Queries

- `getCarbonMultipleUserDailyHistory()` / `getIntentXMultipleUserDailyHistory()`
- `getCarbonMultipleUserTotalHistory()` / `getIntentXMultipleUserTotalHistory()`

### Multi-Chain Queries (IntentX only)

- `getIntentXUserDailyHistoryMultiChain()`
- `getIntentXUserTotalHistoryMultiChain()`
- `getAllIntentXUserDailyHistoriesMultiChain()`
- `getAllIntentXUserTotalHistoriesMultiChain()`

## Response Types

### SimplifiedUserDailyHistory

```typescript
interface SimplifiedUserDailyHistory {
  volume: string; // Trading volume in wei
  generatedFees: string; // Generated fees in wei
  quotesCount: string; // Number of quotes
  timestamp: string; // Unix timestamp
  chainId?: SupportedChainId; // Chain ID (for multi-chain queries)
}
```

### SimplifiedUserTotalHistory

```typescript
interface SimplifiedUserTotalHistory {
  volume: string; // Total trading volume in wei
  generatedFees: string; // Total generated fees in wei
  quotesCount: string; // Total number of quotes
  chainId?: SupportedChainId; // Chain ID (for multi-chain queries)
}
```

## Pagination

Most functions support pagination with `first` and `skip` parameters:

- `first`: Number of records to fetch (default: 1000)
- `skip`: Number of records to skip (default: 0)

Functions with "getAll" prefix automatically handle pagination to fetch all available records.

## Error Handling

Functions include error handling for:

- Unsupported chains
- Missing GraphQL clients
- Network errors (with warnings for multi-chain queries)

## Dependencies

- `graphql-request`: For GraphQL queries
- `graphql`: GraphQL core library

## Installation

```bash
npm install graphql-request graphql
```





