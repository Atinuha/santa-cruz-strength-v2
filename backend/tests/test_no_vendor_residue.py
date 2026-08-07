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


if __name__ == '__main__':
    unittest.main()
