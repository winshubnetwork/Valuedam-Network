import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const POSTS_PER_PAGE = 9;

const SITE_URL = 'https://valuedam.com.ng';
const BLOG_URL = `${SITE_URL}/blog`;

function setMetaTag(attribute, value, content) {
  if (!content) return;

  let element = document.head.querySelector(
    `meta[${attribute}="${value}"]`
  );

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setLinkTag(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function formatViews(value) {
  const views = Number(value || 0);

  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }

  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }

  return views.toLocaleString();
}

function formatDate(date) {
  if (!date) return '';

  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getPostTags(post) {
  if (!post?.tags) return [];

  if (Array.isArray(post.tags)) {
    return post.tags.filter(Boolean);
  }

  if (typeof post.tags === 'string') {
    return post.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  useEffect(() => {
    let mounted = true;

    async function loadBlog() {
      setLoading(true);

      const [{ data: postData, error: postError }, { data: categoryData }] =
        await Promise.all([
          supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false }),

          supabase
            .from('blog_categories')
            .select('*')
            .order('name', { ascending: true }),
        ]);

      if (!mounted) return;

      if (postError) {
        console.error('Error loading blog posts:', postError);
        setPosts([]);
      } else {
        setPosts(postData || []);
      }

      setCategories(categoryData || []);
      setLoading(false);
    }

    loadBlog();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * BLOG LISTING SEO
   */
  useEffect(() => {
    const title =
      'ValueDam Blog | Business, Technology, Money & Digital Growth';

    const description =
      'Read practical articles on business, technology, money, digital growth, entrepreneurship, opportunities and useful ideas from ValueDam.';

    const canonicalUrl = BLOG_URL;

    document.title = title;

    setMetaTag('name', 'description', description);
    setMetaTag(
      'name',
      'keywords',
      'business, technology, money, entrepreneurship, digital growth, online business, opportunities, ValueDam blog'
    );

    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', 'ValueDam');
    setMetaTag(
      'property',
      'og:image',
      `${SITE_URL}/og-image.jpg`
    );

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag(
      'name',
      'twitter:image',
      `${SITE_URL}/og-image.jpg`
    );

    setLinkTag('canonical', canonicalUrl);

    /*
     * Breadcrumb structured data
     */
    const breadcrumbId = 'valuedam-blog-breadcrumb-schema';

    let breadcrumbScript = document.getElementById(breadcrumbId);

    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = breadcrumbId;
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    breadcrumbScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: BLOG_URL,
        },
      ],
    });

    /*
     * Blog / ItemList structured data
     */
    const blogSchemaId = 'valuedam-blog-schema';

    let blogScript = document.getElementById(blogSchemaId);

    if (!blogScript) {
      blogScript = document.createElement('script');
      blogScript.id = blogSchemaId;
      blogScript.type = 'application/ld+json';
      document.head.appendChild(blogScript);
    }

    const itemList = posts.slice(0, 20).map((post, index) => {
      const postUrl = `${SITE_URL}/blog/${post.slug}`;

      return {
        '@type': 'ListItem',
        position: index + 1,
        url: postUrl,
        name: post.title,
      };
    });

    blogScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'ValueDam Blog',
      description,
      url: BLOG_URL,
      publisher: {
        '@type': 'Organization',
        name: 'ValueDam',
        url: SITE_URL,
      },
      blogPost: {
        '@type': 'ItemList',
        itemListElement: itemList,
      },
    });

    return () => {
      const breadcrumb = document.getElementById(breadcrumbId);
      const blogSchema = document.getElementById(blogSchemaId);

      if (breadcrumb) breadcrumb.remove();
      if (blogSchema) blogSchema.remove();
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const tags = getPostTags(post);

      const searchableText = [
        post.title,
        post.excerpt,
        post.content,
        post.category,
        post.author,
        ...tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesCategory =
        !selectedCategory ||
        post.category === selectedCategory;

      const matchesTag =
        !selectedTag ||
        tags.some((tag) => tag === selectedTag);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [posts, search, selectedCategory, selectedTag]);

  const featuredPosts = useMemo(() => {
    return filteredPosts
      .filter((post) => post.featured)
      .slice(0, 3);
  }, [filteredPosts]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(selectedCategory) ||
    Boolean(selectedTag);

  const normalPosts = useMemo(() => {
    if (hasActiveFilters) {
      return filteredPosts;
    }

    const featuredIds = new Set(
      featuredPosts.map((post) => post.id)
    );

    return filteredPosts.filter(
      (post) => !featuredIds.has(post.id)
    );
  }, [filteredPosts, hasActiveFilters, featuredPosts]);

  const visiblePosts = normalPosts.slice(0, visibleCount);

  const resetPagination = () => {
    setVisibleCount(POSTS_PER_PAGE);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    resetPagination();
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    resetPagination();
  };

  const handleTagChange = (tag) => {
    setSelectedTag(tag);
    resetPagination();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedTag('');
    resetPagination();
  };

  const loadMore = () => {
    setVisibleCount((current) => current + POSTS_PER_PAGE);
  };

  const renderPostCard = (post) => {
    const tags = getPostTags(post);

    return (
      <article
        key={post.id}
        className="blog-card"
      >
        {post.featured_image && (
          <Link
            to={`/blog/${post.slug}`}
            className="blog-card-image-link"
          >
            <img
              src={post.featured_image}
              alt={
                post.image_alt ||
                post.title ||
                'ValueDam Blog article'
              }
              className="blog-card-image"
              loading="lazy"
            />
          </Link>
        )}

        <div className="blog-card-body">
          <div className="blog-card-meta">
            {post.category && (
              <span className="blog-category">
                {post.category}
              </span>
            )}

            {post.published_at && (
              <span>{formatDate(post.published_at)}</span>
            )}

            <span>{formatViews(post.views)} views</span>
          </div>

          {post.featured && !hasActiveFilters && (
            <span className="featured-badge">
              Featured
            </span>
          )}

          <h3 className="blog-card-title">
            <Link to={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </h3>

          {post.excerpt && (
            <p className="blog-card-excerpt">
              {post.excerpt}
            </p>
          )}

          {tags.length > 0 && (
            <div className="blog-card-tags">
              {tags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-button ${
                    selectedTag === tag
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => handleTagChange(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <Link
            to={`/blog/${post.slug}`}
            className="read-article"
          >
            Read Article →
          </Link>
        </div>
      </article>
    );
  };

  return (
    <>
      <style>{`
        .blog-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .blog-hero {
          padding: 72px 20px 48px;
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #1e293b 100%
          );
          color: white;
        }

        .blog-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .blog-hero-inner {
          max-width: 800px;
        }

        .blog-kicker {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #facc15;
        }

        .blog-hero h1 {
          margin: 0;
          font-size: clamp(38px, 6vw, 64px);
          line-height: 1.05;
        }

        .blog-hero p {
          margin: 18px 0 0;
          max-width: 680px;
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.7;
        }

        .blog-filters {
          margin-top: -28px;
          position: relative;
          z-index: 2;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 14px;
          padding: 18px;
          background: white;
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.1);
        }

        .filter-input,
        .filter-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 13px 14px;
          background: #fff;
          color: #0f172a;
          font-size: 15px;
          outline: none;
        }

        .filter-input:focus,
        .filter-select:focus {
          border-color: #94a3b8;
        }

        .filter-summary {
          margin: 22px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-summary p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .clear-filters {
          border: 0;
          background: transparent;
          color: #0f766e;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .blog-section {
          padding: 56px 20px;
        }

        .blog-section-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin-bottom: 24px;
        }

        .blog-section-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
        }

        .blog-section-header p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .blog-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .blog-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: white;
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .blog-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.1);
        }

        .blog-card-image-link {
          display: block;
        }

        .blog-card-image {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
        }

        .blog-card-body {
          padding: 22px;
        }

        .blog-card-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          color: #64748b;
          font-size: 12px;
        }

        .blog-category {
          color: #0f766e;
          font-weight: 800;
        }

        .featured-badge {
          display: inline-block;
          margin-top: 13px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #fef3c7;
          color: #92400e;
          font-size: 11px;
          font-weight: 800;
        }

        .blog-card-title {
          margin: 12px 0 9px;
          font-size: 22px;
          line-height: 1.25;
        }

        .blog-card-title a {
          color: #0f172a;
          text-decoration: none;
        }

        .blog-card-title a:hover {
          color: #0f766e;
        }

        .blog-card-excerpt {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }

        .blog-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 17px;
        }

        .tag-button {
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
          padding: 5px 9px;
          font-size: 11px;
          cursor: pointer;
        }

        .tag-button.active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
        }

        .read-article {
          display: inline-block;
          margin-top: 18px;
          color: #0f766e;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        .load-more-wrap {
          display: flex;
          justify-content: center;
          margin-top: 40px;
        }

        .load-more {
          border: 0;
          border-radius: 12px;
          background: #0f172a;
          color: white;
          padding: 13px 22px;
          font-weight: 800;
          cursor: pointer;
        }

        .load-more:hover {
          background: #1e293b;
        }

        .blog-count {
          margin-top: 16px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: white;
        }

        .empty-state h3 {
          margin: 0;
          color: #0f172a;
        }

        .empty-state p {
          margin: 10px 0 20px;
          color: #64748b;
        }

        .empty-state button {
          border: 0;
          border-radius: 10px;
          padding: 11px 18px;
          background: #0f172a;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .loading-state {
          padding: 80px 20px;
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 900px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }

          .blog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .blog-hero {
            padding: 56px 18px 42px;
          }

          .blog-section {
            padding: 42px 18px;
          }

          .blog-grid {
            grid-template-columns: 1fr;
          }

          .blog-card-image {
            height: 210px;
          }
        }
      `}</style>

      <main className="blog-page">
        <section className="blog-hero">
          <div className="blog-container blog-hero-inner">
            <p className="blog-kicker">
              VALUEDAM BLOG
            </p>

            <h1>
              Insights, Ideas & Opportunities
            </h1>

            <p>
              Practical ideas, useful information and
              opportunities covering business, technology,
              money, digital growth and entrepreneurship.
            </p>
          </div>
        </section>

        <section className="blog-filters">
          <div className="blog-container">
            <div className="filter-grid">
              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search articles..."
                className="filter-input"
                aria-label="Search blog articles"
              />

              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="filter-select"
                aria-label="Filter by category"
              >
                <option value="">
                  All Categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedTag}
                onChange={(event) => {
                  setSelectedTag(event.target.value);
                  resetPagination();
                }}
                className="filter-select"
                aria-label="Filter by tag"
              >
                <option value="">
                  All Tags
                </option>

                {Array.from(
                  new Set(
                    posts.flatMap((post) =>
                      getPostTags(post)
                    )
                  )
                )
                  .sort()
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="filter-summary">
                <p>
                  Showing {filteredPosts.length} matching
                  article
                  {filteredPosts.length === 1 ? '' : 's'}.
                </p>

                <button
                  type="button"
                  className="clear-filters"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="loading-state">
            Loading articles...
          </div>
        ) : (
          <>
            {!hasActiveFilters &&
              featuredPosts.length > 0 && (
                <section className="blog-section">
                  <div className="blog-container">
                    <div className="blog-section-header">
                      <div>
                        <h2>
                          Featured Articles
                        </h2>
                        <p>
                          Selected ideas and useful reads
                          from the ValueDam Blog.
                        </p>
                      </div>
                    </div>

                    <div className="blog-grid">
                      {featuredPosts.map(
                        renderPostCard
                      )}
                    </div>
                  </div>
                </section>
              )}

            <section className="blog-section">
              <div className="blog-container">
                <div className="blog-section-header">
                  <div>
                    <h2>
                      {hasActiveFilters
                        ? 'Matching Articles'
                        : 'Latest Articles'}
                    </h2>

                    <p>
                      {hasActiveFilters
                        ? 'Articles matching your selected filters.'
                        : 'Explore the latest posts from ValueDam.'}
                    </p>
                  </div>
                </div>

                {visiblePosts.length === 0 ? (
                  <div className="empty-state">
                    <h3>
                      No articles found
                    </h3>

                    <p>
                      Try a different search term or
                      remove your filters.
                    </p>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="blog-grid">
                      {visiblePosts.map(
                        renderPostCard
                      )}
                    </div>

                    {visibleCount <
                      normalPosts.length && (
                      <div className="load-more-wrap">
                        <button
                          type="button"
                          className="load-more"
                          onClick={loadMore}
                        >
                          Load More
                        </button>
                      </div>
                    )}

                    <div className="blog-count">
                      Showing{' '}
                      {Math.min(
                        visibleCount,
                        normalPosts.length
                      )}{' '}
                      of {normalPosts.length} articles
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}