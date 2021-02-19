const GO_DATA = {
    issuer: "CZIB",
    domain: "Czech Republic",
    productionPeriodStart: "2021-01-01",
    productionPeriodEnd: "2021-01-10",
    operatorName: "SolarPower",
    dateRequested: new Date(),
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
  

module.exports = {
    GO_DATA,
    CANCEL_DATA
}