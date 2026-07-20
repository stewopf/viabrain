import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { AuditPage } from "./pages/AuditPage";
import { ChatsPage } from "./pages/ChatsPage";
import { HelpPage } from "./pages/HelpPage";
import { LoginPage } from "./pages/LoginPage";
import { MapPage } from "./pages/MapPage";
import { PlaybooksPage } from "./pages/PlaybooksPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { ReadmesPage } from "./pages/ReadmesPage";
import { ReposPage } from "./pages/ReposPage";
import "./pages/LoginPage.css";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="splash">
        <main className="splash-main">
          <p className="splash-sub">Loading…</p>
        </main>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<PortfolioPage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="playbooks" element={<PlaybooksPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="repos" element={<ReposPage />} />
        <Route path="readmes" element={<ReadmesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
