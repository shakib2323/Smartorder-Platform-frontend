import { useState } from "react";
import * as api from "../../api";
import { Link } from "../../router";
import { useToast } from "../../state";
import { errorText, formatDate, titleCase, useDebounced, useLoad } from "../../utils";
import Icon from "../../components/Icon";
import { ProductFormModal, StockModal, ImageManagerModal } from "../../components/forms";
import { Button, ConfirmDialog, Empty, ErrorBox, Notice, PageHeader, Pagination, ProductImage, Spinner, StatusBadge, Tabs, TextInput } from "../../components/ui";

export function AdminHome() {
  const pending = useLoad(() => api.brands.adminList("PENDING", 0, 1), []);
  const cards = [
    ["/admin/brands", "Brand approvals", "Review sellers who want to go live", "shield", pending.data ? pending.data.totalElements + " waiting" : ""],
    ["/admin/orders", "All orders", "See and cancel any order, open its invoice", "list", ""],
    ["/admin/inventory", "Stock tools", "Look up, create or adjust stock for any product", "layers", ""],
    ["/admin/catalog", "Catalogue", "Add platform products and manage existing ones", "box", ""]
  ];
  return (
    <>
      <PageHeader title="Admin home" subtitle="Keep the marketplace healthy" />
      <div className="admin-cards">
        {cards.map(([to, title, text, icon, note]) => (
          <Link key={to} to={to} className="admin-card">
            <span className="admin-card-icon"><Icon name={icon} size={24} /></span>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
            {note && <b className="admin-note">{note}</b>}
          </Link>
        ))}
      </div>
    </>
  );
}

