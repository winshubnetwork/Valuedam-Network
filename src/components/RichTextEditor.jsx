import React, { useEffect, useRef, useState } from 'react';

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  const [showTextColors, setShowTextColors] = useState(false);
  const [showHighlightColors, setShowHighlightColors] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  function handleChange() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  function saveSelection() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      savedRangeRef.current = range;
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();

    if (!selection || !savedRangeRef.current) return;

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function runCommand(command, commandValue = null) {
    editorRef.current?.focus();

    document.execCommand(command, false, commandValue);

    handleChange();
  }

  function createLink() {
    saveSelection();

    const url = window.prompt('Enter the URL:');

    if (!url) return;

    editorRef.current?.focus();
    restoreSelection();

    document.execCommand('createLink', false, url);

    handleChange();
  }

  function insertImage() {
    saveSelection();

    const url = window.prompt('Enter the image URL:');

    if (!url) return;

    const alt = window.prompt(
      'Enter image alt text:',
      'Article image'
    );

    editorRef.current?.focus();
    restoreSelection();

    const safeAlt = (alt || 'Article image')
      .replace(/"/g, '&quot;');

    const safeUrl = url
      .replace(/"/g, '&quot;');

    document.execCommand(
      'insertHTML',
      false,
      `<img src="${safeUrl}" alt="${safeAlt}" />`
    );

    handleChange();
  }

  function applyTextColor(color) {
    editorRef.current?.focus();
    restoreSelection();

    document.execCommand('foreColor', false, color);

    handleChange();

    setShowTextColors(false);
  }

  function applyHighlightColor(color) {
    editorRef.current?.focus();
    restoreSelection();

    document.execCommand('hiliteColor', false, color);

    handleChange();

    setShowHighlightColors(false);
  }

  function formatBlock(tag) {
    editorRef.current?.focus();

    document.execCommand('formatBlock', false, tag);

    handleChange();
  }

  const textColors = [
    '#000000',
    '#374151',
    '#6B7280',
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#16A34A',
    '#0EA5E9',
    '#2563EB',
    '#7C3AED',
    '#DB2777',
    '#92400E'
  ];

  const highlightColors = [
    '#FEF08A',
    '#FDE68A',
    '#FED7AA',
    '#FECACA',
    '#BBF7D0',
    '#BAE6FD',
    '#BFDBFE',
    '#DDD6FE',
    '#FBCFE8',
    '#E5E7EB',
    '#FFFFFF'
  ];

  return (
    <div className="rich-editor">

      <div className="rich-toolbar">

        <button
          type="button"
          onClick={() => formatBlock('p')}
          title="Paragraph"
        >
          P
        </button>

        <button
          type="button"
          onClick={() => formatBlock('h2')}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => formatBlock('h3')}
          title="Heading 3"
        >
          H3
        </button>

        <button
          type="button"
          onClick={() => runCommand('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </button>

        <button
          type="button"
          onClick={() => runCommand('italic')}
          title="Italic"
        >
          <em>I</em>
        </button>

        <button
          type="button"
          onClick={() => runCommand('underline')}
          title="Underline"
        >
          <u>U</u>
        </button>

        <button
          type="button"
          onClick={() => runCommand('insertUnorderedList')}
          title="Bullet list"
        >
          • List
        </button>

        <button
          type="button"
          onClick={() => runCommand('insertOrderedList')}
          title="Numbered list"
        >
          1. List
        </button>

        <button
          type="button"
          onClick={createLink}
          title="Insert link"
        >
          🔗
        </button>

        <button
          type="button"
          onClick={insertImage}
          title="Insert image by URL"
        >
          🖼 Image
        </button>

        <div className="color-tool">

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              setShowTextColors(!showTextColors);
              setShowHighlightColors(false);
            }}
            title="Text color"
          >
            <span className="color-icon">A</span>
            <span className="color-bar text-color-bar"></span>
          </button>

          {showTextColors && (
            <div className="color-palette">

              <div className="palette-title">
                Text Color
              </div>

              <div className="color-grid">

                {textColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="color-option"
                    title={color}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyTextColor(color);
                    }}
                    style={{
                      backgroundColor: color
                    }}
                  />
                ))}

              </div>

            </div>
          )}

        </div>

        <div className="color-tool">

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              setShowHighlightColors(!showHighlightColors);
              setShowTextColors(false);
            }}
            title="Highlight color"
          >
            🖍
          </button>

          {showHighlightColors && (
            <div className="color-palette">

              <div className="palette-title">
                Highlight
              </div>

              <div className="color-grid">

                {highlightColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="color-option"
                    title={color}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlightColor(color);
                    }}
                    style={{
                      backgroundColor: color
                    }}
                  />

                ))}

              </div>

            </div>
          )}

        </div>

        <button
          type="button"
          onClick={() => runCommand('formatBlock', 'blockquote')}
          title="Quote"
        >
          ❝
        </button>

        <button
          type="button"
          onClick={() => runCommand('justifyLeft')}
          title="Align left"
        >
          ⬅
        </button>

        <button
          type="button"
          onClick={() => runCommand('justifyCenter')}
          title="Align center"
        >
          ↔
        </button>

        <button
          type="button"
          onClick={() => runCommand('justifyRight')}
          title="Align right"
        >
          ➡
        </button>

        <button
          type="button"
          onClick={() => runCommand('removeFormat')}
          title="Remove formatting"
        >
          Clear
        </button>

      </div>

      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onBlur={handleChange}
        data-placeholder="Write your article here..."
      />

      <style>{`

        .rich-editor {
          border: 1px solid #d9dee7;
          border-radius: 12px;
          background: #fff;
          overflow: visible;
        }

        .rich-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px;
          border-bottom: 1px solid #d9dee7;
          background: #f7f8fa;
          border-radius: 12px 12px 0 0;
        }

        .rich-toolbar button {
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 6px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 13px;
        }

        .rich-toolbar button:hover {
          background: #eef1f5;
        }

        .color-tool {
          position: relative;
        }

        .color-tool > button {
          min-width: 42px;
        }

        .color-icon {
          font-weight: 700;
          font-size: 15px;
        }

        .color-bar {
          display: block;
          height: 3px;
          width: 18px;
          margin: 2px auto 0;
          border-radius: 2px;
        }

        .text-color-bar {
          background: #2563eb;
        }

        .color-palette {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          z-index: 100;
          width: 190px;
          padding: 10px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .palette-title {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
        }

        .color-option {
          width: 22px;
          height: 22px;
          min-width: 22px;
          padding: 0 !important;
          border: 1px solid #d1d5db !important;
          border-radius: 5px !important;
        }

        .color-option:hover {
          transform: scale(1.12);
          border-color: #111827 !important;
        }

        .rich-editor-content {
          min-height: 350px;
          padding: 18px;
          outline: none;
          line-height: 1.75;
          font-size: 16px;
          border-radius: 0 0 12px 12px;
        }

        .rich-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        .rich-editor-content h2 {
          font-size: 28px;
          margin: 24px 0 12px;
        }

        .rich-editor-content h3 {
          font-size: 22px;
          margin: 20px 0 10px;
        }

        .rich-editor-content p {
          margin: 0 0 16px;
        }

        .rich-editor-content ul,
        .rich-editor-content ol {
          margin: 0 0 18px;
          padding-left: 30px;
        }

        .rich-editor-content li {
          margin-bottom: 8px;
        }

        .rich-editor-content blockquote {
          margin: 20px 0;
          padding: 14px 18px;
          border-left: 4px solid #111827;
          background: #f5f6f8;
        }

        .rich-editor-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 20px 0;
          border-radius: 10px;
        }

        .rich-editor-content a {
          text-decoration: underline;
        }

        @media (max-width: 600px) {

          .rich-toolbar {
            gap: 5px;
            padding: 8px;
          }

          .rich-toolbar button {
            padding: 6px 8px;
            font-size: 12px;
          }

          .color-palette {
            left: auto;
            right: 0;
          }

        }

      `}</style>

    </div>
  );
}