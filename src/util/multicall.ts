import { MultiCallService } from "@1inch/multicall";
import { Web3ProviderConnector } from "@1inch/multicall/connector";
import { MultiCallParams } from "@1inch/multicall/model";
import { lotteryV2ABI } from "../blockchain/abi/lotteryV2ABI";
import Web3 from "web3";

const params: MultiCallParams = {
  chunkSize: 10,
  retriesLimit: 3,
  blockNumber: "latest",
};

export default async function TokenMulticall(winningTickets: any[]) {
  const chainProvider = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org"));

  const MulticallProvider = new Web3ProviderConnector(chainProvider as any);
  const multicallService = new MultiCallService(MulticallProvider, "0x804708de7af615085203fa2b18eae59c5738e2a9");
  //   const newAbi: Omit<keyof typeof lotteryV2ABI, 'readonly'> = lotteryV2ABI
  const cakeRewards = await multicallService.callByChunks(
    winningTickets.map((winningTicket) => {
      const { roundId, id, rewardBracket } = winningTicket;
      return {
        to: "0x5aF6D33DE2ccEC94efb1bDF8f92Bd58085432d2c",
        data: MulticallProvider.contractEncodeABI(
          lotteryV2ABI as any,
          "0x5aF6D33DE2ccEC94efb1bDF8f92Bd58085432d2c",
          "viewRewardsForTicketId",
          [BigInt(roundId), BigInt(id), rewardBracket]
        ),
      };
    }),
    params
  );

  return cakeRewards;
}
