// src/modules/tasks/tasks.validation.js
const { z } = require("zod");

const TaskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const TaskStatus = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

// ── Tạo task mới ─────────────────────────────────────────────
const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "Tiêu đề task là bắt buộc" })
      .min(1, "Tiêu đề không được để trống")
      .max(255, "Tiêu đề tối đa 255 ký tự"),

    description: z.string().optional().nullable(),

    deadline: z
      .string()
      .datetime({ message: "Deadline không hợp lệ (ISO 8601)" })
      .optional()
      .nullable(),

    priority: TaskPriority.optional().default("MEDIUM"),

    sourceMessage: z
      .string()
      .max(2000, "Nguồn gốc task tối đa 2000 ký tự")
      .optional()
      .nullable(),

    // Gắn với dự án — không bắt buộc
    projectId: z.string().min(1).max(30).optional().nullable(),

    // Gán ngay khi tạo — không bắt buộc
    assignedToUserId: z.string().min(1).max(30).optional().nullable(),

    estimatedHours: z
      .number()
      .min(0.5, "Tối thiểu 0.5 giờ")
      .max(999.9, "Tối đa 999.9 giờ")
      .optional()
      .nullable(),
  }),
});

// ── Cập nhật thông tin task (manager) ────────────────────────
const updateTaskSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    priority: TaskPriority.optional(),
    sourceMessage: z.string().max(2000).optional().nullable(),
    projectId: z.string().min(1).max(30).optional().nullable(),
    estimatedHours: z.number().min(0.5).max(999.9).optional().nullable(),
  }),
});

// ── Gán / thay đổi người thực hiện ───────────────────────────
const assignTaskSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    // null = bỏ gán
    assignedToUserId: z.string().min(1).max(30).nullable(),
  }),
});

// ── Cập nhật trạng thái (mọi người có access) ────────────────
const updateStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: TaskStatus,
    // Nhân viên ghi giờ thực tế khi cập nhật
    actualHours: z.number().min(0).max(999.9).optional().nullable(),
  }),
});

// ── Hoàn thành task ──────────────────────────────────────────
const completeTaskSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    actualHours: z.number().min(0).max(999.9).optional().nullable(),
    completionNote: z.string().max(1000).optional().nullable(),
  }),
});

// ── Query params cho danh sách ───────────────────────────────
const listTasksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: TaskStatus.optional(),
    priority: TaskPriority.optional(),
    projectId: z.string().optional(),
    assignedToUserId: z.string().optional(),
    deadlineFilter: z
      .enum(["overdue", "today", "this_week", "upcoming"])
      .optional(),
    search: z.string().max(100).optional(),
    // ── THÊM 2 DÒNG NÀY ──
    deadlineFrom: z
      .string()
      .datetime({ message: "deadlineFrom không hợp lệ (ISO 8601)" })
      .optional(),
    deadlineTo: z
      .string()
      .datetime({ message: "deadlineTo không hợp lệ (ISO 8601)" })
      .optional(),
  }),
});

// ── Thêm bình luận ───────────────────────────────────────────
const createCommentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    content: z
      .string({ required_error: "Nội dung bình luận là bắt buộc" })
      .min(1, "Bình luận không được để trống")
      .max(5000, "Bình luận tối đa 5000 ký tự"),
  }),
});

// ── Sửa bình luận ───────────────────────────────────────────
const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    commentId: z.string().min(1),
  }),
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateStatusSchema,
  completeTaskSchema,
  listTasksSchema,
  createCommentSchema,
  updateCommentSchema,
};
