- [Overview](#sec-1)
- [CallPool](#sec-2)
  - [public properties](#sec-2-1)
    - [nft](#sec-2-1-1)
    - [oracle](#sec-2-1-2)
    - [nToken](#sec-2-1-3)
    - [callToken](#sec-2-1-4)
    - [premium](#sec-2-1-5)
    - [exercisePeriodProportion](#sec-2-1-6)
    - [minimumPremiumToOwner](#sec-2-1-7)
  - [Methods](#sec-2-2)
    - [balanceOf(address user) view returns (uint256)](#sec-2-2-1)
    - [checkAvailable(uint256 tokenId) view returns(bool)](#sec-2-2-2)
    - [deposit(address onBehalfOf, uint256 tokenId)](#sec-2-2-3)
    - [depositWithPreference(address onBehalfOf, uint256 tokenId, uint8 lowerStrikePriceGapIdx, uint8 upperDurationIdx, uint256 minimumStrikePrice)](#sec-2-2-4)
    - [withdraw(address to, uint256 tokenId)](#sec-2-2-5)
    - [withdrawETH(address to, uint256 amount) returns(uint256)](#sec-2-2-6)
    - [takeNFTOffMarket(uint256 tokenId)](#sec-2-2-7)
    - [relistNFT(uint256 tokenId)](#sec-2-2-8)
    - [previewOpenCall(uint256 tokenId, uint256 strikePriceGapIdx, uint256 durationIdx) view returns(uint256 strikePrice, uint256 premiumToOwner, uint256 premiumToReserve, uint256 errorCode)](#sec-2-2-9)
    - [openCall(uint256 tokenId, uint256 strikePriceGapIdx, uint256 durationIdx) payable](#sec-2-2-10)
    - [openCallBatch(uint256[] tokenIds, uint256[] strikePriceGaps, uint256[] durations) payable](#sec-2-2-11)
    - [exerciseCall(uint256 tokenId) payable](#sec-2-2-12)
    - [getNFTStatus(uint256 tokenId)](#sec-2-2-13)
  - [Storage of NFT Status](#sec-2-3)
- [NToken](#sec-3)
- [CallToken](#sec-4)
- [CallFatory](#sec-5)
- [CallTokenFactory](#sec-6)
- [NTokenFactory](#sec-7)
- [DataTypes](#sec-8)
- [NFTStatus](#sec-9)
- [Premium](#sec-10)

# Overview<a id="sec-1"></a>

Source code: <https://github.com/NFTCall-xyz/nftcall-core.git>

Language: solidity NFTCall is an NFT option product used for Physical delivery. NFT owner deposit their NFTs into a pool and receive benefits through the premium paid by the option buyer. Option buyers buy call options on specified NFTs by paying a premium.

The NFT owner can `deposit` the NFT and receives the corresponding ERC721 `nToken`. The option buyer receives a `callToken` for the corresponding option upon paying the premium.

The holder of `nToken` can `withdraw` the corresponding NFT at any time if no one has opened a position in the NFT. If a position has already been opened, the holcan can call `takeNFTOffMarket` to avoid futhure openings.

The buyer specifies the strike price and expiration date via `strikePriceGap` and `duration`, and then pays the premium to purchase a call option. The premium is calculated based on the current NFT floor price, the strike price, and the expriation date. 10% of this premium is paid to the contract, and the remaining 90% is paid to the holder of the corresponding `nToken`.

During a `callToken`'s exercisable time period, the holder can pay `strikePrice` to `exercise` the position and receive the corresponding NFT. `strikePrice` will be paid in full to the `nToken` holder.

# CallPool<a id="sec-2"></a>

## public properties<a id="sec-2-1"></a>

### nft<a id="sec-2-1-1"></a>

the underlying NFT's address

### oracle<a id="sec-2-1-2"></a>

the oracle's address

### nToken<a id="sec-2-1-3"></a>

the nToken's address

### callToken<a id="sec-2-1-4"></a>

the callToken's address

### premium<a id="sec-2-1-5"></a>

the premium calculation contract's address

### exercisePeriodProportion<a id="sec-2-1-6"></a>

Percentage of the exercisable time period out of total duration.

### minimumPremiumToOwner<a id="sec-2-1-7"></a>

Minimum premium for the nToken holder at each position opening.

## Methods<a id="sec-2-2"></a>

### balanceOf(address user) view returns (uint256)<a id="sec-2-2-1"></a>

Returns ETH from the user's account.

### checkAvailable(uint256 tokenId) view returns(bool)<a id="sec-2-2-2"></a>

Check if you can buy an option for a `tokenId`.

### deposit(address onBehalfOf, uint256 tokenId)<a id="sec-2-2-3"></a>

Deposit the NFT, use the default gap and duration settings(10%, 28days), and the `nToken` minted is transferred to `onBehalfOf`

### depositWithPreference(address onBehalfOf, uint256 tokenId, uint8 lowerStrikePriceGapIdx, uint8 upperDurationIdx, uint256 minimumStrikePrice)<a id="sec-2-2-4"></a>

The NFT is deposited with the given minimum strike price gap and maximum duration, while the minimum strike price allowed to open a position is specified by `minimumStrikePrice` (i.e. `NFT price at position opening * (1 + strike price gap / 10000) >= minimumStrikePrice` ). The minted `nToken` is transferred to `onBehalfOf`.

the `gap` is an index and corresponds to the value as below:

| index | value |
|----- |----- |
| 0     | 0%    |
| 1     | 10%   |
| 2     | 20%   |
| 3     | 30%   |
| 4     | 50%   |
| 5     | 100%  |

the `duration` is also an index and corresponds to the value as below:

| index | value   |
|----- |------- |
| 0     | 3 days  |
| 1     | 7 days  |
| 2     | 14 days |
| 3     | 28 days |

### withdraw(address to, uint256 tokenId)<a id="sec-2-2-5"></a>

To withdraw the NFT with `tokeId` to `to`. requires that the NFT is not opened with an option. and that the caller must be the owner of the `nToken`.

### withdrawETH(address to, uint256 amount) returns(uint256)<a id="sec-2-2-6"></a>

Withdraws the ETH from the caller's account to `to`. If the `amount` is the maximum value of `uint256`, then withdraws all the ETH from the account. Returns the total value withdrawn.

### takeNFTOffMarket(uint256 tokenId)<a id="sec-2-2-7"></a>

Removes an NFT from the openable NFT list. Must be called by the owner of that NFT. This will make it impossible to open new option on this NFT after the current option expires (if any). The option that currently opened are not affected.

### relistNFT(uint256 tokenId)<a id="sec-2-2-8"></a>

Put an NFT back to the openable NFT list. Must be called by the owner of that NFT.

### previewOpenCall(uint256 tokenId, uint256 strikePriceGapIdx, uint256 durationIdx) view returns(uint256 strikePrice, uint256 premiumToOwner, uint256 premiumToReserve, uint256 errorCode)<a id="sec-2-2-9"></a>

Returns the fee to the call option to open with `strikePriceGap` and `duration`.

-   the `strikePrice` is the strike price for exercising the option.
-   `premiumToOwner` and `premiumToReserve` are the premiums paid to the NFT owner and the contract.
-   If the position cannot be opened, a non-zero error code will be returned in the `errorCode`.

### openCall(uint256 tokenId, uint256 strikePriceGapIdx, uint256 durationIdx) payable<a id="sec-2-2-10"></a>

Open a call option for an NFT. The strike price is `the price when the position was opened *(1+strikePriceGap/100000)`. And it can be exercised during the 50%-100% of the duration corresponding to durationIdx.

The `stricPriceGap` must be >= the minimum value of gap specified by the owner and the durationIdx must be <= the maximum value specified by the owner. The strike price must also be >= the minimum strike price specified by the owner. The premium calculated from the `stricPriceGap` and `durationIdx` must be paid, and the insufficient amount can be covered by the user's ETH assets in the pool.

### openCallBatch(uint256[] tokenIds, uint256[] strikePriceGaps, uint256[] durations) payable<a id="sec-2-2-11"></a>

Open call options for multiple NFTs, specifying the gap and duration with the `strikePriceGaps` and `durations` respectively. A sufficient premium must be paid and the insufficient amount can be covered by the user's ETH assets in the pool. If there are NFTs that cannot be opened, then the corresponding premiums will be refunded to the caller's ETH account in the pool.

### exerciseCall(uint256 tokenId) payable<a id="sec-2-2-12"></a>

The owner of the `callToken` receives the corresponding NFT by paying the strike price.

### getNFTStatus(uint256 tokenId)<a id="sec-2-2-13"></a>

Returns information on the status of an NFT option.

| Name                 | Type    | Description                                                 |
|-------------------- |------- |----------------------------------------------------------- |
| ifOnMarket           | bool    | Whether it can be opend after the current option is expired |
| minimumsStrikeGapIdx | uint8   | Index of the minimum strike price gap                       |
| maximumDurationIdx   | uint8   | Index of the maximu duration                                |
| exerciseTime         | uint256 | Start time of the exercisable duration.                     |
| endTime              | uint256 | Expiration time.                                            |
| minimumStrikePrice   | uint256 | Minimum strike price.                                       |
| strikePrice          | uint256 | The strike price.                                           |

## Storage of NFT Status<a id="sec-2-3"></a>

The NFT status are placed in a structure of type `uint256`. The manipulation-related methods are in `NFTStatus.sol`

Where：

| bits    | types                  | description                         |
|------- |---------------------- |----------------------------------- |
| 0-1     | 2bits unsigned integer | `maximumDurationIdx` , value: 0-3   |
| 2-4     | 3bits unsigned integer | `minimumsStrikeGapIdx` , value: 0-5 |
| 5       | bool                   | `ifOnMarket`                        |
| 7       | bool                   | always be 1                         |
| 48-87   | uint40                 | `exerciseTime`                      |
| 88-127  | uint40                 | `endTime`                           |
| 128-192 | uint64                 | `minimumStrikePrice`, 9 decimals    |
| 192-255 | uint64                 | `strikePrice`, 9 decimals           |

# NToken<a id="sec-3"></a>

ERC721 Token used to represent an NFT deposited in the pool.

# CallToken<a id="sec-4"></a>

ERC721 Token used to represent a call option.

# CallFatory<a id="sec-5"></a>

For deploying `CallPool`

# CallTokenFactory<a id="sec-6"></a>

For deploying `CallToken`

# NTokenFactory<a id="sec-7"></a>

For deploying `NToken`

# DataTypes<a id="sec-8"></a>

For common types used by multiply contracts.

# NFTStatus<a id="sec-9"></a>

A library to manipulate the NFT status.

# Premium<a id="sec-10"></a>

For calculating premiums.
