import { useEffect, useState } from "react";
import Icon from "./Icon";
import { errorText, formatMoney, STATUS_HELP, titleCase } from "../utils";
import { imageUrl } from "../api";
import { Link } from "../router";

/* ---------- buttons and small pieces ---------- */

export function Button({ variant = "primary", size, loading, icon, children, className = "", ...rest }) {
  const cls = ["btn", "btn-" + variant, size ? "btn-" + size : "", className].join(" ").trim();
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner spinner-sm" /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = "primary", size, icon, iconAfter, children, className = "" }) {
  const cls = ["btn", "btn-" + variant, size ? "btn-" + size : "", className].join(" ").trim();
  return (
    <Link to={to} className={cls}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={18} />}
    </Link>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="center-block" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <Icon name="alert" />
      <div>
        <strong>{errorText(error)}</strong>
        {onRetry && (
          <div>
            <button className="link-btn" onClick={onRetry}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Notice({ type = "info", icon, children }) {
  return (
    <div className={"notice notice-" + type}>
      <Icon name={icon || (type === "success" ? "check" : type === "warning" ? "alert" : "info")} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon = "box", title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={30} />
      </div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {i < items.length - 1 && <Icon name="chevronRight" size={14} />}
        </span>
      ))}
    </nav>
  );
}

/* ---------- status badges ---------- */

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={"badge badge-" + status.toLowerCase()} title={STATUS_HELP[status] || ""}>
      {titleCase(status)}
    </span>
  );
}

/* ---------- forms ---------- */

export function Field({ label, hint, error, required, children, className = "" }) {
  return (
    <label className={"field " + className}>
      <span className="field-label">
        {label}
        {required && <em> *</em>}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function TextInput({ label, hint, error, required, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <input className={"input" + (error ? " has-error" : "")} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, error, required, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <textarea className={"input" + (error ? " has-error" : "")} rows={3} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, required, className, children, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <select className={"input" + (error ? " has-error" : "")} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, disabled }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Icon name="minus" size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

/* ---------- modal and confirm ---------- */

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " modal-wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmText = "Confirm", danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={go}>{confirmText}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

/* ---------- pagination ---------- */

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  for (let i = start; i < Math.min(totalPages, start + 5); i++) pages.push(i);
  return (
    <nav className="pagination" aria-label="Pages">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={18} />
      </button>
      {start > 0 && (
        <>
          <button onClick={() => onChange(0)}>1</button>
          {start > 1 && <span className="dots">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button key={p} className={p === page ? "active" : ""} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined}>
          {p + 1}
        </button>
      ))}
      {start + 5 < totalPages && (
        <>
          {start + 5 < totalPages - 1 && <span className="dots">...</span>}
          <button onClick={() => onChange(totalPages - 1)}>{totalPages}</button>
        </>
      )}
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevronRight" size={18} />
      </button>
    </nav>
  );
}

/* ---------- product bits ---------- */

const tints = [
  ["#e0e7ff", "#c7d2fe", "#4338ca"],
  ["#fef3c7", "#fde68a", "#b45309"],
  ["#dcfce7", "#bbf7d0", "#15803d"],
  ["#fce7f3", "#fbcfe8", "#be185d"],
  ["#e0f2fe", "#bae6fd", "#0369a1"],
  ["#ede9fe", "#ddd6fe", "#6d28d9"]
];

// Shows the product picture, or a coloured tile with a category icon when there is none.
export function ProductImage({ src, name, category, id = 0, className = "" }) {
  const [broken, setBroken] = useState(false);
  const url = imageUrl(src);
  if (url && !broken) {
    return (
      <div className={"pimg " + className}>
        <img src={url} alt={name || ""} loading="lazy" onError={() => setBroken(true)} />
      </div>
    );
  }
  const t = tints[Math.abs(Number(id) || 0) % tints.length];
  return (
    <div className={"pimg pimg-fallback " + className} style={{ background: "linear-gradient(145deg," + t[0] + "," + t[1] + ")", color: t[2] }}>
      <Icon name={category || "grid"} size={44} />
      <span>{(name || "?").trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}

export function Price({ price, discounted, big }) {
  const has = discounted !== undefined && discounted !== null && Number(discounted) < Number(price);
  return (
    <div className={"price" + (big ? " price-big" : "")}>
      <strong>{formatMoney(has ? discounted : price)}</strong>
      {has && <s>{formatMoney(price)}</s>}
      {has && <span className="price-off">{Math.round((1 - Number(discounted) / Number(price)) * 100)}% off</span>}
    </div>
  );
}

export function Stat({ label, value, icon, tone = "brand", note }) {
  return (
    <div className={"stat stat-" + tone}>
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={value === t.value ? "active" : ""} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={"skeleton " + className} />;
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="pcard" key={i}>
          <Skeleton className="sk-img" />
          <div className="pcard-body">
            <Skeleton className="sk-line short" />
            <Skeleton className="sk-line" />
            <Skeleton className="sk-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
