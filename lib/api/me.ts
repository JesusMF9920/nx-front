import { apiFetch } from "./client";
import type { ApiMe } from "./types";

export const meApi = {
  get(): Promise<ApiMe> {
    return apiFetch<ApiMe>("/me");
  },

  changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    return apiFetch<void>("/me/password", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
