using System.Collections.Concurrent;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace BuildingBlocks.UnitTests.Outbox
{
    public sealed class OutboxTests
    {
        [Fact]
        public async Task TableAgnosticStores_WorkAcrossCourseLearningAndAssessmentTables()
        {
            DateTimeOffset now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
            MutableClock clock = new(now);
            string courseDbName = $"crs-{Guid.NewGuid():N}";
            string learningDbName = $"lrn-{Guid.NewGuid():N}";
            string assessmentDbName = $"ast-{Guid.NewGuid():N}";

            List<IntegrationEvent> delivered = [];
            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IClock>(clock);
            services.AddSingleton(delivered);
            services.AddDbContext<CourseOutboxTestDbContext>(o => o.UseInMemoryDatabase(courseDbName));
            services.AddDbContext<LearningOutboxTestDbContext>(o => o.UseInMemoryDatabase(learningDbName));
            services.AddDbContext<AssessmentOutboxTestDbContext>(o => o.UseInMemoryDatabase(assessmentDbName));
            services.AddOutboxStore<CourseOutboxTestDbContext>("Course");
            services.AddOutboxStore<LearningOutboxTestDbContext>("Learning");
            services.AddOutboxStore<AssessmentOutboxTestDbContext>("Assessment");
            services.AddBuildingBlocksInfrastructure(typeof(OutboxTests).Assembly);
            services.AddOutboxDispatcher();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>, RecordingHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>>();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Learning.Contracts.QuizAttemptSubmittedEvent>, RecordingHandler<BrainMemo.Learning.Contracts.QuizAttemptSubmittedEvent>>();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Assessment.Contracts.GradeRecordedEvent>, RecordingHandler<BrainMemo.Assessment.Contracts.GradeRecordedEvent>>();

            await using ServiceProvider sp = services.BuildServiceProvider();

            using (IServiceScope writeScope = sp.CreateScope())
            {
                CourseOutboxTestDbContext crsDb = writeScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                LearningOutboxTestDbContext lrnDb = writeScope.ServiceProvider.GetRequiredService<LearningOutboxTestDbContext>();
                AssessmentOutboxTestDbContext astDb = writeScope.ServiceProvider.GetRequiredService<AssessmentOutboxTestDbContext>();

                AssertOutboxMetadata(crsDb, "crs_outbox_event", "ix_crs_outbox_publish");
                AssertOutboxMetadata(lrnDb, "lrn_outbox_event", "ix_lrn_outbox_publish");
                AssertOutboxMetadata(astDb, "ast_outbox_event", "ix_ast_outbox_publish");

                IOutboxWriter writer = writeScope.ServiceProvider.GetRequiredService<IOutboxWriter>();
                Guid courseId = UuidV7.NewGuid();
                Guid attemptId = UuidV7.NewGuid();
                Guid gradeId = UuidV7.NewGuid();

                await writer.WriteAsync(courseId, new BrainMemo.Course.Contracts.CourseUpsertedEvent(
                    UuidV7.NewGuid(), now, courseId, Revision: 1, Eligible: true, Title: "DSA"));
                await writer.WriteAsync(attemptId, new BrainMemo.Learning.Contracts.QuizAttemptSubmittedEvent(
                    UuidV7.NewGuid(), now.AddSeconds(1), attemptId, UuidV7.NewGuid(), courseId));
                await writer.WriteAsync(gradeId, new BrainMemo.Assessment.Contracts.GradeRecordedEvent(
                    UuidV7.NewGuid(), now.AddSeconds(2), gradeId, courseId, 9.5m));

                await crsDb.SaveChangesAsync();
                await lrnDb.SaveChangesAsync();
                await astDb.SaveChangesAsync();
            }

            clock.UtcNow = now.AddSeconds(5);
            OutboxDispatcher dispatcher = sp.GetRequiredService<OutboxDispatcher>();
            int dispatched = await dispatcher.DispatchOnceAsync();

            Assert.Equal(3, dispatched);
            Assert.Equal(3, delivered.Count);
            Assert.Contains(delivered, e => e is BrainMemo.Course.Contracts.CourseUpsertedEvent { Eligible: true, Revision: 1 });
            Assert.Contains(delivered, e => e is BrainMemo.Learning.Contracts.QuizAttemptSubmittedEvent);
            Assert.Contains(delivered, e => e is BrainMemo.Assessment.Contracts.GradeRecordedEvent { Score: 9.5m });

            using (IServiceScope verifyScope = sp.CreateScope())
            {
                OutboxMessage crsMsg = await verifyScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>().OutboxEvents.SingleAsync();
                OutboxMessage lrnMsg = await verifyScope.ServiceProvider.GetRequiredService<LearningOutboxTestDbContext>().OutboxEvents.SingleAsync();
                OutboxMessage astMsg = await verifyScope.ServiceProvider.GetRequiredService<AssessmentOutboxTestDbContext>().OutboxEvents.SingleAsync();

                Assert.Equal("CourseUpserted", crsMsg.EventType);
                Assert.Equal("QuizAttemptSubmittedEvent", lrnMsg.EventType);
                Assert.Equal("GradeRecordedEvent", astMsg.EventType);
                Assert.Equal(clock.UtcNow, crsMsg.PublishedAt);
                Assert.Equal(clock.UtcNow, lrnMsg.PublishedAt);
                Assert.Equal(clock.UtcNow, astMsg.PublishedAt);
                Assert.Equal(1, crsMsg.AttemptCount);
                Assert.Equal(1, lrnMsg.AttemptCount);
                Assert.Equal(1, astMsg.AttemptCount);
            }
        }

        [Fact]
        public async Task WriteInSameTransaction_DispatchesOnlyAfterCommit_AndDiscardsOnRollback()
        {
            DateTimeOffset now = new(2026, 11, 12, 11, 0, 0, TimeSpan.Zero);
            MutableClock clock = new(now);
            TransactionalOutboxTestStore txStore = new("Course");
            List<IntegrationEvent> delivered = [];

            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IClock>(clock);
            services.AddSingleton(txStore);
            services.AddSingleton(delivered);
            services.AddSingleton<IUnitOfWork>(txStore);
            services.AddScoped<IOutboxStore>(_ => txStore);
            services.AddBuildingBlocksInfrastructure(typeof(OutboxTests).Assembly);
            services.AddOutboxDispatcher();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>, RecordingHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>>();

            await using ServiceProvider sp = services.BuildServiceProvider();
            OutboxDispatcher dispatcher = sp.GetRequiredService<OutboxDispatcher>();
            ISender sender = sp.GetRequiredService<ISender>();

            // Hook executed while TX is active (before CommitAsync): dispatcher must observe 0 committed events.
            int dispatchedWhileOpen = -1;
            txStore.OnBeforeCommitAsync = async () =>
            {
                dispatchedWhileOpen = await dispatcher.DispatchOnceAsync();
            };

            Result failedResult = await sender.Send(new BrainMemo.Course.Application.WriteCourseWithOutboxCommand(
                UuidV7.NewGuid(), ShouldFailResult: true, ThrowException: false));
            Assert.True(failedResult.IsFailure);
            Assert.Equal(0, txStore.CommittedOutboxCount);
            Assert.Equal(0, txStore.CommittedBusinessCount);
            Assert.Equal(0, await dispatcher.DispatchOnceAsync());
            Assert.Empty(delivered);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sender.Send(new BrainMemo.Course.Application.WriteCourseWithOutboxCommand(
                    UuidV7.NewGuid(), ShouldFailResult: false, ThrowException: true)));
            Assert.Equal(0, txStore.CommittedOutboxCount);
            Assert.Equal(0, txStore.CommittedBusinessCount);
            Assert.Equal(0, await dispatcher.DispatchOnceAsync());
            Assert.Empty(delivered);

            Guid courseId = UuidV7.NewGuid();
            Result okResult = await sender.Send(new BrainMemo.Course.Application.WriteCourseWithOutboxCommand(
                courseId, ShouldFailResult: false, ThrowException: false));
            Assert.True(okResult.IsSuccess);
            Assert.Equal(0, dispatchedWhileOpen);
            Assert.Empty(delivered);
            Assert.Equal(1, txStore.CommittedBusinessCount);
            Assert.Equal(1, txStore.CommittedOutboxCount);

            clock.UtcNow = now.AddSeconds(3);
            int dispatchedAfterCommit = await dispatcher.DispatchOnceAsync();
            Assert.Equal(1, dispatchedAfterCommit);
            Assert.Single(delivered);
        }

        [Fact]
        public async Task Deduplication_ByEventId_SkipsDuplicateWritesAndRedeliveryAfterSaveFailure()
        {
            DateTimeOffset now = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);
            MutableClock clock = new(now);
            string dbName = $"dedup-{Guid.NewGuid():N}";
            List<IntegrationEvent> delivered = [];
            SaveFailState saveFailState = new();

            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IClock>(clock);
            services.AddSingleton(delivered);
            services.AddSingleton(saveFailState);
            services.AddDbContext<CourseOutboxTestDbContext>(o => o.UseInMemoryDatabase(dbName));
            services.AddScoped<TransientSaveFailOutboxStore>();
            services.AddScoped<IOutboxStore>(sp => sp.GetRequiredService<TransientSaveFailOutboxStore>());
            services.AddBuildingBlocksInfrastructure(typeof(OutboxTests).Assembly);
            services.AddOutboxDispatcher();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>, RecordingHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>>();

            await using ServiceProvider sp = services.BuildServiceProvider();
            Guid duplicateEventId = UuidV7.NewGuid();
            Guid courseId = UuidV7.NewGuid();

            using (IServiceScope scope1 = sp.CreateScope())
            {
                IOutboxWriter writer = scope1.ServiceProvider.GetRequiredService<IOutboxWriter>();
                CourseOutboxTestDbContext db = scope1.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                BrainMemo.Course.Contracts.CourseUpsertedEvent evt = new(
                    duplicateEventId, now, courseId, Revision: 1, Eligible: true, Title: "Course 1");

                // Duplicate write in same ChangeTracker before SaveChanges.
                await writer.WriteAsync(courseId, evt);
                await writer.WriteAsync(courseId, evt);
                Assert.Single(db.OutboxEvents.Local);

                await db.SaveChangesAsync();
            }

            using (IServiceScope scope2 = sp.CreateScope())
            {
                IOutboxWriter writer = scope2.ServiceProvider.GetRequiredService<IOutboxWriter>();
                CourseOutboxTestDbContext db = scope2.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                BrainMemo.Course.Contracts.CourseUpsertedEvent duplicatePayload = new(
                    duplicateEventId, now.AddMinutes(1), courseId, Revision: 99, Eligible: false, Title: "Ignored");

                // Duplicate write in new scope after DB commit.
                await writer.WriteAsync(courseId, duplicatePayload);
                await db.SaveChangesAsync();

                Assert.Equal(1, await db.OutboxEvents.CountAsync());
            }

            // Fail SaveChanges once right after EventBus.Publish succeeds so published_at remains null in DB.
            saveFailState.ShouldFailNextSave = true;
            OutboxDispatcher dispatcher = sp.GetRequiredService<OutboxDispatcher>();
            await dispatcher.DispatchOnceAsync();

            // Event handler ran once, even though persisting published_at failed.
            Assert.Single(delivered);
            using (IServiceScope checkMidScope = sp.CreateScope())
            {
                OutboxMessage msg = await checkMidScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>().OutboxEvents.SingleAsync();
                Assert.Null(msg.PublishedAt);
            }

            // Next tick sees the same EventId is already delivered -> marks published_at WITHOUT calling handler again.
            clock.UtcNow = now.AddSeconds(10);
            int secondTickDispatched = await dispatcher.DispatchOnceAsync();
            Assert.Equal(0, secondTickDispatched);
            Assert.Single(delivered);

            using (IServiceScope checkFinalScope = sp.CreateScope())
            {
                OutboxMessage msg = await checkFinalScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>().OutboxEvents.SingleAsync();
                Assert.Equal(clock.UtcNow, msg.PublishedAt);
            }
        }

        [Fact]
        public async Task HandlerFailure_RetriesOnNextTick_AndRespectsMaxAttemptsLimit()
        {
            DateTimeOffset now = new(2026, 11, 12, 13, 0, 0, TimeSpan.Zero);
            MutableClock clock = new(now);
            string dbName = $"retry-{Guid.NewGuid():N}";
            FlakyHandlerState flakyState = new() { FailuresRemaining = 1 };

            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IClock>(clock);
            services.AddSingleton(flakyState);
            services.AddDbContext<CourseOutboxTestDbContext>(o => o.UseInMemoryDatabase(dbName));
            services.AddOutboxStore<CourseOutboxTestDbContext>("Course");
            services.AddBuildingBlocksInfrastructure(typeof(OutboxTests).Assembly);
            services.Configure<OutboxOptions>(options =>
            {
                options.MaxAttempts = 2;
                options.BatchSize = 10;
            });
            services.AddOutboxDispatcher();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>, FlakyCourseHandler>();

            await using ServiceProvider sp = services.BuildServiceProvider();
            OutboxDispatcher dispatcher = sp.GetRequiredService<OutboxDispatcher>();

            Guid retryEventId = UuidV7.NewGuid();
            Guid poisonEventId = UuidV7.NewGuid();
            using (IServiceScope writeScope = sp.CreateScope())
            {
                IOutboxWriter writer = writeScope.ServiceProvider.GetRequiredService<IOutboxWriter>();
                CourseOutboxTestDbContext db = writeScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();

                await writer.WriteAsync(UuidV7.NewGuid(), new BrainMemo.Course.Contracts.CourseUpsertedEvent(
                    retryEventId, now, UuidV7.NewGuid(), Revision: 1, Eligible: true, Title: "Recoverable"));

                // Poison message inserted with unknown EventType.
                OutboxMessage poison = OutboxMessage.Create(
                    poisonEventId,
                    "UnknownEventType",
                    UuidV7.NewGuid(),
                    "{}",
                    now.AddSeconds(1));
                await db.OutboxEvents.AddAsync(poison);
                await db.SaveChangesAsync();
            }

            // Tick 1: Recoverable fails (attempt 1), Poison fails (attempt 1).
            int tick1 = await dispatcher.DispatchOnceAsync();
            Assert.Equal(0, tick1);

            using (IServiceScope midScope = sp.CreateScope())
            {
                CourseOutboxTestDbContext db = midScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                OutboxMessage recoverable = await db.OutboxEvents.SingleAsync(x => x.Id == retryEventId);
                Assert.Null(recoverable.PublishedAt);
                Assert.Equal((ushort)1, recoverable.AttemptCount);
                Assert.NotNull(recoverable.LastError);
                Assert.True(recoverable.LastError!.Length <= OutboxMessage.MaxLastErrorLength);
            }

            // Tick 2: Recoverable succeeds (attempt 2, NOT prematurely deduped!); Poison hits MaxAttempts=2.
            clock.UtcNow = now.AddSeconds(5);
            int tick2 = await dispatcher.DispatchOnceAsync();
            Assert.Equal(1, tick2);
            Assert.Equal(1, flakyState.SuccessCount);

            // Tick 3: Poison (AttemptCount=2 == MaxAttempts=2) is skipped cleanly.
            int tick3 = await dispatcher.DispatchOnceAsync();
            Assert.Equal(0, tick3);

            using (IServiceScope endScope = sp.CreateScope())
            {
                CourseOutboxTestDbContext db = endScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                OutboxMessage recoverable = await db.OutboxEvents.SingleAsync(x => x.Id == retryEventId);
                OutboxMessage poison = await db.OutboxEvents.SingleAsync(x => x.Id == poisonEventId);

                Assert.Equal(clock.UtcNow, recoverable.PublishedAt);
                Assert.Equal((ushort)2, recoverable.AttemptCount);
                Assert.Null(recoverable.LastError);
                Assert.Null(poison.PublishedAt);
                Assert.Equal((ushort)2, poison.AttemptCount);
            }
        }

        [Fact]
        public async Task HostedService_PollsAndDispatchesInBackground_AndStopsCleanly()
        {
            DateTimeOffset now = new(2026, 11, 12, 14, 0, 0, TimeSpan.Zero);
            MutableClock clock = new(now);
            string dbName = $"hosted-{Guid.NewGuid():N}";
            TaskCompletionSource<Guid> receivedSignal = new(TaskCreationOptions.RunContinuationsAsynchronously);

            ServiceCollection services = new();
            services.AddLogging();
            services.AddSingleton<IClock>(clock);
            services.AddSingleton(receivedSignal);
            services.AddDbContext<CourseOutboxTestDbContext>(o => o.UseInMemoryDatabase(dbName));
            services.AddOutboxStore<CourseOutboxTestDbContext>("Course");
            services.AddBuildingBlocksInfrastructure(typeof(OutboxTests).Assembly);
            services.Configure<OutboxOptions>(options =>
            {
                options.Enabled = true;
                options.PollingInterval = TimeSpan.FromMilliseconds(50);
            });
            services.AddOutboxDispatcher();
            services.AddScoped<IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>, SignallingHandler>();

            await using ServiceProvider sp = services.BuildServiceProvider();
            Guid eventId = UuidV7.NewGuid();
            using (IServiceScope writeScope = sp.CreateScope())
            {
                IOutboxWriter writer = writeScope.ServiceProvider.GetRequiredService<IOutboxWriter>();
                CourseOutboxTestDbContext db = writeScope.ServiceProvider.GetRequiredService<CourseOutboxTestDbContext>();
                await writer.WriteAsync(UuidV7.NewGuid(), new BrainMemo.Course.Contracts.CourseUpsertedEvent(
                    eventId, now, UuidV7.NewGuid(), Revision: 1, Eligible: true, Title: "Hosted"));
                await db.SaveChangesAsync();
            }

            IHostedService hostedService = sp.GetServices<IHostedService>().OfType<OutboxDispatcher>().Single();
            await hostedService.StartAsync(CancellationToken.None);
            try
            {
                Guid deliveredEventId = await receivedSignal.Task.WaitAsync(TimeSpan.FromSeconds(5));
                Assert.Equal(eventId, deliveredEventId);
            }
            finally
            {
                await hostedService.StopAsync(CancellationToken.None);
            }
        }

        private static void AssertOutboxMetadata(DbContext dbContext, string expectedTable, string expectedIndex)
        {
            IEntityType? entityType = dbContext.Model.FindEntityType(typeof(OutboxMessage));
            Assert.NotNull(entityType);
            Assert.Equal(expectedTable, entityType!.GetTableName());
            Assert.Contains(entityType.GetIndexes(), ix => ix.GetDatabaseName() == expectedIndex);
        }

        private sealed class MutableClock(DateTimeOffset utcNow) : IClock
        {
            public DateTimeOffset UtcNow { get; set; } = utcNow;
        }

        private sealed class CourseOutboxTestDbContext(DbContextOptions<CourseOutboxTestDbContext> options)
            : DbContext(options)
        {
            public DbSet<OutboxMessage> OutboxEvents => Set<OutboxMessage>();

            protected override void OnModelCreating(ModelBuilder modelBuilder)
                => modelBuilder.ConfigureOutboxMessage("crs_outbox_event");
        }

        private sealed class LearningOutboxTestDbContext(DbContextOptions<LearningOutboxTestDbContext> options)
            : DbContext(options)
        {
            public DbSet<OutboxMessage> OutboxEvents => Set<OutboxMessage>();

            protected override void OnModelCreating(ModelBuilder modelBuilder)
                => modelBuilder.ConfigureOutboxMessage("lrn_outbox_event");
        }

        private sealed class AssessmentOutboxTestDbContext(DbContextOptions<AssessmentOutboxTestDbContext> options)
            : DbContext(options)
        {
            public DbSet<OutboxMessage> OutboxEvents => Set<OutboxMessage>();

            protected override void OnModelCreating(ModelBuilder modelBuilder)
                => modelBuilder.ConfigureOutboxMessage("ast_outbox_event");
        }

        private sealed class SaveFailState
        {
            public bool ShouldFailNextSave { get; set; }
        }

        private sealed class TransientSaveFailOutboxStore(
            CourseOutboxTestDbContext dbContext,
            SaveFailState state) : IOutboxStore
        {
            private readonly EfOutboxStore<CourseOutboxTestDbContext> _inner = new(dbContext, "Course");

            public string ModuleName => _inner.ModuleName;

            public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default)
                => _inner.ExistsAsync(eventId, ct);

            public Task AddAsync(OutboxMessage message, CancellationToken ct = default)
                => _inner.AddAsync(message, ct);

            public Task<IReadOnlyList<OutboxMessage>> GetUnpublishedAsync(
                int batchSize,
                int maxAttempts,
                CancellationToken ct = default)
                => _inner.GetUnpublishedAsync(batchSize, maxAttempts, ct);

            public Task SaveChangesAsync(CancellationToken ct = default)
            {
                if (state.ShouldFailNextSave)
                {
                    state.ShouldFailNextSave = false;
                    throw new IOException("Simulated transient DB disconnect after publish.");
                }

                return _inner.SaveChangesAsync(ct);
            }
        }

        internal sealed class TransactionalOutboxTestStore(string moduleName) : IOutboxStore, IUnitOfWork
        {
            private readonly ConcurrentDictionary<Guid, OutboxMessage> _committedOutbox = new();
            private readonly List<Guid> _committedBusiness = [];
            private readonly List<OutboxMessage> _pendingOutbox = [];
            private readonly List<Guid> _pendingBusiness = [];
            private bool _inTransaction;

            public Func<Task>? OnBeforeCommitAsync { get; set; }

            public int CommittedOutboxCount => _committedOutbox.Count;

            public int CommittedBusinessCount => _committedBusiness.Count;

            public string ModuleName { get; } = moduleName;

            public void RecordBusinessWrite(Guid id) => _pendingBusiness.Add(id);

            public Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default)
                => Task.FromResult(_committedOutbox.ContainsKey(eventId)
                    || _pendingOutbox.Any(x => x.Id == eventId));

            public Task AddAsync(OutboxMessage message, CancellationToken ct = default)
            {
                if (!_inTransaction)
                {
                    throw new InvalidOperationException("Outbox write must execute inside active TX.");
                }

                if (_committedOutbox.ContainsKey(message.Id) || _pendingOutbox.Any(x => x.Id == message.Id))
                {
                    return Task.CompletedTask;
                }

                _pendingOutbox.Add(message);
                return Task.CompletedTask;
            }

            public Task<IReadOnlyList<OutboxMessage>> GetUnpublishedAsync(
                int batchSize,
                int maxAttempts,
                CancellationToken ct = default)
            {
                List<OutboxMessage> items = _committedOutbox.Values
                    .Where(x => x.PublishedAt is null && (maxAttempts <= 0 || x.AttemptCount < maxAttempts))
                    .OrderBy(x => x.CreatedAt)
                    .ThenBy(x => x.Id)
                    .Take(batchSize)
                    .ToList();

                return Task.FromResult<IReadOnlyList<OutboxMessage>>(items);
            }

            public Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default)
            {
                _inTransaction = true;
                _pendingBusiness.Clear();
                _pendingOutbox.Clear();
                return Task.FromResult<IUnitOfWorkTransaction>(new FakeTx(this));
            }

            public Task<int> SaveChangesAsync(CancellationToken ct = default)
                => Task.FromResult(_pendingOutbox.Count + _pendingBusiness.Count);

            Task IOutboxStore.SaveChangesAsync(CancellationToken ct)
                => SaveChangesAsync(ct);

            private Task CommitPendingAsync()
            {
                foreach (Guid id in _pendingBusiness)
                {
                    _committedBusiness.Add(id);
                }

                foreach (OutboxMessage message in _pendingOutbox)
                {
                    _committedOutbox.TryAdd(message.Id, message);
                }

                _pendingBusiness.Clear();
                _pendingOutbox.Clear();
                _inTransaction = false;
                return Task.CompletedTask;
            }

            private void RollbackPending()
            {
                _pendingBusiness.Clear();
                _pendingOutbox.Clear();
                _inTransaction = false;
            }

            private sealed class FakeTx(TransactionalOutboxTestStore owner) : IUnitOfWorkTransaction
            {
                public async Task CommitAsync(CancellationToken ct = default)
                {
                    if (owner.OnBeforeCommitAsync is not null)
                    {
                        await owner.OnBeforeCommitAsync();
                    }

                    await owner.CommitPendingAsync();
                }

                public Task RollbackAsync(CancellationToken ct = default)
                {
                    owner.RollbackPending();
                    return Task.CompletedTask;
                }

                public ValueTask DisposeAsync() => ValueTask.CompletedTask;
            }
        }

        private sealed class RecordingHandler<TEvent>(List<IntegrationEvent> delivered) : IIntegrationEventHandler<TEvent>
            where TEvent : IntegrationEvent
        {
            public Task HandleAsync(TEvent @event, CancellationToken ct = default)
            {
                delivered.Add(@event);
                return Task.CompletedTask;
            }
        }

        private sealed class FlakyHandlerState
        {
            public int FailuresRemaining { get; set; }

            public int SuccessCount { get; set; }
        }

        private sealed class FlakyCourseHandler(FlakyHandlerState state)
            : IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>
        {
            public Task HandleAsync(BrainMemo.Course.Contracts.CourseUpsertedEvent @event, CancellationToken ct = default)
            {
                if (state.FailuresRemaining > 0)
                {
                    state.FailuresRemaining--;
                    throw new TimeoutException(new string('X', 600));
                }

                state.SuccessCount++;
                return Task.CompletedTask;
            }
        }

        private sealed class SignallingHandler(TaskCompletionSource<Guid> signal)
            : IIntegrationEventHandler<BrainMemo.Course.Contracts.CourseUpsertedEvent>
        {
            public Task HandleAsync(BrainMemo.Course.Contracts.CourseUpsertedEvent @event, CancellationToken ct = default)
            {
                signal.TrySetResult(@event.EventId);
                return Task.CompletedTask;
            }
        }
    }
}

