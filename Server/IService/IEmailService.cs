namespace gameroombookingsys.IService
{
    public interface IEmailService
    {
        Task SendRegistrationLinkAsync(string to);
        Task SendBookingConfirmationEmailAsync(string to, string subject, string body);
        Task SendLoginCodeAsync(string to, string code, string language = "fi");
    }
}
