import { ChainId } from '@pancakeswap/chains'
import { Currency, ERC20Token } from '@pancakeswap/sdk'
import { CAKE } from '@pancakeswap/tokens'
import { tickToPrice } from '@pancakeswap/v3-sdk'
import BN, { BigNumber } from 'bignumber.js'
import chunk from 'lodash/chunk'
import { Address, PublicClient, formatUnits } from 'viem'
import { poolV3Abi as v3PoolAbi } from '../../blockchain/abi/PoolV3Abi'
import { chainlinkOracleABI } from '../../blockchain/abi/chainLinkOracleABI'
import { masterchefV3Abi } from '../../blockchain/abi/masterChefV3Abi'
import { getFarmApr } from './apr'
import { CHAIN_ID_TO_CHAIN_NAME, PriceHelper } from './common'
import { FarmV3SupportedChainId, supportedChainIdV3 } from './constants'
import { CommonPrice, ComputedFarmConfigV3, FarmV3Data, FarmV3DataWithPrice, Slot0 } from './types'

const BIG_ZERO = new BigNumber(0)

export async function farmV3FetchFarms({
  farms,
  provider,
  masterChefAddress,
  chainId,
  totalAllocPoint,
  commonPrice
}: {
  farms: ComputedFarmConfigV3[]
  provider: ({ chainId }: { chainId: number }) => PublicClient
  masterChefAddress: Address
  chainId: number
  totalAllocPoint: bigint
  commonPrice: CommonPrice
}) {
  const [poolInfos, cakePrice, v3PoolData] = await Promise.all([
    fetchPoolInfos(farms, chainId, provider, masterChefAddress),
    provider({ chainId: ChainId.BSC })
      .readContract({
        abi: chainlinkOracleABI,
        address: '0xB6064eD41d4f67e353768aA239cA86f4F73665a1',
        functionName: 'latestAnswer',
      })
      .then((res) => formatUnits(res, 8)),
    fetchV3Pools(farms, chainId, provider),
  ])

  const farmsData = farms
    .map((farm, index) => {
      const { token, quoteToken, ...f } = farm
      if (!v3PoolData[index][1]) {
        return null
      }
      return {
        ...f,
        token,
        quoteToken,
        ...getV3FarmsDynamicData({
            tick: v3PoolData[index][0][1],
            token0: farm.token,
            token1: farm.quoteToken,
          }),
        ...getFarmAllocation({
          allocPoint: poolInfos[index]?.[0],
          totalAllocPoint,
        }),
      }
    })
    .filter(Boolean) as FarmV3Data[]

  const combinedCommonPrice: CommonPrice = {
    ...commonPrice,
  }

  const farmsWithPrice = getFarmsPrices(farmsData, cakePrice, combinedCommonPrice)

  return farmsWithPrice
}

const getV3FarmsDynamicData = ({ token0, token1, tick }: { token0: ERC20Token; token1: ERC20Token; tick: number }) => {
      const tokenPriceVsQuote = tickToPrice(token0, token1, tick)
    
      return {
        tokenPriceVsQuote: tokenPriceVsQuote.toSignificant(6),
      }
    }

export async function fetchMasterChefV3Data({
  provider,
  masterChefAddress,
  chainId,
}: {
  provider: ({ chainId }: { chainId: number }) => PublicClient
  masterChefAddress: Address
  chainId: number
}): Promise<{
  poolLength: bigint
  totalAllocPoint: bigint
  latestPeriodCakePerSecond: bigint
}> {
  const [poolLength, totalAllocPoint, latestPeriodCakePerSecond] = await provider({ chainId }).multicall({
    contracts: [
      {
        address: masterChefAddress,
        abi: masterchefV3Abi,
        functionName: 'poolLength',
      },
      {
        address: masterChefAddress,
        abi: masterchefV3Abi,
        functionName: 'totalAllocPoint',
      },
      {
        address: masterChefAddress,
        abi: masterchefV3Abi,
        functionName: 'latestPeriodCakePerSecond',
      },
    ],
    allowFailure: false,
  })

  return {
    poolLength,
    totalAllocPoint,
    latestPeriodCakePerSecond,
  }
}

