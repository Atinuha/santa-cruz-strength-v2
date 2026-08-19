# FitPrintBros — Order Management CRM Blueprint

## Prompt to Use in New Emergent Job

Copy everything below this line and paste it as your first message in the FitPrintBros Emergent job:

---

Build a staff-only Order Management CRM for FitPrintBros (fitprintbros.com), a custom print shop. This should be a Kanban-style order tracking board similar to a lead CRM, but adapted for print production workflow. Mobile-friendly for shop floor use.

## Core Features

### 1. Auth System (Staff Only)
- Email/password login with 2FA via email OTP
- "Remember this device for 7 days" option
- Role-based access: Owner (full access), Staff (can update orders, add notes), Viewer (read-only)
- Invite link system so owner can add new staff members

### 2. Kanban Order Board (Main Dashboard)
Columns representing production stages:
1. **Order Placed** — New order received
2. **Artwork Received** — Customer's design files received
3. **Artwork Proofed** — Proof sent/approved by customer
4. **Garments Ordered** — Blank garments ordered from supplier (if needed)
5. **Garments Arrived** — Blanks received in shop (if needed)
6. **In Production** — Currently being printed
7. **Packing** — Order packed and ready to ship
8. **Shipped / Completed** — Out the door
9. **On Hold / Blocked** — Any reason the job has not moved forward (with required reason note)

Each order card on the board should show:
- Customer name
- Order summary (e.g., "50x Custom Tees - Front Print")
- Due date with color coding (red if overdue, yellow if due within 2 days)
- Payment status badge (Paid, Partial, Unpaid)
- Priority indicator
- Arrow to open full order detail

### 3. Order Detail Page
When clicking into an order:
- **Customer Info**: Name, email, phone, shipping address, company name (optional)
- **Order Details**: Items ordered, quantities, sizes/colors breakdown, print locations (front, back, sleeve), special instructions
- **Dates**: Order date, expected completion date, actual ship date
- **File Attachments**: Upload/view design files, proofs, mockups (support images + PDFs)
- **Payment Status**: Paid / Partial / Unpaid, payment method, amount, balance due
- **Notes & Activity Log**: Timestamped log of all status changes, notes from staff, customer communications
- **Status Update**: Dropdown to move order to next stage (when moving to "On Hold/Blocked", require a reason note)
- **Quick Actions**: Call customer, text customer (Google Voice integration), send proof via email

### 4. Customer Notifications (Email + SMS)
- **Automated notifications** when order status changes:
  - "Your artwork proof is ready for review" (when moved to Artwork Proofed)
  - "Your order is now in production" (when moved to In Production)
  - "Your order has shipped!" (when moved to Shipped, include tracking number field)
  - "Your order is on hold" (when moved to Blocked, include reason)
- Use Resend for emails and MailerSend for SMS (same as Santa Cruz Strength CRM setup)
- Customizable email templates with merge fields ({customer_name}, {order_summary}, {tracking_number})
- **Daily Delivery Digest**: Do NOT send individual alerts for bounced emails or failed SMS. Instead, collect all failures throughout the day and send ONE summary email at end of day (6 PM) to the owner with a table of all bounced emails, failed SMS, and opt-outs. Auto-blacklist failed contacts so they don't receive future sends.

### 5. Dashboard Stats
Top cards showing:
- Orders This Week
- In Production count
- Overdue Orders
- Revenue This Month (sum of paid orders)

### 6. Search & Filters
- Search by customer name, email, phone, order number
- Filter by status, payment status, due date range
- Sort by due date (soonest first), order date, customer name

### 7. Quick Add Order
- Expandable quick-add bar for walk-in/phone orders
- Minimal fields: customer name, phone, order description, due date
- Can fill in full details later

### 8. CSV Export
- Export orders by status, date range
- Include all order details for bookkeeping

### 9. File Upload System
- Support image uploads (JPG, PNG) and PDFs for design files and proofs
- Thumbnail previews on order cards and detail pages
- Multiple files per order

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python), MongoDB (async with Motor)
- **Auth**: JWT + 2FA OTP via Resend email
- **Notifications**: Resend (email) + MailerSend (SMS)
- **File Storage**: Object storage for design files/proofs

## Design
- Dark theme for the CRM dashboard (easy on eyes in shop environment)
- Mobile-responsive — staff should be able to update order status from their phones on the shop floor
- Color-coded status badges and due date indicators
- Clean, functional UI focused on speed of use

## Order Data Model
```
{
  id, order_number (auto-increment like #FPB-001),
  customer: { name, email, phone, address, company },
  items: [{ description, quantity, sizes, colors, print_locations, special_instructions }],
  status, previous_status,
  hold_reason (required when status = "blocked"),
  dates: { ordered, due, completed, shipped },
  payment: { status, method, total, paid, balance },
  tracking_number,
  files: [{ id, name, type, url, uploaded_by, uploaded_at }],
  notes, tags,
  activity_log: [{ action, note, staff_name, timestamp }],
  created_at, updated_at
}
```

## Staff Account Setup
- Seed an owner account on startup: owner@fitprintbros.com
- Owner can invite staff via email invite links
- Staff can update orders, add notes, upload files
- Only owner can delete orders or manage staff accounts

---
