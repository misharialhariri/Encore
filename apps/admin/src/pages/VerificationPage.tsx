import { useCallback, useEffect, useState } from "react";
import * as verificationApi from "../api/verification";
import type { AdminVerificationRequest } from "../api/verification";
import { extractApiErrorMessage } from "../api/client";

export function VerificationPage() {
  const [requests, setRequests] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    verificationApi
      .getPendingRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await verificationApi.approveRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not approve request"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await verificationApi.rejectRequest(id, reason);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not reject request"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Verification requests</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? null : requests.length === 0 ? (
        <p className="empty-state">Nothing waiting on review.</p>
      ) : (
        requests.map((request) => (
          <div className="card" key={request.id}>
            <div style={{ display: "flex", gap: 16 }}>
              <a href={request.idDocumentUrl} target="_blank" rel="noreferrer">
                <img src={request.idDocumentUrl} alt="ID document" className="evidence-photo" style={{ width: 120, height: 120 }} />
              </a>
              <div style={{ flex: 1 }}>
                <strong>{request.user.displayName ?? request.user.phoneNumber}</strong>
                <p className="text-muted">
                  {request.documentType.replace(/_/g, " ")} · submitted {new Date(request.createdAt).toLocaleDateString()}
                </p>
                <div className="btn-row">
                  <button className="btn" onClick={() => handleApprove(request.id)} disabled={busyId === request.id}>
                    Approve
                  </button>
                  <button className="btn btn-danger" onClick={() => handleReject(request.id)} disabled={busyId === request.id}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
