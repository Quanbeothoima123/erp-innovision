import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import { taskStatusLabels, taskPriorityLabels } from "../../data/mockData";
import type { Task, TaskStatus, TaskPriority } from "../../data/mockData";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
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
  Play,
  Send,
  CheckCircle,
  Ban,
  Edit,
  Calendar as CalendarIcon,
  Clock,
  User,
  FolderOpen,
  FileText,
  MessageSquare,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import * as usersService from "../../../lib/services/users.service";
import * as projectsService from "../../../lib/services/projects.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface TaskDetailPanelProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailPanel({
  taskId,
  open,
  onClose,
}: TaskDetailPanelProps) {
  const { currentUser, can } = useAuth();
  const {
    allTasks,
    allTaskComments,
    updateTask,
    updateTaskStatus,
    addComment,
    updateComment,
    deleteComment,
    fetchComments,
    addAuditLog,
  } = useTaskData();

  const task = useMemo(
    () => allTasks.find((t) => t.id === taskId),
    [allTasks, taskId],
  );
  const comments = useMemo(
    () =>
      allTaskComments
        .filter((c) => c.taskId === taskId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allTaskComments, taskId],
  );

  // Tải comments khi mở panel
  useEffect(() => {
    if (open && taskId) {
      fetchComments(taskId);
    }
  }, [open, taskId, fetchComments]);

  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteCommentDialog, setDeleteCommentDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editAssignee, setEditAssignee] = useState<string | undefined>(
    undefined,
  );
  const [editProject, setEditProject] = useState<string | undefined>(undefined);
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(undefined);
  const [editEstimatedHours, setEditEstimatedHours] = useState("");
  const [editActualHours, setEditActualHours] = useState("");

  // Danh sách users/projects cho dropdown khi edit
  const [userOptions, setUserOptions] = useState<
    { id: string; fullName: string }[]
  >([]);
  const [projectOptions, setProjectOptions] = useState<
    { id: string; projectName: string }[]
  >([]);

  useEffect(() => {
    if (open) {
      usersService
        .listUsers({ limit: 100, accountStatus: "ACTIVE" })
        .then((res) => {
          setUserOptions(
            res.items.map((u) => ({ id: u.id, fullName: u.fullName })),
          );
        })
        .catch(() => {});
      projectsService
        .listProjects({ limit: 100 })
        .then((res) => {
          setProjectOptions(
            res.items.map((p) => ({ id: p.id, projectName: p.projectName })),
          );
        })
        .catch(() => {});
    }
  }, [open]);

  if (!task) return null;

  const creator = task.createdBy;
  const assignee = task.assignedTo;
  const project = task.project;

  const canEdit =
    can("ADMIN", "MANAGER") || task.createdBy?.id === currentUser?.id;
  const canChangeStatus = canEdit || task.assignedTo?.id === currentUser?.id;

  const handleStartEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditAssignee(task.assignedTo?.id || "unassigned");
    setEditProject(task.project?.id || "no-project");
    setEditDeadline(task.deadline ? parseISO(task.deadline) : undefined);
    setEditEstimatedHours(task.estimatedHours?.toString() ?? "");
    setEditActualHours(task.actualHours?.toString() || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateTask(task.id, {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      projectId: editProject === "no-project" ? null : editProject,
      deadline: editDeadline
        ? format(editDeadline, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        : task.deadline,
      estimatedHours: parseFloat(editEstimatedHours) || null,
    });

    setIsEditing(false);

    if (currentUser) {
      addAuditLog({
        id: `audit-${Date.now()}`,
        actorUserId: currentUser.id,
        entityType: "TASK",
        actionType: "UPDATE",
        description: `Đã cập nhật công việc "${task.title}"`,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await updateTaskStatus(task.id, newStatus);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    await addComment(task.id, newComment.trim());
    setNewComment("");
  };

  const startEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(content);
  };

  const saveEditComment = async () => {
    if (editingCommentId && editingCommentText.trim()) {
      await updateComment(task.id, editingCommentId, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText("");
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteCommentDialog(true);
  };

  const handleDeleteComment = async () => {
    if (commentToDelete) {
      await deleteComment(task.id, commentToDelete);
      setDeleteCommentDialog(false);
      setCommentToDelete(null);
    }
  };

  // Available status transitions for employee
  const getAvailableStatuses = (): TaskStatus[] => {
    if (canEdit)
      return ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];

    // Employee restrictions
    if (task.assignedTo?.id === currentUser?.id) {
      const current = task.status;
      if (current === "TODO") return ["TODO", "IN_PROGRESS"];
      if (current === "IN_PROGRESS") return ["IN_PROGRESS", "IN_REVIEW"];
      if (current === "IN_REVIEW") return ["IN_REVIEW", "DONE"];
      return [current];
    }

    return [task.status];
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Chi tiết công việc</SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
            <TabsTrigger value="activity">
              Hoạt động {comments.length > 0 && `(${comments.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Title */}
            <div>
              <Label>Tiêu đề</Label>
              {isEditing && canEdit ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-2"
                />
              ) : (
                <h2 className="text-xl font-semibold mt-2">{task.title}</h2>
              )}
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trạng thái</Label>
                {isEditing && canEdit ? (
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as TaskStatus)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses().map((s) => (
                        <SelectItem key={s} value={s}>
                          {taskStatusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2">
                    <Badge>{taskStatusLabels[task.status]}</Badge>
                  </div>
                )}
              </div>

              <div>
                <Label>Độ ưu tiên</Label>
                {isEditing && canEdit ? (
                  <Select
                    value={editPriority}
                    onValueChange={(v) => setEditPriority(v as TaskPriority)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">
                        {taskPriorityLabels.LOW}
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        {taskPriorityLabels.MEDIUM}
                      </SelectItem>
                      <SelectItem value="HIGH">
                        {taskPriorityLabels.HIGH}
                      </SelectItem>
                      <SelectItem value="URGENT">
                        {taskPriorityLabels.URGENT}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2">
                    <Badge variant="outline">
                      {taskPriorityLabels[task.priority]}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Mô tả</Label>
              {isEditing && canEdit ? (
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              ) : (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description || "Không có mô tả"}
                </p>
              )}
            </div>

            {/* Source Message */}
            {task.sourceMessage && (
              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Nguồn gốc
                </Label>
                <p className="mt-2 text-sm text-muted-foreground italic">
                  {task.sourceMessage}
                </p>
              </div>
            )}

            <Separator />

            {/* Assigned To */}
            <div>
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Người thực hiện
              </Label>
              {isEditing && canEdit ? (
                <Select
                  value={editAssignee}
                  onValueChange={(v) =>
                    setEditAssignee(v === "unassigned" ? undefined : v)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Chưa giao" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Chưa giao</SelectItem>
                    {userOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-2">
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignee.avatarUrl ?? undefined} />
                        <AvatarFallback>{assignee.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <span>{assignee.fullName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Chưa giao
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Project */}
            <div>
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Dự án
              </Label>
              {isEditing && canEdit ? (
                <Select
                  value={editProject}
                  onValueChange={(v) =>
                    setEditProject(v === "no-project" ? undefined : v)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Không dự án" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">Không dự án</SelectItem>
                    {projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-2">
                  {project ? (
                    <Badge variant="outline">{project.name}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Không dự án
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Deadline */}
            <div>
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Deadline
              </Label>
              {isEditing && canEdit ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start mt-2"
                    >
                      {editDeadline
                        ? format(editDeadline, "dd/MM/yyyy", { locale: vi })
                        : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={editDeadline}
                      onSelect={setEditDeadline}
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="mt-2 text-sm">
                  {task.deadline
                    ? format(parseISO(task.deadline), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "Chưa có deadline"}
                </p>
              )}
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Dự kiến (giờ)
                </Label>
                {isEditing && canEdit ? (
                  <Input
                    type="number"
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(e.target.value)}
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-sm">
                    {task.estimatedHours ? `${task.estimatedHours}h` : "-"}
                  </p>
                )}
              </div>

              <div>
                <Label>Thực tế (giờ)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editActualHours}
                    onChange={(e) => setEditActualHours(e.target.value)}
                    className="mt-2"
                  />
                ) : (
                  <p className="mt-2 text-sm">
                    {task.actualHours ? `${task.actualHours}h` : "-"}
                  </p>
                )}
              </div>
            </div>

            {/* Created by */}
            <div>
              <Label>Người tạo</Label>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {creator && (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={creator.avatarUrl ?? undefined} />
                        <AvatarFallback>{creator.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{creator.fullName}</span>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(task.createdAt), "dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              {isEditing ? (
                <>
                  <Button onClick={handleSaveEdit} className="flex-1">
                    Lưu
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Button variant="outline" onClick={handleStartEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Chỉnh sửa
                    </Button>
                  )}
                  {canChangeStatus && task.status === "TODO" && (
                    <Button onClick={() => handleStatusChange("IN_PROGRESS")}>
                      <Play className="h-4 w-4 mr-2" />
                      Bắt đầu
                    </Button>
                  )}
                  {canChangeStatus && task.status === "IN_PROGRESS" && (
                    <Button onClick={() => handleStatusChange("IN_REVIEW")}>
                      <Send className="h-4 w-4 mr-2" />
                      Gửi review
                    </Button>
                  )}
                  {canChangeStatus && task.status !== "DONE" && (
                    <Button onClick={() => handleStatusChange("DONE")}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Hoàn thành
                    </Button>
                  )}
                  {canEdit && task.status !== "CANCELLED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange("CANCELLED")}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Hủy
                    </Button>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-6">
            {/* Comment thread */}
            <div className="space-y-4">
              {comments.map((comment) => {
                const commentUser = comment.user;
                const isOwn = comment.user?.id === currentUser?.id;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={commentUser?.avatarUrl ?? undefined} />
                      <AvatarFallback>
                        {commentUser?.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {commentUser?.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              parseISO(comment.createdAt),
                              "dd/MM HH:mm",
                              { locale: vi },
                            )}
                            {comment.isEdited && " (đã sửa)"}
                          </span>
                        </div>
                        {isOwn && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  startEditComment(comment.id, comment.content)
                                }
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => confirmDeleteComment(comment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editingCommentText}
                            onChange={(e) =>
                              setEditingCommentText(e.target.value)
                            }
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEditComment}>
                              Lưu
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCommentId(null)}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Chưa có bình luận nào</p>
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="sticky bottom-0 bg-background pt-4 border-t">
              <Label htmlFor="new-comment">Cập nhật tiến độ...</Label>
              <div className="flex gap-2 mt-2">
                <Textarea
                  id="new-comment"
                  placeholder="Thêm bình luận..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Gửi
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete comment dialog */}
        <AlertDialog
          open={deleteCommentDialog}
          onOpenChange={setDeleteCommentDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa bình luận này?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteComment}
                className="bg-destructive hover:bg-destructive/90"
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
