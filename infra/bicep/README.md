# Bicep Setup Guide

This folder contains the Bicep templates that deploy the Game Room Booking System to Azure (resource group, Container Registry, Storage Account, App Service Plan, and Web App for Containers).

## 1. Prerequisites

- **Azure CLI** installed ([install guide](https://learn.microsoft.com/cli/azure/install-azure-cli))
- **Bicep CLI** (installs automatically the first time you run a `bicep`/`az bicep` command, or install manually):
  ```bash
  az bicep install
  ```
- An Azure subscription you can deploy to

Check your versions:
```bash
az version
az bicep version
```

## 2. Log in to Azure

```bash
az login
```

If you have more than one subscription, pick the right one:
```bash
az account set --subscription "<subscription-id-or-name>"
```

## 3. Validate the templates (optional but recommended)

Compile to check for syntax errors without deploying anything:
```bash
az bicep build --file infra/bicep/main.bicep --stdout
```

Or run a what-if deployment to preview changes:
```bash
az deployment sub what-if \
  --location germanywestcentral \
  --template-file infra/bicep/main.bicep
```

## 4. Deploy

`main.bicep` deploys at **subscription scope** (it creates the resource group itself), so use `az deployment sub create`:

```bash
az deployment sub create \
  --name gameroom-deployment \
  --location germanywestcentral \
  --template-file infra/bicep/main.bicep
```

Notes:
- `--location` here is only where Azure stores the deployment's metadata — it doesn't have to match the resources' region (set via the `location` parameter, default `germanywestcentral`).
- `communicationConnectionString` is an `@secure()` parameter — never hardcode secrets in the `.bicep` files or commit them to source control. Pass it on the command line, via `--parameters @params.json` with a gitignored file, or via a secret store/pipeline variable.
- Allowed Azure regions depend on your subscription's policies. If deployment fails with a region/policy error, check which regions you're allowed to use:
  ```bash
  az policy assignment list -o table
  ```

## 5. Install Docker and push your container image

The default `containerImage` is `gameroombookingsys:latest` from the registry this template creates. On a **fresh deployment the registry is empty**, so the Web App can't pull the image (and will show a 503) until you push it. Build and push the image, then restart the Web App.

> **Note:** ACR Tasks (cloud-side builds via `az acr build`) are blocked on Azure for Students subscriptions with a `TasksOperationsNotAllowed` error, so this guide uses a **local Docker build + push** instead — this uses plain registry push/pull, which isn't restricted.

### 5.1 Install Docker

- **Windows / macOS:** install [Docker Desktop](https://docs.docker.com/desktop/) and start it.
- **Ubuntu / Debian:** follow the [Docker Engine install guide](https://docs.docker.com/engine/install/).
- **Arch / CachyOS:**
  ```bash
  sudo pacman -S docker
  sudo systemctl enable --now docker.service
  ```

On Linux, allow your user to run Docker without `sudo` (log out and back in afterwards):
```bash
sudo usermod -aG docker $USER
```

Verify it works:
```bash
docker version
docker run --rm hello-world
```

### 5.2 Build and push

Run these from the repository root:

```bash
# 1. Build the image locally (same context/dockerfile as docker-compose.yml)
docker build -t gameroombookingacr.azurecr.io/gameroombookingsys:latest -f Server/Dockerfile .

# 2. Authenticate Docker against your ACR
az acr login --name gameroombookingacr

# 3. Push the image
docker push gameroombookingacr.azurecr.io/gameroombookingsys:latest

# 4. Restart the Web App so it pulls the new image
az webapp restart --name gameroombooking-app --resource-group GameRoomBookingSystem
```

To use a different image/tag, pass it at deploy time:
```bash
az deployment sub create --name gameroom-deployment --location germanywestcentral \
  --template-file infra/bicep/main.bicep \
  --parameters containerImage=gameroombookingsys:v2
```

Optional: sanity-check the image locally before pushing:
```bash
docker run --rm -p 8080:8080 gameroombookingacr.azurecr.io/gameroombookingsys:latest
```
(The app logs a warning that it can't reach PostgreSQL; that's expected until a database is provisioned.)

## Troubleshooting

- **Web App returns 503 / container exits with code 139:** check the startup logs with `az webapp log tail`. A leftover empty `PostgresConnection` connection string on the Web App will override the default in `appsettings.json` and crash the app on startup. Remove it:
  ```bash
  az webapp config connection-string delete --name gameroombooking-app \
    --resource-group GameRoomBookingSystem --setting-names PostgresConnection
  ```
- **`az acr build` fails with `TasksOperationsNotAllowed`:** use the local `docker build` + `docker push` flow above.

## 6. Useful follow-ups

```bash
# Tail live logs
az webapp log tail --name gameroombooking-app --resource-group GameRoomBookingSystem

# See deployment outputs (e.g. the app's URL)
az deployment sub show --name gameroom-deployment --query properties.outputs
```

## File structure

```
infra/bicep/
├── main.bicep                       # Entry point (subscription scope)
└── modules/
    ├── containerRegistry.bicep      # Azure Container Registry
    ├── storageaccount.bicep         # Storage account (StorageV2, Standard_LRS)
    ├── appServicePlan.bicep         # Linux App Service Plan
    ├── webApp.bicep                 # Linux Web App for Containers
    └── acrRoleAssignment.bicep      # Grants the Web App's managed identity AcrPull
```
