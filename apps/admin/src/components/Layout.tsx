import { NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../store/AdminAuthContext";
import type { AdminRole } from "../api/auth";

interface NavItem {
  to: string;
  label: string;
  roles: AdminRole[] | "all";
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: "all" },
  { to: "/listings", label: "Listings", roles: ["SUPER_ADMIN", "OPS", "SUPPORT"] },
  { to: "/reports", label: "Reports", roles: ["SUPER_ADMIN", "OPS", "SUPPORT"] },
  { to: "/disputes", label: "Disputes", roles: ["SUPER_ADMIN", "OPS", "FINANCE"] },
  { to: "/verification", label: "Verification", roles: ["SUPER_ADMIN", "OPS", "SUPPORT"] },
  { to: "/payouts", label: "Payouts", roles: ["SUPER_ADMIN", "FINANCE"] },
  { to: "/users", label: "Users", roles: ["SUPER_ADMIN", "OPS", "SUPPORT"] },
  { to: "/settings", label: "Settings", roles: ["SUPER_ADMIN"] },
];

export function Layout() {
  const { admin, logout } = useAdminAuth();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles === "all" || (admin && item.roles.includes(admin.role)));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Encore Admin</div>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          {admin && (
            <div className="admin-identity">
              {admin.email}
              <br />
              {admin.role}
            </div>
          )}
          <button className="btn btn-secondary" style={{ width: "100%" }} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
