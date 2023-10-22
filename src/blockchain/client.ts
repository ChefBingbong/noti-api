import { ChainId } from "@pancakeswap/chains";
import { ethers } from "ethers";
import { Chain, Client, PublicClient, createPublicClient, http } from "viem";
import { CHAINS } from "../util/chains";

export type viemAddress = `0x${string}`;

const createClients = <TClient extends Client>(chains: Chain[]): Record<ChainId, TClient> => {
  return chains.reduce((prev, cur) => {
    const clientConfig = { chain: cur, transport: http() };
    const client = createPublicClient(clientConfig);
    return {
      ...prev,
      [cur.id]: client,
    };
  }, {} as Record<ChainId, TClient>);
};

const publicClients = createClients<PublicClient>(CHAINS);

export const getViemClient = ({ chainId }: { chainId?: ChainId }) => {
  return publicClients[chainId!];
};

export const getEthersClient = (networkId: number) => {
  switch (networkId) {
    case 56:
      return new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    case 97:
      return new ethers.providers.JsonRpcProvider("https://bsc-testnet.publicnode.com");
    case 5:
      return new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/28b4ddb00ce5496394ed6259bf810b99");
    case 1:
      return new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
    default:
      return new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
  }
};
