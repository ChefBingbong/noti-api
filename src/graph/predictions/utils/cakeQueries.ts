export interface UserResponse<BetType> {
      id: string
      createdAt: string
      updatedAt: string
      block: string
      totalBets: string
      totalBetsBull: string
      totalBetsBear: string
      totalBetsClaimed: string
      winRate: string
      averageBNB: string
      bets: BetType[]
    }
    
    export interface BetResponse {
      id: string
      hash: string
      amount: string
      position: string
      claimed: boolean
      claimedAt: string
      claimedBlock: string
      claimedHash: string
      createdAt: string
      updatedAt: string
      block: string
    }
    export interface RoundResponse<BetType> {
      id: string
      epoch: string
      position: string
      failed: boolean
      startAt: string
      startBlock: string
      startHash: string
      lockAt: string
      lockBlock: string
      lockHash: string
      lockPrice: string
      lockRoundId: string
      closeAt: string
      closeBlock: string
      closeHash: string
      closePrice: string
      closeRoundId: string
      totalBets: string
      totalAmount: string
      bullBets: string
      bullAmount: string
      bearBets: string
      bearAmount: string
      bets: BetType[]
    }
export interface UserResponseCAKE extends UserResponse<BetResponseCAKE> {
  totalCAKE: string
  totalCAKEBull: string
  totalCAKEBear: string
  averageCAKE: string
  totalCAKEClaimed: string
  netCAKE: string
}

export interface BetResponseCAKE extends BetResponse {
  claimedCAKE: string
  claimedNetCAKE: string
  user?: UserResponseCAKE
  round?: RoundResponseCAKE
}

export type RoundResponseCAKE = RoundResponse<BetResponseCAKE>

/**
 * Base fields are the all the top-level fields available in the api. Used in multiple queries
 */
export const roundBaseFields = `
  id
  epoch
  position
  failed
  startAt
  startBlock
  startHash
  lockAt
  lockBlock
  lockHash
  lockPrice
  lockRoundId
  closeAt
  closeBlock
  closeHash
  closePrice
  closeRoundId
  totalBets
  totalAmount
  bullBets
  bullAmount
  bearBets
  bearAmount
`
export const betBaseFields = `
 id
 hash  
 amount
 position
 claimed
 claimedAt
 claimedHash
 claimedBlock
 claimedCAKE
 claimedNetCAKE
 createdAt
 updatedAt
 round {${roundBaseFields}}
`

export const userBaseFields = `
  id
  createdAt
  updatedAt
  block
  totalBets
  totalBetsBull
  totalBetsBear
  totalCAKE
  totalCAKEBull
  totalCAKEBear
  totalBetsClaimed
  totalCAKEClaimed
  winRate
  averageCAKE
  netCAKE
  bets {${betBaseFields}}
`
