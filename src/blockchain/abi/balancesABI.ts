export const balancesABI = [
	{
		inputs: [
			{
				internalType: "address[]",
				name: "addresses",
				type: "address[]"
			}
		],
		name: "getBalances",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	}
]