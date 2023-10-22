import request, { gql } from "graphql-request";
import { Pool } from "../../model/graphData";
import { getGraphUrl } from "..";

export const getPoolsNextPages = async (networkId: number, lastTimeStamp?: number): Promise<Pool[]> => {
  const lastTimeStampQuery = (lastTimeStamp && " createdAtTimestamp_gte:  $lastTimeStamp ") || "";
  const url = getGraphUrl(networkId);
  let pools: Pool[] = [];
  try {
    await request<{ pools: Pool[] }>(
      url,
      gql`
          query getPoolsQuery($lastTimeStamp: Int) {
              pools(
                  first: 1000
                  orderBy: createdAtTimestamp
                  orderDirection: asc
                  where: ${"{" + lastTimeStampQuery + "}"}
              ) {
                  id
                  createdAtTimestamp
                  createdAtBlockNumber
                  token0 {id, name, decimals}
                  token1 {id, name, decimals}
              }
          }
      `,
      { lastTimeStamp }
    ).then((res) => {
      pools = res.pools;
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  }

  return pools;
};
