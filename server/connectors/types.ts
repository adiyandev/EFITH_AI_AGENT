export type ConnectorAuth = "oauth2" | "api-key" | "token";

export type ConnectorDefinition = {
  id: string;
  name: string;
  description: string;
  auth: ConnectorAuth;
  scopes?: string[];
  connected: boolean;
};

export const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Repositories, files, issues, pull requests, and account access.",
    auth: "oauth2",
    scopes: ["repo", "read:user"],
    connected: false,
  },
  {
    id: "google",
    name: "Google",
    description: "Gmail, Calendar, and Drive access through Google OAuth.",
    auth: "oauth2",
    scopes: ["gmail.readonly", "calendar", "drive.readonly"],
    connected: false,
  },
  {
    id: "web",
    name: "Web",
    description: "Web search and retrieval tools.",
    auth: "api-key",
    connected: false,
  },
];
