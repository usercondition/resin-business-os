"use client";

import { DeliveryStatus, OrderStatus, PaymentStatus, ProductionStatus } from "@prisma/client";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { formatUsd } from "@/lib/format-money";

type Customer = {
  id: string;
  fullName: string;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  productionStatus: string;
  paymentStatus: string;
  deliveryStatus?: string | null;
  total: string;
  balanceDue: string;
  dueDate?: string | null;
  notes?: string | null;
  tax: string;
  discount: string;
  leadId?: string | null;
  quoteId?: string | null;
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: string;
    materialType?: string | null;
    color?: string | null;
    printSpecJson?: unknown;
  }>;
};

type ItemInput = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  materialType?: string;
  color?: string;
  printSpecNotes: string;
};

type OrderForm = {
  customerId: string;
  leadId: string;
  quoteId: string;
  dueDate: string;
  notes: string;
  tax: number;
  discount: number;
  status: OrderStatus;
  productionStatus: ProductionStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus | "";
  items: ItemInput[];
};

type NewCustomerFields = {
  fullName: string;
  phone: string;
  email: string;
  preferredContactChannel: string;
  defaultAddress: string;
  notes: string;
};

const ACTOR_HEADERS = {
  "Content-Type": "application/json",
  "x-user-id": "smoke-admin-1",
  "x-user-role": "ADMIN",
};

function specNotesFromJson(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }
  const n = (json as { notes?: unknown }).notes;
  return typeof n === "string" ? n : "";
}

function emptyForm(): OrderForm {
  return {
    customerId: "",
    leadId: "",
    quoteId: "",
    dueDate: "",
    notes: "",
    tax: 0,
    discount: 0,
    status: OrderStatus.NEW,
    productionStatus: ProductionStatus.QUEUED,
    paymentStatus: PaymentStatus.PENDING,
    deliveryStatus: "",
    items: [{ itemName: "", quantity: 1, unitPrice: 0, materialType: "", color: "", printSpecNotes: "" }],
  };
}

