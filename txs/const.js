const GO_DATA = {
    issuer: "CZIB",
    domain: "Czech Republic",
    productionPeriodStart: "2021-01-01",
    productionPeriodEnd: "2021-01-10",
    operatorName: "SolarPower",
    dateRequested: new Date().toDateString(),
    productionDeviceLocation: "Hradec Kralove, CZ",
    technology: "T010011 / Solar",
    productionDevice: "Solar Panel Device 4",
    productionDeviceGSRN: "440000044000444400444",
    installedCapacity: "30Mw",
    amount: "25Mwh"
}


const CANCEL_DATA = {
    fromAccount: "Solar Power Ltd",
    domain: "Czech Republic",
    street: "Palachova 12",
    city: "Hradec Kralove",
    beneficiaryName: "Solar Ben Ltd",
    cancellationPurpose: "Electricity disclosure",
    consumptionPeriodFrom: "2020-02-01",
    consumptionPeriodTo: "2020-02-10",
    consumptionCountry: "Czech",
    beneficiaryType: "Energy supplier"
  }


const IB1_ADDRESS = "0xB739F4e8D6DF45aF94F111a17740021E2bED838e";
const IB2_ADDRESS = "0x560bDdb7AE0683e6AC24E4CfC9E4ec4D67f5A3FE";
  

module.exports = {
    GO_DATA,
    CANCEL_DATA,
    IB1_ADDRESS,
    IB2_ADDRESS
}