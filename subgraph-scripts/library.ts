import { GraphQLClient as HttpGraphQLClient } from "graphql-request";

// Chain IDs enum
export enum SupportedChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  BSC = 56,
  BASE = 8453,
  BLAST = 81457,
  BSC_TESTNET = 97,
  POLYGON = 137,
  POLYGON_TESTNET = 80001,
  FANTOM = 250,
  MANTLE = 5000,
  ARBITRUM = 42161,
}

// Available IntentX themes enum
export enum AvailableIntentXThemes {
  INTENTX = "INTENTX",
}

// IntentX MultiAccount addresses
export const INTENTX_ACCOUNT_SOURCES = {
  [AvailableIntentXThemes.INTENTX]: {
    [SupportedChainId.BASE]: "0x8Ab178C07184ffD44F0ADfF4eA2ce6cFc33F3b86",
    [SupportedChainId.BLAST]: "0x083267D20Dbe6C2b0A83Bd0E601dC2299eD99015",
    [SupportedChainId.MANTLE]: "0xECbd0788bB5a72f9dFDAc1FFeAAF9B7c2B26E456",
    [SupportedChainId.POLYGON]: "0xffE2C25404525D2D4351D75177B92F18D9DaF4Af",
    [SupportedChainId.ARBITRUM]: "0x141269E29a770644C34e05B127AB621511f20109",
  },
};

// Carbon account sources
export const CARBON_ACCOUNT_SOURCES = {
  [SupportedChainId.BASE]: "0x39EcC772f6073242d6FD1646d81FA2D87fe95314",
};

// Subgraph endpoints
export const SUBGRAPH_ENDPOINTS = {
  [SupportedChainId.ARBITRUM]:
    "https://api.goldsky.com/api/public/project_cm0bho0j0ji6001t8e26s0wv8/subgraphs/intentx-arbitrum-analytics-083/0.0.8/gn",
  [SupportedChainId.BASE]:
    "https://api.goldsky.com/api/public/project_cm0bho0j0ji6001t8e26s0wv8/subgraphs/intentx-base-analytics-083/0.1.5/gn",
  [SupportedChainId.MANTLE]:
    "https://api.goldsky.com/api/public/project_cm0bho0j0ji6001t8e26s0wv8/subgraphs/intentx-mantle-analytics-083/0.1.7/gn",
};

// Types for user history data
export interface UserDailyHistoryData {
  id: string;
  user: {
    id: string;
    address: string;
  };
  tradeVolume: string; // Volume in wei format
  generatedFee: string; // Generated fees in wei format
  quotesCount: string;
  accountSource: string;
  timestamp: string;
  chainId?: SupportedChainId;
}

export interface UserTotalHistoryData {
  id: string;
  user: {
    id: string;
    address: string;
  };
  tradeVolume: string; // Volume in wei format
  generatedFee: string; // Generated fees in wei format
  quotesCount: string;
  accountSource: string;
  timestamp: string;
  chainId?: SupportedChainId;
}

// Simplified response types
export interface SimplifiedUserDailyHistory {
  volume: string; // Volume in wei format
  generatedFees: string; // Generated fees in wei format
  quotesCount: string;
  timestamp: string;
  chainId?: SupportedChainId;
}

export interface SimplifiedUserTotalHistory {
  volume: string; // Volume in wei format
  generatedFees: string; // Generated fees in wei format
  quotesCount: string;
  chainId?: SupportedChainId;
}

async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const WAITING_TIME = 300;

/**
 *
 * @param clients Map of clients with SupportedChainId as keys
 * @param query Query that must contain first and skip variables
 * @param vars
 * @returns
 */
export async function queryAllForClients<
  T extends { chainId: SupportedChainId },
