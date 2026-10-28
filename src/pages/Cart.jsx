import { useMemo, useRef, useState } from "react";
import * as api from "../api";
import { Link } from "../router";
import { useCart, useToast } from "../state";
import { errorText, formatMoney, newKey } from "../utils";
import Icon from "../components/Icon";
import { AddressForm, loadSavedAddress, saveAddress, validateAddress } from "../components/forms";
import { Button, ConfirmDialog, Empty, ErrorBox, LinkButton, Notice, PageHeader, QuantityStepper, Segmented, Spinner, StatusBadge } from "../components/ui";

function CartLine({ line }) {
  const cart = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (call) => {
    setBusy(true);
    try {
      await call();
    } catch (err) {
      toast.error(errorText(err));
      cart.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={"cart-line" + (line.available ? "" : " unavailable")}>
      <div className="cart-line-main">
        <Link to={"/product/" + line.productId} className="cart-line-name">{line.name}</Link>
        <Link to={"/brand/" + line.brandId} className="cart-line-brand">{line.brandName}</Link>
        {!line.available && <span className="badge badge-rejected">No longer available</span>}
        {line.offerTitle && Number(line.discountPerUnit) > 0 && (
          <span className="offer-chip"><Icon name="tag" size={13} /> {line.offerTitle}: save {formatMoney(line.discountPerUnit)} each</span>
        )}
      </div>
      <div className="cart-line-price">
        {Number(line.discountPerUnit) > 0 ? <><strong>{formatMoney(Number(line.unitPrice) - Number(line.discountPerUnit))}</strong><s>{formatMoney(line.unitPrice)}</s></> : <strong>{formatMoney(line.unitPrice)}</strong>}
        <small>each</small>
      </div>
      <QuantityStepper value={line.quantity} disabled={busy || !line.available} onChange={(q) => run(() => cart.setQuantity(line.productId, q))} />
      <div className="cart-line-total">{line.available ? formatMoney(line.lineTotal) : "-"}</div>
      <button className="icon-btn danger-icon" disabled={busy} onClick={() => run(() => cart.remove(line.productId))} aria-label={"Remove " + line.name}>
        <Icon name="trash" size={19} />
      </button>
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, reload, clear } = useCart();
  const toast = useToast();
  const [address, setAddress] = useState(loadSavedAddress());
  const [errors, setErrors] = useState({});
  const [type, setType] = useState("PURCHASE");
  const [hold, setHold] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [askClear, setAskClear] = useState(false);
  const keyRef = useRef({ sig: "", key: "" });

  const available = cart.items.filter((i) => i.available);
  const unavailable = cart.items.length - available.length;
  const brandsInCart = useMemo(() => new Set(available.map((i) => i.brandId)).size, [available]);

  // A new Idempotency-Key is made whenever the order contents change. Retrying the same order reuses it.
  const keyFor = () => {
    const sig = JSON.stringify([available.map((i) => [i.productId, i.quantity]), address, type, hold]);
    if (keyRef.current.sig !== sig) keyRef.current = { sig, key: newKey() };
    return keyRef.current.key;
  };

  const placeOrder = async () => {
    const e = validateAddress(address);
    if (type === "RESERVATION" && (!(Number(hold) >= 1) || Number(hold) > 72)) e.hold = "Hold time must be 1 to 72 hours";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      const body = { shippingAddress: { ...address, line2: address.line2.trim() || null }, type };
      if (type === "RESERVATION") body.holdHours = Number(hold);
      const res = await api.cart.checkout(keyFor(), body);
      saveAddress(address);
      setResult(res);
      await reload();
      toast.success(type === "RESERVATION" ? "Items reserved" : "Order placed");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const { orders, grandTotal } = result.data;
    return (
      <div className="container page narrow">
        <div className="success-card">
          <div className="success-icon"><Icon name="check" size={34} /></div>
          <h1>{type === "RESERVATION" ? "Your items are reserved" : "Thank you, your order is in"}</h1>
          <p className="muted">
            {orders.length > 1 ? "Each brand ships on its own, so we created " + orders.length + " orders." : "We are confirming your stock."}
            {result.replayed && " (This checkout had already been placed, so nothing new was created.)"}
          </p>
          <div className="result-orders">
            {orders.map((o) => (
              <Link key={o.id} to={"/orders/" + o.id} className="result-order">
                <div>
                  <strong>Order #{o.id}</strong>
                  <span className="muted">{o.brandName} &middot; {o.items.length} {o.items.length === 1 ? "item" : "items"}</span>
                </div>
                <StatusBadge status={o.status} />
                <strong>{formatMoney(o.totalAmount)}</strong>
                <Icon name="chevronRight" size={18} />
              </Link>
            ))}
          </div>
          <p className="total-line">Grand total <strong>{formatMoney(grandTotal)}</strong> (cash on delivery)</p>
          <div className="row-center">
            <LinkButton to="/orders">View my orders</LinkButton>
            <LinkButton to="/shop" variant="outline">Keep shopping</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  if (loading && cart.items.length === 0) return <div className="container page"><Spinner label="Loading your cart" /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <Empty icon="cart" title="Your cart is empty" text="Add something you like and it will wait for you here." action={<LinkButton to="/shop" iconAfter="arrowRight">Browse products</LinkButton>} />
      </div>
    );
  }

  return (
    <div className="container page">
      <PageHeader title="Your cart" subtitle={cart.totalItems + (cart.totalItems === 1 ? " item" : " items")} actions={<Button variant="ghost" icon="trash" onClick={() => setAskClear(true)}>Clear cart</Button>} />
      {unavailable > 0 && <Notice type="warning">Some items are no longer available. They are left out of the total, so remove them before you check out.</Notice>}
      <div className="cart-layout">
        <div>
          <div className="card cart-lines">
            {cart.items.map((l) => <CartLine key={l.productId} line={l} />)}
          </div>

          <div className="card">
            <h3 className="card-title">Delivery address</h3>
            <AddressForm value={address} onChange={setAddress} errors={errors} />
          </div>

          <div className="card">
            <h3 className="card-title">How do you want to order?</h3>
            <Segmented value={type} onChange={setType} options={[{ value: "PURCHASE", label: "Buy now" }, { value: "RESERVATION", label: "Reserve first" }]} />
            {type === "RESERVATION" ? (
              <div className="hold-box">
                <Notice type="info" icon="clock">The stock is held for you. Confirm each order from the orders page before the time is up, or it is released.</Notice>
                <label className="field">
                  <span className="field-label">Hold for how many hours? (1 to 72)</span>
                  <input className={"input narrow-input" + (errors.hold ? " has-error" : "")} type="number" min="1" max="72" value={hold} onChange={(e) => setHold(e.target.value)} />
                  {errors.hold && <span className="field-error">{errors.hold}</span>}
                </label>
              </div>
            ) : (
              <p className="muted">Your order is placed straight away and paid when it arrives (cash on delivery).</p>
            )}
          </div>
        </div>

        <aside className="summary card">
          <h3 className="card-title">Summary</h3>
          <div className="sum-row"><span>Items</span><b>{cart.totalItems}</b></div>
          {Number(cart.totalSavings) > 0 && <div className="sum-row save"><span>You save</span><b>{formatMoney(cart.totalSavings)}</b></div>}
          <div className="sum-row"><span>Delivery</span><b>Added at checkout</b></div>
          <div className="sum-total"><span>Cart total</span><strong>{formatMoney(cart.totalAmount)}</strong></div>
          <p className="muted small">
            {brandsInCart > 1 ? "Your cart has items from " + brandsInCart + " brands, so it becomes " + brandsInCart + " separate orders, each with its own invoice." : "Prices include GST. Delivery is charged per brand if the order is below the free-delivery amount."}
          </p>
          <ErrorBox error={error} />
          <Button size="lg" loading={busy} disabled={available.length === 0 || unavailable > 0} onClick={placeOrder}>
            {type === "RESERVATION" ? "Reserve items" : "Place order"}
          </Button>
          <Link to="/shop" className="link-center">Continue shopping</Link>
        </aside>
      </div>
      {askClear && <ConfirmDialog title="Clear your cart?" message="All items will be removed from your cart." confirmText="Clear cart" danger onConfirm={clear} onClose={() => setAskClear(false)} />}
    </div>
  );
}
