import unittest
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lead_consent import reinquiry_sms_updates  # noqa: E402


class LeadConsentTests(unittest.TestCase):
    def test_prior_stop_survives_a_consented_form_resubmission(self):
        updates = reinquiry_sms_updates(
            {'sms_opted_out': True, 'sms_operational_opt_in': False},
            requested_sms_consent=True,
            marketing_opt_in=True,
            consent_text_version='v2',
            consent_date='2026-08-03T12:00:00+00:00',
            consent_source_url='https://santacruzstrength.com/join',
        )

        self.assertEqual(updates, {})

    def test_non_suppressed_reinquiry_can_record_requested_operational_consent(self):
        updates = reinquiry_sms_updates(
            {'sms_opted_out': False},
            requested_sms_consent=True,
            marketing_opt_in=False,
            consent_text_version='v2',
            consent_date='2026-08-03T12:00:00+00:00',
            consent_source_url='https://santacruzstrength.com/join',
        )

        self.assertTrue(updates['sms_operational_opt_in'])
        self.assertFalse(updates['sms_marketing_opt_in'])
        self.assertFalse(updates['sms_opted_out'])


if __name__ == '__main__':
    unittest.main()

