using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using gameroombookingsys;
using gameroombookingsys.Interfaces;
using Gameroombookingsys.Repository;
using Gameroombookingsys.Services;
using gameroombookingsys.IRepository;
using gameroombookingsys.Repository;
using gameroombookingsys.Service;
using gameroombookingsys.Helpers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using gameroombookingsys.IService;
using gameroombookingsys.Workers;
using Npgsql;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
var builder = WebApplication.CreateBuilder(args);

// Get connection string with better error handling
var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection");
if (string.IsNullOrWhiteSpace(pgConnectionString))
{
    // Try alternative configuration key names that Azure might use
    pgConnectionString = builder.Configuration["ConnectionStrings:PostgresConnection"] 
        ?? builder.Configuration["PostgresConnection"]
        ?? Environment.GetEnvironmentVariable("ConnectionStrings__PostgresConnection")
        ?? Environment.GetEnvironmentVariable("PostgresConnection");
    
    if (string.IsNullOrWhiteSpace(pgConnectionString))
    {
        throw new InvalidOperationException(
            "PostgresConnection connection string is not configured. " +
            "Please set it in Azure App Service Configuration as 'ConnectionStrings:PostgresConnection' or 'PostgresConnection'.");
    }
}

// If running inside a container (but NOT in Azure), localhost refers to the container itself. 
// Redirect to host.docker.internal for local Docker development only.
// Azure App Service sets WEBSITE_SITE_NAME environment variable, so we can detect Azure environment.
var runningInContainer = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER");
var isAzure = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME"));
if (string.Equals(runningInContainer, "true", StringComparison.OrdinalIgnoreCase) && !isAzure)
{
 var connectionStringBuilder = new NpgsqlConnectionStringBuilder(pgConnectionString);
 if (connectionStringBuilder.Host == "localhost" || connectionStringBuilder.Host == "127.0.0.1")
 {
 connectionStringBuilder.Host = "host.docker.internal";
 pgConnectionString = connectionStringBuilder.ConnectionString;
 }
}

// Ensure SSL when running on Azure PostgreSQL if not already specified
try
{
 var sslCsb = new NpgsqlConnectionStringBuilder(pgConnectionString);
 if (isAzure)
 {
 // Azure Database for PostgreSQL requires SSL
 if (sslCsb.SslMode == SslMode.Disable)
 {
 sslCsb.SslMode = SslMode.Require;
 }
 // In App Service, trusting server certificate is commonly required unless a root cert is provided
 sslCsb.TrustServerCertificate = true;
 pgConnectionString = sslCsb.ConnectionString;
 }
}
catch
{
 // Ignore parsing issues; connection attempt will surface clearer errors later
}

// EF migration behavior can be controlled via configuration (e.g., App Service app settings)
// EF:MigrateOnStartup=true/false (default: true)
// EF:FailFastOnMigrateError=true/false (default: false in Production to allow app to start even if DB is temporarily unavailable)
var migrateOnStartup = builder.Configuration.GetValue<bool?>("EF:MigrateOnStartup") ?? true;
var failFastOnMigrateError = builder.Configuration.GetValue<bool?>("EF:FailFastOnMigrateError") ?? false; // Default to false to allow graceful startup

var allowFrontEndCors = "AllowFrontend";
var apiTitle = "Game Room Booking API"; 
var apiVersion = "v1"; 

// Get allowed origins from configuration or use defaults
var corsOriginsConfig = builder.Configuration["CORS:AllowedOrigins"];
var allowedOrigins = !string.IsNullOrWhiteSpace(corsOriginsConfig)
 ? corsOriginsConfig.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
 : new[]
 {
  "http://localhost:5173",
  "http://localhost:5174",
  "https://localhost:5173",
  "https://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://127.0.0.1:5173",
  "https://127.0.0.1:5174",
  "http://localhost:8080",
  "https://localhost:8080"
 };

// Use PostgreSQL only
builder.Services.AddDbContext<AppDbContext>(options =>
{
 options.UseNpgsql(pgConnectionString, npgsqlOptions =>
 {
 // Add transient retry to reduce startup races and transient network hiccups
 npgsqlOptions.EnableRetryOnFailure(
 maxRetryCount:5,
 maxRetryDelay: TimeSpan.FromSeconds(10),
 errorCodesToAdd: null);
 });
});

// Repository & service registration
builder.Services.AddScoped<IPlayersRepository, PlayersRepository>();
builder.Services.AddScoped<IPlayersService, PlayersService>();
builder.Services.AddScoped<IRoomBookingsRepository, RoomBookingsRepository>();
builder.Services.AddScoped<IRoomBookingsService, RoomBookingsService>();
builder.Services.AddScoped<IDevicesRepository, DevicesRepository>();
builder.Services.AddScoped<IDevicesService, DevicesService>();
builder.Services.AddScoped<IOneTimeLoginCodesRepository, OneTimeLoginCodesRepository>();
builder.Services.AddScoped<IUsersRepository, UsersRepository>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<KeycloakHelper>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<gameroombookingsys.IService.IAuthService, gameroombookingsys.Service.AuthService>();

builder.Services.AddHostedService<ExpiredCodesCleanupWorker>();

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
// Enable Controllers & Endpoints
builder.Services.AddControllers()
 .AddJsonOptions(options =>
 {
 options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
 options.JsonSerializerOptions.WriteIndented = true;
 });
builder.Services.AddEndpointsApiExplorer();

