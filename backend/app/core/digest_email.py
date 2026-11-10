import html as html_lib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import nh3

EAT = timezone(timedelta(hours=3))
GREEN = "#1B5E20"
RED = "#B71C1C"


@dataclass
class DigestNotice:
    id: int
    title: str
    excerpt: str
    category: str | None
    org_unit: str | None
    published_at: datetime
    pinned: bool


@dataclass
class DigestEvent:
    id: int
    title: str
    start_date: datetime
    location: str | None
    org_unit: str | None


@dataclass
class DigestMessage:
    subject: str
    text: str
    html: str


def plain_text(value: str | None) -> str:
    cleaned = nh3.clean(value or "", tags=set())
    return " ".join(html_lib.unescape(cleaned).split())


def make_excerpt(value: str | None, length: int) -> str:
    text = plain_text(value)
    if len(text) <= length:
        return text
    cut = text[:length].rsplit(" ", 1)[0].rstrip(",.;:-– ")
    return f"{cut}…"


def _local(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(EAT)


def _fmt_date(value: datetime) -> str:
    return _local(value).strftime("%a %d %b %Y")


def _fmt_datetime(value: datetime) -> str:
    return _local(value).strftime("%a %d %b, %H:%M")


def _notice_html(site: str, notice: DigestNotice, accent: str) -> str:
    esc = html_lib.escape
    link = esc(f"{site}/notices/{notice.id}", quote=True)
    meta = " · ".join(
        part for part in (notice.category, notice.org_unit, _fmt_date(notice.published_at)) if part
    )
    excerpt = ""
    if notice.excerpt:
        excerpt = (
            '<p style="margin:6px 0 0;font-size:14px;line-height:21px;color:#444444;">'
            f"{esc(notice.excerpt)}</p>"
        )
    return (
        '<tr><td style="padding:16px 0;border-top:1px solid #e6ebe6;">'
        f'<a href="{link}" style="font-size:16px;font-weight:bold;color:{accent};text-decoration:none;">'
        f"{esc(notice.title)}</a>"
        f'<div style="font-size:12px;color:#777777;margin-top:4px;">{esc(meta)}</div>'
        f"{excerpt}"
        f'<div style="margin-top:8px;"><a href="{link}" style="font-size:13px;font-weight:bold;'
        f'color:{accent};text-decoration:none;">Read more &rarr;</a></div>'
        "</td></tr>"
    )


def _event_html(site: str, event: DigestEvent) -> str:
    esc = html_lib.escape
    link = esc(f"{site}/events/{event.id}", quote=True)
    meta_parts = [_fmt_datetime(event.start_date)]
    if event.location:
        meta_parts.append(event.location)
    if event.org_unit:
        meta_parts.append(event.org_unit)
    return (
        '<tr><td style="padding:10px 0;border-top:1px solid #e6ebe6;">'
        f'<a href="{link}" style="font-size:15px;font-weight:bold;color:#1a1a1a;text-decoration:none;">'
        f"{esc(event.title)}</a>"
        f'<div style="font-size:12px;color:#777777;margin-top:3px;">{esc(" · ".join(meta_parts))}</div>'
        "</td></tr>"
    )


def build_message(
    subject: str,
    intro: str,
    notices: list[DigestNotice],
    hidden_count: int,
    events: list[DigestEvent],
    site_url: str,
    list_label: str,
    urgent: bool = False,
) -> DigestMessage:
    site = site_url.rstrip("/")
    esc = html_lib.escape
    accent = RED if urgent else GREEN
    if urgent:
        heading = "Important notices" if len(notices) > 1 else "Important notice"
    else:
        heading = "Notices you may have missed"

    notice_rows = "".join(_notice_html(site, notice, accent) for notice in notices)

    more_html = ""
    if hidden_count > 0:
        plural = "s" if hidden_count != 1 else ""
        more_html = (
            '<tr><td style="padding:14px 0 0;border-top:1px solid #e6ebe6;font-size:14px;color:#555555;">'
            f"…and {hidden_count} more notice{plural} on the Noticeboard.</td></tr>"
        )

    events_html = ""
    if events:
        event_rows = "".join(_event_html(site, event) for event in events)
        events_html = (
            '<h2 style="margin:28px 0 4px;font-size:15px;color:#1a1a1a;">Coming up this week</h2>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{event_rows}</table>'
        )

    intro_html = esc(intro).replace("\n", "<br>")
    site_link = esc(site, quote=True)
    footer_text = f"You are receiving this because you are on the JKUAT {list_label} mailing list."

    html_body = (
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" '
        'content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;padding:0;background:#f3f6f3;font-family:Arial,Helvetica,sans-serif;color:#222222;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#f3f6f3;padding:24px 12px;"><tr><td align="center">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        'style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">'
        f'<tr><td style="background:{accent};padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold;">'
        "JKUAT Noticeboard</td></tr>"
        '<tr><td style="padding:24px;">'
        f'<h1 style="margin:0 0 8px;font-size:21px;color:#1a1a1a;">{esc(heading)}</h1>'
        f'<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#444444;">{intro_html}</p>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{notice_rows}{more_html}</table>'
        f"{events_html}"
        '<div style="margin-top:28px;text-align:center;">'
        f'<a href="{site_link}" style="display:inline-block;background:{accent};color:#ffffff;'
        'padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;text-decoration:none;">'
        "Visit the Noticeboard</a></div>"
        "</td></tr>"
        '<tr><td style="padding:16px 24px;background:#f3f6f3;font-size:12px;line-height:18px;color:#777777;">'
        f"{esc(footer_text)}"
        "</td></tr></table></td></tr></table></body></html>"
    )

    lines = [heading.upper(), "", intro, ""]
    for notice in notices:
        meta = " | ".join(
            part for part in (notice.category, notice.org_unit, _fmt_date(notice.published_at)) if part
        )
        lines.append(notice.title)
        lines.append(meta)
        if notice.excerpt:
            lines.append(notice.excerpt)
        lines.append(f"{site}/notices/{notice.id}")
        lines.append("")
    if hidden_count > 0:
        plural = "s" if hidden_count != 1 else ""
        lines.extend([f"...and {hidden_count} more notice{plural} on the Noticeboard.", ""])
    if events:
        lines.append("COMING UP THIS WEEK")
        for event in events:
            detail = _fmt_datetime(event.start_date)
            if event.location:
                detail += f" | {event.location}"
            lines.append(f"{event.title} - {detail}")
            lines.append(f"{site}/events/{event.id}")
        lines.append("")
    lines.extend([f"Visit the Noticeboard: {site}", "", footer_text])

    return DigestMessage(subject=subject, text="\n".join(lines), html=html_body)