namespace BrainMemo.Course.Contracts
{
    [OutboxEventName("CourseUpserted")]
    internal sealed record CourseUpsertedEvent(
        Guid EventId,
        DateTimeOffset OccurredAt,
        Guid CourseId,
        int Revision,
        bool Eligible,
        string Title) : IntegrationEvent(EventId, OccurredAt);
}

namespace BrainMemo.Learning.Contracts
{
    internal sealed record QuizAttemptSubmittedEvent(
        Guid EventId,
        DateTimeOffset OccurredAt,
        Guid AttemptId,
        Guid UserId,
        Guid CourseId) : IntegrationEvent(EventId, OccurredAt);
}

namespace BrainMemo.Assessment.Contracts
{
    internal sealed record GradeRecordedEvent(
        Guid EventId,
        DateTimeOffset OccurredAt,
        Guid GradeRecordId,
        Guid CourseId,
        decimal Score) : IntegrationEvent(EventId, OccurredAt);
}

namespace BrainMemo.Course.Application
{
    internal sealed record WriteCourseWithOutboxCommand(
        Guid CourseId,
        bool ShouldFailResult,
        bool ThrowException) : ICommand;

    internal sealed class WriteCourseWithOutboxCommandHandler(
        global::BuildingBlocks.UnitTests.Outbox.OutboxTests.TransactionalOutboxTestStore txStore,
        IOutboxWriter outboxWriter,
        IClock clock) : ICommandHandler<WriteCourseWithOutboxCommand>
    {
        public async Task<Result> Handle(WriteCourseWithOutboxCommand request, CancellationToken cancellationToken)
        {
            txStore.RecordBusinessWrite(request.CourseId);
            await outboxWriter.WriteAsync(
                request.CourseId,
                new BrainMemo.Course.Contracts.CourseUpsertedEvent(
                    UuidV7.NewGuid(),
                    clock.UtcNow,
                    request.CourseId,
                    Revision: 1,
                    Eligible: true,
                    Title: "Atomic"),
                cancellationToken);

            if (request.ThrowException)
            {
                throw new InvalidOperationException("Handler failed mid-tx");
            }

            return request.ShouldFailResult
                ? Result.Failure(Error.Conflict("INVALID_STATE", "Rolled back"))
                : Result.Success();
        }
    }
}
