using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Assessment.Infrastructure.Data;

public class AssessmentDbContext : DbContext
{
    public AssessmentDbContext(DbContextOptions<AssessmentDbContext> options) : base(options) { }

    public DbSet<QuizBlock> QuizBlocks => Set<QuizBlock>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizOption> QuizOptions => Set<QuizOption>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<QuizAttemptAnswer> QuizAttemptAnswers => Set<QuizAttemptAnswer>();
    public DbSet<AttemptSelectedOption> AttemptSelectedOptions => Set<AttemptSelectedOption>();
    public DbSet<FlashcardBlock> FlashcardBlocks => Set<FlashcardBlock>();
    public DbSet<Flashcard> Flashcards => Set<Flashcard>();
    public DbSet<CloResult> CloResults => Set<CloResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<QuizBlock>(entity =>
        {
            entity.ToTable("quiz_blocks");
            entity.HasKey(e => e.QuizId);
            entity.Property(e => e.QuizId).HasColumnName("quiz_id");
            entity.Property(e => e.BlockId).HasColumnName("block_id").IsRequired();
            entity.HasIndex(e => e.BlockId).IsUnique();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.PassingScore).HasColumnName("passing_score").HasPrecision(5, 2).HasDefaultValue(70.00m);
            entity.Property(e => e.MaxAttempts).HasColumnName("max_attempts").HasDefaultValue(3);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<QuizQuestion>(entity =>
        {
            entity.ToTable("quiz_questions");
            entity.HasKey(e => e.QuestionId);
            entity.Property(e => e.QuestionId).HasColumnName("question_id");
            entity.Property(e => e.QuizId).HasColumnName("quiz_id");
            entity.Property(e => e.CloId).HasColumnName("clo_id").IsRequired();
            entity.Property(e => e.QuestionText).HasColumnName("question_text").IsRequired();
            entity.Property(e => e.QuestionType).HasColumnName("question_type").HasConversion<string>();
            entity.Property(e => e.BloomLevel).HasColumnName("bloom_level").IsRequired();
            entity.Property(e => e.CloWeight).HasColumnName("clo_weight").HasPrecision(4, 2).HasDefaultValue(1.00m);
            entity.Property(e => e.Explanation).HasColumnName("explanation");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);

            entity.HasOne(e => e.QuizBlock).WithMany(q => q.Questions).HasForeignKey(e => e.QuizId);
        });

        modelBuilder.Entity<QuizOption>(entity =>
        {
            entity.ToTable("quiz_options");
            entity.HasKey(e => e.OptionId);
            entity.Property(e => e.OptionId).HasColumnName("option_id");
            entity.Property(e => e.QuestionId).HasColumnName("question_id");
            entity.Property(e => e.OptionText).HasColumnName("option_text").IsRequired();
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct").HasDefaultValue(false);
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);

            entity.HasOne(e => e.Question).WithMany(q => q.Options).HasForeignKey(e => e.QuestionId);
        });

        modelBuilder.Entity<QuizAttempt>(entity =>
        {
            entity.ToTable("quiz_attempts");
            entity.HasKey(e => e.AttemptId);
            entity.Property(e => e.AttemptId).HasColumnName("attempt_id");
            entity.Property(e => e.QuizId).HasColumnName("quiz_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id").IsRequired();
            entity.Property(e => e.Score).HasColumnName("score").HasPrecision(5, 2).IsRequired();
            entity.Property(e => e.IsPassed).HasColumnName("is_passed").HasDefaultValue(false);
            entity.Property(e => e.SubmittedAt).HasColumnName("submitted_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.QuizBlock).WithMany(q => q.Attempts).HasForeignKey(e => e.QuizId);
        });

        modelBuilder.Entity<QuizAttemptAnswer>(entity =>
        {
            entity.ToTable("quiz_attempt_answers");
            entity.HasKey(e => e.AttemptAnswerId);
            entity.Property(e => e.AttemptAnswerId).HasColumnName("attempt_answer_id");
            entity.Property(e => e.AttemptId).HasColumnName("attempt_id");
            entity.Property(e => e.QuestionId).HasColumnName("question_id").IsRequired();
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct").IsRequired();

            entity.HasOne(e => e.Attempt).WithMany(a => a.Answers).HasForeignKey(e => e.AttemptId);
        });

        modelBuilder.Entity<AttemptSelectedOption>(entity =>
        {
            entity.ToTable("attempt_selected_options");
            entity.HasKey(e => new { e.AttemptAnswerId, e.OptionId });
            entity.Property(e => e.AttemptAnswerId).HasColumnName("attempt_answer_id");
            entity.Property(e => e.OptionId).HasColumnName("option_id");

            entity.HasOne(e => e.AttemptAnswer).WithMany(a => a.SelectedOptions).HasForeignKey(e => e.AttemptAnswerId);
        });

        modelBuilder.Entity<FlashcardBlock>(entity =>
        {
            entity.ToTable("flashcard_blocks");
            entity.HasKey(e => e.FlashcardSetId);
            entity.Property(e => e.FlashcardSetId).HasColumnName("flashcard_set_id");
            entity.Property(e => e.BlockId).HasColumnName("block_id").IsRequired();
            entity.HasIndex(e => e.BlockId).IsUnique();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Flashcard>(entity =>
        {
            entity.ToTable("flashcards");
            entity.HasKey(e => e.FlashcardId);
            entity.Property(e => e.FlashcardId).HasColumnName("flashcard_id");
            entity.Property(e => e.FlashcardSetId).HasColumnName("flashcard_set_id");
            entity.Property(e => e.FrontText).HasColumnName("front_text").HasMaxLength(255).IsRequired();
            entity.Property(e => e.BackText).HasColumnName("back_text").IsRequired();
            entity.Property(e => e.RealWorldExample).HasColumnName("real_world_example");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);

            entity.HasOne(e => e.FlashcardBlock).WithMany(f => f.Flashcards).HasForeignKey(e => e.FlashcardSetId);
        });

        modelBuilder.Entity<CloResult>(entity =>
        {
            entity.ToTable("clo_results");
            entity.HasKey(e => e.ResultId);
            entity.Property(e => e.ResultId).HasColumnName("result_id");
            entity.Property(e => e.CourseId).HasColumnName("course_id").IsRequired();
            entity.Property(e => e.StudentId).HasColumnName("student_id").IsRequired();
            entity.Property(e => e.CloId).HasColumnName("clo_id").IsRequired();
            entity.Property(e => e.ScorePercentage).HasColumnName("score_percentage").HasPrecision(5, 2).IsRequired();
            entity.Property(e => e.RubricLevel).HasColumnName("rubric_level").IsRequired();
            entity.Property(e => e.EvaluatedAt).HasColumnName("evaluated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.CourseId, e.StudentId, e.CloId }).IsUnique();
            entity.HasIndex(e => new { e.CourseId, e.CloId });
        });
    }
}