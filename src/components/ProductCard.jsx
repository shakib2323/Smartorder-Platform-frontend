import { useState } from "react";
import { Link, navigate } from "../router";
import { useAuth, useCart, useToast } from "../state";
import { errorText } from "../utils";
import { Price, ProductImage } from "./ui";
import Icon from "./Icon";

export default function ProductCard({ product }) {
  const { user, isCustomer } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const p = product;
  const offer = p.appliedOffer;

  const quickAdd = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please log in to add items to your cart");
      navigate("/login?next=" + encodeURIComponent("/product/" + p.id));
      return;
    }
    if (!isCustomer) {
      toast.info("Only customer accounts can shop");
      return;
    }
    setAdding(true);
    try {
      await cart.add(p.id, 1);
      toast.success("Added to your cart");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="pcard">
      <Link to={"/product/" + p.id} className="pcard-media" aria-label={p.name}>
        <ProductImage src={p.imageUrl} name={p.name} category={p.category} id={p.id} />
        {offer && (
          <span className="pcard-tag">
            <Icon name="percent" size={13} /> {offer.title}
          </span>
        )}
        {!p.active && <span className="pcard-tag pcard-tag-off">Hidden</span>}
      </Link>
      <div className="pcard-body">
        <Link to={"/brand/" + p.brand.id} className="pcard-brand">{p.brand.name}</Link>
        <Link to={"/product/" + p.id} className="pcard-name">{p.name}</Link>
        <div className="pcard-meta">
          {p.size && <span>Size {p.size}</span>}
          {p.color && <span>{p.color}</span>}
        </div>
        <div className="pcard-foot">
          <Price price={p.price} discounted={p.discountedPrice} />
          <button className="round-btn" onClick={quickAdd} disabled={adding || !p.active} aria-label={"Add " + p.name + " to cart"} title="Add to cart">
            {adding ? <span className="spinner spinner-sm" /> : <Icon name="plus" size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
