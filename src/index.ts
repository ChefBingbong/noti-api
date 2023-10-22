import "dotenv/config";
import { commonInit } from "./init";
import { getLogger } from "./util/logger";
import { startWhitelistFarmsJob } from "./cron/whitelistFarms";
import { startUserPositionNotifyJob } from "./cron/userPositionNotify";
import { startPriceCheckJob } from "./cron/compareNativeTokenPrice";
import { startLotteryResultNotifyJob, startLotteryUpdateNotifyJob } from "./cron/fetchLotteriesJob";
import { startNativeBalanceCheckJob } from "./cron/checkLowNativeBalance";
import { startPredictionWinnersNotifyJob } from "./cron/fetchPredictionsJob";
import { SupportedChain } from "./util/chains";
import { updateSubscribersCron } from "./cron/updateSubscribers";
import { updateMultipleTokenPricesCron } from "./cron/updatePrices";
import { starFarmAprCheckJob } from "./cron/farmsAprJob";

const log = getLogger("main");

commonInit().then(() => {
  // startLotteryUpdateNotifyJob()
  // startLotteryResultNotifyJob()
  // startPriceCheckJob()
  // startNativeBalanceCheckJob()
  updateMultipleTokenPricesCron()
  updateSubscribersCron();

  Object.values(SupportedChain)
    .filter((value) => typeof value === "number")
    .forEach((chain) => {
      if (chain === 1 || chain === 56) starFarmAprCheckJob(chain as SupportedChain)
      // startNativeBalanceCheckJob(chain as SupportedChain);
      // startPriceCheckJob(chain as SupportedChain);
    });

  // startPredictionWinnersNotifyJob()
  // startWhitelistFarmsJob();
  // startUserPositionNotifyJob();

  log.info("Jobs started");
});
