import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional
import aiofiles
import os
import uuid

from app.config import settings


class EmailSenderService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        attachment_path: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> dict:
        if not self.smtp_user or not self.smtp_password:
            return {"success": False, "error": "SMTP not configured"}

        msg = MIMEMultipart("alternative")
        msg["From"] = f"{from_name or self.smtp_user} <{self.smtp_user}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = cc

        msg.attach(MIMEText(body, "html" if "<html" in body else "plain"))

        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                filename = os.path.basename(attachment_path)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={filename}",
                )
                msg.attach(part)

        message_id = f"<{uuid.uuid4().hex}@{self.smtp_host}>"
        msg["Message-ID"] = message_id

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_user, self.smtp_password)
                recipients = [to_email]
                if cc:
                    recipients.append(cc)
                server.sendmail(self.smtp_user, recipients, msg.as_string())

            return {
                "success": True,
                "message_id": message_id,
                "to": to_email,
                "subject": subject,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_email_with_tracking(
        self,
        to_email: str,
        subject: str,
        body: str,
        application_id: str,
        cc: Optional[str] = None,
        attachment_path: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> dict:
        tracking_pixel = (
            f'<img src="{settings.BASE_URL}/api/track/open/{application_id}" '
            f'width="1" height="1" style="display:none" />'
        )
        tracked_body = body
        if "</body>" in body:
            tracked_body = body.replace("</body>", f"{tracking_pixel}</body>")
        else:
            tracked_body = body + tracking_pixel

        link_tracking = f'{settings.BASE_URL}/api/track/click/{application_id}?url='
        tracked_body = tracked_body.replace('href="', f'href="{link_tracking}')

        return await self.send_email(to_email, subject, tracked_body, cc, attachment_path, from_name)


email_sender_service = EmailSenderService()
