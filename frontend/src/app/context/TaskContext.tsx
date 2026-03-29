import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  Task,
  TaskComment,
  TaskStatus,
  TaskPriority,
  AuditLog,
} from "../data/mockData";
import { auditLogs as initialAuditLogs } from "../data/mockData";
import * as tasksService from "../../lib/services/tasks.service";
import { toast } from "sonner";

interface TaskContextType {
  // Data
  allTasks: Task[];
  allTaskComments: TaskComment[];
  loading: boolean;
  error: string | null;
  // Data fetching
  fetchTasks: () => Promise<void>;
  fetchMyTasks: () => Promise<void>;
  // Task CRUD
  addTask: (
    payload: Parameters<typeof tasksService.createTask>[0],
  ) => Promise<Task | null>;
  updateTask: (
    id: string,
    data: Partial<Parameters<typeof tasksService.updateTask>[1]>,
  ) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (
    id: string,
    status: TaskStatus,
    actualHours?: number,
    note?: string,
  ) => Promise<void>;
  assignTask: (id: string, assignedToUserId: string | null) => Promise<void>;
  completeTask: (
    id: string,
    actualHours?: number,
    completionNote?: string,
  ) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  // Comment CRUD
  addComment: (taskId: string, content: string) => Promise<void>;
  updateComment: (
    taskId: string,
    commentId: string,
    content: string,
  ) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  fetchComments: (taskId: string) => Promise<void>;
  // Audit
  addAuditLog: (log: AuditLog) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskData = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskData must be inside TaskProvider");
  return ctx;
};

