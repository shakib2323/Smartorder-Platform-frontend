import { Component } from "react";
import { navigate, matchPath, useRoute } from "./router";
import { useAuth } from "./state";
import { Footer, Header } from "./components/Layout";
import { adminNav, DashboardLayout, sellerNav } from "./components/Dashboard";
import { Empty, LinkButton, Spinner } from "./components/ui";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import { BrandPage, BrandsPage } from "./pages/Brands";
import { Account, Login, Register, RegisterSeller, Sell } from "./pages/Auth";
import CartPage from "./pages/Cart";
import { CustomerOrders, InvoicePage, OrderDetail, OrdersList } from "./pages/Orders";
import { SellerBrand, SellerHome, SellerInventory, SellerOffers, SellerProducts } from "./pages/seller/Seller";
import { AdminBrands, AdminCatalog, AdminHome, AdminInventory } from "./pages/admin/Admin";

// Each entry: path pattern, who may open it, and what to draw.
const routes = [
  { path: "/", render: () => <Home /> },
  { path: "/shop", render: () => <Shop /> },
  { path: "/product/:id", render: (p) => <ProductDetail id={p.id} key={p.id} /> },
  { path: "/brands", render: () => <BrandsPage /> },
  { path: "/brand/:id", render: (p) => <BrandPage id={p.id} key={p.id} /> },
  { path: "/sell", render: () => <Sell /> },
  { path: "/login", render: () => <Login />, guest: true, bare: true },
  { path: "/register", render: () => <Register />, guest: true, bare: true },
  { path: "/register-seller", render: () => <RegisterSeller />, guest: true, bare: true },
  { path: "/account", render: () => <Account />, roles: ["CUSTOMER", "SELLER", "ADMIN"] },

  { path: "/cart", render: () => <CartPage />, roles: ["CUSTOMER"] },
  { path: "/orders", render: () => <CustomerOrders />, roles: ["CUSTOMER"] },
  { path: "/orders/:id", render: (p) => <div className="container page"><OrderDetail id={p.id} mode="customer" key={p.id} /></div>, roles: ["CUSTOMER"], plain: true },
  { path: "/orders/:id/invoice", render: (p) => <div className="container page"><InvoicePage id={p.id} mode="customer" /></div>, roles: ["CUSTOMER"], plain: true },

  { path: "/seller", render: () => <SellerHome />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/brand", render: () => <SellerBrand />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/products", render: () => <SellerProducts />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/offers", render: () => <SellerOffers />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/inventory", render: () => <SellerInventory />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/orders", render: () => <OrdersList mode="seller" />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/orders/:id", render: (p) => <OrderDetail id={p.id} mode="seller" key={p.id} />, roles: ["SELLER"], dash: "seller" },
  { path: "/seller/orders/:id/invoice", render: (p) => <InvoicePage id={p.id} mode="seller" />, roles: ["SELLER"], dash: "seller" },

  { path: "/admin", render: () => <AdminHome />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/brands", render: () => <AdminBrands />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/orders", render: () => <OrdersList mode="admin" />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/orders/:id", render: (p) => <OrderDetail id={p.id} mode="admin" key={p.id} />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/orders/:id/invoice", render: (p) => <InvoicePage id={p.id} mode="admin" />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/inventory", render: () => <AdminInventory />, roles: ["ADMIN"], dash: "admin" },
  { path: "/admin/catalog", render: () => <AdminCatalog />, roles: ["ADMIN"], dash: "admin" }
];

function NotFound() {
  return (
    <div className="container page">
      <Empty icon="search" title="Page not found" text="The page you are looking for does not exist." action={<LinkButton to="/">Go home</LinkButton>} />
    </div>
  );
}

function Blocked({ user }) {
  return (
    <div className="container page">
      <Empty
        icon="lock"
        title={user ? "This page is not for your account type" : "Please log in first"}
        text={user ? "You are signed in as " + user.role.toLowerCase() + "." : "You need an account to see this page."}
        action={user ? <LinkButton to="/">Go home</LinkButton> : <LinkButton to={"/login?next=" + encodeURIComponent(window.location.hash.replace(/^#/, ""))}>Log in</LinkButton>}
      />
    </div>
  );
}

// Catches unexpected crashes so a single bug does not leave a blank page.
class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev) {
    if (prev.routeKey !== this.props.routeKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="container page">
          <Empty icon="alert" title="Something went wrong on this page" text="Please reload it. If it keeps happening, tell the site owner." action={<button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>} />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { path } = useRoute();
  const { user, checking } = useAuth();

  let match = null;
  for (const r of routes) {
    const params = matchPath(r.path, path);
    if (params) {
      match = { route: r, params };
      break;
    }
  }

  let body;
  if (!match) body = <NotFound />;
  else {
    const { route, params } = match;
    if (checking && (route.roles || route.guest)) body = <div className="container page"><Spinner /></div>;
    else if (route.guest && user) {
      navigate("/", true);
      body = null;
    } else if (route.roles && (!user || !route.roles.includes(user.role))) body = <Blocked user={user} />;
    else if (route.dash) {
      body = (
        <DashboardLayout nav={route.dash === "seller" ? sellerNav : adminNav} title={route.dash === "seller" ? "Seller area" : "Admin area"}>
          {route.render(params)}
        </DashboardLayout>
      );
    } else body = route.render(params);
  }

  const bare = match && match.route.bare;
  return (
    <div className="app">
      {!bare && <Header />}
      <main id="main"><Boundary routeKey={path}>{body}</Boundary></main>
      {!bare && <Footer />}
    </div>
  );
}
