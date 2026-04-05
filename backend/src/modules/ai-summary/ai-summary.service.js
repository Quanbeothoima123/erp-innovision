"use strict";

const { prisma } = require("../../config/db");
const gemini = require("../../common/services/gemini.service");
const repo = require("./ai-summary.repository");
const { AppError } = require("../../common/errors/AppError");

// ─── Danh sách câu hỏi hợp lệ ────────────────────────────────

const VALID_QUESTION_TYPES = [
  "TASKS_TODAY",
  "TASKS_THIS_WEEK",
  "TASKS_THIS_MONTH",
  "TASKS_COMPLETED",
  "TASKS_NEAR_DEADLINE",
  "TASKS_URGENT",
  "TASKS_OVERDUE",
  "SALARY_CURRENT_MONTH",
];

// ─── Data fetchers — lấy đúng data theo questionType ─────────

async function _fetchDataForQuestion(questionType, userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Giới hạn ngày đầu tuần (Thứ 2)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Giới hạn đầu/cuối tháng
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // 7 ngày tới
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);
  sevenDaysLater.setHours(23, 59, 59, 999);

  const baseWhere = {
    assignedToUserId: userId,
    isActive: true,
  };

  const taskSelect = {
    id: true,
    title: true,
    status: true,
    priority: true,
    deadline: true,
    description: true,
    completedAt: true,
    project: { select: { projectName: true } },
    createdBy: { select: { fullName: true } },
  };

  switch (questionType) {
    case "TASKS_TODAY":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            deadline: { gte: today, lt: new Date(today.getTime() + 86400000) },
          },
          select: taskSelect,
          orderBy: { priority: "desc" },
        }),
      };

    case "TASKS_THIS_WEEK":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            deadline: { gte: startOfWeek, lte: endOfWeek },
          },
          select: taskSelect,
          orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        }),
      };

    case "TASKS_THIS_MONTH":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            deadline: { gte: startOfMonth, lte: endOfMonth },
          },
          select: taskSelect,
          orderBy: [{ status: "asc" }, { deadline: "asc" }],
        }),
      };

    case "TASKS_COMPLETED":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            status: "DONE",
            completedAt: { gte: startOfMonth },
          },
          select: taskSelect,
          orderBy: { completedAt: "desc" },
          take: 20,
        }),
      };

    case "TASKS_NEAR_DEADLINE":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            deadline: { gte: today, lte: sevenDaysLater },
            status: { notIn: ["DONE", "CANCELLED"] },
          },
          select: taskSelect,
          orderBy: { deadline: "asc" },
        }),
      };

    case "TASKS_URGENT":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            status: { notIn: ["DONE", "CANCELLED"] },
            OR: [
              { priority: "URGENT" },
              { priority: "HIGH", deadline: { lte: sevenDaysLater } },
            ],
          },
          select: taskSelect,
          orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        }),
      };

    case "TASKS_OVERDUE":
      return {
        type: "tasks",
        data: await prisma.task.findMany({
          where: {
            ...baseWhere,
            deadline: { lt: today },
            status: { notIn: ["DONE", "CANCELLED"] },
          },
          select: taskSelect,
          orderBy: { deadline: "asc" },
        }),
      };

    case "SALARY_CURRENT_MONTH": {
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const record = await prisma.payrollRecord.findFirst({
        where: {
          userId,
          payrollPeriod: { month, year },
        },
        include: {
          payrollPeriod: { select: { month: true, year: true, status: true } },
          items: {
            select: { itemName: true, itemType: true, amount: true },
            orderBy: { itemType: "asc" },
          },
        },
      });
      return { type: "salary", data: record };
    }

    default:
      throw AppError.badRequest(`questionType không hợp lệ: ${questionType}`);
  }
}

// ─── Prompt builders ──────────────────────────────────────────

const SYSTEM_PROMPT = `Bạn là trợ lý AI nội bộ của hệ thống ERP InnoVision.
Nhiệm vụ: Tóm tắt dữ liệu công việc/lương cho nhân viên một cách ngắn gọn, rõ ràng, thân thiện.
Ngôn ngữ: Tiếng Việt.
Quy tắc:
- Chỉ dùng dữ liệu được cung cấp, KHÔNG bịa đặt thông tin.
- Nếu không có dữ liệu, nói rõ "Không có dữ liệu" và giải thích ngắn.
- Dùng emoji phù hợp (✅ ⚠️ 🔴 📅 💰...) để dễ đọc.
- Phân nhóm theo trạng thái/độ ưu tiên nếu có nhiều mục.
- Độ dài tối đa: 400 từ.`;

