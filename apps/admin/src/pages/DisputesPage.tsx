import { useCallback, useEffect, useState } from "react";
import * as disputesApi from "../api/disputes";
import type { AdminDispute } from "../api/disputes";
import { extractApiErrorMessage } from "../api/client";

export function DisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    disputesApi
      .getOpenDisputes()
      .then(setDisputes)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleResolve(id: string, outcome: "RELEASE_TO_RESELLER" | "REFUND_BUYER") {
    const resolution = (resolutionDrafts[id] ?? "").trim();
    if (!resolution) {
      setError("Add a resolution note before resolving this dispute.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await disputesApi.resolveDispute(id, outcome, resolution);
      setDisputes((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not resolve dispute"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Open disputes</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? null : disputes.length === 0 ? (
        <p className="empty-state">No open disputes.</p>
      ) : (
        disputes.map((dispute) => (
          <div className="card" key={dispute.id}>
            <span className="badge badge-danger">{dispute.status}</span>
            <p style={{ marginTop: 8 }}>
              <strong>{dispute.order.title}</strong> — {dispute.order.totalAmount} SAR
            </p>
            <p className="text-muted">
              Buyer: {dispute.buyer.displayName ?? dispute.buyer.phoneNumber} · Escrow: {dispute.order.escrowStatus}
            </p>
            <p>
              <strong>{dispute.reason}</strong>
              <br />
              {dispute.description}
            </p>
            {dispute.evidencePhotos.length > 0 && (
              <div className="evidence-row">
                {dispute.evidencePhotos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="evidence" className="evidence-photo" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-muted">Response due by {new Date(dispute.deadlineAt).toLocaleString()}</p>
            <div className="field" style={{ maxWidth: 480 }}>
              <label htmlFor={`resolution-${dispute.id}`}>Resolution note</label>
              <textarea
                id={`resolution-${dispute.id}`}
                rows={2}
                value={resolutionDrafts[dispute.id] ?? ""}
                onChange={(e) => setResolutionDrafts((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
              />
            </div>
            <div className="btn-row">
              <button className="btn" onClick={() => handleResolve(dispute.id, "RELEASE_TO_RESELLER")} disabled={busyId === dispute.id}>
                Release to reseller
              </button>
              <button className="btn btn-danger" onClick={() => handleResolve(dispute.id, "REFUND_BUYER")} disabled={busyId === dispute.id}>
                Refund buyer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
