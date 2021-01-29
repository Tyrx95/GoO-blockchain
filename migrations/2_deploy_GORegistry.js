const GORegistry = artifacts.require("GORegistry");

module.exports = function (deployer) {
  deployer.deploy(GORegistry);
};
