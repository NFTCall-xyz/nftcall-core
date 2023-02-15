const {
    contractId,
} = require('./constants');
const {
    deployContract,
    getSigner,
    waitTx,
} = require('./utils');
const {
    getNFTOracleImpl,
    getNFTOracleProxy,
    getNFTOracle,
    getNTokenFactory,
    getCallTokenFactory,
} = require('./contracts-getters');


exports.deployNFTOracleImpl = async (verify=false) => {
    return await deployContract(
        contractId.oracle,
        [],
        verify,
        dbName=contractId.oracleImpl,
    );
}


exports.deployNFTOracleProxy = async (verify=false) => {
    return await deployContract(
        contractId.proxy,
        [],
        verify,
        dbName=contractId.oracle,
    );
}


exports.deployPremium = async (premiumMesh, verify=false) => {
    return await deployContract(
        contractId.premium,
        [premiumMesh],
        verify,
    );
}


exports.deployCallFactory = async (verify=false) => {
    const nTokenFactory = await getNTokenFactory();
    const callTokenFactory = await getCallTokenFactory();
    return await deployContract(
        contractId.callFactory,
        [nTokenFactory.address, callTokenFactory.address],
        verify,
    );
}


exports.initNFTOracle = async (owner, operator, addresses = []) => {
    console.log(`Init NFT Oracle with addresses: ${addresses}...`);
    const impl = await getNFTOracleImpl();
    const proxy = await getNFTOracleProxy();
    const signer = await getSigner();
    const tx = await proxy['initialize(address,address,bytes)'](
        impl.address,
        await signer.getAddress(),
        impl.interface.encodeFunctionData(
            'initialize',
            [
                owner,
                operator,
                addresses,
            ],
        ),
    );
    await tx.wait();
    return await getNFTOracle();
}


exports.upgradeNFTOracle = async (
    newImpl,
    owner,
    operator,
    addresses = [],
) => {
    const proxy = await getNFTOracleProxy();
    const signer = await getSigner();
    const instance = proxy.connect(signer);
    const tx = await instance.upgradeToAndCall(
        newImpl.address,
        newImpl.interface.encodeFunctionData(
            'initialize',
            [
                owner,
                operator,
                addresses,
            ],
        ),
    );
    await tx.wait();
}


exports.deployNTokenFactory = async (verify=false) => {
    return await deployContract(
        contractId.nTokenFactory,
        [],
        verify,
    );
}


exports.deployCallTokenFactory = async (verify=false) => {
    return await deployContract(
        contractId.callTokenFactory,
        [],
        verify,
    );
}


exports.deployMockedERC721 = async (name, nftName=undefined) => {
    const poolName = nftName || name
    return await deployContract(name, [], false, contractId.NFT, poolName);
}


exports.deployMockedOracle = async () => {
    return await deployContract(contractId.mockedOracle, [], false);
}

