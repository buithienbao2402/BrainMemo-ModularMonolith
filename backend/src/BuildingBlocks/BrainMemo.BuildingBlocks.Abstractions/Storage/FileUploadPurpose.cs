using System.Text.Json.Serialization;

namespace BrainMemo.BuildingBlocks.Abstractions.Storage;

/// <summary>
/// Supported business upload purposes aligned with openapi/modules/files.yaml.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FileUploadPurpose
{
    [JsonStringEnumMemberName("AVATAR")]
    Avatar = 1,

    [JsonStringEnumMemberName("COURSE_COVER")]
    CourseCover = 2,

    [JsonStringEnumMemberName("COURSE_RESOURCE")]
    CourseResource = 3,

    [JsonStringEnumMemberName("ASSIGNMENT_FILE")]
    AssignmentFile = 4,

    [JsonStringEnumMemberName("REPORT_EVIDENCE")]
    ReportEvidence = 5,
}

