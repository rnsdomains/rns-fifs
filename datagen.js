const fs = require('fs');

const addresses = require('./addresses');

const rskOwnerBuild = require('./build/contracts/RSKOwner');

const rskOwnerData = {
  abi: rskOwnerBuild.abi,
  bytecode: rskOwnerBuild.bytecode,
  address: {
    rskMainnet: addresses.RSKOwner.rskMainnet,
    rskTestnet: addresses.RSKOwner.rskTestnet,
  },
};

fs.writeFileSync('./RSKOwnerData.json', JSON.stringify(rskOwnerData));

const namePriceBuild = require('./build/contracts/NamePrice');

const namePriceData = {
  abi: namePriceBuild.abi,
  bytecode: namePriceBuild.bytecode,
  address: {
    rskMainnet: addresses.NamePrice.rskMainnet,
    rskTestnet: addresses.NamePrice.rskTestnet,
  },
};

fs.writeFileSync('./NamePriceData.json', JSON.stringify(namePriceData));

const fifsRegistrarBuild = require('./build/contracts/FIFSRegistrar');

const fifsRegistrarData = {
  abi: fifsRegistrarBuild.abi,
  bytecode: fifsRegistrarBuild.bytecode,
  address: {
    rskMainnet: addresses.FIFSRegistrar.rskMainnet,
    rskTestnet: addresses.FIFSRegistrar.rskTestnet,
  },
};

fs.writeFileSync('./FIFSRegistrarData.json', JSON.stringify(fifsRegistrarData));

const fifsAddrRegistrarBuild = require('./build/contracts/FIFSAddrRegistrar');

const fifsAddrRegistrarData = {
  abi: fifsAddrRegistrarBuild.abi,
  bytecode: fifsAddrRegistrarBuild.bytecode,
  address: {
    rskMainnet: addresses.FIFSAddrRegistrar.rskMainnet,
    rskTestnet: addresses.FIFSAddrRegistrar.rskTestnet,
  },
};

fs.writeFileSync('./FIFSAddrRegistrarData.json', JSON.stringify(fifsAddrRegistrarData));

const renewerBuild = require('./build/contracts/Renewer');

const renewerData = {
  abi: renewerBuild.abi,
  bytecode: renewerBuild.bytecode,
  address: {
    rskMainnet: addresses.Renewer.rskMainnet,
    rskTestnet: addresses.Renewer.rskTestnet,
  },
};

fs.writeFileSync('./RenewerData.json', JSON.stringify(renewerData));

const bytesUtilsBuild = require('./build/contracts/BytesUtils');

const bytesUtilsData = {
  abi: bytesUtilsBuild.abi,
  bytecode: bytesUtilsBuild.bytecode,
  address: {
    rskMainnet: addresses.BytesUtils.rskMainnet,
    rskTestnet: addresses.BytesUtils.rskTestnet,
  },
};

fs.writeFileSync('./BytesUtilsData.json', JSON.stringify(bytesUtilsData));