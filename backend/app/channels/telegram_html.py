"""Markdown → Telegram HTML conversion.

Telegram's HTML mode (``ParseMode.HTML``) supports a small subset of tags.
AI responses arrive as CommonMark Markdown. This module converts between them
so Telegram renders formatting instead of showing raw ``**`` and ``##`` markup.

Supported Telegram HTML tags (Bot API 7.3+):
  ``<b>``, ``<strong>``          bold
  ``<i>``, ``<em>``              italic
  ``<u>``                        underline
  ``<s>``, ``<del>``, ``<strike>`` strikethrough
  ``<code>``                     inline monospace
  ``<pre>``                      block monospace
  ``<a href="…">``               hyperlinks
  ``<blockquote>``               quote blocks

Unsupported structural tags are stripped; their *content* is preserved.
Block-level tags (``<p>``, ``<li>``, headings) are normalised to equivalent
Telegram markup (double newline, bullet prefix, bold, respectively).
"""

from __future__ import annotations

import html as _html
from html.parser import HTMLParser

from markdown_it import MarkdownIt

_md = MarkdownIt()

_INLINE_TAG_MAP: dict[str, str] = {
    "b": "b",
    "strong": "b",
    "i": "i",
    "em": "i",
    "u": "u",
    "s": "s",
    "del": "s",
    "strike": "s",
}

_HEADING_TAGS = frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})
_BLOCK_PASSTHROUGH = frozenset({"p", "ul", "ol"})
_PASSTHROUGH_SKIP = frozenset({"html", "body", "head"})


class _TelegramRenderer(HTMLParser):
    """Walk standard HTML from markdown-it-py and emit Telegram-safe HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._buf: list[str] = []
        self._in_pre = False
        self._skip_stack: list[str] = []

    # ------------------------------------------------------------------
    # HTMLParser overrides
    # ------------------------------------------------------------------

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _PASSTHROUGH_SKIP:
            return
        if self._skip_stack:
            self._skip_stack.append(tag)
            return
        self._dispatch_start(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        if tag in _PASSTHROUGH_SKIP:
            return
        if self._skip_stack:
            if self._skip_stack[-1] == tag:
                self._skip_stack.pop()
            return
        self._dispatch_end(tag)

    def handle_data(self, data: str) -> None:
        if not self._skip_stack:
            self._buf.append(_html.escape(data))

    def result(self) -> str:
        """Return the accumulated Telegram-safe HTML string."""
        return "".join(self._buf).strip()

    # ------------------------------------------------------------------
    # Dispatch helpers (keep individual methods under complexity limit)
    # ------------------------------------------------------------------

    def _dispatch_start(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        # `match` keeps the dispatch flat (depth-1 in the AST nesting lint)
        # while preserving the readable "tag → markup" table shape that an
        # if/elif chain expressed. Order of cases mirrors the original.
        match tag:
            case t if t in _INLINE_TAG_MAP:
                self._buf.append(f"<{_INLINE_TAG_MAP[t]}>")
            case t if t in _HEADING_TAGS:
                self._buf.append("<b>")
            case t if t in _BLOCK_PASSTHROUGH:
                pass
            case "li":
                self._buf.append("\n• ")
            case "hr" | "br":
                self._buf.append("\n")
            case "a":
                href = _html.escape(dict(attrs).get("href", "") or "")
                self._buf.append(f'<a href="{href}">')
            case "blockquote":
                self._buf.append("<blockquote>")
            case "pre":
                self._buf.append("<pre>")
                self._in_pre = True
            case "code":
                self._start_code(attrs)
            case _:
                self._skip_stack.append(tag)

    def _start_code(self, attrs: list[tuple[str, str | None]]) -> None:
        if not self._in_pre:
            self._buf.append("<code>")
            return
        lang = dict(attrs).get("class", "") or ""
        tag_text = f'<code class="{_html.escape(lang)}">' if lang else "<code>"
        self._buf.append(tag_text)

    def _dispatch_end(self, tag: str) -> None:
        # See ``_dispatch_start`` — same shape, same reason for ``match``.
        match tag:
            case t if t in _HEADING_TAGS:
                self._buf.append("</b>\n\n")
            case "ul" | "ol":
                self._buf.append("\n")
            case "p":
                self._buf.append("\n\n")
            case "li":
                pass
            case "a":
                self._buf.append("</a>")
            case "blockquote":
                self._buf.append("</blockquote>")
            case "pre":
                self._buf.append("</pre>\n")
                self._in_pre = False
            case "code":
                self._buf.append("</code>")
            case t if t in _INLINE_TAG_MAP:
                self._buf.append(f"</{_INLINE_TAG_MAP[t]}>")


def md_to_telegram_html(text: str) -> str:
    """Convert CommonMark Markdown to Telegram HTML (``ParseMode.HTML``).

    Args:
        text: AI-generated Markdown string (may be complete or mid-stream).

    Returns:
        HTML string safe to pass to Telegram with ``ParseMode.HTML``.
        Falls back to the original *text* if conversion yields nothing.
    """
    raw_html = _md.render(text)
    renderer = _TelegramRenderer()
    renderer.feed(raw_html)
    converted = renderer.result()
    return converted if converted else text
