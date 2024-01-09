import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AcceptCancelCloseRequest,
  AcceptCancelRequest,
  ActiveEmergencyMode,
  AddSymbol,
  AllocateForPartyB,
  AllocatePartyA,
  AllocatePartyB,
  ChargeFundingRate,
  DeactiveEmergencyMode,
  DeallocateForPartyB,
  DeallocatePartyA,
  Deposit,
  DiamondCut,
  DisputeForLiquidation,
  EmergencyClosePosition,
  ExpireQuote,
  FillCloseRequest,
  ForceCancelCloseRequest,
  ForceCancelQuote,
  ForceClosePosition,
  FullyLiquidatedPartyB,
  LiquidatePartyA,
  LiquidatePartyB,
  LiquidatePositionsPartyA,
  LiquidatePositionsPartyB,
  LockQuote,
  OpenPosition,
  PauseAccounting,
  PauseGlobal,
  PauseLiquidation,
  PausePartyAActions,
  PausePartyBActions,
  RegisterPartyB,
  RequestToCancelCloseRequest,
  RequestToCancelQuote,
  RequestToClosePosition,
  RoleGranted,
  RoleRevoked,
  SendQuote,
  SetCollateral,
  SetDeallocateCooldown,
  SetFeeCollector,
  SetForceCancelCloseCooldown,
  SetForceCancelCooldown,
  SetForceCloseCooldown,
  SetForceCloseGapRatio,
  SetLiquidationTimeout,
  SetLiquidatorShare,
  SetMuonConfig,
  SetMuonIds,
  SetPartyBEmergencyStatus,
  SetPendingQuotesValidLength,
  SetSuspendedAddress,
  SetSymbolAcceptableValues,
  SetSymbolMaxSlippage,
  SetSymbolTradingFee,
  SetSymbolValidationState,
  SetSymbolsPrices,
  TransferAllocation,
  UnlockQuote,
  UnpauseAccounting,
  UnpauseGlobal,
  UnpauseLiquidation,
  UnpausePartyAActions,
  UnpausePartyBActions,
  Withdraw,
} from "../generated/symmio/symmio";

import {
  Account as AccountModel,
  BalanceChange,
  GrantedRole,
  PaidFundingFee,
  PartyALiquidation,
  PartyALiquidationDisputed,
  PartyBLiquidation,
  PriceCheck,
  Quote as QuoteModel,
  Symbol,
  SymbolFeeChange,
  TradeHistory as TradeHistoryModel,
  User,
} from "./../generated/schema";

import {
  getBalanceInfoOfPartyA,
  getBalanceInfoOfPartyB,
  getLiquidatedStateOfPartyA,
  getQuote,
} from "./contract_utils";
import {
  createNewAccount,
  createNewUser,
  getConfiguration,
  getDailyHistoryForTimestamp,
  getSymbolDailyTradeVolume,
  getSymbolTradeVolume,
  getTotalHistory,
  getUserDailyHistoryForTimestamp,
  getUserSymbolDailyHistoryForTimestamp,
  getUserTotalHistory,
  unDecimal,
  updateActivityTimestamps,
  updateDailyOpenInterest,
} from "./utils";

import { ethereum } from "@graphprotocol/graph-ts/chain/ethereum";

export enum QuoteStatus {
  PENDING,
  LOCKED,
  CANCEL_PENDING,
  CANCELED,
  OPENED,
  CLOSE_PENDING,
  CANCEL_CLOSE_PENDING,
  CLOSED,
  LIQUIDATED,
  EXPIRED,
}

let rolesNames = new Map<string, string>();
rolesNames.set(
  "0x1effbbff9c66c5e59634f24fe842750c60d18891155c32dd155fc2d661a4c86d",
  "DEFAULT_ADMIN_ROLE"
);
rolesNames.set(
  "0xb048589f9ee6ae43a7d6093c04bc48fc93d622d76009b51a2c566fc7cda84ce7",
  "MUON_SETTER_ROLE"
);
rolesNames.set(
  "0xddf732565ddd4d1d3a527786b8b1e425a602b603d457c0a999938869f38049b0",
  "SYMBOL_MANAGER_ROLE"
);
rolesNames.set(
  "0x61c92169ef077349011ff0b1383c894d86c5f0b41d986366b58a6cf31e93beda",
  "SETTER_ROLE"
);
rolesNames.set(
  "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a",
  "PAUSER_ROLE"
);
rolesNames.set(
  "0x427da25fe773164f88948d3e215c94b6554e2ed5e5f203a821c9f2f6131cf75a",
  "UNPAUSER_ROLE"
);
rolesNames.set(
  "0x23288e74cb14deb13fd69e749986e8975f19aa3efb14b2fe5e9b512d772f19b3",
  "PARTY_B_MANAGER_ROLE"
);
rolesNames.set(
  "0x5e17fc5225d4a099df75359ce1f405503ca79498a8dc46a7d583235a0ee45c16",
  "LIQUIDATOR_ROLE"
);
rolesNames.set(
  "0x905e7c6bceabadb31a2ebbb666d0d6df4dfb3156f376c424680851d38988ea84",
  "SUSPENDER_ROLE"
);
rolesNames.set(
  "0xc785f0e55c16138ca0f8448186fa6229be092a3a83db3c5d63c9286723c5a2c4",
  "DISPUTE_ROLE"
);

