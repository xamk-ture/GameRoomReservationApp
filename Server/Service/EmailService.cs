using Microsoft.Extensions.Configuration;
using System;
using System.IO;
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
        /// Sends a one-time login code email using HTML templates.
        /// </summary>
        public async Task SendLoginCodeAsync(string to, string code, string language = "fi")
        {
            // Determine template file based on language
            string templateFile = language.ToLower() switch
            {
                "en" => "LoginCodeEmail_en.html",
                "fi" => "LoginCodeEmail_fi.html",
                _ => "LoginCodeEmail_fi.html" // Default to Finnish
            };

            // Get the path to the Templates directory
            string templatesPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", templateFile);
            
            // If not found in base directory, try relative to current directory
            if (!File.Exists(templatesPath))
            {
                templatesPath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", templateFile);
            }

            // If still not found, try relative path from Server directory
            if (!File.Exists(templatesPath))
            {
                templatesPath = Path.Combine("Templates", templateFile);
            }

            string htmlContent;
            if (File.Exists(templatesPath))
            {
                htmlContent = await File.ReadAllTextAsync(templatesPath);
                htmlContent = htmlContent.Replace("{{CODE}}", code);
            }
            else
            {
                // Fallback to plain text if template not found
                htmlContent = language.ToLower() == "en"
                    ? $"<html><body><h2>Login Code</h2><p>Your login code is: <strong>{code}</strong></p><p>This code is valid for 10 minutes.</p></body></html>"
                    : $"<html><body><h2>Kirjautumiskoodi</h2><p>Kirjautumiskoodisi on: <strong>{code}</strong></p><p>Tämä koodi on voimassa 10 minuuttia.</p></body></html>";
            }

            string subject = language.ToLower() == "en"
                ? "Login Code - Game Room Booking System"
                : "Kirjautumiskoodi - Pelihuoneen varausjärjestelmä";

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
    }
}
