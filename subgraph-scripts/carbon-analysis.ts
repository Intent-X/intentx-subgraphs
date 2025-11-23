import { gql } from "graphql-request";
import {
  CARBON_ACCOUNT_SOURCES,
  createGraphQLClients,
  queryAllForClient,
  queryForClient,
  SimplifiedUserDailyHistory,
  SimplifiedUserTotalHistory,
  simplifyUserDailyHistory,
  simplifyUserTotalHistory,
  SupportedChainId,
  UserDailyHistoryData,
  UserTotalHistoryData,
} from "./library";

// GraphQL queries for Carbon analysis

const USER_DAILY_HISTORY_QUERY = gql`
  query GetUserDailyHistory(
    $user: String!
    $accountSource: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    userDailyHistories(
      where: { user: $user, accountSource: $accountSource }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      user {
        id
        address
      }
      tradeVolume
      generatedFee
      quotesCount
      accountSource
      timestamp
    }
  }
`;

const USER_TOTAL_HISTORY_QUERY = gql`
  query GetUserTotalHistory($user: String!, $accountSource: Bytes!) {
    userTotalHistories(where: { user: $user, accountSource: $accountSource }) {
      id
      user {
        id
        address
      }
      tradeVolume
      generatedFee
      quotesCount
      accountSource
      timestamp
    }
  }
`;

const USER_DAILY_HISTORIES_BATCH_QUERY = gql`
  query GetUserDailyHistoriesBatch(
    $accountSource: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    userDailyHistories(
      where: { accountSource: $accountSource }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      user {
        id
        address
      }
      tradeVolume
      generatedFee
      quotesCount
      accountSource
      timestamp
    }
  }
`;

const USER_TOTAL_HISTORIES_BATCH_QUERY = gql`
  query GetUserTotalHistoriesBatch(
    $accountSource: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    userTotalHistories(
      where: { accountSource: $accountSource }
      first: $first
      skip: $skip
    ) {
      id
      user {
        id
        address
      }
      tradeVolume
      generatedFee
      quotesCount
      accountSource
      timestamp
    }
  }
`;

// Carbon analysis functions

/**
 * Get user daily volume and fees for a specific wallet address
 * Returns simplified data with volume and fees in wei format
 * @param walletAddress - The wallet address to query
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 * @param first - Number of records to fetch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getCarbonUserDailyHistory(
  walletAddress: string,
  chainId: SupportedChainId = SupportedChainId.BASE,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryForClient<UserDailyHistoryData>(
    client,
    USER_DAILY_HISTORY_QUERY,
    {
      user: walletAddress.toLowerCase(),
      accountSource: accountSource.toLowerCase(),
      first,
      skip,
    }
  );

  return simplifyUserDailyHistory(data);
}

/**
 * Get user total volume and fees for a specific wallet address
 * Returns simplified data with volume and fees in wei format
 * @param walletAddress - The wallet address to query
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 */
export async function getCarbonUserTotalHistory(
  walletAddress: string,
  chainId: SupportedChainId = SupportedChainId.BASE
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryForClient<UserTotalHistoryData>(
    client,
    USER_TOTAL_HISTORY_QUERY,
    {
      user: walletAddress.toLowerCase(),
      accountSource: accountSource.toLowerCase(),
    }
  );

  return simplifyUserTotalHistory(data);
}

/**
 * Get all user daily histories for Carbon in batch
 * Fetches all records using pagination with first and skip
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 * @param first - Number of records per batch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getCarbonUserDailyHistoriesBatch(
  chainId: SupportedChainId = SupportedChainId.BASE,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryForClient<UserDailyHistoryData>(
    client,
    USER_DAILY_HISTORIES_BATCH_QUERY,
    {
      accountSource: accountSource.toLowerCase(),
      first,
      skip,
    }
  );

  return simplifyUserDailyHistory(data);
}

/**
 * Get all user daily histories for Carbon across all records using pagination
 * Automatically handles pagination to fetch all available records
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 */
export async function getAllCarbonUserDailyHistories(
  chainId: SupportedChainId = SupportedChainId.BASE
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryAllForClient<UserDailyHistoryData>(
    client,
    USER_DAILY_HISTORIES_BATCH_QUERY,
    {
      accountSource: accountSource.toLowerCase(),
    }
  );

  return simplifyUserDailyHistory(data);
}

/**
 * Get all user total histories for Carbon in batch
 * Fetches all records using pagination with first and skip
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 * @param first - Number of records per batch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getCarbonUserTotalHistoriesBatch(
  chainId: SupportedChainId = SupportedChainId.BASE,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryForClient<UserTotalHistoryData>(
    client,
    USER_TOTAL_HISTORIES_BATCH_QUERY,
    {
      accountSource: accountSource.toLowerCase(),
      first,
      skip,
    }
  );

  return simplifyUserTotalHistory(data);
}

/**
 * Get all user total histories for Carbon across all records using pagination
 * Automatically handles pagination to fetch all available records
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 */
export async function getAllCarbonUserTotalHistories(
  chainId: SupportedChainId = SupportedChainId.BASE
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource = CARBON_ACCOUNT_SOURCES[chainId];
  if (!accountSource) {
    throw new Error(`Carbon not supported on chain ${chainId}`);
  }

  const clients = createGraphQLClients([chainId]);
  const client = clients[chainId];

  if (!client) {
    throw new Error(`No GraphQL client available for chain ${chainId}`);
  }

  const data = await queryAllForClient<UserTotalHistoryData>(
    client,
    USER_TOTAL_HISTORIES_BATCH_QUERY,
    {
      accountSource: accountSource.toLowerCase(),
    }
  );

  return simplifyUserTotalHistory(data);
}

/**
 * Get user daily volume and fees for multiple wallet addresses
 * @param walletAddresses - Array of wallet addresses to query
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 * @param first - Number of records per address (default 1000)
 * @param skip - Number of records to skip per address (default 0)
 */
export async function getCarbonMultipleUserDailyHistory(
  walletAddresses: string[],
  chainId: SupportedChainId = SupportedChainId.BASE,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const results: SimplifiedUserDailyHistory[] = [];

  for (const address of walletAddresses) {
    const data = await getCarbonUserDailyHistory(address, chainId, first, skip);
    results.push(...data);
  }

  return results;
}

/**
 * Get user total volume and fees for multiple wallet addresses
 * @param walletAddresses - Array of wallet addresses to query
 * @param chainId - The chain ID to query (defaults to BASE for Carbon)
 */
export async function getCarbonMultipleUserTotalHistory(
  walletAddresses: string[],
  chainId: SupportedChainId = SupportedChainId.BASE
): Promise<SimplifiedUserTotalHistory[]> {
  const results: SimplifiedUserTotalHistory[] = [];

  for (const address of walletAddresses) {
    const data = await getCarbonUserTotalHistory(address, chainId);
    results.push(...data);
  }

  return results;
}
