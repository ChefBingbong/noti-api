import { gql, request, Variables } from "graphql-request";
import { UserPosition } from "../../model/graphData";
import { getGraphUrl } from "..";
import { createPoolQueryName } from "../../util/pool";

export type TickRange = "tickLower" | "tickUpper";

export type BatchPools = {
  poolId: string;
  tick: number;
  tickRangeOut: TickRange;
  lastTimeStamp?: number;
};

export interface BatchRequestQueryAndVars {
  query: string;
  variables: Variables;
}

export function getBatchRequestQueryAndVars(batchPools: BatchPools[]): BatchRequestQueryAndVars {
  const variables: Variables = {};
  let query = "query(";
  let subQuery = "";

  batchPools.forEach((batchPool) => {
    const { poolId, tick, tickRangeOut, lastTimeStamp } = batchPool;
    const poolIdVar = `poolId${poolId}`;
    const tickVar = `tick${poolId}`;
    const lastTimeStampVar = `lastTimeStamp${poolId}`;

    variables[poolIdVar] = poolId;
    variables[tickVar] = tick;
    variables[lastTimeStampVar] = lastTimeStamp;

    query += `$${poolIdVar}: String, $${tickVar}: Int, $${lastTimeStampVar}: Int,`;
    subQuery += userPositionsSubQuery(poolId, tickRangeOut, tick, lastTimeStamp);
  });

  query = `${query.slice(0, -1)}) { ${subQuery} }`;

  return { query, variables };
}

function userPositionsSubQuery(poolId: string, tickRangeOut: TickRange, tick: number, lastTimeStamp?: number): string {
  const tickQuery = ` ${tickRangeOut === "tickLower" ? "tickLower_gt" : "tickUpper_lt"}: $tick${poolId} `;
  const lastTimeStampQuery = lastTimeStamp ? ` createdAtTimestamp_gte: $lastTimeStamp${poolId} ` : "";

  return gql`${createPoolQueryName(poolId, tick)}: userPositions(
    first: 1000
    orderBy: createdAtTimestamp
    orderDirection: asc
    where: ${"{" + ` liquidity_gt: 0 pool: $poolId${poolId} ` + tickQuery + lastTimeStampQuery + "}"}
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
  }\n`;
}

export async function getBatchUserPositionOutOfRange(
  networkId: number,
  batchPools: BatchPools[]
): Promise<Map<string, UserPosition[]>> {
  const url = getGraphUrl(networkId);
  const { query, variables } = getBatchRequestQueryAndVars(batchPools);
  let response: Object = {}
  try {
   response = await request<Object>(url, query, variables);
  }catch(error) {
    console.log(error)
  }

  return new Map(Object.entries(response));
}
