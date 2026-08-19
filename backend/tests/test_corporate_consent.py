"""The corporate lead confirmation must respect the consent it collects.

This is the sibling of the acknowledgement email defect, running the opposite
direction. The member form omitted a consent field and the backend defaulted it
to false, so every consumer lead was silently suppressed. The corporate endpoint
validates that same field carefully and then never consulted it, so every
corporate submission with an email address was confirmed regardless of consent.

Two guards that looked like they would catch it did not:

  The endpoint checks that email_consent and consent.email_operational_opt_in
  agree before storing them. That proves the gate was intended. It does not
  apply one.

  _email_delivery_allowed looks the recipient up in db.leads. Corporate leads
  are written to db.corporate_leads, so the lookup missed and the function
  returned allowed on a record it never found.

The staff notification is deliberately not gated. Nobody consents on the gym's
behalf to being told it has a lead.
"""

import re
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

SOURCE = (BACKEND / 'server.py').read_text(encoding='utf-8')


def _corporate_email_fn():
    start = SOURCE.index('async def _send_corporate_lead_emails')
    tail = SOURCE[start + 30:]
    end = re.search(r'\n(?:async def |def |@app|@api_router)', tail)
    return tail[:end.start()] if end else tail


class CorporateConsentTests(unittest.TestCase):
    def test_contact_confirmation_is_gated_on_stored_consent(self):
        body = _corporate_email_fn()
        self.assertIn('email_operational_opt_in', body)
        # The send to the contact must be conditional on that consent, not on
        # merely possessing an address.
        self.assertRegex(body, r"if lead\.get\('email'\) and \w+")

    def test_suppression_flags_are_honoured_for_the_contact(self):
        body = _corporate_email_fn()
        for flag in ('email_opted_out', 'blacklisted'):
            with self.subTest(flag=flag):
                self.assertIn(flag, body)

    def test_staff_notification_stays_ungated(self):
        # Gating the internal alert on the lead's consent would mean a decline
        # also hides the lead from the business, which loses it entirely.
        body = _corporate_email_fn()
        self.assertIn('STAFF_EMAIL', body)
        staff_call = body[body.index('STAFF_EMAIL') - 300:body.index('STAFF_EMAIL')]
        self.assertNotIn('email_operational_opt_in', staff_call)

    def test_the_endpoint_still_validates_consent_fields_agree(self):
        # The mismatch check is what revealed the intent. Keep it.
        route = SOURCE.split('async def create_corporate_lead', 1)[1][:4000]
        self.assertIn('Email consent fields do not match', route)
        self.assertIn('SMS consent fields do not match', route)


if __name__ == '__main__':
    unittest.main()
