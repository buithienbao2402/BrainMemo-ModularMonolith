using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BrainMemo.Identity.Infrastructure.Persistence;

/// <summary>
/// Design-time factory enabling <c>dotnet ef migrations</c> for <see cref="IdentityDbContext"/> without host secrets.
/// </summary>
internal sealed class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    private const string DesignTimeConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public IdentityDbContext CreateDbContext(string[] args)
    {
        DbContextOptionsBuilder<IdentityDbContext> optionsBuilder = new();
        optionsBuilder.UseMySql(DesignTimeConnectionString, IdentityDbContext.DefaultMySqlServerVersion);
        return new IdentityDbContext(optionsBuilder.Options);
    }
}

