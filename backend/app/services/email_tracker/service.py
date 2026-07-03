import imaplib
import email
from email.header import decode_header
from datetime import datetime
from typing import Optional
import re

from app.config import settings


class EmailTrackerService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD

    def check_for_replies_sync(self, since_date: Optional[datetime] = None) -> list[dict]:
        if not self.smtp_user or not self.smtp_password:
            return []

        replies = []
        try:
            mail = imaplib.IMAP4_SSL(self.smtp_host)
            mail.login(self.smtp_user, self.smtp_password)
            mail.select("INBOX")

            search_criteria = "UNSEEN"
            if since_date:
                date_str = since_date.strftime("%d-%b-%Y")
                search_criteria = f'(SINCE "{date_str}")'

            status, messages = mail.search(None, search_criteria)
            if status != "OK" or not messages[0]:
                mail.logout()
                return []

            for num in messages[0].split():
                status, msg_data = mail.fetch(num, "(RFC822)")
                if status != "OK":
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        parsed = self._parse_message(msg)
                        if parsed:
                            replies.append(parsed)
                            mail.store(num, "+FLAGS", "\\Seen")

            mail.logout()
        except Exception:
            pass

        return replies

    async def check_for_replies(self, since_date: Optional[datetime] = None) -> list[dict]:
        if not self.smtp_user or not self.smtp_password:
            return []

        replies = []
        try:
            mail = imaplib.IMAP4_SSL(self.smtp_host)
            mail.login(self.smtp_user, self.smtp_password)
            mail.select("INBOX")

            search_criteria = "UNSEEN"
            if since_date:
                date_str = since_date.strftime("%d-%b-%Y")
                search_criteria = f'(SINCE "{date_str}")'

            status, messages = mail.search(None, search_criteria)
            if status != "OK" or not messages[0]:
                mail.logout()
                return []

            for num in messages[0].split():
                status, msg_data = mail.fetch(num, "(RFC822)")
                if status != "OK":
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        parsed = self._parse_message(msg)
                        if parsed:
                            replies.append(parsed)

                            mail.store(num, "+FLAGS", "\\Seen")

            mail.logout()
        except Exception:
            pass

        return replies

    def _parse_message(self, msg) -> Optional[dict]:
        try:
            subject = self._decode_header_value(msg["Subject"]) or ""
            from_raw = msg["From"] or ""
            to_raw = msg["To"] or ""
            message_id = msg["Message-ID"] or ""
            in_reply_to = msg["In-Reply-To"] or ""
            references = msg["References"] or ""
            date_str = msg["Date"] or ""

            body = self._get_email_body(msg)

            parsed_date = None
            try:
                parsed_date = email.utils.parsedate_to_datetime(date_str)
            except Exception:
                parsed_date = datetime.utcnow()

            return {
                "message_id": message_id.strip("<>"),
                "in_reply_to": in_reply_to.strip("<>"),
                "references": [r.strip("<>") for r in references.split()] if references else [],
                "from_email": from_raw,
                "to_email": to_raw,
                "subject": subject,
                "body": body,
                "sent_at": parsed_date,
                "is_incoming": True,
            }
        except Exception:
            return None

    def _decode_header_value(self, value) -> str:
        if not value:
            return ""
        decoded_parts = decode_header(value)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                try:
                    result.append(part.decode(charset or "utf-8", errors="replace"))
                except (LookupError, UnicodeDecodeError):
                    result.append(part.decode("utf-8", errors="replace"))
            else:
                result.append(str(part))
        return " ".join(result)

    def _get_email_body(self, msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            return payload.decode("utf-8", errors="replace")
                    except Exception:
                        pass
                elif content_type == "text/html":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            html = payload.decode("utf-8", errors="replace")
                            clean = re.sub(r"<[^>]+>", " ", html)
                            return re.sub(r"\s+", " ", clean).strip()
                    except Exception:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    return payload.decode("utf-8", errors="replace")
            except Exception:
                pass
        return ""

    def extract_email_address(self, from_field: str) -> str:
        match = re.search(r"<([^>]+)>", from_field)
        if match:
            return match.group(1)
        return from_field.strip()


email_tracker_service = EmailTrackerService()
