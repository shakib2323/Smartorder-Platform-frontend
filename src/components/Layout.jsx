import { useEffect, useRef, useState } from "react";
import { Link, navigate, useRoute } from "../router";
import { useAuth, useCart } from "../state";
import { CATEGORIES, titleCase } from "../utils";
import Icon from "./Icon";

export function Logo({ light }) {
  return (
    <Link to="/" className={"logo" + (light ? " logo-light" : "")} aria-label="SmartOrder home">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={"lg" + (light ? "l" : "d")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={"url(#lg" + (light ? "l" : "d") + ")"} />
        <path d="M11 15h18l-1.4 14H12.4z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M15.500 15v-1.500a4.500 4.500 0 0 1 9 0V15" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="30" cy="10" r="3.6" fill="#f59e0b" />
      </svg>
      <span>Smart<b>Order</b></span>
    </Link>
  );
}

// menu entries for each kind of account
export function accountLinks(user) {
  if (!user) return [];
  if (user.role === "SELLER")
    return [
      { to: "/seller", label: "Seller dashboard", icon: "dashboard" },
      { to: "/seller/products", label: "My products", icon: "box" },
      { to: "/seller/orders", label: "Orders to ship", icon: "truck" },
      { to: "/seller/brand", label: "My brand", icon: "store" },
      { to: "/account", label: "Account", icon: "user" }
    ];
  if (user.role === "ADMIN")
    return [
      { to: "/admin", label: "Admin home", icon: "dashboard" },
      { to: "/admin/brands", label: "Brand approvals", icon: "shield" },
      { to: "/admin/orders", label: "All orders", icon: "list" },
      { to: "/admin/inventory", label: "Stock tools", icon: "layers" },
      { to: "/admin/catalog", label: "Catalogue", icon: "box" },
      { to: "/account", label: "Account", icon: "user" }
    ];
  return [
    { to: "/orders", label: "My orders", icon: "receipt" },
    { to: "/cart", label: "My cart", icon: "cart" },
    { to: "/account", label: "Account", icon: "user" }
  ];
}

export function Header() {
  const { user, logout, isCustomer } = useAuth();
  const { cart } = useCart();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [route.path]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
  }, [open]);

  const search = (e) => {
    e.preventDefault();
    navigate("/shop" + (q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""));
    setOpen(false);
  };

  const links = accountLinks(user);
  const active = (p) => (route.path === p || (p !== "/" && route.path.startsWith(p + "/")) ? "active" : "");

  return (
    <header className={"site-header" + (scrolled ? " scrolled" : "")}>
      <div className="topbar">
        <div className="container topbar-in">
          <span><Icon name="receipt" size={15} /> A GST invoice with every order</span>
          <span className="hide-sm"><Icon name="truck" size={15} /> Cash on delivery</span>
          <span className="hide-sm"><Icon name="tag" size={15} /> Seller offers applied automatically</span>
        </div>
      </div>
      <div className="container nav">
        <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={24} />
        </button>
        <Logo />
        <nav className="nav-links" aria-label="Main">
          <Link to="/shop" className={active("/shop")}>Shop</Link>
          <Link to="/brands" className={active("/brands")}>Brands</Link>
          {(!user || isCustomer) && <Link to="/sell" className={active("/sell")}>Sell with us</Link>}
        </nav>
        <form className="nav-search" onSubmit={search} role="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" />
        </form>
        <div className="nav-actions">
          {(!user || isCustomer) && (
            <Link to="/cart" className="icon-btn cart-btn" aria-label={"Cart, " + cart.totalItems + " items"}>
              <Icon name="cart" size={22} />
              {cart.totalItems > 0 && <span className="count">{cart.totalItems}</span>}
            </Link>
          )}
          {user ? (
            <div className="account" ref={menuRef}>
              <button className="account-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="hide-md">{user.name.split(" ")[0]}</span>
                <Icon name="chevronDown" size={16} />
              </button>
              {menu && (
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <em className={"role role-" + user.role.toLowerCase()}>{titleCase(user.role)}</em>
                  </div>
                  {links.map((l) => (
                    <Link key={l.to} to={l.to}><Icon name={l.icon} size={18} /> {l.label}</Link>
                  ))}
                  <button onClick={() => { logout(); navigate("/"); }}>
                    <Icon name="logout" size={18} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Logo />
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
            </div>
            <form className="nav-search nav-search-drawer" onSubmit={search}>
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" />
            </form>
            <div className="drawer-links">
              <Link to="/shop"><Icon name="grid" size={19} /> Shop everything</Link>
              <Link to="/brands"><Icon name="store" size={19} /> Brands</Link>
              {(!user || isCustomer) && <Link to="/cart"><Icon name="cart" size={19} /> Cart {cart.totalItems > 0 && <span className="count count-inline">{cart.totalItems}</span>}</Link>}
              {(!user || isCustomer) && <Link to="/sell"><Icon name="tag" size={19} /> Sell with us</Link>}
              {links.map((l) => (
                <Link key={l.to} to={l.to}><Icon name={l.icon} size={19} /> {l.label}</Link>
              ))}
            </div>
            <div className="drawer-cats">
              <h4>Categories</h4>
              <div>
                {CATEGORIES.map((c) => (
                  <Link key={c} to={"/shop?category=" + c} className="chip">{titleCase(c)}</Link>
                ))}
              </div>
            </div>
            <div className="drawer-foot">
              {user ? (
                <button className="btn btn-outline" onClick={() => { logout(); navigate("/"); }}><Icon name="logout" size={18} /> Log out</button>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline">Log in</Link>
                  <Link to="/register" className="btn btn-primary">Sign up</Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { user, isCustomer } = useAuth();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Logo light />
          <p>
            A marketplace where independent brands sell directly to you. Offers are applied for you and every order
            comes with a proper GST invoice.
          </p>
          <div className="footer-badges">
            <span><Icon name="shield" size={16} /> Secure login</span>
            <span><Icon name="receipt" size={16} /> GST invoices</span>
            <span><Icon name="truck" size={16} /> Cash on delivery</span>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop">All products</Link>
          <Link to="/shop?sort=newest">New arrivals</Link>
          <Link to="/shop?sort=price_asc">Lowest price first</Link>
          <Link to="/brands">All brands</Link>
        </div>
        <div>
          <h4>Categories</h4>
          {CATEGORIES.slice(0, 6).map((c) => (
            <Link key={c} to={"/shop?category=" + c}>{titleCase(c)}</Link>
          ))}
        </div>
        <div>
          <h4>Your account</h4>
          {user ? (
            <>
              <Link to="/account">Account</Link>
              {isCustomer && <Link to="/orders">My orders</Link>}
              {isCustomer && <Link to="/cart">Cart</Link>}
              {user.role === "SELLER" && <Link to="/seller">Seller dashboard</Link>}
              {user.role === "ADMIN" && <Link to="/admin">Admin home</Link>}
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Create an account</Link>
              <Link to="/register-seller">Open a seller account</Link>
            </>
          )}
        </div>
        <div>
          <h4>Sell on SmartOrder</h4>
          <Link to="/sell">How selling works</Link>
          <Link to="/register-seller">Become a seller</Link>
          <Link to="/seller/offers">Offers and discounts</Link>
          <Link to="/seller/orders">Fulfilment</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>&copy; {new Date().getFullYear()} SmartOrder. All prices are in INR and include GST.</span>
        <span>Built for independent sellers and the people who shop with them.</span>
      </div>
    </footer>
  );
}
