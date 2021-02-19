var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");


module.exports = async function(done) {
  try{
    let accounts = await web3.eth.getAccounts();
    console.log("Getting deployed version of GOIssuingBody...")
    const regInstance = await GORegistry.deployed();
    const ibInstance = await GOIssuingBody.new(regInstance.address);
    const txResult = await regInstance.addCertifiedIssuer(ibInstance.address, {
        from: accounts[0],
    });
    console.log("Transaction:", txResult.tx);
    console.log("Finished!");
    done();
  } catch(e){
      console.log(e);
      done();
  }
};