// //////////////////////////////////// CONTROL ////////////////////////////////////////
export function handleAddSymbol(event: AddSymbol): void {
  let symbol = new Symbol(event.params.id.toString());
  symbol.name = event.params.name;
  symbol.tradingFee = event.params.tradingFee;
  symbol.timestamp = event.block.timestamp;
  symbol.updateTimestamp = event.block.timestamp;
  symbol.save();
}

export function handleSetSymbolTradingFee(event: SetSymbolTradingFee): void {
  let symbol = Symbol.load(event.params.symbolId.toString())!;
  symbol.tradingFee = event.params.tradingFee;
  symbol.updateTimestamp = event.block.timestamp;
  symbol.save();

  // Storing SymbolFeeChange
  let symbolFeeChange = new SymbolFeeChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toHexString()
  );
  symbolFeeChange.symbol = symbol.id;
  symbolFeeChange.timestamp = event.block.timestamp;
  symbolFeeChange.blockNumber = event.block.number;
  symbolFeeChange.transaction = event.transaction.hash;
  symbolFeeChange.tradingFee = event.params.tradingFee;
  symbolFeeChange.save();
}

export function handleRoleGranted(event: RoleGranted): void {
  let gr = new GrantedRole(
    rolesNames.get(event.params.role.toHexString()) +
      "_" +
      event.params.user.toHexString()
  );
  gr.role =
    rolesNames.get(event.params.role.toHexString()) ||
    event.params.role.toHexString();
  gr.user = event.params.user;
  gr.grantTransaction = event.transaction.hash;
  gr.revokeTransaction = null;
  gr.updateTimestamp = event.block.timestamp;
  gr.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  let gr = GrantedRole.load(
    rolesNames.get(event.params.role.toHexString()) +
      "_" +
      event.params.user.toHexString()
  );
  if (gr == null) {
    gr = new GrantedRole(
      rolesNames.get(event.params.role.toHexString()) +
        "_" +
        event.params.user.toHexString()
    );
    gr.role =
      rolesNames.get(event.params.role.toHexString()) ||
      event.params.role.toHexString();
    gr.user = event.params.user;
  }
  gr.updateTimestamp = event.block.timestamp;
  gr.revokeTransaction = event.transaction.hash;
  gr.save();
}

function handleClose(_event: ethereum.Event, name: string): void {
  const event = changetype<FillCloseRequest>(_event); // FillClose, ForceClose, EmergencyClose all have the same event signature
  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.avgClosedPrice = quote.avgClosedPrice
    .times(quote.closedAmount)
    .plus(event.params.filledAmount.times(event.params.closedPrice))
    .div(quote.closedAmount.plus(event.params.filledAmount));
  quote.closedAmount = quote.closedAmount.plus(event.params.filledAmount);
  if (quote.closedAmount.equals(quote.quantity))
    quote.quoteStatus = QuoteStatus.CLOSED;
  quote.updateTimestamp = event.block.timestamp;
  quote.save();
  let history = TradeHistoryModel.load(
    event.params.partyA.toHexString() + "-" + event.params.quoteId.toString()
  )!;
  const additionalVolume = event.params.filledAmount
    .times(event.params.closedPrice)
    .div(BigInt.fromString("10").pow(18));
  history.volume = history.volume.plus(additionalVolume);
  history.updateTimestamp = event.block.timestamp;
  history.quoteStatus = quote.quoteStatus;
  history.quote = event.params.quoteId;
  history.save();

  let priceCheck = new PriceCheck(
    event.transaction.hash.toHexString() + event.transactionLogIndex.toString()
  );
  priceCheck.event = name;
  priceCheck.symbol = Symbol.load(quote.symbolId.toString())!.name;
  priceCheck.givenPrice = event.params.closedPrice;
  priceCheck.timestamp = event.block.timestamp;
  priceCheck.transaction = event.transaction.hash;
  priceCheck.additionalInfo = quote.id;
  priceCheck.save();

  let account = AccountModel.load(event.params.partyA.toHexString())!;

  const symbol = Symbol.load(quote.symbolId.toString());
  if (symbol == null) return;

  let tradingFee = event.params.filledAmount
    .times(quote.openPrice!)
    .times(symbol.tradingFee)
    .div(BigInt.fromString("10").pow(36));

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.tradeVolume = dh.tradeVolume.plus(additionalVolume);
  dh.closeTradeVolume = dh.closeTradeVolume.plus(additionalVolume);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.tradeVolume = udh.tradeVolume.plus(additionalVolume);
  udh.closeTradeVolume = udh.openTradeVolume.plus(additionalVolume);
  udh.generatedFee = udh.generatedFee.plus(tradingFee);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const usdh = getUserSymbolDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user,
    quote.symbolId
  );
  usdh.tradeVolume = usdh.tradeVolume.plus(additionalVolume);
  usdh.closeTradeVolume = usdh.openTradeVolume.plus(additionalVolume);
  usdh.generatedFee = usdh.generatedFee.plus(tradingFee);
  usdh.updateTimestamp = event.block.timestamp;
  usdh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.tradeVolume = th.tradeVolume.plus(additionalVolume);
  th.closeTradeVolume = th.closeTradeVolume.plus(additionalVolume);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.tradeVolume = uth.tradeVolume.plus(additionalVolume);
  uth.closeTradeVolume = uth.openTradeVolume.plus(additionalVolume);
  uth.generatedFee = uth.generatedFee.plus(tradingFee);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();

  let stv = getSymbolTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  stv.volume = stv.volume.plus(additionalVolume);
  stv.updateTimestamp = event.block.timestamp;
  stv.save();

  let dsv = getSymbolDailyTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  dsv.volume = dsv.volume.plus(additionalVolume);
  dsv.updateTimestamp = event.block.timestamp;
  dsv.save();

  updateDailyOpenInterest(
    quote.symbolId,
    event.block.timestamp,
    unDecimal(event.params.filledAmount.times(quote.openPrice!)),
    false,
    account.accountSource
  );
}

