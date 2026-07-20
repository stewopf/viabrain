import { Link } from "react-router-dom";
import "./HelpPage.css";

const toc = [
  { id: "overview", label: "What this is" },
  { id: "read-only", label: "Ask · Read only" },
  { id: "chats", label: "Chats" },
  { id: "playbooks", label: "Playbooks" },
  { id: "map", label: "Map" },
  { id: "repos", label: "Repos" },
  { id: "readmes", label: "READMEs" },
  { id: "audit", label: "Audit" },
  { id: "export", label: "Export memos" },
  { id: "tips", label: "Tips" },
] as const;

export function HelpPage() {
  return (
    <div className="console-content help-page">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Guide</p>
          <h1 className="builder-hero-title">How to use VIA Project</h1>
          <p className="builder-hero-sub">
            A short tour of every screen — written so you can skim, then dig in
            when you need detail.
          </p>
        </div>
      </section>

      <div className="help-layout">
        <nav className="help-toc card" aria-label="Help topics">
          <p className="help-toc-label">On this page</p>
          <ol className="help-toc-list">
            {toc.map((item, index) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>
                  <span className="help-toc-num">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="help-body">
          <section id="overview" className="help-section">
            <h2>What this is</h2>
            <p>
              VIA Project is a <strong>read-only multi-repo code chat</strong>{" "}
              for PE-style technical review of the fixed stewopf / VIA catalog.
              You ask questions; an Ask-mode agent reads local clones and answers
              with citations. It cannot edit your filesystem or push code.
            </p>
            <ul className="help-bullets">
              <li>Chat across one or many repositories at once</li>
              <li>Run structured diligence playbooks</li>
              <li>Inspect a curated cross-repo map, READMEs, and an audit trail</li>
              <li>Export answers as a review memo (Markdown or print/PDF)</li>
            </ul>
          </section>

          <section id="read-only" className="help-section">
            <h2>Ask · Read only</h2>
            <div className="help-callout">
              <p className="help-callout-title">Mode is locked</p>
              <p>
                Every run uses Ask / plan mode with write-denying hooks and a
                local sandbox. There is no Agent or edit mode in this product —
                by design.
              </p>
            </div>
            <p>
              Answers should cite concrete paths. Treat the agent as a research
              assistant: confirm important claims against the Evidence list under
              each reply and, when needed, the live clones on the Repos page.
            </p>
          </section>

          <section id="chats" className="help-section">
            <h2>Chats</h2>
            <p>
              <Link to="/chats">Chats</Link> is the main workspace. The left column
              picks repositories and lists conversations; the right column shows
              the active thread.
            </p>
            <ol className="help-steps">
              <li>
                <strong>Choose repositories</strong> with the checkboxes. This
                selection is used when you click <em>New chat</em>. Selecting an
                existing chat shows that chat’s repos and syncs the selection for
                Playbooks as well.
              </li>
              <li>
                <strong>New chat</strong> opens a conversation scoped to the
                checked repos. Prompts consider all of them together.
              </li>
              <li>
                <strong>Ask a question</strong> in the composer. Streaming
                replies render Markdown (including Mermaid diagrams when the
                model emits them).
              </li>
              <li>
                <strong>Evidence</strong> under assistant messages lists file
                paths the answer referenced.
              </li>
              <li>
                <strong>Rename or delete</strong> individual chats from the
                list, or use <em>Delete all</em> to clear every conversation
                (with confirmation).
              </li>
              <li>
                Collapse the header with <em>Collapse</em> when you want more
                room for the thread.
              </li>
            </ol>
          </section>

          <section id="playbooks" className="help-section">
            <h2>Playbooks</h2>
            <p>
              <Link to="/playbooks">Playbooks</Link> run repeatable diligence
              questionnaires. Pick target repos, then start a playbook — VIA
              Project creates a chat, opens it, and sends the playbook prompt
              automatically.
            </p>
            <div className="help-grid">
              <div className="help-tile">
                <h3>Architecture</h3>
                <p>Boundaries, service roles, and how repos fit together.</p>
              </div>
              <div className="help-tile">
                <h3>Security</h3>
                <p>Auth, secrets, injection surfaces, and data exposure.</p>
              </div>
              <div className="help-tile">
                <h3>Data</h3>
                <p>Stores, flows, ownership, and persistence signals.</p>
              </div>
              <div className="help-tile">
                <h3>Operations</h3>
                <p>Deployability, observability, and failure modes.</p>
              </div>
              <div className="help-tile">
                <h3>Vendor lock-in</h3>
                <p>Third parties that would be costly to replace.</p>
              </div>
              <div className="help-tile">
                <h3>Key-person risk</h3>
                <p>Maintainability and concentration of knowledge.</p>
              </div>
            </div>
            <p className="help-note">
              Repo checkboxes are shared with Chats. A subset you pick in either
              place carries over to the other.
            </p>
          </section>

          <section id="map" className="help-section">
            <h2>Map</h2>
            <p>
              <Link to="/map">Map</Link> shows a curated view of how VIA
              services relate — not a live dependency scan. Use the architecture
              graph for the big picture, then select a service card to focus the
              diagram and connection list.
            </p>
            <ul className="help-bullets">
              <li>Layers group services (admin, client, API, AI, platform, …)</li>
              <li>Edges are product-architecture relationships for review</li>
              <li>Validate claims in chat against the live code when it matters</li>
            </ul>
          </section>

          <section id="repos" className="help-section">
            <h2>Repos</h2>
            <p>
              <Link to="/repos">Repos</Link> lists the fixed catalog. You cannot
              add or remove repositories here — only sync them to{" "}
              <code>main</code>.
            </p>
            <ol className="help-steps">
              <li>
                <strong>Update to main</strong> on one row refreshes that clone.
              </li>
              <li>
                <strong>Update all</strong> syncs every repo (also runs on a
                nightly schedule).
              </li>
              <li>
                Status, SHA, and last error help you see whether clones are
                ready before you chat.
              </li>
            </ol>
            <p className="help-note">
              Sync uses the GitHub CLI (<code>gh</code>) with your configured
              token — not interactive <code>git</code> in the UI.
            </p>
          </section>

          <section id="readmes" className="help-section">
            <h2>READMEs</h2>
            <p>
              <Link to="/readmes">READMEs</Link> renders each clone’s{" "}
              <code>README.md</code> (when present), including Mermaid diagrams.
              Filter by repo to skim onboarding docs without leaving the app.
            </p>
          </section>

          <section id="audit" className="help-section">
            <h2>Audit</h2>
            <p>
              <Link to="/audit">Audit</Link> is an evidence trail of actions —
              logins, chat activity, syncs, deletes, and more — with repo SHA
              snapshots where relevant. Use it when you need to show what was
              reviewed and against which revision.
            </p>
          </section>

          <section id="export" className="help-section">
            <h2>Export memos</h2>
            <p>
              From an active chat header (when expanded):
            </p>
            <ul className="help-bullets">
              <li>
                <strong>Export memo</strong> downloads a Markdown diligence memo
                for the thread.
              </li>
              <li>
                <strong>Print / PDF</strong> opens a print-friendly HTML version
                you can save as PDF from the browser.
              </li>
            </ul>
          </section>

          <section id="tips" className="help-section">
            <h2>Tips</h2>
            <ul className="help-bullets">
              <li>
                Prefer specific questions (“Where is auth enforced for X?”) over
                vague ones — you get tighter citations.
              </li>
              <li>
                Sync repos before a review session so answers match current{" "}
                <code>main</code>.
              </li>
              <li>
                Start with a playbook for coverage, then follow up in the same
                chat with sharper probes.
              </li>
              <li>
                Use the map to orient, then jump into chat on the subset of repos
                that matter for that slice.
              </li>
              <li>
                Collapse the chat header and keep the Evidence list open while
                you verify paths.
              </li>
            </ul>
            <p className="help-closing">
              Still stuck? Check sync status on Repos, confirm your selection on
              Chats or Playbooks, and try a narrower question with an explicit
              repo name.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
