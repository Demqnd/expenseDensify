using System.Net;
using System.Net.Mail;
using expenseKubex.Config;
using Microsoft.Extensions.Options;

namespace expenseKubex.Services;

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
            Subject = "Your ExpenseKubex password reset code",
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

    public async Task SendAdminInviteAsync(string recipientEmail, string code, string role)
    {
        if (string.IsNullOrWhiteSpace(_settings.Username) ||
            string.IsNullOrWhiteSpace(_settings.AppPassword) ||
            string.IsNullOrWhiteSpace(_settings.FromEmail))
        {
            throw new InvalidOperationException(
                "Gmail SMTP settings are missing. Configure Username, AppPassword, and FromEmail.");
        }

        var resetLink = $"http://localhost:3000/reset-password?email={Uri.EscapeDataString(recipientEmail)}";

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail.Trim(), _settings.FromName.Trim()),
            Subject = "You are invited to ExpenseKubex",
            Body =
                $"You have been invited to ExpenseKubex as {role}.\n\n" +
                "Use this one-time code to set your password:\n" +
                $"{code}\n\n" +
                "Open this link to continue:\n" +
                $"{resetLink}\n\n" +
                "Enter the code first, verify it, then create your new password. " +
                "This code expires in 15 minutes and can only be used once.",
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