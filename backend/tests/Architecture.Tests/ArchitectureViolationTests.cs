using System.Reflection;
using System.Runtime.Loader;
using Architecture.Tests.Rules;
using Architecture.Tests.Support;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using NetArchTest.Rules;
using Xunit;

namespace Architecture.Tests;

/// <summary>
/// Proves that every REPO_STRUCTURE §2 rule fails (turns RED) when intentionally violated
/// and passes (turns GREEN) when dependencies follow the contract rules.
/// </summary>
public sealed class ArchitectureViolationTests
{
    [Fact]
    public void Rule1_Contracts_PassesWithSharedKernelOnly_AndFailsWhenReferencingAbstractionsOrOtherContract()
    {
        using SyntheticWorkspace workspace = new();

        Assembly profileContracts = workspace.CompileAssembly(
            "BrainMemo.Profile.Contracts",
            """
            namespace BrainMemo.Profile.Contracts;
            public record PublicProfileDto(System.Guid UserId);
            """);

        Assembly validCourseContracts = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            using BrainMemo.SharedKernel.Results;
            namespace BrainMemo.Course.Contracts;
            public enum AccessPurpose { Normal = 0, ModerationReview = 1 }
            public interface ICourseContract { Result GetCourseAccess(); }
            """);

        Assert.Empty(ArchitectureRuleRunner.ValidateAssemblies([validCourseContracts], workspace.SearchDirectories));

        Assembly invalidViaAbstractions = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            using BrainMemo.BuildingBlocks.Abstractions.Events;
            namespace BrainMemo.Course.Contracts;
            public sealed class InvalidContract { public IEventBus? Bus { get; set; } }
            """);

        TestResult abstractionsResult = ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(
            invalidViaAbstractions,
            workspace.SearchDirectories);
        Assert.False(abstractionsResult.IsSuccessful);
        Assert.Contains("BrainMemo.Course.Contracts.InvalidContract", abstractionsResult.FailingTypeNames);

