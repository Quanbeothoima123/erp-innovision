import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import {
  getUserById,
  getProjectById,
  taskStatusLabels,
  taskPriorityLabels,
} from "../../data/mockData";
import type { Task, TaskStatus, TaskPriority } from "../../data/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  MessageSquare,
  MoreVertical,
  Edit,
  UserPlus,
  CheckCircle,
  Ban,
  Trash2,
  Circle,
} from "lucide-react";
import { format, parseISO, isBefore, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AssignTaskDialog } from "./AssignTaskDialog";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const { currentUser, can } = useAuth();
  const { updateTaskStatus, deleteTask, updateTask, addAuditLog } =
    useTaskData();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "none">(
    "status",
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [taskIdsToAssign, setTaskIdsToAssign] = useState<string[]>([]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return { "Tất cả": tasks };
    }

    const groups: Record<string, Task[]> = {};

    if (groupBy === "status") {
      const statusOrder: TaskStatus[] = [
        "TODO",
        "IN_PROGRESS",
        "IN_REVIEW",
        "DONE",
        "CANCELLED",
      ];
      statusOrder.forEach((status) => {
        const tasksInStatus = tasks.filter((t) => t.status === status);
        if (tasksInStatus.length > 0) {
          groups[taskStatusLabels[status]] = tasksInStatus;
        }
      });
    } else if (groupBy === "priority") {
      const priorityOrder: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
      priorityOrder.forEach((priority) => {
        const tasksInPriority = tasks.filter((t) => t.priority === priority);
        if (tasksInPriority.length > 0) {
          groups[taskPriorityLabels[priority]] = tasksInPriority;
        }
      });
    }

    return groups;
  }, [tasks, groupBy]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(tasks.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, taskId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleMarkComplete = (taskId: string) => {
    updateTaskStatus(
      taskId,
      "DONE",
      undefined,
      "Marked complete from list view",
    );
    toast.success("Đã đánh dấu hoàn thành");

    if (currentUser) {
      addAuditLog({
        id: `audit-${Date.now()}`,
        actorUserId: currentUser.id,
        entityType: "TASK",
        actionType: "UPDATE_STATUS",
        description: `Đã đánh dấu công việc #${taskId} là hoàn thành`,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleCancelTask = (taskId: string) => {
    updateTaskStatus(taskId, "CANCELLED");
    toast.success("Đã hủy công việc");

    if (currentUser) {
      addAuditLog({
        id: `audit-${Date.now()}`,
        actorUserId: currentUser.id,
        entityType: "TASK",
        actionType: "CANCEL",
        description: `Đã hủy công việc #${taskId}`,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTask = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      toast.success("Đã xóa công việc");

      if (currentUser) {
        addAuditLog({
          id: `audit-${Date.now()}`,
          actorUserId: currentUser.id,
          entityType: "TASK",
          actionType: "DELETE",
          description: `Đã xóa công việc #${taskToDelete}`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        });
      }

      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

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

  const getStatusVariant = (
    status: TaskStatus,
  ): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "TODO":
        return "secondary";
      case "IN_PROGRESS":
        return "default";
      case "IN_REVIEW":
        return "outline";
      case "DONE":
        return "secondary";
      case "CANCELLED":
        return "destructive";
    }
  };

  const isDeadlineOverdue = (task: Task) => {
    if (!task.deadline || task.status === "DONE" || task.status === "CANCELLED")
      return false;
    return isBefore(parseISO(task.deadline), new Date());
  };

  const isDeadlineToday = (task: Task) => {
    if (!task.deadline) return false;
    return isToday(parseISO(task.deadline));
  };

  const canEditTask = (task: Task) => {
    if (can("ADMIN")) return true;
    if (can("MANAGER")) return true;
    if (task.createdByUserId === currentUser?.id) return true;
    return false;
  };

  const canDeleteTask = (task: Task) => {
    return can("ADMIN", "MANAGER");
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Circle className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Không tìm thấy công việc</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Thử điều chỉnh bộ lọc của bạn
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
        <Collapsible key={groupName} defaultOpen={true} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                <h3 className="font-medium">{groupName}</h3>
                <Badge variant="secondary">{groupTasks.length}</Badge>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={groupTasks.every((t) =>
                          selectedIds.includes(t.id),
                        )}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">Ưu tiên</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Dự án</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="w-24">Dự kiến (h)</TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupTasks.map((task) => {
                    const assignee = task.assignedToUserId
                      ? getUserById(task.assignedToUserId)
                      : null;
                    const project = task.projectId
                      ? getProjectById(task.projectId)
                      : null;
                    const isOverdue = isDeadlineOverdue(task);
                    const isDueToday = isDeadlineToday(task);

                    return (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(task.id)}
                            onCheckedChange={(checked) =>
                              handleSelectTask(task.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`}
                            title={taskPriorityLabels[task.priority]}
                          />
                        </TableCell>
                        <TableCell onClick={() => onTaskClick(task.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.title}</span>
                            {task.commentCount > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                  {task.commentCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(task.status)}>
                            {taskStatusLabels[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignee.avatarUrl} />
                                <AvatarFallback>
                                  {assignee.fullName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {assignee.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Chưa giao
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <Badge variant="outline">
                              {project.projectName}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.deadline ? (
                            <span
                              className={`text-sm ${isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-orange-600 font-medium" : ""}`}
                            >
                              {format(parseISO(task.deadline), "dd/MM/yyyy", {
                                locale: vi,
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {task.estimatedHours}h
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {task.commentCount > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onTaskClick(task.id)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditTask(task) && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => onTaskClick(task.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTaskIdsToAssign([task.id]);
                                      setAssignTaskDialogOpen(true);
                                    }}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Giao việc
                                  </DropdownMenuItem>
                                </>
                              )}
                              {task.status !== "DONE" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkComplete(task.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Hoàn thành
                                </DropdownMenuItem>
                              )}
                              {canEditTask(task) &&
                                task.status !== "CANCELLED" && (
                                  <DropdownMenuItem
                                    onClick={() => handleCancelTask(task.id)}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Hủy công việc
                                  </DropdownMenuItem>
                                )}
                              {canDeleteTask(task) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => confirmDeleteTask(task.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Xóa
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Bulk actions toolbar (shown when tasks selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <span className="font-medium">
            {selectedIds.length} công việc được chọn
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTaskIdsToAssign(selectedIds);
                setAssignTaskDialogOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Giao việc
            </Button>
            <Button variant="secondary" size="sm">
              Đổi trạng thái
            </Button>
            <Button variant="secondary" size="sm">
              <Ban className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            {can("ADMIN", "MANAGER") && (
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            Hủy chọn
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign task dialog */}
      <AssignTaskDialog
        open={assignTaskDialogOpen}
        onClose={() => setAssignTaskDialogOpen(false)}
        taskIds={taskIdsToAssign}
      />
    </div>
  );
}
