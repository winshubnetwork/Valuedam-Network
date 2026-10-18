import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function BlogCategories() {
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingSlug, setEditingSlug] = useState('');
  const [editingParentId, setEditingParentId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);

    const { data, error } = await supabase
      .from('blog_categories')
      .select('id, name, slug, parent_id, created_at')
      .order('name', { ascending: true });

    if (error) {
      showMessage(error.message, 'error');
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }

  function showMessage(text, type = 'success') {
    setMessage(text);
    setMessageType(type);
  }

  function makeSlug(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function getChildren(id) {
    return categories.filter(
      category => category.parent_id === id
    );
  }

  const mainCategories = categories
    .filter(category => !category.parent_id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  function renderParentOptions(excludeId = null) {
    return mainCategories
      .filter(category => category.id !== excludeId)
      .map(category => (
        <option
          key={category.id}
          value={category.id}
        >
          {category.name}
        </option>
      ));
  }

  function handleNameChange(value) {
    setName(value);
    setSlug(makeSlug(value));
  }

  async function addCategory(e) {
    e.preventDefault();

    if (!name.trim()) {
      showMessage(
        'Please enter a category name.',
        'error'
      );
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('blog_categories')
      .insert({
        name: name.trim(),
        slug: slug.trim() || makeSlug(name),
        parent_id: parentId || null
      });

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    const wasSubcategory = Boolean(parentId);

    setName('');
    setSlug('');
    setParentId('');

    showMessage(
      wasSubcategory
        ? 'Subcategory created successfully.'
        : 'Category created successfully.'
    );

    await loadCategories();
    setSaving(false);
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingSlug(category.slug || '');
    setEditingParentId(category.parent_id || '');
    setMessage('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
    setEditingSlug('');
    setEditingParentId('');
  }

  function wouldCreateLoop(categoryId, newParentId) {
    if (!newParentId) return false;

    if (categoryId === newParentId) {
      return true;
    }

    let current = categories.find(
      category => category.id === newParentId
    );

    while (current) {
      if (current.parent_id === categoryId) {
        return true;
      }

      current = categories.find(
        category =>
          category.id === current.parent_id
      );
    }

    return false;
  }

  async function saveEdit() {
    if (!editingName.trim()) {
      showMessage(
        'Please enter a category name.',
        'error'
      );
      return;
    }

    if (
      wouldCreateLoop(
        editingId,
        editingParentId
      )
    ) {
      showMessage(
        'That parent category would create an invalid structure.',
        'error'
      );
      return;
    }

    const oldCategory = categories.find(
      category => category.id === editingId
    );

    setSaving(true);
    setMessage('');

    const newName = editingName.trim();

    const newSlug =
      editingSlug.trim() || makeSlug(newName);

    const { error } = await supabase
      .from('blog_categories')
      .update({
        name: newName,
        slug: newSlug,
        parent_id: editingParentId || null
      })
      .eq('id', editingId);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    if (
      oldCategory &&
      oldCategory.name !== newName
    ) {
      const { error: postError } = await supabase
        .from('blog_posts')
        .update({
          category: newName
        })
        .eq('category', oldCategory.name);

      if (postError) {
        showMessage(
          `Category changed, but existing posts could not be updated: ${postError.message}`,
          'error'
        );

        setSaving(false);
        await loadCategories();
        return;
      }
    }

    cancelEdit();

    showMessage(
      'Category updated successfully.'
    );

    await loadCategories();
    setSaving(false);
  }

  async function deleteCategory(category) {
    const children = getChildren(category.id);

    let warning =
      `Delete "${category.name}"?`;

    if (children.length > 0) {
      warning +=
        `\n\nThis category has ${children.length} ${
          children.length === 1
            ? 'subcategory'
            : 'subcategories'
        }. They will become main categories.`;
    }

    warning +=
      '\n\nExisting blog posts will not be deleted.';

    if (!window.confirm(warning)) {
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    if (editingId === category.id) {
      cancelEdit();
    }

    showMessage(
      'Category deleted successfully.'
    );

    await loadCategories();
    setSaving(false);
  }

  function renderCategory(category, level = 0) {
    const children = getChildren(category.id)
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    const isEditing =
      editingId === category.id;

    return (
      <React.Fragment key={category.id}>

        <div
          className={
            level === 0
              ? 'blog-category-item'
              : 'blog-category-child'
          }
        >

          {isEditing ? (

            <div className="blog-category-edit">

              <div className="blog-category-edit-heading">
                <div className="blog-category-edit-icon">
                  ✎
                </div>

                <div>
                  <strong>
                    Edit {level > 0
                      ? 'Subcategory'
                      : 'Category'}
                  </strong>

                  <span>
                    Update the category details below.
                  </span>
                </div>
              </div>

              <div className="admin-form-grid">

                <div>
                  <label>
                    Category Name
                  </label>

                  <input
                    type="text"
                    value={editingName}
                    onChange={e =>
                      setEditingName(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label>
                    Slug
                  </label>

                  <input
                    type="text"
                    value={editingSlug}
                    onChange={e =>
                      setEditingSlug(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label>
                    Parent Category
                  </label>

                  <select
                    value={editingParentId}
                    onChange={e =>
                      setEditingParentId(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      None — Main Category
                    </option>

                    {renderParentOptions(
                      editingId
                    )}
                  </select>
                </div>

              </div>

              <div className="blog-category-edit-actions">

                <button
                  type="button"
                  className="btn primary"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

              </div>

            </div>

          ) : (

            <div className="blog-category-row">

              <div className="blog-category-info">

                <div
                  className={
                    level === 0
                      ? 'blog-category-icon main'
                      : 'blog-category-icon child'
                  }
                >
                  {level === 0 ? 'C' : '↳'}
                </div>

                <div className="blog-category-details">

                  <div className="blog-category-title-row">

                    <strong>
                      {category.name}
                    </strong>

                    <span
                      className={
                        level === 0
                          ? 'blog-category-badge main'
                          : 'blog-category-badge child'
                      }
                    >
                      {level === 0
                        ? 'Main'
                        : 'Subcategory'}
                    </span>

                  </div>

                  <div className="blog-category-meta">

                    <span>
                      /{category.slug}
                    </span>

                    {children.length > 0 && (
                      <>
                        <span className="blog-category-dot">
                          •
                        </span>

                        <span>
                          {children.length}{' '}
                          {children.length === 1
                            ? 'subcategory'
                            : 'subcategories'}
                        </span>
                      </>
                    )}

                  </div>

                </div>

              </div>

              <div className="blog-category-actions">

                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    startEdit(category)
                  }
                  disabled={saving}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="btn danger"
                  onClick={() =>
                    deleteCategory(category)
                  }
                  disabled={saving}
                >
                  Delete
                </button>

              </div>

            </div>

          )}

        </div>

        {children.length > 0 && (
          <div className="blog-category-children">
            {children.map(child =>
              renderCategory(
                child,
                level + 1
              )
            )}
          </div>
        )}

      </React.Fragment>
    );
  }

  return (
    <section className="admin-section">

      {/* PAGE HEADER */}

      <div className="admin-page-header">

        <div>

          <span className="eyebrow">
            BLOG MANAGEMENT
          </span>

          <h2>
            Blog Categories
          </h2>

          <p>
            Organize your articles with main
            categories and subcategories.
          </p>

        </div>

      </div>

      {/* MESSAGE */}

      {message && (
        <div
          className="admin-message"
          style={{
            borderLeft:
              messageType === 'error'
                ? '4px solid #dc2626'
                : '4px solid #16a34a'
          }}
        >
          {message}
        </div>
      )}

      {/* ADD CATEGORY */}

      <div className="admin-card blog-category-add-card">

        <div className="blog-category-add-heading">

          <div className="blog-category-add-icon">
            +
          </div>

          <div>
            <h3>
              Add Category
            </h3>

            <p>
              Create a main category or place
              it under an existing category.
            </p>
          </div>

        </div>

        <form
          onSubmit={addCategory}
          className="blog-category-add-form"
        >

          <div className="admin-form-grid">

            <div>
              <label>
                Category Name
              </label>

              <input
                type="text"
                value={name}
                onChange={e =>
                  handleNameChange(
                    e.target.value
                  )
                }
                placeholder="e.g. Business"
              />
            </div>

            <div>
              <label>
                Slug
              </label>

              <input
                type="text"
                value={slug}
                onChange={e =>
                  setSlug(e.target.value)
                }
                placeholder="business"
              />
            </div>

            <div>
              <label>
                Parent Category
              </label>

              <select
                value={parentId}
                onChange={e =>
                  setParentId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  None — Main Category
                </option>

                {renderParentOptions()}
              </select>
            </div>

          </div>

          <div className="blog-category-add-actions">

            <button
              type="submit"
              className="btn primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : parentId
                  ? 'Add Subcategory'
                  : 'Add Category'}
            </button>

            {parentId && (
              <span>
                This will be created as a
                subcategory.
              </span>
            )}

          </div>

        </form>

      </div>

      {/* YOUR CATEGORIES */}

      <div className="admin-card blog-categories-list-card">

        <div className="blog-categories-list-header">

          <div className="blog-categories-list-title">

            <div className="blog-categories-list-icon">
              ☷
            </div>

            <div>
              <div className="blog-categories-title-line">

                <h3>
                  Your Categories
                </h3>

                <span className="blog-categories-count">
                  {categories.length}
                </span>

              </div>

              <p>
                Manage your category structure
                and subcategories.
              </p>
            </div>

          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={loadCategories}
            disabled={loading || saving}
          >
            ↻ Refresh
          </button>

        </div>

        {loading ? (

          <div className="blog-categories-state">
            <div className="blog-categories-spinner">
              ↻
            </div>

            <strong>
              Loading categories...
            </strong>

            <span>
              Please wait while your categories
              are loaded.
            </span>
          </div>

        ) : categories.length === 0 ? (

          <div className="blog-categories-empty">

            <div className="blog-categories-empty-icon">
              📁
            </div>

            <strong>
              No categories yet
            </strong>

            <span>
              Create your first category using
              the form above.
            </span>

          </div>

        ) : (

          <div className="blog-category-tree">

            {mainCategories.map(category =>
              renderCategory(category)
            )}

          </div>

        )}

      </div>

    </section>
  );
}