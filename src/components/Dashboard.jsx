import { Link, useRoute } from "../router";
import Icon from "./Icon";

export const sellerNav = [
  { to: "/seller", label: "Overview", icon: "dashboard", exact: true },
  { to: "/seller/brand", label: "My brand", icon: "store" },
  { to: "/seller/products", label: "Products", icon: "box" },
  { to: "/seller/offers", label: "Offers", icon: "tag" },
  { to: "/seller/inventory", label: "Stock", icon: "layers" },
  { to: "/seller/orders", label: "Orders", icon: "truck" }
];

export const adminNav = [
  { to: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { to: "/admin/brands", label: "Brand approvals", icon: "shield" },
  { to: "/admin/orders", label: "All orders", icon: "list" },
  { to: "/admin/inventory", label: "Stock tools", icon: "layers" },
  { to: "/admin/catalog", label: "Catalogue", icon: "box" }
];

export function DashboardLayout({ nav, title, children }) {
  const { path } = useRoute();
  const isActive = (item) => (item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/"));
  return (
    <div className="container dash">
      <aside className="dash-side">
        <div className="dash-title">{title}</div>
        <nav>
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={isActive(n) ? "active" : ""}>
              <Icon name={n.icon} size={19} /> <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="dash-main">{children}</div>
    </div>
  );
}
