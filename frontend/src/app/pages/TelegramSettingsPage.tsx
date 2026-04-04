import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  MessageCircle,
  Link2Off,
  Bell,
  BellOff,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarDays,
  Timer,
  DollarSign,
  CheckSquare,
  FolderKanban,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as telegramService from "../../lib/services/telegram.service";
import type {
  TelegramStatus,
  TelegramSettings,
} from "../../lib/services/telegram.service";

// ─── Nhóm cài đặt thông báo ──────────────────────────────────

const NOTIFICATION_GROUPS: {
  label: string;
  icon: React.ReactNode;
  items: {
    key: keyof TelegramSettings;
    label: string;
    description?: string;
  }[];
}[] = [
  {
    label: "Chấm Công",
    icon: <Clock className="h-4 w-4" />,
    items: [
      {
        key: "notifyAttendanceRequest",
        label: "Yêu cầu chấm công mới",
        description: "Khi nhân viên gửi yêu cầu check-in/out",
      },
      {
        key: "notifyAttendanceApproved",
        label: "Yêu cầu được duyệt",
        description: "Khi yêu cầu chấm công của bạn được duyệt",
      },
      {
        key: "notifyAttendanceRejected",
        label: "Yêu cầu bị từ chối",
        description: "Khi yêu cầu chấm công bị từ chối",
      },
    ],
  },
  {
    label: "Nghỉ Phép",
    icon: <CalendarDays className="h-4 w-4" />,
    items: [
      {
        key: "notifyLeaveRequest",
        label: "Đơn nghỉ phép mới cần duyệt",
        description: "Dành cho người phê duyệt",
      },
      {
        key: "notifyLeaveApproved",
        label: "Đơn nghỉ được duyệt",
        description: "Khi đơn nghỉ của bạn được chấp thuận",
      },
      {
        key: "notifyLeaveRejected",
        label: "Đơn nghỉ bị từ chối",
        description: "Khi đơn nghỉ của bạn bị từ chối",
      },
      {
        key: "notifyLeaveBalanceLow",
        label: "Số dư phép thấp",
        description: "Cảnh báo khi ngày phép còn ít",
      },
    ],
  },
  {
    label: "Làm Thêm Giờ (OT)",
    icon: <Timer className="h-4 w-4" />,
    items: [
      {
        key: "notifyOvertimeRequest",
        label: "Yêu cầu OT mới",
        description: "Dành cho người phê duyệt OT",
      },
      {
        key: "notifyOvertimeApproved",
        label: "OT được duyệt",
        description: "Khi yêu cầu OT của bạn được chấp thuận",
      },
      {
        key: "notifyOvertimeRejected",
        label: "OT bị từ chối",
        description: "Khi yêu cầu OT của bạn bị từ chối",
      },
    ],
  },
  {
    label: "Công Việc (Task)",
    icon: <CheckSquare className="h-4 w-4" />,
    items: [
      {
        key: "notifyTaskAssigned",
        label: "Được giao task mới",
        description: "Khi có task được gán cho bạn",
      },
      {
        key: "notifyTaskUpdated",
        label: "Task được cập nhật",
        description: "Khi task của bạn có thay đổi",
      },
      {
        key: "notifyTaskDueSoon",
        label: "Task sắp đến hạn",
        description: "Nhắc nhở khi deadline gần",
      },
    ],
  },
  {
    label: "Lương & Thu Nhập",
    icon: <DollarSign className="h-4 w-4" />,
    items: [
      {
        key: "notifyPayroll",
        label: "Bảng lương sẵn sàng",
        description: "Khi kỳ lương được duyệt",
      },
      {
        key: "notifyPayslip",
        label: "Phiếu lương mới",
        description: "Khi phiếu lương của bạn có sẵn",
      },
      {
        key: "notifyCompensation",
        label: "Điều chỉnh lương",
        description: "Khi cấu hình lương được thay đổi",
      },
    ],
  },
  {
    label: "Dự Án",
    icon: <FolderKanban className="h-4 w-4" />,
    items: [
      {
        key: "notifyProject",
        label: "Thay đổi dự án",
        description: "Được thêm vào dự án hoặc trạng thái thay đổi",
      },
      {
        key: "notifyMilestone",
        label: "Milestone sắp đến hạn",
        description: "Cảnh báo milestone quan trọng",
      },
    ],
  },
  {
    label: "Thông Báo Chung",
    icon: <Megaphone className="h-4 w-4" />,
    items: [
      {
        key: "notifyGeneral",
        label: "Thông báo từ Admin",
        description: "Thông báo toàn công ty từ quản trị viên",
      },
    ],
  },
];

// ─── Component chính ──────────────────────────────────────────

