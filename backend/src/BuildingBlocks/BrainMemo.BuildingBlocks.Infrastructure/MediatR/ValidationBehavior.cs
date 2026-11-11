using System.Collections.Concurrent;
using System.Reflection;
using BrainMemo.SharedKernel.Results;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace BrainMemo.BuildingBlocks.Infrastructure.MediatR;

/// <summary>
/// Validates incoming MediatR requests via FluentValidation and returns VALIDATION_FAILED Results without throwing business exceptions.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly ConcurrentDictionary<Type, Func<Error, object>> FailureFactories = new();

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);

        IReadOnlyList<IValidator<TRequest>> activeValidators = validators as IReadOnlyList<IValidator<TRequest>>
            ?? validators.ToList();

        if (activeValidators.Count == 0)
        {
            return await next().ConfigureAwait(false);
        }

        ValidationContext<TRequest> context = new(request);
        ValidationResult[] results = await Task.WhenAll(
            activeValidators.Select(validator => validator.ValidateAsync(context, cancellationToken)))
            .ConfigureAwait(false);

        List<ValidationFailure> failures = results
            .SelectMany(result => result.Errors)
            .Where(failure => failure is not null)
            .ToList();

        if (failures.Count == 0)
        {
            return await next().ConfigureAwait(false);
        }

        ValidationFailureDetail[] details = failures
            .Select(failure => new ValidationFailureDetail(failure.PropertyName, failure.ErrorMessage))
            .Distinct()
            .ToArray();

        Error error = Error.Validation("Dữ liệu đầu vào không hợp lệ.", details);

        if (TryCreateFailureResponse(error, out TResponse? response))
        {
            return response!;
        }

        throw new ValidationException(failures);
    }

    private static bool TryCreateFailureResponse(Error error, out TResponse? response)
    {
        Type responseType = typeof(TResponse);

        if (responseType == typeof(Result))
        {
            response = (TResponse)(object)Result.Failure(error);
            return true;
        }

        if (responseType.IsGenericType && responseType.GetGenericTypeDefinition() == typeof(Result<>))
        {
            Func<Error, object> factory = FailureFactories.GetOrAdd(responseType, static type =>
            {
                Type valueType = type.GetGenericArguments()[0];
                MethodInfo method = typeof(ValidationBehavior<TRequest, TResponse>)
                    .GetMethod(nameof(CreateGenericFailure), BindingFlags.NonPublic | BindingFlags.Static)!
                    .MakeGenericMethod(valueType);
                return method.CreateDelegate<Func<Error, object>>();
            });

            response = (TResponse)factory(error);
            return true;
        }

        response = default;
        return false;
    }

    private static object CreateGenericFailure<TValue>(Error error)
        => Result.Failure<TValue>(error);
}
