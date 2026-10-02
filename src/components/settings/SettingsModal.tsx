import { useEffect, useState } from "react";
import { Check, CircleHelp, LoaderCircle, Plus, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";

export type Provider = "openai" | "gemini" | "anthropic" | "groq";
export type EfithSettings = {
  apiUrl: string;
  provider: Provider;
  model: string;
  apiKeys: Record<Provider, string>;\n  tavilyApiKey: string;
};

type McpServer = {
  id: string;
  name: string;
  transport: string;
  url?: string;
  authUrl?: string;
  providerName?: string;
  requiresAuth?: boolean;
  connected: boolean;
};

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  settings: EfithSettings;
  onSave: (settings: EfithSettings) => void;
};

const models: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  gemini: ["gemini-3.8-flash", "gemini-3-pro-preview"],
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

const labels: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  groq: "Groq",
};

export function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpAdding, setMcpAdding] = useState(false);
  const [mcpForm, setMcpForm] = useState({ id: "", name: "", url: "", authUrl: "", providerName: "", requiresAuth: true });
  const [activeTab, setActiveTab] = useState<"general" | "mcp">("general");
  const [githubClientId, setGithubClientId] = useState("");
  const [githubClientSecret, setGithubClientSecret] = useState("");
  const [githubOAuthConfigured, setGithubOAuthConfigured] = useState(false);
  const [githubOAuthSaving, setGithubOAuthSaving] = useState(false);\n  const [tavilyApiKey, setTavilyApiKey] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(settings);\n      setTavilyApiKey(settings.tavilyApiKey ?? "");
      setTestResult(null);
      setTestMessage("");
      setActiveTab("general");
      void loadMcpServers();
      void loadGitHubOAuth();
    }
  }, [open, settings]);

  if (!open) return null;

  const loadMcpServers = async () => {
    setMcpLoading(true);
    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/mcp/servers`);
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setMcpServers(payload.servers ?? []);
    } catch {
      // Keep settings usable when the local backend is offline.
    } finally {
      setMcpLoading(false);
    }
  };

  const loadGitHubOAuth = async () => {
    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/mcp/github/oauth-config`);
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setGithubOAuthConfigured(Boolean(payload.configured));
    } catch {
      // Backend may be offline.
    }
  };

  const saveGitHubOAuth = async () => {
    if (!githubClientId.trim() || !githubClientSecret.trim()) return;
    setGithubOAuthSaving(true);
    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/mcp/github/oauth-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: githubClientId.trim(),
          clientSecret: githubClientSecret.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not save GitHub OAuth.");
      setGithubOAuthConfigured(true);
      setGithubClientSecret("");
      setTestResult("success");
      setTestMessage("GitHub OAuth is configured.");
    } catch (error) {
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Could not save GitHub OAuth.");
    } finally {
      setGithubOAuthSaving(false);
    }
  };

  const addMcpServer = async () => {
    if (!mcpForm.id.trim() || !mcpForm.name.trim() || !mcpForm.url.trim()) return;
    setMcpAdding(true);
    try {
      const response = await fetch(`${settings.apiUrl || ""}/api/mcp/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mcpForm.id.trim(),
          name: mcpForm.name.trim(),
          url: mcpForm.url.trim(),
          authUrl: mcpForm.authUrl.trim() || undefined,
          providerName: mcpForm.providerName.trim() || mcpForm.name.trim(),
          requiresAuth: mcpForm.requiresAuth,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not add MCP server.");
      setMcpServers((current) => [...current.filter((item) => item.id !== payload.id), payload]);
      setMcpForm({ id: "", name: "", url: "", authUrl: "", providerName: "", requiresAuth: true });
    } catch (error) {
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Could not add MCP server.");
    } finally {
      setMcpAdding(false);
    }
  };

  const changeProvider = (provider: Provider) => {
    setDraft({ ...draft, provider, model: models[provider][0] });
    setTestResult(null);
    setTestMessage("");
  };

  const apiKey = draft.apiKeys[draft.provider] ?? "";

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult("error");
      setTestMessage("Enter an API key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const response = await fetch(`${draft.apiUrl || ""}/api/providers/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: draft.provider,
          apiKey: apiKey.trim(),
          model: draft.model,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Connection test failed.");

      setTestResult("success");
      setTestMessage(`${labels[draft.provider]} is connected.`);
    } catch (error) {
      setTestResult("error");
      setTestMessage(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-header">
          <div>
            <span className="settings-eyebrow">EFITH</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={19} />
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          <button className={activeTab === "general" ? "settings-tab settings-tab--active" : "settings-tab"} onClick={() => setActiveTab("general")} role="tab">
            <SlidersHorizontal size={15} /> General
          </button>
          <button className={activeTab === "mcp" ? "settings-tab settings-tab--active" : "settings-tab"} onClick={() => setActiveTab("mcp")} role="tab">
            <ShieldCheck size={15} /> MCP
            {mcpServers.some((server) => !server.connected && server.requiresAuth) && <span className="settings-tab-dot" />}
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="settings-section">
            <div className="settings-card-heading">
              <div className="settings-card-icon"><Sparkles size={16} /></div>
              <div>
                <strong>AI provider</strong>
                <span>Choose the model EFITH uses for conversations.</span>
              </div>
            </div>

            <label>
              <span>Provider</span>
              <select value={draft.provider} onChange={(e) => changeProvider(e.target.value as Provider)}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="groq">Groq</option>
              </select>
            </label>

            <label>
              <span>Model</span>
              <select value={draft.model} onChange={(e) => { setDraft({ ...draft, model: e.target.value }); setTestResult(null); }}>
                {models[draft.provider].map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>

            <label>
              <span>{labels[draft.provider]} API key</span>
              <input type="password" value={apiKey} onChange={(e) => {
                setDraft({ ...draft, apiKeys: { ...draft.apiKeys, [draft.provider]: e.target.value } });
                setTestResult(null);
              }} placeholder="Paste your API key" autoComplete="off" spellCheck={false} />
            </label>

            <div className="settings-action-row">
              <button className="test-connection" onClick={testConnection} disabled={testing}>
                {testing ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
                {testing ? "Testing..." : "Test connection"}
              </button>
              {testMessage && <span className={testResult === "success" ? "settings-inline-success" : "settings-inline-error"}>{testMessage}</span>}
            </div>

            <label>
              <span>Backend URL</span>
              <input value={draft.apiUrl} onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })} placeholder="http://localhost:8787" />
            </label>

            <div className="settings-info">
              <CircleHelp size={14} />
              <p>Your API key stays in this browser and is sent only to your configured EFITH backend.</p>
            </div>
          </div>
        ) : (
        <div className="settings-section settings-mcp-section">
          <div className="settings-card-heading"><div className="settings-card-icon"><ShieldCheck size={16} /></div><div><strong>MCP connections</strong><span>Give EFITH access to external tools and services.</span></div></div><div className="settings-section-title">
            <div>
              <span>MCP</span>
              <h3>Connected apps & tools</h3>
            </div>
            <span className="settings-mcp-count">{mcpServers.length} configured</span>
          </div>
          <p className="settings-help">
            Connect MCP servers so EFITH can use their tools. OAuth-protected servers can send you to their sign-in page when authentication is required.
          </p>

          <div className="mcp-github-oauth settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon"><ShieldCheck size={16} /></div>
              <div>
                <strong>GitHub OAuth</strong>
                <span>Configure the GitHub OAuth app used by the official GitHub MCP server.</span>
              </div>
            </div>
            <label>
              <span>GitHub Client ID</span>
              <input value={githubClientId} onChange={(e) => setGithubClientId(e.target.value)} placeholder="Your GitHub OAuth App Client ID" autoComplete="off" />
            </label>
            <label>
              <span>GitHub Client Secret</span>
              <input type="password" value={githubClientSecret} onChange={(e) => setGithubClientSecret(e.target.value)} placeholder={githubOAuthConfigured ? "Already configured — enter a new one to replace it" : "Your GitHub OAuth App Client Secret"} autoComplete="new-password" />
            </label>
            <label>
              <span>OAuth callback URL</span>
              <input readOnly value={`${window.location.protocol}//127.0.0.1:8787/api/mcp/oauth/callback/github`} />
            </label>
            <div className="settings-action-row">
              <button className="test-connection" onClick={saveGitHubOAuth} disabled={githubOAuthSaving || !githubClientId.trim() || !githubClientSecret.trim()}>
                {githubOAuthSaving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
                {githubOAuthSaving ? "Saving..." : githubOAuthConfigured ? "Replace OAuth credentials" : "Save GitHub OAuth"}
              </button>
              {githubOAuthConfigured && <span className="settings-inline-success">Configured</span>}
            </div>
          </div>

          <div className="mcp-server-list">
            {mcpLoading && <p className="settings-help">Loading MCP servers...</p>}
            {!mcpLoading && mcpServers.length === 0 && (
              <p className="settings-help">No MCP servers configured yet.</p>
            )}
            {mcpServers.map((server) => (
              <div className="mcp-server-card" key={server.id}>
                <div className="mcp-server-icon"><ShieldCheck size={17} /></div>
                <div className="mcp-server-info">
                  <strong>{server.name}</strong>
                  <span>{server.providerName ?? server.name} · {server.connected ? "Connected" : server.requiresAuth ? "Sign-in required" : "Not connected"}</span>
                </div>
                {(!server.connected && (server.authUrl || server.requiresAuth)) && (
                  <button
                    className="mcp-auth-button"
                    onClick={() => {
                      const target = server.authUrl || `/mcp/auth/${encodeURIComponent(server.id)}`;
                      window.location.href = target;
                    }}
                  >
                    Sign in with {server.providerName ?? server.name}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mcp-add-form">
            <div className="settings-add-heading">
              <div>
                <strong>Add an MCP server</strong>
                <span>Connect a remote Streamable HTTP MCP server.</span>
              </div>
              <Plus size={16} />
            </div>
            <div className="mcp-form-grid">
              <input value={mcpForm.id} onChange={(e) => setMcpForm({ ...mcpForm, id: e.target.value })} placeholder="Server ID (e.g. github)" />
              <input value={mcpForm.name} onChange={(e) => setMcpForm({ ...mcpForm, name: e.target.value })} placeholder="Display name" />
              <input value={mcpForm.providerName} onChange={(e) => setMcpForm({ ...mcpForm, providerName: e.target.value })} placeholder="Provider name (e.g. GitHub)" />
              <input value={mcpForm.url} onChange={(e) => setMcpForm({ ...mcpForm, url: e.target.value })} placeholder="MCP URL (https://...)" />
              <input value={mcpForm.authUrl} onChange={(e) => setMcpForm({ ...mcpForm, authUrl: e.target.value })} placeholder="Optional OAuth sign-in URL" />
            </div>
            <label className="mcp-auth-toggle">
              <input type="checkbox" checked={mcpForm.requiresAuth} onChange={(e) => setMcpForm({ ...mcpForm, requiresAuth: e.target.checked })} />
              <span>This MCP requires sign-in</span>
            </label>
            <button className="test-connection" onClick={addMcpServer} disabled={mcpAdding}>
              {mcpAdding ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
              {mcpAdding ? "Adding..." : "Add MCP server"}
            </button>
          </div>
        </div>
        )}
        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>Cancel</button>
          <button
            className="settings-save"
            onClick={() => {
              onSave({
                ...draft,
                apiUrl: draft.apiUrl.trim().replace(/\/$/, ""),
                apiKeys: {
                  openai: draft.apiKeys.openai.trim(),
                  gemini: draft.apiKeys.gemini.trim(),
                  anthropic: draft.apiKeys.anthropic.trim(),
                  groq: draft.apiKeys.groq.trim(),
                },
              });
              onClose();
            }}
          >
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}
