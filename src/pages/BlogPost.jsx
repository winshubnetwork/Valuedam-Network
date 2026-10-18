import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';

export default function BlogPost() {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [previousPost, setPreviousPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentForm, setCommentForm] = useState({
    name: '',
    email: '',
    comment: '',
  });

  useEffect(() => {
    loadPost();
  }, [slug]);

  /*
   * SEO / PAGE HEAD
   */
  useEffect(() => {
    if (!post) return;

    const origin = window.location.origin;
    const defaultUrl =
      `${origin}/blog/${post.slug}`;

    const canonicalUrl =
      post.canonical_url ||
      defaultUrl;

    const title =
      post.seo_title ||
      post.title ||
      'ValueDam Blog';

    const description =
      post.meta_description ||
      post.excerpt ||
      '';

    const image =
      post.social_image ||
      post.featured_image ||
      '';

    document.title = title;

    setMetaTag(
      'name',
      'description',
      description
    );

    setMetaTag(
      'name',
      'keywords',
      post.focus_keyword || ''
    );

    setCanonical(canonicalUrl);

    setMetaTag(
      'property',
      'og:type',
      'article'
    );

    setMetaTag(
      'property',
      'og:title',
      title
    );

    setMetaTag(
      'property',
      'og:description',
      description
    );

    setMetaTag(
      'property',
      'og:url',
      canonicalUrl
    );

    if (image) {
      setMetaTag(
        'property',
        'og:image',
        image
      );
    }

    setMetaTag(
      'property',
      'og:site_name',
      'ValueDam Network'
    );

    setMetaTag(
      'name',
      'twitter:card',
      image
        ? 'summary_large_image'
        : 'summary'
    );

    setMetaTag(
      'name',
      'twitter:title',
      title
    );

    setMetaTag(
      'name',
      'twitter:description',
      description
    );

    if (image) {
      setMetaTag(
        'name',
        'twitter:image',
        image
      );
    }

    setMetaTag(
      'property',
      'article:published_time',
      post.published_at || ''
    );

    setMetaTag(
      'property',
      'article:modified_time',
      post.updated_at ||
        post.published_at ||
        ''
    );

    if (post.category) {
      setMetaTag(
        'property',
        'article:section',
        post.category
      );
    }

    /*
     * ARTICLE STRUCTURED DATA
     */
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description,
      url: canonicalUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      publisher: {
        '@type': 'Organization',
        name: 'ValueDam Network',
        url: origin
      }
    };

    if (image) {
      articleSchema.image = [
        image
      ];
    }

    if (post.published_at) {
      articleSchema.datePublished =
        post.published_at;
    }

    if (post.updated_at) {
      articleSchema.dateModified =
        post.updated_at;
    }

    if (post.author) {
      articleSchema.author = {
        '@type': 'Person',
        name: post.author
      };
    } else {
      articleSchema.author = {
        '@type': 'Organization',
        name: 'ValueDam Network'
      };
    }

    setStructuredData(
      'valuedam-blog-article-schema',
      articleSchema
    );

    /*
     * BREADCRUMB STRUCTURED DATA
     */
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: origin
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${origin}/blog`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: post.title,
          item: canonicalUrl
        }
      ]
    };

    setStructuredData(
      'valuedam-blog-breadcrumb-schema',
      breadcrumbSchema
    );

    return () => {
      removeMetaTag(
        'name',
        'description'
      );

      removeMetaTag(
        'name',
        'keywords'
      );

      removeMetaTag(
        'property',
        'og:type'
      );

      removeMetaTag(
        'property',
        'og:title'
      );

      removeMetaTag(
        'property',
        'og:description'
      );

      removeMetaTag(
        'property',
        'og:url'
      );

      removeMetaTag(
        'property',
        'og:image'
      );

      removeMetaTag(
        'property',
        'og:site_name'
      );

      removeMetaTag(
        'property',
        'article:published_time'
      );

      removeMetaTag(
        'property',
        'article:modified_time'
      );

      removeMetaTag(
        'property',
        'article:section'
      );

      removeMetaTag(
        'name',
        'twitter:card'
      );

      removeMetaTag(
        'name',
        'twitter:title'
      );

      removeMetaTag(
        'name',
        'twitter:description'
      );

      removeMetaTag(
        'name',
        'twitter:image'
      );

      removeStructuredData(
        'valuedam-blog-article-schema'
      );

      removeStructuredData(
        'valuedam-blog-breadcrumb-schema'
      );

      document.title =
        'ValueDam Network';
    };
  }, [post]);

  async function loadPost() {
    setLoading(true);
    setNotFound(false);
    setCopied(false);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error(
        'Error loading blog post:',
        error
      );

      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPost(data);

    incrementViews(data.id);

    await Promise.all([
      loadRelatedPosts(data),
      loadArticleNavigation(data),
      loadComments(data.id)
    ]);

    setLoading(false);
  }

  async function incrementViews(postId) {
    const { error } =
      await supabase.rpc(
        'increment_blog_post_views',
        {
          post_id: postId
        }
      );

    if (error) {
      console.error(
        'Error incrementing article views:',
        error
      );
      return;
    }

    setPost(currentPost => {
      if (!currentPost) {
        return currentPost;
      }

      return {
        ...currentPost,
        views:
          (currentPost.views || 0) + 1
      };
    });
  }

  async function loadRelatedPosts(
    currentPost
  ) {
    const { data, error } =
      await supabase
        .from('blog_posts')
        .select(
          'id, title, slug, excerpt, featured_image, image_alt, category, tags, published_at'
        )
        .eq('status', 'published')
        .neq('id', currentPost.id)
        .order('published_at', {
          ascending: false
        });

    if (error) {
      console.error(
        'Error loading related posts:',
        error
      );

      setRelatedPosts([]);
      return;
    }

    const posts = data || [];
    const currentTags =
      normalizeTags(
        currentPost.tags
      );

    const scoredPosts =
      posts.map(item => {
        const itemTags =
          normalizeTags(item.tags);

        const sameCategory =
          currentPost.category &&
          item.category &&
          currentPost.category
            .toLowerCase() ===
            item.category.toLowerCase();

        const sharedTags =
          itemTags.filter(tag =>
            currentTags.includes(tag)
          ).length;

        let score = 0;

        if (sameCategory) {
          score += 5;
        }

        score +=
          sharedTags * 2;

        return {
          ...item,
          relevanceScore: score
        };
      });

    scoredPosts.sort((a, b) => {
      if (
        b.relevanceScore !==
        a.relevanceScore
      ) {
        return (
          b.relevanceScore -
          a.relevanceScore
        );
      }

      return (
        new Date(
          b.published_at || 0
        ) -
        new Date(
          a.published_at || 0
        )
      );
    });

    setRelatedPosts(
      scoredPosts.slice(0, 3)
    );
  }

  async function loadArticleNavigation(
    currentPost
  ) {
    const currentDate =
      currentPost.published_at;

    if (!currentDate) {
      setPreviousPost(null);
      setNextPost(null);
      return;
    }

    const [
      previousResult,
      nextResult
    ] = await Promise.all([
      supabase
        .from('blog_posts')
        .select(
          'id, title, slug, featured_image'
        )
        .eq('status', 'published')
        .lt(
          'published_at',
          currentDate
        )
        .order('published_at', {
          ascending: false
        })
        .limit(1),

      supabase
        .from('blog_posts')
        .select(
          'id, title, slug, featured_image'
        )
        .eq('status', 'published')
        .gt(
          'published_at',
          currentDate
        )
        .order('published_at', {
          ascending: true
        })
        .limit(1)
    ]);

    if (previousResult.error) {
      console.error(
        'Error loading previous article:',
        previousResult.error
      );
    }

    if (nextResult.error) {
      console.error(
        'Error loading next article:',
        nextResult.error
      );
    }

    setPreviousPost(
      previousResult.data?.[0] ||
        null
    );

    setNextPost(
      nextResult.data?.[0] ||
        null
    );
  }

  async function loadComments(postId) {
    setCommentsLoading(true);

    const { data, error } = await supabase
      .from('blog_comments')
      .select('id, name, comment, created_at')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', {
        ascending: false
      });

    if (error) {
      console.error(
        'Error loading blog comments:',
        error
      );

      setComments([]);
    } else {
      setComments(data || []);
    }

    setCommentsLoading(false);
  }

  function updateCommentField(field, value) {
    setCommentForm(current => ({
      ...current,
      [field]: value
    }));
  }

  async function submitComment(event) {
    event.preventDefault();
    setCommentMessage('');
    setCommentError('');

    const name =
      commentForm.name.trim();

    const email =
      commentForm.email.trim();

    const comment =
      commentForm.comment.trim();

    if (!name || !comment) {
      setCommentError(
        'Please enter your name and comment.'
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setCommentError(
        'Please enter a valid email address.'
      );
      return;
    }

    if (comment.length < 3) {
      setCommentError(
        'Your comment is too short.'
      );
      return;
    }

    if (comment.length > 3000) {
      setCommentError(
        'Your comment is too long. Please keep it under 3,000 characters.'
      );
      return;
    }

    setCommentSubmitting(true);

    const { error } =
      await supabase
        .from('blog_comments')
        .insert({
          post_id: post.id,
          name,
          email: email || null,
          comment,
          status: 'pending'
        });

    if (error) {
      console.error(
        'Error submitting blog comment:',
        error
      );

      setCommentError(
        'We could not submit your comment right now. Please try again.'
      );

      setCommentSubmitting(false);
      return;
    }

    setCommentForm({
      name: '',
      email: '',
      comment: ''
    });

    setCommentMessage(
      'Thanks for commenting. Your comment has been submitted and is awaiting moderation.'
    );

    setCommentSubmitting(false);
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .map(tag =>
        String(tag)
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  function formatDate(date) {
    if (!date) return '';

    return new Date(
      date
    ).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  }

  function formatViews(views) {
    return Number(
      views || 0
    ).toLocaleString('en-US');
  }

  function getArticleUrl() {
    return window.location.href;
  }

  function getShareText() {
    return post?.excerpt
      ? `${post.title} — ${post.excerpt}`
      : post?.title || '';
  }

  function shareOnWhatsApp() {
    const url =
      getArticleUrl();

    const text =
      `${getShareText()}\n\nRead it here: ${url}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        text
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function shareOnFacebook() {
    const url =
      getArticleUrl();

    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function shareOnX() {
    const url =
      getArticleUrl();

    const text =
      post?.title || '';

    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(
        text
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function shareOnLinkedIn() {
    const url =
      getArticleUrl();

    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function copyArticleLink() {
    try {
      await navigator.clipboard.writeText(
        getArticleUrl()
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        'Could not copy article link:',
        error
      );
    }
  }

  async function shareArticle() {
    if (!navigator.share) {
      copyArticleLink();
      return;
    }

    try {
      await navigator.share({
        title:
          post?.title ||
          'ValueDam Blog',
        text: getShareText(),
        url: getArticleUrl()
      });
    } catch (error) {
      if (
        error?.name !==
        'AbortError'
      ) {
        console.error(
          'Native sharing failed:',
          error
        );
      }
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <p>
            Loading article...
          </p>
        </div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="section">
        <div className="container">
          <h1>
            Article not found
          </h1>

          <p>
            The article you're
            looking for does not
            exist or is no longer
            published.
          </p>

          <Link
            className="btn"
            to="/blog"
          >
            ← Back to Blog
          </Link>
        </div>
      </section>
    );
  }

  /*
   * SECURITY:
   * Blog content is stored as HTML in Supabase.
   * Sanitize it before rendering with
   * dangerouslySetInnerHTML.
   */
  const sanitizedContent =
    DOMPurify.sanitize(
      post.content || ''
    );

  return (
    <article>
      {/* ARTICLE HEADER */}
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            {post.category ||
              'VALUEDAM BLOG'}
          </span>

          <h1>{post.title}</h1>

          {post.excerpt && (
            <p>
              {post.excerpt}
            </p>
          )}

          <div className="article-meta">
            {post.author && (
              <span>
                By {post.author}
              </span>
            )}

            {post.author &&
              post.published_at && (
                <span>·</span>
              )}

            {post.published_at && (
              <span>
                {formatDate(
                  post.published_at
                )}
              </span>
            )}

            <span>·</span>

            <span>
              {formatViews(
                post.views
              )}{' '}
              views
            </span>
          </div>
        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="section">
        <div className="container">
          {post.featured_image && (
            <div className="blog-featured-image">
              <img
                src={
                  post.featured_image
                }
                alt={
                  post.image_alt ||
                  post.title
                }
              />
            </div>
          )}

          <div className="blog-content">
            <div
              dangerouslySetInnerHTML={{
                __html:
                  sanitizedContent
              }}
            />
          </div>

          {/* SOCIAL SHARING */}
          <div className="share-section">
            <div className="share-heading">
              <span className="eyebrow">
                SHARE THIS ARTICLE
              </span>

              <h2>
                Enjoyed this article?
              </h2>

              <p>
                Share it with someone
                who may find it useful.
              </p>
            </div>

            <div className="share-buttons">
              <button
                type="button"
                className="share-button whatsapp"
                onClick={
                  shareOnWhatsApp
                }
              >
                <span className="share-icon">
                  WA
                </span>
                WhatsApp
              </button>

              <button
                type="button"
                className="share-button facebook"
                onClick={
                  shareOnFacebook
                }
              >
                <span className="share-icon">
                  f
                </span>
                Facebook
              </button>

              <button
                type="button"
                className="share-button x"
                onClick={shareOnX}
              >
                <span className="share-icon">
                  𝕏
                </span>
                X
              </button>

              <button
                type="button"
                className="share-button linkedin"
                onClick={
                  shareOnLinkedIn
                }
              >
                <span className="share-icon">
                  in
                </span>
                LinkedIn
              </button>

              <button
                type="button"
                className="share-button copy"
                onClick={
                  copyArticleLink
                }
              >
                <span className="share-icon">
                  🔗
                </span>

                {copied
                  ? 'Copied!'
                  : 'Copy Link'}
              </button>

              {typeof navigator !==
                'undefined' &&
                typeof navigator.share ===
                  'function' && (
                  <button
                    type="button"
                    className="share-button native-share"
                    onClick={
                      shareArticle
                    }
                  >
                    <span className="share-icon">
                      ↗
                    </span>
                    Share
                  </button>
                )}
            </div>
          </div>

          {/* COMMENTS */}
          <section
            className="comments-section"
            aria-labelledby="comments-heading"
          >
            <div className="comments-heading">
              <span className="eyebrow">
                JOIN THE CONVERSATION
              </span>

              <h2 id="comments-heading">
                Comments
                {comments.length > 0
                  ? ` (${comments.length})`
                  : ''}
              </h2>

              <p>
                Share your thoughts, questions,
                or experience about this article.
              </p>
            </div>

            <div className="comments-layout">
              <div className="comments-list">
                {commentsLoading ? (
                  <p className="comments-empty">
                    Loading comments...
                  </p>
                ) : comments.length === 0 ? (
                  <div className="comments-empty">
                    <strong>
                      Be the first to comment.
                    </strong>

                    <span>
                      Your thoughts can start
                      the conversation.
                    </span>
                  </div>
                ) : (
                  comments.map(comment => (
                    <article
                      className="comment-card"
                      key={comment.id}
                    >
                      <div
                        className="comment-avatar"
                        aria-hidden="true"
                      >
                        {String(
                          comment.name || '?'
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="comment-body">
                        <div className="comment-topline">
                          <strong>
                            {comment.name}
                          </strong>

                          <time
                            dateTime={
                              comment.created_at
                            }
                          >
                            {formatDate(
                              comment.created_at
                            )}
                          </time>
                        </div>

                        <p>
                          {comment.comment}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="comment-form-card">
                <h3>
                  Leave a Comment
                </h3>

                <p className="comment-form-intro">
                  Your email will not be
                  displayed publicly.
                </p>

                <form
                  onSubmit={
                    submitComment
                  }
                >
                  <label>
                    Name *
                    <input
                      type="text"
                      value={
                        commentForm.name
                      }
                      onChange={event =>
                        updateCommentField(
                          'name',
                          event.target.value
                        )
                      }
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      value={
                        commentForm.email
                      }
                      onChange={event =>
                        updateCommentField(
                          'email',
                          event.target.value
                        )
                      }
                      maxLength={160}
                      autoComplete="email"
                    />
                  </label>

                  <label>
                    Comment *
                    <textarea
                      value={
                        commentForm.comment
                      }
                      onChange={event =>
                        updateCommentField(
                          'comment',
                          event.target.value
                        )
                      }
                      maxLength={3000}
                      rows={6}
                      required
                    />
                  </label>

                  {commentError && (
                    <div
                      className="comment-alert error"
                      role="alert"
                    >
                      {commentError}
                    </div>
                  )}

                  {commentMessage && (
                    <div
                      className="comment-alert success"
                      role="status"
                    >
                      {commentMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn"
                    disabled={
                      commentSubmitting
                    }
                  >
                    {commentSubmitting
                      ? 'Submitting...'
                      : 'Post Comment'}
                  </button>
                </form>

                <small className="comment-moderation-note">
                  Comments are moderated before
                  they appear publicly.
                </small>
              </div>
            </div>
          </section>

          {/* PREVIOUS / NEXT */}
          {(previousPost ||
            nextPost) && (
            <div className="article-navigation">
              <div className="article-nav-item previous">
                {previousPost ? (
                  <Link
                    to={`/blog/${previousPost.slug}`}
                  >
                    <span className="nav-label">
                      ← Previous Article
                    </span>

                    <strong>
                      {
                        previousPost.title
                      }
                    </strong>
                  </Link>
                ) : (
                  <span />
                )}
              </div>

              <div className="article-nav-item next">
                {nextPost ? (
                  <Link
                    to={`/blog/${nextPost.slug}`}
                  >
                    <span className="nav-label">
                      Next Article →
                    </span>

                    <strong>
                      {nextPost.title}
                    </strong>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            </div>
          )}

          {/* RELATED ARTICLES */}
          {relatedPosts.length >
            0 && (
            <section className="related-section">
              <div className="related-heading">
                <span className="eyebrow">
                  KEEP READING
                </span>

                <h2>
                  Related Articles
                </h2>

                <p>
                  More articles you may
                  find useful.
                </p>
              </div>

              <div className="related-grid">
                {relatedPosts.map(
                  related => (
                    <Link
                      className="related-card"
                      to={`/blog/${related.slug}`}
                      key={related.id}
                    >
                      {related.featured_image ? (
                        <img
                          src={
                            related.featured_image
                          }
                          alt={
                            related.image_alt ||
                            related.title
                          }
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="related-card-placeholder" />
                      )}

                      <div className="related-card-body">
                        <small>
                          {related.category ||
                            'General'}

                          {related.published_at
                            ? ` · ${formatDate(
                                related.published_at
                              )}`
                            : ''}
                        </small>

                        <h3>
                          {
                            related.title
                          }
                        </h3>

                        {related.excerpt && (
                          <p>
                            {
                              related.excerpt
                            }
                          </p>
                        )}

                        <span className="related-read">
                          Read article →
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

          {/* BACK TO BLOG */}
          <div className="blog-bottom">
            <Link
              className="btn secondary"
              to="/blog"
            >
              ← Back to Blog
            </Link>
          </div>
        </div>
      </section>

      <style>{`

        .blog-featured-image {
          max-width: 1000px;
          margin: 0 auto 40px;
        }

        .blog-featured-image img {
          width: 100%;
          max-height: 560px;
          object-fit: cover;
          border-radius: 18px;
          display: block;
        }

        .article-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 12px;
          font-size: 14px;
          opacity: 0.75;
        }

        .blog-content {
          max-width: 850px;
          margin: 0 auto;
          font-size: 17px;
          line-height: 1.8;
          color: #222;
        }

        .blog-content p {
          margin: 0 0 20px;
        }

        .blog-content h2 {
          font-size: 30px;
          line-height: 1.3;
          margin: 35px 0 15px;
        }

        .blog-content h3 {
          font-size: 24px;
          line-height: 1.4;
          margin: 30px 0 12px;
        }

        .blog-content ul,
        .blog-content ol {
          margin: 0 0 22px;
          padding-left: 30px;
        }

        .blog-content li {
          margin-bottom: 8px;
        }

        .blog-content blockquote {
          margin: 25px 0;
          padding: 18px 22px;
          border-left: 4px solid #111;
          background: #f5f6f8;
          border-radius: 0 8px 8px 0;
        }

        .blog-content a {
          text-decoration: underline;
        }

        .blog-content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 20px 0;
        }

        .share-section {
          max-width: 850px;
          margin: 55px auto 0;
          padding: 30px 0;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }

        .share-heading {
          margin-bottom: 20px;
        }

        .share-heading h2 {
          margin: 7px 0 6px;
          font-size: 26px;
        }

        .share-heading p {
          margin: 0;
          opacity: 0.7;
        }

        .share-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .share-button {
          border: 1px solid #ddd;
          background: #fff;
          color: #222;
          border-radius: 10px;
          padding: 10px 15px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .share-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 18px
            rgba(0, 0, 0, 0.08);
        }

        .share-icon {
          font-weight: 800;
          min-width: 18px;
          text-align: center;
        }

        .comments-section {
          max-width: 1100px;
          margin: 65px auto 0;
          padding-top: 40px;
          border-top: 1px solid #e5e7eb;
        }

        .comments-heading {
          max-width: 850px;
          margin: 0 auto 28px;
        }

        .comments-heading h2 {
          margin: 7px 0 8px;
          font-size: 32px;
        }

        .comments-heading p {
          margin: 0;
          opacity: 0.7;
        }

        .comments-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.15fr)
            minmax(320px, 0.85fr);
          gap: 30px;
          align-items: start;
        }

        .comments-list {
          min-width: 0;
        }

        .comments-empty {
          margin: 0;
          padding: 28px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .comment-card {
          display: flex;
          gap: 14px;
          padding: 20px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .comment-card:first-child {
          padding-top: 0;
        }

        .comment-avatar {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 50%;
          background: #111;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .comment-body {
          min-width: 0;
          flex: 1;
        }

        .comment-topline {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          margin-bottom: 7px;
        }

        .comment-topline time {
          font-size: 12px;
          opacity: 0.6;
        }

        .comment-body p {
          margin: 0;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .comment-form-card {
          padding: 25px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.05);
        }

        .comment-form-card h3 {
          margin: 0 0 7px;
          font-size: 24px;
        }

        .comment-form-intro {
          margin: 0 0 20px;
          font-size: 14px;
          opacity: 0.7;
        }

        .comment-form-card form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment-form-card label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
        }

        .comment-form-card input,
        .comment-form-card textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9dde3;
          border-radius: 10px;
          padding: 12px 13px;
          font: inherit;
          background: #fff;
          color: #222;
          outline: none;
          resize: vertical;
        }

        .comment-form-card input:focus,
        .comment-form-card textarea:focus {
          border-color: #111;
          box-shadow:
            0 0 0 3px
            rgba(17, 17, 17, 0.06);
        }

        .comment-form-card button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .comment-alert {
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1.5;
        }

        .comment-alert.error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
        }

        .comment-alert.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .comment-moderation-note {
          display: block;
          margin-top: 14px;
          font-size: 12px;
          line-height: 1.5;
          opacity: 0.6;
        }

        .article-navigation {
          max-width: 850px;
          margin: 55px auto 0;
          padding: 25px 0;
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }

        .article-nav-item {
          min-width: 0;
        }

        .article-nav-item.next {
          text-align: right;
        }

        .article-nav-item a {
          display: block;
          text-decoration: none;
          color: inherit;
        }

        .article-nav-item a:hover strong {
          text-decoration: underline;
        }

        .nav-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          opacity: 0.65;
        }

        .article-nav-item strong {
          display: block;
          font-size: 17px;
          line-height: 1.4;
        }

        .related-section {
          max-width: 1100px;
          margin: 70px auto 0;
        }

        .related-heading {
          margin-bottom: 25px;
        }

        .related-heading h2 {
          margin: 7px 0 8px;
          font-size: 32px;
        }

        .related-heading p {
          margin: 0;
          opacity: 0.7;
        }

        .related-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 22px;
        }

        .related-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          text-decoration: none;
          color: inherit;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .related-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 12px 30px
            rgba(0, 0, 0, 0.08);
        }

        .related-card img,
        .related-card-placeholder {
          width: 100%;
          height: 190px;
          object-fit: cover;
          display: block;
        }

        .related-card-placeholder {
          background: #f1f3f5;
        }

        .related-card-body {
          padding: 20px;
        }

        .related-card-body small {
          display: block;
          margin-bottom: 9px;
          opacity: 0.65;
          font-size: 13px;
        }

        .related-card-body h3 {
          margin: 0 0 10px;
          font-size: 20px;
          line-height: 1.35;
        }

        .related-card-body p {
          margin: 0 0 16px;
          line-height: 1.6;
          opacity: 0.75;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .related-read {
          font-weight: 700;
          font-size: 14px;
        }

        .blog-bottom {
          max-width: 850px;
          margin: 40px auto 0;
        }

        @media (max-width: 900px) {
          .comments-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .related-grid {
            grid-template-columns: 1fr;
          }

          .related-card img,
          .related-card-placeholder {
            height: 220px;
          }
        }

        @media (max-width: 600px) {
          .blog-content {
            font-size: 16px;
          }

          .blog-content h2 {
            font-size: 25px;
          }

          .blog-content h3 {
            font-size: 21px;
          }

          .blog-featured-image img {
            border-radius: 12px;
          }

          .share-section {
            margin-top: 40px;
          }

          .share-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .share-button {
            justify-content: center;
          }

          .article-navigation {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .article-nav-item.next {
            text-align: left;
          }

          .related-section {
            margin-top: 50px;
          }

          .related-heading h2 {
            font-size: 27px;
          }
        }
      `}</style>
    </article>
  );
}

/*
 * -------------------------------------------------------
 * SEO HELPERS
 * -------------------------------------------------------
 */

function setMetaTag(
  attribute,
  key,
  content
) {
  if (!content) {
    removeMetaTag(attribute, key);
    return;
  }

  let element =
    document.head.querySelector(
      `meta[${attribute}="${key}"]`
    );

  if (!element) {
    element =
      document.createElement('meta');

    element.setAttribute(
      attribute,
      key
    );

    document.head.appendChild(
      element
    );
  }

  element.setAttribute(
    'content',
    content
  );
}

function removeMetaTag(
  attribute,
  key
) {
  const element =
    document.head.querySelector(
      `meta[${attribute}="${key}"]`
    );

  if (element) {
    element.remove();
  }
}

function setCanonical(url) {
  let element =
    document.head.querySelector(
      'link[rel="canonical"]'
    );

  if (!element) {
    element =
      document.createElement('link');

    element.setAttribute(
      'rel',
      'canonical'
    );

    document.head.appendChild(
      element
    );
  }

  element.setAttribute(
    'href',
    url
  );
}

function setStructuredData(
  id,
  data
) {
  let element =
    document.head.querySelector(
      `script[data-seo-id="${id}"]`
    );

  if (!element) {
    element =
      document.createElement(
        'script'
      );

    element.type =
      'application/ld+json';

    element.setAttribute(
      'data-seo-id',
      id
    );

    document.head.appendChild(
      element
    );
  }

  element.textContent =
    JSON.stringify(data);
}

function removeStructuredData(
  id
) {
  const element =
    document.head.querySelector(
      `script[data-seo-id="${id}"]`
    );

  if (element) {
    element.remove();
  }
}