import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, CircleHelp, Github, KeyRound, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Zap } from "lucide-react";
import type { EfithSettings, Provider } from "./SettingsModal";

type McpServer = {
  id: string; name: string; transport: string; url?: string; authUrl?: string;
  providerName?: string; requiresAuth?: boolean; connected: boolean;
};

type Props = {
  settings: EfithSettings;
  onSave: (settings: EfithSettings) => void;
  onBack: () => void;
};

const fallbackModels: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  gemini: ["gemini-3.8-flash", "gemini-3-pro-preview"],
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

const labels: Record<Provider, string> = {
  openai: "OpenAI", gemini: "Google Gemini", anthropic: "Anthropic Claude", groq: "Groq",
};

export function SettingsPage({ settings, onSave, onBack }: Props) {
  const [draft, setDraft] = useState<EfithSettings>({
    ...settings,
    apiUrl: settings.apiUrl ?? "",
    apiKeys: {
      openai: settings.apiKeys?.openai ?? "",
      gemini: settings.apiKeys?.gemini ?? "",
      anthropic: settings.apiKeys?.anthropic ?? "",
      groq: settings.apiKeys?.groq ?? "",
    },
    tavilyApiKey: settings.tavilyApiKey ?? "",
  });
  const [tab, setTab] = useState<"general" | "connections">("general");
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{type:"success"|"error"; text:string}|null>(null);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [githubId, setGithubId] = useState("");
  const [githubSecret, setGithubSecret] = useState("");
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [googleId,setGoogleId]=useState(""); const [googleSecret,setGoogleSecret]=useState(""); const [googleConfigured,setGoogleConfigured]=useState(false); const [googleConnected,setGoogleConnected]=useState(false); const [savingGoogle,setSavingGoogle]=useState(false);
  const [savingGithub, setSavingGithub] = useState(false);
  const [mcpForm, setMcpForm] = useState({id:"",name:"",url:"",providerName:"",authUrl:"",requiresAuth:true});
  const [addingMcp, setAddingMcp] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(fallbackModels[settings.provider]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [tavilyConfigured, setTavilyConfigured] = useState(false);
  const providerDescriptions: Record<Provider, string> = {
    openai: "OpenAI provides EFITH’s language model for chat, reasoning, writing, and tool use.",
    gemini: "Google Gemini provides EFITH’s language model with Google’s Gemini model family.",
    anthropic: "Anthropic Claude provides EFITH’s language model for conversation, reasoning, and tool use.",
    groq: "Groq provides fast model inference through its OpenAI-compatible API.",
  };

  useEffect(() => {
    setDraft({
      ...settings,
      apiUrl: settings.apiUrl ?? "",
      apiKeys: {
        openai: settings.apiKeys?.openai ?? "",
        gemini: settings.apiKeys?.gemini ?? "",
        anthropic: settings.apiKeys?.anthropic ?? "",
        groq: settings.apiKeys?.groq ?? "",
      },
      tavilyApiKey: settings.tavilyApiKey ?? "",
    });
    void loadConnections();
  }, [settings]);

  const api = draft.apiUrl || "";

  const fetchProviderModels = async (provider: Provider, apiKey: string) => {
    if (!apiKey.trim()) {
      setAvailableModels(fallbackModels[provider]);
      return;
    }
    setModelsLoading(true);
    try {
      const response = await fetch(`${api}/api/providers/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not fetch models.");
      const discovered = Array.isArray(payload.models) ? payload.models.filter((model: unknown): model is string => typeof model === "string") : [];
      setAvailableModels(discovered.length ? discovered : fallbackModels[provider]);
    } catch {
      setAvailableModels(fallbackModels[provider]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    const provider = draft.provider;
    const key = draft.apiKeys[provider] ?? "";
    const timer = window.setTimeout(() => void fetchProviderModels(provider, key), 350);
    return () => window.clearTimeout(timer);
  }, [draft.provider, draft.apiKeys, draft.apiUrl]);

  const loadConnections = async () => {
    try {
      const [serversResponse, oauthResponse, googleResponse] = await Promise.all([
        fetch(`${api}/api/mcp/servers`),
        fetch(`${api}/api/mcp/github/oauth-config`),
        fetch(`${api}/api/google/oauth-config`),
      ]);
      const serverPayload = await serversResponse.json().catch(() => ({}));
      const oauthPayload = await oauthResponse.json().catch(() => ({}));
      const googlePayload = await googleResponse.json().catch(() => ({}));
      if (serversResponse.ok) setServers(serverPayload.servers ?? []);
      if (oauthResponse.ok) setGithubConfigured(Boolean(oauthPayload.configured));
      if (googleResponse.ok) { setGoogleConfigured(Boolean(googlePayload.configured)); setGoogleConnected(Boolean(googlePayload.connected)); }
    } catch {}
  };

  const loadTavilyConfig = async () => {
    try {
      const response = await fetch(api + "/api/web-search/config");
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setTavilyConfigured(Boolean(payload.configured));
    } catch {}
  };

  const saveTavilyConfig = async () => {
    try {
      const response = await fetch(api + "/api/web-search/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: (draft.tavilyApiKey ?? "").trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not configure web search.");
      setTavilyConfigured(Boolean(payload.configured));
      return true;
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not configure web search." });
      return false;
    }
  };

  const save = async () => {
    const next = {
      ...draft,
      apiUrl: (draft.apiUrl ?? "").trim().replace(/\/$/, ""),
      apiKeys: {
        openai: (draft.apiKeys?.openai ?? "").trim(),
        gemini: (draft.apiKeys?.gemini ?? "").trim(),
        anthropic: (draft.apiKeys?.anthropic ?? "").trim(),
        groq: (draft.apiKeys?.groq ?? "").trim(),
      },
    };
    if (!(await saveTavilyConfig())) return;
    onSave(next);
    setDraft(next);
    setNotice({type:"success",text:"Settings saved."});
  };

  const testConnection = async () => {
    const key = draft.apiKeys[draft.provider]?.trim();
    if (!key) return setNotice({type:"error",text:"Add an API key first."});
    setTesting(true); setNotice(null);
    try {
      const response = await fetch(`${api}/api/providers/test`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({provider:draft.provider,apiKey:key,model:draft.model}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Connection test failed.");
      setNotice({type:"success",text:`${labels[draft.provider]} connection works.`});
    } catch (error) {
      setNotice({type:"error",text:error instanceof Error ? error.message : "Connection test failed."});
    } finally { setTesting(false); }
  };

  const saveGoogle=async()=>{if(!googleId.trim()||!googleSecret.trim())return;setSavingGoogle(true);setNotice(null);try{const r=await fetch(`${api}/api/google/oauth-config`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:googleId.trim(),clientSecret:googleSecret.trim()})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||"Could not save Google OAuth.");setGoogleConfigured(true);setGoogleSecret("");setNotice({type:"success",text:"Google OAuth is configured."});}catch(e){setNotice({type:"error",text:e instanceof Error?e.message:"Could not save Google OAuth."});}finally{setSavingGoogle(false);}};
  const connectGoogle=()=>{window.location.href=`${api}/api/google/oauth/start`};
  const saveGithub = async () => {
    if (!githubId.trim() || !githubSecret.trim()) return;
    setSavingGithub(true); setNotice(null);
    try {
      const response = await fetch(`${api}/api/mcp/github/oauth-config`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({clientId:githubId.trim(),clientSecret:githubSecret.trim()}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not save GitHub OAuth.");
      setGithubConfigured(true); setGithubSecret("");
      await loadConnections();
      setNotice({type:"success",text:"GitHub OAuth is configured. You can connect GitHub now."});
    } catch (error) {
      setNotice({type:"error",text:error instanceof Error ? error.message : "Could not save GitHub OAuth."});
    } finally { setSavingGithub(false); }
  };

  const connectGithub = () => { window.location.href = "/EFITH_AI_AGENT/mcp/auth/github"; };

  const addMcp = async () => {
    if (!mcpForm.id.trim() || !mcpForm.name.trim() || !mcpForm.url.trim()) return;
    setAddingMcp(true); setNotice(null);
    try {
      const response = await fetch(`${api}/api/mcp/config`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...mcpForm,id:mcpForm.id.trim(),name:mcpForm.name.trim(),url:mcpForm.url.trim(),providerName:mcpForm.providerName.trim() || mcpForm.name.trim(),authUrl:mcpForm.authUrl.trim() || undefined}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not add MCP server.");
      setMcpForm({id:"",name:"",url:"",providerName:"",authUrl:"",requiresAuth:true});
      await loadConnections();
      setNotice({type:"success",text:"MCP server added."});
    } catch (error) {
      setNotice({type:"error",text:error instanceof Error ? error.message : "Could not add MCP server."});
    } finally { setAddingMcp(false); }
  };

  return (
    <main className="settings-page">
      <div className="settings-page-shell">
        <header className="settings-page-header">
          <button className="settings-back" onClick={onBack}><ArrowLeft size={17}/><span>Back to EFITH</span></button>
          <div className="settings-brand"><div className="settings-brand-mark"><Sparkles size={18}/></div><div><strong>EFITH</strong><span>Workspace settings</span></div></div>
        </header>

        <div className="settings-page-layout">
          <aside className="settings-nav">
            <div className="settings-nav-title">Settings</div>
            <button className={tab==="general" ? "settings-nav-item active" : "settings-nav-item"} onClick={()=>setTab("general")}><Zap size={16}/><span>General</span></button>
            <button className={tab==="connections" ? "settings-nav-item active" : "settings-nav-item"} onClick={()=>setTab("connections")}><ShieldCheck size={16}/><span>Connections</span>{servers.some(s=>!s.connected&&s.requiresAuth)&&<i/>}</button>
          </aside>

          <section className="settings-page-content">
            <div className="settings-page-title">
              <div><span className="settings-eyebrow">CONFIGURATION</span><h1>{tab==="general" ? "General" : "Connections"}</h1><p>{tab==="general" ? "Control how EFITH connects to your AI providers." : "Connect EFITH to MCP services and external tools."}</p></div>
              {notice && <div className={notice.type==="success" ? "settings-notice success" : "settings-notice error"}>{notice.type==="success" ? <Check size={14}/> : <CircleHelp size={14}/>}<span>{notice.text}</span></div>}
            </div>

            {tab==="general" ? (
              <div className="settings-page-grid">
                <section className="settings-panel settings-panel-wide settings-overview">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Sparkles size={17}/></div><div><h2>EFITH workspace</h2><p>A quick look at the services and model currently powering your assistant.</p></div></div>
                  <div className="settings-overview-grid">
                    <div className="settings-overview-card"><span>Active provider</span><strong>{labels[draft.provider]}</strong><small>{draft.model}</small></div>
                    <div className="settings-overview-card"><span>Web search</span><strong>{tavilyConfigured ? "Connected" : "Not configured"}</strong><small>{tavilyConfigured ? "Tavily is ready" : "Optional integration"}</small></div>
                    <div className="settings-overview-card"><span>Connections</span><strong>{servers.filter(server=>server.connected).length} connected</strong><small>{servers.length} configured</small></div>
                    <div className="settings-overview-card"><span>Backend</span><strong>{api ? "Custom" : "Local"}</strong><small>{api || "localhost:8787"}</small></div>
                  </div>
                </section>
                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Sparkles size={17}/></div><div><h2>AI provider</h2><p>Choose the provider and model EFITH should use.</p></div></div>
                  <div className="settings-form-grid">
                    <label><span>Provider</span><select value={draft.provider} onChange={e=>{ const provider=e.target.value as Provider; const nextModel=fallbackModels[provider][0] ?? ""; setDraft({...draft,provider,model:nextModel}); void fetchProviderModels(provider,draft.apiKeys[provider]??""); }}>{(Object.keys(labels) as Provider[]).map(p=><option key={p} value={p}>{labels[p]}</option>)}</select><small className="settings-field-help">{providerDescriptions[draft.provider]}</small></label>
                    <label><span>Model <em>{modelsLoading ? "Fetching live models…" : availableModels.length + " available"}</em></span><div className="settings-select"><select value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})}>{availableModels.map(m=><option key={m}>{m}</option>)}</select><ChevronDown size={15}/>{modelsLoading&&<LoaderCircle size={13} className="settings-select-spinner spin"/>}</div><small className="settings-field-help">EFITH fetches the models exposed by your selected provider.</small></label>
                    <label className="full"><span>{labels[draft.provider]} API key</span><div className="input-icon"><KeyRound size={15}/><input type="password" value={draft.apiKeys[draft.provider]??""} onChange={e=>setDraft({...draft,apiKeys:{...draft.apiKeys,[draft.provider]:e.target.value}})} placeholder="Paste your API key" autoComplete="off" spellCheck={false}/></div><small className="settings-field-help">Authenticates EFITH with {labels[draft.provider]}. Keep this key private.</small></label>
                  </div>
                  <div className="settings-integration-card">
                    <div className="settings-integration-icon"><Search size={16}/></div>
                    <div className="settings-integration-copy"><div><h3>Web search</h3><span>{tavilyConfigured ? "Connected" : "Optional"}</span></div><p>Tavily gives EFITH live web search results so it can look up current information instead of relying only on built-in model knowledge.</p></div>
                    <label className="settings-integration-key"><span>Tavily API key</span><input type="password" value={draft.tavilyApiKey} onChange={e=>setDraft({...draft,tavilyApiKey:e.target.value})} placeholder="tvly-..." autoComplete="off" spellCheck={false}/></label>
                   </div>
                  <div className="settings-row-actions"><button className="settings-primary" onClick={testConnection} disabled={testing}>{testing?<LoaderCircle size={15} className="spin"/>:<Check size={15}/>} {testing?"Testing…":"Test connection"}</button></div>
                </section>

                <section className="settings-panel">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><ShieldCheck size={17}/></div><div><h2>Backend</h2><p>Where EFITH's agent server is running.</p></div></div>
                  <label><span>Backend URL</span><input value={draft.apiUrl} onChange={e=>setDraft({...draft,apiUrl:e.target.value})} placeholder="http://localhost:8787"/></label>
                  <div className="settings-security"><ShieldCheck size={14}/><span>Provider keys are stored locally in this browser and sent to your configured EFITH backend.</span></div>
                </section>

                <section className="settings-panel">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><CircleHelp size={17}/></div><div><h2>About</h2><p>EFITH's assistant identity and local configuration.</p></div></div>
                  <div className="settings-about"><strong>EFITH AI Agent</strong><span>Provider-agnostic agent with MCP connections.</span></div>
                </section>
              </div>
            ) : (
              <div className="settings-page-grid">
                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Sparkles size={17}/></div><div><h2>Google</h2><p>Connect Gmail and Google Calendar to EFITH.</p></div><span className="connection-badge">{googleConnected?"Connected":googleConfigured?"Configured":"Setup needed"}</span></div>
                  <div className="settings-form-grid">
                    <label><span>Google Client ID</span><input value={googleId} onChange={e=>setGoogleId(e.target.value)} placeholder="OAuth Client ID" autoComplete="off"/></label>
                    <label><span>Google Client Secret</span><input type="password" value={googleSecret} onChange={e=>setGoogleSecret(e.target.value)} placeholder={googleConfigured?"Already saved — enter to replace":"OAuth Client Secret"} autoComplete="new-password"/></label>
                    <label className="full"><span>OAuth callback URL</span><div className="readonly-field">{(draft.apiUrl || "http://127.0.0.1:8787").replace(/\/$/,"")}/api/google/oauth/callback</div></label>
                  </div>
                  <div className="settings-row-actions"><button className="settings-primary" onClick={saveGoogle} disabled={savingGoogle||!googleId.trim()||!googleSecret.trim()}>{savingGoogle?<LoaderCircle size={15} className="spin"/>:<KeyRound size={15}/>} {savingGoogle?"Saving…":googleConfigured?"Replace credentials":"Save credentials"}</button>{googleConfigured&&<button className="settings-secondary" onClick={connectGoogle}>{googleConnected?"Reconnect Google":"Connect Google"} <ArrowLeft size={14} style={{transform:"rotate(180deg)"}}/></button>}</div>
                  <div className="settings-security warning"><ShieldCheck size={14}/><span>Google OAuth credentials stay on the backend. Gmail and Calendar access is granted during sign-in.</span></div>
                </section>

                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Github size={17}/></div><div><h2>GitHub</h2><p>Connect EFITH to the official GitHub MCP server.</p></div><span className={githubConfigured ? "connection-badge connected" : "connection-badge"}>{githubConfigured ? "Configured" : "Setup needed"}</span></div>
                  <div className="settings-form-grid">
                    <label><span>GitHub Client ID</span><input value={githubId} onChange={e=>setGithubId(e.target.value)} placeholder="OAuth App Client ID" autoComplete="off"/></label>
                    <label><span>GitHub Client Secret</span><input type="password" value={githubSecret} onChange={e=>setGithubSecret(e.target.value)} placeholder={githubConfigured?"Already saved — enter to replace":"OAuth App Client Secret"} autoComplete="new-password"/></label>
                    <label className="full"><span>OAuth callback URL</span><div className="readonly-field">{(draft.apiUrl || "http://127.0.0.1:8787").replace(/\/$/, "")}/api/mcp/oauth/callback/github</div></label>
                  </div>
                  <div className="settings-row-actions"><button className="settings-primary" onClick={saveGithub} disabled={savingGithub||!githubId.trim()||!githubSecret.trim()}>{savingGithub?<LoaderCircle size={15} className="spin"/>:<KeyRound size={15}/>} {savingGithub?"Saving…":githubConfigured?"Replace credentials":"Save credentials"}</button>{githubConfigured&&<button className="settings-secondary" onClick={connectGithub}>Sign in with GitHub <ArrowLeft size={14} style={{transform:"rotate(180deg)"}}/></button>}</div>
                  <div className="settings-security warning"><ShieldCheck size={14}/><span>The GitHub client secret is sent to your backend and is not saved in browser localStorage.</span></div>
                </section>

                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><ShieldCheck size={17}/></div><div><h2>MCP servers</h2><p>{servers.length} configured connection{servers.length===1?"":"s"} available to EFITH.</p></div></div>
                  <div className="settings-connection-list">
                    {servers.length===0 && <div className="settings-empty">No MCP servers configured yet.</div>}
                    {servers.map(server=><div className="settings-connection" key={server.id}><div className="connection-icon"><ShieldCheck size={15}/></div><div><strong>{server.name}</strong><span>{server.providerName??server.name} · {server.connected?"Connected":server.requiresAuth?"Sign-in required":"Not connected"}</span></div>{!server.connected&&(server.authUrl||server.requiresAuth)&&<button className="settings-secondary" onClick={()=>window.location.href=server.authUrl||`/EFITH_AI_AGENT/mcp/auth/${encodeURIComponent(server.id)}`}>Sign in</button>}</div>)}
                  </div>
                </section>

                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Plus size={17}/></div><div><h2>Add MCP server</h2><p>Connect a remote Streamable HTTP MCP server.</p></div></div>
                  <div className="settings-form-grid">
                    <label><span>Server ID</span><input value={mcpForm.id} onChange={e=>setMcpForm({...mcpForm,id:e.target.value})} placeholder="github"/></label>
                    <label><span>Display name</span><input value={mcpForm.name} onChange={e=>setMcpForm({...mcpForm,name:e.target.value})} placeholder="GitHub"/></label>
                    <label className="full"><span>MCP URL</span><input value={mcpForm.url} onChange={e=>setMcpForm({...mcpForm,url:e.target.value})} placeholder="https://example.com/mcp"/></label>
                    <label><span>Provider name</span><input value={mcpForm.providerName} onChange={e=>setMcpForm({...mcpForm,providerName:e.target.value})} placeholder="Provider"/></label>
                    <label><span>OAuth sign-in URL <em>optional</em></span><input value={mcpForm.authUrl} onChange={e=>setMcpForm({...mcpForm,authUrl:e.target.value})} placeholder="https://..."/></label>
                  </div>
                  <label className="check-row"><input type="checkbox" checked={mcpForm.requiresAuth} onChange={e=>setMcpForm({...mcpForm,requiresAuth:e.target.checked})}/><span>This server requires sign-in</span></label>
                  <button className="settings-primary" onClick={addMcp} disabled={addingMcp}>{addingMcp?<LoaderCircle size={15} className="spin"/>:<Plus size={15}/>} {addingMcp?"Adding…":"Add MCP server"}</button>
                </section>
              </div>
            )}

            <div className="settings-page-footer"><button className="settings-secondary" onClick={onBack}>Cancel</button><button className="settings-primary" onClick={save}>Save settings</button></div>
          </section>
        </div>
      </div>
    </main>
  );
}
