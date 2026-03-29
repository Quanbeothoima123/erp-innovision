import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../components/ui/input-otp";
import { Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as authService from "../../../lib/services/auth.service";
import { ApiError } from "../../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

export function TwoFactorVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateCurrentUser } = useAuth();
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const twoFactorToken = (location.state as { twoFactorToken?: string })
    ?.twoFactorToken;

  // Redirect to login if no token present
  useEffect(() => {
    if (!twoFactorToken) {
      navigate("/login", { replace: true });
    }
  }, [twoFactorToken, navigate]);

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số");
      return;
    }
    if (!twoFactorToken) return;

    setIsVerifying(true);
    setError("");

    try {
      const res = await authService.verifyLoginTwoFactor(
        twoFactorToken,
        otpValue,
      );
      updateCurrentUser(res.user);
      toast.success("Xác thực thành công");
      if (res.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Mã không đúng hoặc đã hết hạn";
      setError(message);
      setOtpValue("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </button>

        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Xác thực 2 lớp</CardTitle>
              <CardDescription className="mt-2">
                Nhập mã 6 chữ số từ ứng dụng xác thực của bạn
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => {
                  setOtpValue(value);
                  setError("");
                }}
                disabled={isVerifying}
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

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 w-full">
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerify}
              disabled={otpValue.length !== 6 || isVerifying}
            >
              {isVerifying ? "Đang xác thực..." : "Xác nhận"}
            </Button>

            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground text-center">
                Mã có hiệu lực trong <strong>30 giây</strong>. Nếu mã hết hạn,
                hãy chờ mã mới từ ứng dụng xác thực.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
