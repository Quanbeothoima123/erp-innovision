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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../components/ui/input-otp";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as authService from "../../../lib/services/auth.service";
import { ApiError } from "../../../lib/apiClient";

interface DisableTwoFactorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DisableTwoFactorDialog({
  open,
  onClose,
  onConfirm,
}: DisableTwoFactorDialogProps) {
  const [password, setPassword] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }
    if (otpValue.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số mã xác thực");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await authService.disableTwoFactor(password, otpValue);
      toast.success("Đã tắt xác thực 2 lớp");
      onConfirm();
      resetForm();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Mật khẩu hoặc mã xác thực không đúng",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPassword("");
    setOtpValue("");
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
            <DialogTitle>Tắt xác thực 2 lớp</DialogTitle>
          </div>
          <DialogDescription>
            Hành động này sẽ làm giảm bảo mật tài khoản của bạn. Nhập mật khẩu
            và mã xác thực để xác nhận.
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

          <div className="space-y-2">
            <Label htmlFor="otp">Mã xác thực 2 lớp</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => {
                  setOtpValue(value);
                  setError("");
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={!password || otpValue.length !== 6 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận tắt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
