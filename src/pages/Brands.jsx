import { useState } from "react";
import * as api from "../api";
import { useLoad } from "../utils";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import { Breadcrumbs, Empty, ErrorBox, Pagination, ProductGridSkeleton, Spinner, ProductImage } from "../components/ui";
import { BrandTile } from "./Home";

export function BrandsPage() {
  const [page, setPage] = useState(0);
  const list = useLoad(() => api.brands.list(page, 12), [page]);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Sellers</div>
          <h1>Brands</h1>
          <p className="muted">Every brand here has been checked and approved by our team.</p>
        </div>
      </div>
      {list.loading && !list.data && <Spinner />}
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.data && list.data.content.length === 0 && <Empty icon="store" title="No brands yet" text="Approved brands will appear here." />}
      {list.data && (
        <div className="brand-grid brand-grid-lg">
          {list.data.content.map((b) => <BrandTile key={b.id} brand={b} />)}
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </div>
  );
}

export function BrandPage({ id }) {
  const [page, setPage] = useState(0);
  const brand = useLoad(() => api.brands.get(id), [id]);
  const items = useLoad(() => api.products.search({ brandId: id, page, size: 12 }), [id, page]);

  if (brand.loading) return <div className="container page"><Spinner /></div>;
  if (brand.error) return <div className="container page"><Empty icon="store" title="Brand not found" text="It may not be approved yet, or it has been suspended." /></div>;
  const b = brand.data;

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Brands", to: "/brands" }, { label: b.name }]} />
      <div className="brand-hero">
        <div className="brand-logo brand-logo-lg">
          {b.logoUrl ? <ProductImage src={b.logoUrl} name={b.name} id={b.id} /> : <span>{b.name.charAt(0).toUpperCase()}</span>}
        </div>
        <div>
          <h1>{b.name}</h1>
          <p className="muted"><Icon name="pin" size={15} /> {b.city}, {b.state}</p>
          {b.description && <p>{b.description}</p>}
        </div>
      </div>
      <h2>Products from {b.name}</h2>
      {items.loading && !items.data && <ProductGridSkeleton count={4} />}
      <ErrorBox error={items.error} />
      {items.data && items.data.content.length === 0 && <Empty icon="box" title="No products yet" text="This brand has not listed anything yet." />}
      {items.data && <div className="product-grid">{items.data.content.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      {items.data && <Pagination page={items.data.page} totalPages={items.data.totalPages} onChange={setPage} />}
    </div>
  );
}
