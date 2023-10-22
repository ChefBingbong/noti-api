import { providers } from "ethers";
import cron from "node-cron";
import { getEthersClient } from "../blockchain/client";
import { getCurrentLotteryEntity, getUserLotteryInformation } from "../graph/lotteryPositions/getUpComingLotteryData";
import { fetchUserTicketsForOneRound, getLotteryPrizeInCake } from "../graph/lotteryPositions/getUserTicketInfo";
import { redisClient } from "../init";
import { LotteryData, UserFlattenedRoundData, UserLotteryData } from "../model/graphData";
import { getLogger } from "../util/logger";
import {
  BuilderNames,
  getAllActiveSubscribers,
  getLotteryNotificationBody1,
  getLotteryNotificationBody2,
  getLotteryNotificationBody3,
  getLotteryNotificationBody4,
  removePrefix,
  sendPushNotification,
} from "../util/pushUtils";
import { getFormattedTime, timeElapsed } from "../util/timeCalculator";
import CronJob from "./utils/conUtils";

const log = getLogger("lotteries-cron");
const resultJob = new CronJob("lotteries-cron", process, log)
const updateJob = new CronJob("lotteries-cron", process, log)

export const startLotteryResultNotifyJob = async () => {
  resultJob.cronJob = cron.schedule("*/60 * * * *", async () => {
    resultJob.log.info(`${resultJob.jobName} started`);
    resultJob.isCronRunning = true;

    const { provider, users } = await getJobSetup();
    await notifyWinnersWhoHaventClaimed(users, 97);
    await notifyPlayersOnLotteryEnd(users, provider);

    resultJob.isCronRunning = false;
    resultJob.log.info(`${resultJob.jobName} cron finished`);
  });
};

export const startLotteryUpdateNotifyJob = async () => {
  updateJob.cronJob = cron.schedule("*/30 * * * *", async () => {
    updateJob.log.info(`${updateJob.jobName} started`);
    updateJob.isCronRunning = true;

    const { provider, users } = await getJobSetup();
    await fetchAndNotifyNewPlayers(users, provider, 97);
    await remindAndNotifyExistingPlayers(users);

    updateJob.isCronRunning = false;
    updateJob.log.info(`${updateJob.jobName} cron finished`);
  });
};

