import request, { gql } from "graphql-request";
import {
  GetPredictionUsersOptions,
  PredictionRound,
  PredictionRoundsData,
  PredictionUsersResponse,
  UserRound,
} from "..";
import { getUserBaseFields } from "./utils/queries";

export const GRAPH_API_PREDICTION_BNB = "https://api.thegraph.com/subgraphs/name/pancakeswap/prediction-v2";
export const GRAPH_API_PREDICTION_CAKE = "https://api.thegraph.com/subgraphs/name/pancakeswap/prediction-cake";

const defaultPredictionUserOptions = {
  skip: 0,
  first: 1000,
  orderBy: "createdAt",
  orderDir: "desc",
};

export const getPredictionUsers = async (
  options: GetPredictionUsersOptions = {},
  tokenSymbol: string,
  api: string,
  accounts: string[]
): Promise<UserRound[]> => {
  const { first, skip, where, orderBy, orderDir } = { ...defaultPredictionUserOptions, ...options };
  const response: PredictionUsersResponse = (await request(
    api,
    gql`
          query getUsers($first: Int!, $skip: Int!, $where: User_filter, $orderBy: User_orderBy, $orderDir: OrderDirection, $account: [ID!]!) {
            users(first: $first, skip: $skip, where: { id_in: $account }, orderBy: $orderBy, orderDirection: $orderDir) {
              ${getUserBaseFields(tokenSymbol)}
            }
          }
        `,
    {
      first,
      skip,
      where,
      orderBy,
      orderDir,
      account: accounts,
    }
  )) as any;

  return response.users;
};

export const getPredictionRoundsWinners = async (api: string): Promise<PredictionRound[]> => {
  const response: PredictionRoundsData = (await request(
    api,
    gql`
      query GetPredictionRounds {
        rounds(last: 5, orderBy: startAt, orderDirection: desc) {
          id
          epoch
          startAt
          bets {
            id
            user {
              id
            }
            amount
            claimed
          }
        }
      }
    `
  )) as any;

  return response.rounds;
};

// const usersResponse = getPredictionRoundsWinners(GRAPH_API_PREDICTION_CAKE);
// const usersResponse = getPredictionUsers(
//       {
//         skip: 0,
//         orderBy: "createdAt",
//         where: {},
//       },
//       "CAKE",
//       GRAPH_API_PREDICTION_CAKE,
//       ["0x356c5fA625F89481a76d9f7Af4eD866CD8c6CB4B"]
//     );