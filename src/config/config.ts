import { config } from 'dotenv';
import * as z from 'zod';

config()

const envsSchema = z.object({
  NODE_ENV: z.enum(['production', 'development']),
  PORT: z.string().default('8000'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_HOST: z.string({ required_error: "Host required for redis server"}).nonempty(),
  REDIS_USERNAME: z.string({ required_error: "Username required for redis server"}).nonempty(),
  REDIS_PASSWORD: z.string({ required_error: "Password required for redis server"}).nonempty(),
  REDIS_TSL: z.string().optional(),
  USER_POSITION_V3_ETH_SUBGRAPH: z.string({ required_error: "Eth mainnet graph required"}).nonempty(),
  USER_POSITION_V3_BSC_SUBGRAPH: z.string({ required_error: "Bsc mainnet graph required"}).nonempty(),
  USER_POSITION_V3_GOERLI_SUBGRAPH: z.string().nullable(),
  USER_POSITION_V3_CHAPEL_SUBGRAPH: z.string().nullable(),
  LOG_LOCAL_FORMAT: z.boolean().nullable(),
  WEB_PUSH_PRIVATE_KEY: z.string({ required_error: "WEB_PUSH_PRIVATE_KEY required for url signing"}).nonempty(),
  WEB_PUSH_PUBLIC_KEY: z.string({ required_error: "WEB_PUSH_PUBLIC_KEY required for url signing"}).nonempty(),
  ENCRYPTION_SECRET_KEY:  z.string({ required_error: "secret key required decryption"}).nonempty(),
  IV:  z.string({ required_error: "initialization vector required decryption"}).nonempty(),
  WALLET_CONNECT_SECRET_KEY: z.string({ required_error: "Wallet connect secret required for url signing"}).nonempty(),
  WALLET_CONNECT_API_KEY: z.string({ required_error: "Wallet connect api key required for url signing"}).nonempty(),
  SECURE_TOKEN: z.string({ required_error: "secure token required for url signing"}).nonempty(),
}).nonstrict();

const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_USERNAME: process.env.REDIS_USERNAME,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_TSL: process.env.REDIS_TSL,
  USER_POSITION_V3_ETH_SUBGRAPH: process.env.USER_POSITION_V3_ETH_SUBGRAPH,
  USER_POSITION_V3_BSC_SUBGRAPH: process.env.USER_POSITION_V3_BSC_SUBGRAPH,
  USER_POSITION_V3_GOERLI_SUBGRAPH: process.env.USER_POSITION_V3_GOERLI_SUBGRAPH,
  USER_POSITION_V3_CHAPEL_SUBGRAPH: process.env.USER_POSITION_V3_CHAPEL_SUBGRAPH,
  LOG_LOCAL_FORMAT: process.env.LOG_LOCAL_FORMAT === 'true' ? true : null,
  WEB_PUSH_PRIVATE_KEY: process.env.WEB_PUSH_PRIVATE_KEY,
  WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY,
  ENCRYPTION_SECRET_KEY: process.env.ENCRYPTION_SECRET_KEY ?? '',
  IV: process.env.IV ?? '',
  WALLET_CONNECT_SECRET_KEY: process.env.WALLET_CONNECT_SECRET_KEY ?? '',
  WALLET_CONNECT_API_KEY: process.env.WALLET_CONNECT_API_KEY,
  SECURE_TOKEN: process.env.SECURE_TOKEN

};

try {
  const validatedEnvs = envsSchema.parse(envVars);
  console.log(validatedEnvs);
} catch (error) {
  console.error('Error validating environment variables:', error);
}

// Define the type for the exported object
type EnvConfig = {
  env: string | undefined;
  port: string | undefined;
  redisPort: string | undefined;
  redisHost: string | undefined;
  redisUsername: string | undefined;
  redisPassword: string | undefined;
  userPositionV3EthSubgraph: string | undefined;
  userPositionV3BscSubgraph: string | undefined;
  userPositionV3GoerliSubgraph: string | undefined;
  userPositionV3ChapelSubgraph: string | undefined;
  logLocalFormat: boolean | null;
  webPushPrivateKey: string | undefined,
  webPushPublicKey:string | undefined,
  encryptionSecretKey: string,
  iv: string,
  walletConnectSecretKey: string
  walletConnectApiKey: string | undefined
  secureToken: string | undefined
  redisTsl: string | undefined;
};

// map env vars and make it visible outside module
const appConfig: EnvConfig = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  redisPort: envVars.REDIS_PORT,
  redisHost: envVars.REDIS_HOST,
  redisUsername: envVars.REDIS_USERNAME,
  redisPassword: envVars.REDIS_PASSWORD,
  userPositionV3EthSubgraph: envVars.USER_POSITION_V3_ETH_SUBGRAPH,
  userPositionV3BscSubgraph: envVars.USER_POSITION_V3_BSC_SUBGRAPH,
  userPositionV3GoerliSubgraph: envVars.USER_POSITION_V3_GOERLI_SUBGRAPH,
  userPositionV3ChapelSubgraph: envVars.USER_POSITION_V3_CHAPEL_SUBGRAPH,
  logLocalFormat: envVars.LOG_LOCAL_FORMAT,
  webPushPrivateKey: envVars.WEB_PUSH_PRIVATE_KEY,
  webPushPublicKey: envVars.WEB_PUSH_PUBLIC_KEY,
  encryptionSecretKey: envVars.ENCRYPTION_SECRET_KEY,
  iv: envVars.IV,
  walletConnectSecretKey: envVars.WALLET_CONNECT_SECRET_KEY,
  walletConnectApiKey: envVars.WALLET_CONNECT_API_KEY,
  secureToken: envVars.SECURE_TOKEN,
  redisTsl: envVars.REDIS_TSL,
};

export default appConfig;
