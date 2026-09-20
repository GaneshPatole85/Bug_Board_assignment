import React, { useState } from 'react';
import { Button } from './ui/Button.jsx';
import './CommentForm.css';

const MAX_COMMENT_LENGTH = 2000;

export const CommentForm = ({ onSubmit, isLoading = false, placeholder = 'Add to the discussion... (Ctrl+Enter to post)' }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const trimmed = content.trim();
  const charCount = content.length;
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;
  const canSubmit = trimmed.length > 0 && !isOverLimit && !isLoading;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    setError('');
    try {
      await onSubmit(trimmed);
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to post comment. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) {
        handleSubmit();
      }
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit} id="new-comment-form">
      {error && (
        <div className="comment-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="comment-input-wrap">
        <textarea
          id="new-comment-textarea"
          className={`comment-textarea ${isOverLimit ? 'has-error' : ''}`}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          maxLength={MAX_COMMENT_LENGTH + 50} // slight buffer to show overlimit counter
        />

        <div className="comment-form-footer">
          <div className="comment-hints">
            <span className={`char-counter ${charCount > 1800 ? 'counter-warning' : ''} ${isOverLimit ? 'counter-danger' : ''}`}>
              {charCount} / {MAX_COMMENT_LENGTH}
            </span>
            <span className="shortcut-hint">Ctrl+Enter to submit</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            id="post-comment-button"
            isLoading={isLoading}
            disabled={!canSubmit}
          >
            Post Comment
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
