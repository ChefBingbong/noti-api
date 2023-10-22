import cron from "node-cron";
import { PredictionRound } from "../graph";
import {
  GRAPH_API_PREDICTION_BNB,
  GRAPH_API_PREDICTION_CAKE,
  getPredictionRoundsWinners,
} from "../graph/predictions/getUserBetHistory";
import { redisClient } from "../init";
import { getLogger } from "../util/logger";
import { BuilderNames, getPredictionWelcomeNotificationBody, getPredictionsNotificationBody, removePrefix, sendPushNotification } from "../util/pushUtils";
import { getTimePeriods } from "../util/timeCalculator";
import CronJob from "./utils/conUtils";

const log = getLogger("predictions-cronTask");
const resultJob = new CronJob("predictions-cron-result", process, log)
const updateJob = new CronJob("predictions-cron-notify", process, log)

export const startPredictionWinnersNotifyJob = async () => {
  resultJob.cronJob = cron.schedule("*/60 * * * *", async () => {
    resultJob.log.info(`${resultJob.jobName} started`);
    resultJob.isCronRunning = true;

    const activeSubscribers = (await redisClient.getSubscribers()) as string[];
    const users = removePrefix(activeSubscribers);
    await notifyPredictionRoundWinners(users);

    resultJob.isCronRunning = false;
    resultJob.log.info(`${resultJob.jobName} cron finished`);
  });
};

export const startPredictionNotifyJob = async () => {
  updateJob.cronJob = cron.schedule("*/60 * * * *", async () => {
    updateJob.log.info(`${resultJob.jobName} started`);
    updateJob.isCronRunning = true;

    const activeSubscribers = (await redisClient.getSubscribers()) as string[];
    const users = removePrefix(activeSubscribers);
    await fetchAndNotifyNewPlayers(users);

    updateJob.isCronRunning = false;
    updateJob.log.info(`${resultJob.jobName} cron finished`);
  });
};

const notifyPredictionRoundWinners = async (users: string[]) => {
  try {
    const [latestRoundsDataCake, latestRoundsDataBnb] = await Promise.all([
      getPredictionRoundsWinners(GRAPH_API_PREDICTION_CAKE),
      getPredictionRoundsWinners(GRAPH_API_PREDICTION_BNB),
    ]);

    // Notify winners concurrently
    await Promise.allSettled([
      findWinnersAndNotify(latestRoundsDataCake, users),
      findWinnersAndNotify(latestRoundsDataBnb, users),
    ]);
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const findWinnersAndNotify = async (roundData: PredictionRound[], users: string[]) => {
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);
  for (const round of roundData) {
    if (round.bets.length === 0) continue;

    const usersToNotify: string[] = [];
    const userTimestampKeys: string[] = [];
    for (const roundBet of round.bets) {
      const user = roundBet.user.id;
      if (!users.includes(user)) continue;

      const hasClaimed = roundBet.claimed;
      if (hasClaimed) continue;

      const shouldNotify = await shouldNotifyUser(user, currentTimestamp, userTimestampKeys, usersToNotify, resultJob.jobName);
      if (!shouldNotify) continue;
    }
    if (usersToNotify.length > 0) buildAndSendNotification(usersToNotify, userTimestampKeys, 1);
  }
};

export const fetchAndNotifyNewPlayers = async (users: string[]) => {
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);
  try {
    // find users who have no prediction data (we want to notify these)
    const usersToNotify: string[] = [];
    const userTimestampKeys: string[] = [];
    for (const user of users) {
      const shouldNotify = await shouldNotifyUser(user, currentTimestamp, userTimestampKeys, usersToNotify, updateJob.jobName);
      if (!shouldNotify) continue;
    }
    if (usersToNotify.length > 0) buildAndSendNotification(usersToNotify, userTimestampKeys, 2);
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const shouldNotifyUser = async (
  user: string,
  currentTimestamp: number,
  usersToNotify: string[],
  userTimestampKeys: string[],
  jobName: string
): Promise<boolean> => {
  const userTimestampKey = redisClient.getUserTimestampKey(97, jobName, user);
  const lastNotifiedTime = await redisClient.getUserTimestamp(userTimestampKey);
  if (!lastNotifiedTime) {
    await redisClient.setUserTimestamp([userTimestampKey]);
    return false;
  }
  const { days: timeElapsedSinceLastNotifiedTime } = getTimePeriods(lastNotifiedTime - currentTimestamp);
  if (timeElapsedSinceLastNotifiedTime >= 3) {
    usersToNotify.push(user);
    userTimestampKeys.push(userTimestampKey);
    return true;
  }
  return false;
};

const buildAndSendNotification = async (users: string[], userKeys: string[], type: number) => {
  redisClient.setUserTimestamp(userKeys);
  const modifiedArray = users.map((item) => `eip155:1:${item}`);
  const notificationBody = type === 1 ? getPredictionsNotificationBody() : getPredictionWelcomeNotificationBody();

  await sendPushNotification(BuilderNames.predictionWinnerNotification, [modifiedArray, notificationBody], users);
};
