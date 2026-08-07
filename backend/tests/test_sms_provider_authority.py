"""Twilio is the only authoritative SMS provider.

A MailerSend fallback used to sit behind Twilio inside send_sms. It was removed
for two reasons, and this test exists so it cannot quietly come back.

1. Duplicate delivery. The Twilio branch sends one number at a time. A failure
   part way through a batch raised out of the loop, and the fallback then sent
   to the entire recipient list, so every number Twilio had already delivered to
   received the message a second time from a different sender.

2. Unprocessable opt out. Inbound MailerSend webhooks fail closed, so a STOP
   reply to that second number was never recorded. Sending from a number whose
   opt outs cannot be processed is the one thing an SMS pipeline must not do.

The inbound handler is deliberately still present. It is a correct
implementation waiting on signature verification, and its route already returns
503. Receiving later is fine; sending is not.
"""

import re
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

SOURCE = (BACKEND / 'server.py').read_text(encoding='utf-8')


def _send_sms_body():
    start = SOURCE.index('async def send_sms(')
    tail = SOURCE[start + 20:]
    end = re.search(r'\n(?:async def |def |@app|@api_router)', tail)
    return tail[:end.start()] if end else tail


class SmsProviderAuthorityTests(unittest.TestCase):
    def test_send_sms_reaches_no_provider_but_twilio(self):
        body = _send_sms_body()
        self.assertNotIn('mailersend.com', body)
        self.assertNotIn('MAILERSEND_API_KEY', body)
        self.assertIn('twilio', body.lower())

    def test_no_fallback_switch_survives_on_the_signature(self):
        self.assertNotIn('allow_mailersend_fallback', SOURCE)

    def test_nothing_outbound_posts_to_the_fallback_provider(self):
        # The inbound handler and its 503 routes may mention the name. An
        # outbound API URL may not appear anywhere.
        self.assertNotIn('api.mailersend.com', SOURCE)

    def test_scheduled_and_campaign_sms_gate_on_the_authoritative_provider(self):
        # These gates keyed on the fallback provider being configured, which
        # meant a correctly configured Twilio still produced no scheduled SMS.
        followup = SOURCE[SOURCE.index('async def run_sms_followup_job'):][:400]
        self.assertIn('TWILIO_PHONE_NUMBER', followup)
        self.assertNotIn('MAILERSEND', followup)

    def test_inbound_route_still_fails_closed(self):
        self.assertIn('MailerSend webhooks are disabled pending verified signature support', SOURCE)


if __name__ == '__main__':
    unittest.main()
