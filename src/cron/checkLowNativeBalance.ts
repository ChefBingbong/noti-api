import { Web3Provider } from "@ethersproject/providers";
import { providers, utils } from "ethers";
import cron from "node-cron";
import { balancesABI } from "../blockchain/abi/balancesABI";
import { getEthersClient } from "../blockchain/client";
import { BALANCES_MULTICALL_CONTRACT } from "../blockchain/constants";
import { redisClient } from "../init";
import { fetchTokenUSDPrice } from "../util/fetchTokenPrice";
import { returnContract } from "../util/getContract";
import { getLogger } from "../util/logger";
import {
  BuilderNames,
  getAllActiveSubscribers,
  getBalanceNotificationBody,
  removePrefix,
  sendPushNotification,
} from "../util/pushUtils";
import CronJob from "./utils/conUtils";
import { chainIdToCoingekoId } from "../util/chains";
import { cronLock } from "./utils/cronLock";

const log = getLogger("balance-check-cronTask");
const job = new CronJob("balance-check-cronTask", process, log);

export const startNativeBalanceCheckJob = (chainId: number) => {
  job.cronJob = cron.schedule("*/2 * * * *", async () => {
    job.log.warn(`balance check cron starting on all chains`);

    await cronLock.addToQueue(`balance-check-cronTask-${chainId}`, chainId, async () => {
      job.log.info(`balance check for ${chainId} chain - started`);

      const subscribers = (await redisClient.getSubscribers()) as string[];
      const formattedSubsribers = removePrefix(subscribers);
      const provider = getEthersClient([5, 97].includes(chainId) ? chainId : 5);
      await checkSubscriberBalances(provider, chainId, formattedSubsribers, subscribers);

      job.log.info(`balance check for ${chainId} chain - finished \n`);
    });
  });
};

const checkSubscriberBalances = async (
  provider: providers.JsonRpcProvider,
  network: number,
  users: string[],
  wcUsers: string[]
): Promise<void> => {
  try {
    const networkName = chainIdToCoingekoId[network];
    const marketPriceOfBalance = await fetchTokenUSDPrice(networkName);

    const subscriberBalances = await getAllUserbalances(users, provider, network);
    if (subscriberBalances.length === 0) return; // means contract failed to initialise

    let usersToNotify: string[] = [];
    for (let subscriberIndex = 0; subscriberIndex < users.length; subscriberIndex++) {
      // check if user has cached balance
      const subscriber = users[subscriberIndex];
      const userBalanceKey = redisClient.getBalanceKey(subscriber, network);
      const { currentBalance, cachedBalance } = await getUserBalance(
        userBalanceKey,
        subscriberBalances,
        subscriberIndex
      );
      const isBalanceBelowThreshold = marketPriceOfBalance * currentBalance < 15;

      // if cache == current no change so continue to next subscriber or if cahed doesnt exist initialise it
      if (currentBalance === cachedBalance) continue;
      if (cachedBalance === null || currentBalance > cachedBalance) {
        await redisClient.setLatestUserBalance(userBalanceKey, currentBalance);
        continue;
      }
      if (currentBalance !== cachedBalance) {
        if (isBalanceBelowThreshold) usersToNotify.push(subscriber);
        // after all update the users balance in the cache for next job cycle
        await redisClient.setLatestUserBalance(userBalanceKey, currentBalance);
      }
    }
    const notificationBody = getBalanceNotificationBody(networkName);
    if (usersToNotify.length > 0) {
      await sendPushNotification(BuilderNames.lowBalanceNotification, [wcUsers, notificationBody, networkName], users);
      job.log.warn(`notifications sent out on chain on ${network}`);
    }
    job.log.warn(`no users to send notifications to on ${network}`);
  } catch (error) {
    console.error("Error fetching Ethereum price:", error);
  }
};

const getAllUserbalances = async (users: string[], provider: providers.JsonRpcProvider, network: number) => {
  const contractAddress = BALANCES_MULTICALL_CONTRACT[[5, 97].includes(network) ? network : 5];
  const balancesContract = returnContract(contractAddress, balancesABI, provider as Web3Provider);
  if (!balancesContract) return [];

  const subscriberBalances = await balancesContract.getBalances(users);
  return subscriberBalances;
};

const getUserBalance = async (
  balanceKey: string,
  allBalances: string[],
  userPosition: number
): Promise<{ currentBalance: number; cachedBalance: number | null }> => {
  const currentSubscriberBalance = Number(utils.formatEther(allBalances[userPosition]));
  const cachedSubscriberBalance = await redisClient.getLatestUserBalance(balanceKey);
  return { currentBalance: currentSubscriberBalance, cachedBalance: cachedSubscriberBalance };
};
