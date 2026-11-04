import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "hr", "strong", "b", "em", "i", "s", "code", "pre",
  "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel"];

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
});

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html || "", { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  return doc.body.textContent || "";
}

export function isHtmlEmpty(html) {
  return !htmlToText(html).trim();
}