import { useCallback, useEffect, useState } from "react";
import * as payoutsApi from "../api/payouts";
import type { AdminPayout, PayoutStatus } from "../api/payouts";
import { extractApiErrorMessage } from "../api/client";

const STATUS_BADGE: Record<PayoutStatus, string> = {
  PENDING: "badge-warning",
  PROCESSING: "badge-accent",
  PAID: "badge-success",
  FAILED: "badge-danger",
};

export function PayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    payoutsApi
      .getPayouts()
      .then(setPayouts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function runAction(id: string, action: (id: string) => Promise<AdminPayout>) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await action(id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update payout"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payouts</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? null : payouts.length === 0 ? (
        <p className="empty-state">No pending or processing payouts.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Reseller</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.reseller.displayName ?? payout.reseller.phoneNumber}</td>
                  <td>{payout.amount} SAR</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[payout.status]}`}>{payout.status}</span>
                  </td>
                  <td>{new Date(payout.requestedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="btn-row">
                      {payout.status === "PENDING" && (
                        <button className="btn-ghost" onClick={() => runAction(payout.id, payoutsApi.markProcessing)} disabled={busyId === payout.id}>
                          Mark processing
                        </button>
                      )}
                      {(payout.status === "PENDING" || payout.status === "PROCESSING") && (
                        <>
                          <button className="btn-ghost" onClick={() => runAction(payout.id, payoutsApi.markPaid)} disabled={busyId === payout.id}>
                            Mark paid
                          </button>
                          <button className="btn-ghost" onClick={() => runAction(payout.id, payoutsApi.markFailed)} disabled={busyId === payout.id}>
                            Mark failed
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
