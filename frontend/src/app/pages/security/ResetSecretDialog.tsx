import { useState } from "react";
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
import { Label } from "../../components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as authService from "../../../lib/services/auth.service";
import type { TwoFactorSetupResponse } from "../../../lib/services/auth.service";
import { ApiError } from "../../../lib/apiClient";

interface ResetSecretDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (qrData: TwoFactorSetupResponse) => void;
}

export function ResetSecretDialog({
  open,
  onClose,
  onConfirm,
}: ResetSecretDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const qrData = await authService.resetTwoFactor(password);
      toast.success("Mã bảo mật đã được reset");
      onConfirm(qrData);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mật khẩu không đúng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPassword("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <DialogTitle>Reset mã bảo mật</DialogTitle>
          </div>
          <DialogDescription>
            Mã QR cũ sẽ bị vô hiệu hoá ngay lập tức. Bạn cần quét lại QR mới và
            xác nhận. Nhập mật khẩu để tiếp tục.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu hiện tại</Label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Lưu ý:</strong> Sau khi reset, bạn sẽ cần cấu hình lại ứng
              dụng xác thực với mã QR mới.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!password || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset & Tạo QR mới
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
