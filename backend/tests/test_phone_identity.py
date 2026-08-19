"""Phone numbers must mean the same thing everywhere they are used.

Leads are stored in display form, (831) 555-1212, because that is what staff
read. Twilio speaks E.164, +18315551212, in both directions. Nothing reconciled
the two, and it broke the SMS path at both ends:

  Outbound: the dispatcher skipped any number not starting with '+'. Every
  number this application has ever stored is in display form, so it skipped all
  of them and no lead could receive a message.

  Inbound: a STOP keyword arrives with the sender in E.164 and was matched
  against the stored display string, so it matched nothing. A customer texting
  STOP received an acknowledgement and stayed subscribed.

The second is the one that matters. Losing an outbound message costs a lead.
Ignoring STOP is a consent failure on a channel that is regulated.

Both were dormant only because SMS is flag disabled, and they would have fired
at the moment Twilio was enabled, which is step 5 of the deployment sequence.
"""

import re
import sys
import unittest
from pathlib import Path
from typing import Optional

BACKEND = Path(__file__).resolve().parents[1]


def _load_helpers():
    """Exec the three helpers out of server.py without importing the app.

    server.py builds a Mongo client and reads required environment at import,
    so importing it here would need a whole harness for three pure functions.
    """
    source = (BACKEND / 'server.py').read_text()
    namespace = {'re': re, 'Optional': Optional}
    for marker in ('def normalize_phone', 'def to_e164', 'def phone_match_query'):
        start = source.index(marker)
        # Stop at the next top level statement. Scanning for a blank run instead
        # over-reads into the decorated route that follows, which then fails on
        # names this namespace does not have.
        lines = source[start:].splitlines(keepends=True)
        body = [lines[0]]
        for line in lines[1:]:
            if line.strip() and not line[0].isspace():
                break
            body.append(line)
        exec(''.join(body), namespace)  # noqa: S102
    return namespace


HELPERS = _load_helpers()
normalize_phone = HELPERS['normalize_phone']
to_e164 = HELPERS['to_e164']
phone_match_query = HELPERS['phone_match_query']


class ToE164Tests(unittest.TestCase):
    def test_converts_the_form_leads_are_actually_stored_in(self):
        """The exact bug. This is what normalize_phone writes to the database."""
        self.assertEqual(to_e164('(831) 555-1212'), '+18315551212')

    def test_accepts_bare_ten_digits(self):
        self.assertEqual(to_e164('8315551212'), '+18315551212')

    def test_accepts_eleven_digits_with_country_code(self):
        self.assertEqual(to_e164('18315551212'), '+18315551212')

    def test_passes_through_an_already_correct_number(self):
        self.assertEqual(to_e164('+18315551212'), '+18315551212')

    def test_returns_none_rather_than_a_malformed_destination(self):
        """Callers must decide. Sending to a guess is worse than not sending."""
        for junk in ('', 'nonsense', '123', None):
            self.assertIsNone(to_e164(junk))

    def test_round_trips_with_the_storage_format(self):
        stored = normalize_phone('831-555-1212')
        self.assertEqual(stored, '(831) 555-1212')
        self.assertEqual(to_e164(stored), '+18315551212')


class StopKeywordMatchingTests(unittest.TestCase):
    def test_an_e164_sender_matches_a_display_form_record(self):
        """The consent failure, stated as a test.

        Twilio posts the sender as +18315551212. The lead is stored as
        (831) 555-1212. A query for the raw sender matches nothing, so the
        opt out silently does not happen.
        """
        query = phone_match_query('+18315551212')

        self.assertIn('(831) 555-1212', query['phone']['$in'])
        self.assertIn('+18315551212', query['phone']['$in'])

    def test_matches_whichever_form_the_record_was_written_in(self):
        """Records predate the fix, so both representations must be covered."""
        query = phone_match_query('+18315551212')
        stored_forms = {'(831) 555-1212', '+18315551212'}

        self.assertTrue(stored_forms.issubset(set(query['phone']['$in'])))

    def test_produces_a_usable_query_for_an_unrecognised_sender(self):
        """A short code or a malformed sender must not raise on an inbound hook."""
        query = phone_match_query('12345')

        self.assertIn('phone', query)
        self.assertTrue(all(isinstance(v, str) for v in query['phone']['$in']))


class SourceContractTests(unittest.TestCase):
    """The helpers being correct is not the point. Being used is the point."""

    source = (BACKEND / 'server.py').read_text()

    def test_no_inbound_lookup_matches_the_raw_sender(self):
        """Five sites matched {'phone': from_number} and all five found nothing."""
        self.assertNotIn("{'phone': from_number}", self.source)

    def test_the_dispatcher_converts_rather_than_filtering(self):
        """The old guard skipped every number the application stores."""
        self.assertNotIn("if not phone or not phone.startswith('+'):", self.source)
        self.assertIn("phone = to_e164(lead.get('phone', ''))", self.source)


if __name__ == '__main__':
    unittest.main()
