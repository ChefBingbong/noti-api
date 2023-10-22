import BigNumber from "bignumber.js"
import { getEthersClient, getViemClient } from "./blockchain/client"
import { farmsV3ConfigChainMap } from "./graph/farms/constants"
import { createFarmFetcherV3 } from "./graph/farms/farmFetcher"
import { fetchCommonTokenUSDValue, getCakeApr } from "./graph/farms/fetchV3Farms"
import { TvlMap } from "./graph/farms/types"
import fetchWithTimeout from "./util/fetchWithTimeout"
import { getCakePriceFromOracle } from "./graph/lotteryPositions/getUserTicketInfo"
import { priceHelperTokens } from "./graph/farms/common"
const farmFetcherV3 = createFarmFetcherV3(getViemClient)
const id = [1, 1]
const farmss = [farmsV3ConfigChainMap[1], farmsV3ConfigChainMap[1]]
farmss.forEach((farms, index) => {
fetchCommonTokenUSDValue(priceHelperTokens[id[index]]).then((r) => {
farmFetcherV3.fetchFarms({
  chainId: id[index],
  farms,
  commonPrice: r
}).then(async(res) => {
  const tvls: TvlMap = {}

  const results = await Promise.allSettled(
    res.farmsWithPrice.map((f) =>
      fetchWithTimeout(`https://farms-api.pancakeswap.com/v3/${id[index]}/liquidity/${f.lpAddress}`)
        .then((r) => r.json())
        .catch((err) => {
          console.error(err)
          throw err
        }),
    ),
  )

  results.forEach((r, i) => {
    tvls[res.farmsWithPrice[i].lpAddress] =
      r.status === 'fulfilled' ? { ...r.value.formatted, updatedAt: r.value.updatedAt } : null
  })
  // const aprs = 
//   {
//     pid: 13,
//     lpAddress: '0x7524Fe020EDcD072EE98126b49Fa65Eb85F8C44C',
//     token0: [ERC20Token],
//     token1: [ERC20Token],
//     feeAmount: 2500,
//     lpSymbol: 'STG-USDC LP',
//     token: [ERC20Token],
//     quoteToken: [ERC20Token],
//     poolWeight: '0.06734460233012324062',
//     multiplier: '200X'
//   }
// ],
// cakePerSecond: '0.09246015856234875345',
// totalAllocPoint: '29698'
// }
const mockApr = false
  const cakePrice = new BigNumber(await getCakePriceFromOracle(getEthersClient(56)))
  const farmWithPriceAndCakeAPR = res.farmsWithPrice.map((f) => {
    if (!tvls[f.lpAddress]) {
      return f
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tvl = tvls[f.lpAddress]!
    // Mock 1$ tvl if the farm doesn't have lp staked
   
    const { activeTvlUSD, activeTvlUSDUpdatedAt, cakeApr } = farmFetcherV3.getCakeAprAndTVL(
      f,
      tvl,
      cakePrice.toString(),
      res.cakePerSecond,
    )

    return {
      ...farms,
      cakeApr: Number(cakeApr),
      activeTvlUSD,
      activeTvlUSDUpdatedAt,
    }
  })
  // const tvl = new BigNumber(tvls['0x7524Fe020EDcD072EE98126b49Fa65Eb85F8C44C'].).times(lpTVL.token0).plus(new BigNumber(token1Price).times(lpTVL.token1))
  // const cakeApr = getCakeApr('0.06734460233012324062', tvls['0x7524Fe020EDcD072EE98126b49Fa65Eb85F8C44C'] as any, cakePrice.toString(), '0.09246015856234875345')

  //@ts-ignore
  console.log(farmWithPriceAndCakeAPR)
})
})
})
