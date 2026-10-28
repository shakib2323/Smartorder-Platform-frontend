import { useEffect, useState } from "react";
import * as api from "../../api";
import { Link } from "../../router";
import { useToast } from "../../state";
import { errorText, formatDate, formatMoney, ORDER_STATUSES, titleCase, toLocalInput, useLoad } from "../../utils";
import Icon from "../../components/Icon";
import { ImageManagerModal, ProductFormModal, StockModal } from "../../components/forms";
import { Button, ConfirmDialog, Empty, ErrorBox, LinkButton, Modal, Notice, PageHeader, Pagination, ProductImage, Select, Spinner, Stat, StatusBadge, TextArea, TextInput } from "../../components/ui";

// the seller's brand (404 means they have not registered one yet)
export function useMyBrand() {
  return useLoad(() => api.brands.mine().catch((e) => (e.status === 404 ? null : Promise.reject(e))), []);
}

function BrandStatusNotice({ brand }) {
  if (!brand) return <Notice type="warning" icon="store">You have not registered a brand yet. <Link to="/seller/brand">Register it now</Link> to start selling.</Notice>;
  if (brand.status === "PENDING") return <Notice type="warning" icon="clock">Your brand is waiting for admin approval. You can prepare your details, but you can only add products once it is approved.</Notice>;
  if (brand.status === "SUSPENDED") return <Notice type="error" icon="alert">Your brand is suspended, so shoppers cannot see it. Please contact the SmartOrder team.</Notice>;
  return null;
}

/* ---------------- overview ---------------- */

