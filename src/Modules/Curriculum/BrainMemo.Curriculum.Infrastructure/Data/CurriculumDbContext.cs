using BrainMemo.Curriculum.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Curriculum.Infrastructure.Data;

public class CurriculumDbContext : DbContext
{
    public CurriculumDbContext(DbContextOptions<CurriculumDbContext> options) : base(options) { }

    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<CourseTag> CourseTags => Set<CourseTag>();
    public DbSet<CourseClo> CourseClos => Set<CourseClo>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<TextBlock> TextBlocks => Set<TextBlock>();
    public DbSet<MediaBlock> MediaBlocks => Set<MediaBlock>();
    public DbSet<UserCourseProgress> UserCourseProgresses => Set<UserCourseProgress>();
    public DbSet<Discussion> Discussions => Set<Discussion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("courses");
            entity.HasKey(e => e.CourseId);
            entity.Property(e => e.CourseId).HasColumnName("course_id");
            entity.Property(e => e.CreatorId).HasColumnName("creator_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(280).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ThumbnailMediaId).HasColumnName("thumbnail_media_id");
            entity.Property(e => e.AccessType).HasColumnName("access_type").HasConversion<string>();
            entity.Property(e => e.PasscodeHash).HasColumnName("passcode_hash");
            entity.Property(e => e.IsPublished).HasColumnName("is_published").HasDefaultValue(false);
            entity.Property(e => e.PublishedAt).HasColumnName("published_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(e => e.TagId);
            entity.Property(e => e.TagId).HasColumnName("tag_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(60).IsRequired();
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<CourseTag>(entity =>
        {
            entity.ToTable("course_tags");
            entity.HasKey(e => new { e.CourseId, e.TagId });
            entity.Property(e => e.CourseId).HasColumnName("course_id");
            entity.Property(e => e.TagId).HasColumnName("tag_id");

            entity.HasOne(e => e.Course).WithMany(c => c.CourseTags).HasForeignKey(e => e.CourseId);
            entity.HasOne(e => e.Tag).WithMany(t => t.CourseTags).HasForeignKey(e => e.TagId);
        });

        modelBuilder.Entity<CourseClo>(entity =>
        {
            entity.ToTable("course_clos");
            entity.HasKey(e => e.CloId);
            entity.Property(e => e.CloId).HasColumnName("clo_id");
            entity.Property(e => e.CourseId).HasColumnName("course_id");
            entity.Property(e => e.CloCode).HasColumnName("clo_code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.TargetPercentage).HasColumnName("target_percentage").HasPrecision(5, 2).HasDefaultValue(75.00m);
            entity.Property(e => e.BloomLevel).HasColumnName("bloom_level").HasConversion<string>();
            entity.HasIndex(e => new { e.CourseId, e.CloCode }).IsUnique();

            entity.HasOne(e => e.Course).WithMany(c => c.CourseClos).HasForeignKey(e => e.CourseId);
        });

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.ToTable("enrollments");
            entity.HasKey(e => e.EnrollmentId);
            entity.Property(e => e.EnrollmentId).HasColumnName("enrollment_id");
            entity.Property(e => e.CourseId).HasColumnName("course_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("STUDENT");
            entity.Property(e => e.EnrolledAt).HasColumnName("enrolled_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.CourseId, e.StudentId }).IsUnique();

            entity.HasOne(e => e.Course).WithMany(c => c.Enrollments).HasForeignKey(e => e.CourseId);
        });

        modelBuilder.Entity<Chapter>(entity =>
        {
            entity.ToTable("chapters");
            entity.HasKey(e => e.ChapterId);
            entity.Property(e => e.ChapterId).HasColumnName("chapter_id");
            entity.Property(e => e.CourseId).HasColumnName("course_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);
            entity.Property(e => e.AccessType).HasColumnName("access_type").HasConversion<string>();
            entity.Property(e => e.PasscodeHash).HasColumnName("passcode_hash");

            entity.HasOne(e => e.Course).WithMany(c => c.Chapters).HasForeignKey(e => e.CourseId);
        });

        modelBuilder.Entity<Page>(entity =>
        {
            entity.ToTable("pages");
            entity.HasKey(e => e.PageId);
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.ChapterId).HasColumnName("chapter_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);

            entity.HasOne(e => e.Chapter).WithMany(c => c.Pages).HasForeignKey(e => e.ChapterId);
        });

        modelBuilder.Entity<Block>(entity =>
        {
            entity.ToTable("blocks");
            entity.HasKey(e => e.BlockId);
            entity.Property(e => e.BlockId).HasColumnName("block_id");
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.BlockType).HasColumnName("block_type").HasConversion<string>();
            entity.Property(e => e.OrderIndex).HasColumnName("order_index").HasDefaultValue(1);

            entity.HasOne(e => e.Page).WithMany(p => p.Blocks).HasForeignKey(e => e.PageId);
        });

        modelBuilder.Entity<TextBlock>(entity =>
        {
            entity.ToTable("text_blocks");
            entity.HasKey(e => e.BlockId);
            entity.Property(e => e.BlockId).HasColumnName("block_id");
            entity.Property(e => e.ContentMarkdown).HasColumnName("content_markdown").IsRequired();

            entity.HasOne(e => e.Block).WithOne(b => b.TextBlock).HasForeignKey<TextBlock>(e => e.BlockId);
        });

        modelBuilder.Entity<MediaBlock>(entity =>
        {
            entity.ToTable("media_blocks");
            entity.HasKey(e => e.BlockId);
            entity.Property(e => e.BlockId).HasColumnName("block_id");
            entity.Property(e => e.MediaFileId).HasColumnName("media_file_id").IsRequired();

            entity.HasOne(e => e.Block).WithOne(b => b.MediaBlock).HasForeignKey<MediaBlock>(e => e.BlockId);
        });

        modelBuilder.Entity<UserCourseProgress>(entity =>
        {
            entity.ToTable("user_course_progress");
            entity.HasKey(e => e.ProgressId);
            entity.Property(e => e.ProgressId).HasColumnName("progress_id");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.CourseId).HasColumnName("course_id").IsRequired();
            entity.Property(e => e.ProgressPercentage).HasColumnName("progress_percentage").HasPrecision(5, 2).HasDefaultValue(0.00m);
            entity.Property(e => e.CompletedChaptersCount).HasColumnName("completed_chapters_count").HasDefaultValue(0);
            entity.Property(e => e.LastUpdated).HasColumnName("last_updated").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();

            entity.HasOne(e => e.Course).WithMany().HasForeignKey(e => e.CourseId);
        });

        modelBuilder.Entity<Discussion>(entity =>
        {
            entity.ToTable("discussions");
            entity.HasKey(e => e.DiscussionId);
            entity.Property(e => e.DiscussionId).HasColumnName("discussion_id");
            entity.Property(e => e.PageId).HasColumnName("page_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Page).WithMany(p => p.Discussions).HasForeignKey(e => e.PageId);
        });
    }
}