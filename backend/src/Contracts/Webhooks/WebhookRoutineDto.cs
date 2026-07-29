namespace expenseKubex.Contracts.Webhooks;

public record WebhookRoutineDto(string Url, DateTime? UpdatedAtUtc);
