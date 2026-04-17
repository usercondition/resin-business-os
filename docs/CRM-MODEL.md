# Resin OS — minimal CRM model

This app is a **small-shop CRM + ops layer** for resin print work: one pipeline from first message to shipped order, without enterprise bloat.

## Entities (what you track)

| Entity | Role |
|--------|------|
| **Customer** | Person or org you work with; contact fields, tags, timeline. |
| **Lead** | A sales opportunity or intake record (source, follow-up date, estimated value). |
| **Order** | The commercial unit of work: line items, status, payments, production. |
| **Conversation** | Email (and portal) messages tied to the customer for a single thread view. |
| **Timeline / audit** | What changed, when — for accountability and support. |

## Intake lanes (client-facing)

Three **non-overlapping** entry points:

1. **Inquiry** (`/public/inquiry`) — narrative first contact; creates **customer + lead + draft order** so you can reply and later attach the full order form.
2. **Quick item spec** (`/public/print-request`) — **structured line items** (type, qty, material, color) when the client already knows what they want but you are not ready for a full quote/order form.
3. **Full order form** (`/public/order-form`, optionally `?token=…` from an order) — **priced lines, tax, address**; blank for a new order, or tokenized to **update the same order** after an inquiry.

Staff configure links from **Intake** (`/intake`) in the app.

## Day-to-day flow (recommended)

1. Send **inquiry** link (or quick spec if they insist on a list first).
2. Qualify in **Leads** / **Customers**; use **Messages** for email back-and-forth.
3. From the **draft order** on that inquiry, use **Copy client edit link** → client completes **full order form** on the same order.
4. Run the job through **Orders** → production/delivery; **Portal** for low-friction client status + notes.

## What this app is not

- Not a generic marketing CRM (no campaigns, ads, or call lists).
- Not double-entry accounting (payments are lightweight).
- Not a file manager for every asset (S3 hooks exist for artifacts you choose to attach later).

Extend only where your shop actually feels pain.
