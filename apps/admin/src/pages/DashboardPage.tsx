import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as statsApi from "../api/stats";
import type { AdminStats } from "../api/stats";

const CARDS: { key: keyof AdminStats; label: string; to: string }[] = [
  { key: "pendingListings", label: "Listings awaiting review", to: "/listings" },
  { key: "openReports", label: "Open reports", to: "/reports" },
  { key: "openDisputes", label: "Open disputes", to: "/disputes" },
  { key: "pendingVerifications", label: "Verification requests", to: "/verification" },
  { key: "pendingPayouts", label: "Payouts to process", to: "/payouts" },
];

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    statsApi.getStats().then(setStats);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="stat-grid">
        {CARDS.map((card) => (
          <Link key={card.key} to={card.to} className="stat-card">
            <div className="stat-value">{stats ? stats[card.key] : "—"}</div>
            <div className="stat-label">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
