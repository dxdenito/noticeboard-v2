import nh3

ALLOWED_TAGS = {
    "p", "br", "hr", "strong", "b", "em", "i", "s", "code", "pre",
    "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a",
}
ALLOWED_ATTRIBUTES = {"a": {"href", "title", "target"}}
ALLOWED_URL_SCHEMES = {"http", "https", "mailto", "tel"}


def sanitize_html(value: str) -> str:
    return nh3.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
        link_rel="noopener noreferrer nofollow",
    )