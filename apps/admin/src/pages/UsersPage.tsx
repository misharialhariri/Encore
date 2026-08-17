import React, { useEffect, useState } from "react";
import * as usersApi from "../api/users";
import type { AdminUserDetail, AdminUserSummary } from "../api/users";
import { extractApiErrorMessage } from "../api/client";

const STATUS_BADGE: Record<AdminUserSummary["status"], string> = {
  ACTIVE: "badge-success",
  SUSPENDED: "badge-warning",
  BANNED: "badge-danger",
};

export function UsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.searchUsers().then(setUsers);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const results = await usersApi.searchUsers(query.trim() || undefined);
    setUsers(results);
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    const found = await usersApi.getUserDetail(id);
    setDetail(found);
  }

  async function runAction(id: string, action: (id: string) => Promise<AdminUserSummary>) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await action(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update user"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
      </div>
      <form className="inline-form" onSubmit={handleSearch} style={{ marginBottom: 16, maxWidth: 400 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <input type="text" placeholder="Search by name, phone, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <React.Fragment key={user.id}>
                <tr>
                  <td>
                    <button className="btn-ghost" onClick={() => toggleExpand(user.id)} style={{ padding: 0 }}>
                      {user.displayName ?? "Unnamed"}
                    </button>
                    {user.isVerified && <span className="badge badge-accent" style={{ marginLeft: 6 }}>Verified</span>}
                  </td>
                  <td>{user.phoneNumber ?? user.email}</td>
                  <td>{user.userType ?? "—"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[user.status]}`}>{user.status}</span>
                  </td>
                  <td>
                    <div className="btn-row">
                      {user.status !== "SUSPENDED" && (
                        <button className="btn-ghost" onClick={() => runAction(user.id, usersApi.suspendUser)} disabled={busyId === user.id}>
                          Suspend
                        </button>
                      )}
                      {user.status !== "BANNED" && (
                        <button className="btn-ghost" onClick={() => runAction(user.id, usersApi.banUser)} disabled={busyId === user.id}>
                          Ban
                        </button>
                      )}
                      {user.status !== "ACTIVE" && (
                        <button className="btn-ghost" onClick={() => runAction(user.id, usersApi.reactivateUser)} disabled={busyId === user.id}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === user.id && detail && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      {detail.listingsCount} listings · {detail.ordersAsBuyerCount} orders as buyer · {detail.reportsFiledCount} reports filed ·{" "}
                      {detail.reportsAgainstCount} reports against them · joined {new Date(detail.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="empty-state">No users found.</p>}
      </div>
    </div>
  );
}
