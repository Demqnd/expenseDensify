using System.Text;
using System.Text.Json;

namespace expenseKubex.Services;

public class WebhookMessageSender(IHttpClientFactory httpClientFactory) : IWebhookMessageSender
{
    public async Task SendAsync(string webhookUrl, string message, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(webhookUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("The configured webhook URL is not a valid http/https URL.");
        }

        var client = httpClientFactory.CreateClient("Webhook");
        var payload = JsonSerializer.Serialize(new { text = message });

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(uri, content, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Webhook call failed with status {(int)response.StatusCode} ({response.ReasonPhrase}).");
        }
    }
}
