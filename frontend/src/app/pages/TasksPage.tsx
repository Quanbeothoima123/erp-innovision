import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTaskData } from "../context/TaskContext";
import { taskStatusLabels, taskPriorityLabels } from "../data/mockData";
import type { Task, TaskStatus, TaskPriority } from "../data/mockData";
import * as usersService from "../../lib/services/users.service";
import * as projectsService from "../../lib/services/projects.service";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import {
  LayoutList,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { TaskListView } from "./tasks/TaskListView";
import { TaskBoardView } from "./tasks/TaskBoardView";
import { TaskCalendarView } from "./tasks/TaskCalendarView";
import { TaskDetailPanel } from "./tasks/TaskDetailPanel";
import { CreateTaskModal } from "./tasks/CreateTaskModal";
import { parseISO, isBefore, isToday, isThisWeek, isAfter } from "date-fns";

export function TasksPage() {
  const { currentUser, can } = useAuth();
  const { allTasks, loading } = useTaskData();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Danh sách users/projects cho filters
  const [userOptions, setUserOptions] = useState<
    { id: string; fullName: string }[]
  >([]);
  const [projectOptions, setProjectOptions] = useState<
    { id: string; projectName: string; projectCode: string | null }[]
  >([]);

  useEffect(() => {
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
          res.items.map((p) => ({
            id: p.id,
            projectName: p.projectName,
            projectCode: p.projectCode,
          })),
        );
      })
      .catch(() => {});
  }, []);

  // View mode: list | board | calendar
  const [viewMode, setViewMode] = useState<"list" | "board" | "calendar">(
    "list",
  );

  // Tab: all | my - check both route path and search params
  const isMyTasksRoute = location.pathname === "/tasks/my";
  const tab = isMyTasksRoute ? "my" : searchParams.get("tab") || "all";

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">(
    "ALL",
  );
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [deadlineFilter, setDeadlineFilter] = useState<
    "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "UPCOMING"
  >("ALL");

  // Task detail panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Create task modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];

    // Tab filter: my tasks vs all tasks
    if (tab === "my") {
      result = result.filter((t) => t.assignedTo?.id === currentUser?.id);
    } else {
      // All tasks - scope by role
      if (!can("ADMIN", "MANAGER")) {
        // Employee only sees tasks assigned to them or created by them
        result = result.filter(
          (t) =>
            t.assignedTo?.id === currentUser?.id ||
            t.createdBy?.id === currentUser?.id,
        );
      }
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Project filter
    if (projectFilter !== "ALL") {
      if (projectFilter === "NONE") {
        result = result.filter((t) => !t.project);
      } else {
        result = result.filter((t) => t.project?.id === projectFilter);
      }
    }

    // Assignee filter
    if (assigneeFilter !== "ALL") {
      if (assigneeFilter === "UNASSIGNED") {
        result = result.filter((t) => !t.assignedTo);
      } else {
        result = result.filter((t) => t.assignedTo?.id === assigneeFilter);
      }
    }

    // Deadline filter
    if (deadlineFilter !== "ALL") {
      const now = new Date();
      result = result.filter((t) => {
        if (!t.deadline) return false;
        const deadline = parseISO(t.deadline);

        if (deadlineFilter === "OVERDUE") {
          return (
            isBefore(deadline, now) &&
            t.status !== "DONE" &&
            t.status !== "CANCELLED"
          );
        } else if (deadlineFilter === "TODAY") {
          return isToday(deadline);
        } else if (deadlineFilter === "THIS_WEEK") {
          return isThisWeek(deadline, { weekStartsOn: 1 });
        } else if (deadlineFilter === "UPCOMING") {
          return isAfter(deadline, now);
        }
        return true;
      });
    }

    return result;
  }, [
    allTasks,
    tab,
    currentUser,
    can,
    searchQuery,
    statusFilter,
    priorityFilter,
    projectFilter,
    assigneeFilter,
    deadlineFilter,
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    const todoCount = filteredTasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = filteredTasks.filter(
      (t) => t.status === "IN_PROGRESS",
    ).length;
    const inReviewCount = filteredTasks.filter(
      (t) => t.status === "IN_REVIEW",
    ).length;
    const doneCount = filteredTasks.filter((t) => t.status === "DONE").length;

    const now = new Date();
    const overdueCount = filteredTasks.filter((t) => {
      if (!t.deadline || t.status === "DONE" || t.status === "CANCELLED")
        return false;
      return isBefore(parseISO(t.deadline), now);
    }).length;

    return {
      todoCount,
      inProgressCount,
      inReviewCount,
      doneCount,
      overdueCount,
    };
  }, [filteredTasks]);

  const handleTabChange = (value: string) => {
    if (value === "my") {
      navigate("/tasks/my");
    } else {
      navigate("/tasks");
    }
  };

  const canCreateTask = can("ADMIN", "MANAGER");

  return (
    <div className="flex flex-col h-full">
      {/* Header with Breadcrumb and Title */}
      <div className="border-b px-6 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Quản lý công việc</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Quản lý công việc</h1>
          {canCreateTask && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo công việc
            </Button>
          )}
        </div>
      </div>

      {/* Tab switcher: All Tasks | My Tasks */}
      <div className="border-b px-6">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">Tất cả công việc</TabsTrigger>
            <TabsTrigger value="my">Công việc của tôi</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View mode toggle + Filters */}
      <div className="border-b px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* View mode buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Danh sách
            </Button>
            <Button
              variant={viewMode === "board" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("board")}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Bảng
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Lịch
            </Button>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm công việc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TaskStatus | "ALL")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="TODO">{taskStatusLabels.TODO}</SelectItem>
              <SelectItem value="IN_PROGRESS">
                {taskStatusLabels.IN_PROGRESS}
              </SelectItem>
              <SelectItem value="IN_REVIEW">
                {taskStatusLabels.IN_REVIEW}
              </SelectItem>
              <SelectItem value="DONE">{taskStatusLabels.DONE}</SelectItem>
              <SelectItem value="CANCELLED">
                {taskStatusLabels.CANCELLED}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as TaskPriority | "ALL")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Độ ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả mức độ</SelectItem>
              <SelectItem value="LOW">{taskPriorityLabels.LOW}</SelectItem>
              <SelectItem value="MEDIUM">
                {taskPriorityLabels.MEDIUM}
              </SelectItem>
              <SelectItem value="HIGH">{taskPriorityLabels.HIGH}</SelectItem>
              <SelectItem value="URGENT">
                {taskPriorityLabels.URGENT}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Dự án" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả dự án</SelectItem>
              <SelectItem value="NONE">Không dự án</SelectItem>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.projectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Người được giao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả người</SelectItem>
              <SelectItem value="UNASSIGNED">Chưa giao</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={deadlineFilter}
            onValueChange={(v) => setDeadlineFilter(v as any)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Deadline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="OVERDUE">Quá hạn</SelectItem>
              <SelectItem value="TODAY">Hôm nay</SelectItem>
              <SelectItem value="THIS_WEEK">Tuần này</SelectItem>
              <SelectItem value="UPCOMING">Sắp tới</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="border-b px-6 py-3 bg-muted/30">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Chưa làm:</span>
            <Badge variant="secondary">{stats.todoCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Đang làm:</span>
            <Badge variant="secondary">{stats.inProgressCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Đang review:</span>
            <Badge variant="secondary">{stats.inReviewCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Hoàn thành:</span>
            <Badge variant="secondary">{stats.doneCount}</Badge>
          </div>
          {stats.overdueCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Quá hạn:</span>
              <Badge variant="destructive">{stats.overdueCount}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {viewMode === "list" && (
          <TaskListView
            tasks={filteredTasks}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        )}
        {viewMode === "board" && (
          <TaskBoardView
            tasks={filteredTasks}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        )}
        {viewMode === "calendar" && (
          <TaskCalendarView
            tasks={filteredTasks}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        )}
      </div>

      {/* Task Detail Panel (Sheet) */}
      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

// Export sub-pages for "My Tasks" route
export function MyTasksPage() {
  return <TasksPage />;
}
