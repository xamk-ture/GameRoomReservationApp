@description('Azure region for the registry')
param location string

@description('Globally unique name for the Azure Container Registry (alphanumeric only, 5-50 chars)')
param acrName string

@description('SKU for the container registry')
param acrSku string = 'Basic'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: false
  }
}

output acrId string = acr.id
output loginServer string = acr.properties.loginServer
