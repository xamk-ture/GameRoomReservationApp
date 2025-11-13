using Microsoft.Extensions.Configuration;
using System;
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
    }
}
