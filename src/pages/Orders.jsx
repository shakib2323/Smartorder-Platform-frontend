import { useEffect, useState } from "react";
import * as api from "../api";
import { Link, navigate } from "../router";
import { useToast } from "../state";
import { errorText, formatDate, formatMoney, ORDER_STATUSES, STATUS_HELP, titleCase, useLoad } from "../utils";
import Icon from "../components/Icon";
import { Breadcrumbs, Button, ConfirmDialog, Empty, ErrorBox, LinkButton, Modal, Notice, Pagination, Select, Spinner, StatusBadge, TextInput } from "../components/ui";

const BASE = { customer: "/orders", admin: "/admin/orders", seller: "/seller/orders" };

/* ---------- list ---------- */

export function OrdersList({ mode }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const loader = () => (mode === "seller" ? api.sellerOrders.list({ page, size: 10, status }) : api.orders.list({ page, size: 10, status }));
  const list = useLoad(loader, [mode, page, status]);
  const title = mode === "seller" ? "Orders for your brand" : mode === "admin" ? "All orders" : "My orders";
  const data = list.data;

  return (
    <div className={mode === "customer" ? "container page" : ""}>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{data ? data.totalElements + " in total" : "Loading"}</p>
        </div>
        <div className="page-head-actions">
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </div>
      </div>
      {list.loading && !data && <Spinner label="Loading orders" />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {data && data.content.length === 0 && (
        <Empty icon="receipt" title="No orders here" text={status ? "No orders have this status." : mode === "customer" ? "When you place an order it will show up here." : "Orders will appear as customers buy."}
          action={mode === "customer" && !status ? <LinkButton to="/shop">Start shopping</LinkButton> : null} />
      )}
      {data && data.content.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Date</th><th>Brand</th><th>Type</th><th>Status</th><th className="num">Total</th><th /></tr>
              </thead>
              <tbody>
                {data.content.map((o) => (
                  <tr key={o.id} className="row-link" onClick={() => navigate(BASE[mode] + "/" + o.id)}>
                    <td data-label="Order"><strong>#{o.id}</strong></td>
                    <td data-label="Date">{formatDate(o.createdAt)}</td>
                    <td data-label="Brand">{o.brandName || "-"}</td>
                    <td data-label="Type">{o.orderType === "RESERVATION" ? "Reservation" : "Purchase"}</td>
                    <td data-label="Status"><StatusBadge status={o.status} /></td>
                    <td data-label="Total" className="num"><strong>{formatMoney(o.totalAmount)}</strong></td>
                    <td className="chev"><Icon name="chevronRight" size={18} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}

export function CustomerOrders() {
  return <OrdersList mode="customer" />;
}

/* ---------- detail ---------- */

function useCountdown(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return { over: true, text: "time is up" };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return { over: false, text: (h ? h + "h " : "") + m + "m " + String(s % 60).padStart(2, "0") + "s" };
}

function Timeline({ order }) {
  const bad = ["REJECTED", "CANCELLED", "EXPIRED"].includes(order.status);
  const steps = [
    { label: "Placed", at: order.createdAt, done: true },
    { label: order.orderType === "RESERVATION" && order.status === "RESERVED" ? "Reserved" : "Confirmed", done: ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status) },
    { label: "Shipped", at: order.shippedAt, done: ["SHIPPED", "DELIVERED"].includes(order.status) },
    { label: "Delivered", at: order.deliveredAt, done: order.status === "DELIVERED" }
  ];
  if (bad) {
    return (
      <div className={"timeline-bad tone-" + order.status.toLowerCase()}>
        <Icon name="alert" /> <div><strong>{titleCase(order.status)}</strong><span>{STATUS_HELP[order.status]}</span></div>
      </div>
    );
  }
  return (
    <ol className="timeline">
      {steps.map((s) => (
        <li key={s.label} className={s.done ? "done" : ""}>
          <i>{s.done ? <Icon name="check" size={14} /> : null}</i>
          <strong>{s.label}</strong>
          <span>{s.at ? formatDate(s.at) : s.done ? "" : "Waiting"}</span>
        </li>
      ))}
    </ol>
  );
}

function ShipModal({ order, onClose, onDone }) {
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onDone(await api.sellerOrders.ship(order.id, tracking.trim()));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={"Ship order #" + order.id} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Mark as shipped</Button></>}>
      <TextInput label="Tracking number" hint="Optional, up to 60 characters" maxLength={60} value={tracking} onChange={(e) => setTracking(e.target.value)} autoFocus />
      <ErrorBox error={error} />
    </Modal>
  );
}

export function OrderDetail({ id, mode }) {
  const toast = useToast();
  const load = () => (mode === "seller" ? api.sellerOrders.get(id) : api.orders.get(id));
  const res = useLoad(load, [id, mode]);
  const o = res.data;
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const countdown = useCountdown(o && o.status === "RESERVED" ? o.reserveExpiresAt : null);

  // stock is reserved in the background, so keep checking until the order leaves PENDING
  useEffect(() => {
    if (!o || o.status !== "PENDING") return undefined;
    const t = setInterval(() => res.refresh(), 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o && o.status]);

  const act = async (call, message) => {
    setBusy(true);
    try {
      res.setData(await call());
      toast.success(message);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const openPdf = async () => {
    try {
      await (mode === "seller" ? api.sellerOrders.openInvoicePdf(id) : api.orders.openInvoicePdf(id));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const base = BASE[mode];
  if (res.loading && !o) return <div className="container page"><Spinner /></div>;
  if (res.error) return <div className={mode === "customer" ? "container page" : ""}><Empty icon="receipt" title="Could not open this order" text={errorText(res.error)} action={<LinkButton to={base} variant="outline">Back to orders</LinkButton>} /></div>;

  const hasInvoice = ["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(o.status);
  const canCancel = mode !== "seller" && ["CONFIRMED", "RESERVED"].includes(o.status);
  const a = o.shippingAddress;

  return (
    <div className={mode === "customer" ? "container page" : ""}>
      <Breadcrumbs items={[{ label: mode === "customer" ? "My orders" : "Orders", to: base }, { label: "Order #" + o.id }]} />
      <div className="page-head">
        <div>
          <h1>Order #{o.id} <StatusBadge status={o.status} /></h1>
          <p className="muted">{o.orderType === "RESERVATION" ? "Reservation" : "Purchase"} from {o.brandName} &middot; placed {formatDate(o.createdAt)}</p>
        </div>
        <div className="page-head-actions">
          {hasInvoice && (
            <>
              <LinkButton to={base + "/" + o.id + "/invoice"} variant="outline" icon="receipt">View invoice</LinkButton>
              <Button variant="outline" icon="download" onClick={openPdf}>PDF</Button>
            </>
          )}
        </div>
      </div>

      {o.status === "PENDING" && <Notice type="info" icon="clock">We are reserving the stock. This page updates by itself.</Notice>}
      {o.status === "RESERVED" && (
        <Notice type="warning" icon="clock">
          Your items are on hold. {countdown && !countdown.over ? <>Confirm within <strong>{countdown.text}</strong> (until {formatDate(o.reserveExpiresAt)}).</> : "The hold time is over, the stock will be released."}
        </Notice>
      )}

      <div className="card"><Timeline order={o} /></div>

      <div className="detail-cols">
        <div>
          <div className="card table-card">
            <h3 className="card-title pad">Items</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th className="num">Price</th><th className="num">Qty</th><th className="num">GST</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.productId}>
                      <td data-label="Product">
                        <Link to={"/product/" + i.productId}><strong>{i.productName}</strong></Link>
                        <div className="muted small">{[i.size && "Size " + i.size, i.color, i.sku && "SKU " + i.sku].filter(Boolean).join(" / ")}</div>
                        {i.offerTitle && Number(i.discountAmount) > 0 && <div className="offer-chip"><Icon name="tag" size={12} /> {i.offerTitle}: {formatMoney(i.discountAmount)} off</div>}
                      </td>
                      <td data-label="Price" className="num">{formatMoney(i.unitPrice)}</td>
                      <td data-label="Qty" className="num">{i.quantity}</td>
                      <td data-label="GST" className="num">{Number(i.gstRatePercent)}%</td>
                      <td data-label="Total" className="num"><strong>{formatMoney(i.lineTotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(o.trackingNumber || o.shippedAt) && (
            <div className="card">
              <h3 className="card-title">Shipping</h3>
              <dl className="spec">
                {o.trackingNumber && <div><dt>Tracking number</dt><dd>{o.trackingNumber}</dd></div>}
                {o.shippedAt && <div><dt>Shipped</dt><dd>{formatDate(o.shippedAt)}</dd></div>}
                {o.deliveredAt && <div><dt>Delivered</dt><dd>{formatDate(o.deliveredAt)}</dd></div>}
              </dl>
            </div>
          )}
        </div>

        <aside>
          <div className="card summary">
            <h3 className="card-title">Payment summary</h3>
            <div className="sum-row"><span>Subtotal</span><b>{formatMoney(o.subtotal)}</b></div>
            {Number(o.discountTotal) > 0 && <div className="sum-row save"><span>Offer discount</span><b>-{formatMoney(o.discountTotal)}</b></div>}
            <div className="sum-row"><span>Delivery</span><b>{Number(o.shippingFee) > 0 ? formatMoney(o.shippingFee) : "Free"}</b></div>
            <div className="sum-total"><span>Total to pay</span><strong>{formatMoney(o.totalAmount)}</strong></div>
            <div className="tax-box">
              <small>GST included in the price</small>
              <div className="sum-row"><span>Taxable value</span><b>{formatMoney(o.taxableTotal)}</b></div>
              {Number(o.cgstTotal) > 0 && <div className="sum-row"><span>CGST</span><b>{formatMoney(o.cgstTotal)}</b></div>}
              {Number(o.sgstTotal) > 0 && <div className="sum-row"><span>SGST</span><b>{formatMoney(o.sgstTotal)}</b></div>}
              {Number(o.igstTotal) > 0 && <div className="sum-row"><span>IGST</span><b>{formatMoney(o.igstTotal)}</b></div>}
            </div>
            <p className="muted small">Payment: {o.paymentMethod ? titleCase(o.paymentMethod.replace(/_/g, " ")) : "Cash on delivery"} &middot; {o.currency}</p>
          </div>

          {a && (
            <div className="card">
              <h3 className="card-title">Delivery address</h3>
              <address className="address">
                <strong>{a.fullName}</strong>
                {a.line1}<br />
                {a.line2 && <>{a.line2}<br /></>}
                {a.city}, {a.state} {a.postalCode}<br />
                {a.country}<br />
                <span><Icon name="phone" size={14} /> {a.phone}</span>
              </address>
            </div>
          )}

          <div className="card action-card">
            {mode === "customer" && o.status === "RESERVED" && (
              <Button loading={busy} disabled={countdown && countdown.over} onClick={() => act(() => api.orders.confirmReservation(o.id), "Reservation confirmed")}>Confirm my order</Button>
            )}
            {mode === "seller" && o.status === "CONFIRMED" && <Button icon="truck" onClick={() => setDialog("ship")}>Mark as shipped</Button>}
            {mode === "seller" && o.status === "SHIPPED" && <Button icon="check" loading={busy} onClick={() => act(() => api.sellerOrders.deliver(o.id), "Marked as delivered")}>Mark as delivered</Button>}
            {canCancel && <Button variant="danger-outline" onClick={() => setDialog("cancel")}>Cancel order</Button>}
            <Button variant="ghost" icon="refresh" onClick={res.refresh}>Refresh</Button>
          </div>
        </aside>
      </div>

      {dialog === "cancel" && (
        <ConfirmDialog title="Cancel this order?" message="The stock will be released and the order cannot be restored." confirmText="Cancel order" danger
          onConfirm={async () => { res.setData(await api.orders.cancel(o.id)); toast.success("Order cancelled"); }} onClose={() => setDialog(null)} />
      )}
      {dialog === "ship" && <ShipModal order={o} onClose={() => setDialog(null)} onDone={(updated) => { res.setData(updated); setDialog(null); toast.success("Order marked as shipped"); }} />}
    </div>
  );
}

/* ---------- invoice ---------- */

function Party({ title, p }) {
  return (
    <div className="inv-party">
      <small>{title}</small>
      <strong>{p.name}</strong>
      {p.tradeName && p.tradeName !== p.name && <span>{p.tradeName}</span>}
      {p.gstin && <span>GSTIN {p.gstin}</span>}
      {p.addressLines && p.addressLines.map((l, i) => <span key={i}>{l}</span>)}
      {p.phone && <span>Phone {p.phone}</span>}
    </div>
  );
}

export function InvoicePage({ id, mode }) {
  const toast = useToast();
  const res = useLoad(() => (mode === "seller" ? api.sellerOrders.invoice(id) : api.orders.invoice(id)), [id, mode]);
  const base = BASE[mode];
  const v = res.data;

  const pdf = async () => {
    try {
      await (mode === "seller" ? api.sellerOrders.openInvoicePdf(id) : api.orders.openInvoicePdf(id));
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (res.loading) return <div className="container page"><Spinner label="Loading invoice" /></div>;
  if (res.error) return <div className={mode === "customer" ? "container page" : ""}><Empty icon="receipt" title="No invoice yet" text={errorText(res.error) + ". An invoice is created once the order is confirmed."} action={<LinkButton to={base + "/" + id} variant="outline">Back to the order</LinkButton>} /></div>;
  const t = v.totals;

  return (
    <div className={mode === "customer" ? "container page" : ""}>
      <Breadcrumbs items={[{ label: mode === "customer" ? "My orders" : "Orders", to: base }, { label: "Order #" + v.orderId, to: base + "/" + v.orderId }, { label: "Invoice" }]} />
      <div className="no-print inv-actions">
        <Button icon="print" onClick={() => window.print()}>Print</Button>
        <Button variant="outline" icon="download" onClick={pdf}>Open PDF</Button>
      </div>

      <article className="invoice">
        {v.orderStatus === "CANCELLED" && <div className="inv-stamp">Cancelled</div>}
        <header className="inv-head">
          <div>
            <h1>Tax invoice</h1>
            <p>{v.invoiceNumber}</p>
          </div>
          <dl>
            <div><dt>Issued</dt><dd>{formatDate(v.issuedAt)}</dd></div>
            <div><dt>Order</dt><dd>#{v.orderId} ({formatDate(v.orderDate, false)})</dd></div>
            <div><dt>Status</dt><dd>{titleCase(v.orderStatus)}</dd></div>
          </dl>
        </header>

        <div className="inv-parties">
          <Party title="Sold by" p={v.seller} />
          <Party title="Billed and shipped to" p={v.buyer} />
          <div className="inv-party">
            <small>Place of supply</small>
            <strong>{v.placeOfSupply}</strong>
            <span>{v.intraState ? "Same state: CGST and SGST" : "Different state: IGST"}</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table inv-table">
            <thead>
              <tr><th>#</th><th>Item</th><th>HSN</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Discount</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {v.lines.map((l) => (
                <tr key={l.number}>
                  <td>{l.number}</td>
                  <td><strong>{l.description}</strong>{l.details && <div className="muted small">{l.details}</div>}{l.offerTitle && <div className="muted small">Offer: {l.offerTitle}</div>}</td>
                  <td>{l.hsnCode || "-"}</td>
                  <td className="num">{l.quantity}</td>
                  <td className="num">{formatMoney(l.listPrice)}</td>
                  <td className="num">{Number(l.discount) ? formatMoney(l.discount) : "-"}</td>
                  <td className="num">{formatMoney(l.taxableValue)}</td>
                  <td className="num">{Number(l.gstRatePercent)}% ({formatMoney(l.gstAmount)})</td>
                  <td className="num"><strong>{formatMoney(l.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="inv-bottom">
          <div>
            <h4>GST summary</h4>
            <div className="table-wrap">
              <table className="table table-compact">
                <thead><tr><th>Rate</th><th className="num">Taxable</th><th className="num">CGST</th><th className="num">SGST</th><th className="num">IGST</th></tr></thead>
                <tbody>
                  {v.taxSummary.map((s, i) => (
                    <tr key={i}><td>{Number(s.ratePercent)}%</td><td className="num">{formatMoney(s.taxableValue)}</td><td className="num">{formatMoney(s.cgst)}</td><td className="num">{formatMoney(s.sgst)}</td><td className="num">{formatMoney(s.igst)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="inv-words"><small>Amount in words</small>{v.amountInWords}</p>
            <p className="muted small">Payment: {titleCase(String(v.paymentMethod || "").replace(/_/g, " "))} ({titleCase(v.paymentStatus || "")}){v.trackingNumber ? " | Tracking " + v.trackingNumber : ""}</p>
          </div>
          <div className="inv-totals">
            <div className="sum-row"><span>Subtotal</span><b>{formatMoney(t.subtotal)}</b></div>
            {Number(t.discount) > 0 && <div className="sum-row save"><span>Discount</span><b>-{formatMoney(t.discount)}</b></div>}
            <div className="sum-row"><span>Taxable value</span><b>{formatMoney(t.taxableValue)}</b></div>
            {Number(t.cgst) > 0 && <div className="sum-row"><span>CGST</span><b>{formatMoney(t.cgst)}</b></div>}
            {Number(t.sgst) > 0 && <div className="sum-row"><span>SGST</span><b>{formatMoney(t.sgst)}</b></div>}
            {Number(t.igst) > 0 && <div className="sum-row"><span>IGST</span><b>{formatMoney(t.igst)}</b></div>}
            <div className="sum-row"><span>Delivery</span><b>{formatMoney(t.shipping)}</b></div>
            <div className="sum-total"><span>Grand total</span><strong>{formatMoney(t.grandTotal)}</strong></div>
            {Number(t.youSaved) > 0 && <div className="inv-saved">You saved {formatMoney(t.youSaved)} on this order</div>}
          </div>
        </div>
      </article>
    </div>
  );
}
