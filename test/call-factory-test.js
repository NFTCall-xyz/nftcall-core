const { expect } = require("chai");
const { makeSuite } = require('./make-suite');
const {
    ZERO_ADDRESS,
} = require('../helpers/constants');
const {
    getCallPool,
} = require('../helpers/contracts-getters');


makeSuite('CallFactory', (testEnv) => {

    it("owner is deployer", async () => {
        const { deployer, callFactory } = testEnv;
        expect(
            await callFactory.owner()
        ).to.equal(await deployer.getAddress());
    });

    it('Ownable: caller is not the owner', async () => {
        const { users, callFactory, Azuki, oracle, premium } = testEnv;
        const instance = callFactory.connect(users[1]);

        await expect(
            instance.createPool(Azuki.address, oracle.address, premium.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Reverted: address can not be ZERO_ADDRESS', async () => {
        const { deployer, callFactory, Azuki, oracle, premium } = testEnv;
        const instance = callFactory.connect(deployer);

        await expect(
            instance.createPool(ZERO_ADDRESS, oracle.address, premium.address)
        ).to.be.reverted;

        await expect(
            instance.createPool(Azuki.address, ZERO_ADDRESS, premium.address)
        ).to.be.reverted;

        await expect(
            instance.createPool(Azuki.address, oracle.address, ZERO_ADDRESS)
        ).to.be.reverted;
    });

    it("Create pool success", async () => {
        const { deployer, callFactory, oracle, premium, Azuki } = testEnv;
        const instance = callFactory.connect(deployer);

        expect(
            await instance.getPool(Azuki.address)
        ).to.equal(ZERO_ADDRESS);

        await instance.createPool(
            Azuki.address,
            oracle.address,
            premium.address,
        );

        const poolAddress = await instance.getPool(Azuki.address);
        expect(poolAddress).to.not.equal(ZERO_ADDRESS);

        const callPool = (await getCallPool(poolAddress)).connect(deployer);
        expect(await callPool.factory()).to.equal(instance.address);
        expect(await callPool.nft()).to.equal(Azuki.address);
        expect(await callPool.oracle()).to.equal(oracle.address);
        expect(await callPool.premium()).to.equal(premium.address);
    });

    it("Can not create twice", async () => {
        const { deployer, callFactory, oracle, premium, Azuki } = testEnv;
        const instance = callFactory.connect(deployer);

        // Check if it has been created
        const poolAddress = await instance.getPool(Azuki.address);
        if (poolAddress == ZERO_ADDRESS) {
            // First creation
            await instance.createPool(Azuki.address, oracle.address, premium.address);
        };

        // Second Creation
        await expect(
            instance.createPool(Azuki.address, oracle.address, premium.address)
        ).to.be.reverted;
    });

    it("Create two pool success", async () => {
        const { deployer, callFactory, oracle, premium, Azuki, CloneX } = testEnv;
        const instance = callFactory.connect(deployer);

        // Check if it has been created
        const AzukiPoolAddress = await instance.getPool(Azuki.address);
        if (AzukiPoolAddress == ZERO_ADDRESS) {
            await instance.createPool(Azuki.address, oracle.address, premium.address);
        };
        await instance.createPool(CloneX.address, oracle.address, premium.address);
        const CloneXPoolAddress = await instance.getPool(CloneX.address);

        expect(AzukiPoolAddress).to.not.equal(CloneXPoolAddress);
    });
});
