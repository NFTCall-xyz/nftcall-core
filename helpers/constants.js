const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const networks = {
    localhost: "localhost",
    hardhat: "hardhat",
    goerli: "goerli",
    mainnet: "mainnet",
};

const nftNames = {
    Beanz: "Beanz",
    Potatoz: "Potatoz",
    Valhalla: "Valhalla",
    Dooplicator: "Dooplicator",
    Checks: "Checks",
    AKCB: "AKCB",
    Otherdeed: "Otherdeed",
};

const contractId = {
    oracle: "NFTOracle",
    oracleImpl: "NFTOracleImpl",
    premium: "Premium",
    callFactory: "CallFactory",
    nTokenFactory: "NTokenFactory",
    callTokenFactory: "CallTokenFactory",
    nToken: "NToken",
    callToken: "CallToken",
    proxy: "InitializableAdminUpgradeabilityProxy",
    Azuki: "MockAzuki",
    CloneX: "MockCloneX",
    callPool: "CallPool",
    mockedOracle: "MockedOracle",
    NFT: "NFT",
};

const erc721Tokens = {
    [nftNames.Beanz]: {
        [networks.goerli]: "0x734cea5fB4e4DabbC290d0418c035a6490532bEd",
    },
    [nftNames.Potatoz]: {
        [networks.goerli]: "0xa76EA6E4991b6E99cf0b8A8E9B39AE284BB800AA",
    },
    [nftNames.Valhalla]: {
        [networks.goerli]: "0xab5Be10ce171107f186626BbCD52443518c02c85",
    },
    [nftNames.Dooplicator]: {
        [networks.goerli]: "0x70DF9B848C86853fC6a56eb58cBc10240801FC71",
    },
    [nftNames.Checks]: {
        [networks.goerli]: "0xa05BC3bb9BCC1c50DAE47951792e4829D4Ba5B2C",
    },
    [nftNames.AKCB]: {
        [networks.goerli]: "0x828f9a67B9266b25e3379565465a02a031b7aC34",
    },
    [nftNames.Otherdeed]: {
        [networks.goerli]: "0x3a18b9Bc84792083Ed69aCa64eadD6156Ff0ef26",
    },
};


const oracleConfig = {
    OWNER: {
        [networks.goerli]: "0x96774c64dc3F46f64d17034CE6cf7b2eF31da56A",
    },
    OPERATOR: {
        [networks.goerli]: "0x7dD847696004B1F1f3eC88a0944C5b31023a6537",
    },
};

module.exports = {
    networks,
    nftNames,
    contractId,
    erc721Tokens,
    ZERO_ADDRESS,
    oracleConfig,
};
