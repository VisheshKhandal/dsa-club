"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X, Plus } from "lucide-react";
import {
  PageHeader, ActionButton, FieldGroup, StudioLabel, StudioInput,
  StudioTextarea, StudioSelect, StudioCard, StudioCardContent, FieldError,
} from "@/components/studio/ui";

type CompanyForm = {
  slug: string;
  name: string;
  logo: string;
  description: string;
  interviewProcess: string;
  hiringNotes: string;
  tier: "startup" | "growth" | "product" | "big_tech";
  tags: string[];
  externalLinks: { title: string; url: string }[];
  isPublished: boolean;
  isActive: boolean;
};

const defaultForm: CompanyForm = {
  slug: "", name: "", logo: "", description: "", interviewProcess: "", hiringNotes: "",
  tier: "product", tags: [], externalLinks: [], isPublished: false, isActive: true,
};

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function CompanyEditor({ companyId }: { companyId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(companyId));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [autoSlug, setAutoSlug] = useState(!companyId);
  const [tagInput, setTagInput] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEdit = Boolean(companyId);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    fetch(`/api/studio/companies/${companyId}`)
      .then((r) => r.json())
      .then((d: { company: CompanyForm & { id: string } }) => {
        setForm({
          ...defaultForm,
          ...d.company,
        });
        setAutoSlug(false);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!isEdit || loading || saving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void save(true); }, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoSlug) next.slug = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs: typeof errors = {};
    if (!form.slug) errs.slug = "Slug is required";
    if (!form.name.trim()) errs.name = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(silent = false) {
    if (!silent && !validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/studio/companies/${companyId}` : "/api/studio/companies";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        if (!silent) setErrors({ slug: d.error });
        setSaveStatus("error"); return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (!isEdit) {
        const created = await res.json() as { company: { id: string } };
        router.push(`/studio/companies/${created.company.id}`);
      }
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); }
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !form.tags.includes(tag)) set("tags", [...form.tags, tag]);
      setTagInput("");
    }
  }

  function addLink() {
    set("externalLinks", [...form.externalLinks, { title: "", url: "" }]);
  }

  function updateLink(idx: number, key: "title" | "url", val: string) {
    const newLinks = [...form.externalLinks];
    newLinks[idx][key] = val;
    set("externalLinks", newLinks);
  }

  function removeLink(idx: number) {
    set("externalLinks", form.externalLinks.filter((_, i) => i !== idx));
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Company" : "New Company"}
        description={isEdit ? "Changes auto-save after 2.5 seconds." : "Add a target company profile."}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && saveStatus !== "idle" && (
              <span className={`flex items-center gap-1.5 text-xs ${saveStatus === "saved" ? "text-green-500" : "text-destructive"}`}>
                {saveStatus === "saved" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {saveStatus === "saved" ? "Saved" : "Error"}
              </span>
            )}
            <Link href="/studio/companies"><ActionButton variant="outline"><ArrowLeft size={14} />Back</ActionButton></Link>
            <ActionButton variant="outline" onClick={() => set("isPublished", !form.isPublished)}>
              {form.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              {form.isPublished ? "Unpublish" : "Publish"}
            </ActionButton>
            <ActionButton onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
            </ActionButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <StudioLabel htmlFor="c-name" required>Name</StudioLabel>
                  <StudioInput id="c-name" placeholder="Google" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  <FieldError message={errors.name} />
                </FieldGroup>
                <FieldGroup>
                  <StudioLabel htmlFor="c-slug" required>Slug</StudioLabel>
                  <StudioInput id="c-slug" className="font-mono text-xs" placeholder="google"
                    value={form.slug} onChange={(e) => { setAutoSlug(false); set("slug", e.target.value); }} />
                  <FieldError message={errors.slug} />
                </FieldGroup>
              </div>
              <FieldGroup>
                <StudioLabel htmlFor="c-logo">Logo URL</StudioLabel>
                <StudioInput id="c-logo" placeholder="https://example.com/logo.png" type="url" value={form.logo} onChange={(e) => set("logo", e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="c-desc">Description</StudioLabel>
                <StudioTextarea id="c-desc" rows={4} value={form.description} placeholder="A short description of the company..." onChange={(e) => set("description", e.target.value)} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>
          
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">Interview Insights</h3>
              <FieldGroup>
                <StudioLabel htmlFor="c-proc">Interview Process</StudioLabel>
                <StudioTextarea id="c-proc" rows={4} value={form.interviewProcess} placeholder="Describe their interview rounds..." onChange={(e) => set("interviewProcess", e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="c-notes">Hiring Notes</StudioLabel>
                <StudioTextarea id="c-notes" rows={3} value={form.hiringNotes} placeholder="Key traits they look for..." onChange={(e) => set("hiringNotes", e.target.value)} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          <StudioCard>
            <StudioCardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">External Links</h3>
                <ActionButton variant="outline" size="sm" onClick={addLink}><Plus size={14} />Add Link</ActionButton>
              </div>
              {form.externalLinks.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg border-dashed">No external links added.</div>
              ) : (
                <div className="space-y-3">
                  {form.externalLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <StudioInput placeholder="Title (e.g. Glassdoor)" value={link.title} onChange={(e) => updateLink(i, "title", e.target.value)} className="w-1/3 text-xs h-8" />
                      <StudioInput placeholder="URL" type="url" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} className="flex-1 text-xs h-8" />
                      <ActionButton variant="ghost" size="sm" onClick={() => removeLink(i)} className="text-destructive"><X size={14} /></ActionButton>
                    </div>
                  ))}
                </div>
              )}
            </StudioCardContent>
          </StudioCard>
        </div>

        <div className="space-y-4">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">Properties</h3>
              <FieldGroup>
                <StudioLabel htmlFor="c-tier">Tier</StudioLabel>
                <StudioSelect id="c-tier" value={form.tier} onChange={(e) => set("tier", e.target.value as CompanyForm["tier"])}>
                  {["startup", "growth", "product", "big_tech"].map((d) => <option key={d} value={d} className="capitalize">{d.replace("_", " ")}</option>)}
                </StudioSelect>
              </FieldGroup>
              
              <FieldGroup>
                <StudioLabel htmlFor="c-tags">Tags</StudioLabel>
                <StudioInput placeholder="Type tag and press Enter" value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} />
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {tag}
                        <button onClick={() => set("tags", form.tags.filter(t => t !== tag))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FieldGroup>

              <div className="rounded-lg border p-3 space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Published</span>
                  <button role="switch" aria-checked={form.isPublished}
                    onClick={() => set("isPublished", !form.isPublished)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${form.isPublished ? "bg-primary" : "bg-muted"}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{form.isPublished ? "Visible to students" : "Hidden from students"}</p>
              </div>
              
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active</span>
                  <button role="switch" aria-checked={form.isActive}
                    onClick={() => set("isActive", !form.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${form.isActive ? "bg-primary" : "bg-muted"}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{form.isActive ? "Actively hiring" : "Currently not hiring"}</p>
              </div>
            </StudioCardContent>
          </StudioCard>
        </div>
      </div>
    </div>
  );
}
