import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { McpServerConfig, McpTool } from "./types.js";

type Connection = {
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
};

export class McpManager {
  private readonly connections = new Map<string, Connection>();

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
      if (!config.url) throw new Error("HTTP MCP server requires a URL.");
      transport = new StreamableHTTPClientTransport(new URL(config.url));
    }

    await client.connect(transport);
    this.connections.set(config.id, { config, client, transport });

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
