"""No build-platform residue in application code.

This project was scaffolded on a hosting platform that left three kinds of trace
behind: images served from its asset CDN, a build plugin installed from a
tarball URL rather than a registry, and its own deploy config.

The images mattered most. Every one turned out to be a genuine photograph of
this gym, so the fix was to vendor them rather than delete the references, and
the wide facility shot that had been dismissed as vendor residue became the
homepage hero. The lesson is in that order: verify what a dependency actually
holds before removing it.

These assertions cover application source only. Lockfiles legitimately record
resolved URLs, and a form placeholder attribute is not an image load.
"""

import re
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BACKEND = REPO / 'backend'
FRONTEND_SRC = REPO / 'frontend' / 'src'

VENDOR_HOSTS = ('customer-assets.emergentagent.com', 'assets.emergent.sh')


def _sources():
    for path in list(BACKEND.glob('*.py')) + list(FRONTEND_SRC.rglob('*.js')):
        if 'node_modules' in path.parts or path.name.endswith('.test.js'):
            continue
        yield path


class NoVendorResidueTests(unittest.TestCase):
    def test_no_vendor_host_appears_in_application_source(self):
        offenders = []
        for path in _sources():
            text = path.read_text(encoding='utf-8', errors='replace')
            for host in VENDOR_HOSTS:
                if host in text:
                    offenders.append(f'{path.relative_to(REPO)} -> {host}')
        self.assertEqual(offenders, [], f'vendor host reappeared: {offenders}')

    def test_images_are_served_from_this_repository(self):
        # A remote image is a dependency on someone else's uptime and someone
        # else's idea of what the photograph is.
        pattern = re.compile(r'''["'](https?://[^"']*\.(?:jpg|jpeg|png|webp|avif))["']''', re.I)
        offenders = []
        for path in _sources():
            for match in pattern.findall(path.read_text(encoding='utf-8', errors='replace')):
                if 'example.com' in match:      # form placeholder text, not a load
                    continue
                offenders.append(f'{path.relative_to(REPO)} -> {match}')
        self.assertEqual(offenders, [], f'remote image reference: {offenders}')

    def test_build_tooling_is_not_installed_from_a_tarball_url(self):
        import json
        pkg = json.loads((REPO / 'frontend' / 'package.json').read_text(encoding='utf-8'))
        deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
        offenders = [f'{k}={v}' for k, v in deps.items() if str(v).startswith(('http://', 'https://'))]
        self.assertEqual(offenders, [], f'dependency resolved from a URL: {offenders}')

    def test_platform_deploy_config_is_gone(self):
        self.assertFalse((REPO / '.emergent').exists(), '.emergent/ came back')

    def test_no_operational_mailersend_surface_remains(self):
        """MailerSend was removed as a provider. Nothing may still accept its traffic.

        The send path went first and the inbound routes outlived it, which left
        the project claiming a provider was gone while three of its webhooks were
        still published. Inbound only matters during a transition, and the
        transition ended when the send path was deleted.

        Prose is deliberately not checked. send_sms carries a comment explaining
        why the fallback was removed, and that history is worth keeping. What is
        checked is anything operational: symbols, env vars, the API host, and the
        published route table, because a route is the part that can accept a
        request.
        """
        operational = ('MAILERSEND_API_KEY', 'MAILERSEND_FROM', 'api.mailersend.com',
                       'ALLOW_MAILERSEND_WEBHOOKS', 'mailersend-sms')
        offenders = []
        for path in list(BACKEND.glob('*.py')) + [BACKEND / '.env.example']:
            text = path.read_text(encoding='utf-8', errors='replace')
            offenders += [f'{path.name} -> {token}' for token in operational if token in text]
        self.assertEqual(offenders, [], f'MailerSend surface returned: {offenders}')

        # The route table is the authority. This FastAPI version keeps an
        # included router as one entry with an empty path, so app.routes shows
        # no API route at all and any assertion over it would pass vacuously.
        sys.path.insert(0, str(BACKEND))
        import os
        for key in [k for k in os.environ if k.startswith('ALLOW_')]:
            del os.environ[key]
        os.environ.update({
            'MONGO_URL': 'mongodb://localhost:27017', 'DB_NAME': 'scs_residue_test',
            'FRONTEND_URL': 'http://localhost:3000', 'CORS_ORIGINS': 'http://localhost:3000',
            'JWT_SECRET': 'x' * 40, 'UNSUBSCRIBE_SECRET': 'y' * 40,
        })
        for module in [m for m in list(sys.modules) if m in ('server', 'runtime_safety')]:
            del sys.modules[module]
        import server

        published = server.app.openapi()['paths']
        self.assertEqual([p for p in published if 'mailersend' in p.lower()], [])
        self.assertIn('/api/webhooks/twilio-sms', published)


if __name__ == '__main__':
    unittest.main()
