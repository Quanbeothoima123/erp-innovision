// ============================================================
// AUTH SERVICE — Module 1
// Endpoints: /api/auth/*
// ============================================================

import { api, TokenStore } from "../apiClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
  mustChangePassword?: boolean;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorRequiredResponse;

export interface TwoFactorStatusResponse {
  enabled: boolean;
  enabledAt: string | null;
  hasPending: boolean;
}

export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;
  manualKey: string;
}

export interface ApiUser {
  id: string;
  userCode: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  departmentId: string;
  jobTitleId: string;
  managerId: string | null;
  hireDate: string;
  employmentStatus: string;
  accountStatus: string;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  lastLoginAt?: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  jobTitle?: { id: string; name: string } | null;
  manager?: { id: string; fullName: string } | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SetupAccountPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

// ─── Auth API ────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Returns either AuthResponse or TwoFactorRequiredResponse
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>("/auth/login", payload, {
    skipAuth: true,
  });
  if ("accessToken" in data) {
    TokenStore.set(data.accessToken, data.refreshToken);
  }
  return data;
}

/**
 * POST /api/auth/2fa/verify-login
 * Completes the 2FA login flow
 */
export async function verifyLoginTwoFactor(
  twoFactorToken: string,
  totpCode: string,
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>(
    "/auth/2fa/verify-login",
    { twoFactorToken, totpCode },
    { skipAuth: true },
  );
  TokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

/**
 * GET /api/auth/2fa/status
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
  return api.get<TwoFactorStatusResponse>("/auth/2fa/status");
}

/**
 * POST /api/auth/2fa/setup — Step 1: Generate QR code
 */
export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  return api.post<TwoFactorSetupResponse>("/auth/2fa/setup");
}

/**
 * POST /api/auth/2fa/enable — Step 2: Verify TOTP code and enable
 */
export async function enableTwoFactor(totpCode: string): Promise<void> {
  await api.post("/auth/2fa/enable", { totpCode });
}

/**
 * POST /api/auth/2fa/disable — Disable 2FA (requires password + TOTP)
 */
export async function disableTwoFactor(
  password: string,
  totpCode: string,
): Promise<void> {
  await api.post("/auth/2fa/disable", { password, totpCode });
}

/**
 * POST /api/auth/2fa/reset — Reset secret key (requires password)
 */
export async function resetTwoFactor(
  password: string,
): Promise<TwoFactorSetupResponse> {
  return api.post<TwoFactorSetupResponse>("/auth/2fa/reset", { password });
}

/**
 * GET /api/auth/me
 * Returns current logged-in user
 */
export async function getMe(): Promise<ApiUser> {
  return api.get<ApiUser>("/auth/me");
}

/**
 * POST /api/auth/logout
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    TokenStore.clear();
  }
}

/**
 * POST /api/auth/logout-all
 */
export async function logoutAll(): Promise<void> {
  try {
    await api.post("/auth/logout-all");
  } finally {
    TokenStore.clear();
  }
}

/**
 * POST /api/auth/change-password
 */
export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await api.post("/auth/change-password", payload);
}

/**
 * POST /api/auth/setup-account (kích hoạt tài khoản lần đầu)
 */
export async function setupAccount(
  payload: SetupAccountPayload,
): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/auth/setup-account", payload, {
    skipAuth: true,
  });
  TokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<void> {
  await api.post("/auth/forgot-password", payload, { skipAuth: true });
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  await api.post("/auth/reset-password", payload, { skipAuth: true });
}
