import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import './store.css';

const CART_KEY = 'valuedam_store_cart';

function formatPrice(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function readCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        item.product_id &&
        Number(item.quantity) > 0
    );
  } catch {
    return [];
  }
}

function CartImage({ src, name }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="store-cart-image-placeholder">
        <ImageIcon size={27} />
        <span>No image</span>
      </div>
    );
  }

  return (
    <img
      className="store-cart-product-image"
      src={src}
      alt={name || 'Valuedam Store product'}
      onError={() => setFailed(true)}
    />
  );
}

export default function StoreCart() {
  const [cart, setCart] = useState(() => readCart());
  const [notice, setNotice] = useState('');

  function saveCart(nextCart) {
    setCart(nextCart);

    try {
      localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    } catch (error) {
      console.error('Unable to save cart:', error);
      setNotice('Your cart could not be saved. Check your browser storage.');
    }
  }

  function updateQuantity(productId, change) {
    setNotice('');

    const nextCart = cart.map((item) => {
      if (item.product_id !== productId) return item;

      return {
        ...item,
        quantity: Math.max(
          1,
          Number(item.quantity || 1) + change
        ),
      };
    });

    saveCart(nextCart);
  }

  function removeItem(productId) {
    const nextCart = cart.filter(
      (item) => item.product_id !== productId
    );

    saveCart(nextCart);
    setNotice('Product removed from your cart.');
  }

  function clearCart() {
    saveCart([]);
    setNotice('Your cart has been cleared.');
  }

  const itemCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  return (
    <main className="store-cart-page">
      <nav className="store-cart-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/store">Valuedam Store</Link>
        <span>/</span>
        <span>Shopping cart</span>
      </nav>

      <div className="store-cart-heading">
        <div>
          <p className="store-cart-eyebrow">YOUR SHOPPING BAG</p>
          <h1>Shopping cart</h1>
          <p className="store-cart-subtitle">
            Review your products before proceeding to checkout.
          </p>
        </div>

        <div className="store-cart-count">
          <ShoppingCart size={19} />
          <span>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {notice && (
        <p className="store-cart-notice" role="status">
          {notice}
        </p>
      )}

      {cart.length === 0 ? (
        <section className="store-cart-empty">
          <div className="store-cart-empty-icon">
            <ShoppingBag size={36} />
          </div>

          <h2>Your cart is empty</h2>

          <p>
            You haven't added any products yet. Explore the store
            and find something you like.
          </p>

          <Link to="/store" className="store-cart-primary-button">
            Explore the store <ArrowRight size={18} />
          </Link>
        </section>
      ) : (
        <>
          <div className="store-cart-layout">
            <section className="store-cart-items">
              <div className="store-cart-list-heading">
                <h2>Your products</h2>

                <button
                  type="button"
                  className="store-cart-clear-button"
                  onClick={clearCart}
                >
                  <Trash2 size={15} />
                  Clear cart
                </button>
              </div>

              {cart.map((item) => {
                const price = Number(item.price || 0);
                const quantity = Number(item.quantity || 1);

                return (
                  <article
                    className="store-cart-item"
                    key={item.product_id}
                  >
                    <Link
                      to={
                        item.slug
                          ? `/store/product/${encodeURIComponent(item.slug)}`
                          : '/store'
                      }
                      className="store-cart-image-link"
                      aria-label={`View ${item.name || 'product'}`}
                    >
                      <CartImage
                        src={item.image_url}
                        name={item.name}
                      />
                    </Link>

                    <div className="store-cart-item-info">
                      <Link
                        to={
                          item.slug
                            ? `/store/product/${encodeURIComponent(item.slug)}`
                            : '/store'
                        }
                        className="store-cart-item-name"
                      >
                        {item.name || 'Store product'}
                      </Link>

                      <p className="store-cart-unit-price">
                        {formatPrice(price)} each
                      </p>

                      <div className="store-cart-item-controls">
                        <div className="store-cart-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product_id, -1)
                            }
                            disabled={quantity <= 1}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus size={15} />
                          </button>

                          <span aria-live="polite">{quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product_id, 1)
                            }
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="store-cart-remove-button"
                          onClick={() => removeItem(item.product_id)}
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <strong className="store-cart-line-total">
                      {formatPrice(price * quantity)}
                    </strong>
                  </article>
                );
              })}

              <Link to="/store" className="store-cart-continue">
                <ArrowLeft size={17} />
                Continue shopping
              </Link>
            </section>

            <aside className="store-cart-summary">
              <h2>Order summary</h2>

              <div className="store-cart-summary-row">
                <span>Products ({itemCount} items)</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className="store-cart-summary-row">
                <span>Delivery</span>
                <span className="store-cart-confirm-later">
                  Confirm at checkout
                </span>
              </div>

              <p className="store-cart-delivery-note">
                Delivery fees will be calculated during checkout
                when delivery details are available.
              </p>

              <div className="store-cart-summary-total">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              

<Link
  to="/store/checkout"
  className="store-cart-checkout-button"
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    minHeight: '48px',
    padding: '14px 18px',
    backgroundColor: '#ffc928',
    color: '#111827',
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto',
    cursor: 'pointer',
    fontWeight: 800,
    textDecoration: 'none',
    border: 'none',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(245, 184, 46, 0.3)',
  }}
>
  Proceed to checkout
  <ArrowRight size={18} />
</Link>


              <div className="store-cart-trust">
                <ShoppingBag size={18} />
                <span>
                  <strong>Your cart is saved</strong>
                  <small>
                    Your items remain in this browser until removed.
                  </small>
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}