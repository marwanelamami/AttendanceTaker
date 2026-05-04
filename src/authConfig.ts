/// <reference types="vite/client" />
import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    // Read from environment variables if present, fallback to placeholder for demonstration
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "placeholder-client-id",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
    redirectUri: window.location.origin, 
    postLogoutRedirectUri: window.location.origin,
  }
};

export const loginRequest: PopupRequest = {
  scopes: ["User.Read"]
};
