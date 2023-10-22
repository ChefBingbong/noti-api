import cron from "node-cron";
import { redisClient } from "../init";
import { fetchTokenUSDPrice } from "../util/fetchTokenPrice";
import { getLogger } from "../util/logger";
import { BuilderNames, getAllActiveSubscribers, removePrefix, sendPushNotification } from "../util/pushUtils";
import { timeElapsed } from "../util/timeCalculator";
import CronJob from "./utils/conUtils";
import { chainIdToCoingekoId } from "../util/chains";
import { cronLock } from "./utils/cronLock";

const log = getLogger("token-price-check-cronTask");
const job = new CronJob("token-price-check-cronTask", process, log);

export const startPriceCheckJob = (chainId: number) => {
  job.cronJob = cron.schedule("*/3 * * * *", async () => {
    job.log.warn(`token price check cron starting on all chains`);

    await cronLock.addToQueue(`token-price-check-cron-${chainId}`, chainId, async () => {
      job.log.info(`token price check for ${chainId} chain - started`);

      const coinId = chainIdToCoingekoId[chainId];
      const subscribers = (await redisClient.getSubscribers()) as string[];
      await fetchPriceJob(coinId, subscribers, chainId);

      job.log.info(`token price check for ${chainId} chain - finished \n`);
    });
  });
};

const fetchPriceJob = async (token: string, users: string[], network: number) => {
  try {
    const tokenPrices = await redisClient.getMultipleTokenPrices()
    if (!tokenPrices || !tokenPrices[token]) return
    const currentPrice = tokenPrices[token];
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);

    const { lastNotifiedTime, lastPrice } = await getPriceJobCachevalues(token, network);
    const { percentageIncrease, isPositive } = isPriceIncrease(lastPrice, currentPrice);

    // console.log(timeSinceLastNotify)
    if (lastPrice === null || lastNotifiedTime === null) {
      job.log.warn(`first time running ${job.jobName} on ${network}`);
      updatePriceJobRedisCache(token, currentPrice, currentTimestamp);
      return;
    }
    const { inDays: timeSinceLastNotify } = timeElapsed(lastNotifiedTime.toString());
    if (!isPositive || timeSinceLastNotify > 2) return;

    await sendPushNotification(
      BuilderNames.tokenPriceMovementNotification,
      [users, token, isPositive, percentageIncrease, currentPrice, lastPrice],
      removePrefix(users)
    );
    updatePriceJobRedisCache(token, currentPrice, currentTimestamp);

    job.log.warn(`sent out notifications for ${job.jobName} on ${network}`);
  } catch (error) {
    console.error("Error fetching Ethereum price:", error);
  }
};

const updatePriceJobRedisCache = (token: string, price: number, network: number): void => {
  const timestampKey = redisClient.getUserTimestampKey(network, job.jobName, token)
  const latestPriceKey = redisClient.getPriceKey(token, network)
  redisClient.setUserTimestamp([timestampKey]);
  redisClient.setLastNativeTokenPrice(latestPriceKey, price.toString());
};

const getPriceJobCachevalues = async (
  token: string,
  network: number
): Promise<{ lastNotifiedTime: number | null; lastPrice: number | null }> => {
  const timestampKey = redisClient.getUserTimestampKey(network, job.jobName, token)
  const latestPriceKey = redisClient.getPriceKey(token, network)
  const lastNotifiedTime = await redisClient.getUserTimestamp(timestampKey);
  const lastPrice = await redisClient.getLastNativeTokenPrice(latestPriceKey);
  return { lastNotifiedTime, lastPrice };
};

const isPriceIncrease = (lastPrice: any, currentPrice: any) => {
  const priceDifference = currentPrice - lastPrice;
  const percentageIncrease = (priceDifference / lastPrice) * 100;
  return {
    percentageIncrease: percentageIncrease.toFixed(4),
    isPositive: Math.abs(percentageIncrease) >= 0.001,
  };
};
