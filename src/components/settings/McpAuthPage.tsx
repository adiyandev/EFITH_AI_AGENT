import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import "./../styles/app.css";

type McpServer = {
  id: string;
  name: string;
  authUrl?: string;
  providerName?: string;
  requiresAuth?: boolean;
};

export function McpAuthPage() {
  const [server, setServer] = useState<McpServer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = decodeURIComponent(window.location.pathname.split("/").pop() ?? "");
    const saved = localStorage.getItem("efith.settings");
    let apiUrl = "";
    try {
      apiUrl = JSON.parse(saved ?? "{}").apiUrl ?? "";
    } catch {
      apiUrl = "";
    }

    fetch(`${apiUrl}/api/mcp/servers`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not load MCP server.");
        const found = payload.servers?.find((item: McpServer) => item.id === id);
        if (!found) throw new Error("MCP server not found.");
        setServer(found);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load MCP server."));
  }, []);

  const provider = server?.providerName ?? server?.name ?? "MCP provider";

  return (
    <main className="mcp-auth-page">
      <button className="mcp-back-button" onClick={() => window.history.back()}>
        <ArrowLeft size={16} /> Back to EFITH
      </button>
      <section className="mcp-auth-card">
        <div className="mcp-auth-logo"><ShieldCheck size={24} /></div>
        {error ? (
          <>
            <h1>Couldn’t load sign-in</h1>
            <p>{error}</p>
          </>
        ) : !server ? (
          <>
            <h1>Preparing sign-in…</h1>
            <p>EFITH is loading the authentication details for this MCP connection.</p>
          </>
        ) : (
          <>
            <span className="settings-eyebrow">MCP CONNECTION</span>
            <h1>Sign in with {provider}</h1>
            <p>
              {provider} is requesting access through this MCP connection. Continue to the provider’s
              authentication page, then return to EFITH.
            </p>
            {server.authUrl ? (
              <a className="mcp-continue-button" href={server.authUrl}>
                Continue to {provider} <ExternalLink size={15} />
              </a>
            ) : (
              <p className="mcp-auth-warning">
                This server requires authentication but has not supplied an OAuth sign-in URL yet.
                Configure one in Settings → MCP.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
