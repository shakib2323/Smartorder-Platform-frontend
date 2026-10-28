import { useEffect, useState } from "react";
import * as api from "../api";
import { buildQuery, navigate, useRoute } from "../router";
import { CATEGORIES, titleCase, useDebounced, useLoad } from "../utils";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import { Button, Empty, ErrorBox, Pagination, ProductGridSkeleton, Select, TextInput } from "../components/ui";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name A to Z" }
];

const PAGE_SIZE = 12;

export default function Shop() {
  const { query } = useRoute();
  const get = (k, d = "") => query.get(k) || d;

  // text fields are edited locally and pushed to the address bar after a short pause
  const [text, setText] = useState({ q: get("q"), minPrice: get("minPrice"), maxPrice: get("maxPrice"), clothingSize: get("clothingSize"), color: get("color") });
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounced(text);

  const current = {
    q: get("q"), category: get("category"), brandId: get("brandId"), minPrice: get("minPrice"), maxPrice: get("maxPrice"),
    clothingSize: get("clothingSize"), color: get("color"), sort: get("sort", "newest"), page: Number(get("page", "0"))
  };

  const update = (changes, resetPage = true) => {
    const next = { ...current, ...changes };
    if (resetPage && !("page" in changes)) next.page = 0;
    if (next.sort === "newest") next.sort = "";
    if (!next.page) next.page = "";
    navigate("/shop" + buildQuery(next), true);
  };

  // when the address bar changes from outside (links, back button), reflect it in the inputs
  const sig = ["q", "minPrice", "maxPrice", "clothingSize", "color"].map((k) => get(k)).join("|");
  useEffect(() => {
    setText({ q: get("q"), minPrice: get("minPrice"), maxPrice: get("maxPrice"), clothingSize: get("clothingSize"), color: get("color") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    const changed = Object.keys(text).some((k) => debounced[k] !== current[k]) && Object.keys(text).every((k) => debounced[k] === text[k]);
    if (changed) update(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const brandList = useLoad(() => api.brands.list(0, 100), []);
  const result = useLoad(
    () =>
      api.products.search({
        q: current.q, category: current.category, brandId: current.brandId, minPrice: current.minPrice, maxPrice: current.maxPrice,
        clothingSize: current.clothingSize, color: current.color, sort: current.sort, page: current.page, size: PAGE_SIZE
      }),
    [query.toString()]
  );

  const activeChips = [];
  if (current.q) activeChips.push({ label: "Search: " + current.q, clear: () => update({ q: "" }) });
  if (current.category) activeChips.push({ label: titleCase(current.category), clear: () => update({ category: "" }) });
  if (current.brandId) {
    const b = brandList.data && brandList.data.content.find((x) => String(x.id) === current.brandId);
    activeChips.push({ label: "Brand: " + (b ? b.name : current.brandId), clear: () => update({ brandId: "" }) });
  }
  if (current.minPrice) activeChips.push({ label: "Min Rs " + current.minPrice, clear: () => update({ minPrice: "" }) });
  if (current.maxPrice) activeChips.push({ label: "Max Rs " + current.maxPrice, clear: () => update({ maxPrice: "" }) });
  if (current.clothingSize) activeChips.push({ label: "Size " + current.clothingSize, clear: () => update({ clothingSize: "" }) });
  if (current.color) activeChips.push({ label: "Colour " + current.color, clear: () => update({ color: "" }) });

  const filters = (
    <div className="filters">
      <TextInput label="Search" value={text.q} onChange={(e) => setText({ ...text, q: e.target.value })} placeholder="Name or description" />
      <Select label="Category" value={current.category} onChange={(e) => update({ category: e.target.value })}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
      </Select>
      <Select label="Brand" value={current.brandId} onChange={(e) => update({ brandId: e.target.value })}>
        <option value="">All brands</option>
        {brandList.data && brandList.data.content.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      <div className="two-up">
        <TextInput label="Min price" type="number" min="0" value={text.minPrice} onChange={(e) => setText({ ...text, minPrice: e.target.value })} />
        <TextInput label="Max price" type="number" min="0" value={text.maxPrice} onChange={(e) => setText({ ...text, maxPrice: e.target.value })} />
      </div>
      <div className="two-up">
        <TextInput label="Size" placeholder="S, M, 42" value={text.clothingSize} onChange={(e) => setText({ ...text, clothingSize: e.target.value })} />
        <TextInput label="Colour" value={text.color} onChange={(e) => setText({ ...text, color: e.target.value })} />
      </div>
      {activeChips.length > 0 && (
        <Button variant="outline" onClick={() => navigate("/shop", true)}>Clear all filters</Button>
      )}
    </div>
  );

  const data = result.data;

  return (
    <div className="container page">
      <div className="shop-head">
        <div>
          <div className="eyebrow">Shop</div>
          <h1>{current.category ? titleCase(current.category) : current.q ? "Results for \"" + current.q + "\"" : "All products"}</h1>
          <p className="muted">{data ? data.totalElements + (data.totalElements === 1 ? " product" : " products") : "Loading products"}</p>
        </div>
        <div className="shop-tools">
          <button className="btn btn-outline filter-toggle" onClick={() => setShowFilters(true)}><Icon name="filter" size={18} /> Filters</button>
          <label className="sort">
            <span>Sort by</span>
            <select className="input" value={current.sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="cat-strip">
        <button className={"chip chip-btn" + (!current.category ? " active" : "")} onClick={() => update({ category: "" })}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={"chip chip-btn" + (current.category === c ? " active" : "")} onClick={() => update({ category: c })}>{titleCase(c)}</button>
        ))}
      </div>

      <div className="shop-layout">
        <aside className="filter-side"><h3>Filters</h3>{filters}</aside>

        <div>
          {activeChips.length > 0 && (
            <div className="active-chips">
              {activeChips.map((c) => (
                <button key={c.label} className="chip chip-removable" onClick={c.clear}>{c.label} <Icon name="close" size={13} /></button>
              ))}
            </div>
          )}
          <ErrorBox error={result.error} onRetry={result.reload} />
          {result.loading && !data && <ProductGridSkeleton count={PAGE_SIZE} />}
          {data && data.content.length === 0 && (
            <Empty icon="search" title="Nothing matches your search" text="Try removing a filter or searching for something else." action={<Button variant="outline" onClick={() => navigate("/shop", true)}>Clear filters</Button>} />
          )}
          {data && data.content.length > 0 && (
            <div className={"product-grid" + (result.loading ? " is-loading" : "")}>
              {data.content.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: p }, false); window.scrollTo(0, 0); }} />}
        </div>
      </div>

      {showFilters && (
        <div className="drawer-backdrop" onClick={() => setShowFilters(false)}>
          <aside className="drawer drawer-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>Filters</h3>
              <button className="icon-btn" onClick={() => setShowFilters(false)} aria-label="Close filters"><Icon name="close" /></button>
            </div>
            {filters}
            <div className="drawer-foot">
              <Button onClick={() => setShowFilters(false)}>Show {data ? data.totalElements : ""} products</Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
