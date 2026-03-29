import { useState, useMemo } from "react";
import { getUserById, taskPriorityLabels } from "../../data/mockData";
import type { Task, TaskPriority } from "../../data/mockData";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  isBefore,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskCalendarView({
  tasks,
  onTaskClick,
}: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get all days in current month view (including days from prev/next month to fill grid)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (task.deadline) {
        const dateKey = format(parseISO(task.deadline), "yyyy-MM-dd");
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });

    return map;
  }, [tasks]);

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

  const isOverdue = (task: Task) => {
    if (!task.deadline || task.status === "DONE" || task.status === "CANCELLED")
      return false;
    return isBefore(parseISO(task.deadline), new Date());
  };

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: vi })}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hôm nay
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px bg-border border rounded-t-lg overflow-hidden">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <div
              key={day}
              className="bg-muted px-3 py-2 text-center font-medium text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-border border border-t-0 rounded-b-lg overflow-hidden">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isCurrentMonth =
              format(day, "MM") === format(currentMonth, "MM");
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`bg-card min-h-[120px] p-2 ${!isCurrentMonth ? "opacity-40" : ""} ${
                  isToday ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5">
                      {dayTasks.length}
                    </Badge>
                  )}
                </div>

                {/* Task cards (show max 3, rest in popover) */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const assignee = task.assignedToUserId
                      ? getUserById(task.assignedToUserId)
                      : null;
                    const isTaskOverdue = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className={`text-xs p-1.5 rounded cursor-pointer hover:shadow-sm transition-shadow border ${
                          isTaskOverdue
                            ? "bg-red-50 dark:bg-red-950 border-red-200"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          <div
                            className={`h-2 w-2 rounded-full flex-shrink-0 mt-0.5 ${getPriorityColor(task.priority)}`}
                          />
                          <span className="line-clamp-1 flex-1 font-medium">
                            {task.title}
                          </span>
                        </div>
                        {assignee && (
                          <div className="flex items-center gap-1 mt-1">
                            <Avatar className="h-3 w-3">
                              <AvatarImage src={assignee.avatarUrl} />
                              <AvatarFallback className="text-[8px]">
                                {assignee.fullName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {assignee.fullName}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Show "+X more" if there are more tasks */}
                  {dayTasks.length > 3 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-xs text-primary hover:underline w-full text-left px-1.5">
                          +{dayTasks.length - 3} công việc khác
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm mb-3">
                            Công việc ngày{" "}
                            {format(day, "dd/MM/yyyy", { locale: vi })}
                          </h4>
                          {dayTasks.map((task) => {
                            const assignee = task.assignedToUserId
                              ? getUserById(task.assignedToUserId)
                              : null;
                            const isTaskOverdue = isOverdue(task);

                            return (
                              <div
                                key={task.id}
                                onClick={() => {
                                  onTaskClick(task.id);
                                }}
                                className={`p-2 rounded border cursor-pointer hover:bg-muted/50 ${
                                  isTaskOverdue
                                    ? "bg-red-50 dark:bg-red-950 border-red-200"
                                    : ""
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className={`h-2 w-2 rounded-full flex-shrink-0 mt-1 ${getPriorityColor(task.priority)}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-2">
                                      {task.title}
                                    </p>
                                    {assignee && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Avatar className="h-4 w-4">
                                          <AvatarImage
                                            src={assignee.avatarUrl}
                                          />
                                          <AvatarFallback className="text-[9px]">
                                            {assignee.fullName[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">
                                          {assignee.fullName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Khẩn cấp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Cao</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Trung bình</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Thấp</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-3 w-8 rounded bg-red-50 dark:bg-red-950 border border-red-200" />
          <span className="text-muted-foreground">Quá hạn</span>
        </div>
      </div>
    </div>
  );
}
