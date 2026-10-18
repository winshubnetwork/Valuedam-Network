import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function BlogComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComment, setSelectedComment] = useState(null);
  const [error, setError] = useState('');

  async function loadComments() {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('blog_comments')
      .select(`
        id,
        post_id,
        name,
        email,
        comment,
        status,
        created_at,
        updated_at,
        blog_posts (
          id,
          title,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (loadError) {
      console.error('Blog comments load error:', loadError);
      setError(loadError.message || 'Unable to load comments.');
      setComments([]);
    } else {
      setComments(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, []);

  async function updateStatus(id, status) {
    setActionId(id);
    setError('');

    const { error: updateError } = await supabase
      .from('blog_comments')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      console.error('Comment status update error:', updateError);
      setError(updateError.message || 'Unable to update comment.');
    } else {
      setComments((current) =>
        current.map((comment) =>
          comment.id === id
            ? { ...comment, status }
            : comment
        )
      );

      setSelectedComment((current) =>
        current?.id === id
          ? { ...current, status }
          : current
      );
    }

    setActionId(null);
  }

  async function deleteComment(id) {
    const confirmed = window.confirm(
      'Delete this comment permanently? This action cannot be undone.'
    );

    if (!confirmed) return;

    setActionId(id);
    setError('');

    const { error: deleteError } = await supabase
      .from('blog_comments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Comment delete error:', deleteError);
      setError(deleteError.message || 'Unable to delete comment.');
    } else {
      setComments((current) =>
        current.filter((comment) => comment.id !== id)
      );

      if (selectedComment?.id === id) {
        setSelectedComment(null);
      }
    }

    setActionId(null);
  }

  const stats = useMemo(() => {
    return {
      total: comments.length,
      pending: comments.filter((item) => item.status === 'pending').length,
      approved: comments.filter((item) => item.status === 'approved').length,
      rejected: comments.filter((item) => item.status === 'rejected').length,
    };
  }, [comments]);

  const filteredComments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return comments.filter((item) => {
      const postTitle = item.blog_posts?.title || '';

      const matchesSearch =
        !term ||
        item.name?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term) ||
        item.comment?.toLowerCase().includes(term) ||
        postTitle.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [comments, search, statusFilter]);

  function formatDate(date) {
    if (!date) return '—';

    return new Date(date).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function statusLabel(status) {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }

  function statusClass(status) {
    if (status === 'approved') return 'comment-status approved';
    if (status === 'rejected') return 'comment-status rejected';
    return 'comment-status pending';
  }

  return (
    <section className="admin-page blog-comments-admin">

      <style>{`
        .blog-comments-admin {
          width: 100%;
        }

        .comments-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .comments-page-header h2 {
          margin: 4px 0 8px;
          font-size: 28px;
          line-height: 1.2;
        }

        .comments-page-header p {
          margin: 0;
          color: #64748b;
          max-width: 700px;
        }

        .comments-refresh {
          border: 1px solid #dbe3ee;
          background: #fff;
          color: #334155;
          border-radius: 10px;
          padding: 10px 15px;
          cursor: pointer;
          font-weight: 600;
        }

        .comments-refresh:hover {
          background: #f8fafc;
        }

        .comment-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .comment-stat {
          background: #fff;
          border: 1px solid #e5eaf1;
          border-radius: 14px;
          padding: 18px;
        }

        .comment-stat-label {
          color: #64748b;
          font-size: 13px;
          margin-bottom: 7px;
        }

        .comment-stat-value {
          font-size: 27px;
          font-weight: 750;
          color: #0f172a;
        }

        .comments-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .comments-search {
          flex: 1;
          min-width: 240px;
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          padding: 12px 14px;
          outline: none;
          background: #fff;
          color: #0f172a;
        }

        .comments-search:focus {
          border-color: #94a3b8;
        }

        .comments-filter {
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          padding: 12px 14px;
          background: #fff;
          color: #334155;
          min-width: 150px;
        }

        .comments-count {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .comments-list {
          display: grid;
          gap: 14px;
        }

        .comment-admin-card {
          background: #fff;
          border: 1px solid #e5eaf1;
          border-radius: 15px;
          padding: 18px;
        }

        .comment-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .comment-author {
          display: flex;
          gap: 12px;
          min-width: 0;
        }

        .comment-avatar {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          color: #334155;
          font-weight: 800;
        }

        .comment-author-name {
          font-weight: 700;
          color: #0f172a;
        }

        .comment-author-email {
          color: #64748b;
          font-size: 13px;
          margin-top: 3px;
          word-break: break-word;
        }

        .comment-status {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .comment-status.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .comment-status.approved {
          background: #ecfdf5;
          color: #047857;
        }

        .comment-status.rejected {
          background: #fef2f2;
          color: #b91c1c;
        }

        .comment-article {
          margin: 14px 0 10px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #f8fafc;
          color: #475569;
          font-size: 13px;
        }

        .comment-article strong {
          color: #0f172a;
        }

        .comment-text {
          color: #334155;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .comment-meta {
          margin-top: 13px;
          color: #94a3b8;
          font-size: 12px;
        }

        .comment-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #eef2f7;
        }

        .comment-action {
          border: 1px solid #dbe3ee;
          background: #fff;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
        }

        .comment-action:hover {
          background: #f8fafc;
        }

        .comment-action.approve {
          color: #047857;
          border-color: #bbf7d0;
        }

        .comment-action.reject {
          color: #b45309;
          border-color: #fed7aa;
        }

        .comment-action.delete {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .comment-action.view {
          color: #334155;
        }

        .comment-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .comments-empty {
          background: #fff;
          border: 1px dashed #dbe3ee;
          border-radius: 15px;
          padding: 50px 20px;
          text-align: center;
          color: #64748b;
        }

        .comments-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 18px;
        }

        .comment-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .48);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .comment-modal {
          width: min(620px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, .2);
        }

        .comment-modal-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .comment-modal-header h3 {
          margin: 0 0 5px;
        }

        .comment-close {
          border: 0;
          background: #f1f5f9;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }

        .comment-modal-field {
          margin-bottom: 18px;
        }

        .comment-modal-field label {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 6px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .comment-modal-value {
          color: #334155;
          line-height: 1.7;
          word-break: break-word;
          white-space: pre-wrap;
        }

        @media (max-width: 800px) {
          .comment-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .comments-page-header {
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .comment-stats {
            grid-template-columns: 1fr;
          }

          .comment-card-top {
            flex-direction: column;
          }

          .comments-search {
            min-width: 100%;
          }
        }
      `}</style>

      <div className="comments-page-header">
        <div>
          <span className="eyebrow">BLOG MANAGEMENT</span>
          <h2>Blog Comments</h2>
          <p>
            Review, moderate and manage comments submitted by visitors on your
            published blog articles.
          </p>
        </div>

        <button
          className="comments-refresh"
          onClick={loadComments}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="comments-error">
          {error}
        </div>
      )}

      <div className="comment-stats">
        <div className="comment-stat">
          <div className="comment-stat-label">Total Comments</div>
          <div className="comment-stat-value">{stats.total}</div>
        </div>

        <div className="comment-stat">
          <div className="comment-stat-label">Pending</div>
          <div className="comment-stat-value">{stats.pending}</div>
        </div>

        <div className="comment-stat">
          <div className="comment-stat-label">Approved</div>
          <div className="comment-stat-value">{stats.approved}</div>
        </div>

        <div className="comment-stat">
          <div className="comment-stat-label">Rejected</div>
          <div className="comment-stat-value">{stats.rejected}</div>
        </div>
      </div>

      <div className="comments-toolbar">
        <input
          className="comments-search"
          type="search"
          placeholder="Search commenter, email, article or comment…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="comments-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="comments-count">
        Showing {filteredComments.length} of {comments.length} comments
      </div>

      {loading ? (
        <div className="comments-empty">
          Loading comments…
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="comments-empty">
          <strong>No comments found.</strong>
          <div style={{ marginTop: 7 }}>
            Try another search or status filter.
          </div>
        </div>
      ) : (
        <div className="comments-list">
          {filteredComments.map((item) => {
            const initials =
              item.name
                ?.trim()
                ?.split(/\s+/)
                ?.slice(0, 2)
                ?.map((part) => part.charAt(0).toUpperCase())
                ?.join('') || '?';

            const articleTitle =
              item.blog_posts?.title || 'Unknown blog article';

            const articleSlug =
              item.blog_posts?.slug || '';

            const isBusy = actionId === item.id;

            return (
              <article
                className="comment-admin-card"
                key={item.id}
              >
                <div className="comment-card-top">
                  <div className="comment-author">
                    <div className="comment-avatar">
                      {initials}
                    </div>

                    <div>
                      <div className="comment-author-name">
                        {item.name}
                      </div>

                      {item.email && (
                        <div className="comment-author-email">
                          {item.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={statusClass(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                <div className="comment-article">
                  <strong>Article:</strong>{' '}
                  {articleTitle}
                </div>

                <div className="comment-text">
                  {item.comment}
                </div>

                <div className="comment-meta">
                  Submitted {formatDate(item.created_at)}
                </div>

                <div className="comment-actions">
                  <button
                    className="comment-action view"
                    onClick={() => setSelectedComment(item)}
                  >
                    View
                  </button>

                  {item.status !== 'approved' && (
                    <button
                      className="comment-action approve"
                      disabled={isBusy}
                      onClick={() =>
                        updateStatus(item.id, 'approved')
                      }
                    >
                      {isBusy ? 'Working…' : 'Approve'}
                    </button>
                  )}

                  {item.status !== 'rejected' && (
                    <button
                      className="comment-action reject"
                      disabled={isBusy}
                      onClick={() =>
                        updateStatus(item.id, 'rejected')
                      }
                    >
                      {isBusy ? 'Working…' : 'Reject'}
                    </button>
                  )}

                  {articleSlug && (
                    <button
                      className="comment-action view"
                      onClick={() =>
                        window.open(
                          `/blog/${articleSlug}`,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                    >
                      View Article ↗
                    </button>
                  )}

                  <button
                    className="comment-action delete"
                    disabled={isBusy}
                    onClick={() => deleteComment(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedComment && (
        <div
          className="comment-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedComment(null);
            }
          }}
        >
          <div className="comment-modal">
            <div className="comment-modal-header">
              <div>
                <h3>Comment Details</h3>
                <span className={statusClass(selectedComment.status)}>
                  {statusLabel(selectedComment.status)}
                </span>
              </div>

              <button
                className="comment-close"
                onClick={() => setSelectedComment(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="comment-modal-field">
              <label>Commenter</label>
              <div className="comment-modal-value">
                {selectedComment.name}
              </div>
            </div>

            {selectedComment.email && (
              <div className="comment-modal-field">
                <label>Email</label>
                <div className="comment-modal-value">
                  {selectedComment.email}
                </div>
              </div>
            )}

            <div className="comment-modal-field">
              <label>Article</label>
              <div className="comment-modal-value">
                {selectedComment.blog_posts?.title ||
                  'Unknown article'}
              </div>
            </div>

            <div className="comment-modal-field">
              <label>Comment</label>
              <div className="comment-modal-value">
                {selectedComment.comment}
              </div>
            </div>

            <div className="comment-modal-field">
              <label>Submitted</label>
              <div className="comment-modal-value">
                {formatDate(selectedComment.created_at)}
              </div>
            </div>

            <div className="comment-actions">
              {selectedComment.status !== 'approved' && (
                <button
                  className="comment-action approve"
                  disabled={actionId === selectedComment.id}
                  onClick={() =>
                    updateStatus(
                      selectedComment.id,
                      'approved'
                    )
                  }
                >
                  Approve
                </button>
              )}

              {selectedComment.status !== 'rejected' && (
                <button
                  className="comment-action reject"
                  disabled={actionId === selectedComment.id}
                  onClick={() =>
                    updateStatus(
                      selectedComment.id,
                      'rejected'
                    )
                  }
                >
                  Reject
                </button>
              )}

              <button
                className="comment-action delete"
                disabled={actionId === selectedComment.id}
                onClick={() =>
                  deleteComment(selectedComment.id)
                }
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}