// OpenAPI Configuration
builder.Services.AddSwaggerGen(options =>
{
 // Enable the annotations
 options.EnableAnnotations();

 options.SwaggerDoc(apiVersion, new OpenApiInfo
 {
 Title = apiTitle,
 Version = apiVersion,
 Description = "API documentation for managing game room bookings.",
 Contact = new OpenApiContact
 {
 Name = "Support Team",
 Email = "support@gameroombooking.com",
 Url = new Uri("https://gameroombooking.com/support")
 }
 });

 // Add JWT Bearer authentication to Swagger
 options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
 {
 Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
 Name = "Authorization",
 In = ParameterLocation.Header,
 Type = SecuritySchemeType.ApiKey,
 Scheme = "Bearer"
 });

 options.AddSecurityRequirement(new OpenApiSecurityRequirement
 {
 {
 new OpenApiSecurityScheme
 {
 Reference = new OpenApiReference
 {
 Type = ReferenceType.SecurityScheme,
 Id = "Bearer"
 }
 },
 Array.Empty<string>()
 }
 });
});

// Add CORS policy
builder.Services.AddCors(options =>
{
 options.AddPolicy(allowFrontEndCors, policy =>
 {
 policy.WithOrigins(allowedOrigins)
 .AllowAnyMethod()
 .AllowAnyHeader()
 .AllowCredentials(); // Required for cookies and authentication headers
 });
});

builder.Services.AddControllers()
 .AddJsonOptions(options =>
 {
 options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
 });

var secret = "gameroombookingsys_gameroombookingsys";
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
{
 KeyId = "1"
};

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
 .AddJwtBearer(options =>
 {
 options.TokenValidationParameters = new TokenValidationParameters
 {
 ValidateIssuer = false,
 ValidateAudience = false,
 ValidateLifetime = true,
 ValidateIssuerSigningKey = true,
 IssuerSigningKey = key,
 ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 }
 };
 });

// Authorization with Admin policy
builder.Services.AddAuthorization(options =>
{
 options.AddPolicy("Admin", policy =>
 {
 policy.RequireAuthenticatedUser();
 policy.RequireClaim(System.Security.Claims.ClaimTypes.Role, "Admin");
 });
});

var app = builder.Build();

// Ensure database is created and migrations are applied at startup
// Use background task to avoid blocking startup if database is temporarily unavailable
_ = Task.Run(async () =>
{
 await Task.Delay(TimeSpan.FromSeconds(2)); // Give app time to start listening
    
 using (var scope = app.Services.CreateScope())
 {
  var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

  try
  {
   // Log which DB we target (without secrets)
   var csb = new NpgsqlConnectionStringBuilder(pgConnectionString);
   logger.LogInformation("Using PostgreSQL Host={Host} Port={Port} Database={Database} Username={Username} SslMode={SslMode} TrustServerCertificate={Trust}", csb.Host, csb.Port, csb.Database, csb.Username, csb.SslMode, csb.TrustServerCertificate);

   var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
   
   // Test database connection before attempting migrations
   try
   {
    var canConnect = await db.Database.CanConnectAsync();
    if (!canConnect)
    {
     logger.LogError("Cannot connect to database. Please check connection string and network access.");
     if (failFastOnMigrateError)
     {
      throw new InvalidOperationException("Database connection failed. Check connection string and ensure database server is accessible.");
     }
     logger.LogWarning("Database connection failed, but continuing startup (failFastOnMigrateError=false). App will retry on next request.");
     return;
    }
    logger.LogInformation("Database connection test successful.");
   }
   catch (Exception dbEx)
   {
    logger.LogError(dbEx, "Database connection test failed");
    if (failFastOnMigrateError)
    {
     throw; // Fail fast on connection issues only if configured
    }
    logger.LogWarning("Database connection failed, but continuing startup. App will retry on next request.");
    return;
   }

   var pending = db.Database.GetPendingMigrations().ToList();
   if (pending.Count >0)
   {
    logger.LogInformation("Applying {Count} pending EF migrations: {Migrations}", pending.Count, string.Join(", ", pending));
   }
   else
   {
    logger.LogInformation("No pending EF migrations.");
   }

   if (migrateOnStartup)
   {
    db.Database.Migrate();
    var applied = db.Database.GetAppliedMigrations().ToList();
    logger.LogInformation("Applied migrations count: {Count}", applied.Count);
   }
   else
   {
    logger.LogWarning("Skipping EF migrations on startup (EF:MigrateOnStartup=false)");
   }
  }
  catch (Exception ex)
  {
   logger.LogError(ex, "Database migration on startup failed");
   if (failFastOnMigrateError)
   {
    throw; // Fail fast when configured to do so
   }
   logger.LogWarning("Database migration failed, but app will continue running. Migrations will be retried on next startup.");
  }
 }
});

// Apply Middleware
app.UseCors(allowFrontEndCors);

// Enable OpenAPI UI. Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
 app.UseSwagger();
 app.UseSwaggerUI(options =>
 {
 options.SwaggerEndpoint($"/swagger/{apiVersion}/swagger.json", apiTitle);
 });
}

// In development / container running HTTP only, skip HTTPS redirection to avoid CORS breaks
if (!app.Environment.IsDevelopment())
{
 app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Lightweight health endpoint for warmup probes
// Returns 200 if app is running, 503 if database is unavailable
app.MapGet("/healthz", async () =>
{
 try
 {
  using (var scope = app.Services.CreateScope())
  {
   var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
   var canConnect = await db.Database.CanConnectAsync();
   if (canConnect)
   {
    return Results.Ok(new { status = "OK", database = "connected" });
   }
   return Results.StatusCode(503); // Service Unavailable
  }
 }
 catch
 {
  // If we can't check database, return 503 but app is still running
  return Results.StatusCode(503);
 }
});

app.Run();