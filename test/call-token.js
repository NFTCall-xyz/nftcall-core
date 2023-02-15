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

const BigNumber = require('bignumber.js');


makeSuite('CallToken', (testEnv) => {
    let pool, user, nftAddress, tokenId, nToken, callToken, anotherTokenId;
    let lowerStrikePriceGapIdx = 2;
    let upperDurationIdx = 2;
    let excess_fee = 1000000000;

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
        nftAddress = Azuki.address;
        // user mint nft
        const azukiInstance = Azuki.connect(user);
        tokenId = (await azukiInstance.totalSupply()).toNumber() + 1;
        
        await azukiInstance.mint();
        anotherTokenId = (await azukiInstance.totalSupply()).toNumber() + 1;

        await azukiInstance.mint();

        // approve first
        await azukiInstance.setApprovalForAll(pool.address, true);
    });

    it("token created but can not be used", async () => {
        const instance = pool.connect(user);
        const addr = await user.getAddress();
        await instance.deposit(addr, tokenId);
        expect((await instance.getNFTStatus(tokenId)).endTime).to.be.equal(0);
        await expect(callToken.ownerOf(tokenId)).to.be.reverted;
        expect(await callToken.totalSupply()).to.be.equal(0);
        await expect(callToken.tokenByIndex(0)).to.be.reverted;
        await expect(callToken.tokenOfOwnerByIndex(addr, 0)).to.be.reverted;
    });

    it("users[0] get a call token", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        const addr = await users[0].getAddress();
        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);
        await mockedOracle.setAssetPrice(nftAddress, price.toString());

        const newInstance = pool.connect(users[0]);
        // users[0] open
        const res = await newInstance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('0');
        await newInstance.openCall(
            tokenId,
            3,
            1,
            {value: res.premiumToOwner.add(res.premiumToReserve)}
        );
        // after
        expect(await callToken.balanceOf(addr)).to.be.equal(1);
        expect(await callToken.totalSupply()).to.be.equal(1);
        expect(await callToken.tokenByIndex(0)).to.be.equal(tokenId);
        expect(await callToken.tokenOfOwnerByIndex(addr, 0)).to.be.equal(tokenId);
    });

    it("users[0] transfered the call token to users[2]", async () => {
        const { users } = testEnv;
        const addr = await users[0].getAddress();
        const targetaddr = await users[2].getAddress();
        const callTokenInstance = callToken.connect(users[0]);
        await callTokenInstance["safeTransferFrom(address,address,uint256)"](addr, targetaddr, tokenId);
        expect(await  callToken.balanceOf(addr)).to.be.equal(0);
        expect(await  callToken.balanceOf(targetaddr)).to.be.equal(1);
        expect(await  callToken.totalSupply()).to.be.equal(1);
        expect(await  callToken.tokenByIndex(0)).to.be.equal(tokenId);
        expect(await  callToken.tokenOfOwnerByIndex(targetaddr, 0)).to.be.equal(tokenId);
    });

    it("the call is not usable when it is expired", async () => {
        const { users } = testEnv;
        const addr = await users[2].getAddress();
        const targetAddr = await users[0].getAddress();

        // because open call with duration id = 1, so duration is 7 days
        await helpers.time.increase(7 * 24 * 3600);
        let info = await pool.getNFTStatus(tokenId);
        expect(await  helpers.time.latest()).to.gt(info.endTime);

        await expect( callToken.ownerOf(tokenId)).to.be.reverted;
        expect(await  callToken.totalSupply()).to.be.equal(0);
        await expect( callToken.tokenByIndex(0)).to.be.reverted;
        await expect( callToken.tokenOfOwnerByIndex(addr, 0)).to.be.reverted;
        expect(await  callToken.balanceOf(addr)).to.be.equal(0);
        await expect( callToken.connect(users[2])["safeTransferFrom(address,address,uint256)"](addr, targetAddr, tokenId)).to.be.reverted;
    });

    it("the call token is burned after a successful exercise", async () => {
        const { users, Azuki } = testEnv;
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();
        // users[2] open
        const res = await instance.previewOpenCall(tokenId, 3, 1);
        await instance.openCall(
            tokenId, 3, 1,
            {value: res.premiumToOwner.add(res.premiumToReserve)}
        );
        
        // before
        expect(await  callToken.balanceOf(addr)).to.be.equal(1);
        await helpers.time.increase(7 * 24 * 3600 / 2 + 1);
        let info = await instance.getNFTStatus(tokenId);
        const currentTime = await helpers.time.latest();
        expect(currentTime).to.gt(info.exerciseTime);
        expect(currentTime).to.lt(info.endTime);

        // exercise
        await instance.exerciseCall(tokenId, {value: info.strikePrice});
        // after
        await expect( callToken.ownerOf(tokenId)).to.be.reverted;
        expect(await  callToken.totalSupply()).to.be.equal(0);
        await expect( callToken.tokenByIndex(0)).to.be.reverted;
        await expect( callToken.tokenOfOwnerByIndex(addr, 0)).to.be.reverted;
        expect(await  callToken.balanceOf(addr)).to.be.equal(0);
    });
});