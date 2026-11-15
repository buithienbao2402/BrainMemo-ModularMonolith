namespace BrainMemo.Course.Api.DTOs;

public sealed record InviteLearnerRequest(string Email);

public sealed record DecideEnrollmentRequest(string Decision);
