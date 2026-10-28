import { useEffect, useRef, useState, useCallback } from "react";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const moneyWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatMoney(value) {
  const n = Number(value || 0);
  return Number.isInteger(n) ? moneyWhole.format(n) : money.format(n);
}

export function formatDate(value, withTime = true) {
  if (!value) return "-";
  const d = new Date(value);
  const opts = withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleString("en-IN", opts);
}

export function toLocalInput(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export const CATEGORIES = [
  "CLOTHING", "FOOTWEAR", "ACCESSORIES", "BAGS", "JEWELLERY", "BEAUTY", "ELECTRONICS",
  "HOME", "SPORTS", "BOOKS", "TOYS", "GROCERY", "OTHER"
];

export function titleCase(text) {
  if (!text) return "";
  return text.charAt(0) + text.slice(1).toLowerCase().replace(/_/g, " ");
}

export const GST_SLABS = [0, 5, 12, 18, 28];

export const ORDER_STATUSES = ["PENDING", "RESERVED", "CONFIRMED", "SHIPPED", "DELIVERED", "REJECTED", "CANCELLED", "EXPIRED"];

export const STATUS_HELP = {
  PENDING: "Waiting for the stock to be reserved",
  RESERVED: "Stock is held for you until the time runs out",
  CONFIRMED: "Order is confirmed and waiting for the seller to ship",
  SHIPPED: "On its way",
  DELIVERED: "Delivered",
  REJECTED: "There was not enough stock",
  CANCELLED: "Cancelled, stock was released",
  EXPIRED: "The reservation was not confirmed in time"
};

export function errorText(err) {
  if (!err) return "";
  if (err.details && err.details.length) return err.message + ": " + err.details.join(", ");
  return err.message || "Something went wrong";
}

// A small data-loading hook: runs the loader whenever deps change.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const counter = useRef(0);

  const run = useCallback((silent) => {
    const id = ++counter.current;
    if (!silent) setState((s) => ({ data: s.data, loading: true, error: null }));
    return Promise.resolve()
      .then(loader)
      .then((data) => {
        if (id === counter.current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (id === counter.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run(false);
    return () => {
      counter.current++;
    };
  }, [run]);

  return { ...state, reload: () => run(false), refresh: () => run(true), setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function newKey() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return "key-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Recently viewed products are only kept in this browser.
const RECENT_KEY = "smartorder.recent";
export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch (e) {
    return [];
  }
}
export function rememberProduct(id) {
  const list = [id, ...getRecent().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}