export function handleAllocatePartyA(event: AllocatePartyA): void {
  let account = AccountModel.load(event.params.user.toHexString())!;
  account.allocated = account.allocated.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();

  updateActivityTimestamps(account, event.block.timestamp);

  let allocate = new BalanceChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toHexString()
  );
  allocate.type = "ALLOCATE_PARTY_A";
  allocate.timestamp = event.block.timestamp;
  allocate.blockNumber = event.block.number;
  allocate.transaction = event.transaction.hash;
  allocate.amount = event.params.amount;
  allocate.account = account.id;
  allocate.collateral = getConfiguration(event).collateral;
  allocate.save();

  let user = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.user,
      account.accountSource,
      event.block,
      event.transaction
    );
  }
  user.allocated = user.allocated.plus(event.params.amount);
  user.save();

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.allocate = dh.allocate.plus(allocate.amount);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.allocate = udh.allocate.plus(allocate.amount);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.allocate = th.allocate.plus(allocate.amount);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.allocate = uth.allocate.plus(allocate.amount);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();
}

export function handleDeallocatePartyA(event: DeallocatePartyA): void {
  let account = AccountModel.load(event.params.user.toHexString());
  if (account == null) return;
  account.deallocated = account.deallocated.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();
  updateActivityTimestamps(account, event.block.timestamp);
  let deallocate = new BalanceChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toHexString()
  );
  deallocate.type = "DEALLOCATE_PARTY_A";
  deallocate.timestamp = event.block.timestamp;
  deallocate.blockNumber = event.block.number;
  deallocate.transaction = event.transaction.hash;
  deallocate.amount = event.params.amount;
  deallocate.account = account.id;
  deallocate.collateral = getConfiguration(event).collateral;
  deallocate.save();

  let user = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.user,
      account.accountSource,
      event.block,
      event.transaction
    );
  }
  user.deallocated = user.deallocated.plus(event.params.amount);
  user.save();

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.deallocate = dh.deallocate.plus(deallocate.amount);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.deallocate = udh.deallocate.plus(deallocate.amount);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.deallocate = th.deallocate.plus(deallocate.amount);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.deallocate = uth.deallocate.plus(deallocate.amount);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();
}

export function handleDeposit(event: Deposit): void {
  let account = AccountModel.load(event.params.user.toHexString());
  if (account == null) {
    let user = createNewUser(
      event.params.user,
      null,
      event.block,
      event.transaction
    );
    account = createNewAccount(
      event.params.user.toHexString(),
      user,
      null,
      event.block,
      event.transaction
    );
  }
  account.deposit = account.deposit.plus(event.params.amount);
  account.save();
  updateActivityTimestamps(account, event.block.timestamp);
  let deposit = new BalanceChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toHexString()
  );
  deposit.type = "DEPOSIT";
  deposit.timestamp = event.block.timestamp;
  deposit.blockNumber = event.block.number;
  deposit.transaction = event.transaction.hash;
  deposit.amount = event.params.amount;
  deposit.account = account.id;
  deposit.collateral = getConfiguration(event).collateral;
  deposit.save();

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.deposit = dh.deposit.plus(deposit.amount);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.deposit = udh.deposit.plus(deposit.amount);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.deposit = th.deposit.plus(deposit.amount);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.deposit = uth.deposit.plus(deposit.amount);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();
}

