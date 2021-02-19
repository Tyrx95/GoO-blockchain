var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");

const {GO_DATA} = require("./const.js");

const CERTIFICATE_TYPE_SOLAR = 1;

module.exports = async function(done) {
  try{
    let accounts = await web3.eth.getAccounts();
    console.log("Creating issuing body and certifying by GO registry...");

    const regInstance = await GORegistry.deployed();
    const ibInstance = await GOIssuingBody.new(regInstance.address);
    const txAddCertifiedResult = await regInstance.addCertifiedIssuer(ibInstance.address, {
        from: accounts[0],
    });
    console.log("Transaction add certified issuer:", txAddCertifiedResult.tx);
    console.log("Registering user in registry to Issuing Body...");
    const txAddUserToIBResult = await ibInstance.addUserToIBinRegistry(accounts[3], {from: accounts[0]});
    console.log("Add user to Issuing Body:", txAddUserToIBResult.tx);
    const bytesData = web3.utils.fromAscii(JSON.stringify(GO_DATA));
    const resultIssueTx =  await ibInstance.issueGO(25, accounts[3], 
      CERTIFICATE_TYPE_SOLAR, bytesData, {from: accounts[0]});
    console.log("Issue go Tx:", resultIssueTx.tx);
    console.log("Finished!");
    done();
  } catch(e){
      console.log(e);
      done();
  }
};
