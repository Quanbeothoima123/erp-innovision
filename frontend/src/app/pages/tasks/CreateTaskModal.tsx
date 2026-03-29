import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import {
  users,
  projects,
  taskStatusLabels,
  taskPriorityLabels,
} from "../../data/mockData";
import type { TaskStatus, TaskPriority } from "../../data/mockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
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
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Check } from "lucide-react";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ open, onClose }: CreateTaskModalProps) {
  const { currentUser, can } = useAuth();
  const { addTask, addAuditLog } = useTaskData();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");
  const [projectId, setProjectId] = useState<string>("no-project");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [sourceMessage, setSourceMessage] = useState("");

  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);

  // Filter users based on role
  const availableUsers = can("ADMIN")
    ? users
    : users.filter(
        (u) => u.managerId === currentUser?.id || u.id === currentUser?.id,
      );

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề công việc");
      return;
    }

    if (!currentUser) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      deadline: deadline ? format(deadline, "yyyy-MM-dd") : "",
      priority,
      status,
      sourceMessage: sourceMessage.trim() || undefined,
      projectId: projectId === "no-project" ? null : projectId,
      assignedToUserId: assigneeId === "unassigned" ? null : assigneeId,
      createdByUserId: currentUser.id,
      estimatedHours: parseFloat(estimatedHours) || 0,
      actualHours: null,
      completedAt: null,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTask(newTask);
    toast.success("Đã tạo công việc mới");

    addAuditLog({
      id: `audit-${Date.now()}`,
      actorUserId: currentUser.id,
      entityType: "TASK",
      actionType: "CREATE",
      description: `Đã tạo công việc mới: "${title}"`,
      ipAddress: "127.0.0.1",
      createdAt: new Date().toISOString(),
    });

    // Reset form
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setStatus("TODO");
    setDeadline(undefined);
    setAssigneeId("unassigned");
    setProjectId("no-project");
    setEstimatedHours("");
    setSourceMessage("");

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo công việc mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết về công việc cần thực hiện
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="VD: Implement API endpoint GET /api/users"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Mô tả chi tiết công việc cần làm..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Priority (segmented control style) */}
          <div className="space-y-2">
            <Label>Độ ưu tiên</Label>
            <ToggleGroup
              type="single"
              value={priority}
              onValueChange={(v) => v && setPriority(v as TaskPriority)}
              className="justify-start"
            >
              <ToggleGroupItem value="LOW" className="flex-1">
                {taskPriorityLabels.LOW}
              </ToggleGroupItem>
              <ToggleGroupItem value="MEDIUM" className="flex-1">
                {taskPriorityLabels.MEDIUM}
              </ToggleGroupItem>
              <ToggleGroupItem value="HIGH" className="flex-1">
                {taskPriorityLabels.HIGH}
              </ToggleGroupItem>
              <ToggleGroupItem value="URGENT" className="flex-1">
                {taskPriorityLabels.URGENT}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái ban đầu</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TaskStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">{taskStatusLabels.TODO}</SelectItem>
                <SelectItem value="IN_PROGRESS">
                  {taskStatusLabels.IN_PROGRESS}
                </SelectItem>
                <SelectItem value="IN_REVIEW">
                  {taskStatusLabels.IN_REVIEW}
                </SelectItem>
                <SelectItem value="DONE">{taskStatusLabels.DONE}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deadline & Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {deadline
                      ? format(deadline, "dd/MM/yyyy", { locale: vi })
                      : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated-hours">Dự kiến (giờ)</Label>
              <Input
                id="estimated-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="VD: 8"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          {/* Assign to (user picker with search) */}
          <div className="space-y-2">
            <Label>Giao cho</Label>
            <Popover
              open={assigneePickerOpen}
              onOpenChange={setAssigneePickerOpen}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {assigneeId
                    ? (() => {
                        const user = availableUsers.find(
                          (u) => u.id === assigneeId,
                        );
                        return user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>
                                {user.fullName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({user.userCode})
                            </span>
                          </div>
                        ) : (
                          "Chọn người thực hiện"
                        );
                      })()
                    : "Chọn người thực hiện"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm nhân viên..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setAssigneeId("");
                          setAssigneePickerOpen(false);
                        }}
                      >
                        <Check
                          className={`h-4 w-4 mr-2 ${!assigneeId ? "opacity-100" : "opacity-0"}`}
                        />
                        Chưa giao
                      </CommandItem>
                      {availableUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.fullName} ${user.userCode} ${user.email}`}
                          onSelect={() => {
                            setAssigneeId(user.id);
                            setAssigneePickerOpen(false);
                          }}
                        >
                          <Check
                            className={`h-4 w-4 mr-2 ${assigneeId === user.id ? "opacity-100" : "opacity-0"}`}
                          />
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.userCode} • {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Link to Project */}
          <div className="space-y-2">
            <Label htmlFor="project">Liên kết dự án</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Không dự án" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">Không dự án</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectCode} - {p.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Message */}
          <div className="space-y-2">
            <Label htmlFor="source-message">Nguồn gốc công việc</Label>
            <Textarea
              id="source-message"
              placeholder="VD: Email từ khách hàng, Sprint meeting ngày 28/03, Bug report #123..."
              rows={2}
              value={sourceMessage}
              onChange={(e) => setSourceMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit}>Tạo công việc</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
