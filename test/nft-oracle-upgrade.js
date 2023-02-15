const { expect } = require("chai");
const { makeSuite } = require('./make-suite');

const {
    getNFTOracleProxy,
} = require('../helpers/contracts-getters');
const {
    upgradeNFTOracle,
} = require('../helpers/contracts-deployments');
const {
    deployContract,
} = require('../helpers/utils');


makeSuite('NFTOracle Upgrade', (testEnv) => {

    it('Upgrade success', async function() {
        const { oracle, users } = testEnv;
        const proxy = await getNFTOracleProxy();
        const owner = users[0];
        const operator = users[1];

        const oldInstance = oracle.connect(owner);
        expect(
            await oldInstance.ORACLE_REVISION()
        ).to.equal(0x1);
        const oldImplAddress = await proxy.callStatic.implementation();

        // deploy new contract
        const newImpl = await deployContract(
            'NFTOracleTestUpgrade',
            [],
            false,
            'NFTOracleTestUpgrade',
        );

        // upgrade
        const addr = await operator.getAddress();
        await upgradeNFTOracle(newImpl, addr, addr);

        // check
        const newImplAddress = await proxy.callStatic.implementation();
        expect(oldImplAddress).to.not.equal(newImplAddress);
        expect(newImplAddress).to.equal(newImpl.address);
        expect(
            await oldInstance.ORACLE_REVISION()
        ).to.equal(0x100);
    });

});
