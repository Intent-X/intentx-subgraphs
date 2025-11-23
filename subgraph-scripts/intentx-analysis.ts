import { gql } from "graphql-request";
import {
  AvailableIntentXThemes,
  createGraphQLClients,
  INTENTX_ACCOUNT_SOURCES,
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

// GraphQL queries for IntentX analysis

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

// IntentX analysis functions

/**
 * Get user daily volume and fees for a specific wallet address
 * Returns simplified data with volume and fees in wei format
 * @param walletAddress - The wallet address to query
 * @param chainId - The chain ID to query
 * @param first - Number of records to fetch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getIntentXUserDailyHistory(
  walletAddress: string,
  chainId: SupportedChainId,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * @param chainId - The chain ID to query
 */
export async function getIntentXUserTotalHistory(
  walletAddress: string,
  chainId: SupportedChainId
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * Get all user daily histories for IntentX in batch
 * Fetches all records using pagination with first and skip
 * @param chainId - The chain ID to query
 * @param first - Number of records per batch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getIntentXUserDailyHistoriesBatch(
  chainId: SupportedChainId,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * Get all user daily histories for IntentX across all records using pagination
 * Automatically handles pagination to fetch all available records
 * @param chainId - The chain ID to query
 */
export async function getAllIntentXUserDailyHistories(
  chainId: SupportedChainId
): Promise<SimplifiedUserDailyHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * Get all user total histories for IntentX in batch
 * Fetches all records using pagination with first and skip
 * @param chainId - The chain ID to query
 * @param first - Number of records per batch (default 1000)
 * @param skip - Number of records to skip (default 0)
 */
export async function getIntentXUserTotalHistoriesBatch(
  chainId: SupportedChainId,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * Get all user total histories for IntentX across all records using pagination
 * Automatically handles pagination to fetch all available records
 * @param chainId - The chain ID to query
 */
export async function getAllIntentXUserTotalHistories(
  chainId: SupportedChainId
): Promise<SimplifiedUserTotalHistory[]> {
  const accountSource =
    INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
  if (!accountSource) {
    throw new Error(`IntentX not supported on chain ${chainId}`);
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
 * @param chainId - The chain ID to query
 * @param first - Number of records per address (default 1000)
 * @param skip - Number of records to skip per address (default 0)
 */
export async function getIntentXMultipleUserDailyHistory(
  walletAddresses: string[],
  chainId: SupportedChainId,
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const results: SimplifiedUserDailyHistory[] = [];

  for (const address of walletAddresses) {
    const data = await getIntentXUserDailyHistory(
      address,
      chainId,
      first,
      skip
    );
    results.push(...data);
  }

  return results;
}

/**
 * Get user total volume and fees for multiple wallet addresses
 * @param walletAddresses - Array of wallet addresses to query
 * @param chainId - The chain ID to query
 */
export async function getIntentXMultipleUserTotalHistory(
  walletAddresses: string[],
  chainId: SupportedChainId
): Promise<SimplifiedUserTotalHistory[]> {
  const results: SimplifiedUserTotalHistory[] = [];

  for (const address of walletAddresses) {
    const data = await getIntentXUserTotalHistory(address, chainId);
    results.push(...data);
  }

  return results;
}

/**
 * Get user daily histories across multiple chains for IntentX
 * @param walletAddress - The wallet address to query
 * @param chainIds - Array of chain IDs to query across
 * @param first - Number of records per chain (default 1000)
 * @param skip - Number of records to skip per chain (default 0)
 */
export async function getIntentXUserDailyHistoryMultiChain(
  walletAddress: string,
  chainIds: SupportedChainId[],
  first: number = 1000,
  skip: number = 0
): Promise<SimplifiedUserDailyHistory[]> {
  const results: SimplifiedUserDailyHistory[] = [];

  for (const chainId of chainIds) {
    try {
      const data = await getIntentXUserDailyHistory(
        walletAddress,
        chainId,
        first,
        skip
      );
      results.push(...data);
    } catch (error) {
      console.warn(
        `Failed to fetch data for chain ${chainId}:`,
        (error as Error).message
      );
    }
  }

  return results;
}

/**
 * Get user total histories across multiple chains for IntentX
 * @param walletAddress - The wallet address to query
 * @param chainIds - Array of chain IDs to query across
 */
export async function getIntentXUserTotalHistoryMultiChain(
  walletAddress: string,
  chainIds: SupportedChainId[]
): Promise<SimplifiedUserTotalHistory[]> {
  const results: SimplifiedUserTotalHistory[] = [];

  for (const chainId of chainIds) {
    try {
      const data = await getIntentXUserTotalHistory(walletAddress, chainId);
      results.push(...data);
    } catch (error) {
      console.warn(
        `Failed to fetch data for chain ${chainId}:`,
        (error as Error).message
      );
    }
  }

  return results;
}

/**
 * Get all user daily histories across multiple chains using the batch query approach
 * @param chainIds - Array of chain IDs to query across
 */
export async function getAllIntentXUserDailyHistoriesMultiChain(
  chainIds: SupportedChainId[]
): Promise<SimplifiedUserDailyHistory[]> {
  const validChainIds = chainIds.filter(
    (chainId) =>
      INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId]
  );

  if (validChainIds.length === 0) {
    throw new Error("No valid IntentX chains provided");
  }

  const clients = createGraphQLClients(validChainIds);
  const results: UserDailyHistoryData[] = [];

  for (const chainId of validChainIds) {
    const accountSource =
      INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
    const client = clients[chainId];

    if (client) {
      try {
        const data = await queryAllForClient<UserDailyHistoryData>(
          client,
          USER_DAILY_HISTORIES_BATCH_QUERY,
          {
            accountSource: accountSource.toLowerCase(),
          }
        );

        // Add chainId to each item
        data.forEach((item) => {
          item.chainId = chainId;
        });

        results.push(...data);
      } catch (error) {
        console.warn(
          `Failed to fetch data for chain ${chainId}:`,
          (error as Error).message
        );
      }
    }
  }

  return simplifyUserDailyHistory(results);
}

/**
 * Get all user total histories across multiple chains using the batch query approach
 * @param chainIds - Array of chain IDs to query across
 */
export async function getAllIntentXUserTotalHistoriesMultiChain(
  chainIds: SupportedChainId[]
): Promise<SimplifiedUserTotalHistory[]> {
  const validChainIds = chainIds.filter(
    (chainId) =>
      INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId]
  );

  if (validChainIds.length === 0) {
    throw new Error("No valid IntentX chains provided");
  }

  const clients = createGraphQLClients(validChainIds);
  const results: UserTotalHistoryData[] = [];

  for (const chainId of validChainIds) {
    const accountSource =
      INTENTX_ACCOUNT_SOURCES[AvailableIntentXThemes.INTENTX][chainId];
    const client = clients[chainId];

    if (client) {
      try {
        const data = await queryAllForClient<UserTotalHistoryData>(
          client,
          USER_TOTAL_HISTORIES_BATCH_QUERY,
          {
            accountSource: accountSource.toLowerCase(),
          }
        );

        // Add chainId to each item
        data.forEach((item) => {
          item.chainId = chainId;
        });

        results.push(...data);
      } catch (error) {
        console.warn(
          `Failed to fetch data for chain ${chainId}:`,
          (error as Error).message
        );
      }
    }
  }

  return simplifyUserTotalHistory(results);
}
