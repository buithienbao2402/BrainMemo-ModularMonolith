import { z } from 'zod';

export const courseUpsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên khóa học không được để trống')
    .max(200, 'Tên khóa học không được vượt quá 200 ký tự'),
  description: z
    .string()
    .max(5000, 'Mô tả khóa học không được vượt quá 5000 ký tự')
    .optional()
    .default(''),
  accessMode: z.enum(['PUBLIC', 'PRIVATE', 'ONLY_ME']).default('PUBLIC'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Tag không được để trống')
        .max(50, 'Mỗi tag không quá 50 ký tự')
    )
    .max(10, 'Tối đa 10 tag cho mỗi khóa học')
    .default([]),
  coverUploadKey: z.string().optional(),
  removeCover: z.boolean().optional(),
});

export type CourseUpsertFormValues = z.infer<typeof courseUpsertSchema>;
