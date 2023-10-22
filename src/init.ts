import appConfig from "./config/config";
import { RedisClient } from "./redis";
import { fetchMultipleTokenUSDPrice } from "./util/fetchTokenPrice";
import { getLogger } from "./util/logger";
import { getAllActiveSubscribers } from "./util/pushUtils";

export let redisClient: RedisClient;

const log = getLogger("common-init");

export const commonInit = async (): Promise<void> => {
  if (!redisClient) {
    redisClient = await RedisClient.initialize(appConfig.redisTsl === "true");
  }
  // initialise active subscribers on api start
  const subscribers = await getAllActiveSubscribers();
  const tokenPrices = await fetchMultipleTokenUSDPrice(['ethereum', 'binancecoin']);

  redisClient.setMultipleTokenPrices(tokenPrices)
  redisClient.setSubscribers(subscribers)
  process
    .on("SIGINT", (reason) => {
      log.error(`SIGINT. ${reason}`);
      process.exit();
    })
    .on("SIGTERM", (reason) => {
      log.error(`SIGTERM. ${reason}`);
      process.exit();
    })
    .on("unhandledRejection", (reason) => {
      log.error(`Unhandled Rejection at Promise. Reason: ${reason}`);
      process.exit(-1);
    })
    .on("uncaughtException", (reason) => {
      log.error(`Uncaught Exception Rejection at Promise. Reason: ${reason}`);
      process.exit(-2);
    });
};
