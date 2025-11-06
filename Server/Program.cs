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
using Npgsql;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
var builder = WebApplication.CreateBuilder(args);

var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection");

// If running inside a container, localhost refers to the container itself. Redirect to host.docker.internal
var runningInContainer = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER");
if (string.Equals(runningInContainer, "true", StringComparison.OrdinalIgnoreCase))
{
    var connectionStringBuilder = new NpgsqlConnectionStringBuilder(pgConnectionString);
    if (connectionStringBuilder.Host == "localhost" || connectionStringBuilder.Host == "127.0.0.1")
    {
        connectionStringBuilder.Host = "host.docker.internal";
        pgConnectionString = connectionStringBuilder.ConnectionString;
    }
}

var allowFrontEndCors = "AllowFrontend";
var apiTitle = "Game Room Booking API"; 
var apiVersion = "v1"; 
// Allow common dev origins
var allowedOrigins = new[]
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
            maxRetryCount: 5,
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
 .AllowAnyHeader();
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
using (var scope = app.Services.CreateScope())
{
 var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

 try
 {
 // Log which DB we target (without secrets)
 var csb = new NpgsqlConnectionStringBuilder(pgConnectionString);
 logger.LogInformation("Using PostgreSQL Host={Host} Port={Port} Database={Database} Username={Username}", csb.Host, csb.Port, csb.Database, csb.Username);

 var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
 var pending = db.Database.GetPendingMigrations().ToList();
 if (pending.Count >0)
 {
 logger.LogInformation("Applying {Count} pending EF migrations: {Migrations}", pending.Count, string.Join(", ", pending));
 }
 else
 {
 logger.LogInformation("No pending EF migrations.");
 }

 db.Database.Migrate();

 var applied = db.Database.GetAppliedMigrations().ToList();
 logger.LogInformation("Applied migrations count: {Count}", applied.Count);
 }
 catch (Exception ex)
 {
 logger.LogError(ex, "Database migration on startup failed");
 throw; // Fail fast so we don't run with a mismatched schema
 }
}

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

app.Run();