@description('Azure region for the App Service Plan')
param location string

@description('Name of the App Service Plan')
param planName string

@description('SKU for the plan, e.g. B1, S1, P1v3')
param sku string = 'B1'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: sku
  }
  properties: {
    reserved: true
  }
}

output planId string = plan.id
