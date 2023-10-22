import Redis from "ioredis";
import { getLogger } from "../util/logger";
import { WhitelistedFarms } from "../model/farms";
import appConfig from "../config/config";

const log = getLogger("redis-client");

export type ExpireCallback = (key: string) => void;

const getDefaultClient = (tls: boolean): Redis => {
  const REDIS_CONF =
    appConfig.env !== "development"
      ? {
          host: appConfig.redisHost as string,
          username: appConfig.redisUsername,
          password: appConfig.redisPassword,
          tls: tls ? {} : undefined,
          port: Number(appConfig.redisPort),
        }
      : {
          port: Number(appConfig.redisPort),
        };

  const client = new Redis(REDIS_CONF);
  client.on("error", (err) => log.info(`Redis Client Error. Error: ${err.message}`));
  client.on("connect", () => log.info("Redis Client is connect"));
  client.on("reconnecting", () => log.info("Redis Client is reconnecting"));
  client.on("ready", () => log.info("Redis Client is ready"));

  client.flushall();
  return client;
};

export class RedisClient {
  private readonly client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async existRequestTimeout(): Promise<boolean> {
    return (await this.client.exists("test")) > 0;
  }

  public static async initialize(tls: boolean): Promise<RedisClient> {
    const client = getDefaultClient(tls);
    return new RedisClient(client);
  }

  public static async initializeWithExpireCallback(tls: boolean, expireCallback: ExpireCallback): Promise<RedisClient> {
    const client = getDefaultClient(tls);

    // In DigitalOcean this config is set by using api
    //await client.config('SET', 'notify-keyspace-events', 'Ex')

    const sub = client.duplicate();
    await sub.subscribe("__keyevent@0__:expired");

    sub.on("message", async (channel, key) => {
      expireCallback(key as string);
    });

    return new RedisClient(client);
  }

  async getSubscribers(): Promise<string[] | null> {
    const res = await this.client.get("subscribers");
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setSubscribers(data: string[]): Promise<void> {
    await this.client.set("subscribers", JSON.stringify(data));
  }

  async getMultipleTokenPrices(): Promise<{ [token: string]: number } | null> {
    const res = await this.client.get("multiple-prices");
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setMultipleTokenPrices(data: { [token: string]: number }): Promise<void> {
    await this.client.set("multiple-prices", JSON.stringify(data));
  }

  getWhitelistedFarmKey = (networkId: number) => `whitelistedFarms-${networkId}`;
  getBalanceKey = (user: string, networkId: number) => `balance-${user}-${networkId}`;
  getPriceKey = (token: string, networkId: number) => `latestPrice-${token}-${networkId}`;
  getUserTimestampKey = (networkId: number, job: string, user: string) => `timestamp-${job}-${user}-${networkId}`;
  getUserPositionNotificationKey = (
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string
  ) => `userPosition-${networkId}-${userPositionId}-${poolAddress}-${userAddress}`;

  async getWhitelistedFarm(networkId: number): Promise<WhitelistedFarms | null> {
    const res = await this.client.get(this.getWhitelistedFarmKey(networkId));
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async storeWhitelistedFarms(networkId: number, data: WhitelistedFarms) {
    await this.client.set(this.getWhitelistedFarmKey(networkId), JSON.stringify(data));
  }

  async existUserPositionNotification(
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string
  ) {
    const key = this.getUserPositionNotificationKey(networkId, userPositionId, poolAddress, userAddress);
    return (await this.client.exists(key)) > 0;
  }

  async storeUserPositionNotification(
    networkId: number,
    userPositionId: string,
    poolAddress: string,
    userAddress: string,
    data: any,
    timeoutMS?: number
  ) {
    if (timeoutMS === undefined) {
      timeoutMS = 1000 * 60 * 60; //1h
    }
    const key = this.getUserPositionNotificationKey(networkId, userPositionId, poolAddress, userAddress);
    await this.client.set(key, JSON.stringify(data), "PX", timeoutMS);
  }

  async getLotteryRoundNotified(key: string): Promise<boolean | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    return false;
  }

  async setFarmApr(key: string, data: number): Promise<void> {
    await this.client.set(key, JSON.stringify(data));
  }

  async getFarmApr(key: string): Promise<number | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setLotteryRoundNotified(key: string, data: boolean): Promise<void> {
    await this.client.set(key, JSON.stringify(data));
  }

  async getUserTimestamp(key: string): Promise<number | null> {
    const res = await this.client.get(key);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }
  public async setUserTimestamp(userKeys: string[]): Promise<void> {
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    if (userKeys.length === 1) {
      await this.client.set(`${userKeys[0]}`, JSON.stringify(currentTimestamp));
      return;
    }
    const pipeline = this.client.multi();
    userKeys.forEach((key) => {
      pipeline.set(key, currentTimestamp);
    });

    pipeline.exec((error, results) => {
      if (error) {
        console.error("Error:", error);
      }
    });
  }

  async setLatestUserBalance(user: string, timestamp: number): Promise<void> {
    await this.client.set(`${user}`, JSON.stringify(timestamp));
  }

  async getLatestUserBalance(user: string): Promise<number | null> {
    const res = await this.client.get(`${user}`);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async getLastNativeTokenPrice(token: string): Promise<number | null> {
    const res = await this.client.get(token);
    if (res) {
      return JSON.parse(res);
    }

    return null;
  }

  async setLastNativeTokenPrice(token: string, data: string): Promise<void> {
    await this.client.set(token, JSON.stringify(data));
  }
}
