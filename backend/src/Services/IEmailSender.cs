namespace expenseDensify.Services;

public interface IEmailSender
{
    Task SendPasswordResetCodeAsync(string recipientEmail, string code);
}
