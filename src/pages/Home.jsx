import { useEffect, useState } from "react";
import * as api from "../api";
import { Link } from "../router";
import { useAuth } from "../state";
import { CATEGORIES, getRecent, titleCase, useLoad } from "../utils";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import { ErrorBox, LinkButton, ProductGridSkeleton, ProductImage } from "../components/ui";

function HeroVisual() {
  // A made-up preview of the product, drawn with plain HTML and CSS. No pictures.
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hv-glow hv-glow-1" />
      <div className="hv-glow hv-glow-2" />

      <div className="hv-card hv-order">
        <div className="hv-row">
          <span className="hv-dot ok" />
          <strong>Order #1042</strong>
          <span className="hv-pill ok">Confirmed</span>
        </div>
        <div className="hv-steps">
          {["Placed", "Confirmed", "Shipped", "Delivered"].map((s, i) => (
            <div key={s} className={"hv-step" + (i < 2 ? " done" : "")}>
              <i />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hv-card hv-product">
        <div className="hv-thumb">
          <Icon name="BAGS" size={40} />
        </div>
        <div>
          <small>Canvas weekender</small>
          <div className="hv-price">
            <strong>Rs 1,874</strong>
            <s>Rs 2,499</s>
          </div>
          <span className="hv-offer"><Icon name="percent" size={13} /> Festive offer, 25% off</span>
        </div>
      </div>

      <div className="hv-card hv-bill">
        <div className="hv-row">
          <Icon name="receipt" size={18} />
          <strong>GST invoice</strong>
        </div>
        <div className="hv-line"><span>Taxable value</span><b>Rs 1,588</b></div>
        <div className="hv-line"><span>CGST 9%</span><b>Rs 143</b></div>
        <div className="hv-line"><span>SGST 9%</span><b>Rs 143</b></div>
        <div className="hv-line total"><span>Total</span><b>Rs 1,874</b></div>
      </div>

      <div className="hv-card hv-stock">
        <div className="hv-row"><Icon name="layers" size={16} /><strong>In stock</strong><b>128</b></div>
        <div className="hv-meter"><i style={{ width: "72%" }} /></div>
      </div>
    </div>
  );
}

function Hero({ totals }) {
  const { user, isSeller, isAdmin } = useAuth();
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="hero-pill"><i /> Many brands. One basket.</span>
          <h1>
            Shop independent brands, <span className="grad">with prices you can trust.</span>
          </h1>
          <p className="hero-lead">
            Find clothing, footwear, home and more from sellers who run their own stores. Seller offers are applied for you,
            you can hold an item before you buy it, and every order comes with a proper GST invoice.
          </p>
          <div className="hero-cta">
            <LinkButton to="/shop" size="lg" iconAfter="arrowRight">Start shopping</LinkButton>
            {isSeller ? (
              <LinkButton to="/seller" variant="light" size="lg">Open seller dashboard</LinkButton>
            ) : isAdmin ? (
              <LinkButton to="/admin" variant="light" size="lg">Open admin home</LinkButton>
            ) : (
              <LinkButton to={user ? "/brands" : "/register-seller"} variant="light" size="lg">
                {user ? "Browse brands" : "Sell on SmartOrder"}
              </LinkButton>
            )}
          </div>
          <ul className="hero-points">
            <li><Icon name="check" size={16} /> Free to browse and reserve</li>
            <li><Icon name="check" size={16} /> Cash on delivery</li>
            <li><Icon name="check" size={16} /> One invoice per seller</li>
          </ul>
          <div className="hero-stats">
            <div><strong>{totals.products ?? "..."}</strong><span>products live</span></div>
            <div><strong>{totals.brands ?? "..."}</strong><span>approved brands</span></div>
            <div><strong>13</strong><span>categories</span></div>
          </div>
        </div>
        <HeroVisual />
      </div>
      <svg className="hero-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60V28C240 4 480 0 720 14s480 30 720 8v38z" />
      </svg>
    </section>
  );
}

const perks = [
  { icon: "tag", title: "Offers applied for you", text: "Percentage or flat discounts from the seller show up on the price. No codes to hunt for." },
  { icon: "clock", title: "Reserve before you buy", text: "Hold an item for 1 to 72 hours. Confirm it when you are ready, or it goes back on the shelf." },
  { icon: "receipt", title: "A proper GST bill", text: "CGST, SGST or IGST, HSN codes and the amount in words, as a page or a PDF you can print." },
  { icon: "truck", title: "Tracked delivery", text: "Sellers add a tracking number when they ship. You can follow each order from start to finish." }
];

const buyerSteps = [
  { n: "1", title: "Find something you like", text: "Search or filter by category, brand, size, colour and price." },
  { n: "2", title: "Add to cart, or reserve", text: "Buy now, or hold the stock for a few hours while you decide." },
  { n: "3", title: "Get it delivered", text: "Each brand ships its own order and sends its own invoice." }
];

const sellerSteps = [
  "Open a seller account and register your brand",
  "An admin approves the brand",
  "Add products, pictures, stock and offers",
  "Ship orders and watch your sales"
];

export default function Home() {
  const { user, isCustomer } = useAuth();
  const newest = useLoad(() => api.products.search({ sort: "newest", size: 8 }), []);
  const brandList = useLoad(() => api.brands.list(0, 6), []);
  const recentIds = getRecent();
  const recent = useLoad(() => (recentIds.length ? api.products.batch(recentIds) : Promise.resolve([])), []);
  const [totals, setTotals] = useState({});

  useEffect(() => {
    setTotals({
      products: newest.data ? newest.data.totalElements : undefined,
      brands: brandList.data ? brandList.data.totalElements : undefined
    });
  }, [newest.data, brandList.data]);

  return (
    <>
      <Hero totals={totals} />

      <section className="section perks">
        <div className="container perk-grid">
          {perks.map((p) => (
            <div className="perk" key={p.title}>
              <div className="perk-icon"><Icon name={p.icon} size={24} /></div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Browse</div>
              <h2>Shop by category</h2>
            </div>
            <Link to="/shop" className="more">See everything <Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c} to={"/shop?category=" + c} className="cat-tile">
                <span><Icon name={c} size={26} /></span>
                <strong>{titleCase(c)}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Just in</div>
              <h2>New arrivals</h2>
            </div>
            <Link to="/shop?sort=newest" className="more">View all <Icon name="arrowRight" size={16} /></Link>
          </div>
          {newest.loading && <ProductGridSkeleton count={8} />}
          <ErrorBox error={newest.error} onRetry={newest.reload} />
          {newest.data && newest.data.content.length === 0 && (
            <p className="muted">No products yet. Once a seller adds some, they will show up here.</p>
          )}
          {newest.data && (
            <div className="product-grid">
              {newest.data.content.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Sellers</div>
              <h2>Brands on SmartOrder</h2>
            </div>
            <Link to="/brands" className="more">All brands <Icon name="arrowRight" size={16} /></Link>
          </div>
          {brandList.data && brandList.data.content.length === 0 && <p className="muted">No approved brands yet.</p>}
          <div className="brand-grid">
            {brandList.data && brandList.data.content.map((b) => <BrandTile key={b.id} brand={b} />)}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container split">
          <div>
            <div className="eyebrow">For shoppers</div>
            <h2>From search to doorstep in three steps</h2>
            <div className="steps">
              {buyerSteps.map((s) => (
                <div className="step" key={s.n}>
                  <span className="step-n">{s.n}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="sell-panel">
            <div className="eyebrow eyebrow-light">For sellers</div>
            <h2>Run your own store here</h2>
            <p>Keep your brand name, set your own prices and offers, and get a ready GST invoice for every order.</p>
            <ol>
              {sellerSteps.map((s, i) => (
                <li key={s}><span>{i + 1}</span>{s}</li>
              ))}
            </ol>
            {!user || isCustomer ? (
              <LinkButton to="/register-seller" variant="accent" iconAfter="arrowRight">Become a seller</LinkButton>
            ) : (
              <LinkButton to={user.role === "SELLER" ? "/seller" : "/admin"} variant="accent" iconAfter="arrowRight">Go to my dashboard</LinkButton>
            )}
          </div>
        </div>
      </section>

      {recent.data && recent.data.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Pick up where you left off</div>
                <h2>Recently viewed</h2>
              </div>
            </div>
            <div className="product-grid">
              {recentIds
                .map((id) => recent.data.find((p) => p.id === id))
                .filter(Boolean)
                .slice(0, 4)
                .map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <section className="cta-band">
        <div className="container cta-in">
          <div>
            <h2>Ready to find your next favourite?</h2>
            <p>Thousands of small decisions made easy: clear prices, honest stock and a bill for everything.</p>
          </div>
          <div className="cta-buttons">
            <LinkButton to="/shop" variant="accent" size="lg" iconAfter="arrowRight">Browse the shop</LinkButton>
            {!user && <LinkButton to="/register" variant="light" size="lg">Create an account</LinkButton>}
          </div>
        </div>
      </section>
    </>
  );
}

export function BrandTile({ brand }) {
  return (
    <Link to={"/brand/" + brand.id} className="brand-tile">
      <div className="brand-logo">
        {brand.logoUrl ? <ProductImage src={brand.logoUrl} name={brand.name} id={brand.id} /> : <span>{brand.name.charAt(0).toUpperCase()}</span>}
      </div>
      <div>
        <strong>{brand.name}</strong>
        <span><Icon name="pin" size={13} /> {brand.city}, {brand.state}</span>
      </div>
    </Link>
  );
}
