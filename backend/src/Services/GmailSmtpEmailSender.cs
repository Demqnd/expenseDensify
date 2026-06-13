using System.Net;
using System.Net.Mail;
using expenseDensify.Config;
using Microsoft.Extensions.Options;

namespace expenseDensify.Services;

public class GmailSmtpEmailSender(IOptions<GmailSmtpSettings> gmailOptions) : IEmailSender
{
    private readonly GmailSmtpSettings _settings = gmailOptions.Value;

    public async Task SendPasswordResetCodeAsync(string recipientEmail, string code)
    {
        if (string.IsNullOrWhiteSpace(_settings.Username) ||
            string.IsNullOrWhiteSpace(_settings.AppPassword) ||
            string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            throw new InvalidOperationException(
                "Gmail SMTP settings are missing. Configure Username, AppPassword, and FromEmail.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail.Trim(), _settings.FromName.Trim()),
            Subject = "Your ExpenseDensify password reset code",
            Body = $"Use this code to reset your password: {code}. This code expires in 15 minutes.",
            IsBodyHtml = false
        };

        message.To.Add(recipientEmail);

        using var smtpClient = new SmtpClient(_settings.Host.Trim(), _settings.Port)
        {
            EnableSsl = _settings.EnableSsl,
            Credentials = new NetworkCredential(_settings.Username.Trim(), _settings.AppPassword.Trim())
        };

        await smtpClient.SendMailAsync(message);
    }
}