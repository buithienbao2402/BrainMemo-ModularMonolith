import i18n from '@/shared/i18n';
import type { components } from './schema';

export type ProblemSchema = components['schemas']['Problem'];

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface ProblemDetails extends Omit<ProblemSchema, 'errors'> {
  errors?: Array<{ field?: string; message?: string }>;
  lockedUntil?: string | null;
  lockReason?: string | null;
}

export interface ApiProblemErrorInit {
  status: number;
  code: string;
  title: string;
  detail?: string;
  traceId?: string;
  errors?: FieldValidationError[];
  lockedUntil?: string | null;
  lockReason?: string | null;
  isNetworkError?: boolean;
  cause?: unknown;
}

/**
 * Normalized RFC 9457 ProblemDetails error returned/thrown across the API layer.
 */
export class ApiProblemError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail?: string;
  readonly traceId?: string;
  readonly errors: FieldValidationError[];
  readonly lockedUntil?: string | null;
  readonly lockReason?: string | null;
  readonly isNetworkError: boolean;

  constructor(init: ApiProblemErrorInit) {
    super(init.title, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = 'ApiProblemError';
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.detail = init.detail;
    this.traceId = init.traceId;
    this.errors = init.errors ?? [];
    this.lockedUntil = init.lockedUntil;
    this.lockReason = init.lockReason;
    this.isNetworkError = init.isNetworkError ?? false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFieldErrors(raw: unknown): FieldValidationError[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized: FieldValidationError[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const field = typeof item.field === 'string' ? item.field.trim() : '';
    const message = typeof item.message === 'string' ? item.message.trim() : '';
    if (field && message) {
      normalized.push({ field, message });
    }
  }
  return normalized;
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
  }
}

function defaultTitleForStatus(status: number): string {
  switch (status) {
    case 401:
      return i18n.t('errors.unauthenticated');
    case 403:
      return i18n.t('errors.forbidden');
    case 429:
      return i18n.t('errors.rateLimited');
    default:
      return i18n.t('errors.genericRetry');
  }
}

/**
 * Converts a non-2xx HTTP Response (and optional pre-parsed JSON body) into ApiProblemError.
 */
export async function parseProblemDetails(
  response: Response,
  preParsedBody?: unknown
): Promise<ApiProblemError> {
  let payload: unknown = preParsedBody;

  if (payload === undefined) {
    try {
      payload = await response.clone().json();
    } catch {
      payload = null;
    }
  }

  if (isRecord(payload)) {
    const status = typeof payload.status === 'number' ? payload.status : response.status;
    const code =
      typeof payload.code === 'string' && payload.code.trim().length > 0
        ? payload.code.trim()
        : defaultCodeForStatus(status);
    const title =
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim()
        : defaultTitleForStatus(status);

    return new ApiProblemError({
      status,
      code,
      title,
      detail: typeof payload.detail === 'string' ? payload.detail : undefined,
      traceId: typeof payload.traceId === 'string' ? payload.traceId : undefined,
      errors: normalizeFieldErrors(payload.errors),
      lockedUntil:
        typeof payload.lockedUntil === 'string' || payload.lockedUntil === null
          ? payload.lockedUntil
          : undefined,
      lockReason:
        typeof payload.lockReason === 'string' || payload.lockReason === null
          ? payload.lockReason
          : undefined,
    });
  }

  return new ApiProblemError({
    status: response.status,
    code: defaultCodeForStatus(response.status),
    title: defaultTitleForStatus(response.status),
  });
}

export function createNetworkError(cause?: unknown): ApiProblemError {
  return new ApiProblemError({
    status: 0,
    code: 'NETWORK_ERROR',
    title: i18n.t('errors.network'),
    isNetworkError: true,
    cause,
  });
}

export function toApiProblemError(error: unknown): ApiProblemError {
  if (error instanceof ApiProblemError) {
    return error;
  }
  if (error instanceof Error) {
    const isLikelyNetwork = error instanceof TypeError;
    return new ApiProblemError({
      status: 0,
      code: isLikelyNetwork ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
      title: isLikelyNetwork
        ? i18n.t('errors.network')
        : error.message || i18n.t('errors.genericRetry'),
      isNetworkError: isLikelyNetwork,
      cause: error,
    });
  }
  return new ApiProblemError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    title: i18n.t('errors.genericRetry'),
    cause: error,
  });
}

/**
 * Flattens RFC 422 ProblemDetails.errors into a field -> first message map for React Hook Form.
 */
export function mapValidationErrorsToFields(error: ApiProblemError): Record<string, string> {
  const fieldMap: Record<string, string> = {};
  for (const item of error.errors) {
    if (fieldMap[item.field] === undefined) {
      fieldMap[item.field] = item.message;
    }
  }
  return fieldMap;
}

export function isValidationError(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError && error.status === 422;
}

export function isUnauthorizedError(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError && error.status === 401;
}

export function isAccountLockedError(error: unknown): error is ApiProblemError {
  return (
    error instanceof ApiProblemError && error.status === 403 && error.code === 'ACCOUNT_LOCKED'
  );
}

export function isPasscodeRequiredError(error: unknown): error is ApiProblemError {
  return (
    error instanceof ApiProblemError && error.status === 403 && error.code === 'PASSCODE_REQUIRED'
  );
}

export function isNotEnrolledError(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError && error.status === 403 && error.code === 'NOT_ENROLLED';
}

export function isVersionConflictError(error: unknown): error is ApiProblemError {
  return (
    error instanceof ApiProblemError && error.status === 409 && error.code === 'VERSION_CONFLICT'
  );
}

export function isRateLimitError(error: unknown): error is ApiProblemError {
  return error instanceof ApiProblemError && error.status === 429;
}

export function isServerOrNetworkError(error: unknown): error is ApiProblemError {
  return (
    error instanceof ApiProblemError &&
    (error.isNetworkError || error.status >= 500 || error.status === 0)
  );
}