export function handleWithdraw(event: Withdraw): void {
  let account = AccountModel.load(event.params.sender.toHexString());
  if (account == null) {
    let user = createNewUser(
      event.params.sender,
      null,
      event.block,
      event.transaction
    );
    account = createNewAccount(
      event.params.sender.toHexString(),
      user,
      null,
      event.block,
      event.transaction
    );
  }
  account.withdraw = account.withdraw.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();
  updateActivityTimestamps(account, event.block.timestamp);
  let withdraw = new BalanceChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toHexString()
  );
  withdraw.type = "WITHDRAW";
  withdraw.timestamp = event.block.timestamp;
  withdraw.blockNumber = event.block.number;
  withdraw.transaction = event.transaction.hash;
  withdraw.amount = event.params.amount;
  withdraw.account = account.id;
  withdraw.collateral = getConfiguration(event).collateral;
  withdraw.save();

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.withdraw = dh.withdraw.plus(withdraw.amount);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.withdraw = udh.withdraw.plus(withdraw.amount);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.withdraw = th.withdraw.plus(withdraw.amount);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.withdraw = uth.withdraw.plus(withdraw.amount);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();
}

export function handleAllocateForPartyB(event: AllocateForPartyB): void {
  let account = AccountModel.load(event.params.partyB.toHexString())!;
  account.allocated = account.allocated.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();

  let user: User | null = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.partyB,
      account.accountSource,
      event.block,
      event.transaction
    );
  }

  user.allocated = user.allocated.plus(event.params.amount);
  user.lastActivityTimestamp = event.block.timestamp;
  user.save();
}

export function handleAllocatePartyB(event: AllocatePartyB): void {
  let account = AccountModel.load(event.params.partyB.toHexString())!;
  account.allocated = account.allocated.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();

  let user: User | null = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.partyB,
      account.accountSource,
      event.block,
      event.transaction
    );
  }

  user.allocated = user.allocated.plus(event.params.amount);
  user.lastActivityTimestamp = event.block.timestamp;
  user.save();
}

export function handleDeallocateForPartyB(event: DeallocateForPartyB): void {
  let account = AccountModel.load(event.params.partyB.toHexString())!;
  account.deallocated = account.deallocated.plus(event.params.amount);
  account.updateTimestamp = event.block.timestamp;
  account.save();

  let user: User | null = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.partyB,
      account.accountSource,
      event.block,
      event.transaction
    );
  }

  user.deallocated = user.deallocated.plus(event.params.amount);
  user.lastActivityTimestamp = event.block.timestamp;
  user.save();
}

export function handleSendQuote(event: SendQuote): void {
  let account = AccountModel.load(event.params.partyA.toHexString())!;
  account.quotesCount = account.quotesCount.plus(BigInt.fromString("1"));
  account.save();
  updateActivityTimestamps(account, event.block.timestamp);
  let user = User.load(account.user);
  if (!user) {
    user = createNewUser(
      event.params.partyA,
      account.accountSource,
      event.block,
      event.transaction
    );
  }
  let quote = new QuoteModel(event.params.quoteId.toString());
  quote.user = user.id;
  quote.timestamp = event.block.timestamp;
  quote.updateTimestamp = event.block.timestamp;
  quote.blockNumber = event.block.number;
  quote.transaction = event.transaction.hash;
  if (event.params.partyBsWhiteList) {
    let partyBsWhiteList: Bytes[] = [];
    for (let i = 0, len = event.params.partyBsWhiteList.length; i < len; i++)
      partyBsWhiteList.push(event.params.partyBsWhiteList[i]);
    quote.partyBsWhiteList = partyBsWhiteList;
  }
  quote.symbolId = event.params.symbolId;
  let symbol = Symbol.load(event.params.symbolId.toString());

  quote.symbol = symbol!.id;
  quote.positionType = event.params.positionType;
  quote.orderType = event.params.orderType;
  quote.price = event.params.price;
  quote.marketPrice = event.params.marketPrice;
  quote.deadline = event.params.deadline;
  quote.quantity = event.params.quantity;
  quote.cva = event.params.cva;
  quote.partyAmm = event.params.partyAmm;
  quote.partyBmm = event.params.partyBmm;
  quote.lf = event.params.lf;
  quote.quoteStatus = QuoteStatus.PENDING;
  quote.account = account.id;
  quote.closedAmount = BigInt.fromString("0");
  quote.avgClosedPrice = BigInt.fromString("0");
  quote.collateral = getConfiguration(event).collateral;
  quote.accountSource = account.accountSource;
  quote.save();

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.quotesCount = dh.quotesCount.plus(BigInt.fromString("1"));
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.quotesCount = udh.quotesCount.plus(BigInt.fromString("1"));
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const usdh = getUserSymbolDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user,
    quote.symbolId
  );
  usdh.quotesCount = usdh.quotesCount.plus(BigInt.fromString("1"));
  usdh.updateTimestamp = event.block.timestamp;
  usdh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.quotesCount = th.quotesCount.plus(BigInt.fromString("1"));
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.quotesCount = uth.quotesCount.plus(BigInt.fromString("1"));
  uth.updateTimestamp = event.block.timestamp;
  uth.save();
}