function emptyNewCustomer(): NewCustomerFields {
  return { fullName: "", phone: "", email: "", preferredContactChannel: "", defaultAddress: "", notes: "" };
}

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm());
  const [customerEntryMode, setCustomerEntryMode] = useState<"existing" | "new">("existing");
  const [newCustomer, setNewCustomer] = useState<NewCustomerFields>(emptyNewCustomer());
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showInquiryDraftsOnly, setShowInquiryDraftsOnly] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === editingOrderId) ?? null,
    [orders, editingOrderId],
  );
  const visibleOrders = useMemo(
    () =>
      showInquiryDraftsOnly
        ? orders.filter((order) => order.orderNumber.startsWith("INQ-"))
        : orders,
    [orders, showInquiryDraftsOnly],
  );

  const subtotal = useMemo(
    () => form.items.reduce((s, i) => s + i.quantity * (Number.isFinite(i.unitPrice) ? i.unitPrice : 0), 0),
    [form.items],
  );
  const computedTotal = subtotal + form.tax - form.discount;

  useEffect(() => {
    void refreshData();
  }, []);

  async function refreshData() {
    try {
      const [customerRes, orderRes] = await Promise.all([
        fetch("/api/customers?page=1&pageSize=200", { headers: ACTOR_HEADERS }),
        fetch("/api/orders?page=1&pageSize=200", { headers: ACTOR_HEADERS }),
      ]);
      const customersJson = await customerRes.json();
      const ordersJson = await orderRes.json();
      setCustomers(customersJson.data ?? []);
      setOrders(ordersJson.data ?? []);
    } catch {
      setMessage("Failed to load order data");
    }
  }

  function updateItem(index: number, patch: Partial<ItemInput>) {
    setForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], ...patch };
      return { ...prev, items: next };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemName: "", quantity: 1, unitPrice: 0, materialType: "", color: "", printSpecNotes: "" },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  function buildItemsPayload() {
    return form.items.map((item) => ({
      itemName: item.itemName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      materialType: item.materialType || undefined,
      color: item.color || undefined,
      ...(item.printSpecNotes.trim()
        ? { printSpec: { notes: item.printSpecNotes.trim() } as Record<string, unknown> }
        : {}),
    }));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (customerEntryMode === "existing" && !form.customerId) {
      setMessage("Select an existing customer before creating the order.");
      return;
    }
    if (customerEntryMode === "new" && !newCustomer.email.trim() && !newCustomer.phone.trim()) {
      setMessage("New customer: enter an email or phone number.");
      return;
    }
    setLoading(true);
    setMessage("Creating order...");
    try {
      const itemsPayload = buildItemsPayload();
      const statusPayload = {
        status: form.status,
        productionStatus: form.productionStatus,
        paymentStatus: form.paymentStatus,
        ...(form.deliveryStatus ? { deliveryStatus: form.deliveryStatus as DeliveryStatus } : {}),
      };

      const payload =
        customerEntryMode === "new"
          ? {
              newCustomer: {
                fullName: newCustomer.fullName.trim(),
                phone: newCustomer.phone.trim() || undefined,
                email: newCustomer.email.trim() || undefined,
                preferredContactChannel: newCustomer.preferredContactChannel.trim() || undefined,
                defaultAddress: newCustomer.defaultAddress.trim() || undefined,
                notes: newCustomer.notes.trim() || undefined,
              },
              leadId: form.leadId || undefined,
              quoteId: form.quoteId || undefined,
              dueDate: form.dueDate || undefined,
              notes: form.notes || undefined,
              tax: Number(form.tax),
              discount: Number(form.discount),
              items: itemsPayload,
              ...statusPayload,
            }
          : {
              customerId: form.customerId,
              leadId: form.leadId || undefined,
              quoteId: form.quoteId || undefined,
              dueDate: form.dueDate || undefined,
              notes: form.notes || undefined,
              tax: Number(form.tax),
              discount: Number(form.discount),
              items: itemsPayload,
              ...statusPayload,
            };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: ACTOR_HEADERS,
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Order create failed");
      }
      setForm(emptyForm());
      setNewCustomer(emptyNewCustomer());
      setCustomerEntryMode("existing");
      setMessage("Order created");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order create failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(orderId: string) {
    if (!window.confirm("Delete this order and related records?")) return;
    setMessage("Deleting order...");
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: ACTOR_HEADERS,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Delete failed");
      }
      if (editingOrderId === orderId) {
        setEditingOrderId(null);
      }
      setMessage("Order deleted");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function copyClientEditOrderLink(orderId: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}/public-order-link`, {
        headers: ACTOR_HEADERS,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not generate client order link");
      }
      await navigator.clipboard.writeText(String(json.data.url));
      setMessage("Client editable order link copied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate client order link");
    }
  }

  function startEdit(order: OrderRow) {
    setShowManualForm(true);
    setEditingOrderId(order.id);
    setForm({
      customerId: order.customerId,
      leadId: order.leadId ?? "",
      quoteId: order.quoteId ?? "",
      dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
      notes: order.notes ?? "",
      tax: Number(order.tax),
      discount: Number(order.discount),
      status: order.status as OrderStatus,
      productionStatus: order.productionStatus as ProductionStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
      deliveryStatus: (order.deliveryStatus as DeliveryStatus) || "",
      items: order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        materialType: item.materialType ?? "",
        color: item.color ?? "",
        printSpecNotes: specNotesFromJson(item.printSpecJson),
      })),
    });
    setMessage(`Editing ${order.orderNumber}`);
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingOrderId) return;
    setLoading(true);
    setMessage("Saving order...");
    try {
      const payload = {
        customerId: form.customerId,
        leadId: form.leadId || undefined,
        quoteId: form.quoteId || undefined,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
        tax: Number(form.tax),
        discount: Number(form.discount),
        status: form.status,
        productionStatus: form.productionStatus,
        paymentStatus: form.paymentStatus,
        deliveryStatus: form.deliveryStatus ? (form.deliveryStatus as DeliveryStatus) : null,
        items: buildItemsPayload(),
      };

      const response = await fetch(`/api/orders/${editingOrderId}`, {
        method: "PUT",
        headers: ACTOR_HEADERS,
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Update failed");
      }
      setMessage("Order updated");
      setEditingOrderId(null);
      setForm(emptyForm());
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setEditingOrderId(null);
    setForm(emptyForm());
    setMessage("Edit cancelled");
  }

  const moneyInput =
    "mt-1 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)] focus-within:ring-2 focus-within:ring-[var(--ring)]";
  const moneyField = "min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none";

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <h1 className="text-xl font-semibold">Manual order management</h1>
      <p className="minimal-muted mt-1 text-sm">
        Create or edit orders with USD pricing, line-item specs, and workflow status. Totals preview below match
        submit (subtotal + tax − discount).
      </p>
      <p className="minimal-panel mt-3 text-sm">{message}</p>

      <section className="minimal-panel mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{editingOrderId ? "Edit order" : "Manual order entry"}</h2>
          {!showManualForm ? (
            <button className="minimal-cta" onClick={() => setShowManualForm(true)} type="button">
              New manual order
            </button>
          ) : (
            <button
              className="app-button"
              onClick={() => {
                if (!editingOrderId) {
                  setShowManualForm(false);
                }
              }}
              type="button"
            >
              Collapse form
            </button>
          )}
        </div>

        {showManualForm ? (
          <>
            <div className="minimal-muted mt-3 grid gap-1 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
              <p>
                <span className="font-medium text-[var(--text)]">Subtotal:</span> {formatUsd(subtotal)}
              </p>
              <p>
                <span className="font-medium text-[var(--text)]">Tax:</span> {formatUsd(form.tax)} ·{" "}
                <span className="font-medium text-[var(--text)]">Discount:</span> {formatUsd(form.discount)}
              </p>
              <p className="text-base font-semibold text-[var(--primary)]">Order total: {formatUsd(computedTotal)}</p>
            </div>

            <form className="mt-4 grid gap-4" onSubmit={editingOrderId ? handleSaveEdit : handleCreate}>
          {!editingOrderId ? (
            <div className="grid gap-3">
              <p className="text-sm font-semibold">Customer</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    checked={customerEntryMode === "existing"}
                    name="customerMode"
                    type="radio"
                    onChange={() => setCustomerEntryMode("existing")}
                  />
                  Existing customer
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    checked={customerEntryMode === "new"}
                    name="customerMode"
                    type="radio"
                    onChange={() => setCustomerEntryMode("new")}
                  />
                  New customer
                </label>
              </div>
              {customerEntryMode === "existing" ? (
                <label className="text-sm">
                  Select customer
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    required={customerEntryMode === "existing"}
                    value={form.customerId}
                    onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid gap-2 rounded-md border border-[var(--border)] p-3">
                  <label className="text-sm">
                    Full name
                    <input
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      required={customerEntryMode === "new"}
                      value={newCustomer.fullName}
                      onChange={(event) =>
                        setNewCustomer((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-sm">
                      Email
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        type="email"
                        value={newCustomer.email}
                        onChange={(event) =>
                          setNewCustomer((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Phone
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={newCustomer.phone}
                        onChange={(event) =>
                          setNewCustomer((prev) => ({ ...prev, phone: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <p className="text-xs text-[var(--muted)]">At least one of email or phone is required for a new customer.</p>
                  <label className="text-sm">
                    Preferred contact (optional)
                    <input
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={newCustomer.preferredContactChannel}
                      onChange={(event) =>
                        setNewCustomer((prev) => ({ ...prev, preferredContactChannel: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Default / shipping address (optional)
                    <textarea
                      className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={newCustomer.defaultAddress}
                      onChange={(event) =>
                        setNewCustomer((prev) => ({ ...prev, defaultAddress: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Customer notes (optional)
                    <textarea
                      className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={newCustomer.notes}
                      onChange={(event) =>
                        setNewCustomer((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <label className="text-sm">
              Customer
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                required
                value={form.customerId}
                onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Lead ID (optional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.leadId}
                onChange={(event) => setForm((prev) => ({ ...prev, leadId: event.target.value }))}
              />
            </label>
            <label className="text-sm">
              Quote ID (optional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.quoteId}
                onChange={(event) => setForm((prev) => ({ ...prev, quoteId: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Due date
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </label>
            <label className="text-sm">
              Tax ($)
              <div className={moneyInput}>
                <span className="pl-3 text-sm text-[var(--muted)]">$</span>
                <input
                  className={moneyField}
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.tax}
                  onChange={(event) => setForm((prev) => ({ ...prev, tax: Number(event.target.value) }))}
                />
              </div>
            </label>
            <label className="text-sm">
              Discount ($)
              <div className={moneyInput}>
                <span className="pl-3 text-sm text-[var(--muted)]">$</span>
                <input
                  className={moneyField}
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.discount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discount: Number(event.target.value) }))
                  }
                />
              </div>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Order status
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as OrderStatus }))}
              >
                {Object.values(OrderStatus).map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Production
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.productionStatus}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, productionStatus: e.target.value as ProductionStatus }))
                }
              >
                {Object.values(ProductionStatus).map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Payment
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paymentStatus: e.target.value as PaymentStatus }))
                }
              >
                {Object.values(PaymentStatus).map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Delivery (optional)
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.deliveryStatus}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    deliveryStatus: (e.target.value || "") as OrderForm["deliveryStatus"],
                  }))
                }
              >
                <option value="">—</option>
                {Object.values(DeliveryStatus).map((v) => (
                  <option key={v} value={v}>
                    {String(v).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-sm">
            Order notes
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <div>
            <h3 className="text-sm font-semibold">Line items</h3>
            <div className="mt-2 grid gap-3">
              {form.items.map((item, index) => (
                <article className="rounded-md border border-[var(--border)] p-3" key={index}>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">
                      Item / service name
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                        required
                        value={item.itemName}
                        onChange={(event) => updateItem(index, { itemName: event.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Quantity
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                        min={1}
                        required
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Unit price ($)
                      <div className={moneyInput}>
                        <span className="pl-2 text-sm text-[var(--muted)]">$</span>
                        <input
                          className={moneyField}
                          min={0}
                          required
                          step="0.01"
                          type="number"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(index, { unitPrice: Number(event.target.value) })
                          }
                        />
                      </div>
                    </label>
                    <p className="text-xs text-[var(--muted)] md:col-span-2">
                      Line total: {formatUsd(item.quantity * item.unitPrice)}
                    </p>
                    <label className="text-sm">
                      Material
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                        value={item.materialType}
                        onChange={(event) => updateItem(index, { materialType: event.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Color
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                        value={item.color}
                        onChange={(event) => updateItem(index, { color: event.target.value })}
                      />
                    </label>
                    <label className="text-sm md:col-span-2">
                      Print / build notes (optional)
                      <textarea
                        className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                        placeholder="Specs stored on the line item"
                        value={item.printSpecNotes}
                        onChange={(event) => updateItem(index, { printSpecNotes: event.target.value })}
                      />
                    </label>
                  </div>
                  {form.items.length > 1 ? (
                    <button
                      className="app-button mt-2 text-xs"
                      onClick={() => removeItem(index)}
                      type="button"
                    >
                      Remove line
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
            <button className="app-button mt-2" onClick={addItem} type="button">
              Add line item
            </button>
          </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button className="minimal-cta" disabled={loading} type="submit">
                  {editingOrderId ? "Save order" : "Create order"}
                </button>
                {editingOrderId ? (
                  <button className="app-button" onClick={cancelEdit} type="button">
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </>
        ) : (
          <p className="minimal-muted mt-3 text-sm">
            The manual entry form is collapsed. Use <strong>New manual order</strong> when you need to create one.
          </p>
        )}
      </section>

      <section className="minimal-panel mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Existing orders</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              checked={showInquiryDraftsOnly}
              onChange={(e) => setShowInquiryDraftsOnly(e.target.checked)}
              type="checkbox"
            />
            Show inquiry drafts only
          </label>
        </div>
        <div className="mt-2 grid gap-2">
          {visibleOrders.map((order) => (
            <article className="rounded-md border border-[var(--border)] p-3" key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {order.orderNumber}
                    {order.orderNumber.startsWith("INQ-") ? (
                      <span className="ml-2 rounded bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-normal">
                        Draft from inquiry
                      </span>
                    ) : null}
                  </p>
                  <p className="minimal-muted text-xs">
                    {order.status} · production {order.productionStatus} · payment {order.paymentStatus}
                    {order.deliveryStatus ? ` · delivery ${order.deliveryStatus}` : ""}
                  </p>
                  <p className="minimal-muted text-xs">
                    Total {formatUsd(Number(order.total))} · Balance {formatUsd(Number(order.balanceDue))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className="app-button" href={`/orders/${order.id}`}>
                    View
                  </a>
                  <button className="app-button" onClick={() => void copyClientEditOrderLink(order.id)} type="button">
                    Copy client edit link
                  </button>
                  <button className="app-button" onClick={() => startEdit(order)} type="button">
                    Edit
                  </button>
                  <button className="app-button" onClick={() => handleDelete(order.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {visibleOrders.length === 0 ? (
            <p className="minimal-muted text-sm">
              {showInquiryDraftsOnly ? "No inquiry drafts found." : "No orders yet."}
            </p>
          ) : null}
        </div>
      </section>
      {selectedOrder ? (
        <p className="minimal-muted mt-2 text-xs">Currently editing: {selectedOrder.orderNumber}</p>
      ) : null}
    </main>
  );
}