/** Chuyển ApiTask → Task (front-end interface) */
function mapApiTask(t: tasksService.ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.deadline,
    priority: t.priority,
    status: t.status,
    sourceMessage: t.sourceMessage,
    project: t.project,
    assignedTo: t.assignedTo,
    createdBy: t.createdBy,
    isActive: t.isActive,
    estimatedHours: t.estimatedHours,
    actualHours: t.actualHours,
    completedAt: t.completedAt,
    commentCount: t.commentCount ?? 0,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Chuyển ApiTaskComment → TaskComment */
function mapApiComment(
  c: tasksService.ApiTaskComment,
  taskId: string,
): TaskComment {
  return {
    id: c.id,
    taskId,
    content: c.content,
    isEdited: c.isEdited,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.user,
  };
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allTaskComments, setAllTaskComments] = useState<TaskComment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksService.listTasks({ limit: 100 });
      setAllTasks(res.items.map(mapApiTask));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi tải danh sách công việc";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksService.getMyTasks({ limit: 100 });
      setAllTasks(res.items.map(mapApiTask));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Lỗi tải công việc của tôi";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async (taskId: string) => {
    try {
      const comments = await tasksService.getComments(taskId);
      const mapped = comments.map((c) => mapApiComment(c, taskId));
      setAllTaskComments((prev) => {
        const others = prev.filter((c) => c.taskId !== taskId);
        return [...others, ...mapped];
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi tải bình luận";
      toast.error(msg);
    }
  }, []);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Audit ────────────────────────────────────────────────

  const addAuditLog = useCallback((log: AuditLog) => {
    setAuditLogs((prev) => [log, ...prev]);
  }, []);

  // ─── Task CRUD ────────────────────────────────────────────

  const addTask = useCallback(
    async (
      payload: Parameters<typeof tasksService.createTask>[0],
    ): Promise<Task | null> => {
      try {
        const created = await tasksService.createTask(payload);
        const mapped = mapApiTask(created);
        setAllTasks((prev) => [mapped, ...prev]);
        toast.success("Đã tạo công việc mới");
        return mapped;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi tạo công việc";
        toast.error(msg);
        return null;
      }
    },
    [],
  );

  const updateTask = useCallback(
    async (
      id: string,
      data: Partial<Parameters<typeof tasksService.updateTask>[1]>,
    ) => {
      try {
        const updated = await tasksService.updateTask(id, data);
        const mapped = mapApiTask(updated);
        setAllTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)));
        toast.success("Đã cập nhật công việc");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Lỗi cập nhật công việc";
        toast.error(msg);
      }
    },
    [],
  );

  const deleteTask = useCallback(async (id: string) => {
    try {
      await tasksService.deleteTask(id);
      setAllTasks((prev) => prev.filter((t) => t.id !== id));
      setAllTaskComments((prev) => prev.filter((c) => c.taskId !== id));
      toast.success("Đã xóa công việc");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xóa công việc";
      toast.error(msg);
    }
  }, []);

  const updateTaskStatus = useCallback(
    async (
      id: string,
      status: TaskStatus,
      actualHours?: number,
      _note?: string,
    ) => {
      try {
        const updated = await tasksService.updateTaskStatus(id, {
          status,
          actualHours: actualHours ?? null,
        });
        const mapped = mapApiTask(updated);
        setAllTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)));
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Lỗi cập nhật trạng thái";
        toast.error(msg);
      }
    },
    [],
  );

  const assignTask = useCallback(
    async (id: string, assignedToUserId: string | null) => {
      try {
        const updated = await tasksService.assignTask(id, { assignedToUserId });
        const mapped = mapApiTask(updated);
        setAllTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)));
        toast.success("Đã giao công việc");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi giao công việc";
        toast.error(msg);
      }
    },
    [],
  );

  const completeTask = useCallback(
    async (id: string, actualHours?: number, completionNote?: string) => {
      try {
        const updated = await tasksService.completeTask(id, {
          actualHours: actualHours ?? null,
          completionNote: completionNote ?? null,
        });
        const mapped = mapApiTask(updated);
        setAllTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)));
        toast.success("Đã đánh dấu hoàn thành");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Lỗi hoàn thành công việc";
        toast.error(msg);
      }
    },
    [],
  );

  const cancelTask = useCallback(async (id: string) => {
    try {
      const updated = await tasksService.cancelTask(id);
      const mapped = mapApiTask(updated);
      setAllTasks((prev) => prev.map((t) => (t.id === id ? mapped : t)));
      toast.success("Đã hủy công việc");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi hủy công việc";
      toast.error(msg);
    }
  }, []);

  // ─── Comments ────────────────────────────────────────────

  const addComment = useCallback(async (taskId: string, content: string) => {
    try {
      const created = await tasksService.addComment(taskId, { content });
      const mapped = mapApiComment(created, taskId);
      setAllTaskComments((prev) => [mapped, ...prev]);
      setAllTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                commentCount: t.commentCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi thêm bình luận";
      toast.error(msg);
    }
  }, []);

  const updateComment = useCallback(
    async (taskId: string, commentId: string, content: string) => {
      try {
        const updated = await tasksService.updateComment(taskId, commentId, {
          content,
        });
        const mapped = mapApiComment(updated, taskId);
        setAllTaskComments((prev) =>
          prev.map((c) => (c.id === commentId ? mapped : c)),
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Lỗi cập nhật bình luận";
        toast.error(msg);
      }
    },
    [],
  );

  const deleteComment = useCallback(
    async (taskId: string, commentId: string) => {
      try {
        await tasksService.deleteComment(taskId, commentId);
        setAllTaskComments((prev) => prev.filter((c) => c.id !== commentId));
        setAllTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  commentCount: Math.max(0, t.commentCount - 1),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi xóa bình luận";
        toast.error(msg);
      }
    },
    [],
  );

  return (
    <TaskContext.Provider
      value={{
        allTasks,
        allTaskComments,
        loading,
        error,
        fetchTasks,
        fetchMyTasks,
        fetchComments,
        addTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
        assignTask,
        completeTask,
        cancelTask,
        addComment,
        updateComment,
        deleteComment,
        addAuditLog,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
