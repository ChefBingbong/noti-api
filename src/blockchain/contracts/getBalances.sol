// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract Balances {
    function getBalances(address[] memory addresses) public view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](addresses.length);
        
        for (uint i = 0; i < addresses.length; i++) {
            uint256 balance = addresses[i].balance;
            balances[i] = balance;
        }
        
        return balances;
    }
}
