import { useRef, useState } from "react";
import * as api from "../api";
import { useToast } from "../state";
import { CATEGORIES, errorText, GST_SLABS, titleCase } from "../utils";
import { Button, ErrorBox, Modal, ProductImage, Select, TextArea, TextInput, Notice } from "./ui";
import Icon from "./Icon";

/* ---------------- delivery address ---------------- */

export const emptyAddress = {
  fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "India"
};

const ADDRESS_KEY = "smartorder.address";
export function loadSavedAddress() {
  try {
    return Object.assign({}, emptyAddress, JSON.parse(localStorage.getItem(ADDRESS_KEY)));
  } catch (e) {
    return { ...emptyAddress };
  }
}
export function saveAddress(a) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(a));
}

// same rules as the backend (ShippingAddressRequest)
export function validateAddress(a) {
  const e = {};
  if (!a.fullName.trim()) e.fullName = "Full name is required";
  if (!a.phone.trim()) e.phone = "Phone number is required";
  else if (!/^\+?[0-9 ()-]{7,20}$/.test(a.phone.trim())) e.phone = "Use 7 to 20 digits, spaces, brackets or dashes";
  if (!a.line1.trim()) e.line1 = "Address is required";
  if (!a.city.trim()) e.city = "City is required";
  if (!a.state.trim()) e.state = "State is required";
  if (!a.postalCode.trim()) e.postalCode = "Postal code is required";
  if (!a.country.trim()) e.country = "Country is required";
  return e;
}

