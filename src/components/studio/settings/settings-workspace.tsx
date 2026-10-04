"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCcw, RotateCcw, Save } from "lucide-react";
import { ActionButton, FieldGroup, PageHeader, Section, StudioCard, StudioCardContent, StudioInput, StudioLabel, StudioSelect } from "@/components/studio/ui";
import type { StudioSettings } from "@/lib/studio-settings";

type SystemItem = { key: string; label: string; configured: boolean };
type SettingsResponse = { settings: StudioSettings; defaults: StudioSettings; system: SystemItem[] };
type SaveState = "idle" | "saving" | "success" | "error";

async function parseResponse(response: Response): Promise<SettingsResponse> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Settings request failed");
  return data;
}

function SaveIndicator({ state, error }: { state: SaveState; error: string }) {
  if (state === "saving") return <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Saving...</span>;
  if (state === "success") return <span className="inline-flex items-center gap-2 text-sm text-green-600"><Check size={14} /> Saved successfully. Refresh to see shell changes.</span>;
  if (state === "error") return <span className="text-sm text-destructive">{error}</span>;
  return null;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full border transition ${checked ? "bg-primary" : "bg-muted"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [defaults, setDefaults] = useState<StudioSettings | null>(null);
  const [system, setSystem] = useState<SystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetch("/api/studio/settings").then(parseResponse);
      setSettings(data.settings);
      setDefaults(data.defaults);
      setSystem(data.system);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings");
      setSaveState("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaveState("saving");
    setError("");
    try {
      const data = await fetch("/api/studio/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }).then(parseResponse);
      setSettings(data.settings);
      setDefaults(data.defaults);
      setSystem(data.system);
      setSaveState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  };

  if (loading || !settings || !defaults) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Loading Studio settings..." />
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl border bg-card" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage supported Studio behavior. Secrets stay server-side."
        actions={<><ActionButton variant="outline" onClick={load}><RefreshCcw size={14} /> Check Again</ActionButton><ActionButton onClick={save} disabled={saveState === "saving"}>{saveState === "saving" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</ActionButton></>}
      />
      <SaveIndicator state={saveState} error={error} />

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="rounded-xl border bg-card p-2 text-sm">
          {["General", "Appearance", "Analytics", "Security", "System"].map((item) => <a key={item} href={`#${item.toLowerCase()}`} className="block rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">{item}</a>)}
        </nav>

        <div className="space-y-6">
          <Section title="General" description="These settings affect visible Studio branding." className="scroll-mt-20" >
            <StudioCard id="general"><StudioCardContent className="grid gap-5 md:grid-cols-2">
              <FieldGroup><StudioLabel required>Application name</StudioLabel><StudioInput value={settings.appName} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} /><p className="text-sm text-muted-foreground">Used in the Studio sidebar brand.</p></FieldGroup>
              <div className="flex items-end"><ActionButton variant="outline" onClick={() => setSettings({ ...settings, appName: defaults.appName })}><RotateCcw size={14} /> Reset Name</ActionButton></div>
            </StudioCardContent></StudioCard>
          </Section>

          <Section title="Appearance" description="Controls that immediately affect the Studio shell after save and refresh.">
            <StudioCard id="appearance"><StudioCardContent className="grid gap-5 md:grid-cols-2">
              <FieldGroup><StudioLabel>Sidebar density</StudioLabel><StudioSelect value={settings.sidebarDensity} onChange={(e) => setSettings({ ...settings, sidebarDensity: e.target.value as StudioSettings["sidebarDensity"] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></StudioSelect><p className="text-sm text-muted-foreground">Changes spacing in the Studio navigation.</p></FieldGroup>
              <FieldGroup><StudioLabel>Accent color</StudioLabel><div className="flex flex-wrap gap-2">{(["blue", "emerald", "violet", "amber", "rose"] as const).map((color) => <button key={color} type="button" onClick={() => setSettings({ ...settings, accentColor: color })} className={`h-9 rounded-md border px-3 text-sm capitalize transition ${settings.accentColor === color ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent"}`}>{color}</button>)}</div><p className="text-sm text-muted-foreground">Updates primary buttons, focus rings, and brand accent.</p></FieldGroup>
            </StudioCardContent></StudioCard>
          </Section>

          <Section title="Analytics" description="These settings are consumed by the Analytics dashboard.">
            <StudioCard id="analytics"><StudioCardContent className="grid gap-5 md:grid-cols-2">
              <FieldGroup><StudioLabel>Default date range</StudioLabel><StudioSelect value={settings.analyticsDefaultRange} onChange={(e) => setSettings({ ...settings, analyticsDefaultRange: e.target.value as StudioSettings["analyticsDefaultRange"] })}><option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All time</option></StudioSelect><p className="text-sm text-muted-foreground">Initial range used by Studio Analytics.</p></FieldGroup>
              <FieldGroup><StudioLabel>Auto refresh analytics</StudioLabel><div className="flex items-center gap-3"><Toggle checked={settings.analyticsAutoRefresh} onChange={(checked) => setSettings({ ...settings, analyticsAutoRefresh: checked })} /><span className="text-sm text-muted-foreground">{settings.analyticsAutoRefresh ? "Refreshes every 60 seconds" : "Manual refresh only"}</span></div></FieldGroup>
            </StudioCardContent></StudioCard>
          </Section>

          <Section title="Security" description="Security configuration is server-controlled and cannot be weakened here.">
            <StudioCard id="security"><StudioCardContent><p className="text-base leading-7 text-muted-foreground">Admin authorization remains enforced by server-side checks on every Studio API. Secrets such as MongoDB URI, Auth secret, and Cloudinary API secret are never returned to this page.</p></StudioCardContent></StudioCard>
          </Section>

          <Section title="System" description="Configuration health. Values show only configured/missing state.">
            <div id="system" className="grid gap-3 md:grid-cols-2">
              {system.map((item) => (
                <StudioCard key={item.key}><StudioCardContent className="flex items-center justify-between"><div><h3 className="text-base font-semibold">{item.label}</h3><p className="text-sm text-muted-foreground">Server configuration</p></div><span className={`rounded-full border px-3 py-1 text-sm ${item.configured ? "border-green-500/30 bg-green-500/10 text-green-600" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-600"}`}>{item.configured ? "Configured" : "Missing"}</span></StudioCardContent></StudioCard>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
