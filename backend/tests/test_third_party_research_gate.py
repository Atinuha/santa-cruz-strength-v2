"""The two egress paths where holding a key was itself the gate.

Every other outbound capability in this service sits behind an ALLOW_* flag, on
the rule that possessing an API key must never by itself be sufficient to send.
Two paths did not: blog idea generation reached Google Trends and then a model
provider, and corporate lead discovery reached Overpass. Both were found by an
audit rather than by a test, so this file exists to make the next regression
loud.

Discovery is the interesting one. It egresses on a GET, and the write gate only
inspects the HTTP method, so no amount of write gating can see it. The flag is
the only control that applies.
"""

import importlib
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend import runtime_safety


class ThirdPartyResearchGateTests(unittest.TestCase):
    def load_safety(self, **values):
        patcher = patch.dict(os.environ, values, clear=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        return importlib.reload(runtime_safety)

    def test_defaults_to_disabled(self):
        self.assertFalse(self.load_safety().ALLOW_THIRD_PARTY_RESEARCH)

    def test_a_key_alone_does_not_enable_it(self):
        """The invariant, stated as a test.

        A populated EMERGENT_LLM_KEY is exactly the condition under which the
        old code sent. It must not be sufficient on its own.
        """
        safety = self.load_safety(EMERGENT_LLM_KEY='sk-live-looks-real')

        self.assertFalse(safety.ALLOW_THIRD_PARTY_RESEARCH)

    def test_it_turns_on_only_when_asked(self):
        safety = self.load_safety(ALLOW_THIRD_PARTY_RESEARCH='true')

        self.assertTrue(safety.ALLOW_THIRD_PARTY_RESEARCH)

    def test_the_startup_summary_reports_it(self):
        """A flag absent from the summary reads as covered while covering nothing.

        Two flags already have that shape, so the summary is not a reliable
        inventory unless new flags are added to it deliberately.
        """
        self.assertIn('third_party_research', self.load_safety().runtime_summary())

    def test_both_egress_paths_check_the_flag(self):
        """Source-level, because neither path can be executed without network.

        Asserting on source is weaker than calling the functions, and it is
        what is available here: one path needs a package that is not on PyPI,
        the other needs Overpass. Both would otherwise go untested entirely.
        """
        source = (Path(__file__).resolve().parents[1] / 'server.py').read_text()

        for marker in (
            "async def discover_businesses",
            "async def _generate_blog_ideas_core",
        ):
            start = source.index(marker)
            body = source[start:start + 2000]
            self.assertIn(
                'ALLOW_THIRD_PARTY_RESEARCH', body,
                f'{marker} reaches a third party without consulting the flag',
            )


if __name__ == '__main__':
    unittest.main()