const fetchPoolInfos = async (
  farms: ComputedFarmConfigV3[],
  chainId: number,
  provider: ({ chainId }: { chainId: number }) => PublicClient,
  masterChefAddress: Address,
) => {
  try {
    const calls = farms.map(
      (farm) =>
        ({
          abi: masterchefV3Abi,
          address: masterChefAddress,
          functionName: 'poolInfo',
          args: [BigInt(farm.pid)] as const,
        } as const),
    )

    const masterChefMultiCallResult = await provider({ chainId }).multicall({
      contracts: calls,
      allowFailure: false,
    })

    let masterChefChunkedResultCounter = 0
    return calls.map((masterChefCall) => {
      if (masterChefCall === null) {
        return null
      }
      const data = masterChefMultiCallResult[masterChefChunkedResultCounter]
      masterChefChunkedResultCounter++
      return data
    })
  } catch (error) {
    console.error('MasterChef Pool info data error', error)
    throw error
  }
}
    
export const getCakeApr = (poolWeight: string, activeTvlUSD: BN, cakePriceUSD: string, cakePerSecond: string) => {
  return getFarmApr({
    poolWeight,
    tvlUsd: activeTvlUSD,
    cakePriceUsd: cakePriceUSD,
    cakePerSecond,
    precision: 6,
  })
}

const getFarmAllocation = ({ allocPoint, totalAllocPoint }: { allocPoint?: bigint; totalAllocPoint?: bigint }) => {
  const _allocPoint = typeof allocPoint !== 'undefined' ? new BN(allocPoint.toString()) : BIG_ZERO
  const poolWeight = !!totalAllocPoint && !_allocPoint.isZero() ? _allocPoint.div(totalAllocPoint.toString()) : BIG_ZERO

  return {
    poolWeight: poolWeight.toString(),
    multiplier: !_allocPoint.isZero() ? `${+_allocPoint.div(10).toString()}X` : `0X`,
  }
}

async function fetchV3Pools(
  farms: ComputedFarmConfigV3[],
  chainId: number,
  provider: ({ chainId }: { chainId: number }) => PublicClient,
) {
  const v3PoolCalls = farms.flatMap(
    (f) =>
      [
        {
          abi: v3PoolAbi,
          address: f.lpAddress,
          functionName: 'slot0',
        },
        {
          abi: v3PoolAbi,
          address: f.lpAddress,
          functionName: 'lmPool',
        },
      ] as const,
  )

  const chunkSize = v3PoolCalls.length / farms.length
  const resp = await provider({ chainId }).multicall({
    contracts: v3PoolCalls,
    allowFailure: false,
  })

  return chunk(resp, chunkSize) as [Slot0, Address][]
}

