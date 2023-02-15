// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "../interfaces/IPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockedOracle is IPriceOracle, Ownable {

    mapping (address=> uint256) private assetPrice;

    function setAssetPrice(address asset, uint256 price) external override onlyOwner
    {
        require(price != 0);
        assetPrice[asset] = price;
    }

    function getAssetPrice(address asset) external view override returns(uint256)
    {
        return assetPrice[asset];
    }

    function getAssetVol(address asset) external view override returns(uint256)
    {
        return 1000;
    }

}
