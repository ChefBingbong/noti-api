import cron, { ScheduledTask } from "node-cron";
import axios from "axios";
import { redisClient } from "../init";
import { getLogger } from "../util/logger";

const log = getLogger("whitelist-farms-cron");

let whitelistFarmsCron: ScheduledTask;
let isCronRunning = false;

const fetchAndStoreFarms = (networkId: number) => {
  axios.get(`https://pancakeswap.finance/api/v3/${networkId}/farms`)
    .then(async (response) => {
      const body = JSON.parse(JSON.stringify(response.data));
      const farms: string[] = body.farmsWithPrice.map((farm: { lpAddress: string; }) => farm.lpAddress.toLowerCase());
      await redisClient.storeWhitelistedFarms(networkId, { pools: farms, lastUpdateTimestamp: new Date().getTime() / 1000 });
    })
    .catch(error => {
      log.error(`Failed to fetch WhiteListedFarms. networkId: ${networkId}`, error.message);
    });
};

export const startWhitelistFarmsJob = () => {
  whitelistFarmsCron = cron.schedule("*/60 * * * *", async () => {
    if (isCronRunning) {
      return;
    }

    isCronRunning = true;

    await fetchAndStoreFarms(1);
    await fetchAndStoreFarms(56);
    // await fetchAndStoreFarms(5);
    // await fetchAndStoreFarms(56);

    isCronRunning = false;
  });
};


const stopCronJob = async () => {
  if (whitelistFarmsCron) {
    whitelistFarmsCron.stop();
  }
};

const handleExit = async () => {
  log.info("Stopping 'whitelistFarms' cron job and closing server...");
  await stopCronJob();
  // close the server and any other resources here
  process.exit(0);
};

const handleError = async (err: Error) => {
  log.error("Unhandled error:", err.message);
  await stopCronJob();
  process.exit(1);
};

process.on("unhandledRejection", handleError);
process.on("uncaughtException", handleError);
process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