>(
  clients: Record<SupportedChainId, HttpGraphQLClient>,
  query: any,
  vars: any,
  rollableField?: string
) {
  const result: T[] = [];

  for (const [chainId, client] of Object.entries(clients)) {
    let skip = 0;
    let hasMore = true;

    let lastRollableField: string = "0";
    while (hasMore) {
      if (skip > 5000) {
        lastRollableField = (result[result.length - 1] as any)["id"];
      }
      const newVariables = { ...vars, first: 1000, skip };

      if (rollableField) {
        newVariables[rollableField] = lastRollableField;
      }

      const data = await client.request(query, {
        ...newVariables,
        fetchPolicy: "no-cache",
      });

      if (!data) {
        throw new Error(`Unable to query data from Client`);
      }

      // Getting the first key from data
      const key = Object.keys(data)[0];
      const queryData = data[key as keyof typeof data] as any;

      if (queryData.length) {
        queryData.forEach((item: any) => {
          item.chainId = chainId;
        });
        result.push(...queryData);
        skip += 1000;
        await wait(WAITING_TIME);
      } else {
        hasMore = false;
      }
    }
  }

  return result;
}

export async function queryForClient<T>(
  client: HttpGraphQLClient,
  query: any,
  vars: any
): Promise<T[]> {
  const data = await client.request(query, {
    ...vars,
    fetchPolicy: "no-cache",
  });

  if (!data) {
    throw new Error(`Unable to query data from Client`);
  }

  // Getting the first key from data
  const key = Object.keys(data)[0];
  const queryData = data[key as keyof typeof data] as T[];

  return queryData;
}

export async function queryForClients<T extends { chainId: SupportedChainId }>(
  clients: Record<SupportedChainId, HttpGraphQLClient>,
  query: any,
  vars: any
) {
  const result: T[] = [];

  for (const [chainId, client] of Object.entries(clients)) {
    const data = await client.request(query, {
      ...vars,
      fetchPolicy: "no-cache",
    });

    if (!data) {
      throw new Error(`Unable to query data from Client`);
    }

    // Getting the first key from data
    const key = Object.keys(data)[0];
    const queryData = data[key as keyof typeof data] as T[];

    queryData.forEach((item: any) => {
      item.chainId = chainId;
    });

    result.push(...queryData);
  }

  return result;
}

export async function queryAllForClient<T>(
  client: HttpGraphQLClient,
  query: any,
  vars: any,
  rollableField?: string
) {
  const result: T[] = [];
  let skip = 0;
  let hasMore = true;

  let lastRollableField: string = "0";
  while (hasMore) {
    if (skip > 5000) {
      lastRollableField = (result[result.length - 1] as any)["id"];
    }
    const newVariables = { ...vars, first: 1000, skip };

    if (rollableField) {
      newVariables[rollableField] = lastRollableField;
    }

    const data = await client.request(query, {
      ...newVariables,
      fetchPolicy: "no-cache",
    });

    if (!data) {
      throw new Error(`Unable to query data from Client`);
    }

    // Getting the first key from data
    const key = Object.keys(data)[0];
    const queryData = data[key as keyof typeof data] as T[];

    if (queryData.length) {
      result.push(...queryData);
      skip += 1000;
      await wait(WAITING_TIME);
    } else {
      hasMore = false;
    }
  }

  return result;
}

// Helper function to create GraphQL clients
export function createGraphQLClients(
  chainIds: SupportedChainId[]
): Record<SupportedChainId, HttpGraphQLClient> {
  const clients: Record<SupportedChainId, HttpGraphQLClient> = {} as any;

  for (const chainId of chainIds) {
    const endpoint = SUBGRAPH_ENDPOINTS[chainId];
    if (endpoint) {
      clients[chainId] = new HttpGraphQLClient(endpoint);
    }
  }

  return clients;
}

// Helper function to simplify user history data
export function simplifyUserDailyHistory(
  data: UserDailyHistoryData[]
): SimplifiedUserDailyHistory[] {
  return data.map((item) => ({
    volume: item.tradeVolume,
    generatedFees: item.generatedFee,
    quotesCount: item.quotesCount,
    timestamp: item.timestamp,
    chainId: item.chainId,
  }));
}

export function simplifyUserTotalHistory(
  data: UserTotalHistoryData[]
): SimplifiedUserTotalHistory[] {
  return data.map((item) => ({
    volume: item.tradeVolume,
    generatedFees: item.generatedFee,
    quotesCount: item.quotesCount,
    chainId: item.chainId,
  }));
}
