import { useState } from "react";
import * as api from "../api";
import { Link, navigate, useRoute } from "../router";
import { useAuth, useToast } from "../state";
import { errorText, formatDate, titleCase } from "../utils";
import Icon from "../components/Icon";
import { Logo } from "../components/Layout";
import { Button, ErrorBox, LinkButton, PageHeader, TextInput } from "../components/ui";

function AuthShell({ title, subtitle, children, side }) {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <Logo light />
        <div>
          <h2>{side.title}</h2>
          <ul>
            {side.points.map((p) => <li key={p}><Icon name="check" size={18} /> {p}</li>)}
          </ul>
        </div>
        <small>Your password is never stored in plain text and your session ends by itself after a while.</small>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function landingFor(user, next) {
  if (next && next.startsWith("/")) return next;
  if (user.role === "SELLER") return "/seller";
  if (user.role === "ADMIN") return "/admin";
  return "/";
}

export function Login() {
  const { login } = useAuth();
  const { query } = useRoute();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success("Welcome back, " + user.name.split(" ")[0]);
      navigate(landingFor(user, query.get("next")), true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Log in" subtitle="Welcome back. Sign in to see your cart, orders and store."
      side={{ title: "Pick up right where you left off", points: ["Your cart and reservations are waiting", "Follow every order to your door", "Download your GST invoices"] }}>
      <form onSubmit={submit} className="stack" noValidate>
        <TextInput label="Email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextInput label="Password" type={show ? "text" : "password"} required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
        {error && (
          <div className="notice notice-error" role="alert">
            <Icon name="alert" />
            <div>
              {error.status === 429 ? "Too many wrong attempts. This email is locked for a little while, please try again later." : error.status === 401 ? "The email or password is not correct." : errorText(error)}
            </div>
          </div>
        )}
        <Button type="submit" loading={busy} disabled={!form.email || !form.password}>Log in</Button>
      </form>
      <p className="auth-alt">New here? <Link to="/register">Create an account</Link> or <Link to="/register-seller">open a seller account</Link></p>
    </AuthShell>
  );
}

function RegisterForm({ seller }) {
  const { login } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!f.name.trim()) v.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) v.email = "Enter a valid email";
    if (f.password.length < 8 || f.password.length > 72) v.password = "Password must be 8 to 72 characters";
    if (f.confirm !== f.password) v.confirm = "Passwords do not match";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    try {
      const body = { name: f.name.trim(), email: f.email.trim(), password: f.password };
      if (seller) await api.auth.registerSeller(body);
      else await api.auth.register(body);
      const user = await login(body.email, body.password);
      toast.success("Your account is ready");
      navigate(seller ? "/seller/brand" : landingFor(user), true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={seller ? "Open a seller account" : "Create your account"}
      subtitle={seller ? "Step one of selling. Next you will register your brand." : "It takes less than a minute."}
      side={seller
        ? { title: "Sell under your own brand", points: ["Set your own prices and offers", "GST invoices are made for you", "Manage stock, orders and shipping in one place"] }
        : { title: "Shopping that feels fair", points: ["Offers applied automatically", "Reserve an item before you buy", "Cash on delivery"] }}
    >
      <form onSubmit={submit} className="stack" noValidate>
        <TextInput label="Full name" required autoComplete="name" maxLength={100} value={f.name} onChange={set("name")} error={errors.name} />
        <TextInput label="Email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} error={errors.email} />
        <TextInput label="Password" type="password" required autoComplete="new-password" hint="8 to 72 characters" value={f.password} onChange={set("password")} error={errors.password} />
        <TextInput label="Confirm password" type="password" required autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={errors.confirm} />
        {error && (
          <div className="notice notice-error" role="alert">
            <Icon name="alert" />
            <div>{error.status === 409 ? "An account with this email already exists. Try logging in instead." : errorText(error)}</div>
          </div>
        )}
        <Button type="submit" loading={busy}>{seller ? "Create seller account" : "Create account"}</Button>
      </form>
      <p className="auth-alt">
        Already registered? <Link to="/login">Log in</Link>
        {seller ? <> &middot; Just shopping? <Link to="/register">Customer sign up</Link></> : <> &middot; Want to sell? <Link to="/register-seller">Seller sign up</Link></>}
      </p>
    </AuthShell>
  );
}

