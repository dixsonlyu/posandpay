

# Full POS System Upgrade Plan

This plan covers all requested changes: UI fixes, financial logic, order lifecycle, and four new modules.

---

## Part A: UI Fixes (TabletPOS)

### A1. Wider Drag Handle with Gradient Style
**Current**: Drag handles are 1px wide with a small pill — hard to touch.
**Change**: Replace the `w-px` drag dividers in `TabletPOS.tsx` with `w-3` (12px) touch zones. Style with a vertical gradient: transparent → border-color → transparent, with a centered darker line. Remove the pill element. The entire strip triggers `startDrag()`.

### A2. Hide Scrollbars Until Scrolling
**Current**: `pos-scrollbar` in `index.css` shows custom scrollbar always.
**Change**: Update `.pos-scrollbar` to hide scrollbar by default (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`). On hover/scroll, show native system scrollbar using a `.scrolling` class toggled via CSS `:hover` or a thin auto-hide approach. Simpler: use `overflow: auto` + `scrollbar-gutter: stable` with hidden-until-hover via `opacity: 0 → 1` on the scrollbar thumb.

### A3. Unified Header Heights
**Current**: FloorPanel header uses `px-3 py-2.5`, MenuComposer uses `px-5 py-2.5`, CheckPanel uses `p-4`. Different visual heights.
**Change**: Standardize all three panels to use the same height (e.g., `h-[52px]` with consistent padding), so the top border-b line aligns across all three columns.

### A4. Order History List Layout Fix
**Current**: `grid-cols-[64px_minmax(0,1fr)_auto]` layout breaks on narrow widths. Order ID `#4651` positioned oddly via `ml-auto` inside flex.
**Change**: 
- Move order ID (`#{order.id.slice(-4)}`) to the top-right of each row as a subtle label instead of inline with payment info.
- Make the grid responsive: switch to a flex/stack layout when the panel is narrow.
- Ensure table number always shows when present.
- Add `overflow-hidden` and `text-ellipsis` on wrapping elements.

---

## Part B: Business Logic

### B1. Financial Calculations (2-decimal rounding)
**Files**: `TabletPOS.tsx` (`recalcOrder`), `CheckPanel.tsx`, `MobilePOS.tsx`
- Wrap all monetary computations with `Math.round(x * 100) / 100`
- Discount applied first, then service charge (10% of adjusted subtotal), then GST (9% of subtotal + service charge)
- Split bill: divide total equally, add rounding remainder to last share
- Already mostly correct in CheckPanel; just add explicit rounding at each step.

### B2. Order Lifecycle State Machine
**File**: `TabletPOS.tsx` + new `src/lib/order-state-machine.ts`
- Define valid transitions: `open → sent → preparing → ready → served → paid`, plus `void` from any state.
- `void` requires manager PIN check (prompt dialog against `staffMembers` with role "manager").
- On `paid`: set table status to `"dirty"`.
- Add table cleaning flow handlers: `dirty → cleaning → available` (click dirty table → confirm → cleaning; click cleaning → available).
- Wire into FloorPanel's `handleTableClick` for dirty/cleaning status.

### B3. Inventory Deduction (stub)
- When order status → "sent", call a deduction function.
- This will be fully implemented with the Inventory module (C1).
- For now, add the hook point in `TabletPOS.tsx`.

---

## Part C: New Modules

### C1. Inventory Management (`/admin/inventory`)

**New files**:
- `src/state/inventory-store.ts` — reactive store (same pattern as `menu-store.ts`) with `InventoryItem` type (id, name, nameZh, sku, category, unit, currentStock, reorderPoint, costPerUnit, supplier, lastRestocked, expiryDate)
- `src/pages/admin/AdminInventory.tsx` — full page with:
  - KPI cards (Total SKUs, Low Stock Alerts, Total Value, Expiring Soon)
  - Tabs: Stock List / Purchase Orders / Stock Movement Log
  - Searchable table with progress bars for stock levels
  - Color-coded status badges
  - Inline stock adjustment modal (receive/waste/transfer with reason codes)
  - Purchase order creation form
  - Movement history log

**Database migration**: Create `inventory_items`, `purchase_orders`, `purchase_order_items`, `stock_movements` tables. Create `menu_item_ingredients` junction table for menu-inventory linking.

### C2. Professional CRM (`/admin/crm` upgrade)

**Changes**:
- Expand `Customer` type in `mock-data.ts` with: `dateOfBirth`, `address`, `tags[]`, `totalSpend`, `averageTicket`, `preferredItems[]`, `notes`, `createdAt`, `segment`
- Create `src/state/customer-store.ts` (reactive store)
- Complete rewrite of `AdminCRM.tsx`:
  - KPI dashboard cards (Total Customers, New This Month, Avg Spend, Retention Rate)
  - Customer segment filters (new/regular/VIP/at-risk/churned) with auto-classification
  - Expandable customer detail panel (profile, visit timeline, spend chart, tags, notes)
  - Search by name/phone/email/membership
  - Bulk actions bar (send promo, update tier, export)
  - Loyalty section: points balance, tier progression, point history
  - Birthday tracking with upcoming list

### C3. Floor Plan Editor (`/admin/floorplan`)

**New files**:
- `src/state/floorplan-store.ts` — stores table positions (`x`, `y`, width, height) per zone
- `src/pages/admin/AdminFloorPlan.tsx`:
  - Grid canvas with drag-and-drop table placement
  - Table shapes: round (2-4), square (4), rectangular (6-8), booth (4-6)
  - Add/remove/resize tables
  - Zone management (create/rename/reorder)
  - Snap-to-grid with alignment guides
  - Save layout per zone
  - Preview mode with real-time status overlay
  - Uses HTML5 drag or pointer events (no external lib needed)

### C4. Queue Management (`/admin/queue` + `/queue`)

**New files**:
- `src/state/queue-store.ts` — reactive store for `QueueEntry` (id, partySize, customerName, customerPhone, estimatedWait, status, joinedAt, calledAt, seatedAt, notes, preferredZone)
- `src/pages/admin/AdminQueue.tsx`:
  - Real-time queue board with wait count and average wait
  - Add walk-in form (party size, contact)
  - Call next action with visual notification
  - Entry states: Waiting → Called → Seated / No-Show
  - Historical stats: avg wait, no-show rate, peak hours
  - Configurable wait time per party size
- `src/pages/QueueKiosk.tsx` (public `/queue` route):
  - Clean customer-facing display showing queue position
  - Self-service join queue form
  - Real-time position updates

**Database migration**: Create `queue_entries` table with RLS policies.

---

## Part D: Routes & Navigation

### App.tsx
Add routes:
```
/admin/inventory   → AdminInventory
/admin/floorplan   → AdminFloorPlan
/admin/queue       → AdminQueue
/queue             → QueueKiosk
```

### AdminLayout.tsx
Add sidebar nav items:
- Inventory (Package icon) — after Promotions
- Floor Plan (Map icon) — after Inventory
- Queue (ListOrdered icon) — after Floor Plan

---

## Database Migrations

Two migrations needed:

**Migration 1: Inventory tables**
- `inventory_items` (id, name, name_zh, sku, category, unit, current_stock, reorder_point, cost_per_unit, supplier, last_restocked, expiry_date, created_at, updated_at)
- `purchase_orders` (id, supplier, status, expected_delivery, notes, total_cost, created_at, updated_at)
- `purchase_order_items` (id, purchase_order_id, inventory_item_id, quantity, unit_cost)
- `stock_movements` (id, inventory_item_id, type, quantity, reason, notes, created_at)
- `menu_item_ingredients` (menu_item_id, inventory_item_id, quantity_per_serving)

**Migration 2: Queue table**
- `queue_entries` (id, party_size, customer_name, customer_phone, estimated_wait, status, joined_at, called_at, seated_at, notes, preferred_zone, created_at)

All tables with public RLS policies (matching existing POS pattern).

---

## Implementation Order

1. Database migrations (inventory + queue tables)
2. UI fixes (drag handles, scrollbars, header alignment, order history)
3. Financial calculations + order lifecycle logic
4. State stores (inventory, customer, floorplan, queue)
5. New admin pages (Inventory, CRM rewrite, FloorPlan, Queue)
6. Queue kiosk public page
7. Routes + navigation updates

**Estimated file changes**: ~15 new files, ~8 modified files.