export function AddressForm({ value, onChange, errors = {} }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="form-grid">
      <TextInput label="Full name" required value={value.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" maxLength={100} />
      <TextInput label="Phone" required value={value.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" inputMode="tel" />
      <TextInput className="span-2" label="Address line 1" required value={value.line1} onChange={set("line1")} error={errors.line1} autoComplete="address-line1" maxLength={200} />
      <TextInput className="span-2" label="Address line 2" hint="Flat, floor, landmark (optional)" value={value.line2} onChange={set("line2")} autoComplete="address-line2" maxLength={200} />
      <TextInput label="City" required value={value.city} onChange={set("city")} error={errors.city} autoComplete="address-level2" />
      <TextInput label="State" required hint="Spell it the same way as the seller's state so GST is split correctly" value={value.state} onChange={set("state")} error={errors.state} autoComplete="address-level1" />
      <TextInput label="Postal code" required value={value.postalCode} onChange={set("postalCode")} error={errors.postalCode} autoComplete="postal-code" maxLength={20} />
      <TextInput label="Country" required value={value.country} onChange={set("country")} error={errors.country} autoComplete="country-name" />
    </div>
  );
}

/* ---------------- product create / edit ---------------- */

export function ProductFormModal({ product, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!product;
  const [f, setF] = useState({
    name: product ? product.name : "",
    description: product ? product.description || "" : "",
    price: product ? product.price : "",
    category: product ? product.category : "CLOTHING",
    size: product ? product.size || "" : "",
    color: product ? product.color || "" : "",
    sku: product ? product.sku || "" : "",
    gstRatePercent: product ? String(Number(product.gstRatePercent || 0)) : "0",
    hsnCode: product ? product.hsnCode || "" : "",
    initialStock: 0
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!(Number(f.price) >= 0.01)) e.price = "Price must be at least 0.01";
    if (f.sku && !/^[A-Za-z0-9._-]*$/.test(f.sku)) e.sku = "Letters, digits, dot, dash and underscore only";
    if (f.hsnCode && !/^[0-9]{4,8}$/.test(f.hsnCode)) e.hsnCode = "HSN code is 4 to 8 digits";
    if (!editing && (Number(f.initialStock) < 0 || Number(f.initialStock) > 1000000)) e.initialStock = "Between 0 and 1,000,000";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    const body = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      price: Number(f.price),
      category: f.category,
      size: f.size.trim() || null,
      color: f.color.trim() || null,
      sku: f.sku.trim() || null,
      gstRatePercent: Number(f.gstRatePercent),
      hsnCode: f.hsnCode.trim() || null
    };
    if (!editing) body.initialStock = Number(f.initialStock) || 0;
    try {
      const saved = editing ? await api.products.update(product.id, body) : await api.products.create(body);
      toast.success(editing ? "Product updated" : "Product created");
      onSaved(saved, !editing);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={editing ? "Edit product" : "New product"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={submit}>{editing ? "Save changes" : "Create product"}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="form-grid" noValidate>
        <TextInput className="span-2" label="Product name" required value={f.name} onChange={set("name")} error={errors.name} maxLength={200} />
        <TextArea className="span-2" label="Description" value={f.description} onChange={set("description")} maxLength={1000} />
        <TextInput label="Price (GST included)" required type="number" min="0.01" step="0.01" value={f.price} onChange={set("price")} error={errors.price} />
        <Select label="Category" required value={f.category} onChange={set("category")}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
        </Select>
        <TextInput label="Size" hint="S, M, 42 ..." value={f.size} onChange={set("size")} maxLength={20} />
        <TextInput label="Colour" value={f.color} onChange={set("color")} maxLength={30} />
        <TextInput label="SKU" value={f.sku} onChange={set("sku")} error={errors.sku} maxLength={50} />
        <Select label="GST rate" value={f.gstRatePercent} onChange={set("gstRatePercent")}>
          {GST_SLABS.map((s) => <option key={s} value={s}>{s}%</option>)}
        </Select>
        <TextInput label="HSN code" hint="4 to 8 digits" value={f.hsnCode} onChange={set("hsnCode")} error={errors.hsnCode} />
        {!editing && (
          <TextInput label="Opening stock" type="number" min="0" max="1000000" value={f.initialStock} onChange={set("initialStock")} error={errors.initialStock} hint="Units you have right now" />
        )}
        <div className="span-2">
          <Notice type="info">
            Selling the same item in other sizes or colours? Create one product for each variant with the same name.
          </Notice>
        </div>
      </form>
      <ErrorBox error={error} />
    </Modal>
  );
}

/* ---------------- product pictures ---------------- */

export function ImageManagerModal({ productId, name, category, initial, onClose, onChanged }) {
  const toast = useToast();
  const [images, setImages] = useState(initial || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const apply = (list) => {
    setImages(list);
    onChanged && onChanged(list);
  };

  const upload = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError({ message: "Use a JPG, PNG or WebP picture" });
    if (file.size > 5 * 1024 * 1024) return setError({ message: "The picture must be 5 MB or smaller" });
    await run(() => api.products.addImage(productId, file), "Picture added");
  };

  const run = async (call, success) => {
    setBusy(true);
    setError(null);
    try {
      apply(await call());
      if (success) toast.success(success);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal wide title={"Pictures: " + name} onClose={onClose}>
      <p className="muted">JPG, PNG or WebP up to 5 MB. You can add 8 pictures. The cover is the one shoppers see first.</p>
      <div className="image-grid">
        {images.map((img) => (
          <div key={img.id} className={"image-tile" + (img.primary ? " is-cover" : "")}>
            <ProductImage src={img.url} name={name} category={category} id={img.id} />
            {img.primary && <span className="cover-tag">Cover</span>}
            <div className="image-tile-actions">
              {!img.primary && (
                <button disabled={busy} onClick={() => run(() => api.products.makePrimary(productId, img.id), "Cover changed")}>Make cover</button>
              )}
              <button className="danger" disabled={busy} onClick={() => run(() => api.products.deleteImage(productId, img.id), "Picture removed")} aria-label="Delete picture">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
        {images.length < 8 && (
          <button className="image-add" disabled={busy} onClick={() => fileRef.current.click()}>
            {busy ? <span className="spinner" /> : <Icon name="upload" size={26} />}
            <span>Add picture</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
      <ErrorBox error={error} />
    </Modal>
  );
}

/* ---------------- stock change ---------------- */

export function StockModal({ productId, name, current, onClose, onSaved }) {
  const toast = useToast();
  const [delta, setDelta] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const n = Number(delta);
  const valid = delta !== "" && Number.isInteger(n) && n !== 0 && Math.abs(n) <= 1000000;
  const after = (current ?? 0) + (valid ? n : 0);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.inventory.adjust(productId, n);
      toast.success("Stock is now " + res.availableQuantity);
      onSaved(res);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Change stock"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || after < 0} loading={busy} onClick={save}>Apply</Button>
        </>
      }
    >
      <p><strong>{name}</strong></p>
      <p className="muted">Currently {current ?? "unknown"} in stock. Use a plus number to add units and a minus number to remove them.</p>
      <TextInput label="Change by" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="for example 25 or -3" autoFocus />
      <div className="quick-row">
        {[-10, -1, 1, 10, 50].map((d) => (
          <button key={d} className="chip chip-btn" onClick={() => setDelta(String(d))}>{d > 0 ? "+" + d : d}</button>
        ))}
      </div>
      {valid && <p className={after < 0 ? "field-error" : "muted"}>Stock after the change: <strong>{after}</strong></p>}
      <ErrorBox error={error} />
    </Modal>
  );
}
