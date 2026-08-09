"""Every write that changes a public page must ask for a rebuild.

The public pages are prerendered to static HTML at build time, so the served
HTML is a photograph of the database taken when the site was last built. A CMS
write with no rebuild behind it means the CRM and the live site disagree, and
the structured data keeps asserting the old price or the old hours to Google.

The failure mode is that nobody notices. Nothing errors, nothing looks broken,
and the page is simply out of date for as long as it takes someone to compare
it against the CRM by hand.

This test is the thing that notices. It fails when an endpoint that writes a
public surface is added or edited without a notify_public_content_changed call,
which is exactly when a human would not think to add one.
"""

import ast
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

# Endpoint path -> the public surface it changes. Each of these is rendered into
# static HTML, or into the JSON-LD derived from it.
PUBLIC_WRITE_ENDPOINTS = {
    ("POST", "/staff/blog"): "blog_post",
    ("PUT", "/staff/blog/{post_id}"): "blog_post",
    ("DELETE", "/staff/blog/{post_id}"): "blog_post",
    ("PUT", "/staff/content/{key}"): "site_content",
    ("POST", "/staff/team"): "team_member",
    ("PUT", "/staff/team/{member_id}"): "team_member",
    ("DELETE", "/staff/team/{member_id}"): "team_member",
    ("POST", "/staff/events"): "event",
    ("PUT", "/staff/events/{event_id}"): "event",
    ("DELETE", "/staff/events/{event_id}"): "event",
}


def _route_functions():
    """Maps (METHOD, path) to the function node for every api_router endpoint."""
    tree = ast.parse((BACKEND / "server.py").read_text())
    found = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call):
                continue
            func = decorator.func
            if not isinstance(func, ast.Attribute):
                continue
            owner = func.value
            if not (isinstance(owner, ast.Name) and owner.id == "api_router"):
                continue
            if not decorator.args or not isinstance(decorator.args[0], ast.Constant):
                continue
            found[(func.attr.upper(), decorator.args[0].value)] = node
    return found


ROUTES = _route_functions()


def _notify_surfaces(node):
    """Surfaces this function reports, read from its own calls."""
    surfaces = []
    for inner in ast.walk(node):
        if (
            isinstance(inner, ast.Call)
            and isinstance(inner.func, ast.Name)
            and inner.func.id == "notify_public_content_changed"
            and inner.args
            and isinstance(inner.args[0], ast.Constant)
        ):
            surfaces.append(inner.args[0].value)
    return surfaces


class DeployHookCoverageTests(unittest.TestCase):
    def test_the_endpoints_this_test_names_all_exist(self):
        """Guards the test. A renamed route must fail loudly, not silently pass."""
        missing = [key for key in PUBLIC_WRITE_ENDPOINTS if key not in ROUTES]
        self.assertEqual(missing, [], f"endpoints named here no longer exist: {missing}")

    def test_every_public_write_requests_a_rebuild(self):
        without = [
            f"{method} {path}"
            for (method, path) in PUBLIC_WRITE_ENDPOINTS
            if not _notify_surfaces(ROUTES[(method, path)])
        ]
        self.assertEqual(
            without,
            [],
            "these endpoints change a public page without asking for a rebuild: " + ", ".join(without),
        )

    def test_each_endpoint_reports_the_surface_it_actually_changes(self):
        """A wrong surface name is worse than none: it reads as covered."""
        wrong = []
        for key, expected in PUBLIC_WRITE_ENDPOINTS.items():
            actual = _notify_surfaces(ROUTES[key])
            if expected not in actual:
                wrong.append(f"{key[0]} {key[1]} reports {actual}, expected {expected}")
        self.assertEqual(wrong, [], "; ".join(wrong))

    def test_the_hook_is_off_by_default(self):
        """Holding a URL that triggers a production build is not permission to use it."""
        source = (BACKEND / "runtime_safety.py").read_text()
        self.assertIn('ALLOW_DEPLOY_HOOK = env_flag("ALLOW_DEPLOY_HOOK")', source)
        self.assertIn("def env_flag(name: str, default: bool = False)", source)

    def test_a_failed_hook_cannot_undo_a_saved_edit(self):
        """The write is the source of truth. The rebuild is a consequence of it."""
        source = (BACKEND / "deploy_hook.py").read_text()
        self.assertIn("except Exception as exc:", source)
        # No raise anywhere in the module: a dead hook must never surface as a
        # failed save to a staff member whose edit already committed.
        tree = ast.parse(source)
        raises = [n for n in ast.walk(tree) if isinstance(n, ast.Raise)]
        self.assertEqual(raises, [], "deploy_hook must never raise into a request")

    def test_every_declared_surface_is_one_a_public_page_renders(self):
        source = (BACKEND / "deploy_hook.py").read_text()
        declared = ast.literal_eval(
            source[source.index("PUBLIC_SURFACES = {") + len("PUBLIC_SURFACES = ") : source.index("}\n", source.index("PUBLIC_SURFACES = {")) + 1]
        )
        self.assertEqual(declared, set(PUBLIC_WRITE_ENDPOINTS.values()))


if __name__ == "__main__":
    unittest.main()
