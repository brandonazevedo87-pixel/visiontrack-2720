import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem("visiontrack.email-token") ?? "",
    },
    onSuccess: (ctx) => {
      const path = new URL(ctx.request.url).pathname;
      if (path.endsWith("/sign-in/email") || path.endsWith("/sign-up/email")) {
        const token = ctx.response.headers.get("set-auth-token");
        if (token) localStorage.setItem("visiontrack.email-token", token);
        authClient.managedAuth.clearToken();
      }
      if (path.endsWith("/sign-out"))
        localStorage.removeItem("visiontrack.email-token");
    },
  },
  plugins: [
    managedAuthClient({
      applicationId: import.meta.env.VITE_APPLICATION_ID,
      issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER,
    }),
  ],
});
export const sessionToken = () =>
  localStorage.getItem("visiontrack.email-token") ||
  authClient.managedAuth.getToken();
await authClient.managedAuth.handleRedirect();
