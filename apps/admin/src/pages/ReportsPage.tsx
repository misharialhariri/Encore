import { useCallback, useEffect, useState } from "react";
import * as reportsApi from "../api/reports";
import type { AdminReport } from "../api/reports";
import { extractApiErrorMessage } from "../api/client";

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    reportsApi
      .getOpenReports()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleResolve(id: string, status: "REVIEWED" | "ACTIONED", removeListing: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await reportsApi.resolveReport(id, status, removeListing);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not resolve report"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Open reports</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? null : reports.length === 0 ? (
        <p className="empty-state">No open reports.</p>
      ) : (
        reports.map((report) => (
          <div className="card" key={report.id}>
            <span className="badge badge-warning">{report.targetType}</span>{" "}
            <span className="badge">{report.reason.replace(/_/g, " ")}</span>
            <p style={{ marginTop: 8 }}>
              Reported by {report.reporter.displayName ?? report.reporter.phoneNumber ?? "unknown"}
              {report.listing ? (
                <>
                  {" "}
                  — listing <strong>{report.listing.title}</strong> ({report.listing.status})
                </>
              ) : null}
            </p>
            {report.description ? <p className="text-muted">"{report.description}"</p> : null}
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => handleResolve(report.id, "REVIEWED", false)} disabled={busyId === report.id}>
                Mark reviewed
              </button>
              <button className="btn" onClick={() => handleResolve(report.id, "ACTIONED", false)} disabled={busyId === report.id}>
                Mark actioned
              </button>
              {report.targetType === "LISTING" && (
                <button className="btn btn-danger" onClick={() => handleResolve(report.id, "ACTIONED", true)} disabled={busyId === report.id}>
                  Remove listing &amp; action
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