function _buildUserPrompt(questionType, fetchedData, userName) {
  const { type, data } = fetchedData;
  const dateStr = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const questionLabels = {
    TASKS_TODAY: "Tóm tắt công việc hôm nay",
    TASKS_THIS_WEEK: "Tóm tắt công việc tuần này",
    TASKS_THIS_MONTH: "Tóm tắt công việc tháng này",
    TASKS_COMPLETED: "Tóm tắt công việc đã hoàn thành trong tháng",
    TASKS_NEAR_DEADLINE: "Các việc sắp đến hạn (7 ngày tới)",
    TASKS_URGENT: "Các việc cần làm gấp",
    TASKS_OVERDUE: "Các việc đã quá hạn",
    SALARY_CURRENT_MONTH: "Tóm tắt lương tháng này",
  };

  const header = `Ngày: ${dateStr}\nNhân viên: ${userName}\nYêu cầu: ${questionLabels[questionType]}\n\n`;

  if (type === "tasks") {
    if (!data || data.length === 0) {
      return (
        header + "DỮ LIỆU: Không có công việc nào phù hợp với tiêu chí này."
      );
    }
    const taskLines = data
      .map((t, i) => {
        const deadline = t.deadline
          ? new Date(t.deadline).toLocaleDateString("vi-VN")
          : "Không có deadline";
        const project = t.project?.projectName
          ? `[${t.project.projectName}]`
          : "";
        const completed = t.completedAt
          ? ` (Hoàn thành: ${new Date(t.completedAt).toLocaleDateString("vi-VN")})`
          : "";
        return `${i + 1}. ${t.title} ${project}\n   Trạng thái: ${t.status} | Ưu tiên: ${t.priority} | Deadline: ${deadline}${completed}`;
      })
      .join("\n");
    return header + `DỮ LIỆU (${data.length} công việc):\n${taskLines}`;
  }

  if (type === "salary") {
    if (!data) {
      return (
        header +
        "DỮ LIỆU: Chưa có bảng lương cho tháng này hoặc chưa được phê duyệt."
      );
    }
    const period = data.payrollPeriod;
    const items = (data.items || [])
      .map(
        (it) =>
          `   - ${it.itemName} (${it.itemType}): ${Number(it.amount).toLocaleString("vi-VN")} đ`,
      )
      .join("\n");
    return (
      header +
      `DỮ LIỆU LƯƠNG THÁNG ${period.month}/${period.year}:
Trạng thái bảng lương: ${period.status}
Lương cơ bản: ${Number(data.baseSalary).toLocaleString("vi-VN")} đ
Tổng phụ cấp: ${Number(data.totalAllowances).toLocaleString("vi-VN")} đ
Tổng thưởng: ${Number(data.totalBonus).toLocaleString("vi-VN")} đ
OT: ${Number(data.totalOvertimePay).toLocaleString("vi-VN")} đ
Tổng khấu trừ: ${Number(data.totalDeductions).toLocaleString("vi-VN")} đ
Lương thực nhận: ${Number(data.netSalary).toLocaleString("vi-VN")} đ
Chi tiết:\n${items}`
    );
  }

  return header + "DỮ LIỆU: Không xác định.";
}

// ─── Main function ────────────────────────────────────────────

/**
 * Hỏi AI với cache thông minh.
 * @param {string} questionType
 * @param {object} currentUser  — { id, fullName }
 */
async function askAI(questionType, currentUser) {
  // Validate
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    throw AppError.badRequest("Câu hỏi không hợp lệ.");
  }

  // 1. Lấy data từ DB
  const fetchedData = await _fetchDataForQuestion(questionType, currentUser.id);

  // 2. Hash data để kiểm tra thay đổi
  const dataHash = repo.hashData(fetchedData.data);

  // 3. Kiểm tra cache
  const cached = await repo.findValidCache(
    currentUser.id,
    questionType,
    dataHash,
  );
  if (cached) {
    return {
      answer: cached.answer,
      fromCache: true,
      cachedAt: cached.createdAt,
      expiresAt: cached.expiresAt,
    };
  }

  // 4. Gọi Gemini
  if (!process.env.GEMINI_API_KEY) {
    throw AppError.badRequest(
      "AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
    );
  }

  const userPrompt = _buildUserPrompt(
    questionType,
    fetchedData,
    currentUser.fullName,
  );
  const { text, tokensUsed } = await gemini.generateText(
    SYSTEM_PROMPT,
    userPrompt,
  );

  // 5. Lưu cache
  await repo.upsertCache(
    currentUser.id,
    questionType,
    dataHash,
    text,
    tokensUsed,
  );

  return {
    answer: text,
    fromCache: false,
    tokensUsed,
  };
}

/** Danh sách câu hỏi để frontend hiển thị */
function getQuestionList() {
  return [
    {
      type: "TASKS_TODAY",
      label: "Công việc hôm nay",
      emoji: "📅",
      category: "task",
    },
    {
      type: "TASKS_THIS_WEEK",
      label: "Công việc tuần này",
      emoji: "📆",
      category: "task",
    },
    {
      type: "TASKS_THIS_MONTH",
      label: "Công việc tháng này",
      emoji: "🗓️",
      category: "task",
    },
    {
      type: "TASKS_COMPLETED",
      label: "Việc đã hoàn thành (tháng)",
      emoji: "✅",
      category: "task",
    },
    {
      type: "TASKS_NEAR_DEADLINE",
      label: "Việc sắp đến hạn (7 ngày)",
      emoji: "⏰",
      category: "task",
    },
    {
      type: "TASKS_URGENT",
      label: "Việc cần làm gấp",
      emoji: "🔴",
      category: "task",
    },
    {
      type: "TASKS_OVERDUE",
      label: "Việc đã quá hạn",
      emoji: "⚠️",
      category: "task",
    },
    {
      type: "SALARY_CURRENT_MONTH",
      label: "Tóm tắt lương tháng này",
      emoji: "💰",
      category: "salary",
    },
  ];
}

module.exports = { askAI, getQuestionList, VALID_QUESTION_TYPES };
