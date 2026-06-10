import { apiFetch } from "./client";
import type { ApiLoginResponse } from "./types";

export const authApi = {
  login(email: string, password: string): Promise<ApiLoginResponse> {
    return apiFetch<ApiLoginResponse>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { auth: false },
    );
  },

  refresh(refreshToken: string): Promise<ApiLoginResponse> {
    return apiFetch<ApiLoginResponse>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      { auth: false },
    );
  },

  logout(refreshToken: string): Promise<void> {
    return apiFetch<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  /** Anti-enumeración: el backend responde igual exista o no la cuenta. */
  requestPasswordReset(email: string): Promise<void> {
    return apiFetch<void>(
      "/auth/password-reset",
      { method: "POST", body: JSON.stringify({ email }) },
      { auth: false },
    );
  },

  confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    return apiFetch<void>(
      "/auth/password-reset/confirm",
      { method: "POST", body: JSON.stringify({ token, newPassword }) },
      { auth: false },
    );
  },

  verifyEmail(token: string): Promise<void> {
    return apiFetch<void>(
      "/auth/verify-email",
      { method: "POST", body: JSON.stringify({ token }) },
      { auth: false },
    );
  },
};
