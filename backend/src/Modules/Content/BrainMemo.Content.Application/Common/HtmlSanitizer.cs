using System.Text.RegularExpressions;

namespace BrainMemo.Content.Application.Common;

public interface IHtmlSanitizer
{
    string Sanitize(string? html);
}

public sealed partial class HtmlSanitizer : IHtmlSanitizer
{
    [GeneratedRegex(@"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", RegexOptions.IgnoreCase)]
    private static partial Regex ScriptTagRegex();

    [GeneratedRegex(@"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", RegexOptions.IgnoreCase)]
    private static partial Regex StyleTagRegex();

    [GeneratedRegex(@"<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>", RegexOptions.IgnoreCase)]
    private static partial Regex IframeTagRegex();

    [GeneratedRegex(@"<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>", RegexOptions.IgnoreCase)]
    private static partial Regex ObjectTagRegex();

    [GeneratedRegex(@"<embed\b[^>]*>", RegexOptions.IgnoreCase)]
    private static partial Regex EmbedTagRegex();

    [GeneratedRegex(@"<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>", RegexOptions.IgnoreCase)]
    private static partial Regex FormTagRegex();

    [GeneratedRegex(@"\s*on\w+\s*=\s*(?:""[^""]*""|'[^']*'|[^\s>]+)", RegexOptions.IgnoreCase)]
    private static partial Regex EventAttributeRegex();

    [GeneratedRegex(@"javascript\s*:", RegexOptions.IgnoreCase)]
    private static partial Regex JavascriptSchemeRegex();

    public string Sanitize(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        string result = html;
        result = ScriptTagRegex().Replace(result, string.Empty);
        result = StyleTagRegex().Replace(result, string.Empty);
        result = IframeTagRegex().Replace(result, string.Empty);
        result = ObjectTagRegex().Replace(result, string.Empty);
        result = EmbedTagRegex().Replace(result, string.Empty);
        result = FormTagRegex().Replace(result, string.Empty);
        result = EventAttributeRegex().Replace(result, string.Empty);
        result = JavascriptSchemeRegex().Replace(result, "blocked:");

        return result;
    }
}
