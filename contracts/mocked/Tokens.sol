//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";


contract MockAzuki is ERC721, ERC721Enumerable, Ownable {
    uint256 public constant MAX_SUPPLY = 10000;

    constructor() ERC721("MockAzuki", "AZUKI") {
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint() public {
        uint256 ts = totalSupply();
        _safeMint(_msgSender(), ts + 1);
    }
}


contract MockCloneX is ERC721, ERC721Enumerable, Ownable {
    uint256 public constant MAX_SUPPLY = 10000;

    constructor() ERC721("MockCloneX", "CLONEX") {
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint() public {
        uint256 ts = totalSupply();
        _safeMint(_msgSender(), ts + 1);
    }
}


contract USDT is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD Tether", "USDT") {
        _mint(_msgSender(), initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}

