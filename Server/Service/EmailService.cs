using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MimeKit;
using gameroombookingsys.IService;
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
            language = language.ToLower();
            if (language != "en" && language != "fi")
            {
                language = "fi"; // Default to Finnish
            }

            // Load localized resources
            var resources = await LoadEmailResourcesAsync(language);

            // Load HTML template
            string templatePath = FindFile("Templates", "LoginCodeEmail.html");
            string htmlContent;
            
            if (File.Exists(templatePath))
            {
                htmlContent = await File.ReadAllTextAsync(templatePath);
                
                // Replace all placeholders
                htmlContent = htmlContent
                    .Replace("{{LANG}}", language)
                    .Replace("{{TITLE}}", resources.GetValueOrDefault("Title", "Login Code"))
                    .Replace("{{HEADER_TITLE}}", resources.GetValueOrDefault("HeaderTitle", "Game Room Booking"))
                    .Replace("{{LOGIN_CODE_TITLE}}", resources.GetValueOrDefault("LoginCodeTitle", "Login Code"))
                    .Replace("{{GREETING}}", resources.GetValueOrDefault("Greeting", "Hello"))
                    .Replace("{{INFO_TEXT}}", resources.GetValueOrDefault("InfoText", ""))
                    .Replace("{{CODE}}", code)
                    .Replace("{{NOTE_LABEL}}", resources.GetValueOrDefault("NoteLabel", "Note"))
                    .Replace("{{NOTE_TEXT}}", resources.GetValueOrDefault("NoteText", ""))
                    .Replace("{{IGNORE_TEXT}}", resources.GetValueOrDefault("IgnoreText", ""))
                    .Replace("{{FOOTER_TEXT}}", resources.GetValueOrDefault("FooterText", ""));
            }
            else
            {
                // Fallback to simple HTML if template not found
                htmlContent = language == "en"
                    ? $"<html><body><h2>Login Code</h2><p>Your login code is: <strong>{code}</strong></p><p>This code is valid for 10 minutes.</p></body></html>"
                    : $"<html><body><h2>Kirjautumiskoodi</h2><p>Kirjautumiskoodisi on: <strong>{code}</strong></p><p>Tämä koodi on voimassa 10 minuuttia.</p></body></html>";
            }

            string subject = resources.GetValueOrDefault("Subject", 
                language == "en" 
                    ? "Login Code - Game Room Booking System" 
                    : "Kirjautumiskoodi - Pelihuoneen varausjärjestelmä");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Game Room Booking", _fromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlContent };

            using (var client = new SmtpClient())
            {
                await client.ConnectAsync(_smtpServer, _smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpUsername, _smtpPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
        }

        /// <summary>
        /// Loads email resources from JSON file for the specified language.
        /// </summary>
        private async Task<Dictionary<string, string>> LoadEmailResourcesAsync(string language)
        {
            // Use same structure as frontend: locales/{lang}/Email.json
            string resourceFile = "Email.json";
            string resourcePath = FindFile(Path.Combine("Resources", "locales", language), resourceFile);

            if (File.Exists(resourcePath))
            {
                try
                {
                    string jsonContent = await File.ReadAllTextAsync(resourcePath);
                    var resources = JsonSerializer.Deserialize<Dictionary<string, string>>(jsonContent);
                    return resources ?? new Dictionary<string, string>();
                }
                catch (Exception)
                {
                    // If parsing fails, return empty dictionary
                    return new Dictionary<string, string>();
                }
            }

            // Fallback: try to load Finnish if requested language not found
            if (language != "fi")
            {
                return await LoadEmailResourcesAsync("fi");
            }

            return new Dictionary<string, string>();
        }

        /// <summary>
        /// Finds a file in the specified directory, trying multiple locations.
        /// </summary>
        private string FindFile(string directory, string fileName)
        {
            // Try base directory first
            string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, directory, fileName);
            if (File.Exists(path))
                return path;

            // Try current directory
            path = Path.Combine(Directory.GetCurrentDirectory(), directory, fileName);
            if (File.Exists(path))
                return path;

            // Try relative path
            path = Path.Combine(directory, fileName);
            return path;
        }
    }
}
