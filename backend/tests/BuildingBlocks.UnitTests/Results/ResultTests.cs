using BrainMemo.SharedKernel.Results;
using Xunit;

namespace BuildingBlocks.UnitTests.Results;

public sealed class ResultTests
{
    [Fact]
    public void Success_ReturnsSuccessWithNoneError()
    {
        Result result = Result.Success();

        Assert.True(result.IsSuccess);
        Assert.False(result.IsFailure);
        Assert.Equal(Error.None, result.Error);
    }

    [Fact]
    public void Failure_WithError_ReturnsFailure()
    {
        Error error = Error.NotFound("Khong tim thay khoa hoc.");
        Result result = Result.Failure(error);

        Assert.False(result.IsSuccess);
        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, result.Error.Code);
        Assert.Equal("Khong tim thay khoa hoc.", result.Error.Message);
    }

    [Fact]
    public void Failure_WithEmptyError_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => Result.Failure(Error.None));
        Assert.Throws<ArgumentException>(() => Result.Failure<int>(new Error("   ", "msg")));
    }

    [Fact]
    public void GenericValue_OnSuccess_ReturnsValue_OnFailure_ThrowsInvalidOperationException()
    {
        Result<string> success = "brainmemo";
        Assert.True(success.IsSuccess);
        Assert.Equal("brainmemo", success.Value);

        Result<string> failure = Error.Forbidden("Khong co quyen.");
        Assert.True(failure.IsFailure);
        Assert.Throws<InvalidOperationException>(() => failure.Value);
    }

    [Fact]
    public void GenericValue_SupportsNullablePayload()
    {
        Result<Guid?> nullLookup = Result.Success<Guid?>(null);

        Assert.True(nullLookup.IsSuccess);
        Assert.Null(nullLookup.Value);
    }

    [Fact]
    public void MapBindAndMatch_TransformOrShortCircuitCleanly()
    {
        Result<int> initial = 21;
        Result<string> doubled = initial
            .Map(x => x * 2)
            .Bind(x => Result.Success(x.ToString()));

        Assert.True(doubled.IsSuccess);
        Assert.Equal("42", doubled.Value);

        int bindCalls = 0;
        Result<string> failed = Result.Failure<int>(Error.Conflict(ErrorCodes.VersionConflict, "Xung dot."))
            .Map(x => x + 1)
            .Bind(_ =>
            {
                bindCalls++;
                return Result.Success("should-not-run");
            });

        Assert.True(failed.IsFailure);
        Assert.Equal(0, bindCalls);

        string matched = failed.Match(
            onSuccess: value => value,
            onFailure: err => err.Code);
        Assert.Equal(ErrorCodes.VersionConflict, matched);
    }

    [Fact]
    public void ValidationError_PreservesFieldDetails()
    {
        ValidationFailureDetail[] details =
        [
            new("email", "Email khong hop le."),
            new("password", "Mat khau toi thieu 8 ky tu."),
        ];

        Error error = Error.Validation("Du lieu khong hop le.", details);
        Result result = error;

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
        Assert.Equal(2, result.Error.Details?.Count);
    }
}
