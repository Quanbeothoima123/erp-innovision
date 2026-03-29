import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../components/ui/input-otp";
import { Badge } from "../../components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { ChevronDown, QrCode, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as authService from "../../../lib/services/auth.service";
import type { TwoFactorSetupResponse } from "../../../lib/services/auth.service";
import { ApiError } from "../../../lib/apiClient";

interface SetupTwoFactorModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialQrData?: TwoFactorSetupResponse | null;
}

export function SetupTwoFactorModal({
  open,
  onClose,
  onComplete,
  initialQrData,
}: SetupTwoFactorModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");

  // Fetch QR code when modal opens
  useEffect(() => {
    if (!open) return;
    if (initialQrData) {
      setQrCodeUrl(initialQrData.qrCodeDataUrl);
      setSecretKey(initialQrData.manualKey);
      return;
    }
    setIsLoading(true);
    authService
      .setupTwoFactor()
      .then((data) => {
        setQrCodeUrl(data.qrCodeDataUrl);
        setSecretKey(data.manualKey);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể tạo mã QR",
        );
        handleClose();
      })
      .finally(() => setIsLoading(false));
  }, [open, initialQrData]);

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setOtpValue("");
    setError("");
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      await authService.enableTwoFactor(otpValue);
      toast.success("Xác thực 2 lớp đã được bật thành công");
      onComplete();
      resetModal();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Mã không đúng hoặc đã hết hạn",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setOtpValue("");
    setError("");
    setSecretCopied(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setSecretCopied(true);
    toast.success("Đã sao chép mã bảo mật");
    setTimeout(() => setSecretCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Thiết lập xác thực 2 lớp</DialogTitle>
            <Badge variant="secondary">Bước {step} / 2</Badge>
          </div>
          <DialogDescription>
            {step === 1
              ? "Quét mã QR để bắt đầu sử dụng xác thực 2 lớp"
              : "Xác nhận mã từ ứng dụng để hoàn tất"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-medium mb-2">Bước 1: Quét mã QR</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Mở ứng dụng <strong>Google Authenticator</strong>,{" "}
                    <strong>Authy</strong> hoặc bất kỳ ứng dụng xác thực TOTP
                    nào, sau đó quét mã QR bên dưới.
                  </p>

                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white rounded-lg border-2 border-border">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-[200px] h-[200px]"
                      />
                    </div>
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="h-4 w-4" />
                      Không quét được? Nhập mã thủ công
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Nhập mã sau vào ứng dụng xác thực:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background px-3 py-2 rounded border text-sm font-mono">
                            {secretKey}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={copySecret}
                            className="shrink-0"
                          >
                            {secretCopied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Hủy
                  </Button>
                  <Button onClick={handleNext}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Tiếp theo
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-medium mb-2">Bước 2: Xác nhận mã</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Nhập mã <strong>6 chữ số</strong> từ ứng dụng xác thực để hoàn
                tất.
              </p>

              <div className="flex flex-col items-center gap-4">
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

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={handleBack}>
                ← Quay lại
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Hủy
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={otpValue.length !== 6 || isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang xác nhận...
                    </>
                  ) : (
                    "Xác nhận & Bật 2FA"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
