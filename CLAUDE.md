# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NEXT Operations Portal — an internal operations platform covering project execution, procurement, engineering, field operations, reporting, and customer communications.

**Target stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase (future phase), deployed on Vercel. None of this is scaffolded yet — see "Repository state" below.

**Development philosophy:**
- Build modular components that can be reused across multiple workflow modules, not one-off per-module implementations.
- Prioritize clean architecture over quick fixes.
- The existing HTML prototype (see below) is a visual and functional reference only — port its behavior deliberately into the new stack, don't copy its code as production code.

## Current Phase: Phase 1 — BOM Release Workflow

Required functionality for this phase:
- CSV/BOM import
- Project creation and management
- Editable BOM table
- Release number assignment
- Procurement release generation
- HTML email generation
- Audit trail
- Change tracking
- Cost tracking
- Bulk actions
- Drag and drop row ordering

## Future Modules (later phases, not yet started)

- Welcome Letter Generator
- TKO (Technical Kickoff) Generator
- IKO (Implementation Kickoff) Generator
- Daily Reports
- Closeout Documents
- Project Dashboard
- Resource Planning
- Procurement Tracking

## Repository state

This repo currently contains only a static HTML prototype, not the Next.js application described above:

- `bom_release_prototype_v14.html` — a self-contained, dependency-free HTML/CSS/JS mockup of the Phase 1 BOM Release workflow. Everything (styles, markup, and logic) lives inline in this one file.
- There is no `package.json`, build tool, bundler, linter, or test runner yet. The `.gitignore` is a generic Node/JS template staged ahead of any actual tooling.

To view the prototype as-is, open the HTML file directly in a browser — there is no build step. Once the Next.js app is scaffolded, this section and the prototype's role should be revisited.

## Architecture of the HTML prototype (reference only)

`bom_release_prototype_v14.html` simulates the Phase 1 screen: upload, review, approve, and release a Bill of Materials for a project. Use this to understand intended behavior when implementing the real version — not as code to port verbatim.

- **State**: a single in-memory `rows` array of plain objects (`seq`, `mfr`, `part`, `desc`, `qty`, `unitCost`, `status`, `release`, `releasedAt`, `notes`, `audit`), plus `originalRows` (a snapshot used to diff-highlight edited cells) and `selected` (a `Set` of selected row indices for bulk actions). No persistence — state lives only in page JS until reload.
- **CSV/TSV import**: `parseDelimited` is a hand-rolled, quote-aware delimited-text parser that auto-detects the delimiter (`detectDelimiter`) and `parseCSVToRows` fuzzy-matches header names (`findVal`/`cleanKey`) against known field aliases (e.g. "Part #", "Part Number", "SKU" all map to `part`). Headerless files are detected via `headerScore` and given default headers.
- **Rendering**: `renderRows()` rebuilds the entire `<tbody>` from `rows` on every state change (no diffing) — edits, drag-reorder, filters, and bulk actions all just mutate `rows`/`selected` then call `renderRows()`.
- **Audit trail**: `trackChange`/`editInput` log every field edit into a per-row `audit` array (field, old/new value, user, timestamp); `changedClass`/`isChanged` compare live rows against `originalRows` to highlight changed cells (`.changed-cell`).
- **Releases**: rows are tagged with a `release` value (e.g. `"Release 1"`); `releaseNumberOptions`/`highestContinuousRelease` compute which release numbers are valid/available. `generateRelease()` only releases rows that are both `Approved` and assigned to the chosen release number, then builds a release email in three forms: plain text (`lastEmail`), HTML for clipboard/preview (`lastEmailHtml` via `buildEmailHtml`), and a `mailto:` draft (`openMailto`).
- **View options**: column visibility (`hiddenColumns`) and row filters (`rowFilters`: hide released / do-not-order / zero-qty) are client-side display toggles only — they never mutate `rows`.
