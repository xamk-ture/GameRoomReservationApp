using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MimeKit;
using gameroombookingsys.IService;
using gameroombookingsys.Helpers;
using Azure.Communication.Email;
using Microsoft.Extensions.Logging;
// Alias to use MailKit's SmtpClient instead of System.Net.Mail.SmtpClient
using SmtpClient = MailKit.Net.Smtp.SmtpClient;

namespace gameroombookingsys.Helpers
{
    public class EmailService : IEmailService
    {
        // Azure Communication Services configuration
        private readonly string? _communicationConnectionString;
        private readonly string? _senderAddress;
        private readonly ILogger<EmailService> _logger;

        // SMTP configuration fields (for backward compatibility with SendBookingConfirmationEmailAsync)
        private readonly string? _smtpServer;
        private readonly int? _smtpPort;
        private readonly string? _smtpUsername;
        private readonly string? _smtpPassword;
        private readonly string? _fromAddress;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _logger = logger;

            // Azure Communication Services configuration
            // Try multiple configuration key formats for flexibility
            _communicationConnectionString = configuration.GetConnectionString("CommunicationConnection")
                ?? configuration["ConnectionStrings:CommunicationConnection"]
                ?? configuration["CommunicationConnection"]
                ?? Environment.GetEnvironmentVariable("ConnectionStrings__CommunicationConnection")
                ?? Environment.GetEnvironmentVariable("CommunicationConnection");

            _senderAddress = configuration["EmailSettings:SenderAddress"]
                ?? configuration["Email:SenderAddress"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SenderAddress");

            // SMTP configuration (for backward compatibility)
            _smtpServer = configuration["Smtp:Server"];
            var smtpPortStr = configuration["Smtp:Port"];
            _smtpPort = !string.IsNullOrWhiteSpace(smtpPortStr) ? int.Parse(smtpPortStr) : null;
            _smtpUsername = configuration["Smtp:Username"];
            _smtpPassword = configuration["Smtp:Password"];
            _fromAddress = configuration["Smtp:FromAddress"];
        }

        /// <summary>
        /// Sends an email with the specified subject and body.
        /// This method is used by SendBookingConfirmationEmailAsync.
        /// </summary>
        public async Task SendBookingConfirmationEmailAsync(string to, string subject, string body)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Game Room Booking", _fromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using (var client = new SmtpClient())
            {
                if (string.IsNullOrWhiteSpace(_smtpServer) || !_smtpPort.HasValue)
                {
                    throw new InvalidOperationException("SMTP server and port must be configured to send booking confirmation emails.");
                }

                await client.ConnectAsync(_smtpServer, _smtpPort.Value, MailKit.Security.SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpUsername, _smtpPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
        }

        /// <summary>
        /// Sends a registration link email.
        /// The registration link, subject, and body are built internally.
        /// </summary>
        public async Task SendRegistrationLinkAsync(string to)
        {
            // Generate your registration link (adjust the URL as needed)
            string registrationLink = $"https://yourapp.com/register?email={Uri.EscapeDataString(to)}";
            string subject = "Registration Link for Game Room Booking";
            string body = $"Please click the following link to complete your registration: {registrationLink}";

            await SendBookingConfirmationEmailAsync(to, subject, body);
        }

        /// <summary>
        /// Sends a one-time login code email using HTML template and localized resources.
        /// Uses Azure Communication Services if configured, otherwise falls back to console logging for local development.
        /// </summary>
        public async Task SendLoginCodeAsync(string to, string code, string language = "fi")
        {
            // Normalize language code
            language = NormalizeLanguage(language);

            // Load localized resources using ResourceLoader
            var resources = await ResourceLoader.LoadResourcesAsync(language, "Email");

            // Load and process HTML template
            string htmlContent = await LoadAndProcessTemplateAsync(code, language, resources);

            // Get subject from resources
            string subject = resources.GetValueOrDefault("Subject", 
                language == "en" 
                    ? "Login Code - Game Room Booking System" 
                    : "Kirjautumiskoodi - Pelihuoneen varausjärjestelmä");

            // Try to send via Azure Communication Services if configured
            if (!string.IsNullOrWhiteSpace(_communicationConnectionString) && !string.IsNullOrWhiteSpace(_senderAddress))
            {
                try
                {
                    await SendEmailViaAzureCommunicationServicesAsync(to, subject, htmlContent);
                    _logger.LogInformation("Login code email sent successfully via Azure Communication Services to {Email} in language {Language}", to, language);
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send email via Azure Communication Services to {Email}, falling back to console output", to);
                    // Fall through to console logging
                }
            }

            // Fallback: For local development or if Azure Communication Services is not configured
            // Log to both console and logger
            var fallbackMessage = $"LOGIN CODE FOR: {to}\nCODE: {code}\nLanguage: {language}\nValid for: 10 minutes";
            Console.WriteLine(fallbackMessage);
            _logger.LogWarning("Azure Communication Services not configured. Login code: {Code} for {Email} (Language: {Language})", code, to, language);
        }

        /// <summary>
        /// Normalizes language code to supported values (fi or en).
        /// </summary>
        private static string NormalizeLanguage(string language)
        {
            if (string.IsNullOrWhiteSpace(language))
                return "fi";

            language = language.ToLower();
            return language == "en" ? "en" : "fi";
        }

        /// <summary>
        /// Loads HTML template and replaces placeholders with localized values.
        /// </summary>
        private async Task<string> LoadAndProcessTemplateAsync(string code, string language, Dictionary<string, string> resources)
        {
            // Define placeholder mappings
            var placeholders = new Dictionary<string, string>
            {
                { "{{LANG}}", language },
                { "{{CODE}}", code },
                { "{{TITLE}}", resources.GetValueOrDefault("Title", "Login Code") },
                { "{{HEADER_TITLE}}", resources.GetValueOrDefault("HeaderTitle", "Game Room Booking") },
                { "{{LOGIN_CODE_TITLE}}", resources.GetValueOrDefault("LoginCodeTitle", "Login Code") },
                { "{{GREETING}}", resources.GetValueOrDefault("Greeting", "Hello") },
                { "{{INFO_TEXT}}", resources.GetValueOrDefault("InfoText", "") },
                { "{{NOTE_LABEL}}", resources.GetValueOrDefault("NoteLabel", "Note") },
                { "{{NOTE_TEXT}}", resources.GetValueOrDefault("NoteText", "") },
                { "{{IGNORE_TEXT}}", resources.GetValueOrDefault("IgnoreText", "") },
                { "{{FOOTER_TEXT}}", resources.GetValueOrDefault("FooterText", "") }
            };

            // Try to load template file
            string templatePath = FindTemplateFile("LoginCodeEmail.html");
            
            if (File.Exists(templatePath))
            {
                string htmlContent = await File.ReadAllTextAsync(templatePath);
                
                // Replace all placeholders
                return placeholders.Aggregate(htmlContent, (current, placeholder) => 
                    current.Replace(placeholder.Key, placeholder.Value));
            }

            // Fallback to simple HTML if template not found
            return GenerateFallbackHtml(code, language);
        }

        /// <summary>
        /// Finds template file in multiple possible locations.
        /// </summary>
        private static string FindTemplateFile(string fileName)
        {
            var searchPaths = new[]
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", fileName),
                Path.Combine(Directory.GetCurrentDirectory(), "Templates", fileName),
                Path.Combine("Templates", fileName)
            };

            return searchPaths.FirstOrDefault(File.Exists) ?? searchPaths.Last();
        }

