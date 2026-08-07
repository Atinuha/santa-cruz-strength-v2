from pathlib import Path
import unittest


BACKEND = Path(__file__).resolve().parents[1]
SERVER_SOURCE = (BACKEND / 'server.py').read_text()
OUTBOX_SOURCE = (BACKEND / 'lead_outbox.py').read_text()


class ServerLifecycleContractTests(unittest.TestCase):
    def test_public_lead_route_persists_outbox_intent_without_direct_delivery(self):
        lead_route = SERVER_SOURCE.split("async def create_lead_public", 1)[1].split(
            "# --------------- Staff Lead Routes ---------------", 1
        )[0]

        self.assertIn('enqueue_lead_received_jobs', lead_route)
        self.assertNotIn('send_lead_emails', lead_route)
        self.assertNotIn('send_lead_sms', lead_route)
        self.assertNotIn('send_sms(', lead_route)
        self.assertNotIn('send_resend_email(', lead_route)
        self.assertNotIn('asyncio.create_task(', lead_route)
        self.assertNotIn('MailerSend', lead_route)
        self.assertIn('new_lead_lifecycle_fields', lead_route)

    def test_lead_dispatcher_has_no_mailersend_adapter_or_fallback(self):
        dispatcher = (BACKEND / 'provider_dispatch.py').read_text()
        self.assertNotIn('api.mailersend.com', dispatcher)
        self.assertNotIn('MAILERSEND_API_KEY', dispatcher)
        self.assertIn('class TwilioAdapter', dispatcher)
        self.assertIn('class ResendAdapter', dispatcher)

    def test_public_corporate_lead_sms_cannot_fall_through_to_mailersend(self):
        corporate_route = SERVER_SOURCE.split("async def create_corporate_lead", 1)[1].split(
            "@api_router.get('/staff/corporate-leads')", 1
        )[0]
        self.assertIn('allow_mailersend_fallback=False', corporate_route)

    def test_ordinary_status_and_note_changes_do_not_claim_human_contact(self):
        update_route = SERVER_SOURCE.split("async def update_lead", 1)[1].split(
            "@api_router.post('/staff/leads/{lead_id}/notes')", 1
        )[0]
        note_route = SERVER_SOURCE.split("async def add_note", 1)[1].split(
            "@api_router.delete('/staff/leads/{lead_id}')", 1
        )[0]

        self.assertNotIn("update['last_contact_date'] = now.isoformat()", update_route)
        self.assertNotIn("'last_contact_date': now.isoformat()", note_route)
        self.assertNotIn('human_contact_state', update_route)

    def test_contact_lifecycle_and_terminal_failure_routes_are_explicit(self):
        self.assertIn("@api_router.post('/staff/leads/{lead_id}/lifecycle')", SERVER_SOURCE)
        self.assertIn("@api_router.post('/staff/leads/{lead_id}/contact-events')", SERVER_SOURCE)
        self.assertIn("@api_router.get('/staff/outbox/failures')", SERVER_SOURCE)
        self.assertIn("@api_router.post('/staff/outbox/{job_id}/replay')", SERVER_SOURCE)

    def test_durable_unique_indexes_are_created_behind_startup_write_gate(self):
        self.assertIn("db.lead_outbox.create_index('idempotency_key', unique=True)", SERVER_SOURCE)
        self.assertIn("db.lead_contact_events.create_index('event_id', unique=True)", SERVER_SOURCE)
        self.assertIn("db.lead_lifecycle_events.create_index('event_id', unique=True)", SERVER_SOURCE)
        self.assertLess(
            SERVER_SOURCE.index('if not ALLOW_DATABASE_WRITES:'),
            SERVER_SOURCE.index("db.lead_outbox.create_index('idempotency_key', unique=True)"),
        )

    def test_outbox_module_has_no_external_provider_or_network_client(self):
        lowered = OUTBOX_SOURCE.lower()
        for forbidden in (
            'import resend',
            'import twilio',
            'from twilio',
            'import httpx',
            'import requests',
            'asyncclient(',
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, lowered)

    def test_repeat_inquiry_preserves_stop_and_all_duplicate_paths_repair_outbox(self):
        lead_route = SERVER_SOURCE.split("async def create_lead_public", 1)[1].split(
            "# --------------- Staff Lead Routes ---------------", 1
        )[0]
        duplicate_recoveries = lead_route.split("except DuplicateKeyError:")[1:]

        self.assertIn('reinquiry_sms_updates(', lead_route)
        self.assertNotIn("'sms_opted_out': False,\n            })", lead_route)
        self.assertEqual(len(duplicate_recoveries), 2)
        for recovery in duplicate_recoveries:
            with self.subTest(recovery=recovery[:80]):
                enqueue_position = recovery.find('enqueue_lead_received_jobs')
                return_position = recovery.find('return _public_lead_response')
                self.assertGreaterEqual(enqueue_position, 0)
                self.assertGreater(return_position, enqueue_position)
        self.assertIn("outbox_lead = await db.leads.find_one", lead_route)
        self.assertGreaterEqual(
            lead_route.count("{'$or': [{'request_id': request_id}, {'request_ids': request_id}]}"),
            3,
        )


if __name__ == '__main__':
    unittest.main()
