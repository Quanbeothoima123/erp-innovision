import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTaskData } from "../../context/TaskContext";
import { users } from "../../data/mockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { UserPlus, Search } from "lucide-react";

interface AssignTaskDialogProps {
  open: boolean;
  onClose: () => void;
  taskIds: string[]; // Can handle single or multiple tasks
}

export function AssignTaskDialog({
  open,
  onClose,
  taskIds,
}: AssignTaskDialogProps) {
  const { currentUser } = useAuth();
  const { updateTask, addAuditLog, allTasks } = useTaskData();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleAssign = () => {
    if (!selectedUserId) {
      toast.error("Vui lòng chọn người được giao");
      return;
    }

    const assignedUser = users.find((u) => u.id === selectedUserId);
    if (!assignedUser) {
      toast.error("Không tìm thấy người dùng");
      return;
    }

    // Update all selected tasks
    taskIds.forEach((taskId) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      updateTask(taskId, {
        assignedToUserId: selectedUserId,
      });

      // Add audit log
      if (currentUser) {
        addAuditLog({
          id: `audit-${Date.now()}-${taskId}`,
          actorUserId: currentUser.id,
          entityType: "TASK",
          actionType: "REASSIGN",
          description: `Đã giao công việc "${task.title}" cho ${assignedUser.fullName}`,
          ipAddress: "127.0.0.1",
          createdAt: new Date().toISOString(),
        });
      }
    });

    const taskCount = taskIds.length;
    toast.success(
      taskCount === 1
        ? `Đã giao công việc cho ${assignedUser.fullName}`
        : `Đã giao ${taskCount} công việc cho ${assignedUser.fullName}`,
    );

    setSelectedUserId("");
    onClose();
  };

  const handleCancel = () => {
    setSelectedUserId("");
    onClose();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Giao việc
          </DialogTitle>
          <DialogDescription>
            {taskIds.length === 1
              ? "Chọn người để giao công việc này"
              : `Chọn người để giao ${taskIds.length} công việc`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Không tìm thấy nhân viên nào</p>
            </div>
          ) : (
            <RadioGroup
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={user.id} id={`user-${user.id}`} />
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.fullName} />
                        <AvatarFallback>
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={!selectedUserId}>
            Giao việc
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
