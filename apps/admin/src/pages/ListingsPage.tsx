import { useCallback, useEffect, useState } from "react";
import * as listingsApi from "../api/listings";
import type { AdminListing } from "../api/listings";
import { extractApiErrorMessage } from "../api/client";

export function ListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listingsApi
      .getPendingListings()
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await listingsApi.approveListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not approve listing"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Reason for rejecting this listing (optional):") ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await listingsApi.rejectListing(id, reason);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not reject listing"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Listings awaiting review</h1>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? null : listings.length === 0 ? (
        <p className="empty-state">Nothing waiting on review.</p>
      ) : (
        listings.map((listing) => (
          <div className="card" key={listing.id}>
            <div style={{ display: "flex", gap: 16 }}>
              {listing.images[0] && <img src={listing.images[0]} alt="" className="evidence-photo" style={{ width: 96, height: 96 }} />}
              <div style={{ flex: 1 }}>
                <strong>{listing.title}</strong> — {listing.askingPrice} SAR
                <p className="text-muted">
                  {listing.reseller.displayName ?? "Unnamed reseller"} · {listing.reseller.phoneNumber ?? listing.reseller.email}
                </p>
                <p>{listing.description}</p>
                <div className="btn-row">
                  <button className="btn" onClick={() => handleApprove(listing.id)} disabled={busyId === listing.id}>
                    Approve
                  </button>
                  <button className="btn btn-danger" onClick={() => handleReject(listing.id)} disabled={busyId === listing.id}>
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