export const fetchCommonTokenUSDValue = async (priceHelper?: PriceHelper): Promise<CommonPrice> => {
      return fetchTokenUSDValues(priceHelper?.list || [])
    }
    
    export const fetchTokenUSDValues = async (currencies: Currency[] = []): Promise<CommonPrice> => {
      const commonTokenUSDValue: CommonPrice = {}
      if (!supportedChainIdV3.includes(currencies[0]?.chainId)) {
        return commonTokenUSDValue
      }
    
      if (currencies.length > 0) {
        const list = currencies
          .map(
            (currency) =>
              `${CHAIN_ID_TO_CHAIN_NAME[currency.chainId as FarmV3SupportedChainId]}:${currency.wrapped.address}`,
          )
          .join(',')
        const result: { coins: { [key: string]: { price: string } } } = await fetch(
          `https://coins.llama.fi/prices/current/${list}`,
        ).then((res) => res.json())
    
        Object.entries(result.coins || {}).forEach(([key, value]) => {
          const [, address] = key.split(':')
          commonTokenUSDValue[address] = value.price
        })
      }
    
      return commonTokenUSDValue
    }

    
    export function getFarmsPrices(
      farms: FarmV3Data[],
      cakePriceUSD: string,
      commonPrice: CommonPrice,
    ): FarmV3DataWithPrice[] {
      const commonPriceFarms = farms.map((farm) => {
        let tokenPriceBusd = BIG_ZERO
        let quoteTokenPriceBusd = BIG_ZERO
    
        // try to get price via common price
        if (commonPrice[farm.quoteToken.address]) {
          quoteTokenPriceBusd = new BN(commonPrice[farm.quoteToken.address])
        }
        if (commonPrice[farm.token.address]) {
          tokenPriceBusd = new BN(commonPrice[farm.token.address])
        }
    
        // try price via CAKE
        if (
          tokenPriceBusd.isZero() &&
          farm.token.chainId in CAKE &&
          farm.token.equals(CAKE[farm.token.chainId as keyof typeof CAKE])
        ) {
          tokenPriceBusd = new BN(cakePriceUSD)
        }
        if (
          quoteTokenPriceBusd.isZero() &&
          farm.quoteToken.chainId in CAKE &&
          farm.quoteToken.equals(CAKE[farm.quoteToken.chainId as keyof typeof CAKE])
        ) {
          quoteTokenPriceBusd = new BN(cakePriceUSD)
        }
    
        // try to get price via token price vs quote
        if (tokenPriceBusd.isZero() && !quoteTokenPriceBusd.isZero() && farm.tokenPriceVsQuote) {
          tokenPriceBusd = quoteTokenPriceBusd.times(farm.tokenPriceVsQuote)
        }
        if (quoteTokenPriceBusd.isZero() && !tokenPriceBusd.isZero() && farm.tokenPriceVsQuote) {
          quoteTokenPriceBusd = tokenPriceBusd.div(farm.tokenPriceVsQuote)
        }
    
        return {
          ...farm,
          tokenPriceBusd,
          quoteTokenPriceBusd,
        }
      })
    
      return commonPriceFarms.map((farm) => {
        let { tokenPriceBusd, quoteTokenPriceBusd } = farm
        // if token price is zero, try to get price from existing farms
        if (tokenPriceBusd.isZero()) {
          const ifTokenPriceFound = commonPriceFarms.find(
            (f) =>
              (farm.token.equals(f.token) && !f.tokenPriceBusd.isZero()) ||
              (farm.token.equals(f.quoteToken) && !f.quoteTokenPriceBusd.isZero()),
          )
          if (ifTokenPriceFound) {
            tokenPriceBusd = farm.token.equals(ifTokenPriceFound.token)
              ? ifTokenPriceFound.tokenPriceBusd
              : ifTokenPriceFound.quoteTokenPriceBusd
          }
          if (quoteTokenPriceBusd.isZero()) {
            const ifQuoteTokenPriceFound = commonPriceFarms.find(
              (f) =>
                (farm.quoteToken.equals(f.token) && !f.tokenPriceBusd.isZero()) ||
                (farm.quoteToken.equals(f.quoteToken) && !f.quoteTokenPriceBusd.isZero()),
            )
            if (ifQuoteTokenPriceFound) {
              quoteTokenPriceBusd = farm.quoteToken.equals(ifQuoteTokenPriceFound.token)
                ? ifQuoteTokenPriceFound.tokenPriceBusd
                : ifQuoteTokenPriceFound.quoteTokenPriceBusd
            }
    
            // try to get price via token price vs quote
            if (tokenPriceBusd.isZero() && !quoteTokenPriceBusd.isZero() && farm.tokenPriceVsQuote) {
              tokenPriceBusd = quoteTokenPriceBusd.times(farm.tokenPriceVsQuote)
            }
            if (quoteTokenPriceBusd.isZero() && !tokenPriceBusd.isZero() && farm.tokenPriceVsQuote) {
              quoteTokenPriceBusd = tokenPriceBusd.div(farm.tokenPriceVsQuote)
            }
    
            if (tokenPriceBusd.isZero()) {
              console.error(`Can't get price for ${farm.token.address}`)
            }
            if (quoteTokenPriceBusd.isZero()) {
              console.error(`Can't get price for ${farm.quoteToken.address}`)
            }
          }
        }
    
        return {
          ...farm,
          tokenPriceBusd: tokenPriceBusd.toString(),
          // adjust the quote token price by the token price vs quote
          quoteTokenPriceBusd:
            !quoteTokenPriceBusd.isZero() && farm.tokenPriceVsQuote
              ? tokenPriceBusd.div(farm.tokenPriceVsQuote).toString()
              : quoteTokenPriceBusd.toString(),
        }
      })
    }