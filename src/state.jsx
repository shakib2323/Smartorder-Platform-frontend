import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api";

/* ---------------- toasts ---------------- */

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const nextId = useRef(1);

  const push = useCallback((message, type = "info") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, type }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(
    () => ({
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info")
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={"toast toast-" + t.type}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------- login session ---------------- */

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const s = api.getSession();
    return s && s.expiresAt > Date.now() ? s : null;
  });
  const [checking, setChecking] = useState(!!session);

  const logout = useCallback(() => {
    api.clearSession();
    setSession(null);
  }, []);

  // a 401 from any call means the token is no longer valid
  useEffect(() => {
    api.setUnauthorizedHandler(logout);
  }, [logout]);

  // make sure a stored token still works when the site opens
  useEffect(() => {
    if (!session) {
      setChecking(false);
      return;
    }
    api
      .auth.me()
      .then((user) => {
        const updated = { ...session, user };
        api.saveSession(updated);
        setSession(updated);
      })
      .catch((err) => {
        if (err.status === 401) logout();
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // log out when the token runs out
  useEffect(() => {
    if (!session) return undefined;
    const wait = session.expiresAt - Date.now();
    if (wait <= 0) {
      logout();
      return undefined;
    }
    const t = setTimeout(logout, Math.min(wait, 2147483000));
    return () => clearTimeout(t);
  }, [session, logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.auth.login(email, password);
    const s = { accessToken: res.accessToken, expiresAt: Date.now() + res.expiresIn * 1000, user: res.user };
    api.saveSession(s);
    setSession(s);
    return res.user;
  }, []);

  const value = useMemo(() => {
    const user = session ? session.user : null;
    return {
      user,
      checking,
      login,
      logout,
      expiresAt: session ? session.expiresAt : null,
      isCustomer: !!user && user.role === "CUSTOMER",
      isSeller: !!user && user.role === "SELLER",
      isAdmin: !!user && user.role === "ADMIN"
    };
  }, [session, checking, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------------- cart (customers only) ---------------- */

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const emptyCart = { items: [], totalItems: 0, totalAmount: 0, totalSavings: 0 };

export function CartProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isCustomer) {
      setCart(emptyCart);
      return emptyCart;
    }
    setLoading(true);
    try {
      const data = await api.cart.get();
      setCart(data);
      return data;
    } catch (e) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    reload();
  }, [reload, user && user.id]);

  const run = async (call) => {
    const data = await call();
    if (data) setCart(data);
    return data;
  };

  const value = useMemo(
    () => ({
      cart,
      loading,
      reload,
      add: (productId, quantity) => run(() => api.cart.add(productId, quantity)),
      setQuantity: (productId, quantity) => run(() => api.cart.setQuantity(productId, quantity)),
      remove: async (productId) => {
        await api.cart.remove(productId);
        return reload();
      },
      clear: async () => {
        await api.cart.clear();
        setCart(emptyCart);
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, loading, reload]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