export function handleExpireQuote(event: ExpireQuote): void {
  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.quoteStatus = event.params.quoteStatus;
  quote.updateTimestamp = event.block.timestamp;
  quote.save();
}

export function handleRequestToCancelQuote(event: RequestToCancelQuote): void {
  let account = AccountModel.load(event.params.partyA.toHexString())!;
  updateActivityTimestamps(account, event.block.timestamp);
}

export function handleSetSymbolsPrices(event: SetSymbolsPrices): void {
  const liquidationDetail = getLiquidatedStateOfPartyA(
    event.address,
    event.params.partyA
  );
  const balanceInfoOfPartyA = getBalanceInfoOfPartyA(
    event.address,
    event.params.partyA
  );
  if (liquidationDetail == null || balanceInfoOfPartyA == null) return;
  let model = new PartyALiquidation(
    event.transaction.hash.toHexString() + event.transactionLogIndex.toString()
  );

  model.partyA = event.params.partyA;
  model.liquidator = event.params.liquidator;
  model.liquidationType = liquidationDetail.liquidationType;
  model.timestamp = event.block.timestamp;
  model.transaction = event.transaction.hash;

  model.liquidateAllocatedBalance = balanceInfoOfPartyA.value0;
  model.liquidateCva = balanceInfoOfPartyA.value1;
  model.liquidateLf = balanceInfoOfPartyA.value2;
  model.liquidatePendingCva = balanceInfoOfPartyA.value5;
  model.liquidatePendingLf = balanceInfoOfPartyA.value6;

  model.save();
}

export function handleForceCancelCloseRequest(
  event: ForceCancelCloseRequest
): void {}

export function handleForceCancelQuote(event: ForceCancelQuote): void {}

export function handleRequestToClosePosition(
  event: RequestToClosePosition
): void {
  let account = AccountModel.load(event.params.partyA.toHexString())!;
  updateActivityTimestamps(account, event.block.timestamp);

  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.quoteStatus = QuoteStatus.CLOSE_PENDING;
  quote.updateTimestamp = event.block.timestamp;
  quote.save();
}

export function handleAcceptCancelRequest(event: AcceptCancelRequest): void {
  let quote = QuoteModel.load(event.params.quoteId.toString());
  if (quote == null) return;
  quote.quoteStatus = QuoteStatus.CANCELED;
  quote.updateTimestamp = event.block.timestamp;
  quote.save();
}

export function handleRequestToCancelCloseRequest(
  event: RequestToCancelCloseRequest
): void {
  let account = AccountModel.load(event.params.partyA.toHexString())!;
  updateActivityTimestamps(account, event.block.timestamp);
}

export function handleAcceptCancelCloseRequest(
  event: AcceptCancelCloseRequest
): void {
  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.quoteStatus = QuoteStatus.OPENED;
  quote.save();
}

export function handleLockQuote(event: LockQuote): void {
  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.updateTimestamp = event.block.timestamp;
  quote.partyB = event.params.partyB;
  quote.quoteStatus = QuoteStatus.LOCKED;
  quote.save();
}

export function handleUnlockQuote(event: UnlockQuote): void {
  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  quote.updateTimestamp = event.block.timestamp;
  quote.partyB = null;
  quote.quoteStatus = QuoteStatus.PENDING;
  quote.save();
}

