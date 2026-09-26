import aiosmtplib
from email.message import EmailMessage

from app.core.config import settings


class EmailService:
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email

    async def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.from_email
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message,
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            start_tls=True,
        )

    async def send_activation_email(self, to: str, full_name: str, activation_link: str) -> None:
        body = (
            f"Hi {full_name},\n\n"
            f"An account has been created for you on the JKUAT Noticeboard.\n"
            f"Activate it within 7 days using the link below:\n\n"
            f"{activation_link}\n\n"
            f"If you weren't expecting this, you can ignore this email."
        )
        await self.send(to, "Activate your Noticeboard account", body)

    async def send_password_reset_email(self, to: str, full_name: str, reset_link: str) -> None:
        body = (
            f"Hi {full_name},\n\n"
            f"We received a request to reset your Noticeboard password.\n"
            f"This link is valid for 24 hours:\n\n"
            f"{reset_link}\n\n"
            f"If you didn't request this, you can safely ignore this email."
        )
        await self.send(to, "Reset your Noticeboard password", body)