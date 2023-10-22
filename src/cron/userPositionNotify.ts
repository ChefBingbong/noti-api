import cron, { ScheduledTask } from "node-cron";
import { viemAddress } from "../blockchain/client";
import { BatchPools, getBatchUserPositionOutOfRange, TickRange } from "../graph/userFarmPositions/getBatchUserPositionOutOfRange";
import { redisClient } from "../init";
import { getPoolTick } from "../service/poolInfo";
import { getLogger } from "../util/logger";
import { parsePoolAndTick } from "../util/pool";
import { BuilderNames, removePrefix, sendPushNotification } from "../util/pushUtils";

const log = getLogger("user-positions-notify-cron");

let whitelistFarmsCron: ScheduledTask;
let isCronRunning = false;

const fetchUserPositionsAndSendNotification = async (networkId: number, batchPositions: BatchPools[], tickRange: TickRange) => {
  if (batchPositions.length === 0) {
    return;
  }
  const result = await getBatchUserPositionOutOfRange(networkId, batchPositions);
  const newBatchPositions: BatchPools[] = [];
  for (const [queryName, userPositions] of result.entries()) {
    const { pool, tick } = parsePoolAndTick(queryName);

    const lastTimeStamp = Number(userPositions[userPositions.length - 1]?.createdAtTimestamp);

    if (userPositions.length === 1000) {
      log.info("true have met this code");
      newBatchPositions.push({ poolId: pool, tick: tick, tickRangeOut: tickRange, lastTimeStamp: lastTimeStamp });
    }

    let owners = [] as string[]
    for (const userPosition of userPositions) {
      const { id, pool, owner } = userPosition;

      // only send to ppl wo are already subscribed
      const activeSubscribers = await redisClient.getSubscribers() as string[]
      if (activeSubscribers.includes(`eip155:1:${owner}`)) owners.push(`eip155:1:${owner}`)
      if (!(await redisClient.existUserPositionNotification(networkId, id, pool.id, owner))) {
        //TODO send notification
        await redisClient.storeUserPositionNotification(networkId, id, pool.id, owner, "Notification send");
      }
    }
    if (owners.length > 0) await sendPushNotification(BuilderNames.LPOutOfRangeNotification, [owners], removePrefix(owners))
    log.info(`Pool: ${pool}. Tick: ${tick}. Positions count: ${userPositions.length}. LastTimeStamp: ${lastTimeStamp}`);
  }

  await fetchUserPositionsAndSendNotification(networkId, newBatchPositions, tickRange);
};

const userPositionsNotify = async (networkId: number) => {
  const farms = await redisClient.getWhitelistedFarm(networkId);
  if (farms) {
    const { pools } = farms;
    const ticks = await getPoolTick(
      networkId,
      pools.map((pool) => pool as viemAddress)
    );
    const batchPositionsTickUpper: BatchPools[] = [];
    const batchPositionsTickLower: BatchPools[] = [];
    pools.forEach((pool, index) => {
      const tick = ticks[index];
      if (tick !== null) {
        batchPositionsTickLower.push({ poolId: pool, tick: tick, tickRangeOut: "tickLower" });
        batchPositionsTickUpper.push({ poolId: pool, tick: tick, tickRangeOut: "tickUpper" });
      }
    });
    await fetchUserPositionsAndSendNotification(networkId, batchPositionsTickLower, "tickLower");
    await fetchUserPositionsAndSendNotification(networkId, batchPositionsTickUpper, "tickUpper");
  } else {
    log.error("No farms found");
  }
};

export const startUserPositionNotifyJob = () => {
  whitelistFarmsCron = cron.schedule("*/60 * * * *", async () => {
    log.info("startUserPositionNotifyJob started");
    if (isCronRunning) {
      log.info("startUserPositionNotifyJob prev cron still running");
      return;
    }

    isCronRunning = true;

    await userPositionsNotify(1);
    await userPositionsNotify(56);
    // await userPositionsNotify(5);
    // await userPositionsNotify(56);

    isCronRunning = false;
    log.info("startUserPositionNotifyJob cron finished");
  });
};

const stopCronJob = async () => {
  if (whitelistFarmsCron) {
    whitelistFarmsCron.stop();
  }
};

const handleExit = async () => {
  log.info("Stopping 'userPositionsNotify' cron job and closing server...");
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
