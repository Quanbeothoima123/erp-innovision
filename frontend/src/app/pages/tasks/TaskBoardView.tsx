import { useState, useMemo } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import { taskStatusLabels, taskPriorityLabels } from "../../data/mockData";
import type { Task, TaskStatus, TaskPriority } from "../../data/mockData";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { MessageSquare, Plus, Lock } from "lucide-react";
import { format, parseISO, isBefore, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface TaskBoardViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  canQuickCreate: boolean;
  isRestricted: boolean;
}

const TASK_CARD_TYPE = "TASK_CARD";

function TaskCard({ task, onClick }: TaskCardProps) {
  const { currentUser, can } = useAuth();

  const [{ isDragging }, drag] = useDrag({
    type: TASK_CARD_TYPE,
    item: { taskId: task.id, currentStatus: task.status },
    canDrag: () => {
      // Employee can only drag their own tasks
      if (!can("ADMIN", "MANAGER")) {
        return task.assignedTo?.id === currentUser?.id;
      }
      return true;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const assignee = task.assignedTo;
  const project = task.project;

  const isOverdue =
    task.deadline &&
    task.status !== "DONE" &&
    task.status !== "CANCELLED" &&
    isBefore(parseISO(task.deadline), new Date());
  const isDueToday = task.deadline && isToday(parseISO(task.deadline));

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500";
      case "HIGH":
        return "bg-orange-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "LOW":
        return "bg-green-500";
    }
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`bg-card border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Priority indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}
        />
        <span className="text-xs text-muted-foreground">
          {taskPriorityLabels[task.priority]}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>

      {/* Project tag */}
      {project && (
        <Badge variant="outline" className="mb-2 text-xs">
          {project.name}
        </Badge>
      )}

      {/* Footer: Assignee, Deadline, Comments */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          {assignee ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={assignee.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[0.625rem]">
                {assignee.fullName[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[0.625rem] text-muted-foreground">?</span>
            </div>
          )}

          {task.commentCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span className="text-xs">{task.commentCount}</span>
            </div>
          )}
        </div>

        {task.deadline && (
          <span
            className={`text-xs ${isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-orange-600 font-medium" : "text-muted-foreground"}`}
          >
            {format(parseISO(task.deadline), "dd/MM", { locale: vi })}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  onTaskClick,
  onDrop,
  canQuickCreate,
  isRestricted,
}: ColumnProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: TASK_CARD_TYPE,
    drop: (item: { taskId: string; currentStatus: TaskStatus }) => {
      if (item.currentStatus !== status) {
        onDrop(item.taskId, status);
      }
    },
    canDrop: (item) => {
      // Employee restrictions
      if (isRestricted) {
        const fromStatus = item.currentStatus;
        // Employee can only move TODO -> IN_PROGRESS -> IN_REVIEW
        if (status === "DONE" || status === "CANCELLED") return false;
        if (fromStatus === "TODO" && status !== "IN_PROGRESS") return false;
        if (
          fromStatus === "IN_PROGRESS" &&
          status !== "TODO" &&
          status !== "IN_REVIEW"
        )
          return false;
        if (fromStatus === "IN_REVIEW" && status !== "IN_PROGRESS")
          return false;
      }
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const columnTasks = tasks.filter((t) => t.status === status);

  const getStatusColor = (s: TaskStatus) => {
    switch (s) {
      case "TODO":
        return "bg-slate-100 dark:bg-slate-800";
      case "IN_PROGRESS":
        return "bg-blue-50 dark:bg-blue-950";
      case "IN_REVIEW":
        return "bg-purple-50 dark:bg-purple-950";
      case "DONE":
        return "bg-green-50 dark:bg-green-950";
      case "CANCELLED":
        return "bg-red-50 dark:bg-red-950";
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div
        className={`rounded-lg p-3 h-full flex flex-col ${getStatusColor(status)}`}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{taskStatusLabels[status]}</h3>
            <Badge variant="secondary">{columnTasks.length}</Badge>
            {isRestricted && (status === "DONE" || status === "CANCELLED") && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          {canQuickCreate && !isRestricted && (
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Tasks */}
        <div
          ref={drop}
          className={`flex-1 overflow-y-auto space-y-2 min-h-[200px] ${
            isOver && canDrop ? "bg-primary/10 rounded-lg" : ""
          } ${!canDrop && isOver ? "bg-destructive/10 rounded-lg" : ""}`}
        >
          {columnTasks.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
              <p className="text-sm">Không có công việc</p>
              {canQuickCreate && !isRestricted && (
                <Button variant="ghost" size="sm" className="mt-2">
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm công việc
                </Button>
              )}
            </div>
          ) : (
            columnTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)} className="cursor-pointer"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskBoardView({ tasks, onTaskClick }: TaskBoardViewProps) {
  const { currentUser, can } = useAuth();
  const { updateTaskStatus, addAuditLog } = useTaskData();

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [actualHours, setActualHours] = useState("");
  const [completionNote, setCompletionNote] = useState("");

  const statuses: TaskStatus[] = [
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
    "CANCELLED",
  ];

  const canQuickCreate = can("ADMIN", "MANAGER");
  const isEmployee = !can("ADMIN", "MANAGER");

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    const oldStatus = task?.status;

    // If moving to DONE, show confirmation dialog
    if (newStatus === "DONE") {
      setTaskToComplete(taskId);
      setCompleteDialogOpen(true);
      return;
    }

    // Otherwise, update immediately
    await updateTaskStatus(taskId, newStatus);

    const taskTitle = task?.title ?? taskId;
    const fromLabel = oldStatus ? taskStatusLabels[oldStatus] : "?";
    const toLabel = taskStatusLabels[newStatus];
    toast.success(`"${taskTitle}" đã chuyển từ ${fromLabel} sang ${toLabel}`);

    if (currentUser) {
      addAuditLog({
        id: `audit-${Date.now()}`,
        actorUserId: currentUser.id,
        entityType: "TASK",
        actionType: "UPDATE_STATUS",
        description: `Đã chuyển công việc #${taskId} sang ${taskStatusLabels[newStatus]}`,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleConfirmComplete = async () => {
    if (taskToComplete) {
      const hours = actualHours ? parseFloat(actualHours) : undefined;
      await updateTaskStatus(taskToComplete, "DONE", hours, completionNote);

      if (currentUser) {
        addAuditLog({
          id: `audit-${Date.now()}`,
          actorUserId: currentUser.id,
          entityType: "TASK",
          actionType: "COMPLETE",
          description: `Đã hoàn thành công việc #${taskToComplete}${hours ? ` (${hours}h)` : ""}`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        });
      }

      setCompleteDialogOpen(false);
      setTaskToComplete(null);
      setActualHours("");
      setCompletionNote("");
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 h-full overflow-x-auto">
        <div className="flex gap-4 h-full">
          {statuses.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks}
              onTaskClick={onTaskClick}
              onDrop={handleDrop}
              canQuickCreate={canQuickCreate}
              isRestricted={isEmployee}
            />
          ))}
        </div>
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành công việc</DialogTitle>
            <DialogDescription>
              Nhập số giờ thực tế đã làm và ghi chú (nếu có)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actual-hours">Số giờ thực tế *</Label>
              <Input
                id="actual-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="VD: 8"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion-note">Ghi chú hoàn thành</Label>
              <Textarea
                id="completion-note"
                placeholder="Mô tả ngắn gọn về công việc đã hoàn thành..."
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmComplete}>Hoàn thành</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
