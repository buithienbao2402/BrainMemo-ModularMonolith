import { apiClient, unwrapApi, type components } from './client';
import { ApiProblemError } from './errors';

export type UploadPurpose =
  | 'AVATAR'
  | 'COURSE_COVER'
  | 'COURSE_RESOURCE'
  | 'ASSIGNMENT_FILE'
  | 'REPORT_EVIDENCE';

export type UploadUrlDto = components['schemas']['UploadUrlDto'];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (DEC-05)
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB (DEC-05)

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadFileOptions {
  file: File;
  purpose: UploadPurpose;
  courseId?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Validates file size and MIME type according to DEC-05 and uploads directly
 * to S3/R2 via Presigned PUT URL obtained from POST /files/upload-urls.
 * Returns the uploadKey to be committed in subsequent business endpoints.
 */
export async function uploadFileToStorage({
  file,
  purpose,
  courseId,
  onProgress,
}: UploadFileOptions): Promise<string> {
  const isImagePurpose = purpose === 'AVATAR' || purpose === 'COURSE_COVER';

  // 1. Client-side pre-validation
  if (isImagePurpose) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new ApiProblemError(
        {
          title: 'Kích thước tệp quá lớn',
          status: 400,
          code: 'FILE_TOO_LARGE',
          detail: 'Kích thước ảnh không được vượt quá 5 MB.',
        },
        400
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new ApiProblemError(
        {
          title: 'Định dạng tệp không được hỗ trợ',
          status: 400,
          code: 'FILE_TYPE_NOT_ALLOWED',
          detail: 'Chỉ hỗ trợ tệp ảnh định dạng JPEG, PNG hoặc WebP.',
        },
        400
      );
    }
  } else if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiProblemError(
      {
        title: 'Kích thước tệp quá lớn',
        status: 400,
        code: 'FILE_TOO_LARGE',
        detail: 'Kích thước tệp đính kèm không được vượt quá 20 MB.',
      },
      400
    );
  }

  // 2. Request presigned upload URL
  const uploadUrlData = await unwrapApi<UploadUrlDto>(
    apiClient.POST('/files/upload-urls', {
      body: {
        purpose,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type || 'application/octet-stream',
        courseId,
      },
    })
  );

  if (!uploadUrlData.uploadUrl || !uploadUrlData.uploadKey) {
    throw new ApiProblemError(
      {
        title: 'Lỗi cấp quyền tải lên',
        status: 500,
        code: 'PRESIGNED_URL_GENERATION_FAILED',
        detail: 'Máy chủ không thể tạo liên kết tải lên an toàn.',
      },
      500
    );
  }

  // 3. Direct upload to S3/R2 with progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrlData.uploadUrl!);

    // Set any required presigned headers
    if (uploadUrlData.headers) {
      for (const [key, value] of Object.entries(uploadUrlData.headers)) {
        if (typeof value === 'string') {
          xhr.setRequestHeader(key, value);
        }
      }
    }

    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new ApiProblemError(
            {
              title: 'Tải tệp lên bộ lưu trữ thất bại',
              status: xhr.status || 500,
              code: 'STORAGE_UPLOAD_FAILED',
              detail: `Máy chủ lưu trữ phản hồi mã ${xhr.status}.`,
            },
            xhr.status || 500
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiProblemError(
          {
            title: 'Lỗi mạng khi tải tệp',
            status: 0,
            code: 'NETWORK_ERROR',
            detail: 'Không thể kết nối đến máy chủ lưu trữ tệp.',
          },
          0
        )
      );
    };

    xhr.send(file);
  });

  return uploadUrlData.uploadKey;
}
