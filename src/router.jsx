import { createContext, useContext, useEffect, useState } from "react";

function read() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, search = ""] = raw.split("?");
  return { path: path || "/", query: new URLSearchParams(search) };
}

const RouteContext = createContext(read());

export function RouterProvider({ children }) {
  const [route, setRoute] = useState(read());
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return <RouteContext.Provider value={route}>{children}</RouteContext.Provider>;
}

export const useRoute = () => useContext(RouteContext);

export function navigate(path, replace = false) {
  if (replace) window.history.replaceState(null, "", "#" + path);
  else window.location.hash = path;
  if (replace) window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function Link({ to, children, className, onClick, ...rest }) {
  return (
    <a href={"#" + to} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

// "/product/:id" against "/product/12"  ->  { id: "12" } or null
export function matchPath(pattern, path) {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function buildQuery(obj) {
  const q = new URLSearchParams();
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== "" && obj[k] !== undefined && obj[k] !== null) q.set(k, obj[k]);
  });
  const s = q.toString();
  return s ? "?" + s : "";
}
