# Craft N Sofa Frontend — System Context

**Document owner:** Manus AI  
**Repository:** `CraftNSofa/Craft-N-sofa-frontend-`  
**Analysis baseline:** repository state cloned for this implementation session  
**Purpose:** provide a durable technical reference for future development, review, and feature work.

## 1. Executive summary

This repository is a small React 19 + TypeScript + Vite single-page application styled with Tailwind CSS v4. Its current product is an **admin-oriented catalogue manager**, not yet a complete customer storefront or commerce backend. The application loads and mutates products in a Supabase `products` table, uploads product images to Supabase Storage, provides grid/table catalogue views, and includes a settings screen that exposes Supabase connection and SQL setup information.

The current implementation is browser-only and places data access directly in React components. It has local-storage-based session behavior, demo fallbacks, permissive database/storage policy SQL, and no order, category, ledger, expense, or analytics domain model. Phase 2 therefore requires extending the existing frontend and introducing secure persistence and authorization rather than merely adding more screens.

> **Important security finding:** the existing client automatically creates an `active_admin_session` token when no token exists, and the bundled SQL grants unrestricted table and storage write access. These behaviors are not suitable for a production admin dashboard and must be removed or replaced with authenticated, role-aware access control before launch.

## 2. Current architecture

The application follows a flat, component-driven SPA architecture. `src/main.tsx` mounts `App.tsx`; `App.tsx` owns authentication state, product state, filtering, loading/saving/deletion callbacks, modals, and most orchestration. Presentational and form responsibilities are delegated to components under `src/components/`. Supabase connection helpers and seed data live in `src/config/supabase.ts`.

```text
.
├── .env.example                 Environment variable notes for Gemini and APP_URL
├── .gitignore
├── KNOWLEDGE.md                 This system context document
├── bun.lock                     Bun dependency lockfile
├── index.html                   Vite HTML entry document
├── metadata.json                AI Studio/project metadata
├── package.json                 Scripts and runtime dependencies
├── tsconfig.json                TypeScript compiler configuration
├── vite.config.ts               Vite, React, Tailwind, alias, and HMR configuration
└── src
    ├── App.tsx                  Application shell and product-management orchestration
    ├── index.css                Tailwind CSS import
    ├── main.tsx                 React root bootstrap
    ├── types.ts                 Product, auth, Supabase, and toast types
    ├── components
    │   ├── Header.tsx            Header, search, category filter, actions, logout
    │   ├── LoginModal.tsx        Login/demo-mode UI
    │   ├── ProductCard.tsx       Product grid card and row actions
    │   ├── ProductForm.tsx       Product create/edit form and image upload UI
    │   ├── ProductTable.tsx      Compact product table
    │   ├── StatsOverview.tsx     Inventory statistics cards
    │   └── SupabaseSettingsModal.tsx
    │                             Connection settings and SQL setup instructions
    └── config
        └── supabase.ts           Client creation, local config, upload helper, seed data
```

## 3. Runtime and technology stack

| Area | Current implementation | Notes |
| --- | --- | --- |
| UI framework | React `^19.0.1` | Functional components and hooks. |
| Language | TypeScript `~5.8.2` | `noEmit`, bundler module resolution, JSX transform. |
| Build tool | Vite `^6.2.3` | Dev server on port 3000 and production build to `dist`. |
| Styling | Tailwind CSS `^4.1.14` with `@tailwindcss/vite` | Global stylesheet currently only imports Tailwind. |
| Icons | `lucide-react` | Used throughout dashboard controls and status cards. |
| Motion | `motion` | Available for UI animation; usage should be checked during refactor. |
| Data client | `@supabase/supabase-js` | Direct browser-side database and storage access. |
| Backend-related packages | `express`, `tsx`, `dotenv` | Present but no server entry point currently exists in the repository. |
| AI dependency | `@google/genai` | Declared but no confirmed production feature in the inspected application flow. |
| Package lock | `bun.lock` | Package scripts are npm/bun-compatible; use the project’s preferred package manager consistently. |

The `package.json` scripts are `dev`, `build`, `preview`, `clean`, and `lint`. The `lint` script runs `tsc --noEmit`; there is no ESLint, unit-test, end-to-end-test, or formatting script currently defined.

## 4. Application bootstrap and data flow

