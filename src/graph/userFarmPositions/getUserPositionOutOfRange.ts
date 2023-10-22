import request, { gql } from "graphql-request";
import { UserPosition } from "../../model/graphData";
import { getGraphUrl, UserPositionsResponse } from "..";

//let alertFlag = userPositionLiquidity > 0 && (userPosition.tickLower > SwapEventData.tick ||  userPosition.tickUpper < SwapEventData.tick)
const getUserPositionOutOfRangeNextPages = async (
  networkId: number,
  poolId: string,
  tick: number,
  tickRangeOut: "tickLower" | "tickUpper",
  lastTimeStamp?: number
): Promise<UserPosition[]> => {
  const tickQuery = ` ${tickRangeOut === "tickLower" ? "tickLower_gt" : "tickUpper_lt"}: $tick `;
  const lastTimeStampQuery = (lastTimeStamp && " createdAtTimestamp_gte:  $lastTimeStamp ") || "";
  const url = getGraphUrl(networkId);
  const { userPositions } = await request<UserPositionsResponse>(
    url,
    gql`
        query getUserPositionsQuery($poolId: String, $tick: Int, $lastTimeStamp: Int) {
            userPositions(
                first: 1000
                orderBy: createdAtTimestamp
                orderDirection: asc
                where: ${"{" + " liquidity_gt: 0 pool: $poolId " + tickQuery + lastTimeStampQuery + "}"}
            ) {
                id
                pool {
                    id
                    token0 {id, name, decimals}
                    token1 {id, name, decimals}
                }
                owner
                liquidity
                tickLower
                tickUpper
                createdAtBlockNumber
                createdAtTimestamp
            }
        }
    `,
    { poolId, tick, lastTimeStamp }
  );

  return userPositions;
};

export const iteratePoolUserPositions = async (networkId: number, pool: string, tick: number | null) => {
  if (tick !== null) {
    let tickLowerResults: UserPosition[] = await getUserPositionOutOfRangeNextPages(
      networkId,
      pool,
      tick,
      "tickLower"
    );
    let allTickLowerFetched = tickLowerResults.length < 1000;
    while (!allTickLowerFetched) {
      const lastTimestamp = Number(tickLowerResults[tickLowerResults.length - 1].createdAtTimestamp);
      const nextPage = await getUserPositionOutOfRangeNextPages(networkId, pool, tick, "tickLower", lastTimestamp);
      tickLowerResults = tickLowerResults.concat(nextPage);
      if (nextPage.length < 1000) {
        allTickLowerFetched = true;
      }
    }

    let tickUpperResults: UserPosition[] = await getUserPositionOutOfRangeNextPages(
      networkId,
      pool,
      tick,
      "tickUpper"
    );
    let allTickUpperFetched = tickUpperResults.length < 1000;
    while (!allTickUpperFetched) {
      const lastTimestamp = Number(tickUpperResults[tickUpperResults.length - 1].createdAtTimestamp);
      const nextPage = await getUserPositionOutOfRangeNextPages(networkId, pool, tick, "tickUpper", lastTimestamp);
      tickUpperResults = tickUpperResults.concat(nextPage);
      if (nextPage.length < 1000) {
        allTickUpperFetched = true;
      }
    }
  }
};
