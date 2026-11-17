using System.Net.Http.Json;
using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BrainMemo.AI.Infrastructure.Llm;

public sealed class GeminiLlmClient : ILlmClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiLlmClient> _logger;

    private int _consecutiveFailures;
    private DateTimeOffset _circuitTripUntil = DateTimeOffset.MinValue;
    private readonly object _circuitLock = new();

    public GeminiLlmClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiLlmClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LlmResult> GenerateJson(
        string systemPrompt,
        string userPrompt,
        TimeSpan timeout,
        CancellationToken ct = default)
    {
        lock (_circuitLock)
        {
            if (DateTimeOffset.UtcNow < _circuitTripUntil)
            {
                return new LlmResult(
                    false,
                    null,
                    "CIRCUIT_OPEN",
                    "Circuit breaker is open. Gemini calls temporarily suspended.",
                    "GEMINI");
            }
        }

        string? apiKey = _configuration["AI:GeminiApiKey"]
            ?? _configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        using CancellationTokenSource timeoutCts = new(timeout);
        using CancellationTokenSource linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

        try
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                // Fallback simulation for local/testing when no Gemini key is provided
                string fallbackJson = GenerateSimulatedResponse(systemPrompt, userPrompt);
                RecordSuccess();
                return new LlmResult(true, fallbackJson, null, null, "GEMINI_SIMULATED");
            }

            string model = _configuration["AI:GeminiModel"] ?? "gemini-1.5-flash";
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var requestBody = new
            {
                system_instruction = new
                {
                    parts = new object[]
                    {
                        new { text = systemPrompt + "\nOutput strictly valid JSON with no markdown formatting." }
                    }
                },
                contents = new object[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = userPrompt }
                        }
                    }
                },
                generationConfig = new
                {
                    response_mime_type = "application/json"
                }
            };

            HttpResponseMessage response = await _httpClient.PostAsJsonAsync(url, requestBody, linkedCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                string errorBody = await response.Content.ReadAsStringAsync(linkedCts.Token);
                _logger.LogWarning("Gemini API call failed with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                RecordFailure();
                return new LlmResult(false, null, "LLM_API_ERROR", $"Gemini error: {response.StatusCode}", "GEMINI");
            }

            JsonDocument doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(linkedCts.Token), cancellationToken: linkedCts.Token);
            JsonElement root = doc.RootElement;
            string? rawText = null;

            if (root.TryGetProperty("candidates", out JsonElement candidates)
                && candidates.GetArrayLength() > 0
                && candidates[0].TryGetProperty("content", out JsonElement content)
                && content.TryGetProperty("parts", out JsonElement parts)
                && parts.GetArrayLength() > 0
                && parts[0].TryGetProperty("text", out JsonElement textElem))
            {
                rawText = textElem.GetString();
            }

            if (string.IsNullOrWhiteSpace(rawText))
            {
                RecordFailure();
                return new LlmResult(false, null, "EMPTY_LLM_RESPONSE", "Gemini returned empty response.", "GEMINI");
            }

            RecordSuccess();
            return new LlmResult(true, CleanJson(rawText), null, null, "GEMINI");
        }
        catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
        {
            RecordFailure();
            return new LlmResult(false, null, "TIMEOUT", "Yêu cầu tới AI LLM đã quá thời gian 30 giây.", "GEMINI");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Gemini API");
            RecordFailure();
            return new LlmResult(false, null, "LLM_EXCEPTION", ex.Message, "GEMINI");
        }
    }

    private void RecordSuccess()
    {
        lock (_circuitLock)
        {
            _consecutiveFailures = 0;
            _circuitTripUntil = DateTimeOffset.MinValue;
        }
    }

    private void RecordFailure()
    {
        lock (_circuitLock)
        {
            _consecutiveFailures++;
            if (_consecutiveFailures >= 3)
            {
                _circuitTripUntil = DateTimeOffset.UtcNow.AddSeconds(30);
                _logger.LogWarning("Gemini circuit breaker tripped open for 30s after {Failures} consecutive failures.", _consecutiveFailures);
            }
        }
    }

    private static string CleanJson(string raw)
    {
        string trimmed = raw.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[7..];
        }
        else if (trimmed.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[3..];
        }

        if (trimmed.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[..^3];
        }

        return trimmed.Trim();
    }

    private static string GenerateSimulatedResponse(string systemPrompt, string userPrompt)
    {
        bool isQuiz = systemPrompt.Contains("quiz", StringComparison.OrdinalIgnoreCase)
            || userPrompt.Contains("quiz", StringComparison.OrdinalIgnoreCase)
            || systemPrompt.Contains("câu hỏi", StringComparison.OrdinalIgnoreCase);

        if (isQuiz)
        {
            var questions = new[]
            {
                new
                {
                    itemNo = 1,
                    questionType = "MULTIPLE_CHOICE",
                    stem = "Khái niệm chính được đề cập trong nội dung là gì?",
                    explanation = "Nội dung giải thích dựa trên tài liệu đã cung cấp.",
                    referenceAnswer = (string?)null,
                    defaultPoints = 1.0m,
                    tags = new[] { "AI", "GenAI" },
                    options = new[]
                    {
                        new { position = 1, content = "Khái niệm cốt lõi theo tài liệu", matchContent = (string?)null, blankNo = (int?)null, isCorrect = true },
                        new { position = 2, content = "Khái niệm phụ không liên quan", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false },
                        new { position = 3, content = "Một phương án ngẫu nhiên khác", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false },
                        new { position = 4, content = "Tất cả các ý trên đều sai", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false }
                    }
                },
                new
                {
                    itemNo = 2,
                    questionType = "MULTIPLE_CHOICE",
                    stem = "Ứng dụng thực tế của kiến thức bài học là gì?",
                    explanation = "Tài liệu chỉ ra tính ứng dụng thực tiễn cao.",
                    referenceAnswer = (string?)null,
                    defaultPoints = 1.0m,
                    tags = new[] { "AI", "Application" },
                    options = new[]
                    {
                        new { position = 1, content = "Áp dụng vào quy trình tối ưu hệ thống", matchContent = (string?)null, blankNo = (int?)null, isCorrect = true },
                        new { position = 2, content = "Không có tính ứng dụng trong thực tế", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false },
                        new { position = 3, content = "Chỉ dùng cho mục đích giải trí", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false },
                        new { position = 4, content = "Cả 3 phương án trên", matchContent = (string?)null, blankNo = (int?)null, isCorrect = false }
                    }
                }
            };
            return JsonSerializer.Serialize(questions);
        }
        else
        {
            var flashcards = new[]
            {
                new { front = "Khái niệm trọng tâm", back = "Định nghĩa cốt lõi được rút trích từ nội dung học tập." },
                new { front = "Thuật ngữ chuyên ngành", back = "Ý nghĩa và cách áp dụng thuật ngữ trong thực tiễn." },
                new { front = "Nguyên tắc thiết kế", back = "Quy tắc cơ bản để xây dựng hệ thống tin cậy." }
            };
            return JsonSerializer.Serialize(flashcards);
        }
    }
}
