import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def _build_html(drops: list[dict]) -> str:
    rows = ""
    for d in drops:
        badge = ""
        if d.get("target_hit"):
            badge = '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:6px;">🎯 Target Hit</span>'

        drop_info = ""
        if d.get("drop_pct"):
            drop_info = f'<br><small style="color:#6b7280;">Was ₹{d["prev_price"]:,.0f} → now ₹{d["current_price"]:,.0f} ({d["drop_pct"]}% drop)</small>'
        else:
            drop_info = f'<br><small style="color:#6b7280;">Now ₹{d["current_price"]:,.0f} — reached your target price!</small>'

        rows += f"""
        <tr>
          <td style="padding:16px;border-bottom:1px solid #e5e7eb;">
            <strong>{d['name']}</strong>{badge}
            {drop_info}
            <br>
            <a href="{d['url']}" style="color:#2563eb;font-size:13px;margin-top:4px;display:inline-block;">View on site →</a>
          </td>
          <td style="padding:16px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:22px;font-weight:700;color:#16a34a;">
            ₹{d['current_price']:,.0f}
          </td>
        </tr>
        """

    return f"""
    <html>
    <body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;color:#111827;">
      <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
        <div style="background:#1d4ed8;color:#fff;padding:20px 24px;">
          <h1 style="margin:0;font-size:20px;">📉 Price Drop Alert</h1>
          <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">{len(drops)} item(s) dropped in price</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          {rows}
        </table>
        <p style="padding:16px 24px;font-size:12px;color:#9ca3af;margin:0;">
          Sent by your Price Tracker · GitHub Actions
        </p>
      </div>
    </body>
    </html>
    """


def send_alert(drops: list[dict], recipient: str):
    sender = os.environ["GMAIL_USER"]
    password = os.environ["GMAIL_APP_PASSWORD"]  # App Password, not account password

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📉 Price Drop: {drops[0]['name']}" + (f" + {len(drops)-1} more" if len(drops) > 1 else "")
    msg["From"] = f"Price Tracker <{sender}>"
    msg["To"] = recipient

    # Plain text fallback
    plain = "\n".join(
        f"- {d['name']}: ₹{d['current_price']:,.0f} (was ₹{d.get('prev_price', 'N/A')})\n  {d['url']}"
        for d in drops
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(_build_html(drops), "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender, password)
        server.sendmail(sender, recipient, msg.as_string())

    print(f"✉️  Alert sent to {recipient}")
