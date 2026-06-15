namespace expenseKubex.Services;

public interface IEmailSender
{
    Task SendPasswordResetCodeAsync(string recipientEmail, string code);
    Task SendAdminInviteAsync(string recipientEmail, string code, string role);
}
