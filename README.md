# Serenity Courtyard Apartments — Demo Site

A fictional, comfort-inspired apartment lodge in Lusaka, Zambia. Portfolio/demo project — no real business.

## What's built (Phase 1 — public site)

- **Pages:** Home, Apartments, Restaurant, Pool, Garden, Gallery, Contact
- **Live booking flow:** Apartments page pulls real apartment data from Supabase, checks for overlapping dates before confirming (no double-booking), writes to the `bookings` table, and generates a booking reference (e.g. `SCA-4F9K2`)
- **Contact form:** writes to a `messages` table in Supabase
- **Design:** warm beige / forest green / charcoal / natural wood palette per the brief, Fraunces + Work Sans type pairing, an arch motif as the recurring signature element (nods to "Courtyard")
- **Extras included:** scroll reveal animations, mobile nav, FAQ accordion, gallery lightbox + category filters, menu tabs, toast notifications, page loader, reduced-motion support, lazy-loaded images

## Stack

Static HTML/CSS/JS (no build step) + Supabase for data — matching the pattern used on Urban Haven Lodge and Nkwazi River Lodge, rather than the PHP/MySQL stack in the original brief.

**Supabase project:** `amara-hill-villas` (project ref `cxznegvtrbeytljufycj`) — already provisioned with:
- `apartments` — the 5 apartment types, seeded
- `bookings` — apartment_id, guest details, dates, status (pending/confirmed/cancelled/checked_in/checked_out), booking_ref
- `messages` — contact form submissions
- `booking_availability` — a public view used for the no-double-booking check

RLS is on throughout. Public (anon) can: read apartments, insert bookings, insert messages, and read the availability view. Nothing else is publicly readable or writable.

## Phase 2 — Admin Dashboard (`/admin`)

Real login via Supabase Auth, gated behind a session check on every admin page.

**Demo admin login:** `admin@serenitycourtyard.demo` / `Courtyard#2026` — change this on first login from Settings → Change Password.

- **Dashboard** — total bookings, revenue, occupancy rate, available apartments, restaurant reservations, pending bookings, unread messages, checked-in count, a 6-month bookings chart, and a recent-bookings table
- **Bookings** — search/filter by guest, status, apartment; inline status changes; full edit modal; delete; print view
- **Apartments** — add/edit/delete, set pricing, toggle availability, manage features/images (image field takes URLs — no file upload/storage bucket in this pass)
- **Restaurant** — manage reservations made through the public site's new "Reserve a Table" flow (search/filter, status changes, delete)
- **Customers** — auto-built from booking history (grouped by email) with a booking-history view and an editable staff notes field per guest
- **Reports** — Occupancy, Revenue, Restaurant, and Booking Trends reports, each with CSV export (opens in Excel) and a "Print" button for PDF export via the browser
- **Settings** — business info, pricing (links to Apartments), email settings (stored, but no outbound mail provider is connected in this demo), and self-service password change

**Known simplifications, called out rather than hidden:**
- Apartment images are URL fields, not a file-upload/storage pipeline
- Guest confirmations: no backend email service is wired up. Guests get a "Send Confirmation via WhatsApp" button after booking/reserving (pre-fills a WhatsApp message to the property). Admin gets a "Send Confirmation" button on each row in Bookings/Reservations that opens a pre-written email in their own email app via a `mailto:` link — one click, no API keys, no dashboard setup, matches the WhatsApp pattern used elsewhere in the Apexscale lodge sites.
- Adding more admin accounts requires the Supabase dashboard (Authentication → Users) rather than an in-app "invite admin" flow — deliberately, so account creation isn't exposed in the client app
- Occupancy rate in Reports is computed against a fixed 90-day window as a simple approximation, not a real trailing-calendar calculation

## Running locally

Just open `index.html` in a browser, or serve the folder:

```
npx serve .
```

No build step, no env vars to set — the Supabase URL and anon key are already wired into `js/supabase-config.js`.
