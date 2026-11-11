using System.Data.Common;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.BuildingBlocks.Infrastructure.Transactions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BuildingBlocks.UnitTests.Behaviors
{
    public sealed class TransactionBehaviorTests
    {
        [Fact]
        public async Task CommandSuccess_SavesAndCommitsUnitOfWork()
        {
            FakeUnitOfWork uow = new("FakeModule");
            await using ServiceProvider sp = BuildServices(uow);
            ISender sender = sp.GetRequiredService<ISender>();

            Result result = await sender.Send(new BrainMemo.FakeModule.Application.SampleCommand(ShouldFail: false));

            Assert.True(result.IsSuccess);
            Assert.Equal(1, uow.BegunCount);
            Assert.Equal(1, uow.SavedCount);
            Assert.Equal(1, uow.CommittedCount);
            Assert.Equal(0, uow.RolledBackCount);
        }

        [Fact]
        public async Task CommandFailureResult_RollsBackAndDoesNotCommit()
        {
            FakeUnitOfWork uow = new("FakeModule");
            await using ServiceProvider sp = BuildServices(uow);
            ISender sender = sp.GetRequiredService<ISender>();

            Result result = await sender.Send(new BrainMemo.FakeModule.Application.SampleCommand(ShouldFail: true));

            Assert.True(result.IsFailure);
            Assert.Equal(1, uow.BegunCount);
            Assert.Equal(0, uow.SavedCount);
            Assert.Equal(0, uow.CommittedCount);
            Assert.Equal(1, uow.RolledBackCount);
        }

        [Fact]
        public async Task CommandThrowingException_RollsBackAndRethrows()
        {
            FakeUnitOfWork uow = new("FakeModule");
            await using ServiceProvider sp = BuildServices(uow);
            ISender sender = sp.GetRequiredService<ISender>();

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => sender.Send(new BrainMemo.FakeModule.Application.SampleCommand(ShouldFail: false, ThrowException: true)));

            Assert.Equal(1, uow.BegunCount);
            Assert.Equal(0, uow.CommittedCount);
            Assert.Equal(1, uow.RolledBackCount);
        }

        [Fact]
        public async Task Query_DoesNotStartTransaction()
        {
            FakeUnitOfWork uow = new("FakeModule");
            await using ServiceProvider sp = BuildServices(uow);
            ISender sender = sp.GetRequiredService<ISender>();

            Result<string> result = await sender.Send(new BrainMemo.FakeModule.Application.SampleQuery());

            Assert.True(result.IsSuccess);
            Assert.Equal("ok", result.Value);
            Assert.Equal(0, uow.BegunCount);
        }

        [Fact]
        public async Task AmbientModerationTransaction_PreventsNestedModuleTransaction()
        {
            FakeUnitOfWork uow = new("FakeModule");
            await using ServiceProvider sp = BuildServices(uow);
            AmbientTransactionAccessor accessor = sp.GetRequiredService<AmbientTransactionAccessor>();
            ISender sender = sp.GetRequiredService<ISender>();

            using (accessor.Push(new DummyModerationTxContext()))
            {
                Result result = await sender.Send(new BrainMemo.FakeModule.Application.SampleCommand(ShouldFail: false));
                Assert.True(result.IsSuccess);
            }

            Assert.Equal(0, uow.BegunCount);
            Assert.Null(accessor.Current);
        }

        private static ServiceProvider BuildServices(FakeUnitOfWork uow)
        {
            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IUnitOfWork>(uow);
            services.AddBuildingBlocksInfrastructure(typeof(TransactionBehaviorTests).Assembly);
            return services.BuildServiceProvider();
        }

        private sealed class FakeUnitOfWork(string moduleName) : IUnitOfWork
        {
            public string ModuleName => moduleName;
            public int BegunCount { get; private set; }
            public int SavedCount { get; private set; }
            public int CommittedCount { get; private set; }
            public int RolledBackCount { get; private set; }

            public Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default)
            {
                BegunCount++;
                return Task.FromResult<IUnitOfWorkTransaction>(new FakeTransaction(this));
            }

            public Task<int> SaveChangesAsync(CancellationToken ct = default)
            {
                SavedCount++;
                return Task.FromResult(1);
            }

            private sealed class FakeTransaction(FakeUnitOfWork owner) : IUnitOfWorkTransaction
            {
                public Task CommitAsync(CancellationToken ct = default)
                {
                    owner.CommittedCount++;
                    return Task.CompletedTask;
                }

                public Task RollbackAsync(CancellationToken ct = default)
                {
                    owner.RolledBackCount++;
                    return Task.CompletedTask;
                }

                public ValueTask DisposeAsync() => ValueTask.CompletedTask;
            }
        }

        private sealed class DummyModerationTxContext : IModerationTxContext
        {
            public DbConnection Connection => null!;
            public DbTransaction Transaction => null!;
            public CancellationToken CancellationToken => CancellationToken.None;
        }
    }
}

namespace BrainMemo.FakeModule.Application
{
    internal sealed record SampleCommand(bool ShouldFail, bool ThrowException = false) : ICommand;

    internal sealed class SampleCommandHandler : ICommandHandler<SampleCommand>
    {
        public Task<Result> Handle(SampleCommand request, CancellationToken cancellationToken)
        {
            if (request.ThrowException)
            {
                throw new InvalidOperationException("Boom");
            }

            return Task.FromResult(
                request.ShouldFail
                    ? Result.Failure(Error.Forbidden("Denied"))
                    : Result.Success());
        }
    }

    internal sealed record SampleQuery : IQuery<string>;

    internal sealed class SampleQueryHandler : IQueryHandler<SampleQuery, string>
    {
        public Task<Result<string>> Handle(SampleQuery request, CancellationToken cancellationToken)
            => Task.FromResult(Result.Success("ok"));
    }
}