`src/main.tsx` imports the global stylesheet and renders `<App />` inside React `StrictMode`. `App.tsx` is the single stateful coordinator. On mount it reads `supabase_token` and `admin_email` from `localStorage`. If no token is found, it writes `active_admin_session` and immediately treats the visitor as authenticated. A special token value, `demo_admin_access_token`, toggles demo mode.

Once a token exists, `App.tsx` calls `loadProducts()`. The primary path uses the Supabase JavaScript client to select all products ordered by descending `created_at`. If the client call fails, it falls back to a REST request against `/rest/v1/products`. If that also fails, it loads `demo_products` from `localStorage`, then falls back to `INITIAL_SAMPLE_PRODUCTS`.

Product writes follow the same dual path. `handleSaveProduct` builds a payload containing product name, description, price, discount/original price, category, image URL, image array, colors, stock, featured flag, and timestamps. It first uses Supabase `.insert()` or `.update()`, then falls back to REST `POST` or `PATCH` if the client call returns an error. Delete uses Supabase first and REST `DELETE` as a fallback. After mutations, the application reloads the entire product list.

The data flow is therefore:

```text
User interaction
  → App callback
    → Supabase JS client
      → REST fallback on error
        → localStorage/sample fallback on read failure
          → App state
            → Header / StatsOverview / ProductForm / ProductCard / ProductTable
```

This approach is easy to understand but has duplicated access logic, no cache invalidation strategy, no optimistic updates, no transaction boundaries, and no server-side authorization boundary.

## 5. Component responsibilities and dependencies

| Component | Inputs / outputs | Responsibility |
| --- | --- | --- |
| `Header` | Search term, category, callbacks, connection state | Displays application branding, search and category filters, refresh/settings/logout actions, and navigation to the product form. |
| `StatsOverview` | Product list and selected category | Computes total products, stock/availability indicators, and inventory value for the active category. |
| `ProductForm` | Editing product, categories, save/cancel callbacks, saving state | Handles product fields, category selection/creation behavior as currently implemented, product metadata, and image selection/upload. |
| `ProductCard` | Product object and edit/delete/duplicate/image callbacks | Displays a rich product card with image, price, stock, category, and row actions. |
| `ProductTable` | Product list and edit/delete/duplicate callbacks | Displays the same catalogue in a compact tabular layout. |
| `LoginModal` | Login success and settings callbacks | Presents the existing login/demo entry flow. Its current token behavior must not be used as production authorization. |
| `SupabaseSettingsModal` | Open state, config update, demo state callbacks | Reads/writes local Supabase URL/key settings and displays SQL for creating the current products table and image bucket. |

`App.tsx` imports every feature component directly. There is no router, context provider, query library, global store, service layer, or domain-specific hook layer.

## 6. Current domain model

The central type is `Product` in `src/types.ts`:

| Field | Type | Current meaning |
| --- | --- | --- |
| `id` | `string \| number`, optional | Supabase product identifier. |
| `name` | `string` | Display name. |
| `description` | `string` | Product description. |
| `price` | `number` | Selling price in the current UI. |
| `discount_price` | `number \| null` | Discounted price. |
| `original_price` | `number \| null`, optional | Original/list price. The current save path sets it from `discount_price`, which should be corrected. |
| `category` | `string` | Denormalized category name; no category table exists. |
| `image_url` | `string` | Primary image URL. |
| `images` | `string[]` | Additional image URLs. |
| `colors` | `string[]` | Color options. |
| `stock` | `number` | Inventory quantity. |
| `featured` | `boolean` | Featured catalogue flag. |
| `variants` | `ProductVariant[] \| Record<string, any>`, optional | Variant metadata, stored as JSON in the current SQL. |
| `created_at`, `updated_at` | `string`, optional | Timestamp fields. |

Supporting types include `ProductVariant`, `SupabaseConfig`, `AuthSession`, and `ToastMessage`. The current type model does not represent users/roles, categories, orders, line items, payments, inventory movements, expenses, or reporting periods.

## 7. Supabase configuration and storage

`src/config/supabase.ts` reads a Supabase URL and key from local storage keys `supabase_custom_url` and `supabase_custom_key`. It falls back to hard-coded/configured defaults in the module. `getSupabaseClient()` creates a browser Supabase client and injects a locally stored bearer token when present. `getAuthHeaders()` builds REST headers with `apikey`, `Content-Type`, and an optional `Authorization` bearer header.

