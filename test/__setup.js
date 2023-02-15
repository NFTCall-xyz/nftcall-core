const rawBRE = require('hardhat');

const {
    deployNFTOracleImpl,
    deployNFTOracleProxy,
    deployPremium,
    initNFTOracle,
    deployCallFactory,
    deployNTokenFactory,
    deployCallTokenFactory,
    deployMockedERC721,
    deployMockedOracle,
} = require('../helpers/contracts-deployments');
const {
    initializeMakeSuite,
} = require('./make-suite');
const {
    getDRE,
} = require('../helpers/utils');
const {
    contractId,
    nftNames,
} = require('../helpers/constants');


async function buildTestEnv() {
    console.time('setup');
    const DRE = getDRE();
    const accounts = await DRE.ethers.getSigners();

    // oracle
    await deployNFTOracleImpl();
    await deployNFTOracleProxy();
    const [ _, owner, operator, ...a] = accounts;
    await initNFTOracle(
        await owner.getAddress(),
        await operator.getAddress(),
        [],
    );

    // premium
    var premiumMesh = new Array();
    for(var i=0; i<24; i++) {
      premiumMesh[i] = new Array();
      for(var j=0; j<100; j++) {
        premiumMesh[i][j] = i * 100 + j;
      }
    }
    await deployPremium(premiumMesh);

    await deployNTokenFactory();
    await deployCallTokenFactory();
    await deployCallFactory();

    // mocked erc721
    const Azuki = "Azuki";
    await deployMockedERC721(contractId[Azuki], nftNames[Azuki]);
    const CloneX = "CloneX";
    await deployMockedERC721(contractId[CloneX], nftNames[CloneX]);
    await deployMockedOracle();

    console.timeEnd('setup');
}

before(async () => {
    await rawBRE.run('set-DRE');
    await buildTestEnv();
    await initializeMakeSuite();
    console.log('\n***************');
    console.log('Setup and snapshot finished');
    console.log('***************\n');
});
