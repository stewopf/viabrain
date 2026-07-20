# VIA Portfolio — Executive Overview

## Slide 0 — One-line thesis

VIA is a merchant operating platform—sites, leads, money, messaging, and AI assistants—backed by institutional code memory, agent-driven delivery, and ops tools built for non-engineers.

---

## Slide 1 — Portfolio map

| Pillar | Business meaning | Primary repos |
| --- | --- | --- |
| **The Relic** | Ask anything about how our systems actually work | `viabrain` (+ ops `/brain`) |
| **The Automaton** | Turn intent (a ticket) into shipped change | `sdlc-agent` |
| **Core product** | Run the merchant business—not just a website | `viamerchantapp2.0`, `viaconsole`, `viacore`, `viaassistant`, + platform services |
| **Reporting & ops** | See health and move releases without deep engineering | `viaopsdashboard`, `bhs` |
| **Quality & automation** | Ship with tests, promotion, and agent pipelines—not heroics | CI across apps, ops promote, `sdlc-agent` |
| **Mobile experience** | Meet merchants where they are (phone-first) | `bhs` live; broader mobile still TBD |

---

## Slide 2 — The Relic

**In one sentence:** Your product knowledge lives in a queryable system grounded in the real codebase.

**Three fundamental things it provides:**

1. Answers grounded in the actual multi-repo codebase—not tribal memory
2. On-demand and nightly sync so “what’s true” stays current with `main`
3. Safe, read-only exploration so leaders and builders can ask without risking production code

**Evidence:** `viabrain` (11-repo catalog; Cursor plan-mode agents)  
**Maturity:** Live

---

## Slide 3 — The Automaton

**In one sentence:** A specialist-agent pipeline that turns a Jira ticket into implementation, review, and a pull request.

**Three fundamental things it provides:**

1. End-to-end delivery chain: analyze → design → build → test → review → fix → document → PR / Jira update
2. Choice of execution engine (Claude Code or Cursor) per pipeline—adaptable to how the team works
3. Throughput leverage: specialists do the mechanical SDLC work so humans decide, not grind

**Evidence:** `sdlc-agent` (14 specialist agents; PR creator noted as still completing)  
**Maturity:** Emerging

---

## Slide 4 — Core product platform

**In one sentence:** A full merchant OS that outgrew website origins—acquire, schedule, invoice, message, get paid, and get help in one place.

**Three fundamental things it provides:**

1. Merchant day-to-day operations: leads, calendar, estimates/invoices, payments, messaging, and site management
2. Platform backbone: onboarding, site publishing, domains, SMS/mail/payments integrations, and real-time messaging
3. In-product AI help that acts—schedule, invoice, estimate, walk through the product—not just chat

**Evidence:** `viamerchantapp2.0`, `viaconsole`, `viacore`, `viaassistant`; supported by domain, genAI pages, sockets, notifications, photo/video assets  
**Maturity:** Live

---

## Slide 5 — Reporting & operations (non-technical teams)

**In one sentence:** Visibility and control for business and ops teams without requiring engineering to interpret every signal.

**Three fundamental things it provides:**

1. Release and environment control: promote builds, see environment state, tag releases (GitOps/ECR)
2. Merchant financial clarity in plain language (Business Health Score from bank data—listen, watch, or read)
3. Operational queues and metrics surfaces so ops can monitor work without digging into services

**Evidence:** `viaopsdashboard`, `bhs` (embedded in merchant app)  
**Maturity:** Live

---

## Slide 6 — Quality & automation

**In one sentence:** Delivery is designed to be tested and promoted through repeatable paths—not one-off heroics.

**Three fundamental things it provides:**

1. Automated test gates on core apps (unit/e2e patterns across merchant app, assistant, BHS, and others)
2. Standard build → promote paths so environments move in a controlled way
3. Agent-assisted quality in the delivery loop (test write/run, code + security review, fixer)

**Evidence:** GitHub `build` / `promote` / `vitest` / `playwright` workflows; `sdlc-agent` test & review stages  
**Maturity:** Live (strong automation); not claimed as fully hands-off end-to-end

---

## Slide 7 — Mobile experience

**In one sentence:** A phone-first experience exists today for business health; a broader native merchant mobile story is still being defined.

**Three fundamental things it provides:**

1. Mobile-first conversational Business Health Score (Spanish/English) for micro-merchants
2. Multi-modal delivery of insights—listen, video, or read—on a small screen
3. Intended path to a fuller field/mobile merchant experience (explicitly TBD)

**Evidence:** `bhs`; merchant app has `native-app` / device-sync surfaces—scope still open  
**Maturity:** Emerging (BHS live; wider mobile TBD)

---

## Closing — So what

1. **Today’s uniqueness:** a merchant OS plus a queryable code Relic and an agent Automaton—product, memory, and creation in one portfolio.
2. **Next leverage:** harden Automaton → shipped PRs, deepen assistant-driven merchant workflows, and decide the mobile bet beyond BHS.
3. **Still undefined:** the full mobile/field experience beyond conversational score—and how far “fully automated” delivery should go before human gates.
