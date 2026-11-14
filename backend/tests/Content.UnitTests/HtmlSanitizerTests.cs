using BrainMemo.Content.Application.Common;
using Xunit;

namespace Content.UnitTests;

public sealed class HtmlSanitizerTests
{
    private readonly HtmlSanitizer _sanitizer = new();

    [Fact]
    public void Sanitize_WhenNullOrEmpty_ReturnsSame()
    {
        Assert.Equal(string.Empty, _sanitizer.Sanitize(null));
        Assert.Equal(string.Empty, _sanitizer.Sanitize(string.Empty));
        Assert.Equal(string.Empty, _sanitizer.Sanitize("   "));
    }

    [Fact]
    public void Sanitize_WhenSafeMarkup_PreservesFormatting()
    {
        string input = "<p>Chào mừng bạn đến với <strong>BrainMemo</strong>!</p><p>Học lập trình <em>C#</em> &amp; .NET.</p>";
        string output = _sanitizer.Sanitize(input);

        Assert.Contains("<p>Chào mừng bạn đến với <strong>BrainMemo</strong>!</p>", output);
        Assert.Contains("<em>C#</em>", output);
    }

    [Fact]
    public void Sanitize_WhenContainsScriptTags_RemovesScriptAndContent()
    {
        string input = "<p>Bài học</p><script>alert('XSS');</script><p>Nội dung sau script</p>";
        string output = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("<script", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("alert('XSS')", output);
        Assert.Contains("<p>Bài học</p>", output);
        Assert.Contains("<p>Nội dung sau script</p>", output);
    }

    [Fact]
    public void Sanitize_WhenContainsEventHandlers_StripsAttributes()
    {
        string input = "<img src=\"https://example.com/pic.png\" onerror=\"alert('hacked')\" onload=\"bad()\" />";
        string output = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("onerror", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onload", output, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("src=\"https://example.com/pic.png\"", output);
    }

    [Fact]
    public void Sanitize_WhenContainsJavascriptPseudoProtocol_StripsUrl()
    {
        string input = "<a href=\"javascript:alert('malicious')\">Bấm vào đây</a>";
        string output = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("javascript:", output, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Bấm vào đây", output);
    }

    [Theory]
    [InlineData("<iframe src=\"http://evil.com\"></iframe>")]
    [InlineData("<object data=\"exploit.swf\"></object>")]
    [InlineData("<embed src=\"bad.swf\" />")]
    [InlineData("<style>body { display: none; }</style>")]
    [InlineData("<form action=\"http://attacker.com\"><input type=\"text\"/></form>")]
    public void Sanitize_WhenContainsForbiddenTags_RemovesThem(string dangerousTag)
    {
        string input = $"<div>Trước {dangerousTag} Sau</div>";
        string output = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("iframe", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("object", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("embed", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("style", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("form", output, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Trước", output);
        Assert.Contains("Sau", output);
    }
}
