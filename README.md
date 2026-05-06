<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/overview-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="./public/overview-light.png" />
  <img alt="Lumen dashboard" src="./public/dashboard-dark.png" width="100%" />
</picture>

# Lumen

**Local analytics dashboard for Claude Code — with environmental impact tracking and mental health awareness.**

Reads directly from `~/.claude/`. No cloud, no API key, no telemetry.

---

## Why this exists

The standard Claude Code dashboard tells you what you've done. This one also asks **what it cost** — in dollars, in energy, and in rest.

- 🌱 **Ecological footprint** — LLM inference consumes real energy and water. This dashboard makes it visible, per model, per day, per token type.
- 🧠 **Mental health** — AI tools blur the line between focus and burnout. The disconnection panel tracks when you actually unplug.
- 💻 **Full technical depth** — sessions, costs, tools, projects, memory, streaks.

---

## Run from source

```bash
git clone https://github.com/sebWarembourg/Lumen.git
cd Lumen
npm install
npm run dev        # → http://localhost:3333
```

To point at a different Claude Code profile:

```bash
CLAUDE_CONFIG_DIR=~/.claude-work npm run dev
```

---

## What's inside

### Overview

<picture>
   <source media="(prefers-color-scheme: dark)" srcset="./public/overview-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="./public/overview-light.png" />
  <img alt="Dashboard overview" src="./public/dashboard-dark.png" />
</picture>

Sessions, tokens, estimated cost, and local storage at a glance. Trend cards with sparklines, date presets (7d / 30d / 90d / custom range picker), model distribution, peak hours, project activity, and recent sessions.

---

### 🌱 Environmental Impact

> *Every token has a cost beyond dollars.*

A dedicated **Impact** page estimates the energy (Wh), water (mL), and CO₂ (g) consumed by your Claude usage — broken down by model, day, and token type.

**Methodology:**
- Energy coefficients from Epoch AI research on LLM inference (input: 390 Wh/MTok · output: 5× at 1 950 Wh/MTok)
- PUE 1.14 (AWS datacenter overhead) · Water Usage Effectiveness: 1.8 mL/Wh
- Carbon intensity by grid: 🇺🇸 US (0.287 g CO₂/Wh) · 🇪🇺 EU (0.25) · 🇫🇷 France (0.06, nuclear)
- Model-size multipliers: Opus × 2.5 · Haiku × 0.4 · Sonnet × 1.0

**Panels:** hero KPIs (energy / water / CO₂), relatable equivalences (LED hours, EV km, flights Paris→NY), impact over time, impact by model, token-type breakdown donut, full factors table with sources.

---

### 🧠 Disconnection

![Activity calendar](./public/activity.png)

> *From the "AI Brain Fry" talk: are you actually unplugging?*

Inside the **Activity** page, the **Disconnection** block tracks the gaps — time spent *without* Claude.

| Metric | What it means |
|---|---|
| **Break en cours** | Consecutive days without Claude (0 = used today) |
| **Repos / 30j** | % of the last 30 days with no activity |
| **Record** | Longest disconnection streak ever |

A bar chart shows every gap in your history, color-coded:
- 🔴 1–2 days · 🟡 3–6 days · 🟢 7+ days (reference line for a real break)

---

### Projects

![Projects](./public/projects.png)

Searchable, sortable project grid. Per-project: sessions, duration, estimated cost, languages, git branches, MCP/agent badges, top tools. Detail pages with cost over time, language distribution, branch activity.

---

### Sessions

![Session replay](./public/session.png)

Full session replay from JSONL. Badges for compaction, agents, MCP, extended thinking. Responses in GitHub-flavored Markdown. Tool calls and file cards inline. Per-turn cost and token breakdown.

---

### Costs

![Costs](./public/costs.png)

Total cost, cache savings, cost without cache, cost over time, cost by project, per-model breakdown, cache efficiency panel.

---

### Tools & Features

![Tools](./public/tools.png)

Tool ranking, categories (file I/O, shell, agents, web, MCP…), feature adoption, error analysis, version history, git branch analytics.

---

### Activity

![Activity calendar](./public/activity.png)

GitHub-style heatmap, current streak, longest streak, peak hours, day-of-week patterns, and the Disconnection panel.

---

### Local Claude Code Files

![Todos](./public/todos.png)

History, Todos, Plans, Memory, and Settings — read directly from `~/.claude/`.

---

## Navigation

- Global search: `Cmd+K` / `Ctrl+K` / `/`
- Session navigation: `j` / `k` · `Enter` to open · `Esc` to clear
- Page shortcuts: `g s` Sessions · `g p` Projects · `g c` Costs
- Responsive: desktop sidebar, mobile bottom nav, light/dark themes

---

## Data sources

| Path | Used for |
|---|---|
| `~/.claude/projects/<slug>/*.jsonl` | Session replay, tokens, tools |
| `~/.claude/stats-cache.json` | Aggregate stats (fast path) |
| `~/.claude/usage-data/session-meta/` | Metadata fallback |
| `~/.claude/history.jsonl` | Command history |
| `~/.claude/todos/` · `plans/` · `memory/` | Local files |
| `~/.claude/settings.json` | Settings, skills, MCP config |

---

## Privacy

Runs entirely locally. No login, no API key, no telemetry. Your data stays on your machine.

---

## Credits

Originally derived from [cc-lens](https://github.com/Arindam200/cc-lens) by [@Arindam200](https://github.com/Arindam200).
Lumen — the standalone evolution — is built and maintained by [@sebWarembourg](https://github.com/sebWarembourg), with Impact tracking, Disconnection panel, theme fixes, and UX improvements layered on top.
