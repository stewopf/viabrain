import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { ViaBrainMark } from "./ViaBrainMark";

const links = [
  { to: "/", label: "Chats", end: true },
  { to: "/playbooks", label: "Playbooks" },
  { to: "/map", label: "Map" },
  { to: "/repos", label: "Repos" },
  { to: "/readmes", label: "READMEs" },
  { to: "/audit", label: "Audit" },
  { to: "/help", label: "Help" },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="console-shell">
      <nav className="console-nav">
        <div className="console-nav-inner">
          <NavLink to="/" className="console-logo">
            <ViaBrainMark />
            <span className="console-logo-text">VIA Project</span>
          </NavLink>
          <div className="console-nav-divider" />
          <div className="console-nav-links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={"end" in link ? link.end : false}
                className={({ isActive }) =>
                  `console-nav-link${isActive ? " active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="console-nav-actions">
            <span className="console-user">{user?.username}</span>
            <button
              type="button"
              className="console-logout-btn"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
          <button
            type="button"
            className={`console-menu-toggle${menuOpen ? " open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div
        className={`console-mobile-backdrop${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <div className={`console-mobile-menu${menuOpen ? " open" : ""}`}>
        <div className="console-mobile-user">{user?.username}</div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={"end" in link ? link.end : false}
            className={({ isActive }) =>
              `console-mobile-link${isActive ? " active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="console-mobile-logout"
          onClick={() => void logout()}
        >
          Log out
        </button>
      </div>

      <main className="console-main">
        <Outlet />
      </main>
    </div>
  );
}
