//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./interfaces/ICallPoolDeployer.sol";
import "./interfaces/INToken.sol";

contract NToken is ERC721, INToken, Ownable, IERC721Receiver {
    address public immutable override nft;

    constructor() ERC721("NToken", "N") Ownable() {
        (, nft, , , ,) = ICallPoolDeployer(msg.sender).parameters();
    }

    function name() public view override returns (string memory) {
        return string(abi.encodePacked(ERC721.name(), " ", IERC721Metadata(nft).name()));

    }

    function symbol() public view override returns (string memory) {
        return string(abi.encodePacked(ERC721.symbol(), IERC721Metadata(nft).symbol()));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory){
        return IERC721Metadata(nft).tokenURI(tokenId);
    }

    function mint(address user, uint256 tokenId) public override onlyOwner{
        _safeMint(user, tokenId);
        emit Mint(user, tokenId);
    }

    function burn(address user, address receiverOfUnderlying, uint256 tokenId) public override onlyOwner{
        _burn(tokenId);
        IERC721(nft).safeTransferFrom(address(this), receiverOfUnderlying, tokenId);
        emit Burn(user, receiverOfUnderlying, tokenId);
    }

    function transferERC721(address collection, address recipient, uint256 tokenId) public override onlyOwner{
        require(collection != nft || !_exists(tokenId), "Can only transfer NFT that have been accidentally sent.");
        require(recipient != address(0), "Cannot use zero address as recipient.");
        IERC721(nft).safeTransferFrom(address(this), recipient, tokenId);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4){
        return this.onERC721Received.selector;
    }
}
