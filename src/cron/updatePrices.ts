import cron from "node-cron";
import { getLogger } from "../util/logger";
import CronJob from "./utils/conUtils";
import { fetchMultipleTokenUSDPrice } from "../util/fetchTokenPrice";
import { redisClient } from "../init";

const log = getLogger("update-multiple-price-cronTask");
const job = new CronJob("update-multiple-price-cronTask", process, log);

export const updateMultipleTokenPricesCron = async () => {
  job.cronJob = cron.schedule("*/30 * * * * *", async () => {
    job.log.info(`${job.jobName} started`);
    if (job.isCronRunning) {
      job.log.info(`${job.jobName} prev cron still runnning`);
      return;
    }
    job.isCronRunning = true;
    const tokenPrices = await fetchMultipleTokenUSDPrice(['ethereum', 'binancecoin']);
    redisClient.setMultipleTokenPrices(tokenPrices)

    job.isCronRunning = false;
    job.log.info(`${job.jobName} cron finished`);
  });
};