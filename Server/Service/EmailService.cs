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
// Alias to use MailKit's SmtpClient instead of System.Net.Mail.SmtpClient
using SmtpClient = MailKit.Net.Smtp.SmtpClient;

namespace gameroombookingsys.Helpers
{
    public class EmailService : IEmailService
    {
        // SMTP configuration fields—these will come from appsettings.json.
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromAddress;

        public EmailService(IConfiguration configuration)
        {
            _smtpServer = configuration["Smtp:Server"];
            _smtpPort = int.Parse(configuration["Smtp:Port"]);
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
                await client.ConnectAsync(_smtpServer, _smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
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

            // Send email
            await SendEmailAsync(to, subject, htmlContent);
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
        /// Sends an email using SMTP.
        /// </summary>
        private async Task SendEmailAsync(string to, string subject, string htmlContent)
        {
            await SendEmailAsync(to, subject, htmlContent);
        }

    }
}
