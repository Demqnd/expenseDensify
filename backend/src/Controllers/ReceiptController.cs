using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace expenseKubex.Controllers;

[ApiController]
[Route("api/receipt")]
[Authorize]
public class ReceiptController(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<ReceiptController> logger) : ControllerBase
{
    [HttpPost("extract")]
    public async Task<IActionResult> Extract([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { detail = "Receipt image is required." });
        }

        var ocrBaseUrl = configuration["OcrService:BaseUrl"] ?? "http://localhost:8010";
        var endpoint = $"{ocrBaseUrl.TrimEnd('/')}/receipt/extract";

        var client = httpClientFactory.CreateClient("OcrService");

        using var multipartContent = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);

        if (!string.IsNullOrWhiteSpace(file.ContentType))
        {
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(file.ContentType);
        }

        multipartContent.Add(fileContent, "file", file.FileName);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync(endpoint, multipartContent, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Could not connect to OCR service at {Endpoint}", endpoint);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { detail = "Could not connect to OCR service. Make sure OCR API is running." });
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return StatusCode((int)response.StatusCode, new { detail = "OCR service returned an empty response." });
        }

        try
        {
            using var json = JsonDocument.Parse(responseBody);
            return StatusCode((int)response.StatusCode, json.RootElement.Clone());
        }
        catch (JsonException)
        {
            return StatusCode((int)response.StatusCode, new { detail = responseBody });
        }
    }
}
