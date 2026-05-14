# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # Start dev server (http://localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint check
```

No test suite is configured.

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (auth + database), Tiptap v3 (rich text), Recharts v3 (analytics).

**Package manager:** pnpm (use `pnpm`, not `npm`).

**Route structure:**
- `app/login/` — login page (public)
- `app/(dashboard)/` — all authenticated pages sharing the sidebar layout (`layout.tsx`)
- Dashboard default (`/`) redirects to `/merchant-dashboard`

**Dashboard pages:**

| Route | Purpose |
|---|---|
| `/merchant-dashboard` | Merchant listing with search/pagination |
| `/merchant-detail` | Read-only merchant detail view |
| `/merchant-edit` | Merchant edit form (rich text, image upload) |
| `/merchant-delete` | Delete confirmation with typed confirmation |
| `/franchise-categories` | Category master data (inline CRUD) |
| `/franchise-model` | Franchise model master data |
| `/franchise-system` | Franchise system master data |
| `/franchise-outlet-type` | Outlet type master data |
| `/franchise-support` | Support items linked to a merchant |
| `/franchise-keunggulan` | Keunggulan (advantages) linked to a merchant |
| `/franchise-image-outlet` | Outlet photos linked to a merchant |
| `/analytics` | Likes analytics (Recharts charts) |

**Data layer:** All data comes from Supabase. The client is a singleton at `lib/supabase.ts`. Auth session is stored in `sessionStorage` as `sf_user`; logout calls `supabase.auth.signOut()` then redirects to `/login`.

**Utilities (`lib/utils.ts`):**
- `formatIDR` — formats numbers as Indonesian Rupiah
- `formatDate` — formats ISO dates to Indonesian locale
- `resolveImg` — converts Google Drive share URLs and Squarespace CDN URLs to direct image URLs (images are served via `lh3.googleusercontent.com`)
- `getYoutubeEmbedUrl` — extracts YouTube embed URLs

**Styling system:** Tailwind v4 is imported but the app uses a hand-crafted `sf-` prefixed class system defined in `app/globals.css` and `app/reference.css`. Do NOT use Tailwind utility classes — use the existing `sf-*` classes. The reset is scoped to `.sf-layout *`, so styles only apply inside the dashboard layout. Key design tokens are CSS variables defined on `:root` (e.g. `--sf-primary: #099dff`, `--sf-accent: #b2de25`).

**Shared components (`app/components/`):**
- `Sidebar` — navigation with mobile hamburger, active-link detection, logout
- `Toast` — fixed bottom-right notification (success/error)
- `DeleteModal` — confirm-before-delete modal
- `RichTextEditor` — Tiptap-based editor with toolbar (bold, italic, underline, lists, links, color)

**Images:** Remote images only from `lh3.googleusercontent.com` (configured in `next.config.ts`). Always pass image URLs through `resolveImg` before rendering with `<img>` or `<Image>`.
