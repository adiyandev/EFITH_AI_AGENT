import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from "@modelcontextprotocol/client";
import type {
  OAuthClientInformationContext,
  OAuthClientProvider,
  OAuthDiscoveryState,
  OAuthMetadata,
  StoredOAuthClientInformation,
  StoredOAuthTokens,
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { McpServerConfig, McpTool } from "./types.js";

type OAuthSession = {
  provider: GitHubOAuthProvider;
  transport?: StreamableHTTPClientTransport;
  authorizationUrl?: string;
};

type Connection = {
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
};

class GitHubOAuthProvider implements OAuthClientProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private tokensValue?: StoredOAuthTokens;
  private verifier?: string;
  private discovery?: OAuthDiscoveryState;
  private stateValue?: string;
  private authorizationUrlValue?: string;

  constructor(clientId: string, clientSecret: string, callbackUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.callbackUrl = callbackUrl;
  }

  get redirectUrl() {
    return this.callbackUrl;
  }

  get clientMetadata() {
    return {
      client_name: "EFITH",
      redirect_uris: [this.callbackUrl],
      application_type: "web" as const,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    };
  }

  clientInformation(_ctx?: OAuthClientInformationContext): StoredOAuthClientInformation {
    return {
      client_id: this.clientId,
      client_secret: this.clientSecret,
    };
  }

  tokens(): StoredOAuthTokens | undefined {
    return this.tokensValue;
  }

  saveTokens(tokens: StoredOAuthTokens) {
    this.tokensValue = tokens;
  }

  state() {
    this.stateValue = crypto.randomUUID();
    return this.stateValue;
  }

  saveCodeVerifier(verifier: string) {
    this.verifier = verifier;
  }

  codeVerifier() {
    if (!this.verifier) throw new Error("MCP OAuth code verifier is missing.");
    return this.verifier;
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrlValue = url.toString();
  }

  saveDiscoveryState(state: OAuthDiscoveryState) {
    this.discovery = state;
  }

  discoveryState() {
    return this.discovery;
  }

  get authorizationUrl() {
    return this.authorizationUrlValue;
  }

  get expectedState() {
    return this.stateValue;
  }
}

export class McpManager {
  private readonly connections = new Map<string, Connection>();
  private readonly oauthSessions = new Map<string, OAuthSession>();
  private runtimeGitHubOAuth: { clientId: string; clientSecret: string } | null = null;

  configureGitHubOAuth(clientId: string, clientSecret: string) {
    this.runtimeGitHubOAuth = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
    this.oauthSessions.delete("github");
  }

  private githubOAuthConfig() {
    const clientId = this.runtimeGitHubOAuth?.clientId || process.env.GITHUB_MCP_CLIENT_ID?.trim();
    const clientSecret = this.runtimeGitHubOAuth?.clientSecret || process.env.GITHUB_MCP_CLIENT_SECRET?.trim();
    const callbackUrl = "http://127.0.0.1:8787/api/mcp/oauth/callback/github";

    if (!clientId || !clientSecret) return null;

    return { clientId, clientSecret, callbackUrl };
  }

  private getOAuthProvider(config: McpServerConfig) {
    if (config.id !== "github") return null;

    const oauth = this.githubOAuthConfig();
    if (!oauth) return null;

    const existing = this.oauthSessions.get(config.id);
    if (existing) return existing.provider;

    const provider = new GitHubOAuthProvider(
      oauth.clientId,
      oauth.clientSecret,
      oauth.callbackUrl,
    );
    this.oauthSessions.set(config.id, { provider });
    return provider;
  }

  private createTransport(config: McpServerConfig) {
    if (!config.url) throw new Error("HTTP MCP server requires a URL.");

    const provider = this.getOAuthProvider(config);
    return new StreamableHTTPClientTransport(new URL(config.url), provider ? {
      authProvider: provider,
    } : undefined);
  }