export function SellerHome() {
  const summary = useLoad(() => api.sellerOrders.summary(), []);
  const brand = useMyBrand();
  const recent = useLoad(() => api.sellerOrders.list({ page: 0, size: 5 }), []);
  const s = summary.data;
  const max = s ? Math.max(1, ...Object.values(s.ordersByStatus || {})) : 1;

  return (
    <>
      <PageHeader title="Seller dashboard" subtitle={brand.data ? "Welcome to " + brand.data.name : "Your store at a glance"} actions={<LinkButton to="/seller/products" icon="plus">Add product</LinkButton>} />
      {brand.data !== undefined && !brand.loading && <BrandStatusNotice brand={brand.data} />}
      <ErrorBox error={summary.error} onRetry={summary.reload} />
      {summary.loading && !s && <Spinner />}
      {s && (
        <>
          <div className="stat-grid">
            <Stat label="Total sales" value={formatMoney(s.sales)} icon="chart" tone="brand" note="Confirmed, shipped and delivered orders" />
            <Stat label="Orders" value={s.totalOrders} icon="receipt" tone="amber" />
            <Stat label="To ship" value={(s.ordersByStatus && s.ordersByStatus.CONFIRMED) || 0} icon="truck" tone="green" note="Confirmed orders waiting" />
            <Stat label="Brand status" value={brand.data ? titleCase(brand.data.status) : "Not set up"} icon="shield" tone="violet" />
          </div>
          <div className="dash-cols">
            <div className="card">
              <h3 className="card-title">Orders by status</h3>
              <div className="bars">
                {ORDER_STATUSES.map((st) => {
                  const n = (s.ordersByStatus && s.ordersByStatus[st]) || 0;
                  return (
                    <div className="bar-row" key={st}>
                      <span>{titleCase(st)}</span>
                      <div className="bar"><i className={"bar-" + st.toLowerCase()} style={{ width: (n / max) * 100 + "%" }} /></div>
                      <b>{n}</b>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">Latest orders</h3>
                <Link to="/seller/orders" className="more">All orders</Link>
              </div>
              {recent.data && recent.data.content.length === 0 && <p className="muted">No orders yet.</p>}
              {recent.data && recent.data.content.map((o) => (
                <Link key={o.id} to={"/seller/orders/" + o.id} className="mini-order">
                  <div><strong>#{o.id}</strong><span className="muted">{formatDate(o.createdAt)}</span></div>
                  <StatusBadge status={o.status} />
                  <b>{formatMoney(o.totalAmount)}</b>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- brand ---------------- */

const GSTIN = /^$|^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]$/;

export function SellerBrand() {
  const toast = useToast();
  const brand = useMyBrand();
  const b = brand.data;
  const [f, setF] = useState({ name: "", legalName: "", description: "", contactEmail: "", gstin: "", city: "", state: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    if (b) setF({ name: b.name, legalName: b.legalName, description: b.description || "", contactEmail: b.contactEmail, gstin: b.gstin || "", city: b.city, state: b.state });
  }, [b]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (!f.name.trim()) v.name = "Brand name is required";
    if (!f.legalName.trim()) v.legalName = "Legal name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.contactEmail.trim())) v.contactEmail = "Enter a valid email";
    if (!GSTIN.test(f.gstin.trim())) v.gstin = "GSTIN must be 15 characters, for example 29ABCDE1234F1Z5";
    if (!f.city.trim()) v.city = "City is required";
    if (!f.state.trim()) v.state = "State is required";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    const body = { ...f, name: f.name.trim(), legalName: f.legalName.trim(), contactEmail: f.contactEmail.trim(), gstin: f.gstin.trim(), city: f.city.trim(), state: f.state.trim(), description: f.description.trim() };
    try {
      const saved = b ? await api.brands.updateMine(body) : await api.brands.register(body);
      brand.setData(saved);
      toast.success(b ? "Brand updated" : "Brand registered. Now wait for admin approval.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const logo = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPG, PNG or WebP picture");
    if (file.size > 5 * 1024 * 1024) return toast.error("The logo must be 5 MB or smaller");
    setLogoBusy(true);
    try {
      brand.setData(await api.brands.uploadLogo(file));
      toast.success("Logo updated");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setLogoBusy(false);
    }
  };

  if (brand.loading && !b) return <Spinner />;

  return (
    <>
      <PageHeader title={b ? "My brand" : "Register your brand"} subtitle={b ? "These details appear on your store page and on every invoice." : "Tell us about your business. An admin reviews it before you go live."} />
      <ErrorBox error={brand.error} onRetry={brand.reload} />
      {!brand.loading && b && b.status !== "APPROVED" && <BrandStatusNotice brand={b} />}
      {b && (
        <div className="card brand-status-card">
          <div className="brand-logo brand-logo-lg">
            {b.logoUrl ? <ProductImage src={b.logoUrl} name={b.name} id={b.id} /> : <span>{b.name.charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <h3>{b.name} <StatusBadge status={b.status} /></h3>
            <p className="muted">Registered {formatDate(b.createdAt, false)}</p>
            <label className="btn btn-outline btn-sm file-btn">
              {logoBusy ? <span className="spinner spinner-sm" /> : <Icon name="upload" size={16} />} Upload logo
              <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={logo} />
            </label>
          </div>
          {b.status === "APPROVED" && <Link to={"/brand/" + b.id} className="btn btn-ghost btn-sm">View public page</Link>}
        </div>
      )}
      <form className="card" onSubmit={save} noValidate>
        <div className="form-grid">
          <TextInput label="Brand name" required maxLength={120} value={f.name} onChange={set("name")} error={errors.name} />
          <TextInput label="Legal business name" required maxLength={200} value={f.legalName} onChange={set("legalName")} error={errors.legalName} />
          <TextArea className="span-2" label="About your brand" maxLength={1000} value={f.description} onChange={set("description")} />
          <TextInput label="Contact email" type="email" required value={f.contactEmail} onChange={set("contactEmail")} error={errors.contactEmail} />
          <TextInput label="GSTIN" hint="Optional for small sellers below the GST limit" maxLength={15} value={f.gstin} onChange={set("gstin")} error={errors.gstin} />
          <TextInput label="City" required value={f.city} onChange={set("city")} error={errors.city} />
          <TextInput label="State" required hint="Used to decide between CGST and SGST or IGST" value={f.state} onChange={set("state")} error={errors.state} />
        </div>
        <ErrorBox error={error} />
        <div className="form-actions"><Button type="submit" loading={busy}>{b ? "Save changes" : "Register brand"}</Button></div>
      </form>
    </>
  );
}

/* ---------------- products ---------------- */

export function SellerProducts() {
  const toast = useToast();
  const [page, setPage] = useState(0);
  const list = useLoad(() => api.products.mine(page, 10), [page]);
  const stock = useLoad(() => api.inventory.mine(0, 200).catch(() => null), []);
  const [form, setForm] = useState(null); // null | "new" | product
  const [pics, setPics] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [toggle, setToggle] = useState(null);

  const stockOf = (id) => {
    const row = stock.data && stock.data.content.find((s) => s.productId === id);
    return row ? row.availableQuantity : null;
  };
  const data = list.data;

  return (
    <>
      <PageHeader title="My products" subtitle={data ? data.totalElements + " in your catalogue" : ""} actions={<Button icon="plus" onClick={() => setForm("new")}>New product</Button>} />
      <Notice type="info">Your brand must be approved before you can add products. Hidden products stay in this list but shoppers cannot see them.</Notice>
      {list.loading && !data && <Spinner />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {data && data.content.length === 0 && <Empty icon="box" title="No products yet" text="Add your first product with its price, GST rate and opening stock." action={<Button icon="plus" onClick={() => setForm("new")}>New product</Button>} />}
      {data && data.content.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Variant</th><th className="num">Price</th><th className="num">GST</th><th className="num">Stock</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.content.map((p) => {
                  const st = stockOf(p.id);
                  return (
                    <tr key={p.id}>
                      <td data-label="Product">
                        <div className="cell-product">
                          <ProductImage src={p.imageUrl} name={p.name} category={p.category} id={p.id} />
                          <div>
                            {p.active ? <Link to={"/product/" + p.id}><strong>{p.name}</strong></Link> : <strong>{p.name}</strong>}
                            <span className="muted small">{titleCase(p.category)}{p.sku ? " / " + p.sku : ""}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Variant">{[p.size, p.color].filter(Boolean).join(" / ") || "-"}</td>
                      <td data-label="Price" className="num">
                        {formatMoney(p.discountedPrice ?? p.price)}
                        {p.appliedOffer && <div className="muted small"><s>{formatMoney(p.price)}</s></div>}
                      </td>
                      <td data-label="GST" className="num">{Number(p.gstRatePercent)}%</td>
                      <td data-label="Stock" className="num">
                        {st === null ? "-" : <span className={st <= 5 ? "low-stock" : ""}>{st}</span>}
                      </td>
                      <td data-label="Status">{p.active ? <span className="badge badge-confirmed">Visible</span> : <span className="badge badge-cancelled">Hidden</span>}</td>
                      <td className="row-actions">
                        <button className="icon-btn" title="Edit" aria-label="Edit" onClick={() => setForm(p)}><Icon name="edit" size={18} /></button>
                        <button className="icon-btn" title="Pictures" aria-label="Pictures" onClick={() => setPics(p)}><Icon name="image" size={18} /></button>
                        <button className="icon-btn" title="Change stock" aria-label="Change stock" onClick={() => setStockFor(p)}><Icon name="layers" size={18} /></button>
                        <button className="icon-btn" title={p.active ? "Hide" : "Show"} aria-label={p.active ? "Hide" : "Show"} onClick={() => setToggle(p)}><Icon name={p.active ? "eye" : "check"} size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {form && (
        <ProductFormModal
          product={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={(saved, created) => {
            setForm(null);
            list.reload();
            stock.reload();
            if (created) setPics(saved);
          }}
        />
      )}
      {pics && <ImageManagerModal productId={pics.id} name={pics.name} category={pics.category} initial={pics.images} onClose={() => { setPics(null); list.reload(); }} />}
      {stockFor && <StockModal productId={stockFor.id} name={stockFor.name} current={stockOf(stockFor.id)} onClose={() => setStockFor(null)} onSaved={() => { setStockFor(null); stock.reload(); }} />}
      {toggle && (
        <ConfirmDialog
          title={toggle.active ? "Hide this product?" : "Show this product?"}
          message={toggle.active ? "Shoppers will no longer see it. Existing orders are not affected." : "Shoppers will be able to see and buy it again."}
          confirmText={toggle.active ? "Hide" : "Show"}
          danger={toggle.active}
          onConfirm={async () => {
            if (toggle.active) await api.products.deactivate(toggle.id);
            else await api.products.activate(toggle.id);
            toast.success(toggle.active ? "Product hidden" : "Product visible");
            list.reload();
          }}
          onClose={() => setToggle(null)}
        />
      )}
    </>
  );
}

/* ---------------- offers ---------------- */

function OfferModal({ onClose, onSaved }) {
  const toast = useToast();
  const prods = useLoad(() => api.products.mine(0, 100), []);
  const now = new Date();
  const week = new Date(Date.now() + 7 * 86400000);
  const [f, setF] = useState({ title: "", productId: "", discountType: "PERCENT", discountValue: "", minQuantity: 1, startsAt: toLocalInput(now), endsAt: toLocalInput(week) });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e && e.preventDefault();
    const v = {};
    if (!f.title.trim()) v.title = "Give the offer a name";
    const val = Number(f.discountValue);
    if (!(val >= 0.01)) v.discountValue = "Enter a positive value";
    else if (f.discountType === "PERCENT" && val > 100) v.discountValue = "A percentage cannot be more than 100";
    if (!(Number(f.minQuantity) >= 1 && Number(f.minQuantity) <= 1000)) v.minQuantity = "Between 1 and 1000";
    if (!f.startsAt || !f.endsAt) v.endsAt = "Choose both dates";
    else if (new Date(f.endsAt) <= new Date(f.startsAt)) v.endsAt = "The end must be after the start";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.offers.create({
        title: f.title.trim(),
        productId: f.productId ? Number(f.productId) : null,
        discountType: f.discountType,
        discountValue: val,
        minQuantity: Number(f.minQuantity),
        startsAt: new Date(f.startsAt).toISOString(),
        endsAt: new Date(f.endsAt).toISOString()
      });
      toast.success("Offer created");
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal wide title="New offer" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Create offer</Button></>}>
      <form className="form-grid" onSubmit={submit} noValidate>
        <TextInput className="span-2" label="Offer name" required maxLength={120} value={f.title} onChange={set("title")} error={errors.title} placeholder="Festive sale" />
        <Select className="span-2" label="Applies to" value={f.productId} onChange={set("productId")} hint="Leave on the first option to cover every product of your brand">
          <option value="">All products of my brand</option>
          {prods.data && prods.data.content.map((p) => <option key={p.id} value={p.id}>{p.name}{p.size ? " / " + p.size : ""}{p.color ? " / " + p.color : ""}</option>)}
        </Select>
        <Select label="Discount type" value={f.discountType} onChange={set("discountType")}>
          <option value="PERCENT">Percent off</option>
          <option value="FLAT">Flat amount off each unit</option>
        </Select>
        <TextInput label={f.discountType === "PERCENT" ? "Percent" : "Amount (Rs)"} required type="number" min="0.01" step="0.01" value={f.discountValue} onChange={set("discountValue")} error={errors.discountValue} />
        <TextInput label="Minimum quantity" type="number" min="1" max="1000" value={f.minQuantity} onChange={set("minQuantity")} error={errors.minQuantity} hint="1 means the offer always applies" />
        <span />
        <TextInput label="Starts" type="datetime-local" required value={f.startsAt} onChange={set("startsAt")} />
        <TextInput label="Ends" type="datetime-local" required value={f.endsAt} onChange={set("endsAt")} error={errors.endsAt} />
      </form>
      <ErrorBox error={error} />
    </Modal>
  );
}

export function SellerOffers() {
  const toast = useToast();
  const list = useLoad(() => api.offers.list(), []);
  const prods = useLoad(() => api.products.mine(0, 100), []);
  const [creating, setCreating] = useState(false);
  const [off, setOff] = useState(null);

  const nameOf = (id) => {
    if (!id) return "Whole brand";
    const p = prods.data && prods.data.content.find((x) => x.id === id);
    return p ? p.name : "Product #" + id;
  };
  const state = (o) => {
    const now = Date.now();
    if (!o.active) return ["Switched off", "cancelled"];
    if (new Date(o.endsAt) < now) return ["Ended", "expired"];
    if (new Date(o.startsAt) > now) return ["Scheduled", "pending"];
    return ["Running", "confirmed"];
  };

  return (
    <>
      <PageHeader title="Offers" subtitle="Discounts shoppers get automatically. Only the best offer applies to each item." actions={<Button icon="plus" onClick={() => setCreating(true)}>New offer</Button>} />
      {list.loading && !list.data && <Spinner />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.data && list.data.length === 0 && <Empty icon="tag" title="No offers yet" text="Create a percentage or flat discount for a product or your whole brand." action={<Button icon="plus" onClick={() => setCreating(true)}>New offer</Button>} />}
      {list.data && list.data.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Offer</th><th>Applies to</th><th>Discount</th><th className="num">Min qty</th><th>Dates</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.data.map((o) => {
                  const [label, tone] = state(o);
                  return (
                    <tr key={o.id}>
                      <td data-label="Offer"><strong>{o.title}</strong></td>
                      <td data-label="Applies to">{nameOf(o.productId)}</td>
                      <td data-label="Discount">{o.discountType === "PERCENT" ? Number(o.discountValue) + "%" : formatMoney(o.discountValue) + " off"}</td>
                      <td data-label="Min qty" className="num">{o.minQuantity}</td>
                      <td data-label="Dates"><span className="small">{formatDate(o.startsAt)}<br />to {formatDate(o.endsAt)}</span></td>
                      <td data-label="Status"><span className={"badge badge-" + tone}>{label}</span></td>
                      <td className="row-actions">{o.active && <button className="btn btn-ghost btn-sm" onClick={() => setOff(o)}>Switch off</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {creating && <OfferModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.reload(); }} />}
      {off && <ConfirmDialog title="Switch off this offer?" message={"\"" + off.title + "\" will stop applying right away. It stays in your list as history."} confirmText="Switch off" danger onConfirm={async () => { await api.offers.deactivate(off.id); toast.success("Offer switched off"); list.reload(); }} onClose={() => setOff(null)} />}
    </>
  );
}

/* ---------------- stock ---------------- */

export function SellerInventory() {
  const [page, setPage] = useState(0);
  const stock = useLoad(() => api.inventory.mine(page, 20), [page]);
  const prods = useLoad(() => api.products.mine(0, 100), []);
  const [adjust, setAdjust] = useState(null);
  const nameOf = (id) => {
    const p = prods.data && prods.data.content.find((x) => x.id === id);
    return p ? p : null;
  };
  const data = stock.data;

  return (
    <>
      <PageHeader title="Stock" subtitle="How many units of each product you can sell right now." />
      {stock.loading && !data && <Spinner />}
      <ErrorBox error={stock.error} onRetry={stock.reload} />
      {data && data.content.length === 0 && <Empty icon="layers" title="No stock records yet" text="Stock is created automatically when you add a product." />}
      {data && data.content.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th className="num">Available</th><th>Last change</th><th /></tr></thead>
              <tbody>
                {data.content.map((row) => {
                  const p = nameOf(row.productId);
                  return (
                    <tr key={row.productId}>
                      <td data-label="Product">
                        <strong>{p ? p.name : "Product #" + row.productId}</strong>
                        {p && <div className="muted small">{[p.size, p.color, p.sku].filter(Boolean).join(" / ")}</div>}
                      </td>
                      <td data-label="Available" className="num"><span className={row.availableQuantity <= 5 ? "low-stock" : ""}>{row.availableQuantity}</span></td>
                      <td data-label="Last change">{formatDate(row.updatedAt)}</td>
                      <td className="row-actions"><Button variant="outline" size="sm" onClick={() => setAdjust({ id: row.productId, name: p ? p.name : "Product #" + row.productId, qty: row.availableQuantity })}>Change stock</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      {adjust && <StockModal productId={adjust.id} name={adjust.name} current={adjust.qty} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); stock.reload(); }} />}
    </>
  );
}