        /// <summary>
        /// Generates fallback HTML when template file is not found.
        /// </summary>
        private static string GenerateFallbackHtml(string code, string language)
        {
            if (language == "en")
            {
                return $@"<html><body>
                    <h2>Login Code</h2>
                    <p>Your login code is: <strong>{code}</strong></p>
                    <p>This code is valid for 10 minutes.</p>
                </body></html>";
            }

            return $@"<html><body>
                <h2>Kirjautumiskoodi</h2>
                <p>Kirjautumiskoodisi on: <strong>{code}</strong></p>
                <p>Tämä koodi on voimassa 10 minuuttia.</p>
            </body></html>";
        }

        /// <summary>
        /// Sends an email using Azure Communication Services.
        /// </summary>
        private async Task SendEmailViaAzureCommunicationServicesAsync(string to, string subject, string htmlContent)
        {
            if (string.IsNullOrWhiteSpace(_communicationConnectionString))
            {
                throw new InvalidOperationException("Azure Communication Services connection string is not configured. " +
                    "Please set it in Azure App Service Configuration as 'ConnectionStrings:CommunicationConnection' or 'CommunicationConnection'.");
            }

            if (string.IsNullOrWhiteSpace(_senderAddress))
            {
                throw new InvalidOperationException("Email sender address is not configured. " +
                    "Please set it in Azure App Service Configuration as 'EmailSettings:SenderAddress'.");
            }

            var emailClient = new EmailClient(_communicationConnectionString);

            try
            {
                var emailContent = new EmailContent(subject)
                {
                    Html = htmlContent
                };

                var emailMessage = new EmailMessage(_senderAddress, to, emailContent);

                var emailOperation = await emailClient.SendAsync(
                    Azure.WaitUntil.Completed,
                    emailMessage);

                // Check the status of the email operation
                if (emailOperation.Value.Status == EmailSendStatus.Failed)
                {
                    throw new Exception($"Email send failed. Status: {emailOperation.Value.Status}");
                }

                _logger.LogInformation("Email sent successfully. Operation ID: {OperationId}, Status: {Status}", 
                    emailOperation.Id, emailOperation.Value.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending email via Azure Communication Services to {Email}", to);
                throw;
            }
        }

    }
}
