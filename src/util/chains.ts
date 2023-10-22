import { ChainId } from '@pancakeswap/chains'
import {
  bsc,
  bscTestnet,
  goerli,
  mainnet,
  zkSync,
  zkSyncTestnet,
  polygonZkEvmTestnet,
  polygonZkEvm,
  lineaTestnet,
  arbitrum,
  arbitrumGoerli,
  base,
  baseGoerli,
  scrollSepolia as scrollSepolia_,
  Chain as ViemChain,
} from 'viem/chains'

export const CHAIN_QUERY_NAME = {
  [ChainId.ETHEREUM]: 'eth',
  [ChainId.GOERLI]: 'goerli',
  [ChainId.BSC]: 'bsc',
  [ChainId.BSC_TESTNET]: 'bscTestnet',
  [ChainId.ARBITRUM_ONE]: 'arb',
  [ChainId.ARBITRUM_GOERLI]: 'arbGoerli',
  [ChainId.POLYGON_ZKEVM]: 'polygonZkEVM',
  [ChainId.POLYGON_ZKEVM_TESTNET]: 'polygonZkEVMTestnet',
  [ChainId.ZKSYNC]: 'zkSync',
  [ChainId.ZKSYNC_TESTNET]: 'zkSyncTestnet',
  [ChainId.LINEA]: 'linea',
  [ChainId.LINEA_TESTNET]: 'lineaTestnet',
  [ChainId.OPBNB_TESTNET]: 'opBnbTestnet',
  [ChainId.BASE]: 'base',
  [ChainId.BASE_TESTNET]: 'baseTestnet',
  [ChainId.SCROLL_SEPOLIA]: 'scrollSepolia',
} as const

const scrollSepolia = {
  ...scrollSepolia_,
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 9473,
    },
  },
} as const satisfies ViemChain

export const opbnbTestnet = {
  id: 5_611,
  name: 'opBNB Testnet',
  network: 'opbnb-testnet',
  nativeCurrency: bscTestnet.nativeCurrency,
  rpcUrls: {
    default: {
      http: ['https://opbnb-testnet-rpc.bnbchain.org'],
    },
    public: {
      http: ['https://opbnb-testnet-rpc.bnbchain.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'opBNBScan',
      url: 'https://opbnbscan.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 3705108,
    },
  },
  testnet: true,
} as const satisfies ViemChain

export const linea = {
  id: 59_144,
  name: 'Linea Mainnet',
  network: 'linea-mainnet',
  nativeCurrency: { name: 'Linea Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    infura: {
      http: ['https://linea-mainnet.infura.io/v3'],
      webSocket: ['wss://linea-mainnet.infura.io/ws/v3'],
    },
    default: {
      http: ['https://rpc.linea.build'],
      webSocket: ['wss://rpc.linea.build'],
    },
    public: {
      http: ['https://rpc.linea.build'],
      webSocket: ['wss://rpc.linea.build'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://lineascan.build',
    },
    etherscan: {
      name: 'Etherscan',
      url: 'https://lineascan.build',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 42,
    },
  },
  testnet: false,
} as const satisfies ViemChain

/**
 * Controls some L2 specific behavior, e.g. slippage tolerance, special UI behavior.
 * The expectation is that all of these networks have immediate transaction confirmation.
 */
export const L2_CHAIN_IDS: ChainId[] = [
  ChainId.ARBITRUM_ONE,
  ChainId.ARBITRUM_GOERLI,
  ChainId.POLYGON_ZKEVM,
  ChainId.POLYGON_ZKEVM_TESTNET,
  ChainId.ZKSYNC,
  ChainId.ZKSYNC_TESTNET,
  ChainId.LINEA_TESTNET,
  ChainId.LINEA,
  ChainId.BASE,
  ChainId.BASE_TESTNET,
  ChainId.OPBNB_TESTNET,
]

export const CHAINS = [
  bsc,
  mainnet,
  bscTestnet,
  goerli,
  polygonZkEvm,
  polygonZkEvmTestnet,
  zkSync,
  zkSyncTestnet,
  arbitrum,
  arbitrumGoerli,
  linea,
  lineaTestnet,
  arbitrumGoerli,
  arbitrum,
  base,
  baseGoerli,
  opbnbTestnet,
  scrollSepolia,
]

export enum Chain {
  ZKEVM = 137,
  ZKSYNC = 324,
  LINEA = 59144,
  ARB = 42161,
  GOR = 5,
  ARB_GOR = 31337,
  BASE = 8453,
  ETH = 1,
  BSC = 56,
  GOERLI = 5,
  BSC_TESTNET = 97,
  OP_BNB = 204,
  // add new chain when we should start to support them
}
export enum SupportedChain {
  ZKEVM = 137,
  ZKSYNC = 324,
  ARB = 42161,
  LINEA = 59144,
  BASE = 8453,
  ETH = 1,
  BSC = 56,
  Goerli = 5,
  BSC_TESTNET = 97,
  OP_BNB = 204,
  // add new chain when we should start to support them
}

export const chainIdToCoingekoId: { [chain in SupportedChain]: string } = {
  [Chain.BSC]: "binancecoin",
  [Chain.ETH]: "ethereum",
  [Chain.BSC_TESTNET]: "binancecoin",
  [Chain.GOERLI]: "ethereum",
  [Chain.ZKEVM]: "ethereum",
  [Chain.ZKSYNC]: "ethereum",
  [Chain.ARB]: "ethereum",
  [Chain.LINEA]: "ethereum",
  [Chain.BASE]: "ethereum",
  [Chain.OP_BNB]: "binancecoin",
};

export const chainNamesToValues: { [key: string]: SupportedChain } = {
  zkevm: SupportedChain.ZKEVM,
  zksync: SupportedChain.ZKSYNC,
  arb: SupportedChain.ARB,
  linea: SupportedChain.LINEA,
  base: SupportedChain.BASE,
  eth: SupportedChain.ETH,
  bsc: SupportedChain.BSC,
  opbnb: SupportedChain.OP_BNB,
  // add new entries when new chains are supported
};

export function getChainFromName(name: string): SupportedChain | undefined {
  return chainNamesToValues[name];
}

export function isValidChain(name: string): boolean {
  return getChainFromName(name) !== undefined;
}

export const isBscOrEthChain = (network: number): boolean => {
  return [Chain.BSC, Chain.ETH].includes(network);
};