export function handleOpenPosition(event: OpenPosition): void {
  let account = AccountModel.load(event.params.partyA.toHexString())!;
  account.positionsCount = account.positionsCount.plus(BigInt.fromString("1"));
  account.updateTimestamp = event.block.timestamp;
  account.save();
  let history = new TradeHistoryModel(
    account.id + "-" + event.params.quoteId.toString()
  );
  history.account = account.id;
  history.timestamp = event.block.timestamp;
  history.blockNumber = event.block.number;
  history.transaction = event.transaction.hash;
  history.volume = unDecimal(
    event.params.filledAmount.times(event.params.openedPrice)
  );
  history.quoteStatus = QuoteStatus.OPENED;
  history.quote = event.params.quoteId;
  history.updateTimestamp = event.block.timestamp;
  history.save();

  let quote = QuoteModel.load(event.params.quoteId.toString())!;
  const chainQuote = getQuote(event.address, BigInt.fromString(quote.id))!;
  quote.openPrice = event.params.openedPrice;
  quote.openPriceFundingRate = event.params.openedPrice;
  quote.paidFundingRate = BigInt.fromString("0");
  quote.cva = chainQuote.lockedValues.cva;
  quote.lf = chainQuote.lockedValues.lf;
  quote.partyAmm = chainQuote.lockedValues.partyAmm;
  quote.partyBmm = chainQuote.lockedValues.partyBmm;
  quote.quantity = event.params.filledAmount;
  quote.updateTimestamp = event.block.timestamp;
  quote.quoteStatus = QuoteStatus.OPENED;
  quote.save();

  let priceCheck = new PriceCheck(
    event.transaction.hash.toHexString() + event.transactionLogIndex.toString()
  );
  priceCheck.event = "OpenPosition";
  priceCheck.symbol = Symbol.load(quote.symbolId.toString())!.name;
  priceCheck.givenPrice = event.params.openedPrice;
  priceCheck.timestamp = event.block.timestamp;
  priceCheck.transaction = event.transaction.hash;
  priceCheck.additionalInfo = quote.id;
  priceCheck.save();

  const symbol = Symbol.load(quote.symbolId.toString());

  if (symbol == null) return;

  let tradingFee = event.params.filledAmount
    .times(quote.openPrice!)
    .times(symbol.tradingFee)
    .div(BigInt.fromString("10").pow(36));

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.tradeVolume = dh.tradeVolume.plus(history.volume);
  dh.openTradeVolume = dh.openTradeVolume.plus(history.volume);
  dh.platformFee = dh.platformFee.plus(tradingFee);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.tradeVolume = udh.tradeVolume.plus(history.volume);
  udh.openTradeVolume = udh.openTradeVolume.plus(history.volume);
  udh.generatedFee = udh.generatedFee.plus(tradingFee);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const usdh = getUserSymbolDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user,
    quote.symbolId
  );
  usdh.tradeVolume = usdh.tradeVolume.plus(history.volume);
  usdh.openTradeVolume = usdh.openTradeVolume.plus(history.volume);
  usdh.generatedFee = usdh.generatedFee.plus(tradingFee);
  usdh.updateTimestamp = event.block.timestamp;
  usdh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.tradeVolume = th.tradeVolume.plus(history.volume);
  th.openTradeVolume = th.openTradeVolume.plus(history.volume);
  th.platformFee = th.platformFee.plus(tradingFee);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.tradeVolume = uth.tradeVolume.plus(history.volume);
  uth.openTradeVolume = uth.openTradeVolume.plus(history.volume);
  uth.generatedFee = uth.generatedFee.plus(tradingFee);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();

  let stv = getSymbolTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  stv.volume = stv.volume.plus(history.volume);
  stv.updateTimestamp = event.block.timestamp;
  stv.save();

  let dsv = getSymbolDailyTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  dsv.volume = dsv.volume.plus(history.volume);
  dsv.updateTimestamp = event.block.timestamp;
  dsv.save();

  updateDailyOpenInterest(
    quote.symbolId,
    event.block.timestamp,
    history.volume,
    true,
    account.accountSource
  );
}

export function handleFillCloseRequest(event: FillCloseRequest): void {
  handleClose(event, "FillCloseRequest");
}

export function handleEmergencyClosePosition(
  event: EmergencyClosePosition
): void {
  handleClose(event, "EmergencyClosePosition");
}

export function handleForceClosePosition(event: ForceClosePosition): void {
  handleClose(event, "ForceClosePosition");
}

export function handleDiamondCut(event: DiamondCut): void {}

export function handleTransferAllocation(event: TransferAllocation): void {}

export function handleActiveEmergencyMode(event: ActiveEmergencyMode): void {}

export function handleDeactiveEmergencyMode(
  event: DeactiveEmergencyMode
): void {}

export function handlePauseAccounting(event: PauseAccounting): void {}

export function handlePauseGlobal(event: PauseGlobal): void {}

export function handlePauseLiquidation(event: PauseLiquidation): void {}

export function handlePausePartyAActions(event: PausePartyAActions): void {}

export function handlePausePartyBActions(event: PausePartyBActions): void {}

export function handleRegisterPartyB(event: RegisterPartyB): void {}

export function handleSetCollateral(event: SetCollateral): void {
  let configuration = getConfiguration(event);
  configuration.collateral = event.params.collateral;
  configuration.save();
}

export function handleSetDeallocateCooldown(
  event: SetDeallocateCooldown
): void {}

export function handleSetFeeCollector(event: SetFeeCollector): void {}

export function handleSetForceCancelCloseCooldown(
  event: SetForceCancelCloseCooldown
): void {}

export function handleSetForceCancelCooldown(
  event: SetForceCancelCooldown
): void {}

export function handleSetForceCloseCooldown(
  event: SetForceCloseCooldown
): void {}

export function handleSetForceCloseGapRatio(
  event: SetForceCloseGapRatio
): void {}

export function handleSetLiquidationTimeout(
  event: SetLiquidationTimeout
): void {}

