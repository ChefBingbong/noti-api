import { poolV3Abi } from "../blockchain/abi/PoolV3Abi";
import { getViemClient, viemAddress } from "../blockchain/client";

export const getPoolTick = async (networkId: number, poolAddresses: viemAddress[]): Promise<(number | null)[]> => {
  const client = getViemClient(networkId);
  const responses = await client.multicall({
    contracts: poolAddresses.map((poolAddress) => ({
      address: poolAddress,
      abi: poolV3Abi,
      functionName: "slot0",
    })),
  });

  return responses.map((response) => (response.result ? (response.result.at(1) as number) : null));
};
