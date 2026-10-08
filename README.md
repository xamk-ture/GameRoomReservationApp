# Game Room Reservation App

A full-stack web application for managing game room bookings. Players can register, log in, and reserve time slots in game rooms, while administrators have a dedicated dashboard for managing users, devices, bookings, and viewing calendar overviews.

## Tech Stack

### Backend

- **Runtime:** .NET 8 (ASP.NET Core)
- **Database:** PostgreSQL with Entity Framework Core 9 (Npgsql)
- **Authentication:** JWT Bearer tokens
- **Email:** MailKit / Azure Communication Services
- **API Docs:** Swagger / OpenAPI (Swashbuckle)
- **Containerisation:** Docker

### Frontend

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **UI Library:** Material UI (MUI) 5
- **Calendar:** FullCalendar 6
- **Routing:** React Router 6
- **Internationalisation:** i18next (English & Finnish)
- **Notifications:** notistack

### Infrastructure

- **CI/CD:** GitHub Actions &rarr; Azure Static Web Apps (frontend)
- **Container Orchestration:** Docker Compose (PostgreSQL + API + client)

## Project Structure

```
GameRoomReservationApp/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # Auto-generated API client
│   │   ├── components/
│   │   │   ├── Admin/       # Admin dashboard views
│   │   │   ├── GameRoomBooking/  # Booking calendar & forms
│   │   │   ├── Login/       # Login & registration
│   │   │   ├── Player/      # Player profile
│   │   │   └── ...
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom hooks
│   │   ├── i18n/            # Internationalisation setup & locales
│   │   └── Themes/          # MUI theme configuration
│   └── vite.config.ts
├── Server/                  # ASP.NET Core Web API
│   ├── Controllers/         # API controllers
│   ├── DTOs/                # Data transfer objects
│   ├── Entity/              # EF Core entity models
│   ├── Enums/               # Booking & device status enums
│   ├── Helpers/             # JWT generation, Keycloak, resources
│   ├── IRepository/         # Repository interfaces
│   ├── IService/            # Service interfaces
│   ├── Migrations/          # EF Core migrations
│   ├── Repository/          # Repository implementations
│   ├── Resources/           # Server-side locale files (en, fi)
│   ├── Service/             # Service implementations
│   ├── Templates/           # Email HTML templates
│   ├── Workers/             # Background services
│   ├── Dockerfile
│   └── Program.cs           # Application entry point
├── docker-compose.yml       # Multi-container setup
└── gameroombookingsys.sln   # Visual Studio solution
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js >= 18](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/) (or use Docker)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) (optional, for containerised development)

## Getting Started

### Option 1 &mdash; Visual Studio (recommended)

The solution includes a **docker-compose** project that launches the full stack (PostgreSQL, .NET API, and React frontend) directly from Visual Studio.

1. Open `gameroombookingsys.sln` in **Visual Studio 2022**.
2. In the toolbar, set the startup project to **docker-compose** (it should appear in the startup project dropdown).
3. Press **F5** (or click the green play button).

Visual Studio will build the Docker images, start all three containers, and automatically open the Swagger UI in your browser.

| Service       | URL                        |
|---------------|----------------------------|
| Frontend      | http://localhost:5174       |
| API           | http://localhost:8080       |
| Swagger UI    | http://localhost:8080/swagger |
| PostgreSQL    | localhost:5432              |

> **Note:** The `docker-compose.override.yml` file supplies development-specific settings (environment variables, user-secrets volume mounts, etc.) that Visual Studio merges automatically.

### Option 2 &mdash; Docker Compose CLI

If you prefer the command line, you can start the same stack without Visual Studio:

```bash
docker compose up --build
```

The services will be available at the same URLs listed above.

### Option 3 &mdash; Run Locally (without Docker)

#### 1. Start PostgreSQL

Make sure a PostgreSQL instance is running on `localhost:5432` with database `gameroomdb`, user `user`, and password `password` (or update `Server/appsettings.json` accordingly).

#### 2. Run the API

```bash
cd Server
dotnet run
```

The API starts on `http://localhost:8080` by default. Swagger UI is available at `/swagger` in Development mode.

#### 3. Run the Frontend

```bash
cd client
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173` and proxies `/api` requests to the backend.

## Key Features

- **Player registration & login** via email-based one-time codes
- **Room booking** with an interactive calendar view (FullCalendar)
- **Admin dashboard** for managing users, devices, bookings, and calendar overview
- **Role-based access control** (Player / Admin) using JWT claims
- **Internationalisation** with English and Finnish translations
- **Theme switching** with light/dark mode support
- **Swagger/OpenAPI** documentation for the REST API
- **Health check endpoint** at `/healthz`
- **Automatic EF Core migrations** on startup (configurable)
- **Background workers** for expired login code cleanup

## Authentication & Local Login

The app uses **passwordless authentication**. Users enter their XAMK email address (`@xamk.fi` or `@edu.xamk.fi`) and receive a 6-digit one-time code to log in.

- **In production**, login codes are sent via **Azure Communication Services**.
- **In local development**, Azure Communication Services is not configured, so the code is **not delivered by email**. Instead it is available in two places:
  1. **Browser DevTools console** (F12) &mdash; look for `[DEV] One-time login code (body): XXXXXX`
  2. **Server terminal / Docker logs** &mdash; look for `LOGIN CODE FOR: ... CODE: XXXXXX`

Copy the 6-digit code from either location and paste it into the verification field to complete login.

> **Admin access:** Emails listed in `Admin:AllowedEmails` (in `appsettings.json`) are automatically granted the Admin role in the JWT.

## Configuration

Key settings in `Server/appsettings.json`:

| Setting | Description |
|---------|-------------|
| `ConnectionStrings:PostgresConnection` | PostgreSQL connection string |
| `ConnectionStrings:CommunicationConnection` | Azure Communication Services connection string (production email) |
| `EmailSettings:SenderAddress` | Sender address for Azure Communication Services |
| `Admin:AllowedEmails` | Email addresses granted the Admin role |
| `Smtp:*` | SMTP settings for booking confirmation emails |
| `EF:MigrateOnStartup` | Run EF migrations on startup (default: `true`) |
| `CORS:AllowedOrigins` | Semicolon-separated allowed origins |

## API Overview

| Controller | Base Route | Purpose |
|------------|------------|---------|
| AuthController | `/api/auth` | Authentication (login codes, verification) |
| TokenController | `/api/token` | JWT token issuance & refresh |
| PlayersController | `/api/players` | Player CRUD |
| RoomBookingsController | `/api/roombookings` | Room booking CRUD |
| DevicesController | `/api/devices` | Device management |
| AdminController | `/api/admin` | Admin-only operations |

## License

This project is proprietary. All rights reserved.
