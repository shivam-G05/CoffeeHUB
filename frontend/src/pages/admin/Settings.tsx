import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { label } from "../../lib/format";
import type { PlatformSetting } from "../../types";
import Button from "../../components/ui/Button";
import ChangePasswordCard from "../../components/ui/ChangePasswordCard";
import { Card, EmptyState, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Input, Textarea } from "../../components/ui/Input";

export default function AdminSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PlatformSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function apply(list: PlatformSetting[]) {
    setSettings(list);
    setValues(Object.fromEntries(list.map((s) => [s.key, s.value ?? ""])));
  }

  useEffect(() => {
    api
      .get<PlatformSetting[]>("/api/admin/settings")
      .then((res) => apply(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load settings")));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.put<PlatformSetting[]>(
        "/api/admin/settings",
        settings.map((s) => ({ key: s.key, value: values[s.key] ?? "" })),
      );
      apply(res.data);
      showToast("Settings saved", "success");
    } catch (err) {
      setSaveError(apiErrorMessage(err, "Could not save settings"));
    } finally {
      setSaving(false);
    }
  }

  const dirty = settings?.some((s) => (values[s.key] ?? "") !== (s.value ?? "")) ?? false;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform-wide configuration. Each changed value is recorded in the audit log; fee and commission changes only affect future orders."
      />

      <div className="mt-6">
        {loadError ? (
          <ErrorNote>{loadError}</ErrorNote>
        ) : !settings ? (
          <SkeletonRows />
        ) : settings.length === 0 ? (
          <EmptyState title="No settings defined" />
        ) : (
          <form onSubmit={save}>
            <Card className="space-y-5">
              {settings.map((s) => {
                const id = `setting-${s.key}`;
                const change = (value: string) => setValues((v) => ({ ...v, [s.key]: value }));
                return (
                  <div key={s.key}>
                    <label htmlFor={id} className="block text-sm font-semibold text-coffee-800">
                      {s.description || label(s.key)}
                    </label>
                    <p className="mb-1 break-all text-xs text-coffee-400">
                      {s.key}
                      {s.publicSetting ? " · visible on the public site" : ""}
                    </p>
                    {s.key === "bank_transfer_instructions" ? (
                      <Textarea id={id} rows={5} value={values[s.key] ?? ""} onChange={(e) => change(e.target.value)} maxLength={2000} />
                    ) : s.key.endsWith("_percent") ? (
                      <Input id={id} type="number" min={0} max={100} step="0.01" value={values[s.key] ?? ""} onChange={(e) => change(e.target.value)} required className="sm:max-w-xs" />
                    ) : (
                      <Input id={id} value={values[s.key] ?? ""} onChange={(e) => change(e.target.value)} maxLength={2000} />
                    )}
                  </div>
                );
              })}
              <ErrorNote>{saveError}</ErrorNote>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !dirty}>
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>
      <div className="mt-6">
        <ChangePasswordCard />
      </div>
    </div>
  );
}
