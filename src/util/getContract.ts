import { getAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";

const isAddress = (value: any): string | false => {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
};

const getSigner = (library: Web3Provider, account: string): JsonRpcSigner => {
  return library.getSigner(account).connectUnchecked();
};

const getProviderOrSigner = (
  library: Web3Provider,
  account?: string
): Web3Provider | JsonRpcSigner => {
  return account ? getSigner(library, account) : library;
};

const getContract = (
  address: string,
  ABI: any,
  provider: Web3Provider,
): Contract => {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }

  return new Contract(
    address,
    ABI,
    provider
  );
};

export const returnContract = <contract extends Contract = Contract>(
  tokenddress: string,
  ABI: any,
  provider: Web3Provider,
): contract | null => {
  try {
    return getContract(
      tokenddress,
      ABI,
      provider
    ) as contract;
  } catch (error) {
    console.error("Failed to get contract", error);
    return null;
  }
};

export default getContract;