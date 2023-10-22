import cron from "node-cron";
import { redisClient } from "../init";
import { getLogger } from "../util/logger";
import {
      getAllActiveSubscribers
} from "../util/pushUtils";
import CronJob from "./utils/conUtils";

const log = getLogger("update-subscribers-cronTask");
const job = new CronJob("update-subscribers-cronTask", process, log);

export const updateSubscribersCron = async () => {
  job.cronJob = cron.schedule("*/2 * * * *", async () => {
    job.log.info(`${job.jobName} started`);
    if (job.isCronRunning) {
      job.log.info(`${job.jobName} prev cron still runnning`);
      return;
    }
    job.isCronRunning = true;

    const activeSubscribers = await getAllActiveSubscribers();
    await redisClient.setSubscribers(activeSubscribers)

    job.isCronRunning = false;
    job.log.info(`${job.jobName} cron finished`);
  });
};