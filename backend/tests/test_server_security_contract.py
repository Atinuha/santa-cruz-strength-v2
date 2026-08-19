from pathlib import Path
import unittest


SOURCE = (Path(__file__).resolve().parents[1] / 'server.py').read_text()


class ServerSecurityContractTests(unittest.TestCase):
    def test_server_uses_exact_cors_and_idempotency_controls(self):
        self.assertIn("allow_origins=parse_cors_origins", SOURCE)
        self.assertNotIn("CORS_ORIGINS', '*'", SOURCE)

    def test_general_health_route_is_read_only_and_reports_readiness(self):
        self.assertIn("@api_router.get('/health')", SOURCE)
        health_route = SOURCE.split("@api_router.get('/health')", 1)[1].split('JWT_SECRET', 1)[0]
        self.assertIn('readiness_report', health_route)
        self.assertIn('database_writes_enabled=ALLOW_DATABASE_WRITES', health_route)
        self.assertNotIn('insert_one', health_route)
        self.assertNotIn('update_one', health_route)
        self.assertNotIn('delete_one', health_route)
        self.assertIn("request_id or Idempotency-Key is required", SOURCE)
        self.assertIn("unique_lead_request_id", SOURCE)
        self.assertIn("except DuplicateKeyError", SOURCE)

    def test_webhooks_are_signed_or_fail_closed(self):
        self.assertIn("if not ALLOW_TWILIO_WEBHOOKS", SOURCE)
        self.assertIn("X-Twilio-Signature", SOURCE)
        self.assertIn("RequestValidator", SOURCE)
        self.assertIn("db.webhook_receipts.insert_one", SOURCE)
        self.assertIn("verify_resend_webhook(raw_body, request.headers, signing_secret)", SOURCE)
        self.assertIn("begin_resend_receipt", SOURCE)
        self.assertIn("finish_resend_receipt", SOURCE)
        resend_route = SOURCE.split("@api_router.post('/webhooks/resend')", 1)[1].split(
            "@api_router.get('/staff/bounce-log')", 1
        )[0]
        self.assertIn('ResendOutboxNotFound', resend_route)
        self.assertLess(
            resend_route.find('apply_resend_outbox_event'),
            resend_route.find('finish_resend_receipt'),
        )
        # MailerSend was removed as a provider, inbound surface included, so the
        # count that used to be asserted here is now zero by design. Absence of
        # the whole surface is asserted in test_no_vendor_residue.

    def test_email_suppression_is_channel_specific(self):
        for field in ('email_opted_out', 'email_marketing_opt_in', 'email_bounced', 'email_complained'):
            self.assertIn(field, SOURCE)
        self.assertIn("message_kind='marketing'", SOURCE)
        self.assertIn('Unsubscribe from marketing email', SOURCE)
        self.assertIn("'email_opted_out': True", SOURCE)

    def test_marketing_sms_requires_explicit_opt_in(self):
        self.assertIn("'sms_marketing_opt_in': True", SOURCE)
        self.assertIn("lead.get('sms_marketing_opt_in') is True", SOURCE)
        self.assertNotIn("'sms_consent': True,\n            'sms_opted_out': {'$ne': True},\n            f'sms_log.type'", SOURCE)

    def test_start_restores_operational_but_not_marketing_consent(self):
        self.assertIn("'sms_operational_opt_in': True", SOURCE)
        self.assertIn("'sms_marketing_opt_in': False", SOURCE)
        self.assertIn('Marketing messages remain off unless you give separate consent.', SOURCE)
        self.assertIn('if state_applied:', SOURCE)

    def test_corporate_form_has_public_route_controls(self):
        self.assertIn("_enforce_public_lead_request(request, 'corporate')", SOURCE)
        self.assertIn("request_id or Idempotency-Key is required", SOURCE)
        self.assertIn("db.corporate_leads.create_index('request_ids', unique=True, sparse=True)", SOURCE)
        self.assertIn("request_ids': [request_id]", SOURCE)
        self.assertIn("data.schema_version != '1.0.0'", SOURCE)
        self.assertIn("data.brand_id != 'santa_cruz_strength'", SOURCE)
        self.assertIn("data.form_id != 'local_wellness_corporate_inquiry'", SOURCE)
        self.assertIn("Email consent fields do not match", SOURCE)
        self.assertIn("SMS consent fields do not match", SOURCE)
        self.assertIn("'email_operational_opt_in': consent.get('email_operational_opt_in') is True", SOURCE)
        self.assertIn("'sms_marketing_opt_in': consent.get('sms_marketing_opt_in') is True", SOURCE)
        self.assertIn("safe_sms_text", SOURCE)
        self.assertIn("escape_html", SOURCE)
        self.assertIn("max_length=2000", SOURCE)

    def test_generated_links_require_an_exact_configured_frontend_origin(self):
        self.assertNotIn("os.environ.get('FRONTEND_URL',", SOURCE)
        self.assertNotIn("FRONTEND_URL_DEFAULT", SOURCE)
        self.assertGreaterEqual(SOURCE.count('require_frontend_origin()'), 9)


if __name__ == '__main__':
    unittest.main()
