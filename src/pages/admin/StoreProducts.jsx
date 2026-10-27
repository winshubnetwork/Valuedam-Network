
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ImagePlus, LoaderCircle,
  Pencil, Plus, RefreshCw, Search, ShoppingBag, Trash2,
  UploadCloud, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BUCKET = 'store-product-images';

const EMPTY_FORM = {
  name: '',
  slug: '',
  sku: '',
  category_id: '',
  short_description: '',
  description: '',
  price: '',
  compare_at_price: '',
  stock_quantity: '0',
  track_inventory: true,
  status: 'draft',
  featured: false,
  meta_title: '',
  meta_description: '',
  external_url: '',
  image_alt: '',
};

// Safely convert nullable values to text before trimming.
function safeText(value) {
  return value == null ? '' : String(value).trim();
}

const money = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function slugify(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function imageUrl(image) {
  if (image?.external_url) return image.external_url;

  if (image?.storage_path && supabase) {
    return supabase.storage
      .from(BUCKET)
      .getPublicUrl(image.storage_path).data.publicUrl;
  }

  return '';
}

function StatusPill({ status }) {
  const safeStatus = safeText(status) || 'draft';

  return (
    <span className={`sp-status sp-status-${safeStatus}`}>
      {safeStatus.replaceAll('_', ' ')}
    </span>
  );
}

export default function StoreProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('store_products')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('store_categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load store data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const term = safeText(search).toLowerCase();

    return products.filter((product) => {
      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter;

      const searchableText = [
        product.name,
        product.slug,
        product.sku,
        product.short_description,
      ]
        .map(safeText)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!term || searchableText.includes(term));
    });
  }, [products, search, statusFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    drafts: products.filter((p) => p.status === 'draft').length,
    review: products.filter((p) => p.status === 'pending_review').length,
  }), [products]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startNewProduct() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview('');
    setExistingImage(null);
    setRemoveImage(false);
    setMessage('');
    setError('');
    setShowForm(true);
  }

  async function editProduct(product) {
    setError('');
    setMessage('');

    if (!product?.id) {
      setError('Unable to edit this product because its details are missing.');
      return;
    }

    setEditingId(product.id);

    setForm({
      ...EMPTY_FORM,
      ...product,
      name: product.name ?? '',
      slug: product.slug ?? '',
      sku: product.sku ?? '',
      category_id: product.category_id ?? '',
      short_description: product.short_description ?? '',
      description: product.description ?? '',
      price: String(product.price ?? ''),
      compare_at_price:
        product.compare_at_price == null
          ? ''
          : String(product.compare_at_price),
      stock_quantity: String(product.stock_quantity ?? 0),
      track_inventory: product.track_inventory ?? true,
      status: product.status ?? 'draft',
      featured: product.featured ?? false,
      meta_title: product.meta_title ?? '',
      meta_description: product.meta_description ?? '',
      external_url: '',
      image_alt: '',
    });

    setImageFile(null);
    setImagePreview('');
    setExistingImage(null);
    setRemoveImage(false);
    setShowForm(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error: imageError } = await supabase
        .from('store_product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (imageError) throw imageError;

      if (data) {
        setExistingImage(data);
        setImagePreview(imageUrl(data));
        setField('image_alt', data.alt_text ?? '');
      }
    } catch (err) {
      console.error('Error loading product image:', err);
      setError(
        `Product details loaded, but its image could not be loaded: ${
          err?.message || 'Unknown error'
        }`
      );
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview('');
    setExistingImage(null);
    setRemoveImage(false);
    setError('');
  }

  function handleImageChange(file) {
    setError('');
    setImageFile(null);

    if (!file) {
      setImagePreview(removeImage ? '' : imageUrl(existingImage));
      return;
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ];

    if (!allowed.includes(file.type)) {
      setError('Choose a JPG, PNG, WebP, or AVIF image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Product images must be 5 MB or smaller.');
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setField('external_url', '');

    setImagePreview(URL.createObjectURL(file));
  }

  async function ensurePlatformSeller() {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const platformSlug = 'valuedam-online-store';

    const { data: existing, error: lookupError } = await supabase
      .from('store_sellers')
      .select('id')
      .eq('seller_type', 'platform')
      .eq('slug', platformSlug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing?.id) return existing.id;

    const { data, error: insertError } = await supabase
      .from('store_sellers')
      .insert({
        seller_type: 'platform',
        user_id: null,
        business_name: 'Valuedam Online Store',
        slug: platformSlug,
        description: 'Official products sold by Valuedam.',
        status: 'approved',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return data.id;
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const name = safeText(form.name);
      const slug = slugify(form.slug || name);
      const priceText = safeText(form.price);
      const stockText = safeText(form.stock_quantity);
      const compareText = safeText(form.compare_at_price);
      const externalUrl = safeText(form.external_url);

      const price = Number(priceText);
      const stock = Number(stockText);

      if (!name) {
        throw new Error('Enter the product name.');
      }

      if (!slug) {
        throw new Error('Enter a valid product name or slug.');
      }

      if (
        priceText === '' ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error('Enter a valid product price.');
      }

      if (
        stockText === '' ||
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        throw new Error(
          'Stock quantity must be a whole number of 0 or more.'
        );
      }

      if (
        compareText !== '' &&
        (!Number.isFinite(Number(compareText)) ||
          Number(compareText) < 0)
      ) {
        throw new Error('Enter a valid comparison price.');
      }

      if (
        compareText !== '' &&
        Number(compareText) < price
      ) {
        throw new Error(
          'The comparison price should not be lower than the selling price.'
        );
      }

      if (externalUrl) {
        let parsed;

        try {
          parsed = new URL(externalUrl);
        } catch {
          throw new Error(
            'Enter a valid image URL beginning with https://.'
          );
        }

        if (!['https:', 'http:'].includes(parsed.protocol)) {
          throw new Error('The image URL must use HTTPS or HTTP.');
        }
      }

      const userResult = await supabase.auth.getUser();

      if (userResult.error) throw userResult.error;

      const userId = userResult.data?.user?.id;

      if (!userId) {
        throw new Error(
          'Please sign in to the admin dashboard again.'
        );
      }

      const sellerId = await ensurePlatformSeller();
      const now = new Date().toISOString();

      const payload = {
        seller_id: sellerId,
        category_id: safeText(form.category_id) || null,
        name,
        slug,
        sku: safeText(form.sku) || null,
        short_description: safeText(form.short_description) || null,
        description: safeText(form.description) || null,
        price,
        compare_at_price:
          compareText === '' ? null : Number(compareText),
        stock_quantity: stock,
        track_inventory: Boolean(form.track_inventory),
        status: safeText(form.status) || 'draft',
        featured: Boolean(form.featured),
        meta_title: safeText(form.meta_title) || null,
        meta_description: safeText(form.meta_description) || null,
        updated_by: userId,
        updated_at: now,
        published_at:
          form.status === 'active' ? now : null,
      };

      let productId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from('store_products')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('store_products')
          .insert({
            ...payload,
            created_by: userId,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        productId = data.id;
      }

      let newImageRecord = null;

      if (imageFile) {
        const safeName = imageFile.name
          .toLowerCase()
          .replace(/[^a-z0-9.-]+/g, '-');

        const storagePath =
          `${sellerId}/${productId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) throw uploadError;

        newImageRecord = {
          product_id: productId,
          storage_path: storagePath,
          external_url: null,
          alt_text: safeText(form.image_alt) || name,
          sort_order: 0,
          is_primary: true,
        };
      } else if (externalUrl) {
        newImageRecord = {
          product_id: productId,
          storage_path: null,
          external_url: externalUrl,
          alt_text: safeText(form.image_alt) || name,
          sort_order: 0,
          is_primary: true,
        };
      }

      if (newImageRecord) {
        const { error: removeOldError } = await supabase
          .from('store_product_images')
          .delete()
          .eq('product_id', productId);

        if (removeOldError) throw removeOldError;

        const { error: imageInsertError } = await supabase
          .from('store_product_images')
          .insert(newImageRecord);

        if (imageInsertError) throw imageInsertError;
      } else if (removeImage) {
        const { error: removeError } = await supabase
          .from('store_product_images')
          .delete()
          .eq('product_id', productId);

        if (removeError) throw removeError;
      } else if (editingId && existingImage && !imageFile && !externalUrl) {
        const { error: altError } = await supabase
          .from('store_product_images')
          .update({
            alt_text: safeText(form.image_alt) || name,
          })
          .eq('id', existingImage.id);

        if (altError) throw altError;
      }

      setMessage(
        editingId
          ? 'Product updated successfully.'
          : 'Product created successfully.'
      );

      closeForm();
      await loadData();
    } catch (err) {
      console.error('Store product save error:', err);
      setError(err?.message || 'Unable to save the product.');
    } finally {
      setSaving(false);
    }
  }

  async function createCategory(event) {
    event.preventDefault();

    const name = safeText(categoryName);

    if (!name) {
      setError('Enter a category name.');
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setCreatingCategory(true);
    setError('');
    setMessage('');

    try {
      const baseSlug = slugify(name);

      if (!baseSlug) {
        throw new Error('Enter a valid category name.');
      }

      const { data: existing, error: lookupError } = await supabase
        .from('store_categories')
        .select('id')
        .eq('slug', baseSlug)
        .maybeSingle();

      if (lookupError) throw lookupError;

      const slug = existing
        ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        : baseSlug;

      const { data, error: insertError } = await supabase
        .from('store_categories')
        .insert({
          name,
          slug,
          is_active: true,
          sort_order: categories.length,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      setCategories((current) => [...current, data]);
      setForm((current) => ({
        ...current,
        category_id: data.id,
      }));
      setCategoryName('');
      setShowCategoryForm(false);
      setMessage('Category created and selected.');
    } catch (err) {
      setError(err?.message || 'Unable to create category.');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${safeText(product?.name) || 'this product'}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setError('');
    setMessage('');

    try {
      const { error: deleteError } = await supabase
        .from('store_products')
        .delete()
        .eq('id', product.id);

      if (deleteError) throw deleteError;

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setMessage('Product deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete the product.');
    }
  }

  return (
    <div className="sp-admin">
      <style>{`
        .sp-admin{max-width:1500px;margin:0 auto;padding:24px;color:#172033}
        .sp-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px}
        .sp-eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9a6b00;margin-bottom:7px}
        .sp-head h1{font-size:clamp(25px,3vw,34px);margin:0 0 7px;letter-spacing:-.035em}
        .sp-head p{margin:0;color:#667085;line-height:1.5}
        .sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #d9dee8;background:white;color:#273247;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;min-height:42px}
        .sp-btn:disabled{opacity:.6;cursor:not-allowed}
        .sp-btn-primary{background:#f5b82e;border-color:#f5b82e;color:#191919}
        .sp-btn-danger{color:#b42318}
        .sp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:22px}
        .sp-stat{border:1px solid #e5e8ef;border-radius:14px;padding:17px;background:#fff}
        .sp-stat span{display:block;color:#667085;font-size:13px;margin-bottom:8px}
        .sp-stat strong{font-size:27px;letter-spacing:-.03em}
        .sp-toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .sp-search{position:relative;flex:1;min-width:210px}
        .sp-search svg{position:absolute;left:12px;top:13px;color:#7b8495}
        .sp-input,.sp-select,.sp-textarea{width:100%;box-sizing:border-box;border:1px solid #d9dee8;background:#fff;border-radius:10px;padding:11px 12px;color:#172033;font:inherit;outline:none}
        .sp-search .sp-input{padding-left:39px}
        .sp-input:focus,.sp-select:focus,.sp-textarea:focus{border-color:#d5a014;box-shadow:0 0 0 3px #f5b82e30}
        .sp-select{min-width:150px}
        .sp-table-wrap{overflow:auto;border:1px solid #e5e8ef;border-radius:14px;background:#fff}
        .sp-table{width:100%;border-collapse:collapse;min-width:760px}
        .sp-table th,.sp-table td{text-align:left;padding:14px 16px;border-bottom:1px solid #eef0f4;vertical-align:middle}
        .sp-table th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#667085;background:#fafbfc}
        .sp-table tr:last-child td{border-bottom:0}
        .sp-product-name{font-weight:800;color:#172033}
        .sp-subtext{font-size:12px;color:#7b8495;margin-top:4px}
        .sp-status{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800;text-transform:capitalize;white-space:nowrap;background:#eef2f6;color:#475467}
        .sp-status-active{background:#e7f8ee;color:#167647}
        .sp-status-draft{background:#f2f4f7;color:#475467}
        .sp-status-pending_review{background:#fff3d6;color:#946200}
        .sp-status-rejected{background:#feeceb;color:#b42318}
        .sp-status-archived{background:#e8edf5;color:#475467}
        .sp-row-actions{display:flex;gap:6px}
        .sp-icon-btn{border:1px solid #e0e4eb;background:#fff;border-radius:8px;padding:8px;cursor:pointer;color:#344054;display:inline-flex}
        .sp-notice{padding:12px 14px;border-radius:10px;margin:12px 0 18px;line-height:1.5;overflow-wrap:anywhere}
        .sp-error{background:#fff0ef;color:#a52820;border:1px solid #ffd3cf}
        .sp-success{background:#eaf8ef;color:#176b3b;border:1px solid #c8efd5}
        .sp-empty{text-align:center;padding:48px 20px;color:#667085}
        .sp-empty svg{margin:0 auto 12px;color:#9aa3b2}
        .sp-empty h3{color:#273247;margin:0 0 6px}
        .sp-overlay{position:fixed;inset:0;background:#11182785;z-index:1000;display:flex;justify-content:center;align-items:flex-start;padding:22px;overflow:auto}
        .sp-modal{width:min(900px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 80px #0003;overflow:hidden;margin:auto}
        .sp-modal-head{padding:20px 24px;border-bottom:1px solid #e8ebf0;display:flex;justify-content:space-between;align-items:center;gap:14px}
        .sp-modal-head h2{margin:0;font-size:22px}
        .sp-modal-head p{margin:5px 0 0;color:#667085;font-size:13px}
        .sp-modal-body{padding:24px}
        .sp-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .sp-field{display:flex;flex-direction:column;gap:7px;min-width:0}
        .sp-field label{font-size:13px;font-weight:800;color:#344054}
        .sp-field small{font-size:12px;color:#667085;line-height:1.45}
        .sp-span-2{grid-column:1/-1}
        .sp-textarea{min-height:100px;resize:vertical}
        .sp-checks{display:flex;gap:20px;flex-wrap:wrap;padding:10px 0}
        .sp-check{display:flex;align-items:center;gap:8px;font-size:14px;color:#344054}
        .sp-image-box{border:1px dashed #cbd2dd;background:#fafbfc;border-radius:13px;padding:15px;display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;align-items:center}
        .sp-image-preview{width:140px;height:140px;border-radius:10px;object-fit:contain;background:#fff;border:1px solid #e5e8ef}
        .sp-image-empty{width:140px;height:140px;display:grid;place-items:center;border-radius:10px;background:#f0f2f5;color:#98a2b3}
        .sp-file-label{display:inline-flex;align-items:center;gap:8px;border:1px solid #d9dee8;background:white;padding:9px 12px;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px}
        .sp-modal-foot{padding:16px 24px;border-top:1px solid #e8ebf0;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
        .sp-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:45px;color:#667085}
        .sp-spin{animation:sp-spin 1s linear infinite}
        @keyframes sp-spin{to{transform:rotate(360deg)}}
        @media(max-width:700px){.sp-admin{padding:16px}.sp-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sp-form-grid{grid-template-columns:1fr}.sp-span-2{grid-column:auto}.sp-modal-body{padding:17px}.sp-modal-head,.sp-modal-foot{padding:16px}.sp-overlay{padding:10px}.sp-image-box{grid-template-columns:1fr}.sp-image-preview,.sp-image-empty{width:100%;height:190px}}
        @media(prefers-reduced-motion:reduce){.sp-spin{animation:none}}
      `}</style>

      <header className="sp-head">
        <div>
          <div className="sp-eyebrow">Valuedam Online Store</div>
          <h1>Products</h1>
          <p>Create, update, and publish products for your online store.</p>
        </div>

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button
            className="sp-btn"
            onClick={loadData}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            className="sp-btn sp-btn-primary"
            onClick={startNewProduct}
            type="button"
          >
            <Plus size={17} /> Add product
          </button>
        </div>
      </header>

      <section className="sp-stats">
        <div className="sp-stat">
          <span>Total products</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="sp-stat">
          <span>Published</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="sp-stat">
          <span>Drafts</span>
          <strong>{stats.drafts}</strong>
        </div>
        <div className="sp-stat">
          <span>Pending review</span>
          <strong>{stats.review}</strong>
        </div>
      </section>

      {error && (
        <div className="sp-notice sp-error">
          <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {error}
        </div>
      )}

      {message && (
        <div className="sp-notice sp-success">
          <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {message}
        </div>
      )}

      <div className="sp-toolbar">
        <div className="sp-search">
          <Search size={17} />
          <input
            className="sp-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name, SKU, or slug…"
            aria-label="Search products"
          />
        </div>

        <select
          className="sp-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter products by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Published</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>

        <button
          className="sp-btn"
          type="button"
          onClick={() => {
            setShowCategoryForm((value) => !value);
            setError('');
          }}
        >
          <Plus size={16} /> Category
        </button>
      </div>

      {showCategoryForm && (
        <form
          onSubmit={createCategory}
          style={{
            display: 'flex',
            gap: 9,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <input
            className="sp-input"
            style={{ flex: '1 1 220px' }}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="New category name"
            required
          />

          <button
            className="sp-btn sp-btn-primary"
            type="submit"
            disabled={creatingCategory}
          >
            {creatingCategory
              ? <LoaderCircle className="sp-spin" size={16} />
              : <Plus size={16} />}
            Create category
          </button>

          <button
            className="sp-btn"
            type="button"
            onClick={() => setShowCategoryForm(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <div className="sp-loading">
          <LoaderCircle className="sp-spin" size={22} />
          Loading products…
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="sp-table-wrap">
          <div className="sp-empty">
            <ShoppingBag size={34} />
            <h3>
              {products.length
                ? 'No matching products'
                : 'Your store is ready for its first product'}
            </h3>
            <p>
              {products.length
                ? 'Try a different search or status filter.'
                : 'Add a product here and publish it to make it visible in the public store.'}
            </p>

            {!products.length && (
              <button
                className="sp-btn sp-btn-primary"
                onClick={startNewProduct}
                type="button"
              >
                <Plus size={16} /> Add your first product
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="sp-product-name">
                      {safeText(product.name) || 'Unnamed product'}
                    </div>
                    <div className="sp-subtext">
                      {safeText(product.sku) || safeText(product.slug)}
                    </div>
                  </td>

                  <td>
                    <strong>{money(product.price)}</strong>
                    {product.compare_at_price != null && (
                      <div className="sp-subtext">
                        Was {money(product.compare_at_price)}
                      </div>
                    )}
                  </td>

                  <td>
                    {product.track_inventory
                      ? product.stock_quantity ?? 0
                      : 'Not tracked'}
                  </td>

                  <td><StatusPill status={product.status} /></td>

                  <td>
                    <div className="sp-row-actions">
                      <button
                        className="sp-icon-btn"
                        title="Edit product"
                        aria-label={`Edit ${safeText(product.name)}`}
                        type="button"
                        onClick={() => editProduct(product)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="sp-icon-btn sp-btn-danger"
                        title="Delete product"
                        aria-label={`Delete ${safeText(product.name)}`}
                        type="button"
                        onClick={() => deleteProduct(product)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div
          className="sp-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) closeForm();
          }}
        >
          <section
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sp-form-title"
          >
            <div className="sp-modal-head">
              <div>
                <h2 id="sp-form-title">
                  {editingId ? 'Edit product' : 'Add product'}
                </h2>
                <p>Fields marked * are required.</p>
              </div>

              <button
                className="sp-icon-btn"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="sp-modal-body">
                {error && <div className="sp-notice sp-error">{error}</div>}

                <div className="sp-form-grid">
                  <div className="sp-field sp-span-2">
                    <label htmlFor="sp-name">Product name *</label>
                    <input
                      id="sp-name"
                      className="sp-input"
                      value={form.name ?? ''}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((current) => ({
                          ...current,
                          name,
                          slug: editingId
                            ? safeText(current.slug)
                            : slugify(name),
                        }));
                      }}
                      required
                      maxLength={180}
                    />
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-slug">Product URL slug *</label>
                    <input
                      id="sp-slug"
                      className="sp-input"
                      value={form.slug ?? ''}
                      onChange={(e) => setField('slug', slugify(e.target.value))}
                      required
                    />
                    <small>
                      Public URL: /store/product/{form.slug || 'product-name'}
                    </small>
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-sku">SKU (optional)</label>
                    <input
                      id="sp-sku"
                      className="sp-input"
                      value={form.sku ?? ''}
                      onChange={(e) => setField('sku', e.target.value)}
                    />
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-category">Category</label>
                    <select
                      id="sp-category"
                      className="sp-select"
                      style={{ width: '100%' }}
                      value={form.category_id ?? ''}
                      onChange={(e) => setField('category_id', e.target.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                          {!category.is_active ? ' (inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-status">Publication status</label>
                    <select
                      id="sp-status"
                      className="sp-select"
                      style={{ width: '100%' }}
                      value={form.status ?? 'draft'}
                      onChange={(e) => setField('status', e.target.value)}
                    >
                      <option value="draft">Draft — hidden from shoppers</option>
                      <option value="active">Published — visible in store</option>
                      <option value="pending_review">Pending review</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-price">Selling price (NGN) *</label>
                    <input
                      id="sp-price"
                      className="sp-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price ?? ''}
                      onChange={(e) => setField('price', e.target.value)}
                      required
                    />
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-compare">
                      Previous / comparison price (NGN)
                    </label>
                    <input
                      id="sp-compare"
                      className="sp-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.compare_at_price ?? ''}
                      onChange={(e) => setField('compare_at_price', e.target.value)}
                    />
                  </div>

                  <div className="sp-field">
                    <label htmlFor="sp-stock">Stock quantity</label>
                    <input
                      id="sp-stock"
                      className="sp-input"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_quantity ?? '0'}
                      onChange={(e) => setField('stock_quantity', e.target.value)}
                    />
                  </div>

                  <div className="sp-field">
                    <label>Inventory tracking</label>
                    <label className="sp-check">
                      <input
                        type="checkbox"
                        checked={Boolean(form.track_inventory)}
                        onChange={(e) => setField('track_inventory', e.target.checked)}
                      />
                      Track stock quantity
                    </label>
                  </div>

                  <div className="sp-field sp-span-2">
                    <label htmlFor="sp-short">Short description</label>
                    <textarea
                      id="sp-short"
                      className="sp-textarea"
                      style={{ minHeight: 75 }}
                      maxLength={300}
                      value={form.short_description ?? ''}
                      onChange={(e) => setField('short_description', e.target.value)}
                    />
                  </div>

                  <div className="sp-field sp-span-2">
                    <label htmlFor="sp-description">Full product description</label>
                    <textarea
                      id="sp-description"
                      className="sp-textarea"
                      rows={6}
                      value={form.description ?? ''}
                      onChange={(e) => setField('description', e.target.value)}
                    />
                  </div>

                  <div className="sp-field sp-span-2">
                    <label>Product image</label>
                    <div className="sp-image-box">
                      {imagePreview && !removeImage ? (
                        <img
                          className="sp-image-preview"
                          src={imagePreview}
                          alt={safeText(form.image_alt) || 'Product preview'}
                          onError={() => setError(
                            'The image preview could not load. Try another image or URL.'
                          )}
                        />
                      ) : (
                        <div className="sp-image-empty">
                          <ImagePlus size={28} />
                        </div>
                      )}

                      <div>
                        <label className="sp-file-label">
                          <UploadCloud size={16} /> Upload image
                          <input
                            hidden
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={(e) => {
                              handleImageChange(e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>

                        <p className="sp-subtext">
                          JPG, PNG, WebP or AVIF · Maximum 5 MB.
                        </p>

                        <div className="sp-field" style={{ marginTop: 12 }}>
                          <label htmlFor="sp-image-url">Or paste an image URL</label>
                          <input
                            id="sp-image-url"
                            className="sp-input"
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={form.external_url ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setField('external_url', value);

                              if (value) {
                                setImageFile(null);
                                setRemoveImage(false);
                                setImagePreview(value);
                              } else if (!imageFile) {
                                setImagePreview(
                                  removeImage ? '' : imageUrl(existingImage)
                                );
                              }
                            }}
                          />
                        </div>

                        <div className="sp-field" style={{ marginTop: 10 }}>
                          <label htmlFor="sp-image-alt">Image alt text</label>
                          <input
                            id="sp-image-alt"
                            className="sp-input"
                            value={form.image_alt ?? ''}
                            onChange={(e) => setField('image_alt', e.target.value)}
                            placeholder="Describe the product image"
                          />
                        </div>

                        {(imagePreview || existingImage) && (
                          <button
                            className="sp-btn sp-btn-danger"
                            type="button"
                            style={{ marginTop: 10 }}
                            onClick={() => {
                              setImageFile(null);
                              setField('external_url', '');
                              setImagePreview('');
                              setRemoveImage(true);
                            }}
                          >
                            <Trash2 size={15} /> Remove image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sp-field sp-span-2">
                    <label htmlFor="sp-meta-title">SEO title (optional)</label>
                    <input
                      id="sp-meta-title"
                      className="sp-input"
                      maxLength={180}
                      value={form.meta_title ?? ''}
                      onChange={(e) => setField('meta_title', e.target.value)}
                    />
                  </div>

                  <div className="sp-field sp-span-2">
                    <label htmlFor="sp-meta-description">
                      SEO description (optional)
                    </label>
                    <textarea
                      id="sp-meta-description"
                      className="sp-textarea"
                      rows={3}
                      maxLength={320}
                      value={form.meta_description ?? ''}
                      onChange={(e) => setField('meta_description', e.target.value)}
                    />
                  </div>

                  <div className="sp-field sp-span-2">
                    <div className="sp-checks">
                      <label className="sp-check">
                        <input
                          type="checkbox"
                          checked={Boolean(form.featured)}
                          onChange={(e) => setField('featured', e.target.checked)}
                        />
                        Feature this product
                      </label>
                    </div>
                    <small>
                      Featured products may receive prominent placement when supported by the storefront.
                    </small>
                  </div>
                </div>
              </div>

              <div className="sp-modal-foot">
                <button
                  className="sp-btn"
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="sp-btn sp-btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="sp-spin" size={16} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {editingId ? 'Save changes' : 'Create product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
