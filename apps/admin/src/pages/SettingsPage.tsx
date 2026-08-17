import React, { useCallback, useEffect, useState } from "react";
import * as settingsApi from "../api/settings";
import type { BannedKeyword, PlatformSetting } from "../api/settings";
import { extractApiErrorMessage } from "../api/client";

export function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [keywords, setKeywords] = useState<BannedKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    settingsApi.getSettings().then((rows) => {
      setSettings(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    });
    settingsApi.getBannedKeywords().then(setKeywords);
  }, []);

  useEffect(load, [load]);

  async function handleSave(key: string) {
    const value = drafts[key];
    setBusyKey(key);
    setError(null);
    try {
      const updated = await settingsApi.updateSetting(key, value);
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update setting"));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setError(null);
    try {
      const created = await settingsApi.addBannedKeyword(newKeyword.trim());
      setKeywords((prev) => [...prev, created].sort((a, b) => a.keyword.localeCompare(b.keyword)));
      setNewKeyword("");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not add keyword"));
    }
  }

  async function handleRemoveKeyword(id: string) {
    setError(null);
    try {
      await settingsApi.removeBannedKeyword(id);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not remove keyword"));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Platform settings</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="card">
        <h2 className="section-title">Settings</h2>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>{setting.key}</td>
                <td>
                  <input
                    type="text"
                    value={drafts[setting.key] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                  />
                </td>
                <td>
                  <button
                    className="btn-ghost"
                    onClick={() => handleSave(setting.key)}
                    disabled={busyKey === setting.key || drafts[setting.key] === setting.value}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Banned keywords</h2>
        <p className="text-muted">Listings whose title or description contains any of these are held for review instead of going live.</p>
        <form className="inline-form" onSubmit={handleAddKeyword} style={{ marginBottom: 16 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input type="text" placeholder="Add a keyword" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
          </div>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
        <div className="btn-row">
          {keywords.map((keyword) => (
            <span key={keyword.id} className="badge badge-accent" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {keyword.keyword}
              <button
                onClick={() => handleRemoveKeyword(keyword.id)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontWeight: 700 }}
                aria-label={`Remove ${keyword.keyword}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