export const fetchAndNotifyNewPlayers = async (users: string[], provider: providers.JsonRpcProvider, network: number) => {
  try {
    const { totalUsers, ticketPrice, endTime, id } = await getCurrentLotteryEntity();
    const formattedTimeString = getFormattedTime(Number(endTime));

    let usersDueForNotification: string[] = [];
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];

      const userTimestamp = redisClient.getUserTimestampKey(network, updateJob.jobName, user)
      const lastNotifiedTime = await redisClient.getUserTimestamp(userTimestamp);
      if (!lastNotifiedTime) {
        usersDueForNotification.push(user);
        continue;
      }
      const { inMinutes: timeElapsedSinceLastNotifiedTime } = timeElapsed(lastNotifiedTime.toString());
      if (Math.abs(timeElapsedSinceLastNotifiedTime) <= 30) continue;
      usersDueForNotification.push(user);
    }
    const modifiedArray = usersDueForNotification.map((item) => `eip155:1:${item}`);
    const { totalPrizeInUsd, prizeAmountInCake } = await getLotteryPrizeInCake(id, provider);

    const body = getLotteryNotificationBody1([
      formattedTimeString,
      usersDueForNotification,
      ticketPrice,
      totalUsers,
      totalPrizeInUsd,
      prizeAmountInCake,
    ]);

    if (usersDueForNotification.length > 0) {
      await sendPushNotification(BuilderNames.lotteryNotification, [modifiedArray, body], usersDueForNotification);
      const userTimestampKeys = usersDueForNotification.map((user: string) => redisClient.getUserTimestampKey(network, updateJob.jobName, user))
      await redisClient.setUserTimestamp(userTimestampKeys);
    }
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const remindAndNotifyExistingPlayers = async (users: string[]) => {
  try {
    const { currentLottery, existingLotteryPlayers } = await getLotteryInformation(users, 1)
    const { inMinutes: minutesLeftUntilDraw } = timeElapsed(currentLottery.endTime);
    if (minutesLeftUntilDraw >= 120) return;

    const notificationArray: string[] = [];
    for (const existingUser of existingLotteryPlayers) {
      const isUserEntered = existingUser.rounds.some(
        (round: UserFlattenedRoundData) => round.lotteryId === currentLottery.id
      );
      const account = existingUser.account;
      if (!isUserEntered) continue;
      notificationArray.push(account);
    }
    const body = getLotteryNotificationBody2([minutesLeftUntilDraw]);
    const modifiedArray = notificationArray.map((item) => `eip155:1:${item}`);
    if (notificationArray.length > 0) {
      await sendPushNotification(BuilderNames.lotteryNotification, [modifiedArray, body], notificationArray);
    }
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const notifyPlayersOnLotteryEnd = async (users: string[], provider: providers.JsonRpcProvider) => {
  try {
    const { currentLottery, existingLotteryPlayers } = await getLotteryInformation(users, 2)
    const timeRemaining = currentLottery.endTime;
    const { inMinutes: minutesLeftUntilDraw } = timeElapsed(timeRemaining);

    const hasRoundBeenNotified = await redisClient.getLotteryRoundNotified(currentLottery.id);
    if (minutesLeftUntilDraw > 0 || hasRoundBeenNotified) return;

    const winnersArray: string[] = [];
    for (const existingUser of existingLotteryPlayers) {
      const isUserEntered = existingUser.rounds.some(
        (round: UserFlattenedRoundData) => round.lotteryId === currentLottery.id
      );
      const account = existingUser.account;
      if (!isUserEntered) continue

      const { winningTickets: usersTicketsResults } = await fetchUserTicketsForOneRound(
        existingUser.account,
        currentLottery.id,
        currentLottery.finalNumber,
        provider
      );
      const winningTickets = usersTicketsResults?.filter((ticket) => ticket.status);
      if (winningTickets?.length) winnersArray.push(`eip155:1:${account}`);
    }
    const body = getLotteryNotificationBody3();
    const modifiedArray = winnersArray.map((item) => `eip155:1:${item}`);
    if (winnersArray.length > 0)
      await sendPushNotification(BuilderNames.lotteryNotification, [modifiedArray, body], winnersArray);

    await redisClient.setLotteryRoundNotified(currentLottery.id, true);
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const notifyWinnersWhoHaventClaimed = async (users: string[], network: number) => {
  try {
    const existingLotteryPlayers = await getUserLotteryInformation(users);

    const winnersArray: string[] = [];
    for (const existingUser of existingLotteryPlayers) {
      const userTimestampKey = redisClient.getUserTimestampKey(network, resultJob.jobName, existingUser.account)
      const lastNotifiedTime = await redisClient.getUserTimestamp(userTimestampKey);
      if (!lastNotifiedTime) {
        await redisClient.setUserTimestamp([userTimestampKey]);
        continue;
      }
      const { inDays } = timeElapsed(lastNotifiedTime.toString());
      if (Math.abs(inDays) <= 5) continue;

      for (const userRound of existingUser.rounds) {
        if (userRound.status === "claimable") {
          winnersArray.push(existingUser.account);
        }
      }
    }
    const body = getLotteryNotificationBody4();
    const modifiedArray = winnersArray.map((item) => `eip155:1:${item}`);
    if (winnersArray.length > 0) {
      await sendPushNotification(BuilderNames.lotteryNotification, [modifiedArray, body], winnersArray);
      const userTimestampKeys = winnersArray.map((user: string) => redisClient.getUserTimestampKey(network, updateJob.jobName, user))
      await redisClient.setUserTimestamp(userTimestampKeys);
    }
  } catch (error) {
    console.error("Error fetching Lotteery data:", error);
  }
};

const getJobSetup = async () => {
  const provider = getEthersClient(97);
  const activeSubscribers = await redisClient.getSubscribers() as string[]
  const users = removePrefix(activeSubscribers);
  return { provider, activeSubscribers, users };
};

const getLotteryInformation = async (
  users: string[],
  lotteryIndex: number
): Promise<{ currentLottery: LotteryData; existingLotteryPlayers: UserLotteryData<UserFlattenedRoundData>[] }> => {
  const currentLottery = await getCurrentLotteryEntity(lotteryIndex);
  const existingLotteryPlayers = await getUserLotteryInformation(users);

  return { currentLottery, existingLotteryPlayers };
};