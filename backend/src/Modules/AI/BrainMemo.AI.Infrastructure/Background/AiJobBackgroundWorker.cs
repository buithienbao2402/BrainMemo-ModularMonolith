using System.Text.Json;
using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.AI.Domain.Enums;
using BrainMemo.AI.Infrastructure.Persistence;
using BrainMemo.BuildingBlocks.Abstractions.Ai;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BrainMemo.AI.Infrastructure.Background;

public sealed class AiJobBackgroundWorker(
    IAiJobQueue jobQueue,
    IServiceScopeFactory scopeFactory,
    ILogger<AiJobBackgroundWorker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                Guid jobId = await jobQueue.DequeueAsync(stoppingToken);
                await ProcessJobAsync(jobId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unexpected error processing background AI job");
            }
        }
    }

    private async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
    {
        using IServiceScope scope = scopeFactory.CreateScope();
        AiDbContext dbContext = scope.ServiceProvider.GetRequiredService<AiDbContext>();
        ILlmClient llmClient = scope.ServiceProvider.GetRequiredService<ILlmClient>();
        IContentContract contentContract = scope.ServiceProvider.GetRequiredService<IContentContract>();

        AiGenerationJob? job = await dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job is null)
        {
            logger.LogWarning("AI Job {JobId} not found in database", jobId);
            return;
        }

        job.MarkRunning();
        await dbContext.SaveChangesAsync(ct);

        try
        {
            string inputText = string.Empty;
            if (job.SourceKind == AiSourceKind.Chapter)
            {
                if (!job.SourceChapterId.HasValue)
                {
                    job.MarkFailed("Thiếu sourceChapterId.");
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                Result<string> chapterTextResult = contentContract.GetChapterTextForAi(job.SourceChapterId.Value, job.UserId);
                if (chapterTextResult.IsFailure)
                {
                    job.MarkFailed(chapterTextResult.Error.Message);
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                inputText = chapterTextResult.Value;
            }
            else
            {
                inputText = job.SourceText ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(inputText))
            {
                job.MarkFailed("Nội dung đầu vào trống.");
                await dbContext.SaveChangesAsync(ct);
                return;
            }

            string systemPrompt;
            string userPrompt;

            if (job.JobType == AiJobType.Quiz)
            {
                systemPrompt = "Bạn là chuyên gia khảo thí và tạo câu hỏi trắc nghiệm chất lượng cao. " +
                    "Hãy tạo câu hỏi trắc nghiệm dựa vào tài liệu. Trả về mảng JSON các câu hỏi, mỗi câu có cấu trúc: " +
                    "itemNo (số), questionType (chuỗi 'MULTIPLE_CHOICE'), stem (câu hỏi), explanation (giải thích), " +
                    "defaultPoints (1.0), tags (mảng chuỗi), options (mảng 4 lựa chọn có position, content, isCorrect true/false).";

                userPrompt = $"Tạo câu hỏi từ tài liệu sau:\n\n{inputText}\n\nThông số yêu cầu: {job.GenerationParams}";

                LlmResult llmResult = await llmClient.GenerateJson(systemPrompt, userPrompt, TimeSpan.FromSeconds(30), ct);
                if (!llmResult.IsSuccess || string.IsNullOrWhiteSpace(llmResult.JsonContent))
                {
                    job.MarkFailed(llmResult.ErrorMessage ?? "Lỗi gọi LLM sinh câu hỏi.");
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                AiQuestionItem[]? items = JsonSerializer.Deserialize<AiQuestionItem[]>(llmResult.JsonContent, JsonOpts);
                if (items is null || items.Length == 0)
                {
                    job.MarkFailed("Không thể phân tích dữ liệu câu hỏi từ kết quả AI.");
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                Result importResult = contentContract.ImportAiGeneratedQuestions(job.CourseId, job.UserId, job.Id, items);
                if (importResult.IsFailure)
                {
                    job.MarkFailed(importResult.Error.Message);
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                job.MarkCompleted(items.Length);
                await dbContext.SaveChangesAsync(ct);
            }
            else
            {
                systemPrompt = "Bạn là trợ lý giáo dục chuyên tạo thẻ ghi nhớ (flashcard). " +
                    "Hãy trích xuất các thuật ngữ, khái niệm cốt lõi từ văn bản và tạo bộ flashcard 2 mặt. " +
                    "Trả về mảng JSON các đối tượng gồm front (mặt trước / câu hỏi / thuật ngữ) và back (mặt sau / định nghĩa / câu trả lời).";

                userPrompt = $"Tạo flashcards từ tài liệu sau:\n\n{inputText}\n\nThông số yêu cầu: {job.GenerationParams}";

                LlmResult llmResult = await llmClient.GenerateJson(systemPrompt, userPrompt, TimeSpan.FromSeconds(30), ct);
                if (!llmResult.IsSuccess || string.IsNullOrWhiteSpace(llmResult.JsonContent))
                {
                    job.MarkFailed(llmResult.ErrorMessage ?? "Lỗi gọi LLM sinh flashcard.");
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                Flashcard[]? cards = JsonSerializer.Deserialize<Flashcard[]>(llmResult.JsonContent, JsonOpts);
                if (cards is null || cards.Length == 0)
                {
                    job.MarkFailed("Không thể phân tích dữ liệu flashcard từ kết quả AI.");
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                Result importResult = contentContract.ImportAiGeneratedFlashcards(job.SourceChapterId!.Value, job.UserId, job.Id, cards);
                if (importResult.IsFailure)
                {
                    job.MarkFailed(importResult.Error.Message);
                    await dbContext.SaveChangesAsync(ct);
                    return;
                }

                job.MarkCompleted(cards.Length);
                await dbContext.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process AI Job {JobId}", jobId);
            job.MarkFailed(ex.Message);
            await dbContext.SaveChangesAsync(ct);
        }
    }
}
