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


makeSuite('CallPool', (testEnv) => {
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

    it("Caller is not the FactoryOwner", async () => {
        // deployer is the owner of factory
        const { deployer } = testEnv;

        const instance = pool.connect(user);
        await expect(
            instance.pause()
        ).to.be.revertedWith('1');

        const instanceO = pool.connect(deployer);

        await instanceO.pause();
        expect(await instanceO.paused()).to.be.true;
        await instanceO.unpause();

        expect(await instanceO.paused()).to.be.false;
    });

    it("deposit & withdraw success", async () => {
        const instance = pool.connect(user);
        const addr = await user.getAddress();
        expect(await nToken.balanceOf(addr)).to.be.equal(0);

        await instance.deposit(addr, tokenId);

        expect(await nToken.balanceOf(addr)).to.be.equal(1);

        // status = [ifOnMarket, available, lowerStrikePriceGapIdx, upperDurationIdx]
        const status = await instance.getNFTStatus(tokenId);
        console.log(`status: ${status}`);
        expect(status[0]).to.be.true;
        expect(status[1]).to.be.equal(1);
        expect(status[2]).to.be.equal(3);

        expect(await instance.checkAvailable(tokenId)).to.be.true;

        // because available, so can withdraw NFT
        await instance.withdraw(addr, tokenId);
        expect(await nToken.balanceOf(addr)).to.be.equal(0);
    });

    it("depositWithPreference success", async () => {
        const instance = pool.connect(user);
        const addr = await user.getAddress();
        expect(await nToken.balanceOf(addr)).to.be.equal(0);
        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);

        await instance.depositWithPreference(addr, tokenId, lowerStrikePriceGapIdx, upperDurationIdx, price.toFixed());

        expect(await nToken.balanceOf(addr)).to.be.equal(1);

        // status = [ifOnMarket, available, lowerStrikePriceGapIdx, upperDurationIdx]
        const status = await instance.getNFTStatus(tokenId);
        expect(status[0]).to.be.true;
        expect(status[1]).to.be.equal(lowerStrikePriceGapIdx);
        expect(status[2]).to.be.equal(upperDurationIdx);
    });

    it("others can not on / off market", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[1]);
        await expect(
            instance.takeNFTOffMarket(tokenId)
        ).to.be.reverted;

        await expect(
            instance.relistNFT(tokenId)
        ).to.be.reverted;
    });

    it("owner can on / off market", async () => {
        const instance = pool.connect(user);
        await instance.takeNFTOffMarket(tokenId);
        let status = await instance.getNFTStatus(tokenId);
        expect(status[0]).to.be.false;

        await instance.relistNFT(tokenId);
        status = await instance.getNFTStatus(tokenId);
        expect(status[0]).to.be.true;
    });

    it("previewOpenCall: errorCode=3 if ifOnMarket=false", async () => {
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (status[0]) {
            await instance.takeNFTOffMarket(tokenId);
        }
        // res = [strikePrice, premiumToOwner, premiumToReserve]
        const {users} = testEnv;
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('3');
    });

    it("previewOpenCall: errorCode=12 if PriceGapIdx<lowerStrikePriceGapIdx", async () => {
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }
        const {users} = testEnv;
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 1, 1);
        expect(res.errorCode).to.be.equal('12');
    });

    it("previewOpenCall: errorCode=13 if durationIdx>upperDurationIdx", async () => {
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }
        const {users} = testEnv;
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 3, 4);
        expect(res.errorCode).to.be.equal('13');
    });

    it("previewOpenCall: errorCode=15 if strikePrice < minimumPremiumToOwner", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        await mockedOracle.setAssetPrice(nftAddress, minPremium.toString());
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('15');
    });

    it("previewOpenCall: errorCode=17 if try to open a position on self-owned NFT", async () => {
        const { mockedOracle } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        await mockedOracle.setAssetPrice(nftAddress, minPremium.toString());
        let res = await instance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('17');
    });

    it("previewOpenCall: strikePrice < uint256.max", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);
        const invalidPrice = new BigNumber(2).exponentiatedBy(new BigNumber(256)).minus(new BigNumber(1)).toFixed();
        await mockedOracle.setAssetPrice(nftAddress, price.toString());
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 3, 1);
        expect(res.strikePrice).to.not.equal(invalidPrice);
        expect(res.premiumToOwner).to.not.equal(invalidPrice);
        expect(res.premiumToReserve).to.not.equal(invalidPrice);
    });

    it("previewOpenCall: strikePrice >= minimumStrikePrice", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 4)
        await mockedOracle.setAssetPrice(nftAddress, price.toFixed());
        const user1Instance = pool.connect(users[1]);
        let res = await user1Instance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('14');
    });

    it("openCall: strikePrice can not be 0", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        await mockedOracle.setAssetPrice(nftAddress, minPremium.toString());
        const user1Instance = pool.connect(users[1]);
        await expect(
            user1Instance.openCall(tokenId, 3, 1)
        ).to.be.reverted;
    });

    it("openCall: msg.value must be equal premium", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);
        await mockedOracle.setAssetPrice(nftAddress, price.toString());
        const user1Instance = pool.connect(users[1]);
        await expect(
            user1Instance.openCall(tokenId, 3, 1)
        ).to.be.reverted;
    });

    it("openCall: users[0] open success", async () => {
        const { mockedOracle, users } = testEnv;
        const instance = pool.connect(user);
        const addr = await users[0].getAddress();
        let status = await instance.getNFTStatus(tokenId);
        if (!status[0]) {
            await instance.relistNFT(tokenId);
        }

        const minPremium = await instance.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);
        await mockedOracle.setAssetPrice(nftAddress, price.toString());

        // before
        expect(await instance.balanceOf(pool.address)).to.be.equal(0);
        expect(await instance.checkAvailable(tokenId)).to.be.true;
        expect(await callToken.balanceOf(addr)).to.be.equal(0);

        
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
        expect(await instance.balanceOf(pool.address)).to.be.equal(res.premiumToReserve);
        expect(await instance.checkAvailable(tokenId)).to.be.false;
        const owner = await user.getAddress();
        expect(await instance.balanceOf(owner)).to.be.equal(res.premiumToOwner);
        expect(await callToken.balanceOf(addr)).to.be.equal(1);
    });

    it("openCall: users[2] can not open twice", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);

        const currentTS = await helpers.time.latest();
        // because open call with duration id = 1, so duration is 7 days
        const duration = 7 * 24 * 3600;
        const info = await instance.getNFTStatus(tokenId);
        expect(info.endTime).to.be.equal(duration + currentTS);
        expect(info.exerciseTime).to.be.equal(duration/2 + currentTS);

        await expect(
            instance.openCall(tokenId, 3, 1)
        ).to.be.reverted;
    });

    it("openCall: users[2] reopen success when call expired", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();

        // because open call with duration id = 1, so duration is 7 days
        await helpers.time.increase(7 * 24 * 3600);
        let info = await instance.getNFTStatus(tokenId);
        expect(await helpers.time.latest()).to.gt(info.endTime);

        // before
        expect(await instance.checkAvailable(tokenId)).to.be.true;
        expect(await callToken.balanceOf(addr)).to.be.equal(0);

        // users[2] open
        const res = await instance.previewOpenCall(tokenId, 3, 0);
        await instance.openCall(
            tokenId, 3, 0,
            {value: res.premiumToOwner.add(res.premiumToReserve)}
        );

        // after
        expect(await instance.checkAvailable(tokenId)).to.be.false;
        expect(await callToken.balanceOf(addr)).to.be.equal(1);

        // check endTime
        const currentTS = await helpers.time.latest();
        // because open call with duration id = 0, so duration is 3 days
        const duration = 3 * 24 * 3600;
        info = await instance.getNFTStatus(tokenId);
        expect(info.endTime).to.be.equal(duration + currentTS);
        expect(info.exerciseTime).to.be.equal(duration/2 + currentTS);
    });

    it("openCall: users[2] can not reopen an off-market CallToken", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        const instance_owner = pool.connect(user);
        await instance_owner.takeNFTOffMarket(tokenId);
        let status = await instance.getNFTStatus(tokenId);
        expect(status[0]).to.be.false;
        const addr = await users[2].getAddress();

        // because open call with duration id = 1, so duration is 7 days
        await helpers.time.increase(7 * 24 * 3600);
        let info = await instance.getNFTStatus(tokenId);
        expect(await helpers.time.latest()).to.gt(info.endTime);

        // before
        expect(await instance.checkAvailable(tokenId)).to.be.true;
        expect(await callToken.balanceOf(addr)).to.be.equal(0);

        // users[2] open reverted
        const res = await instance.previewOpenCall(tokenId, 3, 0);
        expect(instance.openCall(
            tokenId, 3, 0,
            {value: res.premiumToOwner.add(res.premiumToReserve)}
        )).to.be.reverted;

        await instance_owner.relistNFT(tokenId);
        status = await instance_owner.getNFTStatus(tokenId);
        expect(status[0]).to.be.true;

        // users[2] open
        const res_new = await instance.previewOpenCall(tokenId, 3, 0);
        expect(res_new.strikePrice).to.gt(0);
        await instance.openCall(
            tokenId, 3, 0,
            {value: res_new.premiumToOwner.add(res_new.premiumToReserve)}
        );
    });

    it("openCall: users[2] can open with excess fee", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();

        // because open call with duration id = 0, so duration is 3 days
        await helpers.time.increase(3 * 24 * 3600 + 1);
        let info = await instance.getNFTStatus(tokenId);
        expect(await helpers.time.latest()).to.gt(info.endTime);

        // before
        expect(await instance.checkAvailable(tokenId)).to.be.true;
        expect(await callToken.balanceOf(addr)).to.be.equal(0);

        const res = await instance.previewOpenCall(tokenId, 3, 0);
        await instance.openCall(
            tokenId, 3, 0,
            {value: res.premiumToOwner.add(res.premiumToReserve).add(excess_fee)}
        );
        expect(await instance.balanceOf(addr)).to.be.equal(excess_fee);
    });

    it("openCall: users[2] can open with balance", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();

        // because open call with duration id = 0, so duration is 3 days
        await helpers.time.increase(3 * 24 * 3600 + 1);
        let info = await instance.getNFTStatus(tokenId);
        expect(await helpers.time.latest()).to.gt(info.endTime);

        // before
        expect(await instance.checkAvailable(tokenId)).to.be.true;
        expect(await callToken.balanceOf(addr)).to.be.equal(0);

        const res = await instance.previewOpenCall(tokenId, 3, 0);
        await instance.openCall(
            tokenId, 3, 0,
            {value: res.premiumToOwner.add(res.premiumToReserve).sub(excess_fee)}
        );
        expect(await instance.balanceOf(addr)).to.be.equal(0);
    });

    it("exerciseCall: time it not up", async () => {
        const instance = pool.connect(user);
        let info = await instance.getNFTStatus(tokenId);
        expect(await helpers.time.latest()).to.lt(info.exerciseTime);
        await expect(instance.exerciseCall(tokenId)).to.be.reverted;
    });

    it("exerciseCall: others can not exercise", async () => {
        const instance = pool.connect(user);
        await helpers.time.increase(2 * 24 * 3600);
        const currentTS = await helpers.time.latest();
        let info = await instance.getNFTStatus(tokenId);
        expect(currentTS).to.gt(info.exerciseTime);
        expect(currentTS).to.lt(info.endTime);
        await expect(instance.exerciseCall(tokenId)).to.be.reverted;
    });

    it("exerciseCall: msg.value must be equal strikePrice", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        await expect(instance.exerciseCall(tokenId)).to.be.reverted;
    });

    it("exerciseCall: users[2] exercise success", async () => {
        const { users, Azuki } = testEnv;
        const instance = pool.connect(users[2]);
        const nft = Azuki.connect(users[2]);
        const addr = await users[2].getAddress();
        const owner = await user.getAddress();
        let info = await instance.getNFTStatus(tokenId);

        // before
        expect(await callToken.balanceOf(addr)).to.be.equal(1);
        expect(await nft.balanceOf(addr)).to.be.equal(0);
        expect(await nToken.ownerOf(tokenId)).to.be.equal(owner);
        const beforeB = await instance.balanceOf(owner);
        expect(await callToken.ownerOf(tokenId)).to.be.equal(addr);

        // exercise
        await instance.exerciseCall(tokenId, {value: info.strikePrice});

        // after
        expect(await callToken.balanceOf(addr)).to.be.equal(0);
        expect(await nft.balanceOf(addr)).to.be.equal(1);
        expect(await nft.ownerOf(tokenId)).to.be.equal(addr);
        // ERC721 ownerOf `require(owner != address(0))`
        await expect(
            nToken.ownerOf(tokenId)
        ).to.be.revertedWith('ERC721: invalid token ID');

        // check owner's reward
        const afterB = await instance.balanceOf(owner);
        expect(beforeB.add(info.strikePrice)).to.be.equal(afterB);
        expect(await instance.checkAvailable(tokenId)).to.be.false;
    });

    it("withdrawETH: balance can not be 0", async () => {
        const { users } = testEnv;
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();
        expect(await instance.balanceOf(addr)).to.be.equal(0);

        await expect(instance.withdrawETH(addr, 1)).to.be.reverted;
    });

    it("withdrawETH: success", async () => {
        const addr = await user.getAddress();
        const instance = pool.connect(user);
        const balance = await instance.balanceOf(addr);
        const halfBalance = balance.div(2);

        // before
        const beforeB = await getBalance(addr);

        // withdraw
        await instance.withdrawETH(addr, halfBalance);

        // after
        const afterB = await getBalance(addr);

        expect(beforeB).to.be.lt(afterB);
        expect(await instance.balanceOf(addr)).to.be.gt(0);

        // withdraw all
        await instance.withdrawETH(addr, balance.sub(halfBalance));

        // after
        expect(await instance.balanceOf(addr)).to.be.equal(0);
        expect(await getBalance(addr)).to.be.gt(afterB);
    });

    it("exerciseCall: users[2] can exercise an off-market CallToken", async () => {
        const instanceOfOwner = pool.connect(user);
        const addrOfOwner = await user.getAddress();
        expect(await nToken.balanceOf(addrOfOwner)).to.be.equal(0);

        await instanceOfOwner.depositWithPreference(addrOfOwner, anotherTokenId, lowerStrikePriceGapIdx, upperDurationIdx, 0);

        expect(await nToken.balanceOf(addrOfOwner)).to.be.equal(1);

        const { mockedOracle, Azuki, users } = testEnv;
        let status = await instanceOfOwner.getNFTStatus(anotherTokenId);
        if (!status[0]) {
            await instanceOfOwner.relistNFT(anotherTokenId);
        }

        const minPremium = await instanceOfOwner.minimumPremiumToOwner();
        const price = bigNumber(minPremium.toString(), 5);
        await mockedOracle.setAssetPrice(nftAddress, price.toString());

        // before
        expect(await instanceOfOwner.checkAvailable(anotherTokenId)).to.be.true;
        // users[2] open
        const instance = pool.connect(users[2]);
        const res = await instance.previewOpenCall(anotherTokenId, 3, 1);
        await instance.openCall(
            anotherTokenId,
            3,
            1,
            {value: res.premiumToOwner.add(res.premiumToReserve)}
        );

        // after
        expect(await instanceOfOwner.checkAvailable(anotherTokenId)).to.be.false;

        // status = [ifOnMarket, available, lowerStrikePriceGapIdx, upperDurationIdx]
        const nft = Azuki.connect(users[2]);
        const addr = await users[2].getAddress();
        let info = await instance.getNFTStatus(anotherTokenId);

        // before
        expect(await callToken.balanceOf(addr)).to.be.equal(1);
        expect(await nft.balanceOf(addr)).to.be.equal(1);
        expect(await nToken.ownerOf(anotherTokenId)).to.be.equal(addrOfOwner);
        const beforeB = await instance.balanceOf(addrOfOwner);

        helpers.time.increase(4*24*3600);

        // user take the nft off market
        await instanceOfOwner.takeNFTOffMarket(anotherTokenId);

        // exercise
        await instance.exerciseCall(anotherTokenId, {value: info.strikePrice});

        // after
        expect(await callToken.balanceOf(addr)).to.be.equal(0);
        expect(await nft.balanceOf(addr)).to.be.equal(2);
        expect(await nft.ownerOf(anotherTokenId)).to.be.equal(addr);
        // ERC721 ownerOf `require(owner != address(0))`
        await expect(
            nToken.ownerOf(anotherTokenId)
        ).to.be.revertedWith('ERC721: invalid token ID');

        // check owner's reward
        const afterB = await instance.balanceOf(addrOfOwner);
        expect(beforeB.add(info.strikePrice)).to.be.equal(afterB);
        expect(await instance.checkAvailable(anotherTokenId)).to.be.false;
    });

    it("collectProtocol: Caller is not the FactoryOwner", async () => {
        const instance = pool.connect(user);
        await expect(
            instance.collectProtocol(
                await user.getAddress(),
                1,
            )
        ).to.be.revertedWith('1');
    });

    it("collectProtocol: success", async () => {
        // deployer is the owner of factory
        const { deployer } = testEnv;
        const instance = pool.connect(deployer);
        const addr = await deployer.getAddress();

        // before
        const beforeB = await getBalance(addr);
        const balance = await instance.balanceOf(pool.address);
        expect(balance).to.be.gt(0);

        await instance.collectProtocol(addr, balance);

        // after
        const afterB = await getBalance(addr);
        expect(await instance.balanceOf(pool.address)).to.be.equal(0);
        expect(beforeB).to.be.lt(afterB);
    });

    it("openCallBatch: success", async () => {
        const { users, mockedOracle, Azuki } = testEnv;

        // users[2] deposit again
        // 1. Approval
        const azukiInstance = Azuki.connect(users[2]);
        await azukiInstance.setApprovalForAll(pool.address, true);
        const instance = pool.connect(users[2]);
        const addr = await users[2].getAddress();
        // 2. deposit
        await instance.depositWithPreference(addr, tokenId, lowerStrikePriceGapIdx, upperDurationIdx, 0);
        expect(await instance.checkAvailable(tokenId)).to.be.true;

        // set price
        const minPremium = await instance.minimumPremiumToOwner();
        await mockedOracle.setAssetPrice(nftAddress, minPremium.toString());

        const newInstance = pool.connect(users[3]);
        const newAddr = await users[3].getAddress();
        let res = await newInstance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('15');
        await newInstance.openCallBatch([tokenId], [3], [1]);
        expect(await callToken.balanceOf(newAddr)).to.be.equal(0);

        const price = bigNumber(minPremium.toString(), 5);
        await mockedOracle.setAssetPrice(nftAddress, price.toString());
        res = await newInstance.previewOpenCall(tokenId, 3, 1);
        expect(res.errorCode).to.be.equal('0');
        await newInstance.openCallBatch([tokenId], [3], [1], {value: res.premiumToOwner.add(res.premiumToReserve)});
        expect(await callToken.balanceOf(newAddr)).to.be.equal(1);
        expect(await instance.checkAvailable(tokenId)).to.be.false;
    });

    it("transfer ntoken & calltoken", async () => {
        const { users } = testEnv;

        const addr2 = await users[2].getAddress();
        const addr3 = await users[3].getAddress();

        expect(await nToken.ownerOf(tokenId)).to.be.equal(addr2);
        expect(await callToken.ownerOf(tokenId)).to.be.equal(addr3);

        // ntoken transfer to users[1]
        const addr1 = await users[1].getAddress();
        const ntoken2 = nToken.connect(users[2]);
        await ntoken2["safeTransferFrom(address,address,uint256)"](addr2, addr1, tokenId);
        expect(await nToken.ownerOf(tokenId)).to.be.equal(addr1);

        // calltoken transfer to users[0]
        const addr0 = await users[0].getAddress();
        const calltoken3 = callToken.connect(users[3]);
        await calltoken3["safeTransferFrom(address,address,uint256)"](addr3, addr0, tokenId);
        expect(await callToken.ownerOf(tokenId)).to.be.equal(addr0);

        // users[3] can not exerciseCall because transfer to users[0]
        const instance3 = pool.connect(users[3]);
        await expect(instance3.exerciseCall(tokenId)).to.be.reverted;

        const instance = pool.connect(users[0]);
        const info = await instance.getNFTStatus(tokenId);

        // before
        expect(await instance.balanceOf(addr1)).to.be.equal(0);
        const beforeB = await instance.balanceOf(addr2); // original owner

        // run
        const currentTS = await helpers.time.latest();
        await helpers.time.increase(info.exerciseTime.sub(currentTS));
        await instance.exerciseCall(tokenId, {value: info.strikePrice});

        // after
        expect(await instance.balanceOf(addr1)).to.be.gt(0);
        expect(await instance.balanceOf(addr2)).to.be.equal(beforeB);
    });
});