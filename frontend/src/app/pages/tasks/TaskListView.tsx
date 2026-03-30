import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import { taskStatusLabels, taskPriorityLabels } from "../../data/mockData";
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
  const { updateTaskStatus, deleteTask, updateTask, addAuditLog, assignTask, cancelTask } =
    useTaskData();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "none">(
    "status",
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
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

  const handleSelectGroup = (groupTasks: Task[], checked: boolean) => {
    const groupIds = groupTasks.map((t) => t.id);
    if (checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...groupIds.filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, taskId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    await updateTaskStatus(
      taskId,
      "DONE",
      undefined,
      "Marked complete from list view",
    );

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

  const handleCancelTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    await cancelTask(taskId);
    toast.success(`Đã hủy "${task?.title ?? taskId}"`);
  };

  const handleBulkChangeStatus = async (newStatus: TaskStatus) => {
    const eligible = selectedIds.filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && t.status !== "DONE" && t.status !== "CANCELLED";
    });
    if (eligible.length === 0) {
      toast.error("Không có công việc nào hợp lệ để đổi trạng thái");
      return;
    }
    await Promise.all(eligible.map((id) => updateTaskStatus(id, newStatus)));
    toast.success(`Đã đổi ${eligible.length} công việc sang ${taskStatusLabels[newStatus]}`);
    setSelectedIds([]);
  };

  const handleBulkCancel = async () => {
    const eligible = selectedIds.filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && t.status !== "DONE" && t.status !== "CANCELLED";
    });
    await Promise.all(eligible.map((id) => cancelTask(id)));
    toast.success(`Đã hủy ${eligible.length} công việc`);
    setSelectedIds([]);
    setBulkCancelDialogOpen(false);
  };

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map((id) => deleteTask(id)));
    toast.success(`Đã xóa ${selectedIds.length} công việc`);
    setSelectedIds([]);
    setBulkDeleteDialogOpen(false);
  };

  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTask = async () => {
    if (taskToDelete) {
      const task = tasks.find((t) => t.id === taskToDelete);
      await deleteTask(taskToDelete);
      toast.success(`Đã xóa "${task?.title ?? taskToDelete}"`);
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
    if (task.createdBy?.id === currentUser?.id) return true;
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
                        checked={
                          groupTasks.length > 0 &&
                          groupTasks.every((t) => selectedIds.includes(t.id))
                        }
                        onCheckedChange={(checked) =>
                          handleSelectGroup(groupTasks, !!checked)
                        }
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
                    const assignee = task.assignedTo;
                    const project = task.project;
                    const isOverdue = isDeadlineOverdue(task);
                    const isDueToday = isDeadlineToday(task);

                    return (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-pointer">
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
                        <TableCell onClick={() => onTaskClick(task.id)} className="cursor-pointer">
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
                                <AvatarImage
                                  src={assignee.avatarUrl ?? undefined}
                                />
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
                            <Badge variant="outline">{project.name}</Badge>
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
                            {task.estimatedHours
                              ? `${task.estimatedHours}h`
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-pointer">
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
                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-pointer">
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
                                    onClick={() => onTaskClick(task.id)} className="cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTaskIdsToAssign([task.id]);
                                      setAssignTaskDialogOpen(true);
                                    }} className="cursor-pointer"
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Giao việc
                                  </DropdownMenuItem>
                                </>
                              )}
                              {task.status !== "DONE" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkComplete(task.id)} className="cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Hoàn thành
                                </DropdownMenuItem>
                              )}
                              {canEditTask(task) &&
                                task.status !== "CANCELLED" && (
                                  <DropdownMenuItem
                                    onClick={() => handleCancelTask(task.id)} className="cursor-pointer"
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
                                    className="text-destructive cursor-pointer"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Đổi trạng thái
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["TODO", "IN_PROGRESS", "IN_REVIEW"] as TaskStatus[]).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleBulkChangeStatus(s)} className="cursor-pointer">
                    {taskStatusLabels[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkCancelDialogOpen(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            {can("ADMIN", "MANAGER") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
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

      {/* Single delete confirmation dialog */}
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
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk cancel confirmation dialog */}
      <AlertDialog open={bulkCancelDialogOpen} onOpenChange={setBulkCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy {selectedIds.length} công việc đã chọn?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCancel} className="cursor-pointer">
              Hủy công việc
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {selectedIds.length} công việc đã chọn? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              Xóa tất cả
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
