import { ChainId as ChainIdType, GelatoLimitOrders, Order } from "@gelatonetwork/limit-orders-lib";

export const GELATO_HANDLER = "pancakeswap";

const useGelatoLimitOrdersLib = (network: number): GelatoLimitOrders | undefined => {
  const gelatorLimitOrder = new GelatoLimitOrders(network as ChainIdType);
  return gelatorLimitOrder;
};

const getGelatoResolvedOrders = async (network: number, users: string[]) => {
  const gelatoLimitOrders = useGelatoLimitOrdersLib(network);
  if (!gelatoLimitOrders) return { userCancelledOrders: [], userExecutedOrders: [] };

  const fetchUserOrders = async (user: string, getter: () => Promise<Order[]>) => {
    try {
      const userOrders = await getter();
      return userOrders;
    } catch (error) {
      console.error(`Error fetching orders for user ${user}:`, error);
      return [];
    }
  };

  const userCancelledOrdersPromises = users.map(
    async (user) => await fetchUserOrders(user, () => gelatoLimitOrders.getCancelledOrders(user, false))
  );
  const userExecutedOrdersPromises = users.map(
    async (user) => await fetchUserOrders(user, () => gelatoLimitOrders.getExecutedOrders(user, false))
  );

  const [userCancelledOrders, userExecutedOrders] = await Promise.all([
    Promise.all(userCancelledOrdersPromises),
    Promise.all(userExecutedOrdersPromises),
  ]);

  console.log(userCancelledOrders[0], userExecutedOrders[0]);
  return { userCancelledOrders: userCancelledOrders[0], userExecutedOrders: userExecutedOrders[0] };
};

getGelatoResolvedOrders(1, ["0xEeD1Edd7599F2991159e3Fe71CC2010E9590037e"]);