  async connect(config: McpServerConfig) {
    if (this.connections.has(config.id)) {
      return this.getServer(config.id);
    }

    const client = new Client({
      name: "efith-ai-agent",
      version: "0.1.0",
    });

    let transport: StdioClientTransport | StreamableHTTPClientTransport;

    if (config.transport === "stdio") {
      if (!config.command) throw new Error("stdio MCP server requires a command.");

      transport = new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: {
          ...process.env,
          ...(config.env ?? {}),
        } as Record<string, string>,
      });
    } else {
      transport = this.createTransport(config);
    }

    try {
      await client.connect(transport);
    } catch (error) {
      if (error instanceof UnauthorizedError && config.id === "github") {
        const provider = this.getOAuthProvider(config);
        if (provider) {
          const session = this.oauthSessions.get(config.id);
          if (session) {
            session.transport = transport;
            session.authorizationUrl = provider.authorizationUrl;
          }
        }
      }

      throw error;
    }

    this.connections.set(config.id, { config, client, transport });

    return this.getServer(config.id);
  }

  async beginOAuth(config: McpServerConfig) {
    if (config.id !== "github") {
      throw new Error("Interactive OAuth is currently implemented for GitHub MCP.");
    }

    const provider = this.getOAuthProvider(config);
    if (!provider) {
      throw new Error(
        "GitHub MCP OAuth is not configured. Set GITHUB_MCP_CLIENT_ID and GITHUB_MCP_CLIENT_SECRET on the backend.",
      );
    }

    await this.disconnect(config.id);

    try {
      await this.connect(config);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        const session = this.oauthSessions.get(config.id);
        if (session?.authorizationUrl) {
          return { authorizationUrl: session.authorizationUrl };
        }
      }
      throw error;
    }

    return { connected: true };
  }

  async finishOAuth(config: McpServerConfig, params: URLSearchParams) {
    const session = this.oauthSessions.get(config.id);
    if (!session) throw new Error("No pending MCP OAuth session.");
    if (config.id !== "github") throw new Error("Unsupported MCP OAuth provider.");

    const expectedState = session.provider.expectedState;
    const returnedState = params.get("state");
    if (!expectedState || !returnedState || expectedState !== returnedState) {
      throw new Error("MCP OAuth state validation failed.");
    }

    const transport = session.transport;
    if (!transport) throw new Error("MCP OAuth transport is missing.");

    await transport.finishAuth(params);

    await this.disconnect(config.id);

    const client = new Client({
      name: "efith-ai-agent",
      version: "0.1.0",
    });
    const freshTransport = this.createTransport(config);
    await client.connect(freshTransport);
    this.connections.set(config.id, { config, client, transport: freshTransport });

    session.transport = freshTransport;
    session.authorizationUrl = undefined;

    return this.getServer(config.id);
  }

  async disconnect(id: string) {
    const connection = this.connections.get(id);
    if (!connection) return false;

    await connection.client.close();
    this.connections.delete(id);
    return true;
  }

  async listTools(id: string): Promise<McpTool[]> {
    const connection = this.connections.get(id);
    if (!connection) throw new Error(`MCP server "${id}" is not connected.`);

    const result = await connection.client.listTools();

    return result.tools.map((tool) => ({
      serverId: id,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(id: string, name: string, arguments_: Record<string, unknown> = {}) {
    const connection = this.connections.get(id);
    if (!connection) throw new Error(`MCP server "${id}" is not connected.`);

    return connection.client.callTool({
      name,
      arguments: arguments_,
    });
  }

  listConnections() {
    return [...this.connections.values()].map(({ config, client }) => ({
      ...config,
      connected: Boolean(client),
    }));
  }

  getOAuthStatus(id: string) {
    const session = this.oauthSessions.get(id);
    return {
      configured: Boolean(session),
      connected: this.connections.has(id),
      authorizationUrl: session?.authorizationUrl,
    };
  }

  private getServer(id: string) {
    const connection = this.connections.get(id);
    if (!connection) throw new Error(`MCP server "${id}" is not connected.`);

    return {
      id,
      name: connection.config.name,
      transport: connection.config.transport,
      connected: true,
    };
  }
}
