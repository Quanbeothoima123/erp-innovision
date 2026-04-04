import { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Send,
  Bot,
  Users,
  MessageSquareMore,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as telegramService from "../../lib/services/telegram.service";
import type { TelegramGroup } from "../../lib/services/telegram.service";

// ─── GroupForm ───────────────────────────────────────────────

interface GroupFormData {
  name: string;
  groupChatId: string;
  description: string;
  isActive: boolean;
}

const emptyForm: GroupFormData = {
  name: "",
  groupChatId: "",
  description: "",
  isActive: true,
};

function GroupFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: TelegramGroup | null;
  onSave: (data: GroupFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<GroupFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              groupChatId: initial.groupChatId,
              description: initial.description ?? "",
              isActive: initial.isActive,
            }
          : emptyForm,
      );
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.groupChatId.trim()) {
      toast.error("Vui lòng điền tên và Group Chat ID");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Cập nhật Group Bot" : "Thêm Group Bot"}
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin bot nhóm. Group Chat ID thường có dạng
            -100xxxxxxxxxx.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="grp-name">
              Tên nhóm <span className="text-destructive">*</span>
            </Label>
            <Input
              id="grp-name"
              placeholder="Ví dụ: All Staff, Dev Team"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp-chatid">
              Group Chat ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="grp-chatid"
              placeholder="-100123456789"
              value={form.groupChatId}
              onChange={(e) =>
                setForm((p) => ({ ...p, groupChatId: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Thêm bot vào group, forward 1 tin nhắn bất kỳ từ group cho
              @userinfobot để lấy ID.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp-desc">Mô tả</Label>
            <Input
              id="grp-desc"
              placeholder="Ghi chú về nhóm này"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="grp-active" className="cursor-pointer">
              Kích hoạt
            </Label>
            <Switch
              id="grp-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? "Lưu thay đổi" : "Thêm group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────

export function TelegramAdminPage() {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupDialog, setGroupDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<TelegramGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TelegramGroup | null>(null);

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await telegramService.listGroups();
      setGroups(data);
    } catch {
      toast.error("Không thể tải danh sách group bot");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSaveGroup = async (form: {
    name: string;
    groupChatId: string;
    description: string;
    isActive: boolean;
  }) => {
    try {
      if (editTarget) {
        const updated = await telegramService.updateGroup(editTarget.id, form);
        setGroups((prev) =>
          prev.map((g) => (g.id === editTarget.id ? updated : g)),
        );
        toast.success("Đã cập nhật group bot");
      } else {
        const created = await telegramService.createGroup(form);
        setGroups((prev) => [created, ...prev]);
        toast.success("Đã thêm group bot");
      }
      setEditTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể lưu";
      toast.error(msg);
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await telegramService.deleteGroup(deleteTarget.id);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      toast.success("Đã xoá group bot");
    } catch {
      toast.error("Không thể xoá group bot");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Vui lòng điền tiêu đề và nội dung thông báo");
      return;
    }
    const activeGroups = groups.filter((g) => g.isActive);
    if (activeGroups.length === 0) {
      toast.error("Không có group bot nào đang active");
      return;
    }
    setBroadcasting(true);
    try {
      const result = await telegramService.broadcast({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
      });
      toast.success(
        `Đã gửi tới ${result.sent} group${result.failed > 0 ? `, ${result.failed} thất bại` : ""}`,
      );
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch {
      toast.error("Không thể gửi broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Quản Lý Telegram Bot</h1>
        <p className="text-sm text-muted-foreground">
          Cấu hình bot nhóm và gửi thông báo broadcast toàn hệ thống
        </p>
      </div>

      <Tabs defaultValue="groups">
        <TabsList className="mb-6">
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" /> Group Bots
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-2">
            <MessageSquareMore className="h-4 w-4" /> Broadcast
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Group Bots ── */}
        <TabsContent value="groups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Group Bots</CardTitle>
                <CardDescription>
                  Danh sách các nhóm Telegram nhận broadcast từ admin
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditTarget(null);
                  setGroupDialog(true);
                }}
              >
                <Plus className="h-4 w-4" /> Thêm group
              </Button>
            </CardHeader>
            <CardContent>
              {loadingGroups ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Chưa có group bot nào. Thêm nhóm đầu tiên.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-4 py-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{g.name}</span>
                          <Badge
                            variant={g.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {g.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {g.groupChatId}
                        </p>
                        {g.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {g.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditTarget(g);
                            setGroupDialog(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(g)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Broadcast ── */}
        <TabsContent value="broadcast">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Soạn thông báo</CardTitle>
                <CardDescription>
                  Sẽ gửi tới tất cả {groups.filter((g) => g.isActive).length}{" "}
                  group đang active
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bc-title">
                    Tiêu đề <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bc-title"
                    placeholder="Ví dụ: Thông báo nghỉ lễ 30/4"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {broadcastTitle.length}/200
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bc-msg">
                    Nội dung <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="bc-msg"
                    placeholder="Nội dung thông báo chi tiết..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={5}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {broadcastMessage.length}/2000
                  </p>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleBroadcast}
                  disabled={
                    broadcasting ||
                    !broadcastTitle.trim() ||
                    !broadcastMessage.trim()
                  }
                >
                  {broadcasting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Gửi broadcast
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Xem trước tin nhắn</CardTitle>
                <CardDescription>
                  Tin nhắn sẽ hiển thị như thế này trong Telegram
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-xl p-4 border font-mono text-sm space-y-2">
                  <p className="text-muted-foreground text-xs">
                    📢 Bot thông báo
                  </p>
                  {broadcastTitle || broadcastMessage ? (
                    <>
                      {broadcastTitle && (
                        <p className="font-semibold">📢 {broadcastTitle}</p>
                      )}
                      {broadcastMessage && (
                        <p className="text-sm whitespace-pre-wrap">
                          {broadcastMessage}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground italic text-xs">
                      Soạn nội dung để xem trước...
                    </p>
                  )}
                </div>
                {groups.filter((g) => g.isActive).length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Sẽ gửi tới {groups.filter((g) => g.isActive).length} group
                    active
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GroupFormDialog
        open={groupDialog}
        onOpenChange={(v) => {
          setGroupDialog(v);
          if (!v) setEditTarget(null);
        }}
        initial={editTarget}
        onSave={handleSaveGroup}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá group bot?</AlertDialogTitle>
            <AlertDialogDescription>
              Xoá "<strong>{deleteTarget?.name}</strong>"? Hành động này không
              thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