The image helper `uploadImageToSupabase(file, onProgress?)` sanitizes the filename, creates a path under `products/`, uploads to the `product-images` bucket, falls back to a `products` bucket, and returns a public URL. Product form behavior therefore already has the foundation for drag-and-drop storage-backed image handling, but the implementation must enforce file validation, authenticated upload policy, ownership/path rules, and deletion of abandoned assets.

The settings modal includes SQL for a `public.products` table with UUID IDs, product text/pricing fields, category text, image arrays, colors, stock, featured, variants JSONB, and timestamps. It also creates a public `product-images` bucket and policies. The existing policies permit public read and unrestricted insert/update/delete behavior; this is an explicit production blocker.

## 8. Existing UX behavior

The active screen renders a light-gray dashboard with a header, inventory statistic cards, product form, catalogue controls, and either a two-column product grid or compact table. Users can search across name/category/description/colors, filter by category, refresh, create/edit/delete/duplicate products, view an image lightbox, open Supabase settings, and log out.

Categories are currently derived from a hard-coded default list (`Sofa`, `Sofa Set`, `Corner Sofa`, `Bed`, `Chair`, `Table`, `Furniture`) plus unique category strings found in loaded products. This is not dynamic category management: category names are embedded in products and cannot be audited, ordered, archived, or safely renamed.

## 9. Environment and deployment assumptions

`.env.example` currently documents `GEMINI_API_KEY` and `APP_URL`, with comments suggesting an AI Studio/Cloud Run runtime. The inspected Vite client does not expose a formal `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` contract; instead, Supabase connection values can be entered and persisted in browser local storage. This is inconvenient for deployment and unsafe if privileged keys are ever entered.

The Vite server is configured for `0.0.0.0`, port `3000`, with HMR controlled by `DISABLE_HMR`. The `@` alias points to the repository root. The repository contains no confirmed server entry point, API routes, migrations directory, CI workflow, or deployment configuration.

## 10. Gaps relevant to Phase 2

| Required capability | Current state | Required architectural change |
| --- | --- | --- |
| Secure admin access | Local-storage token and auto-login placeholder | Supabase Auth or server-side session validation, admin role/allowlist, protected routes, no client-trusted admin token. |
| Dynamic categories | Derived strings in `App.tsx` | `categories` table, CRUD service, slug/order/active fields, product-category relationship or controlled foreign key. |
| Category-wise assignment | Single denormalized `product.category` string | Foreign key for single category or join table for multi-category assignment; migration and validation. |
| Drag-and-drop images | Storage helper exists; form integration is partial | Reusable dropzone, file/type/size validation, upload status, preview, primary-image selection, secure storage policies. |
| Orders | No order model or UI | Orders, line items, customer/contact data, status history, inventory reservation/decrement, realtime subscriptions. |
| Financial ledger | No cost-price or transaction model | Immutable order/line-item snapshots, product cost price, revenue/gross-profit calculations, ledger entries, currency and tax policy. |
| Expenses | Not present | Expense table with categories, date, amount, notes, attachments, and audit fields. |
| Analytics | Inventory cards only | Server/query aggregation for time windows, revenue/cost/profit/expense metrics, chart components, empty/loading/error states. |
| Storefront integration | Current repository is admin catalogue UI | Customer-facing catalogue/cart/checkout or integration with an existing commerce provider must be identified before production order flow. |
| Realtime | No subscriptions | Supabase Realtime for order/product changes, with reconnect and authorization handling. |
| Testing | No test framework | Add focused unit/component tests and at least a production build/typecheck gate. |

## 11. Recommended implementation boundaries

The safest extension is to preserve the existing React/Vite frontend while introducing a small domain/service layer and a normalized Supabase schema. React components should consume typed hooks or service functions rather than issuing raw database calls from `App.tsx`. Authentication and authorization must be enforced by Supabase Auth plus database Row Level Security; the browser must never contain a service-role key.

For orders, the implementation should use a status state machine such as `pending → confirmed → processing → shipped → delivered`, with explicit `cancelled` and `refunded` transitions. Each order should snapshot item name, selling price, and cost price at purchase time so historical financial reporting is not rewritten when a product changes later. Realtime order updates should be delivered through authorized Supabase channels rather than polling.

For reporting, gross profit should be calculated as captured revenue minus captured product cost, while operating profit should additionally subtract recorded operating expenses. Dashboard charts should clearly distinguish order date, payment/capture status, currency, and selected date range.

## 12. Files most likely to change in Phase 2

