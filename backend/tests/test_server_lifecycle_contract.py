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

    def test_every_home_copy_key_the_page_reads_is_actually_seeded(self):
        """A key the page reads but the seed lacks is an edit that does nothing.

        Home.js moved to home_hero_headline_v2 while the seed and the staff
        Content Manager still carried home_hero_headline. The owner could rewrite
        his own H1, save it, and watch the page not change. Nothing failed, which
        is why it lasted. Checking every key the page reads catches the next
        rename too, not just this pair.
        """
        import re

        home = (BACKEND.parent / 'frontend' / 'src' / 'pages' / 'Home.js')
        if not home.exists():  # backend only checkouts still run the suite
            self.skipTest('frontend is not present in this checkout')

        read_keys = set(re.findall(r"\bcopy\(\s*'([^']+)'", home.read_text(encoding='utf-8')))
        seeded = set(re.findall(r"\{'key':\s*'([^']+)'", SERVER_SOURCE))
        self.assertEqual(
            sorted(read_keys - seeded), [],
            'Home.js reads a copy key that the seed never creates, so editing it '
            'in the Content Manager changes nothing on the page.',
        )

    def test_each_seeded_home_copy_value_matches_the_page_fallback(self):
        """A seed that disagrees with the fallback makes the fallback dead code.

        Having the key is not enough. The seed writes the value into the
        database at boot and the page prefers it, so a fallback that says
        something else is never rendered on any environment that has ever
        booted. That is worse than the missing key it replaced, because the
        source now shows copy the site does not use and a reviewer reading
        Home.js sees the wrong page.

        This fired for real: the seed was added carrying the old hero copy, the
        fallback was then rewritten, and the homepage kept rendering the old
        line with every test passing.
        """
        import re

        home = (BACKEND.parent / 'frontend' / 'src' / 'pages' / 'Home.js')
        if not home.exists():
            self.skipTest('frontend is not present in this checkout')

        fallbacks = dict(re.findall(
            r"\bcopy\(\s*'([^']+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)",
            home.read_text(encoding='utf-8'),
        ))
        self.assertTrue(fallbacks, 'no getCopy fallbacks parsed, the pattern has drifted')

        seeded = dict(re.findall(
            r"\{'key':\s*'([^']+)',\s*'value':\s*'((?:[^'\\]|\\.)*)'\}", SERVER_SOURCE))

        mismatched = [
            key for key, value in fallbacks.items()
            if key in seeded and seeded[key] != value
        ]
        self.assertEqual(
            mismatched, [],
            'The seed and the Home.js fallback disagree for these keys, so the '
            'fallback is never what renders: ' + ', '.join(mismatched),
        )

    def test_no_second_path_exists_from_a_consumer_lead_to_a_provider(self):
        """One lead message, one sending path, and that path is the outbox.

        server.py used to define send_lead_emails and send_lead_sms. Both built
        the same acknowledgement and staff alert the outbox enqueues, but called
        the provider directly, so they carried no idempotency key, no claim, no
        lease and no quarantine. Nothing called them, which is exactly why they
        survived: a dead sender breaks nothing until someone wires it up. The
        MailerSend incident was this same structure, two send paths for one
        message with only one of them watched.

        The allowlist below is the point. Adding a new function in server.py
        that reaches a provider fails this test, so the second path has to be
        argued for in review rather than appearing quietly next to the first.
        """
        import ast

        provider_entry_points = {'send_resend_email', 'send_sms'}
        permitted = {
            # Account and staff operations, not lead messaging.
            'forgot_password', 'owner_send_reset', 'create_invite',
            'run_daily_bounce_digest', 'submit_review',
            # Corporate lead lane, gated separately on its own stored consent.
            '_send_corporate_lead_emails', 'create_corporate_lead',
            'bulk_corporate_action',
            # Staff triggered marketing and campaign paths.
            'send_cold_email', '_run_single_campaign', '_send_review_request',
            'test_send_campaign', 'test_sms_campaign',
            # Status change and follow up, driven by staff action or scheduler.
            'send_status_change_sms', 'run_sms_followup_job', '_bg',
            # Inbound webhook acknowledgements.
            '_twilio_inbound_background', '_mailersend_inbound_background',
        }

        tree = ast.parse(SERVER_SOURCE)
        senders = set()
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for inner in ast.walk(node):
                if (isinstance(inner, ast.Call) and isinstance(inner.func, ast.Name)
                        and inner.func.id in provider_entry_points):
                    senders.add(node.name)

        self.assertEqual(
            sorted(senders - permitted), [],
            'A new provider sending function appeared in server.py. If it sends '
            'a consumer lead acknowledgement or a new lead staff alert, it is a '
            'second path and belongs in the outbox instead.',
        )
        self.assertNotIn('send_lead_emails', SERVER_SOURCE)
        self.assertNotIn('send_lead_sms', SERVER_SOURCE)

    def test_lead_dispatcher_has_no_mailersend_adapter_or_fallback(self):
        dispatcher = (BACKEND / 'provider_dispatch.py').read_text()
        self.assertNotIn('api.mailersend.com', dispatcher)
        self.assertNotIn('MAILERSEND_API_KEY', dispatcher)
        self.assertIn('class TwilioAdapter', dispatcher)
        self.assertIn('class ResendAdapter', dispatcher)

    def test_public_corporate_lead_sms_cannot_fall_through_to_mailersend(self):
        # This used to assert the route passed allow_mailersend_fallback=False,
        # opting one caller out of a fallback every other caller still had. The
        # fallback is gone entirely, so the guarantee is now global rather than
        # per caller and the old assertion checked a switch that no longer
        # exists. Assert the invariant instead of the mechanism.
        corporate_route = SERVER_SOURCE.split("async def create_corporate_lead", 1)[1].split(
            "@api_router.get('/staff/corporate-leads')", 1
        )[0]
        self.assertIn('await send_sms(', corporate_route)
        self.assertNotIn('mailersend', corporate_route.lower())
        self.assertNotIn('api.mailersend.com', SERVER_SOURCE)

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
