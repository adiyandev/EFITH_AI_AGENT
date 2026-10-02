export type McpTransport = "streamable-http" | "stdio";

export type McpServerConfig = {
  id: string;
  name: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  authUrl?: string;
  providerName?: string;
  requiresAuth?: boolean;
};

export type McpTool = {
  serverId: string;
  name: string;
  description?: string;
  inputSchema?: unknown;
};
