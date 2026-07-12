import { FormEvent, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { ViaBrainMark } from "../components/ViaBrainMark";
import "./LoginPage.css";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [oktaEnabled, setOktaEnabled] = useState(false);

  useEffect(() => {
    void api
      .authConfig()
      .then((cfg) => setOktaEnabled(cfg.oktaEnabled))
      .catch(() => setOktaEnabled(false));
  }, []);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="splash">
      <div className="splash-top">
        <div className="splash-logo" aria-label="VIA Project">
          <ViaBrainMark className="console-logo-mark splash-logo-mark" />
          <span className="splash-logo-label">Code Chat</span>
        </div>
      </div>

      <main className="splash-main">
        <div className="splash-copy">
          <p className="splash-kicker">Ask only · Read only</p>
          <h1 className="splash-brand">VIA Project</h1>
          <p className="splash-sub">
            Sign in to ask questions across your VIA repositories — streamed
            answers, chat history, no code changes.
          </p>

          <form className="splash-card" onSubmit={(e) => void onSubmit(e)}>
            {oktaEnabled && (
              <>
                <a className="splash-cta okta-cta" href="/api/auth/okta/start">
                  Sign in with Okta
                  <span className="splash-cta-pointer" aria-hidden>
                    →
                  </span>
                </a>
                <div className="login-divider">
                  <span>or continue with password</span>
                </div>
              </>
            )}
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="error-banner">{error}</div>}
            <button
              className="splash-cta"
              type="submit"
              disabled={submitting || loading}
            >
              {submitting ? "Signing in…" : "Get Started"}
              <span className="splash-cta-pointer" aria-hidden>
                →
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
