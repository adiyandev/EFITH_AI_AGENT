import { useEffect, useState } from "react";
import { ArrowLeft, Check, CircleHelp, Github, KeyRound, LoaderCircle, Plus, ShieldCheck, Sparkles, Trash2, Zap } from "lucide-react";
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

const models: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  gemini: ["gemini-3.8-flash", "gemini-3-pro-preview"],
  anthropic: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-4-5-20251001"],
  groq: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

const labels: Record<Provider, string> = {
  openai: "OpenAI", gemini: "Google Gemini", anthropic: "Anthropic Claude", groq: "Groq",
};

export function SettingsPage({ settings, onSave, onBack }: Props) {
  const [draft, setDraft] = useState(settings);
  const [tab, setTab] = useState<"general" | "connections">("general");
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{type:"success"|"error"; text:string}|null>(null);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [githubId, setGithubId] = useState("");
  const [githubSecret, setGithubSecret] = useState("");
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [savingGithub, setSavingGithub] = useState(false);
  const [mcpForm, setMcpForm] = useState({id:"",name:"",url:"",providerName:"",authUrl:"",requiresAuth:true});
  const [addingMcp, setAddingMcp] = useState(false);

  useEffect(() => {
    setDraft(settings);
    void loadConnections();
  }, [settings]);

  const api = draft.apiUrl || "";

  const loadConnections = async () => {
    try {
      const [serversResponse, oauthResponse] = await Promise.all([
        fetch(`${api}/api/mcp/servers`),
        fetch(`${api}/api/mcp/github/oauth-config`),
      ]);
      const serverPayload = await serversResponse.json().catch(() => ({}));
      const oauthPayload = await oauthResponse.json().catch(() => ({}));
      if (serversResponse.ok) setServers(serverPayload.servers ?? []);
      if (oauthResponse.ok) setGithubConfigured(Boolean(oauthPayload.configured));
    } catch {}
  };

  const save = () => {
    const next = {
      ...draft,
      apiUrl: draft.apiUrl.trim().replace(/\/$/, ""),
      apiKeys: {
        openai: draft.apiKeys.openai.trim(),
        gemini: draft.apiKeys.gemini.trim(),
        anthropic: draft.apiKeys.anthropic.trim(),
        groq: draft.apiKeys.groq.trim(),
      },
    };
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
                <section className="settings-panel settings-panel-wide">
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Sparkles size={17}/></div><div><h2>AI provider</h2><p>Choose the provider and model EFITH should use.</p></div></div>
                  <div className="settings-form-grid">
                    <label><span>Provider</span><select value={draft.provider} onChange={e=>setDraft({...draft,provider:e.target.value as Provider,model:models[e.target.value as Provider][0]})}>{(Object.keys(labels) as Provider[]).map(p=><option key={p} value={p}>{labels[p]}</option>)}</select></label>
                    <label><span>Model</span><select value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})}>{models[draft.provider].map(m=><option key={m}>{m}</option>)}</select></label>
                    <label className="full"><span>{labels[draft.provider]} API key</span><div className="input-icon"><KeyRound size={15}/><input type="password" value={draft.apiKeys[draft.provider]??""} onChange={e=>setDraft({...draft,apiKeys:{...draft.apiKeys,[draft.provider]:e.target.value}})} placeholder="Paste your API key" autoComplete="off" spellCheck={false}/></div></label>
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
                  <div className="settings-panel-heading"><div className="settings-panel-icon"><Github size={17}/></div><div><h2>GitHub</h2><p>Connect EFITH to the official GitHub MCP server.</p></div><span className={githubConfigured ? "connection-badge connected" : "connection-badge"}>{githubConfigured ? "Configured" : "Setup needed"}</span></div>
                  <div className="settings-form-grid">
                    <label><span>GitHub Client ID</span><input value={githubId} onChange={e=>setGithubId(e.target.value)} placeholder="OAuth App Client ID" autoComplete="off"/></label>
                    <label><span>GitHub Client Secret</span><input type="password" value={githubSecret} onChange={e=>setGithubSecret(e.target.value)} placeholder={githubConfigured?"Already saved — enter to replace":"OAuth App Client Secret"} autoComplete="new-password"/></label>
                    <label className="full"><span>OAuth callback URL</span><div className="readonly-field">{window.location.origin}/api/mcp/oauth/callback/github</div></label>
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
