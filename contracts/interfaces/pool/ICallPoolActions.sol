// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title Permissionless pool actions
/// @notice Contains pool methods that can be called by anyone
interface ICallPoolActions {
    // Deposit NFT
    function deposit(address onBehalfOf, uint256 tokenId) external;

    function depositWithPreference(address onBehalfOf, uint256 tokenId, uint8 lowerStrikePriceGapIdx, uint8 upperDurationIdx, uint256 minimumStrikePrice) external;


    // Withdraw NFT
    function withdraw(address to, uint256 tokenId) external;

    function withdrawETH(address to, uint256 amount) external returns(uint256);

    // Open option
    function openCall(uint256 tokenId, uint8 strikePriceIdx, uint8 durationIdx) external payable;

    function openCallBatch(uint256[] memory tokenIds, uint8[] memory strikePrices, uint8[] memory durations) external payable;

    // Close option
    function exerciseCall(uint256 tokenId) external payable;

    function takeNFTOffMarket(uint256 tokenId) external;

    function relistNFT(uint256 tokenId) external;

    function changePreference(
        uint256 tokenId,
        uint8 lowerStrikePriceGapIdx,
        uint8 upperDurationIdx,
        uint256 minimumStrikePrice
    ) external;
}