export function AdminBrands() {
  const toast = useToast();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(0);
  const list = useLoad(() => api.brands.adminList(status || undefined, page, 10), [status, page]);
  const [target, setTarget] = useState(null); // { brand, action }
  const data = list.data;

  const run = async () => {
    const { brand, action } = target;
    if (action === "approve") await api.brands.approve(brand.id);
    else await api.brands.suspend(brand.id);
    toast.success(brand.name + (action === "approve" ? " approved" : " suspended"));
    list.reload();
  };

  return (
    <>
      <PageHeader title="Brand approvals" subtitle="A brand is only visible to shoppers after you approve it." />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(0); }} tabs={[{ value: "PENDING", label: "Waiting" }, { value: "APPROVED", label: "Approved" }, { value: "SUSPENDED", label: "Suspended" }, { value: "", label: "All" }]} />
      {list.loading && !data && <Spinner />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {data && data.content.length === 0 && <Empty icon="shield" title="Nothing here" text="No brands match this filter." />}
      {data && data.content.map((b) => (
        <div className="card brand-admin" key={b.id}>
          <div className="brand-logo">{b.logoUrl ? <ProductImage src={b.logoUrl} name={b.name} id={b.id} /> : <span>{b.name.charAt(0).toUpperCase()}</span>}</div>
          <div className="brand-admin-info">
            <h3>{b.name} <StatusBadge status={b.status} /></h3>
            <span>{b.legalName}</span>
            <span className="muted small">{b.city}, {b.state} &middot; {b.contactEmail} &middot; {b.gstin ? "GSTIN " + b.gstin : "No GSTIN"}</span>
            <span className="muted small">Owner account #{b.ownerUserId} &middot; registered {formatDate(b.createdAt, false)}</span>
            {b.description && <p className="small">{b.description}</p>}
          </div>
          <div className="brand-admin-actions">
            {b.status !== "APPROVED" && <Button size="sm" icon="check" onClick={() => setTarget({ brand: b, action: "approve" })}>Approve</Button>}
            {b.status !== "SUSPENDED" && <Button size="sm" variant="danger-outline" onClick={() => setTarget({ brand: b, action: "suspend" })}>Suspend</Button>}
          </div>
        </div>
      ))}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      {target && (
        <ConfirmDialog
          title={(target.action === "approve" ? "Approve " : "Suspend ") + target.brand.name + "?"}
          message={target.action === "approve" ? "Its products become visible to shoppers." : "Its products are hidden from shoppers until you approve it again."}
          confirmText={target.action === "approve" ? "Approve" : "Suspend"}
          danger={target.action === "suspend"}
          onConfirm={run}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

export function AdminInventory() {
  const toast = useToast();
  const [idText, setIdText] = useState("");
  const [found, setFound] = useState(null); // { id, qty } or { id, missing: true }
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [openingQty, setOpeningQty] = useState(0);
  const [product, setProduct] = useState(null);

  const lookup = async (e) => {
    e.preventDefault();
    const id = Number(idText);
    if (!Number.isInteger(id) || id <= 0) return setError({ message: "Enter a product number" });
    setBusy(true);
    setError(null);
    setProduct(null);
    api.products.get(id).then(setProduct).catch(() => {});
    try {
      const res = await api.inventory.get(id);
      setFound({ id, qty: res.availableQuantity, at: res.updatedAt });
    } catch (err) {
      if (err.status === 404) setFound({ id, missing: true });
      else {
        setFound(null);
        setError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.inventory.create(found.id, Number(openingQty) || 0);
      setFound({ id: found.id, qty: res.availableQuantity, at: res.updatedAt });
      toast.success("Stock record created");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Stock tools" subtitle="Look up the stock of any product, create a missing record or change the count." />
      <form className="card lookup" onSubmit={lookup}>
        <TextInput label="Product number" type="number" min="1" value={idText} onChange={(e) => setIdText(e.target.value)} placeholder="for example 12" />
        <Button type="submit" loading={busy} icon="search">Look up</Button>
      </form>
      <ErrorBox error={error} />
      {found && !found.missing && (
        <div className="card">
          <h3>{product ? product.name : "Product #" + found.id}</h3>
          {product && <p className="muted">{product.brand.name} &middot; {titleCase(product.category)}</p>}
          <div className="big-number">{found.qty}<span>units available</span></div>
          <p className="muted small">Last updated {formatDate(found.at)}</p>
          <Button variant="outline" icon="layers" onClick={() => setAdjust(true)}>Change stock</Button>
        </div>
      )}
      {found && found.missing && (
        <div className="card">
          <Notice type="warning">Product #{found.id} has no stock record yet. You can create one.</Notice>
          <div className="lookup">
            <TextInput label="Opening quantity" type="number" min="0" max="1000000" value={openingQty} onChange={(e) => setOpeningQty(e.target.value)} />
            <Button loading={busy} onClick={create}>Create stock record</Button>
          </div>
        </div>
      )}
      {adjust && found && <StockModal productId={found.id} name={product ? product.name : "Product #" + found.id} current={found.qty} onClose={() => setAdjust(false)} onSaved={(r) => { setAdjust(false); setFound({ id: found.id, qty: r.availableQuantity, at: r.updatedAt }); }} />}
    </>
  );
}

// Hidden products cannot be found by search, so they are brought back by their number.
function RestoreProduct({ onDone }) {
  const toast = useToast();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    if (!(Number(id) > 0)) return;
    setBusy(true);
    try {
      await api.products.activate(Number(id));
      toast.success("Product #" + id + " is visible again");
      setId("");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card lookup" onSubmit={go}>
      <TextInput label="Show a hidden product again" type="number" min="1" value={id} onChange={(e) => setId(e.target.value)} placeholder="Product number" hint="Hidden products do not appear in search, so use their number" />
      <Button type="submit" variant="outline" loading={busy}>Show product</Button>
    </form>
  );
}

export function AdminCatalog() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(0);
  const list = useLoad(() => api.products.search({ q: dq, page, size: 10 }), [dq, page]);
  const [form, setForm] = useState(null);
  const [pics, setPics] = useState(null);
  const [toggle, setToggle] = useState(null);
  const data = list.data;

  return (
    <>
      <PageHeader title="Catalogue" subtitle="Add platform products or manage what sellers listed." actions={<Button icon="plus" onClick={() => setForm("new")}>New platform product</Button>} />
      <div className="card lookup">
        <TextInput label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name or description" />
      </div>
      <RestoreProduct onDone={list.reload} />
      {list.loading && !data && <Spinner />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {data && data.content.length === 0 && <Empty icon="box" title="No products found" />}
      {data && data.content.length > 0 && (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th /></tr></thead>
              <tbody>
                {data.content.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Product"><div className="cell-product"><ProductImage src={p.imageUrl} name={p.name} category={p.category} id={p.id} /><div><Link to={"/product/" + p.id}><strong>{p.name}</strong></Link><span className="muted small">#{p.id}</span></div></div></td>
                    <td data-label="Brand">{p.brand.name}</td>
                    <td data-label="Category">{titleCase(p.category)}</td>
                    <td className="row-actions">
                      <button className="icon-btn" aria-label="Edit" title="Edit" onClick={() => setForm(p)}><Icon name="edit" size={18} /></button>
                      <button className="icon-btn" aria-label="Pictures" title="Pictures" onClick={() => setPics(p)}><Icon name="image" size={18} /></button>
                      <button className="icon-btn" aria-label="Hide" title="Hide from shop" onClick={() => setToggle(p)}><Icon name="eye" size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      {form && <ProductFormModal product={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={(saved, created) => { setForm(null); list.reload(); if (created) setPics(saved); }} />}
      {pics && <ImageManagerModal productId={pics.id} name={pics.name} category={pics.category} initial={pics.images} onClose={() => { setPics(null); list.reload(); }} />}
      {toggle && <ConfirmDialog title="Hide this product?" message={toggle.name + " will disappear from the shop. Existing orders keep their details."} confirmText="Hide product" danger onConfirm={async () => { await api.products.deactivate(toggle.id); toast.success("Product hidden"); list.reload(); }} onClose={() => setToggle(null)} />}
    </>
  );
}
