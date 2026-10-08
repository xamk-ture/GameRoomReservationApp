@description('Azure region for the Web App')
param location string

@description('Globally unique name of the Web App (becomes <name>.azurewebsites.net)')
param webAppName string

@description('Resource ID of the App Service Plan to host the app')
param appServicePlanId string

@description('Login server of the Azure Container Registry, e.g. myregistry.azurecr.io')
param acrLoginServer string

@description('Container image and tag to deploy, e.g. gameroombookingsys:latest')
param containerImage string = 'appsvc/staticsite:latest'

@secure()
@description('Azure Communication Services connection string for email (optional)')
param communicationConnectionString string = ''

var imageReference = contains(containerImage, '/') ? containerImage : '${acrLoginServer}/${containerImage}'

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${imageReference}'
      acrUseManagedIdentityCreds: true
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
        {
          name: 'ASPNETCORE_URLS'
          value: 'http://+:8080'
        }
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
      ]
      connectionStrings: [
        {
          name: 'CommunicationConnection'
          connectionString: communicationConnectionString
          type: 'Custom'
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
