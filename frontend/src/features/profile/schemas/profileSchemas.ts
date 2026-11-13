import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Họ và tên hiển thị không được để trống')
    .max(100, 'Họ và tên hiển thị không được vượt quá 100 ký tự'),
  bio: z
    .string()
    .max(2000, 'Giới thiệu bản thân không được vượt quá 2000 ký tự')
    .optional()
    .default(''),
  showCourseList: z.boolean().default(true),
  uiTheme: z.enum(['LIGHT', 'DARK']).default('DARK'),
  avatarUploadKey: z.string().optional(),
  removeAvatar: z.boolean().optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
