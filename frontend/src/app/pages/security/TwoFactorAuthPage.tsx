import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SetupTwoFactorModal } from "./SetupTwoFactorModal";
import { DisableTwoFactorDialog } from "./DisableTwoFactorDialog";
import { ResetSecretDialog } from "./ResetSecretDialog";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as authService from "../../../lib/services/auth.service";
import type { TwoFactorSetupResponse } from "../../../lib/services/auth.service";

export function TwoFactorAuthPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [enabledDate, setEnabledDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  // QR data from reset flow to pass into setup modal
  const [resetQrData, setResetQrData] = useState<TwoFactorSetupResponse | null>(
    null,
  );

  const fetchStatus = useCallback(async () => {
    try {
      const status = await authService.getTwoFactorStatus();
      setTwoFactorEnabled(status.enabled);
      setEnabledDate(status.enabledAt ? new Date(status.enabledAt) : null);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetupComplete = () => {
    setTwoFactorEnabled(true);
    setEnabledDate(new Date());
    setShowSetupModal(false);
    setResetQrData(null);
    updateCurrentUser({ twoFactorEnabled: true });
  };

  const handleDisable = () => {
    setTwoFactorEnabled(false);
    setEnabledDate(null);
    setShowDisableDialog(false);
    updateCurrentUser({ twoFactorEnabled: false });
  };

  const handleReset = (qrData: TwoFactorSetupResponse) => {
    setTwoFactorEnabled(false);
    setShowResetDialog(false);
    setResetQrData(qrData);
    updateCurrentUser({ twoFactorEnabled: false });
    // Open setup modal with the new QR data
    setTimeout(() => setShowSetupModal(true), 300);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Xác thực 2 lớp (2FA)</h1>
        <p className="text-sm text-muted-foreground">
          Tăng cường bảo mật tài khoản của bạn với xác thực hai yếu tố
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {twoFactorEnabled ? (
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-500" />
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Xác thực 2 lớp
                    {twoFactorEnabled ? (
                      <Badge variant="default" className="bg-green-600">
                        Đã bật
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Chưa bật</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {twoFactorEnabled ? (
                      <>
                        Đã kích hoạt vào{" "}
                        {enabledDate
                          ? format(enabledDate, "dd/MM/yyyy HH:mm", {
                              locale: vi,
                            })
                          : "ngày hôm nay"}
                      </>
                    ) : (
                      "Bảo vệ tài khoản với lớp bảo mật bổ sung"
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!twoFactorEnabled ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Xác thực 2 lớp giúp bảo vệ tài khoản của bạn
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Khi bật xác thực 2 lớp, bạn cần cung cấp mã xác thực từ
                        ứng dụng di động (Google Authenticator, Authy, v.v.) mỗi
                        khi đăng nhập. Điều này giúp bảo vệ tài khoản của bạn
                        ngay cả khi mật khẩu bị lộ.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setShowSetupModal(true)} size="lg">
                    <Shield className="h-4 w-4 mr-2" />
                    Bật xác thực 2 lớp
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Tài khoản của bạn đã được bảo vệ
                      </p>
                      <p className="text-green-700 dark:text-green-300">
                        Xác thực 2 lớp đang hoạt động. Mỗi lần đăng nhập, bạn sẽ
                        cần nhập mã xác thực từ ứng dụng di động.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reset mã bảo mật
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDisableDialog(true)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Tắt xác thực 2 lớp
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <SetupTwoFactorModal
        open={showSetupModal}
        onClose={() => {
          setShowSetupModal(false);
          setResetQrData(null);
        }}
        onComplete={handleSetupComplete}
        initialQrData={resetQrData}
      />
      <DisableTwoFactorDialog
        open={showDisableDialog}
        onClose={() => setShowDisableDialog(false)}
        onConfirm={handleDisable}
      />
      <ResetSecretDialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
