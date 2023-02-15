// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.9;

interface ICallToken {
    function nft() external returns(address);

    event Mint(address indexed user, uint256 indexed tokenId);

    function mint(address user, uint256 tokenId) external;

    event Burn(address indexed user, uint256 indexed tokenId);

    function burn(uint256 tokenId) external;

    function open(address user, uint256 tokenId) external;
}
