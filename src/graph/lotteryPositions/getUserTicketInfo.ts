import { Web3Provider } from "@ethersproject/providers";
import { ethers, providers } from "ethers";
import { lotteryV2ABI } from "../../blockchain/abi/lotteryV2ABI";
import { returnContract } from "../../util/getContract";
import TokenMulticall from "../../util/multicall";
import { LotteryTicket } from "../index";

import { GetWinningTicketsResult } from "../../model/graphData";
import { chainlinkOracleABI } from "../../blockchain/abi/chainLinkOracleABI";

const TICKET_LIMIT_PER_REQUEST = 2500;

export const viewUserInfoForLotteryId = async (
  account: string,
  lotteryId: string,
  cursor: number,
  perRequestLimit: number,
  provider: providers.JsonRpcProvider
): Promise<LotteryTicket[]> => {
  try {
    const lotteryContract = returnContract(
      "0x5aF6D33DE2ccEC94efb1bDF8f92Bd58085432d2c",
      lotteryV2ABI,
      provider as Web3Provider
    );
    const data = await lotteryContract?.viewUserInfoForLotteryId(
      account,
      BigInt(lotteryId),
      BigInt(cursor),
      BigInt(perRequestLimit)
    );
 
    const [ticketIds, ticketNumbers, ticketStatuses] = data;

    if (ticketIds?.length > 0) {
      return ticketIds.map((ticketId: any, index: number) => {
        return {
          id: ticketId.toString(),
          number: ticketNumbers[index].toString(),
          status: ticketStatuses[index],
        };
      });
    }
    return [];
  } catch (error) {
    console.error("viewUserInfoForLotteryId", error);
    return [];
  }
};

export const fetchUserTicketsForOneRound = async (
  account: string,
  lotteryId: string,
  finalNumber: string,
  provider: providers.JsonRpcProvider
) => {
  let cursor = 0;
  let numReturned = TICKET_LIMIT_PER_REQUEST;
  const ticketData = [] as LotteryTicket[];

  while (numReturned === TICKET_LIMIT_PER_REQUEST) {
    const response = await viewUserInfoForLotteryId(account, lotteryId, cursor, TICKET_LIMIT_PER_REQUEST, provider);
    cursor += TICKET_LIMIT_PER_REQUEST;
    numReturned = response.length;
    ticketData.push(...response);
  }
  const winningTickets = await getWinningTickets({
    roundId: lotteryId,
    userTickets: ticketData,
    finalNumber,
  });
  return { cakeTotal: winningTickets?.cakeTotal, winningTickets: winningTickets?.allWinningTickets };
};

const getRewardBracketByNumber = (ticketNumber: string, finalNumber: string): number => {
  const ticketNumAsArray = ticketNumber.split("").reverse();
  const winningNumsAsArray = finalNumber.split("").reverse();
  const matchingNumbers = [] as string[];

  for (let index = 0; index < winningNumsAsArray.length - 1; index++) {
    if (ticketNumAsArray[index] !== winningNumsAsArray[index]) break;
    matchingNumbers.push(ticketNumAsArray[index]);
  }
  const rewardBracket = matchingNumbers.length - 1;
  return rewardBracket;
};

export const getWinningTickets = async (roundDataAndUserTickets: {
  roundId: string;
  userTickets: any[];
  finalNumber: string;
}): Promise<GetWinningTicketsResult> => {
  const { roundId, userTickets, finalNumber } = roundDataAndUserTickets;
  const ticketsWithRewardBrackets = userTickets.map((ticket) => {
    return {
      roundId,
      id: ticket.id,
      number: ticket.number,
      status: ticket.status,
      rewardBracket: getRewardBracketByNumber(ticket.number, finalNumber),
    };
  });

  const allWinningTickets = ticketsWithRewardBrackets.filter((ticket) => {
    return ticket.rewardBracket >= 0;
  });
  const unclaimedWinningTickets = allWinningTickets.filter((ticket) => {
    return !ticket.status;
  });

  if (unclaimedWinningTickets.length > 0) {
    const cakeTotal = await TokenMulticall(unclaimedWinningTickets);
    return { allWinningTickets, cakeTotal, roundId };
  }

  if (allWinningTickets.length > 0) {
    return { allWinningTickets, cakeTotal: null, roundId };
  }

  return {} as GetWinningTicketsResult;
};

export const getCakePriceFromOracle = async (provider: providers.JsonRpcProvider): Promise<number> => {
  try {
    const oracleContract = returnContract(
      "0xB6064eD41d4f67e353768aA239cA86f4F73665a1",
      chainlinkOracleABI,
      provider as Web3Provider
    );
    if (!oracleContract) {
      throw new Error("failed to get orale contract");
    }

    const data = await oracleContract.latestAnswer();
    const cakePrice = Number(Number(ethers.utils.formatUnits(data, "8")).toFixed(2));
    return cakePrice;
  } catch (error) {
    console.error("viewUserInfoForLotteryId", error);
    return 0;
  }
};

export const getLotteryPrizeInCake = async (
  lotteryId: string,
  provider: providers.JsonRpcProvider
): Promise<{ totalPrizeInUsd: number; prizeAmountInCake: number }> => {
  try {
    const lotteryContract = returnContract(
      "0x5aF6D33DE2ccEC94efb1bDF8f92Bd58085432d2c",
      lotteryV2ABI,
      provider as Web3Provider
    );
    if (!lotteryContract) {
      throw new Error("failed to get orale contract");
    }

    const data = await lotteryContract.viewLottery(BigInt(lotteryId));
    const prizeAmountInCake = Number(Number(ethers.utils.formatEther(data.amountCollectedInCake)).toFixed(1));
    const cakePrice = await getCakePriceFromOracle(provider);
    const totalPrizeInUsd = cakePrice * prizeAmountInCake;
    return { totalPrizeInUsd, prizeAmountInCake };
  } catch (error) {
    console.error("viewUserInfoForLotteryId", error);
    return { totalPrizeInUsd: 0, prizeAmountInCake: 0 };
  }
};

// getCakePriceFromOracle();
