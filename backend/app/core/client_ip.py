import ipaddress
from contextvars import ContextVar
from fastapi import Request

current_client_ip: ContextVar[str | None] = ContextVar("current_client_ip", default=None)


def normalize_ip(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip().split("%", 1)[0]
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return None
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None:
        address = address.ipv4_mapped
    return str(address)


def get_client_ip(request: Request) -> str | None:
    if request.client is None:
        return None
    return normalize_ip(request.client.host)


async def capture_client_ip(request: Request) -> None:
    current_client_ip.set(get_client_ip(request))


def get_current_ip() -> str | None:
    return current_client_ip.get()