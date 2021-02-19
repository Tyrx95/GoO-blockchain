var GORegistry = artifacts.require("GORegistry");
var GOIssuingBody = artifacts.require("GOIssuingBody");

const CERTIFICATE_TYPE_SOLAR = 1;

const {GO_DATA, CANCEL_DATA} = require("./const.js");


module.exports = async function(done) {
  try{
    let accounts = await web3.eth.getAccounts();
    console.log("Creating issuing body and certifying by GO registry...");

    const regInstance = await GORegistry.deployed();
    const ibInstance1 = await GOIssuingBody.new(regInstance.address);
    const ibInstance2 = await GOIssuingBody.new(regInstance.address);

    const txAddCertifiedResult1 = await regInstance.addCertifiedIssuer(ibInstance1.address, {
        from: accounts[0],
    });
    console.log("Transaction add certified issuer:", txAddCertifiedResult1.tx);
    const txAddCertifiedResult2 = await regInstance.addCertifiedIssuer(ibInstance2.address, {
        from: accounts[0],
    });
    console.log("Transaction add certified issuer:", txAddCertifiedResult2.tx);

    console.log("Registering user in registry to Issuing Body 1...");
    const txAddUserToIBResult1 = await ibInstance1.addUserToIBinRegistry(accounts[4], {from: accounts[0]});
    console.log("Add user to Issuing Body:", txAddUserToIBResult1.tx);

    console.log("Registering user in registry to Issuing Body 2...");
    const txAddUserToIBResult2 = await ibInstance2.addUserToIBinRegistry(accounts[5], {from: accounts[0]});
    console.log("Add user to Issuing Body:", txAddUserToIBResult2.tx);
    const bytesData = web3.utils.fromAscii(JSON.stringify(GO_DATA));
    console.log(`Issuing GO to the address ${accounts[4]}...`);
    const resultIssueTx =  await ibInstance1.issueGO(25, accounts[4], 
      CERTIFICATE_TYPE_SOLAR, bytesData, {from: accounts[0]});
    const tokenId = resultIssueTx.logs[1].args.goId;
    console.log("Issued go Tx:", resultIssueTx.tx);
    console.log(`Transfering GO from: ${accounts[4]} to ${accounts[5]}...`);
    await ibInstance2.setTradesWith(ibInstance1.address, {from: accounts[0]});

    console.log("Withdrawing Issued GO...");
    const withdrawGOTx = await ibInstance1.withdrawIssuedGO(tokenId); 
    console.log("Withdrawn Issued GO...", withdrawGOTx);


    const resultCancelGO = await regInstance.safeTransferAndCancelGO(accounts[4], accounts[5],tokenId,
        23,
        "0x0000000",
        bytesCancelData,
        { from: accounts[4] }
    );
    console.log("Canceled go Tx:", resultCancelGO.tx);
    console.log("Finished!");
    done();
  } catch(e){
        console.error("Error, transaction reverted:");
        done();
  }
};