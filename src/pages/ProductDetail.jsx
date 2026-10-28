import { useEffect, useState } from "react";
import * as api from "../api";
import { Link, navigate } from "../router";
import { useAuth, useCart, useToast } from "../state";
import { errorText, formatDate, formatMoney, newKey, rememberProduct, titleCase, useLoad } from "../utils";
import Icon from "../components/Icon";
import { AddressForm, ImageManagerModal, loadSavedAddress, ProductFormModal, saveAddress, StockModal, validateAddress } from "../components/forms";
import ProductCard from "../components/ProductCard";
import { Breadcrumbs, Button, ConfirmDialog, Empty, ErrorBox, Modal, Notice, Price, ProductImage, QuantityStepper, Segmented, Spinner } from "../components/ui";

export function describeOffer(o) {
  const what = o.discountType === "PERCENT" ? Number(o.discountValue) + "% off" : formatMoney(o.discountValue) + " off each";
  const min = o.minQuantity > 1 ? " when you buy " + o.minQuantity + " or more" : "";
  return what + min;
}

/* ---------- buy now / reserve ---------- */

function BuyModal({ product, quantity, mode, onClose }) {
  const toast = useToast();
  const [address, setAddress] = useState(loadSavedAddress());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState(24);
  const [key] = useState(newKey); // the same key is reused if the person presses the button twice
  const reserve = mode === "RESERVATION";

  const submit = async () => {
    const e = validateAddress(address);
    if (reserve && (!(hold >= 1) || hold > 72)) e.hold = "Hold time must be 1 to 72 hours";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        items: [{ productId: product.id, quantity }],
        shippingAddress: { ...address, line2: address.line2.trim() || null },
        type: mode
      };
      if (reserve) body.holdHours = Number(hold);
      const res = await api.orders.place(key, body);
      saveAddress(address);
      toast.success(reserve ? "Reservation placed" : "Order placed");
      onClose();
      navigate("/orders/" + res.data.id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const unit = product.discountedPrice ?? product.price;
  return (
    <Modal
      wide
      title={reserve ? "Reserve this item" : "Buy now"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={submit}>{reserve ? "Reserve stock" : "Place order"}</Button>
        </>
      }
    >
      <div className="mini-summary">
        <ProductImage src={product.imageUrl} name={product.name} category={product.category} id={product.id} />
        <div>
          <strong>{product.name}</strong>
          <span className="muted">Quantity {quantity} from {product.brand.name}</span>
          <span>About {formatMoney(Number(unit) * quantity)} (offers for larger quantities are applied when the order is created)</span>
        </div>
      </div>
      {reserve && (
        <div className="hold-box">
          <Notice type="info" icon="clock">We hold the stock for you. Confirm the order before the time is up or it is released.</Notice>
          <label className="field">
            <span className="field-label">Hold for how many hours? (1 to 72)</span>
            <input className={"input" + (errors.hold ? " has-error" : "")} type="number" min="1" max="72" value={hold} onChange={(e) => setHold(e.target.value)} />
            {errors.hold && <span className="field-error">{errors.hold}</span>}
          </label>
        </div>
      )}
      <h4 className="form-title">Delivery address</h4>
      <AddressForm value={address} onChange={setAddress} errors={errors} />
      <p className="muted small">Payment is cash on delivery.</p>
      <ErrorBox error={error} />
    </Modal>
  );
}

/* ---------- main page ---------- */

export default function ProductDetail({ id }) {
  const { user, isCustomer, isAdmin } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const product = useLoad(() => api.products.get(id), [id]);
  const stock = useLoad(() => api.inventory.get(id).catch(() => null), [id]);
  const p = product.data;

  const variants = useLoad(
    () => (p ? api.products.search({ q: p.name, brandId: p.brand.id, size: 50 }) : Promise.resolve(null)),
    [p && p.id]
  );
  const related = useLoad(() => (p ? api.products.search({ category: p.category, size: 5 }) : Promise.resolve(null)), [p && p.category, p && p.id]);

  const [selected, setSelected] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buy, setBuy] = useState(null);
  const [edit, setEdit] = useState(false);
  const [pics, setPics] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setSelected(0);
    setQty(1);
    rememberProduct(Number(id));
  }, [id]);

  if (product.loading && !p) return <div className="container page"><Spinner label="Loading product" /></div>;
  if (product.error) {
    return (
      <div className="container page">
        <Empty icon="search" title={product.error.status === 404 ? "This product is not available" : "Could not load the product"} text={product.error.status === 404 ? "It may have been removed or hidden by the seller." : errorText(product.error)}
          action={<Link to="/shop" className="btn btn-primary">Back to the shop</Link>} />
      </div>
    );
  }

  const images = p.images && p.images.length ? p.images : [];
  const main = images[selected] || null;
  const available = stock.data ? stock.data.availableQuantity : null;
  const out = available !== null && available <= 0;
  const maxQty = available === null ? 99 : Math.max(1, Math.min(99, available));
  const owner = isAdmin || (user && user.role === "SELLER" && p.brand.sellerId === user.id);
  const siblings = variants.data ? variants.data.content.filter((v) => v.name === p.name && v.id !== p.id) : [];
  const unit = Number(p.discountedPrice ?? p.price);

  const needLogin = () => {
    toast.info("Please log in to continue");
    navigate("/login?next=" + encodeURIComponent("/product/" + p.id));
  };

  const addToCart = async () => {
    if (!user) return needLogin();
    setAdding(true);
    try {
      await cart.add(p.id, qty);
      toast.success("Added to your cart");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  const openBuy = (mode) => {
    if (!user) return needLogin();
    setBuy(mode);
  };

  const toggleActive = async () => {
    if (p.active) await api.products.deactivate(p.id);
    else await api.products.activate(p.id);
    toast.success(p.active ? "Product hidden from the shop" : "Product is visible again");
    product.reload();
  };

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shop", to: "/shop" }, { label: titleCase(p.category), to: "/shop?category=" + p.category }, { label: p.name }]} />

      {!p.active && <Notice type="warning">This product is hidden. Shoppers cannot see it until it is made visible again.</Notice>}

      <div className="detail">
        <div className="gallery">
          <div className="gallery-main">
            <ProductImage src={main ? main.url : p.imageUrl} name={p.name} category={p.category} id={p.id} />
            {p.appliedOffer && <span className="pcard-tag"><Icon name="percent" size={13} /> {p.appliedOffer.title}</span>}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((img, i) => (
                <button key={img.id} className={i === selected ? "active" : ""} onClick={() => setSelected(i)} aria-label={"Picture " + (i + 1)}>
                  <ProductImage src={img.url} name={p.name} category={p.category} id={img.id} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <Link to={"/brand/" + p.brand.id} className="detail-brand"><Icon name="store" size={16} /> {p.brand.name}</Link>
          <h1>{p.name}</h1>
          <Price price={p.price} discounted={p.discountedPrice} big />
          <p className="muted small">Price includes GST{Number(p.gstRatePercent) ? " at " + Number(p.gstRatePercent) + "%" : ""}. Delivery fee, if any, is added at checkout.</p>

          {p.description && <p className="detail-desc">{p.description}</p>}

          {p.offers && p.offers.length > 0 && (
            <div className="offer-list">
              <h4><Icon name="tag" size={16} /> Offers from the seller</h4>
              {p.offers.map((o) => (
                <div key={o.id} className={"offer" + (p.appliedOffer && p.appliedOffer.id === o.id ? " best" : "")}>
                  <strong>{o.title}</strong>
                  <span>{describeOffer(o)}</span>
                  <small>Valid until {formatDate(o.endsAt)}</small>
                  {p.appliedOffer && p.appliedOffer.id === o.id && <em>Applied</em>}
                </div>
              ))}
              <p className="muted small">Offers do not stack. The best one is used for each item.</p>
            </div>
          )}

          {siblings.length > 0 && (
            <div className="variants">
              <h4>Other sizes and colours</h4>
              <div>
                {siblings.map((v) => (
                  <Link key={v.id} to={"/product/" + v.id} className="chip">{[v.size, v.color].filter(Boolean).join(" / ") || "Variant " + v.id}</Link>
                ))}
              </div>
            </div>
          )}

          <div className="stock-line">
            {available === null ? null : out ? (
              <span className="stock stock-out"><i /> Out of stock</span>
            ) : available <= 5 ? (
              <span className="stock stock-low"><i /> Only {available} left</span>
            ) : (
              <span className="stock stock-in"><i /> In stock ({available} available)</span>
            )}
          </div>

          {(!user || isCustomer) && p.active && (
            <div className="buy-box">
              <div className="buy-row">
                <QuantityStepper value={qty} onChange={setQty} max={maxQty} disabled={out} />
                <span className="muted">Total about <strong>{formatMoney(unit * qty)}</strong></span>
              </div>
              <div className="buy-actions">
                <Button icon="cart" onClick={addToCart} loading={adding} disabled={out}>Add to cart</Button>
                <Button variant="dark" onClick={() => openBuy("PURCHASE")} disabled={out}>Buy now</Button>
                <Button variant="outline" icon="clock" onClick={() => openBuy("RESERVATION")} disabled={out}>Reserve</Button>
              </div>
              <p className="muted small">Reserve holds this item for you for up to 72 hours. You confirm it later from your orders.</p>
            </div>
          )}
          {user && !isCustomer && !owner && <Notice type="info">You are signed in as {titleCase(user.role)}. Only customer accounts can buy.</Notice>}

          {owner && (
            <div className="manage-box">
              <h4><Icon name="edit" size={16} /> Manage this product</h4>
              <div className="buy-actions">
                <Button variant="outline" icon="edit" onClick={() => setEdit(true)}>Edit details</Button>
                <Button variant="outline" icon="image" onClick={() => setPics(true)}>Pictures</Button>
                <Button variant="outline" icon="layers" onClick={() => setStockModal(true)}>Change stock</Button>
                <Button variant={p.active ? "danger-outline" : "outline"} onClick={() => setConfirm(true)}>{p.active ? "Hide from shop" : "Show in shop"}</Button>
              </div>
            </div>
          )}

          <dl className="spec">
            <div><dt>Category</dt><dd>{titleCase(p.category)}</dd></div>
            {p.size && <div><dt>Size</dt><dd>{p.size}</dd></div>}
            {p.color && <div><dt>Colour</dt><dd>{p.color}</dd></div>}
            {p.sku && <div><dt>SKU</dt><dd>{p.sku}</dd></div>}
            {p.hsnCode && <div><dt>HSN code</dt><dd>{p.hsnCode}</dd></div>}
            <div><dt>GST rate</dt><dd>{Number(p.gstRatePercent)}%</dd></div>
          </dl>

          <div className="sold-by">
            <div className="sold-by-icon"><Icon name="store" size={22} /></div>
            <div>
              <small>Sold by</small>
              <strong>{p.brand.name}</strong>
              <span>{p.brand.legalName}</span>
              <span><Icon name="pin" size={13} /> {p.brand.city}, {p.brand.state}</span>
              {p.brand.gstin && <span>GSTIN {p.brand.gstin}</span>}
            </div>
            <Link to={"/brand/" + p.brand.id} className="btn btn-outline btn-sm">View brand</Link>
          </div>
        </div>
      </div>

      {related.data && related.data.content.filter((r) => r.id !== p.id).length > 0 && (
        <section className="related">
          <h2>More in {titleCase(p.category)}</h2>
          <div className="product-grid">
            {related.data.content.filter((r) => r.id !== p.id).slice(0, 4).map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}

      {buy && <BuyModal product={p} quantity={qty} mode={buy} onClose={() => setBuy(null)} />}
      {edit && <ProductFormModal product={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); product.reload(); }} />}
      {pics && <ImageManagerModal productId={p.id} name={p.name} category={p.category} initial={images} onClose={() => setPics(false)} onChanged={() => product.refresh()} />}
      {stockModal && <StockModal productId={p.id} name={p.name} current={available} onClose={() => setStockModal(false)} onSaved={() => { setStockModal(false); stock.reload(); }} />}
      {confirm && (
        <ConfirmDialog
          title={p.active ? "Hide this product?" : "Show this product?"}
          message={p.active ? "Shoppers will no longer see it. Existing orders keep their details." : "Shoppers will be able to see and buy it again."}
          confirmText={p.active ? "Hide product" : "Show product"}
          danger={p.active}
          onConfirm={toggleActive}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
