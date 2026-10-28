const BASE = ((window.SMARTORDER_CONFIG && window.SMARTORDER_CONFIG.API_BASE) || "http://localhost:8084").replace(/\/$/, "");
const SESSION_KEY = "smartorder.session";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

/*session storage*/

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (e) {
    return null;
  }
}
export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/* ---------- helpers ---------- */

export function imageUrl(path)
{
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return BASE + path;
}

function queryString(params) 
{
  if (!params) return "";
  const q = new URLSearchParams();
  Object.keys(params).forEach((key) => 
  {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") q.append(key, value);
  });
  const text = q.toString();
  return text ? "?" + text : "";
}

async function readError(res) 
{
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    /* not json */
  }
  const message = (body && (body.message || body.error)) || "Something went wrong (" + res.status + ")";
  return new ApiError(res.status, message, body && body.details);
}

async function send(method, path, options = {}) 
{
  const session = getSession();
  const headers = Object.assign({}, options.headers);
  if (session && session.accessToken) headers.Authorization = "Bearer " + session.accessToken;

  let body;
  if (options.form) {
    body = options.form; // the browser sets the multipart boundary itself
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(BASE + path + queryString(options.query), { method, headers, body });
  } catch (e) {
    throw new ApiError(0, "Cannot reach the server. Please check that the API gateway is running.");
  }

  if (!res.ok) {
    if (res.status === 401 && session && !options.quiet401) onUnauthorized();
    throw await readError(res);
  }
  return res;
}

async function json(method, path, options) 
{
  const res = await send(method, path, options);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Opens a PDF in a new tab. The window is opened first so the browser does not block it as a popup.
export async function openPdf(path) 
{
  const win = window.open("", "_blank");
  try {
    const res = await send("GET", path);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (win) win.close();
    throw e;
  }
}

/* ---------- auth ---------- */

export const auth = {
  login: (email, password) => json("POST", "/api/v1/auth/login", { body: { email, password }, quiet401: true }),
  register: (data) => json("POST", "/api/v1/auth/register", { body: data }),
  registerSeller: (data) => json("POST", "/api/v1/auth/register-seller", { body: data }),
  me: () => json("GET", "/api/v1/auth/me", { quiet401: true })
};

/* ---------- products, brands, offers ---------- */

export const products = {
  search: (params) => json("GET", "/api/v1/products", { query: params }),
  get: (id) => json("GET", "/api/v1/products/" + id),
  batch: (ids) => json("GET", "/api/v1/products/batch", { query: { ids: ids.join(",") } }),
  mine: (page = 0, size = 20) => json("GET", "/api/v1/products/mine", { query: { page, size } }),
  create: (data) => json("POST", "/api/v1/products", { body: data }),
  update: (id, data) => json("PUT", "/api/v1/products/" + id, { body: data }),
  deactivate: (id) => json("DELETE", "/api/v1/products/" + id),
  activate: (id) => json("POST", "/api/v1/products/" + id + "/activate"),
  addImage: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return json("POST", "/api/v1/products/" + id + "/images", { form });
  },
  deleteImage: (id, imageId) => json("DELETE", "/api/v1/products/" + id + "/images/" + imageId),
  makePrimary: (id, imageId) => json("PUT", "/api/v1/products/" + id + "/images/" + imageId + "/primary")
};

export const brands = {
  list: (page = 0, size = 20) => json("GET", "/api/v1/brands", { query: { page, size } }),
  get: (id) => json("GET", "/api/v1/brands/" + id),
  mine: () => json("GET", "/api/v1/brands/me"),
  register: (data) => json("POST", "/api/v1/brands", { body: data }),
  updateMine: (data) => json("PUT", "/api/v1/brands/me", { body: data }),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append("file", file);
    return json("POST", "/api/v1/brands/me/logo", { form });
  },
  adminList: (status, page = 0, size = 20) => json("GET", "/api/v1/brands/admin/all", { query: { status, page, size } }),
  approve: (id) => json("POST", "/api/v1/brands/" + id + "/approve"),
  suspend: (id) => json("POST", "/api/v1/brands/" + id + "/suspend")
};

export const offers = {
  list: () => json("GET", "/api/v1/brands/me/offers"),
  create: (data) => json("POST", "/api/v1/brands/me/offers", { body: data }),
  deactivate: (id) => json("DELETE", "/api/v1/brands/me/offers/" + id)
};

//inventory

export const inventory = {
  get: (productId) => json("GET", "/api/v1/inventory/" + productId),
  mine: (page = 0, size = 50) => json("GET", "/api/v1/inventory/mine", { query: { page, size } }),
  adjust: (productId, delta) => json("PATCH", "/api/v1/inventory/" + productId, { body: { delta } }),
  create: (productId, availableQuantity) => json("POST", "/api/v1/inventory", { body: { productId, availableQuantity } })
};

// cart and orders 

export const cart = {
  get: () => json("GET", "/api/v1/cart"),
  add: (productId, quantity) => json("POST", "/api/v1/cart/items", { body: { productId, quantity } }),
  setQuantity: (productId, quantity) => json("PUT", "/api/v1/cart/items/" + productId, { body: { quantity } }),
  remove: (productId) => json("DELETE", "/api/v1/cart/items/" + productId),
  clear: () => json("DELETE", "/api/v1/cart"),
  // returns { status, data } because 200 means "this key was already used"
  checkout: async (key, body) => {
    const res = await send("POST", "/api/v1/cart/checkout", { body, headers: { "Idempotency-Key": key } });
    return { replayed: res.status === 200, data: await res.json() };
  }
};

export const orders = {
  place: async (key, body) => {
    const res = await send("POST", "/api/v1/orders", { body, headers: { "Idempotency-Key": key } });
    return { replayed: res.status === 200, data: await res.json() };
  },
  list: (params) => json("GET", "/api/v1/orders", { query: params }),
  get: (id) => json("GET", "/api/v1/orders/" + id),
  cancel: (id) => json("POST", "/api/v1/orders/" + id + "/cancel"),
  confirmReservation: (id) => json("POST", "/api/v1/orders/" + id + "/confirm-reservation"),
  invoice: (id) => json("GET", "/api/v1/orders/" + id + "/invoice"),
  openInvoicePdf: (id) => openPdf("/api/v1/orders/" + id + "/invoice.pdf")
};

export const sellerOrders = {
  list: (params) => json("GET", "/api/v1/seller/orders", { query: params }),
  summary: () => json("GET", "/api/v1/seller/orders/summary"),
  get: (id) => json("GET", "/api/v1/seller/orders/" + id),
  ship: (id, trackingNumber) =>
    json("POST", "/api/v1/seller/orders/" + id + "/ship", { body: trackingNumber ? { trackingNumber } : {} }),
  deliver: (id) => json("POST", "/api/v1/seller/orders/" + id + "/deliver"),
  invoice: (id) => json("GET", "/api/v1/seller/orders/" + id + "/invoice"),
  openInvoicePdf: (id) => openPdf("/api/v1/seller/orders/" + id + "/invoice.pdf")
};
