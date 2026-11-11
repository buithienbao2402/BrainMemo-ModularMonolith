using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;

namespace BuildingBlocks.UnitTests.Storage;

public sealed class FileUploadPolicyTests
{
    [Theory]
    [InlineData(FileUploadPurpose.Avatar, "avatar.jpg", "image/jpeg", ".jpg")]
    [InlineData(FileUploadPurpose.Avatar, "Photo.PNG", "IMAGE/PNG; charset=utf-8", ".png")]
    [InlineData(FileUploadPurpose.CourseCover, "C:\\fakepath\\cover.webp", "image/webp", ".webp")]
    [InlineData(FileUploadPurpose.ReportEvidence, "evidence.gif", "image/gif", ".gif")]
    public void ValidateUploadRequest_AllowsValidImagesWithin5Mb(
        FileUploadPurpose purpose,
        string fileName,
        string contentType,
        string expectedExtension)
    {
        Result<ValidatedFileUpload> result = FileUploadPolicy.ValidateUploadRequest(
            purpose,
            fileName,
            FileUploadPolicy.MaxImageBytes,
            contentType);

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedExtension, result.Value.NormalizedExtension);
        Assert.Equal(FileUploadPolicy.MaxImageBytes, result.Value.MaxBytes);
        Assert.True(result.Value.IsImage);
    }

    [Theory]
    [InlineData(FileUploadPurpose.CourseResource, "slides.pdf", "application/pdf", ".pdf", false)]
    [InlineData(FileUploadPurpose.CourseResource, "lesson.mp4", "video/mp4", ".mp4", false)]
    [InlineData(FileUploadPurpose.CourseResource, "audio.mp3", "audio/mpeg", ".mp3", false)]
    [InlineData(FileUploadPurpose.AssignmentFile, "submission.zip", "application/zip", ".zip", false)]
    [InlineData(FileUploadPurpose.AssignmentFile, "report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx", false)]
    [InlineData(FileUploadPurpose.CourseResource, "diagram.png", "image/png", ".png", true)]
    public void ValidateUploadRequest_AllowsResourceAndAssignmentFormatsWithProperCaps(
        FileUploadPurpose purpose,
        string fileName,
        string contentType,
        string expectedExtension,
        bool isImage)
    {
        long allowedSize = isImage ? FileUploadPolicy.MaxImageBytes : FileUploadPolicy.MaxFileBytes;

        Result<ValidatedFileUpload> result = FileUploadPolicy.ValidateUploadRequest(
            purpose,
            fileName,
            allowedSize,
            contentType);

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedExtension, result.Value.NormalizedExtension);
        Assert.Equal(allowedSize, result.Value.MaxBytes);
        Assert.Equal(isImage, result.Value.IsImage);
    }

    [Theory]
    [InlineData(FileUploadPurpose.Avatar, "avatar.png", "image/png", FileUploadPolicy.MaxImageBytes + 1)]
    [InlineData(FileUploadPurpose.CourseCover, "cover.jpg", "image/jpeg", FileUploadPolicy.MaxImageBytes + 100)]
    [InlineData(FileUploadPurpose.CourseResource, "diagram.png", "image/png", FileUploadPolicy.MaxImageBytes + 1)]
    [InlineData(FileUploadPurpose.CourseResource, "video.mp4", "video/mp4", FileUploadPolicy.MaxFileBytes + 1)]
    [InlineData(FileUploadPurpose.AssignmentFile, "archive.zip", "application/zip", FileUploadPolicy.MaxFileBytes + 1024)]
    public void ValidateUploadRequest_RejectsOversizedFilesWithFileTooLarge(
        FileUploadPurpose purpose,
        string fileName,
        string contentType,
        long sizeBytes)
    {
        Result<ValidatedFileUpload> result = FileUploadPolicy.ValidateUploadRequest(
            purpose,
            fileName,
            sizeBytes,
            contentType);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTooLarge, result.Error.Code);
    }

    [Theory]
    [InlineData(FileUploadPurpose.Avatar, "payload.exe", "application/octet-stream")]
    [InlineData(FileUploadPurpose.Avatar, "vector.svg", "image/svg+xml")]
    [InlineData(FileUploadPurpose.Avatar, "document.pdf", "application/pdf")]
    [InlineData(FileUploadPurpose.CourseCover, "script.js", "application/javascript")]
    [InlineData(FileUploadPurpose.ReportEvidence, "notes.txt", "text/plain")]
    [InlineData(FileUploadPurpose.CourseResource, "installer.bat", "application/x-msdos-program")]
    [InlineData(FileUploadPurpose.CourseResource, "noextension", "application/pdf")]
    [InlineData(FileUploadPurpose.Avatar, "spoofed.png", "application/pdf")]
    [InlineData(FileUploadPurpose.AssignmentFile, "spoofed.pdf", "image/png")]
    public void ValidateUploadRequest_RejectsDisallowedOrMismatchedTypesWithFileTypeNotAllowed(
        FileUploadPurpose purpose,
        string fileName,
        string contentType)
    {
        Result<ValidatedFileUpload> result = FileUploadPolicy.ValidateUploadRequest(
            purpose,
            fileName,
            1024,
            contentType);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTypeNotAllowed, result.Error.Code);
    }

    [Theory]
    [InlineData("", 1024, "image/png")]
    [InlineData("   ", 1024, "image/png")]
    [InlineData("..", 1024, "image/png")]
    [InlineData("avatar.png", 0, "image/png")]
    [InlineData("avatar.png", -5, "image/png")]
    [InlineData("avatar.png", 1024, "")]
    public void ValidateUploadRequest_RejectsInvalidInputsWithValidationFailed(
        string fileName,
        long sizeBytes,
        string contentType)
    {
        Result<ValidatedFileUpload> result = FileUploadPolicy.ValidateUploadRequest(
            FileUploadPurpose.Avatar,
            fileName,
            sizeBytes,
            contentType);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
    }

    [Fact]
    public void BuildTempObjectKey_FormatsContractsCompliantTempPrefixWithExtension()
    {
        Guid userId = UuidV7.NewGuid();
        Guid objectId = UuidV7.NewGuid();

        string key = FileUploadPolicy.BuildTempObjectKey(userId, objectId, "Photo.PNG");

        Assert.Equal($"tmp/{userId:D}/{objectId:D}.png", key);
    }

    [Fact]
    public void ValidateCommittedObject_EnforcesOwnershipExistenceAndLimits()
    {
        Guid ownerId = UuidV7.NewGuid();
        Guid otherId = UuidV7.NewGuid();
        string validKey = FileUploadPolicy.BuildTempObjectKey(ownerId, UuidV7.NewGuid(), ".png");
        string otherKey = FileUploadPolicy.BuildTempObjectKey(otherId, UuidV7.NewGuid(), ".png");

        Result<ValidatedFileUpload> wrongOwner = FileUploadPolicy.ValidateCommittedObject(
            FileUploadPurpose.Avatar,
            ownerId,
            otherKey,
            new FileHead(128, "image/png"));
        Assert.Equal(ErrorCodes.Forbidden, wrongOwner.Error.Code);

        Result<ValidatedFileUpload> missingHead = FileUploadPolicy.ValidateCommittedObject(
            FileUploadPurpose.Avatar,
            ownerId,
            validKey,
            head: null);
        Assert.Equal(ErrorCodes.NotFound, missingHead.Error.Code);

        Result<ValidatedFileUpload> tooLarge = FileUploadPolicy.ValidateCommittedObject(
            FileUploadPurpose.Avatar,
            ownerId,
            validKey,
            new FileHead(FileUploadPolicy.MaxImageBytes + 1, "image/png"));
        Assert.Equal(ErrorCodes.FileTooLarge, tooLarge.Error.Code);

        Result<ValidatedFileUpload> valid = FileUploadPolicy.ValidateCommittedObject(
            FileUploadPurpose.Avatar,
            ownerId,
            validKey,
            new FileHead(2048, "image/png"));
        Assert.True(valid.IsSuccess);
        Assert.Equal(".png", valid.Value.NormalizedExtension);
    }
}