        Assembly invalidViaOtherContract = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            using BrainMemo.Profile.Contracts;
            namespace BrainMemo.Course.Contracts;
            public sealed record CrossContractDto(PublicProfileDto Profile);
            """,
            profileContracts);

        TestResult otherContractResult = ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(
            invalidViaOtherContract,
            workspace.SearchDirectories);
        Assert.False(otherContractResult.IsSuccessful);
    }

    [Fact]
    public void Rule2_Domain_PassesWithSharedKernelOnly_AndFailsWhenReferencingAbstractionsOrForeignDomain()
    {
        using SyntheticWorkspace workspace = new();

        Assembly identityDomain = workspace.CompileAssembly(
            "BrainMemo.Identity.Domain",
            """
            namespace BrainMemo.Identity.Domain;
            public sealed class UserEntity { }
            """);

        Assembly validDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            using BrainMemo.SharedKernel.Domain;
            namespace BrainMemo.Course.Domain.Entities;
            public sealed class Course : AggregateRoot { }
            """);

        Assert.Empty(ArchitectureRuleRunner.ValidateAssemblies([validDomain], workspace.SearchDirectories));

        Assembly invalidDomainUsingAbstractions = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            using BrainMemo.BuildingBlocks.Abstractions.Persistence;
            namespace BrainMemo.Course.Domain;
            public sealed class InvalidDomainType { public IUnitOfWork? UnitOfWork { get; set; } }
            """);

        TestResult abstractionsResult = ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(
            invalidDomainUsingAbstractions,
            workspace.SearchDirectories);
        Assert.False(abstractionsResult.IsSuccessful);

        Assembly invalidDomainUsingOtherDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            using BrainMemo.Identity.Domain;
            namespace BrainMemo.Course.Domain;
            public sealed class CoupledDomain { public UserEntity? Owner { get; set; } }
            """,
            identityDomain);

        TestResult crossDomainResult = ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(
            invalidDomainUsingOtherDomain,
            workspace.SearchDirectories);
        Assert.False(crossDomainResult.IsSuccessful);
    }

    [Fact]
    public void Rule3And6_Application_AllowsOwnDomainContractsAbstractions_AndFailsOnInfrastructureApiOrForeignModuleLayers()
    {
        using SyntheticWorkspace workspace = new();

        Assembly identityContracts = workspace.CompileAssembly(
            "BrainMemo.Identity.Contracts",
            """
            namespace BrainMemo.Identity.Contracts;
            public interface IIdentityContract { }
            """);

        Assembly identityDomain = workspace.CompileAssembly(
            "BrainMemo.Identity.Domain",
            """
            namespace BrainMemo.Identity.Domain;
            public sealed class IdentityUser { }
            """);

        Assembly courseDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            namespace BrainMemo.Course.Domain;
            public sealed class CourseEntity { }
            """);

        Assembly courseContracts = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            namespace BrainMemo.Course.Contracts;
            public interface ICourseContract { }
            """);

        Assembly validApp = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
            using BrainMemo.Course.Contracts;
            using BrainMemo.Course.Domain;
            using BrainMemo.Identity.Contracts;
            using BrainMemo.SharedKernel.Results;
            namespace BrainMemo.Course.Application.Commands;
            public sealed class CreateCourseHandler(IIdentityContract identity, ICourseContract self)
            {
                public Result Handle(CourseEntity entity) => identity is not null && self is not null ? Result.Success() : Result.Failure(new Error("FORBIDDEN", "x"));
            }
            """,
            identityContracts,
            courseDomain,
            courseContracts);

        Assert.Empty(ArchitectureRuleRunner.ValidateAssemblies([validApp], workspace.SearchDirectories));

        Assembly invalidUsingInfra = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            using BrainMemo.BuildingBlocks.Infrastructure.Time;
            namespace BrainMemo.Course.Application;
            public sealed class BadHandler { public SystemClock? Clock { get; set; } }
            """);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidUsingInfra, workspace.SearchDirectories).IsSuccessful);

        Assembly invalidUsingForeignDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            using BrainMemo.Identity.Domain;
            namespace BrainMemo.Course.Application;
            public sealed class CrossModuleDomainLeak { public IdentityUser? User { get; set; } }
            """,
            identityDomain);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidUsingForeignDomain, workspace.SearchDirectories).IsSuccessful);
    }

    [Fact]
    public void Rule4And6_Infrastructure_FailsOnApiWebApiOrForeignModule_AndDbContextChecksTablePrefixesAndMigrations()
    {
        using SyntheticWorkspace workspace = new();

        Assembly courseDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            namespace BrainMemo.Course.Domain;
            public sealed class CourseRecord { public System.Guid Id { get; set; } }
            """);

        Assembly identityDomain = workspace.CompileAssembly(
            "BrainMemo.Identity.Domain",
            """
            namespace BrainMemo.Identity.Domain;
            public sealed class IdentityAccount { public System.Guid Id { get; set; } }
            """);

        Assembly courseApi = workspace.CompileAssembly(
            "BrainMemo.Course.Api",
            """
            namespace BrainMemo.Course.Api;
            public sealed class CoursesController { }
            """);

        Assembly validInfrastructure = workspace.CompileAssembly(
            "BrainMemo.Course.Infrastructure",
            """
            using BrainMemo.Course.Domain;
            using Microsoft.EntityFrameworkCore;
            using Microsoft.EntityFrameworkCore.Migrations;
            namespace BrainMemo.Course.Infrastructure
            {
                public sealed class CourseDbContext(DbContextOptions<CourseDbContext> options) : DbContext(options)
                {
                    public DbSet<CourseRecord> Courses => Set<CourseRecord>();
                    protected override void OnModelCreating(ModelBuilder modelBuilder)
                    {
                        modelBuilder.Entity<CourseRecord>().ToTable("crs_course").HasKey(static x => x.Id);
                    }
                }
            }
            namespace BrainMemo.Course.Infrastructure.Migrations
            {
                public sealed class InitialCourse : Migration
                {
                    protected override void Up(MigrationBuilder migrationBuilder) { }
                }
            }
            """,
            courseDomain);

        Assert.Empty(ArchitectureRuleRunner.ValidateAssemblies([validInfrastructure], workspace.SearchDirectories));

        Assembly invalidInfraWrongPrefix = workspace.CompileAssembly(
            "BrainMemo.Course.Infrastructure",
            """
            using BrainMemo.Course.Domain;
            using Microsoft.EntityFrameworkCore;
            using Microsoft.EntityFrameworkCore.Migrations;
            namespace BrainMemo.Course.Infrastructure
            {
                public sealed class BadCourseDbContext(DbContextOptions<BadCourseDbContext> options) : DbContext(options)
                {
                    public DbSet<CourseRecord> ForeignTable => Set<CourseRecord>();
                    protected override void OnModelCreating(ModelBuilder modelBuilder)
                    {
                        modelBuilder.Entity<CourseRecord>().ToTable("idn_user").HasKey(static x => x.Id);
                    }
                }
            }
            namespace BrainMemo.Course.Infrastructure.Migrations
            {
                public sealed class Init : Migration
                {
                    protected override void Up(MigrationBuilder migrationBuilder) { }
                }
            }
            """,
            courseDomain);

        IReadOnlyList<string> prefixViolations = ModuleDbContextRule.ValidateModuleInfrastructure(invalidInfraWrongPrefix);
        Assert.Contains(prefixViolations, static v => v.Contains("idn_user", StringComparison.Ordinal) && v.Contains("crs_", StringComparison.Ordinal));

        Assembly invalidInfraNoMigration = workspace.CompileAssembly(
            "BrainMemo.Course.Infrastructure",
            """
            using BrainMemo.Course.Domain;
            using Microsoft.EntityFrameworkCore;
            namespace BrainMemo.Course.Infrastructure;
            public sealed class NoMigrationDbContext(DbContextOptions<NoMigrationDbContext> options) : DbContext(options)
            {
                public DbSet<CourseRecord> Courses => Set<CourseRecord>();
                protected override void OnModelCreating(ModelBuilder modelBuilder)
                {
                    modelBuilder.Entity<CourseRecord>().ToTable("crs_course").HasKey(static x => x.Id);
                }
            }
            """,
            courseDomain);

        IReadOnlyList<string> migrationViolations = ModuleDbContextRule.ValidateModuleInfrastructure(invalidInfraNoMigration);
        Assert.Contains(migrationViolations, static v => v.Contains("Migration", StringComparison.Ordinal));

        Assembly invalidInfraReferencingApi = workspace.CompileAssembly(
            "BrainMemo.Course.Infrastructure",
            """
            using BrainMemo.Course.Api;
            using BrainMemo.Identity.Domain;
            namespace BrainMemo.Course.Infrastructure;
            public sealed class BadInfra { public CoursesController? Api { get; set; } public IdentityAccount? Foreign { get; set; } }
            """,
            courseApi,
            identityDomain);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidInfraReferencingApi, workspace.SearchDirectories).IsSuccessful);
    }

    [Fact]
    public void Rule5_ApiAndHost_FailWhenApiTouchesDomainOrInfrastructure_OrHostTouchesDomain()
    {
        using SyntheticWorkspace workspace = new();

        Assembly courseDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Domain",
            """
            namespace BrainMemo.Course.Domain;
            public sealed class CourseAggregate { }
            """);

        Assembly courseApplication = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            namespace BrainMemo.Course.Application;
            public sealed record CreateCourseCommand;
            """);

        Assembly validCourseApi = workspace.CompileAssembly(
            "BrainMemo.Course.Api",
            """
            using BrainMemo.Course.Application;
            namespace BrainMemo.Course.Api;
            public sealed class CoursesController { public CreateCourseCommand? Sample { get; set; } }
            """,
            courseApplication);

        Assert.Empty(ArchitectureRuleRunner.ValidateAssemblies([validCourseApi], workspace.SearchDirectories));

        Assembly invalidApiTouchingDomain = workspace.CompileAssembly(
            "BrainMemo.Course.Api",
            """
            using BrainMemo.Course.Domain;
            namespace BrainMemo.Course.Api;
            public sealed class BadController { public CourseAggregate? Aggregate { get; set; } }
            """,
            courseDomain);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidApiTouchingDomain, workspace.SearchDirectories).IsSuccessful);

        Assembly invalidHostTouchingDomain = workspace.CompileAssembly(
            "BrainMemo.WebApi",
            """
            using BrainMemo.Course.Domain;
            namespace BrainMemo.WebApi;
            public sealed class BadStartup { public CourseAggregate? Aggregate { get; set; } }
            """,
            courseDomain);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidHostTouchingDomain, workspace.SearchDirectories).IsSuccessful);
    }

    [Fact]
    public void BuildingBlocks_FailWhenReferencingModuleAssembly()
    {
        using SyntheticWorkspace workspace = new();

        Assembly courseContracts = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            namespace BrainMemo.Course.Contracts;
            public interface ICourseContract { }
            """);

        Assembly invalidAbstractions = workspace.CompileAssembly(
            "BrainMemo.BuildingBlocks.Abstractions",
            """
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.BuildingBlocks.Abstractions;
            public sealed class LeakyPort { public ICourseContract? Course { get; set; } }
            """,
            courseContracts);

        Assert.False(
            ArchitectureRuleRunner.EvaluateForbiddenDependenciesWithNetArchTest(invalidAbstractions, workspace.SearchDirectories).IsSuccessful);
    }

    [Fact]
    public void CsprojValidator_FailsOnForbiddenProjectReference_AndPassesOnAllowedEdges()
    {
        string tempDir = Directory.CreateTempSubdirectory("arch-csproj-test-").FullName;
        try
        {
            string goodDomainCsproj = Path.Combine(tempDir, "BrainMemo.Course.Domain.csproj");
            File.WriteAllText(
                goodDomainCsproj,
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <ItemGroup>
                    <ProjectReference Include="..\BrainMemo.SharedKernel\BrainMemo.SharedKernel.csproj" />
                  </ItemGroup>
                </Project>
                """);

            string badDomainCsproj = Path.Combine(tempDir, "BrainMemo.Identity.Domain.csproj");
            File.WriteAllText(
                badDomainCsproj,
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <ItemGroup>
                    <ProjectReference Include="..\..\BuildingBlocks\BrainMemo.BuildingBlocks.Abstractions\BrainMemo.BuildingBlocks.Abstractions.csproj" />
                  </ItemGroup>
                </Project>
                """);

            string badContractsCsproj = Path.Combine(tempDir, "BrainMemo.Content.Contracts.csproj");
            File.WriteAllText(
                badContractsCsproj,
                """
                <Project Sdk="Microsoft.NET.Sdk">
                  <ItemGroup>
                    <ProjectReference Include="..\..\Course\BrainMemo.Course.Contracts\BrainMemo.Course.Contracts.csproj" />
                  </ItemGroup>
                </Project>
                """);

            Assert.Empty(ProjectReferenceRuleValidator.ValidateCsprojFiles([goodDomainCsproj]));

            IReadOnlyList<string> badDomainViolations = ProjectReferenceRuleValidator.ValidateCsprojFiles([badDomainCsproj]);
            Assert.Single(badDomainViolations);
            Assert.Contains("BrainMemo.BuildingBlocks.Abstractions", badDomainViolations[0], StringComparison.Ordinal);

            IReadOnlyList<string> badContractsViolations = ProjectReferenceRuleValidator.ValidateCsprojFiles([badContractsCsproj]);
            Assert.Single(badContractsViolations);
            Assert.Contains("BrainMemo.Course.Contracts", badContractsViolations[0], StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(tempDir, recursive: true);
        }
    }

    [Fact]
    public void Rule7_SqlSchemaValidator_FailsOnCrossModuleForeignKey_AndPassesOnIntraModuleForeignKey()
    {
        const string validSql = """
            CREATE TABLE crs_course (
                id BINARY(16) NOT NULL PRIMARY KEY
            );
            CREATE TABLE crs_course_tag (
                course_id BINARY(16) NOT NULL,
                CONSTRAINT fk_tag_course FOREIGN KEY (course_id) REFERENCES crs_course(id)
            );
            """;

        const string invalidSql = """
            CREATE TABLE crs_course (
                id BINARY(16) NOT NULL PRIMARY KEY,
                owner_user_id BINARY(16) NOT NULL,
                CONSTRAINT fk_crs_owner FOREIGN KEY (owner_user_id) REFERENCES idn_user(id)
            );
            """;

        Assert.Empty(SqlSchemaArchitectureRule.ValidateNoCrossModuleForeignKeys(validSql, "valid.sql"));

        IReadOnlyList<string> violations = SqlSchemaArchitectureRule.ValidateNoCrossModuleForeignKeys(invalidSql, "invalid.sql");
        Assert.Single(violations);
        Assert.Contains("crs_course", violations[0], StringComparison.Ordinal);
        Assert.Contains("idn_user", violations[0], StringComparison.Ordinal);
    }

    [Fact]
    public void Rule9_ModerationReviewPurpose_OnlyAllowedFromModeration()
    {
        using SyntheticWorkspace workspace = new();

        Assembly courseContracts = workspace.CompileAssembly(
            "BrainMemo.Course.Contracts",
            """
            using System;
            namespace BrainMemo.Course.Contracts;
            public enum AccessPurpose { Normal = 0, ModerationReview = 1 }
            public interface ICourseContract
            {
                string GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal);
            }
            """);

        // 1. Moderation caller passing AccessPurpose.ModerationReview -> ALLOWED (GREEN)
        Assembly validModerationApp = workspace.CompileAssembly(
            "BrainMemo.Moderation.Application",
            """
            using System;
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Moderation.Application;
            public sealed class ViewReportedContentHandler(ICourseContract courseContract)
            {
                public string Handle(Guid courseId, Guid adminId) =>
                    courseContract.GetCourseAccess(courseId, adminId, AccessPurpose.ModerationReview);
            }
            """,
            courseContracts);

        Assert.True(
            ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(validModerationApp, workspace.SearchDirectories).IsSuccessful);

        // 2. Content caller passing AccessPurpose.Normal (explicit or default) -> ALLOWED (GREEN)
        Assembly validContentApp = workspace.CompileAssembly(
            "BrainMemo.Content.Application",
            """
            using System;
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Content.Application;
            public sealed class ReadChapterHandler(ICourseContract courseContract)
            {
                public string HandleDefault(Guid courseId, Guid? viewerId) =>
                    courseContract.GetCourseAccess(courseId, viewerId);

                public string HandleExplicitNormal(Guid courseId, Guid? viewerId) =>
                    courseContract.GetCourseAccess(courseId, viewerId, AccessPurpose.Normal);
            }
            """,
            courseContracts);

        Assert.True(
            ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(validContentApp, workspace.SearchDirectories).IsSuccessful);

        // 3. Course evaluating received AccessPurpose.ModerationReview without invoking contract -> ALLOWED (GREEN)
        Assembly validCourseApp = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Course.Application;
            public sealed class GetCourseAccessHandler
            {
                public bool CanReadOnly(AccessPurpose purpose) =>
                    EvaluateInternal(purpose);

                private static bool EvaluateInternal(AccessPurpose purpose) =>
                    purpose == AccessPurpose.ModerationReview;
            }
            """,
            courseContracts);

        Assert.True(
            ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(validCourseApp, workspace.SearchDirectories).IsSuccessful);

        // 4. Course calling ICourseContract passing AccessPurpose.ModerationReview -> VIOLATION (RED)
        Assembly invalidCourseContractCall = workspace.CompileAssembly(
            "BrainMemo.Course.Application",
            """
            using System;
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Course.Application;
            public sealed class IllegalCourseSelfCall(ICourseContract courseContract)
            {
                public string Handle(Guid courseId) =>
                    courseContract.GetCourseAccess(courseId, null, AccessPurpose.ModerationReview);
            }
            """,
            courseContracts);

        Assert.False(
            ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(invalidCourseContractCall, workspace.SearchDirectories).IsSuccessful);

        // 5. Non-Moderation synchronous call passing AccessPurpose.ModerationReview -> VIOLATION (RED)
        Assembly invalidDirectCall = workspace.CompileAssembly(
            "BrainMemo.Content.Application",
            """
            using System;
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Content.Application;
            public sealed class IllegalModerationBypass(ICourseContract courseContract)
            {
                public string Handle(Guid courseId, Guid? viewerId) =>
                    courseContract.GetCourseAccess(courseId, viewerId, AccessPurpose.ModerationReview);
            }
            """,
            courseContracts);

        TestResult directFailResult = ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(
            invalidDirectCall,
            workspace.SearchDirectories);
        Assert.False(directFailResult.IsSuccessful);

        // 6. Non-Moderation async state machine + local variable indirection -> VIOLATION (RED)
        Assembly invalidAsyncIndirection = workspace.CompileAssembly(
            "BrainMemo.Discovery.Application",
            """
            using System;
            using System.Threading.Tasks;
            using BrainMemo.Course.Contracts;
            namespace BrainMemo.Discovery.Application;
            public sealed class IllegalAsyncBypass(ICourseContract courseContract)
            {
                public async Task<string> HandleAsync(Guid courseId)
                {
                    await Task.Yield();
                    AccessPurpose purpose = AccessPurpose.ModerationReview;
                    return courseContract.GetCourseAccess(courseId, null, purpose);
                }
            }
            """,
            courseContracts);

        TestResult asyncFailResult = ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(
            invalidAsyncIndirection,
            workspace.SearchDirectories);
        Assert.False(asyncFailResult.IsSuccessful);

        // 7. Non-Moderation literal "MODERATION_REVIEW" usage -> VIOLATION (RED)
        Assembly invalidStringLiteral = workspace.CompileAssembly(
            "BrainMemo.Learning.Application",
            """
            namespace BrainMemo.Learning.Application;
            public sealed class IllegalStringPurpose
            {
                public string Purpose => "MODERATION_REVIEW";
            }
            """);

        TestResult stringFailResult = ArchitectureRuleRunner.EvaluateModerationReviewRuleWithNetArchTest(
            invalidStringLiteral,
            workspace.SearchDirectories);
        Assert.False(stringFailResult.IsSuccessful);
    }

    private sealed class SyntheticWorkspace : IDisposable
    {
        private readonly List<CollectibleLoadContext> _loadContexts = [];
        private readonly string _tempDirectory = Directory.CreateTempSubdirectory("brainmemo-arch-").FullName;
        private readonly List<string> _searchDirectories = [AppContext.BaseDirectory];
        private int _nextAssemblyFolderIndex;

        public IReadOnlyList<string> SearchDirectories => _searchDirectories;

        public Assembly CompileAssembly(string assemblyName, string sourceCode, params Assembly[] additionalReferences)
        {
            SyntaxTree syntaxTree = CSharpSyntaxTree.ParseText(sourceCode);
            List<MetadataReference> references = BuildMetadataReferences(additionalReferences);

            CSharpCompilation compilation = CSharpCompilation.Create(
                assemblyName: assemblyName,
                syntaxTrees: [syntaxTree],
                references: references,
                options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

            string assemblyDir = Path.Combine(_tempDirectory, _nextAssemblyFolderIndex++.ToString(System.Globalization.CultureInfo.InvariantCulture));
            Directory.CreateDirectory(assemblyDir);
            _searchDirectories.Add(assemblyDir);

            string dllPath = Path.Combine(assemblyDir, $"{assemblyName}.dll");
            EmitResult emitResult = compilation.Emit(dllPath);
            if (!emitResult.Success)
            {
                string diagnostics = string.Join(Environment.NewLine, emitResult.Diagnostics.Select(static d => d.ToString()));
                throw new InvalidOperationException($"Failed to compile synthetic assembly '{assemblyName}':{Environment.NewLine}{diagnostics}");
            }

            CollectibleLoadContext context = new(additionalReferences);
            _loadContexts.Add(context);
            return context.LoadFromAssemblyPath(dllPath);
        }

        private static List<MetadataReference> BuildMetadataReferences(Assembly[] additionalReferences)
        {
            Dictionary<string, MetadataReference> references = new(StringComparer.OrdinalIgnoreCase);

            string? trustedAssemblies = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string;
            if (!string.IsNullOrWhiteSpace(trustedAssemblies))
            {
                foreach (string path in trustedAssemblies.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
                {
                    string fileName = Path.GetFileNameWithoutExtension(path);
                    if (fileName.StartsWith("Architecture.Tests", StringComparison.OrdinalIgnoreCase)
                        || fileName.StartsWith("xunit", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    references.TryAdd(path, MetadataReference.CreateFromFile(path));
                }
            }

            foreach (Assembly extra in additionalReferences)
            {
                if (!string.IsNullOrWhiteSpace(extra.Location))
                {
                    references[extra.Location] = MetadataReference.CreateFromFile(extra.Location);
                }
            }

            return references.Values.ToList();
        }

        public void Dispose()
        {
            foreach (CollectibleLoadContext context in _loadContexts)
            {
                context.Unload();
            }

            try
            {
                Directory.Delete(_tempDirectory, recursive: true);
            }
            catch (IOException)
            {
                // Best-effort cleanup on Windows when GC has not yet finalized collectible ALC handles.
            }
            catch (UnauthorizedAccessException)
            {
                // Best-effort cleanup on Windows when GC has not yet finalized collectible ALC handles.
            }
        }

        private sealed class CollectibleLoadContext : AssemblyLoadContext
        {
            private readonly IReadOnlyDictionary<string, Assembly> _knownDependencies;

            public CollectibleLoadContext(Assembly[] dependencies)
                : base(isCollectible: true)
            {
                _knownDependencies = dependencies
                    .Where(static asm => !string.IsNullOrWhiteSpace(asm.GetName().Name))
                    .ToDictionary(static asm => asm.GetName().Name!, static asm => asm, StringComparer.OrdinalIgnoreCase);
            }

            protected override Assembly? Load(AssemblyName assemblyName)
            {
                if (!string.IsNullOrWhiteSpace(assemblyName.Name)
                    && _knownDependencies.TryGetValue(assemblyName.Name, out Assembly? dependency))
                {
                    return dependency;
                }

                return null;
            }
        }
    }
}