The current `App.tsx` should be reduced to shell/navigation responsibilities. `types.ts` should be expanded or split into domain types. `config/supabase.ts` should become a secure client/config module rather than a local-secret/settings mechanism. New modules should cover authentication, categories, products, images, orders, ledger, expenses, analytics, and reusable UI primitives. The existing product components can be retained and refactored to consume these services.

A migration directory should be added for schema, indexes, RLS policies, storage policies, triggers, and reporting views/functions. The settings modal should no longer display permissive SQL as a production setup mechanism; it may be replaced with deployment documentation and a connection-health panel that never exposes secrets.

## 13. Validation checklist

Before delivery, the implementation must pass TypeScript checking and a production Vite build. It should be manually verified for unauthenticated access, admin-only mutations, image upload validation, category CRUD, product assignment, order status updates, realtime refresh behavior, ledger arithmetic, expense totals, date-range analytics, mobile layout, and empty/error/loading states. Database policies should be reviewed to ensure public storefront reads are limited to published records and all management writes require the intended admin role.

## 14. Source-of-truth files

This document is derived from the repository files listed below and should be updated whenever their architecture changes:

| File | Role |
| --- | --- |
| `package.json` | Dependency and script source of truth. |
| `vite.config.ts` | Build, alias, dev-server, and HMR source of truth. |
| `tsconfig.json` | TypeScript compilation source of truth. |
| `src/main.tsx` | Runtime bootstrap source of truth. |
| `src/App.tsx` | Current application orchestration source of truth. |
| `src/types.ts` | Current domain type source of truth. |
| `src/config/supabase.ts` | Current Supabase, storage, fallback, and seed behavior source of truth. |
| `src/components/*` | Current UI responsibility and callback contracts source of truth. |
| `.env.example` | Documented environment-variable source of truth. |

## References

[1]: https://github.com/CraftNSofa/Craft-N-sofa-frontend- "Craft N Sofa Frontend repository"
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security documentation"
[3]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control documentation"

## 15. Current implementation status after Phase 2 work

The application shell has been upgraded in `src/App.tsx` and `src/index.css` into a responsive admin workspace with four areas: Overview, Products & Categories, Live Orders, and Finance & Reports. The preview supports local persistence through browser storage, product create/edit/delete flows, category creation/removal, drag-and-drop image preview, order status updates with a detail drawer, expense capture, ledger calculations, sales/expense visualizations, responsive navigation, and a demo login screen that no longer auto-authenticates silently.

The new UI intentionally labels local image previews and demo access as preview behavior. It does not claim that browser local storage is production persistence. The accompanying `supabase/migrations/001_admin_commerce.sql` defines the production-oriented normalized tables and admin-only RLS pattern required for categories, products, orders, line items, status history, expenses, and ledger entries. Before production use, the frontend service calls must be wired to those tables, Supabase Auth must assign `app_metadata.role = 'admin'`, and the existing unrestricted policies from the old settings SQL must be removed.

Validation completed successfully with `pnpm run lint` and `pnpm run build`. A local browser verification confirmed that the login screen, overview metrics/chart, navigation, recent orders, and product catalogue render without runtime errors.


## 13. Production integration update — August 2026

The admin workspace is now wired to the connected Supabase project at `zvkeixogcslxnehplbby`. Browser configuration is environment-based through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; editable browser local-storage credentials and demo auto-login were removed. Admin entry now uses Supabase email/password authentication with persisted sessions.

The commerce service layer in `src/lib/commerce.ts` provides authenticated catalogue, category, order, expense, Storage upload, and storefront order-creation operations. The dashboard loads remote data after authentication, persists product/category/expense/order mutations, and subscribes to Supabase Realtime order changes with cleanup on unmount. Product images are uploaded to the `product-images` Storage bucket and saved as public URLs; temporary object URLs are used only for previews.

Applied migrations are `001_admin_commerce.sql` for commerce tables and RLS foundations, `002_product_image_storage.sql` for the product image bucket and admin-only Storage writes, and `003_security_hardening.sql` for helper-function execution restrictions and fixed search paths. Supabase security advisors still report the Auth leaked-password-protection setting as disabled; that setting must be enabled in the Supabase Auth dashboard because it is not a database migration setting.

The repository passes `pnpm run lint` and `pnpm run build`. The remaining deployment requirement is to create the first authorised admin user and assign the expected admin role/profile in Supabase Auth and the existing profile mechanism before logging into the live dashboard.
