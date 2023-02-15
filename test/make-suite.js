const {
    getDRE,
    getSigner,
} = require('../helpers/utils');
const {
    getNFTOracle,
    getPremium,
    getCallFactory,
    getMockedERC721,
    getMockedOracle,
} = require('../helpers/contracts-getters');
const {
    contractId,
} = require('../helpers/constants');


let buidlerevmSnapshotId = '0x1';
let TestEnv = {};


exports.initializeMakeSuite = async () => {
    console.log('initializeMakeSuite');
    const DRE = getDRE();
    const [_deployer, ...restSigners] = await DRE.ethers.getSigners();
    let users = [];
    for (const signer of restSigners) {
        users.push(signer);
    };

    TestEnv.users = users;
    TestEnv.deployer = _deployer;
    TestEnv.oracle = await getNFTOracle();
    TestEnv.premium = await getPremium();
    TestEnv.callFactory = await getCallFactory();
    TestEnv.Azuki = await getMockedERC721(contractId.Azuki, "Azuki");
    TestEnv.CloneX = await getMockedERC721(contractId.CloneX, "CloneX");
    TestEnv.mockedOracle = await getMockedOracle();
};


exports.makeSuite = (testName, tests) => {
    describe(testName, () => {
        before(async () => {
            const DRE = getDRE();
            const id = await DRE.ethers.provider.send('evm_snapshot', []);
            buidlerevmSnapshotId = id;
        });
        tests(TestEnv);
        after(async () => {
            const DRE = getDRE();
            await DRE.ethers.provider.send('evm_revert', [buidlerevmSnapshotId]);
        });
    });
};
