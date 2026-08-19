import unittest
from datetime import datetime, timezone
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lead_lifecycle import (  # noqa: E402
    InvalidLifecycleTransition,
    human_contact_event,
    lifecycle_event,
    new_lead_lifecycle_fields,
    validate_lifecycle_transition,
)


NOW = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)


class LeadLifecycleTests(unittest.TestCase):
    def test_new_lead_keeps_canonical_and_human_contact_state_separate(self):
        fields = new_lead_lifecycle_fields(NOW)

        self.assertEqual(fields['lifecycle_state'], 'new')
        self.assertEqual(fields['human_contact_state'], 'not_attempted')
        self.assertEqual(fields['human_contact_event_count'], 0)
        self.assertIsNone(fields['last_human_contact_at'])

    def test_permitted_transition_records_auditable_event(self):
        event = lifecycle_event(
            event_id='8d682981-4e6e-45a0-baa0-cbd6e639b91c',
            lead_id='lead-1',
            current_state='new',
            target_state='acknowledged',
            actor_id='staff-1',
            actor_name='Staff',
            reason='Acknowledgement queued',
            occurred_at=NOW,
        )

        self.assertTrue(event['changed'])
        self.assertEqual(event['from_state'], 'new')
        self.assertEqual(event['to_state'], 'acknowledged')
        self.assertEqual(event['occurred_at'], '2026-08-03T12:00:00+00:00')

    def test_same_transition_is_idempotent(self):
        self.assertFalse(validate_lifecycle_transition('contacted', 'contacted'))

    def test_invalid_transition_is_rejected(self):
        with self.assertRaisesRegex(InvalidLifecycleTransition, 'not allowed'):
            validate_lifecycle_transition('new', 'membership')

    def test_attempt_does_not_claim_human_contact(self):
        event = human_contact_event(
            event_id='2536d633-d498-4d40-a4e8-45807529149a',
            lead_id='lead-1',
            current_state='not_attempted',
            channel='phone',
            outcome='voicemail',
            actor_id='staff-1',
            actor_name='Staff',
            occurred_at=NOW,
        )

        self.assertEqual(event['to_state'], 'attempted')
        self.assertFalse(event['reached'])

    def test_reached_contact_is_explicit_and_cannot_be_downgraded_by_later_attempt(self):
        reached = human_contact_event(
            event_id='863be6cb-a425-4fd3-bf3c-b46a25436925',
            lead_id='lead-1',
            current_state='attempted',
            channel='phone',
            outcome='reached',
            actor_id='staff-1',
            actor_name='Staff',
            occurred_at=NOW,
        )
        later_attempt = human_contact_event(
            event_id='64096510-208c-4477-b401-7aa6fb2f18e1',
            lead_id='lead-1',
            current_state='contacted',
            channel='email',
            outcome='attempted',
            actor_id='staff-1',
            actor_name='Staff',
            occurred_at=NOW,
        )

        self.assertEqual(reached['to_state'], 'contacted')
        self.assertTrue(reached['reached'])
        self.assertEqual(later_attempt['to_state'], 'contacted')
        self.assertFalse(later_attempt['reached'])


if __name__ == '__main__':
    unittest.main()