export const Register = () => <RegisterForm />;
export const RegisterSeller = () => <RegisterForm seller />;

/* ---------- account ---------- */

export function Account() {
  const { user, logout, expiresAt } = useAuth();
  const links = {
    CUSTOMER: [["/orders", "My orders", "receipt"], ["/cart", "My cart", "cart"], ["/shop", "Keep shopping", "grid"]],
    SELLER: [["/seller", "Seller dashboard", "dashboard"], ["/seller/brand", "My brand", "store"], ["/seller/products", "My products", "box"], ["/seller/orders", "Orders", "truck"]],
    ADMIN: [["/admin/brands", "Brand approvals", "shield"], ["/admin/orders", "All orders", "list"], ["/admin/inventory", "Stock tools", "layers"]]
  }[user.role];
  return (
    <div className="container page narrow">
      <PageHeader title="Your account" subtitle="Details from your login" />
      <div className="card account-card">
        <span className="avatar avatar-lg">{user.name.charAt(0).toUpperCase()}</span>
        <div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
          <span className={"role role-" + user.role.toLowerCase()}>{titleCase(user.role)}</span>
        </div>
      </div>
      <div className="card">
        <dl className="spec">
          <div><dt>Account number</dt><dd>#{user.id}</dd></div>
          <div><dt>Account type</dt><dd>{titleCase(user.role)}</dd></div>
          <div><dt>Session ends</dt><dd>{expiresAt ? formatDate(expiresAt) : "-"}</dd></div>
        </dl>
      </div>
      <div className="quick-links">
        {links.map(([to, label, icon]) => (
          <Link key={to} to={to} className="quick-link"><Icon name={icon} /> {label} <Icon name="chevronRight" size={16} /></Link>
        ))}
      </div>
      <Button variant="outline" icon="logout" onClick={() => { logout(); navigate("/"); }}>Log out</Button>
    </div>
  );
}

/* ---------- sell landing ---------- */

export function Sell() {
  const { user, isSeller } = useAuth();
  const features = [
    ["store", "Your own brand page", "Register your brand with your legal name, city and GSTIN. An admin approves it before you go live."],
    ["box", "Products and variants", "Add pictures (up to 8), sizes, colours, SKU, HSN code and a GST rate for each product."],
    ["tag", "Offers that run themselves", "Percentage or flat discounts for one product or the whole brand, with start and end dates."],
    ["layers", "Stock you control", "Opening stock is set when you add a product. Add or remove units whenever you need."],
    ["truck", "Simple fulfilment", "See your orders, mark them shipped with a tracking number, then delivered."],
    ["receipt", "Invoices without effort", "Every confirmed order gets a GST invoice, split into CGST and SGST or IGST."]
  ];
  return (
    <>
      <section className="sell-hero">
        <div className="container">
          <div className="eyebrow eyebrow-light">Sell on SmartOrder</div>
          <h1>Your brand. Your prices. Our storefront.</h1>
          <p>Open a seller account, register your brand and start selling to shoppers who like independent labels.</p>
          <div className="hero-cta">
            {isSeller ? <LinkButton to="/seller" variant="accent" size="lg" iconAfter="arrowRight">Open my dashboard</LinkButton>
              : <LinkButton to={user ? "/account" : "/register-seller"} variant="accent" size="lg" iconAfter="arrowRight">{user ? "Your account" : "Create a seller account"}</LinkButton>}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><div><div className="eyebrow">What you get</div><h2>Everything a small brand needs</h2></div></div>
          <div className="perk-grid perk-grid-3">
            {features.map(([icon, title, text]) => (
              <div className="perk" key={title}>
                <div className="perk-icon"><Icon name={icon} size={24} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
