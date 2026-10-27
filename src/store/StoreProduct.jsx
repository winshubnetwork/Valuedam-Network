import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './store.css';

const BUCKET = 'store-product-images';
const CART_KEY = 'valuedam_store_cart';

function formatPrice(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getImageUrl(image) {
  if (image?.external_url) return image.external_url;

  if (image?.storage_path && supabase) {
    return supabase.storage
      .from(BUCKET)
      .getPublicUrl(image.storage_path).data.publicUrl;
  }

  return '';
}

function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`store-detail-placeholder ${className}`}>
        <ImageIcon size={42} strokeWidth={1.4} />
        <span>Product image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt || 'Valuedam Store product'}
      onError={() => setFailed(true)}
    />
  );
}

function readCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function StoreProduct() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [buyNowText, setBuyNowText] = useState('Buy Now');

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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError('');
      setProduct(null);
      setImages([]);
      setSelectedImage('');
      setQuantity(1);
      setCartMessage('');

      if (!supabase) {
        setError(
          'The store connection is not configured. Please try again later.'
        );
        setLoading(false);
        return;
      }

      try {
        const { data, error: productError } = await supabase
          .from('store_products')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle();

        if (cancelled) return;

        if (productError) {
          console.error('Store product loading error:', productError);
          setError('We could not load this product. Please try again.');
          setLoading(false);
          return;
        }

        if (!data) {
          setError(
            'This product could not be found or is no longer available.'
          );
          setLoading(false);
          return;
        }

        setProduct(data);

        const { data: imageRows, error: imageError } = await supabase
          .from('store_product_images')
          .select(
            'id, product_id, storage_path, external_url, alt_text, is_primary, sort_order'
          )
          .eq('product_id', data.id)
          .order('is_primary', { ascending: false })
          .order('sort_order', { ascending: true });

        if (cancelled) return;

        if (imageError) {
          console.error(
            'Store product images loading error:',
            imageError
          );
        }

        const usableImages = (imageRows || [])
          .map((image) => ({
            ...image,
            url: getImageUrl(image),
          }))
          .filter((image) => image.url);

        setImages(usableImages);

        // Use the product's image URL if no gallery images are available.
        const fallbackImage =
          typeof data.image_url === 'string' ? data.image_url : '';

        setSelectedImage(usableImages[0]?.url || fallbackImage);
        setLoading(false);
      } catch (loadError) {
        if (cancelled) return;

        console.error('Unexpected store product loading error:', loadError);
        setError('We could not load this product. Please try again.');
        setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const isOutOfStock = Boolean(
    product?.track_inventory &&
      Number(product?.stock_quantity || 0) < 1
  );

  const availableQuantity = product?.track_inventory
    ? Math.max(0, Number(product.stock_quantity || 0))
    : 99;

  const productDescription = useMemo(
    () =>
      product?.description ||
      product?.long_description ||
      product?.short_description ||
      'Product information will be updated soon.',
    [product]
  );

  function addToCart(goToCheckout = false) {
    if (!product || isOutOfStock) return;

    try {
      const cart = readCart();

      const existingIndex = cart.findIndex(
        (item) => item.product_id === product.id
      );

      const existingQuantity =
        existingIndex >= 0
          ? Number(cart[existingIndex].quantity || 0)
          : 0;

      const nextQuantity = existingQuantity + quantity;

      if (
        product.track_inventory &&
        nextQuantity > Number(product.stock_quantity || 0)
      ) {
        setCartMessage(
          `Only ${product.stock_quantity} item(s) are currently available.`
        );
        return;
      }

      const imageUrl = selectedImage || '';

      if (existingIndex >= 0) {
        cart[existingIndex] = {
          ...cart[existingIndex],
          slug: product.slug,
          name: product.name,
          price: Number(product.price || 0),
          quantity: nextQuantity,
          image_url: imageUrl,
        };
      } else {
        cart.push({
          product_id: product.id,
          slug: product.slug,
          name: product.name,
          price: Number(product.price || 0),
          quantity,
          image_url: imageUrl,
        });
      }

      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      setCartMessage('Added to your cart successfully.');
      if (goToCheckout) navigate('/store/checkout');
    } catch (cartError) {
      console.error('Unable to save store cart:', cartError);
      setCartMessage(
        'We could not save your cart. Please check your browser settings.'
      );
    }
  }

  if (loading) {
    return (
      <main className="store-detail-page">
        <div className="store-detail-status">
          <span className="store-detail-spinner" />
          <p>Loading product details...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="store-detail-page">
        <Link to="/store" className="store-detail-back">
          <ArrowLeft size={18} /> Back to store
        </Link>

        <div className="store-detail-status store-detail-error">
          <Package size={36} />
          <h1>Product unavailable</h1>
          <p>{error || 'This product is not available.'}</p>
          <Link to="/store" className="store-detail-primary-link">
            Browse the store
          </Link>
        </div>
      </main>
    );
  }

  const comparePrice = Number(product.compare_at_price || 0);
  const currentPrice = Number(product.price || 0);
  const hasDiscount = comparePrice > currentPrice;

  const categoryName =
    product.category_name ||
    product.category ||
    'Store product';

  return (
    <main className="store-detail-page">
      <nav className="store-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={15} />
        <Link to="/store">Valuedam Store</Link>
        <ChevronRight size={15} />
        <span>{product.name}</span>
      </nav>

      <Link to="/store" className="store-detail-back">
        <ArrowLeft size={18} /> Continue shopping
      </Link>

      <section className="store-detail-layout">
        <div className="store-detail-gallery">
          <div className="store-detail-main-image">
            <ProductImage
              src={selectedImage}
              alt={product.name}
            />

            {product.featured && (
              <span className="store-detail-featured">Featured</span>
            )}
          </div>

          {images.length > 1 && (
            <div
              className="store-detail-thumbnails"
              aria-label="Product images"
            >
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image.id}
                  className={
                    selectedImage === image.url
                      ? 'store-detail-thumb active'
                      : 'store-detail-thumb'
                  }
                  onClick={() => setSelectedImage(image.url)}
                  aria-label={`View product image ${index + 1}`}
                  aria-pressed={selectedImage === image.url}
                >
                  <ProductImage
                    src={image.url}
                    alt={image.alt_text || product.name}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="store-detail-info">
          <p className="store-detail-category">{categoryName}</p>
          <h1>{product.name}</h1>

          {product.short_description && (
            <p className="store-detail-short-description">
              {product.short_description}
            </p>
          )}

          <div className="store-detail-price-row">
            <strong>{formatPrice(currentPrice)}</strong>

            {hasDiscount && (
              <>
                <del>{formatPrice(comparePrice)}</del>
                <span className="store-detail-discount">
                  Save{' '}
                  {Math.round(
                    ((comparePrice - currentPrice) / comparePrice) * 100
                  )}
                  %
                </span>
              </>
            )}
          </div>

          <div
            className={
              isOutOfStock
                ? 'store-detail-stock unavailable'
                : 'store-detail-stock'
            }
          >
            <span className="store-detail-stock-dot" />
            {isOutOfStock
              ? 'Currently out of stock'
              : product.track_inventory
                ? `${product.stock_quantity} available`
                : 'Available to order'}
          </div>

          <div className="store-detail-description">
            <h2>Product details</h2>
            <p>{productDescription}</p>
          </div>

          {!isOutOfStock && (
            <div className="store-detail-purchase">
              <div className="store-detail-quantity">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.max(1, value - 1))
                  }
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>

                <span aria-live="polite">{quantity}</span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) =>
                      Math.min(availableQuantity, value + 1)
                    )
                  }
                  disabled={quantity >= availableQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                type="button"
                className="store-detail-add-button"
                onClick={() => addToCart(false)}
              >
                <ShoppingCart size={19} />
                Add to cart
              </button>
              <button
                type="button"
                className="store-detail-buy-button"
                onClick={() => addToCart(true)}
              >
                {buyNowText}
              </button>
            </div>
          )}

          {cartMessage && (
            <p className="store-detail-cart-message" role="status">
              {cartMessage}
            </p>
          )}

          <div className="store-detail-assurances">
            <div>
              <ShieldCheck size={21} />
              <span>
                <strong>Trusted shopping</strong>
                <small>Shop with confidence</small>
              </span>
            </div>

            <div>
              <Truck size={21} />
              <span>
                <strong>Delivery information</strong>
                <small>Confirmed during checkout</small>
              </span>
            </div>

            <div>
              <Check size={21} />
              <span>
                <strong>Order support</strong>
                <small>Help when you need it</small>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}