export function handleSetLiquidatorShare(event: SetLiquidatorShare): void {}

export function handleSetMuonConfig(event: SetMuonConfig): void {}

export function handleSetMuonIds(event: SetMuonIds): void {}

export function handleSetPartyBEmergencyStatus(
  event: SetPartyBEmergencyStatus
): void {}

export function handleSetPendingQuotesValidLength(
  event: SetPendingQuotesValidLength
): void {}

export function handleSetSuspendedAddress(event: SetSuspendedAddress): void {}

export function handleSetSymbolAcceptableValues(
  event: SetSymbolAcceptableValues
): void {}

export function handleSetSymbolMaxSlippage(event: SetSymbolMaxSlippage): void {}

export function handleSetSymbolValidationState(
  event: SetSymbolValidationState
): void {}

export function handleUnpauseAccounting(event: UnpauseAccounting): void {}

export function handleUnpauseGlobal(event: UnpauseGlobal): void {}

export function handleUnpauseLiquidation(event: UnpauseLiquidation): void {}

export function handleUnpausePartyAActions(event: UnpausePartyAActions): void {}

export function handleUnpausePartyBActions(event: UnpausePartyBActions): void {}

export function handleFullyLiquidatedPartyB(
  event: FullyLiquidatedPartyB
): void {}

export function handleLiquidatePartyA(event: LiquidatePartyA): void {}

export function handleLiquidatePartyB(event: LiquidatePartyB): void {
  const balanceInfoOfPartyB = getBalanceInfoOfPartyB(
    event.address,
    event.params.partyA,
    event.params.partyB
  );
  if (balanceInfoOfPartyB == null) return;
  let model = new PartyBLiquidation(
    event.transaction.hash.toHexString() + event.transactionLogIndex.toString()
  );

  model.partyA = event.params.partyA;
  model.partyB = event.params.partyB;
  model.liquidator = event.params.liquidator;
  model.timestamp = event.block.timestamp;
  model.transaction = event.transaction.hash;

  model.liquidateAllocatedBalance = balanceInfoOfPartyB.value0;
  model.liquidateCva = balanceInfoOfPartyB.value1;
  model.liquidateLf = balanceInfoOfPartyB.value2;
  model.liquidatePendingCva = balanceInfoOfPartyB.value5;
  model.liquidatePendingLf = balanceInfoOfPartyB.value6;

  model.save();
}

export function handleLiquidatePositionsPartyA(
  event: LiquidatePositionsPartyA
): void {
  for (let i = 0; i < event.params.quoteIds.length; i++) {
    const qId = event.params.quoteIds[i];
    handleLiquidatePosition(event, qId);
  }
}

export function handleLiquidatePositionsPartyB(
  event: LiquidatePositionsPartyB
): void {
  for (let i = 0; i < event.params.quoteIds.length; i++) {
    const qId = event.params.quoteIds[i];
    handleLiquidatePosition(event, qId);
  }
}

function handleLiquidatePosition(_event: ethereum.Event, qId: BigInt): void {
  const event = changetype<LiquidatePositionsPartyA>(_event);
  let history = TradeHistoryModel.load(
    event.params.partyA.toHexString() + "-" + qId.toString()
  )!;
  const quote = QuoteModel.load(qId.toString())!;
  quote.quoteStatus = QuoteStatus.LIQUIDATED;
  quote.updateTimestamp = event.block.timestamp;
  quote.liquidatedSide = 1;
  quote.save();
  const chainQuote = getQuote(event.address, qId);
  if (chainQuote == null) return;
  const liquidAmount = quote.quantity.minus(quote.closedAmount);
  const liquidPrice = chainQuote.avgClosedPrice
    .times(quote.quantity)
    .minus(quote.avgClosedPrice.times(quote.closedAmount))
    .div(liquidAmount);
  const additionalVolume = liquidAmount
    .times(liquidPrice)
    .div(BigInt.fromString("10").pow(18));
  history.volume = history.volume.plus(additionalVolume);
  history.quoteStatus = QuoteStatus.LIQUIDATED;
  history.updateTimestamp = event.block.timestamp;
  history.quote = qId;
  history.save();

  quote.avgClosedPrice = chainQuote.avgClosedPrice;
  quote.save();
  let account = AccountModel.load(quote.account)!;

  const dh = getDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource
  );
  dh.tradeVolume = dh.tradeVolume.plus(additionalVolume);
  dh.closeTradeVolume = dh.closeTradeVolume.plus(additionalVolume);
  dh.updateTimestamp = event.block.timestamp;
  dh.save();

  const udh = getUserDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  udh.tradeVolume = udh.tradeVolume.plus(additionalVolume);
  udh.closeTradeVolume = udh.closeTradeVolume.plus(additionalVolume);
  udh.updateTimestamp = event.block.timestamp;
  udh.save();

  const usdh = getUserSymbolDailyHistoryForTimestamp(
    event.block.timestamp,
    account.accountSource,
    account.user,
    quote.symbolId
  );
  usdh.tradeVolume = usdh.tradeVolume.plus(additionalVolume);
  usdh.closeTradeVolume = usdh.closeTradeVolume.plus(additionalVolume);
  usdh.updateTimestamp = event.block.timestamp;
  usdh.save();

  const th = getTotalHistory(event.block.timestamp, account.accountSource);
  th.tradeVolume = th.tradeVolume.plus(additionalVolume);
  th.closeTradeVolume = th.closeTradeVolume.plus(additionalVolume);
  th.updateTimestamp = event.block.timestamp;
  th.save();

  const uth = getUserTotalHistory(
    event.block.timestamp,
    account.accountSource,
    account.user
  );
  uth.tradeVolume = uth.tradeVolume.plus(additionalVolume);
  uth.closeTradeVolume = uth.closeTradeVolume.plus(additionalVolume);
  uth.updateTimestamp = event.block.timestamp;
  uth.save();

  let stv = getSymbolTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  stv.volume = stv.volume.plus(additionalVolume);
  stv.updateTimestamp = event.block.timestamp;
  stv.save();

  let sdv = getSymbolDailyTradeVolume(
    quote.symbolId,
    event.block.timestamp,
    account.accountSource
  );
  sdv.volume = sdv.volume.plus(additionalVolume);
  sdv.updateTimestamp = event.block.timestamp;
  sdv.save();

  updateDailyOpenInterest(
    quote.symbolId,
    event.block.timestamp,
    unDecimal(liquidAmount.times(quote.openPrice!)),
    false,
    account.accountSource
  );
}

