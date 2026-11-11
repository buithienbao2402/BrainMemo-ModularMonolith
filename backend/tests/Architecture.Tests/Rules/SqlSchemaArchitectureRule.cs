using System.Text.RegularExpressions;

namespace Architecture.Tests.Rules;

/// <summary>
/// Enforces REPO_STRUCTURE §2 rule 7: forbids physical cross-module foreign keys in SQL schemas.
/// </summary>
public static partial class SqlSchemaArchitectureRule
{
    [GeneratedRegex(@"--[^\r\n]*|/\*[\s\S]*?\*/", RegexOptions.CultureInvariant)]
    private static partial Regex SqlCommentRegex();

    [GeneratedRegex(@"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(?<tableName>[a-zA-Z0-9_]+)`?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex CreateTableRegex();

    [GeneratedRegex(@"\bREFERENCES\s+`?(?<refTable>[a-zA-Z0-9_]+)`?", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ForeignKeyReferenceRegex();

    public static IReadOnlyList<string> ValidateNoCrossModuleForeignKeys(string sqlContent, string sourceName = "db/schema.sql")
    {
        ArgumentNullException.ThrowIfNull(sqlContent);

        string strippedSql = SqlCommentRegex().Replace(sqlContent, " ");
        List<(int Index, string TableName)> tableStarts = CreateTableRegex()
            .Matches(strippedSql)
            .Select(static m => (m.Index, m.Groups["tableName"].Value))
            .ToList();

        if (tableStarts.Count == 0)
        {
            return [$"{sourceName}: no CREATE TABLE definitions found."];
        }

        List<string> violations = [];

        for (int i = 0; i < tableStarts.Count; i++)
        {
            int start = tableStarts[i].Index;
            int end = i + 1 < tableStarts.Count ? tableStarts[i + 1].Index : strippedSql.Length;
            string sourceTable = tableStarts[i].TableName;
            string sourcePrefix = ExtractPrefix(sourceTable);
            string block = strippedSql[start..end];

            foreach (Match fkMatch in ForeignKeyReferenceRegex().Matches(block))
            {
                string targetTable = fkMatch.Groups["refTable"].Value;
                string targetPrefix = ExtractPrefix(targetTable);

                if (!string.Equals(sourcePrefix, targetPrefix, StringComparison.OrdinalIgnoreCase))
                {
                    violations.Add(
                        $"{sourceName}: table '{sourceTable}' (module prefix '{sourcePrefix}') has physical FK REFERENCES '{targetTable}' (module prefix '{targetPrefix}').");
                }
            }
        }

        return violations;
    }

    private static string ExtractPrefix(string tableName)
    {
        int underscoreIndex = tableName.IndexOf('_', StringComparison.Ordinal);
        return underscoreIndex > 0 ? tableName[..underscoreIndex] : tableName;
    }
}

