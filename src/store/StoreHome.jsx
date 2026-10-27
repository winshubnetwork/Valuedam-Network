import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  RefreshCw,
  ArrowRight,
  ImageOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './store.css';

const BUCKET = 'store-product-images';
const CART_KEY = 'valuedam_store_cart';

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCartCount() {
  return readCart().reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
}

function money(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getImageUrl(image) {
  if (!image) return '';
  if (image.external_url) return image.external_url;

  if (image.storage_path && supabase) {
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(image.storage_path);

    return data?.publicUrl || '';
  }

  return '';
}

function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="store-image-placeholder">
        <ImageOff size={30} />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className="store-product-image"
      src={src}
      alt={alt || 'Valuedam Store product'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function StoreHome() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(getCartCount);
  const [buyNowText, setBuyNowText] = useState('Buy Now');
  const [cartNotice, setCartNotice] = useState('');
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStoreUiSettings() {
      try {
        const { data, error } = await supabase.rpc('store_public_ui_settings');
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        const label = String(row?.buy_now_button_text || '').trim();
        if (active && label) setBuyNowText(label.slice(0, 40));
      } catch (err) {
        console.warn('Store button settings unavailable; using default text.', err);
      }
    }

    loadStoreUiSettings();

    const syncCart = () => setCartCount(getCartCount());
    window.addEventListener('storage', syncCart);
    return () => {
      active = false;
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  function addProductToCart(product, goToCheckout = false) {
    const outOfStock = product.track_inventory && Number(product.stock_quantity || 0) < 1;
    if (outOfStock) {
      setCartNotice(`${product.name} is currently out of stock.`);
      return;
    }

    try {
      const cart = readCart();
      const index = cart.findIndex((item) => item.product_id === product.id);
      const currentQuantity = index >= 0 ? Number(cart[index].quantity || 0) : 0;
      const nextQuantity = currentQuantity + 1;

      if (product.track_inventory && nextQuantity > Number(product.stock_quantity || 0)) {
        setCartNotice(`Only ${product.stock_quantity} item(s) of ${product.name} are available.`);
        return;
      }

      const item = {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        price: Number(product.price || 0),
        quantity: nextQuantity,
        image_url: getImageUrl(product.image),
      };

      if (index >= 0) cart[index] = { ...cart[index], ...item };
      else cart.push(item);

      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      setCartCount(getCartCount());
      setCartNotice(`${product.name} added to your cart.`);
      if (goToCheckout) navigate('/store/checkout');
    } catch (err) {
      console.error('Unable to save store cart:', err);
      setCartNotice('We could not save your cart. Please check your browser storage.');
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      setLoading(true);
      setError('');

      if (!supabase) {
        setError(
          'Store connection is not configured. Please try again later.'
        );
        setLoading(false);
        return;
      }

      try {
        const [productResult, categoryResult] = await Promise.all([
          supabase
            .from('store_products')
            .select(
              'id, name, slug, short_description, price, compare_at_price, stock_quantity, track_inventory, category_id, featured'
            )
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(48),

          supabase
            .from('store_categories')
            .select('id, name, slug')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

        if (productResult.error) throw productResult.error;
        if (categoryResult.error) throw categoryResult.error;

        const productRows = productResult.data || [];
        const productIds = productRows.map((product) => product.id);

        let imageRows = [];

        if (productIds.length > 0) {
          const { data, error: imageError } = await supabase
            .from('store_product_images')
            .select(
              'id, product_id, storage_path, external_url, alt_text, is_primary, sort_order'
            )
            .in('product_id', productIds)
            .order('sort_order', { ascending: true });

          if (imageError) throw imageError;
          imageRows = data || [];
        }

        if (cancelled) return;

        const imageByProduct = {};

        for (const image of imageRows) {
          const current = imageByProduct[image.product_id];

          if (
            !current ||
            (image.is_primary && !current.is_primary)
          ) {
            imageByProduct[image.product_id] = image;
          }
        }

        setProducts(
          productRows.map((product) => ({
            ...product,
            image: imageByProduct[product.id] || null,
          }))
        );
        setCategories(categoryResult.data || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Store loading failed:', err);
          setError(
            'We could not load products right now. Please refresh and try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStore();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === 'all' || product.category_id === category;

      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.short_description?.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  return (
    <main className="store-page">
      <section className="store-hero">
        <Link to="/store/cart" className="store-shop-cart-link" aria-label={`Shopping cart, ${cartCount} items`}>
          <ShoppingCart size={19} />
          <span>Cart</span>
          <strong>{cartCount}</strong>
        </Link>
        <div className="store-hero-content">
          <span className="store-eyebrow">
            <Store size={16} />
            WELCOME TO VALUEDAM
          </span>

          <h1>
            Discover more.
            <br />
            <span>Shop smarter.</span>
          </h1>

          <p>
            Explore products from Valuedam and approved sellers,
            all in one convenient online store.
          </p>

          <a className="store-hero-button" href="#store-products">
            Explore products <ArrowRight size={18} />
          </a>

          <div className="store-hero-note">
            <ShoppingBag size={17} />
            Your next great find starts here.
          </div>
        </div>

        <div className="store-hero-art" aria-hidden="true">
          <div className="store-art-circle store-art-circle-one" />
          <div className="store-art-circle store-art-circle-two" />
          <div className="store-art-card">
            <ShoppingBag size={68} strokeWidth={1.3} />
            <span>Shop your way</span>
            <small>Discover • Choose • Enjoy</small>
          </div>
          <div className="store-art-tag">NEW FINDS</div>
        </div>
      </section>

      {cartNotice && (
        <div className="store-shop-cart-notice" role="status">
          <span>{cartNotice}</span>
          <Link to="/store/cart">View cart</Link>
          <button type="button" onClick={() => setCartNotice('')} aria-label="Dismiss notice">×</button>
        </div>
      )}

      <section className="store-benefits" aria-label="Store benefits">
        <div>
          <span className="store-benefit-icon">
            <Package size={20} />
          </span>
          <div>
            <strong>More to discover</strong>
            <span>Products across categories</span>
          </div>
        </div>

        <div>
          <span className="store-benefit-icon">
            <Store size={20} />
          </span>
          <div>
            <strong>Multiple sellers</strong>
            <span>Valuedam and approved sellers</span>
          </div>
        </div>

        <div>
          <span className="store-benefit-icon">
            <ShoppingBag size={20} />
          </span>
          <div>
            <strong>Convenient shopping</strong>
            <span>Browse products in one place</span>
          </div>
        </div>
      </section>

      <section className="store-catalog" id="store-products">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">THE COLLECTION</span>
            <h2>Explore products</h2>
            <p>Find something that fits your needs and budget.</p>
          </div>

          <button
            className="store-refresh-button"
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Refresh products"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="store-controls">
          <label className="store-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="store-category-select">
            <span className="store-visually-hidden">Filter by category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="store-message">
            <span className="store-spinner" />
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="store-message store-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="store-empty">
            <div className="store-empty-icon">
              <ShoppingBag size={30} />
            </div>
            <h3>
              {products.length === 0
                ? 'Our shelves are getting ready'
                : 'No matching products found'}
            </h3>
            <p>
              {products.length === 0
                ? 'Products will appear here once they are added and published.'
                : 'Try another search or select a different category.'}
            </p>
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="store-results-count">
              Showing {filteredProducts.length} product
              {filteredProducts.length === 1 ? '' : 's'}
            </div>

            <div className="store-product-grid">
              {filteredProducts.map((product) => {
                const imageUrl = getImageUrl(product.image);
                const outOfStock =
                  product.track_inventory && Number(product.stock_quantity || 0) < 1;

                return (
                  <article className="store-product-card" key={product.id}>
                    <Link
                      to={`/store/product/${product.slug}`}
                      className="store-product-image-link"
                      aria-label={`View ${product.name}`}
                    >
                      <ProductImage
                        src={imageUrl}
                        alt={product.image?.alt_text || product.name}
                      />

                      {product.featured && (
                        <span className="store-featured-label">
                          Featured
                        </span>
                      )}

                      {outOfStock && (
                        <span className="store-stock-label">
                          Out of stock
                        </span>
                      )}
                    </Link>

                    <div className="store-product-info">
                      <h3>
                        <Link to={`/store/product/${product.slug}`}>
                          {product.name}
                        </Link>
                      </h3>

                      {product.short_description && (
                        <p>{product.short_description}</p>
                      )}

                      <div className="store-product-price">
                        <strong>{money(product.price)}</strong>
                        {product.compare_at_price != null &&
                          Number(product.compare_at_price) >
                            Number(product.price) && (
                            <del>{money(product.compare_at_price)}</del>
                          )}
                      </div>

                      <div className="store-product-actions">
                        <Link
                          className="store-view-product"
                          to={`/store/product/${product.slug}`}
                        >
                          View product <ArrowRight size={16} />
                        </Link>
                        <button
                          type="button"
                          className="store-card-add-button"
                          disabled={outOfStock}
                          onClick={() => addProductToCart(product)}
                        >
                          <ShoppingCart size={15} /> Add to cart
                        </button>
                        <button
                          type="button"
                          className="store-card-buy-button"
                          disabled={outOfStock}
                          onClick={() => addProductToCart(product, true)}
                        >
                          {buyNowText}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="store-seller-cta">
        <div>
          <span className="store-eyebrow">GROW WITH US</span>
          <h2>Have products to sell?</h2>
          <p>
            Valuedam is building a marketplace for businesses and
            independent sellers.
          </p>
        </div>
        <span className="store-coming-soon">Seller applications coming soon</span>
      </section>
    </main>
  );
}