export function TelegramSettingsPage() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [unlinkDialog, setUnlinkDialog] = useState(false);
  const [savingSettings, setSavingSettings] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Load trạng thái
  const fetchStatus = useCallback(async () => {
    try {
      const data = await telegramService.getStatus();
      setStatus(data);
      setSettings(data.settings);
    } catch {
      toast.error("Không thể tải trạng thái Telegram");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Kết nối Telegram
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { connectUrl } = await telegramService.getConnectLink();
      window.open(connectUrl, "_blank", "noopener,noreferrer");
      toast.info(
        "Đã mở Telegram. Sau khi xác nhận trong bot, hãy làm mới trang này.",
        { duration: 8000 },
      );
      setTimeout(() => fetchStatus(), 5000);
      setTimeout(() => fetchStatus(), 12000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể tạo link kết nối";
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  // Huỷ kết nối
  const handleUnlink = async () => {
    try {
      await telegramService.unlink();
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              isLinked: false,
              telegramEnabled: false,
              linkedAt: null,
            }
          : null,
      );
      setSettings(null);
      setUnlinkDialog(false);
      toast.success("Đã huỷ kết nối Telegram");
    } catch {
      toast.error("Không thể huỷ kết nối");
    }
  };

  // Bật / tắt tổng
  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      await telegramService.toggle(enabled);
      setStatus((prev) =>
        prev ? { ...prev, telegramEnabled: enabled } : null,
      );
      toast.success(
        enabled
          ? "Đã bật nhận thông báo Telegram"
          : "Đã tắt thông báo Telegram",
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái");
    } finally {
      setToggling(false);
    }
  };

  // Cập nhật từng setting
  const handleSettingChange = async (
    key: keyof TelegramSettings,
    value: boolean,
  ) => {
    if (!settings) return;
    const optimistic = { ...settings, [key]: value };
    setSettings(optimistic);
    setSavingSettings(key);
    try {
      const updated = await telegramService.updateSettings({ [key]: value });
      setSettings(updated);
    } catch {
      setSettings(settings);
      toast.error("Không thể lưu cài đặt");
    } finally {
      setSavingSettings(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Thông Báo Telegram</h1>
          <p className="text-sm text-muted-foreground">
            Nhận thông báo từ hệ thống qua Telegram bot
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Thông Báo Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Nhận thông báo từ hệ thống qua Telegram bot — riêng tư, tức thì
        </p>
      </div>

      {/* ── Card 1: Trạng thái kết nối ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-lg ${
                  status?.isLinked
                    ? "bg-blue-100 dark:bg-blue-900/20"
                    : "bg-muted"
                }`}
              >
                <MessageCircle
                  className={`h-6 w-6 ${
                    status?.isLinked
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Kết nối Telegram
                  {status?.isLinked ? (
                    <Badge variant="default" className="bg-blue-600">
                      Đã kết nối
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Chưa kết nối</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {status?.isLinked && status.linkedAt
                    ? `Kết nối từ: ${format(new Date(status.linkedAt), "dd/MM/yyyy HH:mm", { locale: vi })}`
                    : "Kết nối tài khoản của bạn với Telegram để nhận thông báo"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status?.isLinked ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Tài khoản đã được liên kết thành công
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setUnlinkDialog(true)}
                >
                  <Link2Off className="h-4 w-4 mr-2" />
                  Huỷ kết nối
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Bấm nút bên dưới để mở Telegram. Bot sẽ hỏi bạn xác nhận kết
                  nối. Link có hiệu lực trong 15 phút.
                </span>
              </div>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Kết nối Telegram
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Bật/tắt (chỉ khi đã kết nối) ── */}
      {status?.isLinked && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {status.telegramEnabled ? (
                <Bell className="h-5 w-5 text-blue-600" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              Nhận thông báo
            </CardTitle>
            <CardDescription>
              Tắt để tạm dừng tất cả thông báo mà không mất cài đặt chi tiết
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {status.telegramEnabled ? "Đang bật" : "Đang tắt"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.telegramEnabled
                    ? "Bạn sẽ nhận thông báo theo cài đặt bên dưới"
                    : "Tất cả thông báo Telegram đang bị tạm dừng"}
                </p>
              </div>
              <Switch
                checked={status.telegramEnabled}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Card 3: Cài đặt chi tiết (chỉ khi đã bật) ── */}
      {status?.isLinked && status.telegramEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tuỳ chỉnh loại thông báo
            </CardTitle>
            <CardDescription>
              Chọn những loại thông báo bạn muốn nhận qua Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {NOTIFICATION_GROUPS.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <Separator className="mb-6" />}
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">{group.icon}</span>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h3>
                </div>
                {/* Items */}
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="space-y-0.5">
                        <Label
                          htmlFor={item.key}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {item.label}
                        </Label>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        id={item.key}
                        checked={!!settings?.[item.key]}
                        onCheckedChange={(val) =>
                          handleSettingChange(item.key, val)
                        }
                        disabled={savingSettings === item.key}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Confirm unlink dialog ── */}
      <AlertDialog open={unlinkDialog} onOpenChange={setUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ kết nối Telegram?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ không còn nhận thông báo qua Telegram nữa. Bạn có thể kết
              nối lại bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnlink}
            >
              Xác nhận huỷ kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
