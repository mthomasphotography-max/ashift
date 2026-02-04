import { NavLink, Outlet, Link, useLocation } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "#fff" : "#111",
  background: isActive ? "#111" : "transparent",
  border: "1px solid #ddd",
});

export default function Layout() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const isRotaSection = ["/staff-plan", "/line-plan", "/rota"].includes(location.pathname);
  const isSKAPSection = location.pathname.startsWith("/skap");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, cursor: "pointer" }}>
            <img
              src="/chatgpt_image_jan_3,_2026,_09_01_26_am.png"
              alt="A Shift - Budweiser Logistics Team"
              style={{ height: 80, width: 'auto' }}
            />
            <h2 style={{ margin: 0 }}>Weekly Rota Allocator</h2>
          </div>
        </Link>
        {!isLandingPage && (
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isRotaSection && (
              <>
                <NavLink to="/staff-plan" style={linkStyle}>
                  Staff Plan
                </NavLink>
                <NavLink to="/line-plan" style={linkStyle}>
                  Line Plan
                </NavLink>
                <NavLink to="/rota" style={linkStyle}>
                  Generate & View Rota
                </NavLink>
              </>
            )}
            {isSKAPSection && (
              <>
                <NavLink to="/skap" style={linkStyle}>
                  SKAP List
                </NavLink>
                <NavLink to="/skap/editor" style={linkStyle}>
                  Task Editor
                </NavLink>
                <NavLink to="/skap/settings" style={linkStyle}>
                  SKAP Settings
                </NavLink>
              </>
            )}
            <NavLink to="/settings" style={linkStyle}>
              Settings
            </NavLink>
          </nav>
        )}
      </header>

      <main style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
