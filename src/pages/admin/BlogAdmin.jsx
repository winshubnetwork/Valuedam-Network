import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import RichTextEditor from '../../components/RichTextEditor';

export default function BlogAdmin() {
  const emptyForm = {
    id: null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    image_alt: '',
    category: '',
    tags: '',
    seo_title: '',
    meta_description: '',
    focus_keyword: '',
    canonical_url: '',
    social_image: '',
    author: '',
    status: 'draft',
    published_at: '',
    featured: false,
    whatsapp_number: '',
    whatsapp_message: ''
  };

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [postsResult, categoriesResult] =
      await Promise.all([
        supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('blog_categories')
          .select('*')
          .order('name', { ascending: true })
      ]);

    if (postsResult.error) {
      setMessage(postsResult.error.message);
    }

    if (categoriesResult.error) {
      setMessage(categoriesResult.error.message);
    }

    setPosts(postsResult.data || []);
    setCategories(categoriesResult.data || []);
    setLoading(false);
  }

  function makeSlug(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function handleTitleChange(value) {
    setForm(prev => ({
      ...prev,
      title: value,
      slug: prev.id
        ? prev.slug
        : makeSlug(value)
    }));
  }

  function getChildren(parentId) {
    return categories.filter(
      category => category.parent_id === parentId
    );
  }

  const mainCategories = categories
    .filter(category => !category.parent_id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  function renderCategoryOptions() {
    const options = [];

    mainCategories.forEach(main => {
      options.push(
        <option
          key={main.id}
          value={main.name}
        >
          {main.name}
        </option>
      );

      const children = getChildren(main.id)
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      children.forEach(child => {
        options.push(
          <option
            key={child.id}
            value={child.name}
          >
            — {child.name}
          </option>
        );
      });
    });

    return options;
  }

  function newPost() {
    setForm(emptyForm);
    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function editPost(post) {
    setForm({
      ...emptyForm,
      ...post,
      tags: Array.isArray(post.tags)
        ? post.tags.join(', ')
        : post.tags || '',
      published_at: post.published_at
        ? new Date(post.published_at)
            .toISOString()
            .slice(0, 16)
        : ''
    });

    setMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function savePost(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage('Post title is required.');
      return;
    }

    if (!form.slug.trim()) {
      setMessage('Post slug is required.');
      return;
    }

    if (!form.category) {
      setMessage('Please select a category.');
      return;
    }

    setSaving(true);
    setMessage('');

    const tags = form.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const postData = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content || '',
      featured_image: form.featured_image.trim(),
      image_alt: form.image_alt.trim(),
      category: form.category,
      tags,
      seo_title: form.seo_title.trim(),
      meta_description:
        form.meta_description.trim(),
      focus_keyword:
        form.focus_keyword.trim(),
      canonical_url:
        form.canonical_url.trim(),
      social_image:
        form.social_image.trim(),
      author: form.author.trim(),
      status: form.status,

      published_at:
        form.status === 'published'
          ? (
              form.published_at
                ? new Date(
                    form.published_at
                  ).toISOString()
                : new Date().toISOString()
            )
          : null,

      featured: form.featured,

      whatsapp_number:
        form.whatsapp_number.trim(),

      whatsapp_message:
        form.whatsapp_message.trim(),

      updated_at:
        new Date().toISOString()
    };

    let error;

    if (form.id) {
      const result = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', form.id);

      error = result.error;
    } else {
      const result = await supabase
        .from('blog_posts')
        .insert(postData);

      error = result.error;
    }

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(
      form.id
        ? 'Blog post updated successfully.'
        : 'Blog post created successfully.'
    );

    setForm(emptyForm);

    await loadData();

    setSaving(false);
  }

  async function deletePost(id) {
    if (
      !window.confirm(
        'Delete this blog post? This cannot be undone.'
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Blog post deleted.');

    await loadData();
  }

  async function togglePublish(post) {
    const newStatus =
      post.status === 'published'
        ? 'draft'
        : 'published';

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: newStatus,

        published_at:
          newStatus === 'published'
            ? (
                post.published_at ||
                new Date().toISOString()
              )
            : null,

        updated_at:
          new Date().toISOString()
      })
      .eq('id', post.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      newStatus === 'published'
        ? 'Post published.'
        : 'Post moved to draft.'
    );

    await loadData();
  }

  function formatViews(value) {
    const views = Number(value) || 0;

    return new Intl.NumberFormat().format(views);
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /*
   * BLOG ANALYTICS
   */

  const analytics = useMemo(() => {
    const totalArticles = posts.length;

    const publishedArticles = posts.filter(
      post => post.status === 'published'
    ).length;

    const draftArticles = posts.filter(
      post => post.status !== 'published'
    ).length;

    const featuredArticles = posts.filter(
      post => post.featured === true
    ).length;

    const totalViews = posts.reduce(
      (total, post) =>
        total + (Number(post.views) || 0),
      0
    );

    const publishedViews = posts
      .filter(post => post.status === 'published')
      .reduce(
        (total, post) =>
          total + (Number(post.views) || 0),
        0
      );

    const averageViews =
      publishedArticles > 0
        ? Math.round(
            publishedViews / publishedArticles
          )
        : 0;

    const topPosts = [...posts]
      .filter(post => post.status === 'published')
      .sort(
        (a, b) =>
          (Number(b.views) || 0) -
          (Number(a.views) || 0)
      )
      .slice(0, 5);

    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      featuredArticles,
      totalViews,
      publishedViews,
      averageViews,
      topPosts
    };
  }, [posts]);

  return (
    <section className="admin-section">

      {/* PAGE HEADER */}

      <div className="admin-page-header">

        <div>
          <span className="eyebrow">
            CONTENT MANAGEMENT
          </span>

          <h2>
            Blog
          </h2>

          <p>
            Create, edit, publish and manage
            your articles.
          </p>
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={newPost}
        >
          + New Post
        </button>

      </div>

      {/* MESSAGE */}

      {message && (
        <div className="admin-message">
          {message}
        </div>
      )}

      {/* =====================================================
          BLOG ANALYTICS
          ===================================================== */}

      {!loading && (
        <div
          className="admin-card"
          style={{
            marginBottom: '24px'
          }}
        >

          <div className="card-title">

            <div>
              <h2>
                Blog Overview
              </h2>

              <p>
                Quick statistics for your articles and readership.
              </p>
            </div>

          </div>

          <div
            className="admin-form-grid"
            style={{
              marginTop: '20px'
            }}
          >

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Total Articles
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {analytics.totalArticles}
              </h2>

              <small>
                All saved articles
              </small>
            </div>

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Published
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {analytics.publishedArticles}
              </h2>

              <small>
                Publicly available
              </small>
            </div>

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Drafts
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {analytics.draftArticles}
              </h2>

              <small>
                Not publicly visible
              </small>
            </div>

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Featured
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {analytics.featuredArticles}
              </h2>

              <small>
                Featured articles
              </small>
            </div>

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Total Views
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {formatViews(
                  analytics.totalViews
                )}
              </h2>

              <small>
                Across all articles
              </small>
            </div>

            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px'
              }}
            >
              <small>
                Average Views
              </small>

              <h2
                style={{
                  margin: '6px 0 0'
                }}
              >
                {formatViews(
                  analytics.averageViews
                )}
              </h2>

              <small>
                Per published article
              </small>
            </div>

          </div>

          {/* TOP ARTICLES */}

          {analytics.topPosts.length > 0 && (
            <div
              style={{
                marginTop: '28px'
              }}
            >

              <div
                style={{
                  marginBottom: '14px'
                }}
              >
                <h3
                  style={{
                    marginBottom: '4px'
                  }}
                >
                  Top Articles by Views
                </h3>

                <p>
                  Your most viewed published articles.
                </p>
              </div>

              <div
                className="admin-post-list"
              >

                {analytics.topPosts.map(
                  (post, index) => (
                    <div
                      key={post.id}
                      className="admin-post-row"
                    >

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center'
                        }}
                      >

                        <strong
                          style={{
                            minWidth: '28px'
                          }}
                        >
                          #{index + 1}
                        </strong>

                        <div>
                          <strong>
                            {post.title}
                          </strong>

                          <div>
                            <small>
                              {post.category ||
                                'Uncategorized'}
                              {' • '}
                              Published{' '}
                              {formatDate(
                                post.published_at
                              )}
                            </small>
                          </div>
                        </div>

                      </div>

                      <strong>
                        👁 {formatViews(post.views)}
                      </strong>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* =====================================================
          CREATE / EDIT POST
          ===================================================== */}

      <div className="admin-card">

        <div className="card-title">

          <div>
            <h2>
              {form.id
                ? 'Edit Blog Post'
                : 'Create Blog Post'}
            </h2>

            <p>
              {form.id
                ? 'Update the details of this article.'
                : 'Create a new article for your website.'}
            </p>
          </div>

          {form.id && (
            <button
              type="button"
              className="btn secondary"
              onClick={newPost}
            >
              + New Post
            </button>
          )}

        </div>

        <form onSubmit={savePost}>

          {/* =================================================
              POST INFORMATION
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  01
                </span>

                <div>
                  <h3>
                    Post Information
                  </h3>

                  <p>
                    Basic information about your article.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">

              <div>
                <label>
                  Title
                </label>

                <input
                  value={form.title}
                  onChange={e =>
                    handleTitleChange(
                      e.target.value
                    )
                  }
                  placeholder="Enter your article title"
                />
              </div>

              <div>
                <label>
                  Slug
                </label>

                <input
                  value={form.slug}
                  onChange={e =>
                    updateField(
                      'slug',
                      e.target.value
                    )
                  }
                  placeholder="article-title"
                />

                <small>
                  Used in the article URL.
                </small>
              </div>

              <div>
                <label>
                  Category
                </label>

                <select
                  value={form.category}
                  onChange={e =>
                    updateField(
                      'category',
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select category
                  </option>

                  {renderCategoryOptions()}
                </select>

                <small>
                  Main categories and subcategories
                  are shown together.
                </small>
              </div>

              <div>
                <label>
                  Author
                </label>

                <input
                  value={form.author}
                  onChange={e =>
                    updateField(
                      'author',
                      e.target.value
                    )
                  }
                  placeholder="Author name"
                />
              </div>

            </div>

            <div className="blog-admin-full-field">

              <label>
                Excerpt
              </label>

              <textarea
                rows="4"
                value={form.excerpt}
                onChange={e =>
                  updateField(
                    'excerpt',
                    e.target.value
                  )
                }
                placeholder="Write a short description that will appear on blog cards and search results."
              />

              <small>
                Keep this short and interesting.
              </small>

            </div>

          </div>

          {/* =================================================
              ARTICLE CONTENT
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  02
                </span>

                <div>
                  <h3>
                    Article Content
                  </h3>

                  <p>
                    Write and format the full article.
                  </p>
                </div>
              </div>
            </div>

            <div className="blog-admin-content-editor">

              <label>
                Article Content
              </label>

              <RichTextEditor
                value={form.content}
                onChange={value =>
                  updateField(
                    'content',
                    value
                  )
                }
              />

            </div>

            <div className="blog-admin-full-field">

              <label>
                Tags
              </label>

              <input
                value={form.tags}
                onChange={e =>
                  updateField(
                    'tags',
                    e.target.value
                  )
                }
                placeholder="business, money, technology, entrepreneurship"
              />

              <small>
                Separate multiple tags with commas.
              </small>

            </div>

          </div>

          {/* =================================================
              MEDIA
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  03
                </span>

                <div>
                  <h3>
                    Media
                  </h3>

                  <p>
                    Add images used by the article.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">

              <div>
                <label>
                  Featured Image URL
                </label>

                <input
                  value={form.featured_image}
                  onChange={e =>
                    updateField(
                      'featured_image',
                      e.target.value
                    )
                  }
                  placeholder="https://example.com/image.jpg"
                />

                <small>
                  Main image displayed with the article.
                </small>
              </div>

              <div>
                <label>
                  Image Alt Text
                </label>

                <input
                  value={form.image_alt}
                  onChange={e =>
                    updateField(
                      'image_alt',
                      e.target.value
                    )
                  }
                  placeholder="Describe what the image shows"
                />

                <small>
                  Helps accessibility and SEO.
                </small>
              </div>

              <div>
                <label>
                  Social Image URL
                </label>

                <input
                  value={form.social_image}
                  onChange={e =>
                    updateField(
                      'social_image',
                      e.target.value
                    )
                  }
                  placeholder="https://example.com/social-image.jpg"
                />

                <small>
                  Image used when the article is shared
                  on social platforms.
                </small>
              </div>

            </div>

          </div>

          {/* =================================================
              PUBLISHING
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  04
                </span>

                <div>
                  <h3>
                    Publishing
                  </h3>

                  <p>
                    Control when and how the article appears.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">

              <div>
                <label>
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={e =>
                    updateField(
                      'status',
                      e.target.value
                    )
                  }
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="published">
                    Published
                  </option>
                </select>

                <small>
                  Draft posts are not publicly visible.
                </small>
              </div>

              <div>
                <label>
                  Publish Date
                </label>

                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e =>
                    updateField(
                      'published_at',
                      e.target.value
                    )
                  }
                />

                <small>
                  Leave empty to publish immediately.
                </small>
              </div>

            </div>

            <label
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                marginTop: '18px'
              }}
            >
              <input
                type="checkbox"
                checked={form.featured}
                onChange={e =>
                  updateField(
                    'featured',
                    e.target.checked
                  )
                }
              />

              <span>
                Featured article
              </span>
            </label>

          </div>

          {/* =================================================
              WHATSAPP
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  05
                </span>

                <div>
                  <h3>
                    WhatsApp
                  </h3>

                  <p>
                    Add a WhatsApp contact option for this article.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">

              <div>
                <label>
                  WhatsApp Number
                </label>

                <input
                  value={form.whatsapp_number}
                  onChange={e =>
                    updateField(
                      'whatsapp_number',
                      e.target.value
                    )
                  }
                  placeholder="2348012345678"
                />

                <small>
                  Use international format without +.
                </small>
              </div>

              <div>
                <label>
                  WhatsApp Message
                </label>

                <input
                  value={form.whatsapp_message}
                  onChange={e =>
                    updateField(
                      'whatsapp_message',
                      e.target.value
                    )
                  }
                  placeholder="Hello, I am interested in this article..."
                />
              </div>

            </div>

          </div>

          {/* =================================================
              SEO
              ================================================= */}

          <div className="blog-admin-section">

            <div className="blog-admin-section-header">
              <div>
                <span className="blog-admin-section-number">
                  06
                </span>

                <div>
                  <h3>
                    Search Engine Optimization
                  </h3>

                  <p>
                    Optimize how this article appears
                    in search engines.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-form-grid">

              <div>
                <label>
                  SEO Title
                </label>

                <input
                  value={form.seo_title}
                  onChange={e =>
                    updateField(
                      'seo_title',
                      e.target.value
                    )
                  }
                  placeholder="SEO-friendly page title"
                />
              </div>

              <div>
                <label>
                  Focus Keyword
                </label>

                <input
                  value={form.focus_keyword}
                  onChange={e =>
                    updateField(
                      'focus_keyword',
                      e.target.value
                    )
                  }
                  placeholder="main keyword"
                />
              </div>

              <div>
                <label>
                  Canonical URL
                </label>

                <input
                  value={form.canonical_url}
                  onChange={e =>
                    updateField(
                      'canonical_url',
                      e.target.value
                    )
                  }
                  placeholder="https://valuedam.com.ng/blog/article-title"
                />

                <small>
                  Optional canonical URL for SEO.
                </small>
              </div>

            </div>

            <div className="blog-admin-full-field">

              <label>
                Meta Description
              </label>

              <textarea
                rows="4"
                value={form.meta_description}
                onChange={e =>
                  updateField(
                    'meta_description',
                    e.target.value
                  )
                }
                placeholder="Write a compelling description for search engine results."
              />

            </div>

          </div>

          {/* =================================================
              SAVE ACTIONS
              ================================================= */}

          <div className="blog-admin-save-bar">

            <div>
              <strong>
                {form.id
                  ? 'Ready to update this article?'
                  : 'Ready to publish your article?'}
              </strong>

              <span>
                {form.status === 'published'
                  ? 'This article will be publicly available.'
                  : 'This article will remain a draft.'}
              </span>
            </div>

            <div className="blog-admin-save-actions">

              {form.id && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={newPost}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="btn primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : form.id
                    ? 'Update Post'
                    : form.status === 'published'
                      ? 'Publish Post'
                      : 'Save Draft'}
              </button>

            </div>

          </div>

        </form>

      </div>

      {/* =====================================================
          EXISTING POSTS
          ===================================================== */}

      <div className="admin-card">

        <div className="card-title">

          <div>
            <h2>
              Existing Posts
            </h2>

            <p>
              Manage articles already saved in your blog.
            </p>
          </div>

          <span>
            {posts.length} post
            {posts.length === 1 ? '' : 's'}
          </span>

        </div>

        {loading ? (
          <p>
            Loading posts...
          </p>
        ) : posts.length === 0 ? (
          <div
            style={{
              padding: '30px 10px',
              textAlign: 'center'
            }}
          >
            <strong>
              No blog posts yet.
            </strong>

            <p>
              Create your first article using
              the form above.
            </p>
          </div>
        ) : (
          <div className="admin-post-list">

            {posts.map(post => (

              <div
                key={post.id}
                className="admin-post-row"
              >

                <div>

                  <strong>
                    {post.title}
                  </strong>

                  <div
                    style={{
                      marginTop: '5px'
                    }}
                  >
                    <small>
                      {post.category ||
                        'Uncategorized'}
                      {' • '}
                      {post.status}

                      {post.featured
                        ? ' • Featured'
                        : ''}
                    </small>
                  </div>

                  {/* VIEW COUNT */}

                  <div
                    style={{
                      display: 'flex',
                      gap: '14px',
                      flexWrap: 'wrap',
                      marginTop: '8px'
                    }}
                  >

                    <small>
                      👁{' '}
                      <strong>
                        {formatViews(post.views)}
                      </strong>{' '}
                      views
                    </small>

                    {post.status === 'published' &&
                      post.published_at && (
                        <small>
                          Published{' '}
                          {formatDate(
                            post.published_at
                          )}
                        </small>
                      )}

                  </div>

                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      editPost(post)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      togglePublish(post)
                    }
                  >
                    {post.status === 'published'
                      ? 'Unpublish'
                      : 'Publish'}
                  </button>

                  <button
                    type="button"
                    className="btn danger"
                    onClick={() =>
                      deletePost(post.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

    </section>
  );
}