export function handleLiquidationDisputed(event: DisputeForLiquidation): void {
  let model = new PartyALiquidationDisputed(
    event.transaction.hash.toHexString() + event.transactionLogIndex.toString()
  );
  model.partyA = event.params.partyA;
  model.timestamp = event.block.timestamp;
  model.transaction = event.transaction.hash;
  model.save();
}

// let lastActionTimestamp: BigInt = BigInt.zero();

// export function handleBlockWithCall(block: ethereum.Block): void {
//   const blockTimestamp = block.timestamp;
//   if (blockTimestamp.minus(lastActionTimestamp).gt(BigInt.fromI32(600))) {
//     let oi = getOpenInterest(block.timestamp);
//     let dh = getDailyHistoryForTimestamp(blockTimestamp);
//     if (isSameDay(blockTimestamp, oi.timestamp)) {
//       oi.count = oi.count.plus(BigInt.fromString("1"));
//       oi.accumulatedAmount = oi.accumulatedAmount.plus(oi.amount);
//       dh.openInterest = oi.accumulatedAmount.div(oi.count);
//     } else {
//       dh.openInterest = oi.amount;
//       oi.count = BigInt.fromString("1");
//       oi.accumulatedAmount = oi.amount;
//     }
//     oi.save();
//     dh.save();
//     lastActionTimestamp = blockTimestamp;
//   }
// }

const FACTOR: BigInt = BigInt.fromString(`1000000000000000000`);
export function handleChargeFundingRate(event: ChargeFundingRate): void {
  const quoteIds = event.params.quoteIds;
  const rates = event.params.rates;

  for (let i = 0; i < quoteIds.length; i++) {
    const qId = quoteIds[i];
    const quote = QuoteModel.load(qId.toString())!;
    const user = User.load(quote.user)!;
    const accountAddress = quote.account;
    const accountId = accountAddress;

    const rate = rates[i];
    let newPrice: BigInt;
    if (quote.positionType === 0) {
      //Long
      newPrice = quote.openPriceFundingRate.plus(
        quote.openPriceFundingRate.times(rate).div(FACTOR)
      );
    } else {
      newPrice = quote.openPriceFundingRate.minus(
        quote.openPriceFundingRate.times(rate).div(FACTOR)
      );
    }

    const openQuantityUntilNow = quote.quantity.minus(quote.closedAmount);
    let paidFee: BigInt;
    paidFee = quote.openPriceFundingRate
      .times(rate)
      .times(openQuantityUntilNow)
      .div(FACTOR)
      .div(FACTOR);

    quote.paidFundingRate = quote.paidFundingRate.plus(paidFee);
    quote.openPriceFundingRate = newPrice;
    quote.save();

    // Creating a new paid funding rate
    let paidFundingRate = new PaidFundingFee(
      event.transaction.hash.toHexString() + "_" + qId.toString()
    );
    paidFundingRate.quote = qId.toString();
    paidFundingRate.account = accountId;
    paidFundingRate.timestamp = event.block.timestamp;
    paidFundingRate.transaction = event.transaction.hash;
    paidFundingRate.rateApplied = rate;
    paidFundingRate.user = quote.user;
    paidFundingRate.save();
  }
}
