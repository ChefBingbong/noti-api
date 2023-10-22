import axios from "axios";
import appConfig from "../config/config";

// import fetch from "node-fetch";
export enum NotificationView {
  onBoarding,
  Notifications,
  Settings,
}

const tokensToDisplayName: { [token: string]: string } = {
  ["ethereum"]: "Ethereum",
  ["binancecoin"]: "BNB",
};

const chainIdToDisplayName: { [token: string]: number } = {
  ["ethereum"]: 1,
  ["binancecoin"]: 56,
};

export const getLotteryNotificationBody1 =(args: any[]) => `${args[0]} remaining until the next lottery draw.\nEnter for ${args[2]} CAKE to have the chance to win ${args[5]} CAKE worth over $${args[4]}. \n Current Players: ${args[3]}`
export const getLotteryNotificationBody2 =(args: any[]) => `Just under ${args[0]} remaining until the next lottery draw. Dont forget to check your numbers and wait for the result. Best of luck to everyone`
export const getLotteryNotificationBody3 = () => `Congratulations. You have a winning ticket for todays draw. you can now claim your Cake reward. Thanks so much for joining and hope to see you again soon.`
export const getLotteryNotificationBody4 = () => `It seems You currently have unclaimed lottery prizes. Dont miss out and be sure to claim your reward by following the link below`
export const getBalanceNotificationBody = (networkName: string) => `Your ${networkName} balance has fallen below $15 USD? If you need to top up you can purchase crypto with fiat here at pancakeswap`
export const getPredictionsNotificationBody= () => `You have previously won a predictions round and have unclaimed prizes to collect. you can now claim your reward at the following the link below`
export const getPredictionWelcomeNotificationBody =() => `Want to have some fun betting on the price of CAKE and BNB. well if so try out Pancake Predictions to be in with a chance to win CAKE and BNB`
export const getFarmAPRNotificationBody =(farms: string, chainId: string, currentApr: number, lastApr: number) => `There has been movement in the following farms on ${chainId}. ${farms}. their APR has risen by 20% \n \n Old APR: ${lastApr}%  \n \n Current APR: ${currentApr}%`

export type NotificationType = {
  account: string;
  date: number;
  description: string;
  id: number;
  title: string;
  type: string;
};

export type NotifyType = {
  title: string;
  description: string;
};

export type pushNotifyTypes = "Lottery" | "Prediction" | "Liquidity" | "Staking" | "Pools" | "Farms" | "PriceUpdates" | "Promotional" | "Voting" | "alerts";
export enum BuilderNames {
  LPOutOfRangeNotification = "LPOutOfRangeNotification",
  tokenPriceMovementNotification = "tokenPriceMovementNotification",
  lotteryNotification = "lotteryNotification",
  lowBalanceNotification = "lowBalanceNotification",
  predictionWinnerNotification = "predictionWinnerNotification",
  predictionNotifyNotification = "predictionNotifyNotification",
  farmAprNotification = "farmAprNotification"
}
export type pushNotification = {
  title: string;
  body: string;
  icon: string;
  url: string;
  type: pushNotifyTypes;
};

export type NotificationPayload = {
  accounts: string[];
  notification: pushNotification;
};

export interface PancakeNotificationBuilders {
  ["LPOutOfRangeNotification"]: { LPOutOfRangeNotification: () => pushNotification };
  ["tokenPriceMovementNotification"]: {
    tokenPriceMovementNotification: (
      token1: string,
      token2: string,
      token1Amount: string,
      token2Amount: string
    ) => pushNotification;
  };
  ['lotteryNotification']: { lotteryNotification: () => pushNotification};
  ['lowBalanceNotification']: { lowBalanceNotification: (
    accounts: string[],
    body: string,
    chainId: number
  ) => pushNotification};
  ['predictionWinnerNotification']: { predictionWinnerNotification: (
    accounts: string[],
    body: string,
    chainId: number
  ) => pushNotification}
  ['predictionNotifyNotification']: { predictionNotifyNotification: (
    accounts: string[],
    body: string,
    chainId: number
  ) => pushNotification},
  ['farmAprNotification']: { farmAprNotification: (
    accounts: string[],
    body: string,
    chainId: number
  ) => pushNotification}

}

