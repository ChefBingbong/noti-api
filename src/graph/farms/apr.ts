import BN from 'bignumber.js'
import { formatFraction, parseNumberToFraction } from './utils'

export const BSC_BLOCK_TIME = 3
export const CAKE_PER_BLOCK = 40
export const BLOCKS_PER_DAY = (60 / BSC_BLOCK_TIME) * 60 * 24
export const BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365 // 10512000

type BigNumberish = BN | number | string

interface FarmAprParams {
  poolWeight: BigNumberish
  // Total tvl staked in farm in usd
  tvlUsd: BigNumberish
  cakePriceUsd: BigNumberish
  cakePerSecond: BigNumberish

  precision?: number
}

const SECONDS_FOR_YEAR = 365 * 60 * 60 * 24

const isValid = (num: BigNumberish) => {
  const bigNumber = new BN(num)
  return bigNumber.isFinite() && bigNumber.isPositive()
}

const formatNumber = (bn: BN, precision: number) => {
  return formatFraction(parseNumberToFraction(bn.toNumber(), precision), precision)
}

export function getFarmApr({ poolWeight, tvlUsd, cakePriceUsd, cakePerSecond, precision = 6 }: FarmAprParams) {
  if (!isValid(poolWeight) || !isValid(tvlUsd) || !isValid(cakePriceUsd) || !isValid(cakePerSecond)) {

    return '0'
  }

  const cakeRewardPerYear = new BN(cakePerSecond).times(SECONDS_FOR_YEAR)
  const farmApr = new BN(poolWeight).times(cakeRewardPerYear).times(cakePriceUsd).div(tvlUsd).times(100)

  if (farmApr.isZero()) {
    return '0'
  }

  return formatNumber(farmApr, precision)
}

export default null
