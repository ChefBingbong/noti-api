import BigNumber from "bignumber.js";
import cron from "node-cron";
import { getEthersClient, getViemClient } from "../blockchain/client";
import { CHAIN_ID_TO_CHAIN_NAME, priceHelperTokens } from "../graph/farms/common";
import { farmsV3ConfigChainMap } from "../graph/farms/constants";
import { createFarmFetcherV3 } from "../graph/farms/farmFetcher";
import { fetchCommonTokenUSDValue } from "../graph/farms/fetchV3Farms";
import { ComputedFarmConfigV3, FarmV3DataWithPrice, TvlMap } from "../graph/farms/types";
import { getCakePriceFromOracle } from "../graph/lotteryPositions/getUserTicketInfo";
import { redisClient } from "../init";
import fetchWithTimeout from "../util/fetchWithTimeout";
import { getLogger } from "../util/logger";
import CronJob from "./utils/conUtils";
import { cronLock } from "./utils/cronLock";
import { BuilderNames, getFarmAPRNotificationBody, removePrefix, sendPushNotification } from "../util/pushUtils";

const log = getLogger("farms-apr-cronTask");
const job = new CronJob("farms-apr-cronTask", process, log);
const farmFetcherV3 = createFarmFetcherV3(getViemClient);

export const starFarmAprCheckJob = (chainId: number) => {
  job.cronJob = cron.schedule("*/30 * * * *", async () => {
    job.log.warn(`farms apr cron starting on all chains`);

    await cronLock.addToQueue(`balance-check-cronTask-${chainId}`, chainId, async () => {
      job.log.info(`farms apr for ${chainId} chain - started`);

      const farmsV3 = farmsV3ConfigChainMap[chainId];
      const subscribers = (await redisClient.getSubscribers()) as string[];
      await checkForFarmAprChange(chainId, farmsV3, subscribers);

      job.log.info(`farms apr for ${chainId} chain - finished \n`);
    });
  });
};

const checkForFarmAprChange = async (
  chainId: number,
  farmsConfig: ComputedFarmConfigV3[],
  users: string[]
): Promise<void> => {
  try {
    const commonPrice = await fetchCommonTokenUSDValue(priceHelperTokens[chainId]);
    const farms = await farmFetcherV3.fetchFarms({ chainId, farms: farmsConfig, commonPrice });
    const tvls: TvlMap = {};

    const farmResultsWithPrice = await Promise.allSettled(
      farms.farmsWithPrice.map((f) =>
        fetchWithTimeout(`https://farms-api.pancakeswap.com/v3/${chainId}/liquidity/${f.lpAddress}`)
          .then((farmLiquidity) => farmLiquidity.json())
          .catch((err) => {
            console.error(err);
            throw err;
          })
      )
    );
    farmResultsWithPrice.forEach((farmWithPrice, index: number) => {
      tvls[farms.farmsWithPrice[index].lpAddress] =
        farmWithPrice.status === "fulfilled"
          ? { ...farmWithPrice.value.formatted, updatedAt: farmWithPrice.value.updatedAt }
          : null;
    });

    const cakePrice = new BigNumber(await getCakePriceFromOracle(getEthersClient(56))).toString();
    const farmWithPriceAndCakeAPR = farms.farmsWithPrice
      .map((farm) => {
        const tvl = tvls[farm.lpAddress]!;
        if (!tvl) return null;
        const cakePerSecond = farms.cakePerSecond;
        const { cakeApr } = farmFetcherV3.getCakeAprAndTVL(farm, tvl, cakePrice, cakePerSecond);

        return { farm, cakeApr: Number(cakeApr) };
      })
      .filter((farm) => farm !== null) as {
      farm: FarmV3DataWithPrice;
      cakeApr: number;
    }[];

    for (const farm of farmWithPriceAndCakeAPR) {
      const cachedApr = await redisClient.getFarmApr(`farm-${farm.farm.pid}-${chainId}`);
      const currentApr = farm.cakeApr;
      if (!cachedApr) {
        redisClient.setFarmApr(`farm-${farm.farm.pid}-${chainId}`, currentApr);
        continue;
      }
      if (currentApr === cachedApr) continue;
      const percentageDifference = calculatePercentageIncrease(currentApr, cachedApr);
      if (percentageDifference >= 20) {
        const notificationBody = getFarmAPRNotificationBody(
          farm.farm.lpSymbol,
          CHAIN_ID_TO_CHAIN_NAME[chainId],
          currentApr,
          cachedApr
        );
        if (users.length > 0) {
          await sendPushNotification(BuilderNames.farmAprNotification, [users, notificationBody], removePrefix(users));
          redisClient.setFarmApr(`farm-${farm.farm.pid}-${chainId}`, currentApr);
          job.log.warn(`notifications sent out on chain on ${chainId}`);
        }
      }
    }
    job.log.warn(`no users to send notifications to on ${chainId}`);
  } catch (error) {
    console.error("Error fetching Ethereum price:", error);
  }
};

function calculatePercentageIncrease(previousValue, newValue): number {
  if (previousValue === 0) {
    throw new Error("Previous value cannot be zero.");
  }

  const percentageIncrease = ((newValue - previousValue) / previousValue) * 100;
  return percentageIncrease;
}
