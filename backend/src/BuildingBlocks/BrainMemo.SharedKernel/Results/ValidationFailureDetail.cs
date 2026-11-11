namespace BrainMemo.SharedKernel.Results;

/// <summary>
/// Field-level or rule-level detail returned with ProblemDetails errors[].
/// </summary>
public sealed record ValidationFailureDetail(string Field, string Message);
