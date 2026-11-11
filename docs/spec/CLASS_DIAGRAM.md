# CLASS DIAGRAM

## Mục lục

1. [Mediator + CQRS + Chain of Responsibility (Assessment)](#1-mediator--cqrs--chain-of-responsibility-module-assessment)
2. [Strategy + Factory: Grading Engine (Assessment)](#2-strategy--factory-grading-engine-module-assessment)
3. [Observer / Domain Event + Outbox: Module Learning](#3-observer--domain-event--outbox-module-learning)
4. [Observer / Domain Event + Outbox: Module Assessment](#4-observer--domain-event--outbox-module-assessment)
5. [Repository + Unit of Work](#5-repository--unit-of-work)
6. [Strategy + Factory: Block System (Content)](#6-strategy--factory-block-system-module-content)
7. [Adapter: S3 / MinIO](#7-adapter-s3--minio)

---

## 1. Mediator + CQRS + Chain of Responsibility (Module Assessment)

`TransactionBehavior` chỉ áp dụng cho Command; Query bỏ qua. `ICloAchievementCalculator` chỉ được dùng bởi `GetStudentGradebookQueryHandler` (mức đạt CLO tính khi đọc bảng điểm, không tính lúc nộp bài).

```mermaid
---
title: Mediator + CQRS + Chain of Responsibility (Module Assessment)
---
classDiagram
    direction TB

    class Controller {
        +gọi IMediator.Send()
    }
    class IMediator {
        <<interface>>
        +Send(request)
        +Publish(notification)
    }
    class IPipelineBehavior {
        <<interface>>
        +Handle(request, next, ct)
    }
    class LoggingBehavior {
        implements IPipelineBehavior
    }
    class ValidationBehavior {
        implements IPipelineBehavior
        dùng FluentValidation
    }
    class TransactionBehavior {
        implements IPipelineBehavior
        dùng IUnitOfWork
        chỉ áp dụng cho Command
        ghi dữ liệu, bỏ qua Query
    }

    class GetStudentGradebookQuery {
        <<Query>>
        Module Assessment
        xem bảng điểm cá nhân
        chỉ đọc dữ liệu (CQRS)
    }
    class GetStudentGradebookQueryHandler {
        <<IRequestHandler>>
        Module Assessment
        +Handle(query, ct) GradebookDto
        đọc COMPONENT_FINAL + trọng số CLO
    }
    class ICloAchievementCalculator {
        <<interface>>
        +Calculate(studentId, courseId)
    }

    class ManualGradeCommand {
        <<Command>>
        +GradeRecordId
        +Score
        +Comment
    }
    class ManualGradeCommandHandler {
        <<IRequestHandler>>
        Module Assessment
        - IAssessmentUnitOfWork _uow
        +Handle(cmd, ct)
        nhận điểm + nhận xét do Chủ khóa
        lưu GradeRecord + OutboxMessage
        chứa GradeRecordedDomainEvent
    }
    class GradeRecordedDomainEvent {
        <<INotification>>
        xem chi tiết ở hình 4
    }

    Controller --> IMediator : Send()
    IMediator ..> IPipelineBehavior : chạy pipeline
    IPipelineBehavior <|.. LoggingBehavior
    IPipelineBehavior <|.. ValidationBehavior
    IPipelineBehavior <|.. TransactionBehavior
    LoggingBehavior --> ValidationBehavior : next
    ValidationBehavior --> TransactionBehavior : next

    GetStudentGradebookQuery ..> GetStudentGradebookQueryHandler : xử lý
    GetStudentGradebookQueryHandler ..> ICloAchievementCalculator : tính mức đạt CLO

    ManualGradeCommand ..> ManualGradeCommandHandler : xử lý
    ManualGradeCommandHandler ..> GradeRecordedDomainEvent : tạo event
```

> `ManualGradeCommandHandler` = `IRequestHandler<ManualGradeCommand>`; `GetStudentGradebookQueryHandler` = `IRequestHandler<GetStudentGradebookQuery, GradebookDto>`.

---

## 2. Strategy + Factory: Grading Engine (Module Assessment)

```mermaid
---
title: Strategy + Factory - Grading Engine (Module Assessment)
---
classDiagram
    direction LR

    class IGradingStrategy {
        <<interface>>
        +Evaluate(question, answer) QuestionGradeResult
    }
    class SingleChoiceStrategy
    class MultipleChoiceStrategy
    class TrueFalseStrategy
    class FillBlankStrategy
    class MatchingStrategy
    class ManualGradingStrategy {
        chỉ xác định câu cần chấm tay
        trả về PendingManualGrading
        không tự tính điểm
    }

    class IGradingStrategyFactory {
        <<interface>>
        +GetStrategy(questionType) IGradingStrategy
    }
    class GradingStrategyFactory {
        implements IGradingStrategyFactory
        - IServiceProvider _provider
        +GetStrategy(questionType)
    }

    class ICloAchievementCalculator {
        <<interface>>
        +Calculate(studentId, courseId)
    }
    class CloAchievementCalculator {
        implements ICloAchievementCalculator
        +Calculate(studentId, courseId)
        tính mức đạt CLO theo công thức
        chỉ dùng bởi GetStudentGradebookQueryHandler
    }

    IGradingStrategy <|.. SingleChoiceStrategy
    IGradingStrategy <|.. MultipleChoiceStrategy
    IGradingStrategy <|.. TrueFalseStrategy
    IGradingStrategy <|.. FillBlankStrategy
    IGradingStrategy <|.. MatchingStrategy
    IGradingStrategy <|.. ManualGradingStrategy

    IGradingStrategyFactory <|.. GradingStrategyFactory
    GradingStrategyFactory ..> IGradingStrategy : tạo
    ICloAchievementCalculator <|.. CloAchievementCalculator
```

---

## 3. Observer / Domain Event + Outbox: Module Learning

Luồng nộp bài (ADR-04, SD-05):

1. **TX1** (`SubmitQuizAttemptCommandHandler`): `IN_PROGRESS → SUBMITTED` (hoặc `AUTO_SUBMITTED`) và ghi `OutboxMessage` chứa `QuizAttemptSubmittedDomainEvent`, cùng một transaction.
2. Ngoài transaction: `QuizSubmissionService` gọi đồng bộ `IGradeQuizAttempt.GradeAsync(attemptId)` (Contract do Assessment cung cấp).
3. **TX2**: Learning ghi điểm từng câu, `total_score`, `GRADED` (nếu không còn câu chờ chấm tay).
4. Sau commit: `LearningOutboxProcessor` phát `QuizAttemptSubmittedDomainEvent`, `UpdateCourseProgressHandler` cập nhật tiến độ. Assessment cũng lắng nghe event này để chấm lại khi lời gọi đồng bộ lỗi (xem hình 4).

```mermaid
---
title: Observer / Domain Event + Outbox - Module Learning
---
classDiagram
    direction TB

    class QuizSubmissionService {
        <<Application Service>>
        Module Learning
        - IMediator _mediator
        - IGradeQuizAttempt _gradeQuiz
        - ILearningUnitOfWork _uow
        +SubmitQuiz(request)
        tx1 gửi SubmitQuizAttemptCommand
        gọi GradeAsync ngoài transaction
        tx2 ghi điểm vào QuizAttempt
    }
    class IGradeQuizAttempt {
        <<Contract>>
        Module Assessment
        +GradeAsync(attemptId) GradeQuizAttemptResult
    }
    class SubmitQuizAttemptCommand {
        <<Command>>
        +AttemptId
        +AutoSubmitted
    }
    class SubmitQuizAttemptCommandHandler {
        <<IRequestHandler>>
        Module Learning
        - ILearningUnitOfWork _uow
        +Handle(cmd, ct)
        cập nhật QuizAttempt thành SUBMITTED
        lưu QuizAttempt + OutboxMessage
        cùng một transaction (tx1)
    }
    class QuizAttemptSubmittedDomainEvent {
        <<INotification>>
        phát bởi Module Learning
        +AttemptId
        +StudentId
        +CourseId
        +ChapterId
        +BlockId
        +QuizId
        +SubmittedAt
        +AutoSubmitted
    }
    class LearningOutboxProcessor {
        <<BackgroundService>>
        - ILearningUnitOfWork _uow
        đọc Outbox của Learning
        +IMediator.Publish(event)
    }
    class UpdateCourseProgressHandler {
        <<INotificationHandler>>
        Module Learning
        - ILearningUnitOfWork _uow
        +Handle(evt, ct)
        cập nhật BlockCompletion, CourseCompletion
    }
    class RegradeQuizAttemptHandler {
        <<INotificationHandler>>
        Module Assessment
        lưới an toàn: chấm lại, xem hình 4
    }

    QuizSubmissionService ..> SubmitQuizAttemptCommand : gửi Command (tx1)
    SubmitQuizAttemptCommand ..> SubmitQuizAttemptCommandHandler : xử lý
    SubmitQuizAttemptCommandHandler ..> QuizAttemptSubmittedDomainEvent : tạo event (vào Outbox)
    QuizSubmissionService ..> IGradeQuizAttempt : gọi qua Contract
    LearningOutboxProcessor ..> QuizAttemptSubmittedDomainEvent : Publish
    UpdateCourseProgressHandler ..> QuizAttemptSubmittedDomainEvent : lắng nghe
    RegradeQuizAttemptHandler ..> QuizAttemptSubmittedDomainEvent : lắng nghe
```

> Quiz Block hoàn thành khi học viên nộp bài: `UpdateCourseProgressHandler` nghe `QuizAttemptSubmittedDomainEvent` (có `BlockId`, `ChapterId`), không phụ thuộc đạt hay không đạt.

---

## 4. Observer / Domain Event + Outbox: Module Assessment

`GradeQuizAttemptHandler` là **Command handler gọi đồng bộ**, không còn là `INotificationHandler`. Handler không dùng `IQuizConfigReader` và `ICloAchievementCalculator`: `PassScore` lấy từ snapshot của lượt làm do Learning cung cấp qua `IAttemptAnswerReader.GetQuizAttemptForGrading`.

```mermaid
---
title: Observer / Domain Event + Outbox - Module Assessment
---
classDiagram
    direction TB

    class IGradeQuizAttempt {
        <<Contract>>
        +GradeAsync(attemptId) GradeQuizAttemptResult
    }
    class GradeQuizAttemptService {
        implements IGradeQuizAttempt
        Module Assessment
        - IMediator _mediator
        +GradeAsync(attemptId)
        gửi GradeQuizAttemptCommand
    }
    class GradeQuizAttemptCommand {
        <<Command>>
        +AttemptId
    }
    class GradeQuizAttemptResult {
        +TotalScore
        +MaxScore
        +PendingManual
        +decimal? PassScore
        +bool? IsPassed
        +Questions
    }
    class GradeQuizAttemptHandler {
        <<IRequestHandler>>
        Module Assessment
        - IGradingStrategyFactory _factory
        - IAttemptAnswerReader _answers
        - IAssessmentUnitOfWork _uow
        +Handle(cmd, ct) GradeQuizAttemptResult
        chấm từng câu bằng IGradingStrategy
        lưu GradeRecord + OutboxMessage cùng transaction
        idempotent (gọi lại chỉ cập nhật)
    }
    class IGradingStrategyFactory {
        <<interface>>
        +GetStrategy(questionType) IGradingStrategy
    }
    class IAttemptAnswerReader {
        <<Contract>>
        Module Learning
        +GetQuizAttemptForGrading(attemptId)
    }
    class RegradeQuizAttemptHandler {
        <<INotificationHandler>>
        Module Assessment
        +Handle(evt, ct)
        gửi lại GradeQuizAttemptCommand
        bỏ qua nếu đã chấm xong
    }
    class QuizAttemptSubmittedDomainEvent {
        <<INotification>>
        phát bởi Module Learning, xem hình 3
    }
    class GradeRecordedDomainEvent {
        <<INotification>>
        phát bởi Module Assessment
        +GradeRecordId
        +StudentId
        +CourseId
        +QuizId
        +Score
        +decimal? PassScore
        +bool? IsPassed
    }
    class AssessmentOutboxProcessor {
        <<BackgroundService>>
        - IAssessmentUnitOfWork _uow
        đọc Outbox của Assessment
        +IMediator.Publish(event)
    }
    class CreateGradeNotificationHandler {
        <<INotificationHandler>>
        Module Notification
        - INotificationUnitOfWork _uow
        +Handle(evt, ct)
    }

    IGradeQuizAttempt <|.. GradeQuizAttemptService
    GradeQuizAttemptService ..> GradeQuizAttemptCommand : gửi Command
    GradeQuizAttemptCommand ..> GradeQuizAttemptHandler : xử lý
    GradeQuizAttemptHandler ..> GradeQuizAttemptResult : trả về
    GradeQuizAttemptHandler ..> IGradingStrategyFactory : dùng để chấm
    GradeQuizAttemptHandler ..> IAttemptAnswerReader : GetQuizAttemptForGrading
    GradeQuizAttemptHandler ..> GradeRecordedDomainEvent : tạo event (vào Outbox)

    RegradeQuizAttemptHandler ..> QuizAttemptSubmittedDomainEvent : lắng nghe
    RegradeQuizAttemptHandler ..> GradeQuizAttemptCommand : gửi lại
    AssessmentOutboxProcessor ..> GradeRecordedDomainEvent : Publish
    CreateGradeNotificationHandler ..> GradeRecordedDomainEvent : lắng nghe
```

**Quy tắc điền `PassScore` / `IsPassed`** (ADR-05):

| Tình huống | `PassScore` | `IsPassed` |
|:--|:--|:--|
| Bài đặt `pass_score`, đã chấm xong | giá trị % (0–100) từ snapshot | `(TotalScore / MaxScore × 100) ≥ PassScore` |
| Bài không đặt `pass_score` | `null` | `null` |
| Còn câu tự luận chờ chấm tay | giữ nguyên | `null` |

`GradeRecordedDomainEvent` chỉ được ghi vào Outbox khi không còn câu chờ chấm tay.

---

## 5. Repository + Unit of Work

Mỗi module có UnitOfWork và DbContext riêng. `OutboxMessage` ở Learning dùng bảng `lrn_outbox_event`, ở Assessment dùng bảng `ast_outbox_event`.

```mermaid
---
title: Repository + Unit of Work
---
classDiagram
    direction TB

    class IUnitOfWork {
        <<interface>>
        +SaveChangesAsync(ct)
    }
    class IRepository~T~ {
        <<interface>>
        +GetByIdAsync(id)
        +AddAsync(e)
        +Update(e)
        +Delete(e)
    }
    class ILearningUnitOfWork {
        <<interface>>
        Module Learning
        +IRepository~QuizAttempt~ QuizAttempts
        +IRepository~CourseCompletion~ CourseCompletions
        +IRepository~BlockCompletion~ BlockCompletions
        +IRepository~OutboxMessage~ Outbox
    }
    class IAssessmentUnitOfWork {
        <<interface>>
        Module Assessment
        +IRepository~GradeRecord~ GradeRecords
        +IRepository~AssessmentComponent~ Components
        +IRepository~Clo~ CLOs
        +IRepository~OutboxMessage~ Outbox
    }

    IUnitOfWork <|-- ILearningUnitOfWork
    IUnitOfWork <|-- IAssessmentUnitOfWork
    ILearningUnitOfWork ..> IRepository : dùng
    IAssessmentUnitOfWork ..> IRepository : dùng

    note for ILearningUnitOfWork "triển khai: LearningDbContext\n(schema riêng của Learning)"
    note for IAssessmentUnitOfWork "triển khai: AssessmentDbContext\n(schema riêng của Assessment)"
```

---

## 6. Strategy + Factory: Block System (Module Content)

```mermaid
---
title: Strategy + Factory - Block System (Module Content)
---
classDiagram
    direction LR

    class Block {
        <<abstract>>
        +Id, ChapterId
        +OrderIndex, BlockType
        con: Text / Media / Question / Assignment / Quiz / Flashcard
    }
    class IBlockHandler {
        <<interface>>
        +Validate(block) bool
        +Render(block) BlockRenderDto
    }
    class TextBlockHandler
    class QuestionBlockHandler
    class AssignmentBlockHandler
    class QuizBlockHandler
    class FlashcardBlockHandler
    class MediaBlockHandler {
        dùng IStorageService
    }
    class BlockHandlerFactory {
        - Dictionary~string, IBlockHandler~ handlers
        +GetHandler(blockType) IBlockHandler
    }
    class IStorageService {
        <<interface>>
        xem hình 7
    }

    IBlockHandler ..> Block : xử lý
    IBlockHandler <|.. TextBlockHandler
    IBlockHandler <|.. QuestionBlockHandler
    IBlockHandler <|.. AssignmentBlockHandler
    IBlockHandler <|.. QuizBlockHandler
    IBlockHandler <|.. FlashcardBlockHandler
    IBlockHandler <|.. MediaBlockHandler
    BlockHandlerFactory ..> IBlockHandler : trả về
    MediaBlockHandler ..> IStorageService : dùng
```

**Bảng ánh xạ 10 loại Block (`BlockType`) → 6 handler** (khớp `cnt_block.block_type`, mục 3.3.1 đặc tả):

| # | `BlockType` | Handler |
|:-:|:--|:--|
| 1 | `RICH_TEXT` | `TextBlockHandler` |
| 2 | `MARKDOWN` | `TextBlockHandler` |
| 3 | `IMAGE` | `MediaBlockHandler` |
| 4 | `VIDEO` | `MediaBlockHandler` |
| 5 | `AUDIO` | `MediaBlockHandler` |
| 6 | `FILE` | `MediaBlockHandler` |
| 7 | `FLASHCARD` | `FlashcardBlockHandler` |
| 8 | `QUESTION` | `QuestionBlockHandler` |
| 9 | `ASSIGNMENT` | `AssignmentBlockHandler` |
| 10 | `QUIZ` | `QuizBlockHandler` |

Tổng: 2 + 4 + 1 + 1 + 1 + 1 = 10 loại, 6 handler. `BlockHandlerFactory` đăng ký nhiều `blockType` trỏ về cùng một handler (ví dụ `RICH_TEXT` và `MARKDOWN` cùng trỏ `TextBlockHandler`).

---

## 7. Adapter: S3 / MinIO

```mermaid
---
title: Adapter - S3 / MinIO
---
classDiagram
    direction LR

    class IStorageService {
        <<interface>>
        +GeneratePresignedUploadUrl()
        +GeneratePresignedDownloadUrl()
        +DeleteObject()
    }
    class MinioStorageService {
        <<Adapter>>
        - IAmazonS3 _s3Client
    }
    class IAmazonS3 {
        <<SDK ngoài>>
    }

    IStorageService <|.. MinioStorageService
    MinioStorageService ..> IAmazonS3 : gọi
```
