import axios from "axios";
import { redisClient } from "../init";

export const fetchTokenUSDPrice = async (token: string): Promise<number> => {
  const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`);
  return response.data[token].usd;
};

export const fetchMultipleTokenUSDPrice = async (tokens: string[]): Promise<{ [token: string ]: number }> => {
  const idstr = tokens.join(',')   
  const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${idstr}&vs_currencies=usd`);
  const tokenPriceMap: { [token: string ]: number } = {}
  tokens.forEach((token: string) => tokenPriceMap[token] = response.data[token].usd)
  return tokenPriceMap
};
