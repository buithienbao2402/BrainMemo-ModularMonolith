import { describe, expect, it } from 'vitest';
import {
  ApiProblemError,
  createNetworkError,
  isAccountLockedError,
  isNotEnrolledError,
  isPasscodeRequiredError,
  isRateLimitError,
  isServerOrNetworkError,
  isValidationError,
  isVersionConflictError,
  mapValidationErrorsToFields,
  parseProblemDetails,
} from './errors';

describe('errors / RFC 9457 ProblemDetails', () => {
  it('parses RFC 9457 JSON including validation field errors and lock extensions', async () => {
    const response = new Response(
      JSON.stringify({
        type: 'https://brainmemo.vn/errors/validation',
        title: 'Dữ liệu đầu vào không hợp lệ',
        status: 422,
        detail: 'Kiểm tra lại thông tin biểu mẫu',
        code: 'VALIDATION_ERROR',
        traceId: 'trace-123',
        errors: [
          { field: 'email', message: 'Email không hợp lệ' },
          { field: 'email', message: 'Thông báo trùng thứ 2 sẽ bị bỏ qua' },
          { field: 'password', message: 'Mật khẩu tối thiểu 8 ký tự' },
        ],
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/problem+json' },
      }
    );

    const problem = await parseProblemDetails(response);

    expect(problem).toBeInstanceOf(ApiProblemError);
    expect(problem.status).toBe(422);
    expect(problem.code).toBe('VALIDATION_ERROR');
    expect(problem.title).toBe('Dữ liệu đầu vào không hợp lệ');
    expect(problem.traceId).toBe('trace-123');
    expect(isValidationError(problem)).toBe(true);
    expect(mapValidationErrorsToFields(problem)).toEqual({
      email: 'Email không hợp lệ',
      password: 'Mật khẩu tối thiểu 8 ký tự',
    });
  });

  it('handles non-JSON 502 server response gracefully', async () => {
    const response = new Response('<html>Bad Gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const problem = await parseProblemDetails(response);
    expect(problem.status).toBe(502);
    expect(problem.code).toBe('INTERNAL_ERROR');
    expect(isServerOrNetworkError(problem)).toBe(true);
  });

  it('classifies domain error codes per FRONTEND_SPEC §4', () => {
    const locked = new ApiProblemError({
      status: 403,
      code: 'ACCOUNT_LOCKED',
      title: 'Tài khoản đang bị khóa',
      lockReason: 'Spam',
      lockedUntil: '2026-12-01T00:00:00Z',
    });
    const passcode = new ApiProblemError({
      status: 403,
      code: 'PASSCODE_REQUIRED',
      title: 'Cần mã tham gia',
    });
    const notEnrolled = new ApiProblemError({
      status: 403,
      code: 'NOT_ENROLLED',
      title: 'Chưa ghi danh',
    });
    const conflict = new ApiProblemError({
      status: 409,
      code: 'VERSION_CONFLICT',
      title: 'Xung đột phiên bản',
    });
    const rateLimited = new ApiProblemError({
      status: 429,
      code: 'RATE_LIMITED',
      title: 'Quá nhiều yêu cầu',
    });
    const netErr = createNetworkError(new TypeError('Failed to fetch'));

    expect(isAccountLockedError(locked)).toBe(true);
    expect(isPasscodeRequiredError(passcode)).toBe(true);
    expect(isNotEnrolledError(notEnrolled)).toBe(true);
    expect(isVersionConflictError(conflict)).toBe(true);
    expect(isRateLimitError(rateLimited)).toBe(true);
    expect(isServerOrNetworkError(netErr)).toBe(true);
  });
});
