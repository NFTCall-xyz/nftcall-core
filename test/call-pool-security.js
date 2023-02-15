const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { makeSuite } = require('./make-suite');
const {
    bigNumber,
    getBalance,
} = require('../helpers/utils');
const {
    getCallPool,
    getNToken,
    getCallToken,
} = require('../helpers/contracts-getters');


makeSuite('CallPool Security', (testEnv) => {
    let pool, user, nftAddress, tokenId, nToken, callToken, anotherTokenId, buyer, attacker;
    let lowerStrikePriceGapIdx = 2;
    let upperDurationIdx = 2;

    before(async () => {
        const { deployer, users, callFactory, mockedOracle, premium, Azuki } = testEnv;
        const instance = callFactory.connect(deployer);
        // create pool
        await instance.createPool(Azuki.address, mockedOracle.address, premium.address);
        const poolAddress = await instance.getPool(Azuki.address);
        pool = await getCallPool(poolAddress, "Azuki");
        nToken = await getNToken(await pool.nToken(), "Azuki");
        callToken = await getCallToken(await pool.callToken(), "Azuki");

        user = users[4];
        buyer  = users[2];
        attacker = users[3];
        nftAddress = Azuki.address;
        // user mint nft
        const azukiInstance = Azuki.connect(user);
        tokenId = (await azukiInstance.totalSupply()).toNumber() + 1;
        
        await azukiInstance.mint();
        anotherTokenId = (await azukiInstance.totalSupply()).toNumber() + 1;

        await azukiInstance.mint();

        // approve first
        await azukiInstance.setApprovalForAll(pool.address, true);
        const instanceOfOwner = pool.connect(user);
        const addrOfOwner = await user.getAddress();
        await instanceOfOwner.deposit(addrOfOwner, tokenId);
        await instanceOfOwner.deposit(addrOfOwner, anotherTokenId);

        await instanceOfOwner.takeNFTOffMarket(tokenId);

    });

    it('attacker can not withdraw', async() => {
        const instanceOfAttacker = pool.connect(attacker);
        const addrOfAttacker = await attacker.getAddress();
        await expect(instanceOfAttacker.withdraw(addrOfAttacker, tokenId)).to.be.revertedWith('4');
    });


});