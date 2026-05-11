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
};
