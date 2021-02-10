const GORegistry = artifacts.require("GORegistry");
const GOIssuingBody = artifacts.require("GOIssuingBody");


module.exports = function (deployer) {
  deployer.deploy(GORegistry);
};
