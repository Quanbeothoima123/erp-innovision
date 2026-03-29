import React, { createContext, useContext, useState, useCallback } from "react";
import {
  tasks as initialTasks,
  taskComments as initialComments,
  auditLogs as initialAuditLogs,
} from "../data/mockData";
import type {
  Task,
  TaskComment,
  TaskStatus,
  TaskPriority,
  AuditLog,
} from "../data/mockData";

interface TaskContextType {
  // Data
  allTasks: Task[];
  allTaskComments: TaskComment[];
  // Task CRUD
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (
    id: string,
    status: TaskStatus,
    actualHours?: number,
    note?: string,
  ) => void;
  // Comment CRUD
  addComment: (comment: TaskComment) => void;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;
  // Audit
  addAuditLog: (log: AuditLog) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskData = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskData must be inside TaskProvider");
  return ctx;
};

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [allTasks, setAllTasks] = useState<Task[]>(initialTasks);
  const [allTaskComments, setAllTaskComments] =
    useState<TaskComment[]>(initialComments);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  const addAuditLog = useCallback((log: AuditLog) => {
    setAuditLogs((prev) => [log, ...prev]);
  }, []);

  const addTask = useCallback((task: Task) => {
    setAllTasks((prev) => [task, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    setAllTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          // Update commentCount nếu có thay đổi
          if (data.commentCount !== undefined) {
            updated.commentCount = data.commentCount;
          }
          return updated;
        }
        return t;
      }),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
    // Xóa tất cả comments của task
    setAllTaskComments((prev) => prev.filter((c) => c.taskId !== id));
  }, []);

  const updateTaskStatus = useCallback(
    (id: string, status: TaskStatus, actualHours?: number, note?: string) => {
      const now = new Date().toISOString();
      setAllTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated: Task = {
              ...t,
              status,
              updatedAt: now,
            };
            if (status === "DONE") {
              updated.completedAt = now;
              if (actualHours !== undefined) {
                updated.actualHours = actualHours;
              }
            }
            return updated;
          }
          return t;
        }),
      );
    },
    [],
  );

  const addComment = useCallback((comment: TaskComment) => {
    setAllTaskComments((prev) => [comment, ...prev]);
    // Tăng commentCount của task
    setAllTasks((prev) =>
      prev.map((t) =>
        t.id === comment.taskId
          ? {
              ...t,
              commentCount: t.commentCount + 1,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );
  }, []);

  const updateComment = useCallback((id: string, content: string) => {
    setAllTaskComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              content,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
  }, []);

  const deleteComment = useCallback(
    (id: string) => {
      const comment = allTaskComments.find((c) => c.id === id);
      if (comment) {
        setAllTaskComments((prev) => prev.filter((c) => c.id !== id));
        // Giảm commentCount của task
        setAllTasks((prev) =>
          prev.map((t) =>
            t.id === comment.taskId
              ? {
                  ...t,
                  commentCount: Math.max(0, t.commentCount - 1),
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );
      }
    },
    [allTaskComments],
  );

  return (
    <TaskContext.Provider
      value={{
        allTasks,
        allTaskComments,
        addTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
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
