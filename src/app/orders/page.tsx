"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  fullName: string;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
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
  }>;
};

type ItemInput = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  materialType?: string;
  color?: string;
};

type OrderForm = {
  customerId: string;
  leadId: string;
  quoteId: string;
  dueDate: string;
  notes: string;
  tax: number;
  discount: number;
  items: ItemInput[];
};

type NewCustomerFields = {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
};

const ACTOR_HEADERS = {
  "Content-Type": "application/json",
  "x-user-id": "smoke-admin-1",
  "x-user-role": "ADMIN",
};

function emptyForm(): OrderForm {
  return {
    customerId: "",
    leadId: "",
    quoteId: "",
    dueDate: "",
    notes: "",
    tax: 0,
    discount: 0,
    items: [{ itemName: "", quantity: 1, unitPrice: 0, materialType: "", color: "" }],
  };
}

function emptyNewCustomer(): NewCustomerFields {
  return { fullName: "", phone: "", email: "", notes: "" };
}

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm());
  const [customerEntryMode, setCustomerEntryMode] = useState<"existing" | "new">("existing");
  const [newCustomer, setNewCustomer] = useState<NewCustomerFields>(emptyNewCustomer());
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === editingOrderId) ?? null,
    [orders, editingOrderId],
  );

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
      items: [...prev.items, { itemName: "", quantity: 1, unitPrice: 0, materialType: "", color: "" }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Creating order...");
    try {
      const itemsPayload = form.items.map((item) => ({
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        materialType: item.materialType || undefined,
        color: item.color || undefined,
      }));

      const payload =
        customerEntryMode === "new"
          ? {
              newCustomer: {
                fullName: newCustomer.fullName.trim(),
                phone: newCustomer.phone.trim() || undefined,
                email: newCustomer.email.trim() || undefined,
                notes: newCustomer.notes.trim() || undefined,
              },
              leadId: form.leadId || undefined,
              quoteId: form.quoteId || undefined,
              dueDate: form.dueDate || undefined,
              notes: form.notes || undefined,
              tax: Number(form.tax),
              discount: Number(form.discount),
              items: itemsPayload,
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

  function startEdit(order: OrderRow) {
    setEditingOrderId(order.id);
    setForm({
      customerId: order.customerId,
      leadId: order.leadId ?? "",
      quoteId: order.quoteId ?? "",
      dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
      notes: order.notes ?? "",
      tax: Number(order.tax),
      discount: Number(order.discount),
      items: order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        materialType: item.materialType ?? "",
        color: item.color ?? "",
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
        items: form.items.map((item) => ({
          itemName: item.itemName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          materialType: item.materialType || undefined,
          color: item.color || undefined,
        })),
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <h1 className="text-xl font-semibold">Manual Order Management</h1>
      <p className="minimal-muted mt-1 text-sm">
        Create, edit, and delete orders with item-level inputs and totals.
      </p>
      <p className="minimal-panel mt-3 text-sm">{message}</p>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">
          {editingOrderId ? "Edit Order" : "Create Order"}
        </h2>
        <form className="mt-3 grid gap-2" onSubmit={editingOrderId ? handleSaveEdit : handleCreate}>
          {!editingOrderId ? (
            <div className="grid gap-2">
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
                  Enter new customer
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
                        {customer.fullName} ({customer.id})
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
                      Phone (optional)
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={newCustomer.phone}
                        onChange={(event) =>
                          setNewCustomer((prev) => ({ ...prev, phone: event.target.value }))
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Email (optional)
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        type="email"
                        value={newCustomer.email}
                        onChange={(event) =>
                          setNewCustomer((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className="text-sm">
                    Customer notes (optional)
                    <textarea
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      rows={2}
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
                    {customer.fullName} ({customer.id})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-2 md:grid-cols-2">
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

          <div className="grid gap-2 md:grid-cols-3">
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
              Tax
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.tax}
                onChange={(event) => setForm((prev) => ({ ...prev, tax: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm">
              Discount
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.discount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discount: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <label className="text-sm">
            Notes
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <div className="mt-2">
            <h3 className="text-sm font-semibold">Order Items</h3>
            <div className="mt-2 grid gap-2">
              {form.items.map((item, index) => (
                <article className="rounded-md border border-[var(--border)] p-2" key={index}>
                  <div className="grid gap-2 md:grid-cols-5">
                    <input
                      className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                      placeholder="Item name"
                      required
                      value={item.itemName}
                      onChange={(event) => updateItem(index, { itemName: event.target.value })}
                    />
                    <input
                      type="number"
                      min={1}
                      className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                      placeholder="Qty"
                      required
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, { quantity: Number(event.target.value) })
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                      placeholder="Unit price"
                      required
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: Number(event.target.value) })
                      }
                    />
                    <input
                      className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                      placeholder="Material"
                      value={item.materialType}
                      onChange={(event) => updateItem(index, { materialType: event.target.value })}
                    />
                    <input
                      className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                      placeholder="Color"
                      value={item.color}
                      onChange={(event) => updateItem(index, { color: event.target.value })}
                    />
                  </div>
                  {form.items.length > 1 ? (
                    <button
                      className="mt-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                      onClick={() => removeItem(index)}
                      type="button"
                    >
                      Remove Item
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
            <button className="app-button mt-2" onClick={addItem} type="button">
              Add Item
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button className="minimal-cta" disabled={loading} type="submit">
              {editingOrderId ? "Save Order" : "Create Order"}
            </button>
            {editingOrderId ? (
              <button className="app-button" onClick={cancelEdit} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="minimal-panel mt-4">
        <h2 className="text-base font-semibold">Existing Orders</h2>
        <div className="mt-2 grid gap-2">
          {orders.map((order) => (
            <article className="rounded-md border border-[var(--border)] p-3" key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{order.orderNumber}</p>
                  <p className="minimal-muted text-xs">
                    {order.id} | status {order.status} | total {order.total} | balance {order.balanceDue}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className="app-button" href={`/orders/${order.id}`}>
                    View
                  </a>
                  <button className="app-button" onClick={() => startEdit(order)} type="button">
                    Edit
                  </button>
                  <button
                    className="app-button"
                    onClick={() => handleDelete(order.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      {selectedOrder ? (
        <p className="minimal-muted mt-2 text-xs">Currently editing: {selectedOrder.orderNumber}</p>
      ) : null}
    </main>
  );
}
