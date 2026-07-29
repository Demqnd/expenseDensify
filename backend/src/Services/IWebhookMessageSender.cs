namespace expenseKubex.Services;

public interface IWebhookMessageSender
{
    Task SendAsync(string webhookUrl, string message, CancellationToken cancellationToken = default);
}