export const PancakeNotifications: {
  [notificationBuilder in keyof PancakeNotificationBuilders]: <T>(args: T[]) => NotificationPayload;
} = {
  LPOutOfRangeNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: "LP position out of range",
        body: "Your liquidity position is no longer in the price range. please readjust your position to continue erning fees.",
        icon: `https://pancakeswap.finance/logo.png`,
        url: "https://pancakeswap.finance/liquidity",
        type: "Liquidity",
      },
    };
  },
  tokenPriceMovementNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `${tokensToDisplayName[args[1] as string]} Price Movement`,
        body: `The price of ${args[1]} has ${!args[2] ? "increased" : "fallen"} by over ${
          args[3]
        }% in the past hour \n. \n \n Old price: $${args[5]}  \n \n Current Price: $${args[4]}`,
        icon: `https://assets.pancakeswap.finance/web/native/${chainIdToDisplayName[args[1] as number]}.png`,
        url: `https://www.coingecko.com/en/coins/${args[1]}`,
        type: "PriceUpdates",
      },
    };
    // ... add more as we create use cases
  },
  lotteryNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `PancakeSwap Lottery`,
        body:  args[1],
        icon: `https://pancakeswap.finance/images/lottery/ticket-r.png`,
        url: `https://pancakeswap.finance/lottery`,
        type: "Lottery",
      },
    };
  },
  lowBalanceNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `Your Balance is Low`,
        body:  args[1],
        icon: `https://assets.pancakeswap.finance/web/native/${chainIdToDisplayName[args[2] as number]}.png`,
        url: `https://pancakeswap.finance/buy-crypto`,
        type: "Lottery",
      },
    };
  },
  predictionWinnerNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `PancakeSwap Predictions Winner`,
        body:  args[1],
        icon: `https://pancakeswap.finance/images/decorations/prediction.png`,
        url: `https://pancakeswap.finance/predictions`,
        type: "Prediction",
      },
    };
  },
  predictionNotifyNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `PancakeSwap Predictions`,
        body:  args[1],
        icon: `https://pancakeswap.finance/images/decorations/prediction.png`,
        url: `https://pancakeswap.finance/predictions`,
        type: "Prediction",
      },
    };
  },
  farmAprNotification: (args): any => {
    return {
      accounts: args[0],
      notification: {
        title: `Farms APR Update`,
        body:  args[1],
        icon: `https://pancakeswap.finance/logo.png`,
        url: `https://pancakeswap.finance/farms`,
        type: "Farm",
      },
    };
  }
};

export async function sendBrowserNotification(title: string, body: string, users: string[]) {
  try {
     await fetch("http://localhost:8000/broadcast-notifications", {
      method: "POST",
      body: JSON.stringify({ notification: { title, body }, users }),
      headers: { 
        "Content-Type": "application/json",
        "x-secure-token": appConfig.secureToken as string
     },
    });
  } catch (error) {
    console.error("Failed to send browser notification", error);
  }
}

export const sendPushNotification = async (notificationType: BuilderNames, args: Array<any>, users: string[]) => {
  const notificationPayload = PancakeNotifications[notificationType](args);

  try {
    const notifyResponse = await axios.post(
      `https://notify.walletconnect.com/${appConfig.walletConnectApiKey}/notify`,
      notificationPayload, // Pass the payload directly as data
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appConfig.walletConnectSecretKey}`,
        },
      }
    );
    console.log(notifyResponse.data)
    if (notifyResponse.data.sent.length > 0) await sendBrowserNotification("PancakeSwap Alert", "You have new updates from PancakeSwap DEX.", users);
  } catch (error) {
    // @ts-ignore
    console.error("send notification error", error.response.data);
  }
};

export const getAllActiveSubscribers = async (): Promise<string[]> => {
  try {
    const subscriberResponse = await axios.get(
      `https://notify.walletconnect.com/${appConfig.walletConnectApiKey}/subscribers`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appConfig.walletConnectSecretKey}`,
        },
      }
    );

    const subscriberResult = await subscriberResponse.data;
    return subscriberResult as any;
  } catch (error) {
    console.error("fetch subscribers error", error);
    return [];
  }
};

export const removePrefix = (arr: string[]) => {
  return arr.map(item => item.replace('eip155:1:', ''));
}

