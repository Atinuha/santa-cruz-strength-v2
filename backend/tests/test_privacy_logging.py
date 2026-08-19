import ast
import asyncio
import copy
import io
import logging
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
SERVER = BACKEND / 'server.py'
DEPLOY_HOOK = BACKEND / 'deploy_hook.py'
PRIVACY_SOURCES = (SERVER, DEPLOY_HOOK)
sys.path.insert(0, str(BACKEND))

import deploy_hook  # noqa: E402
from privacy_logging import SAFE_OPERATIONAL_EVENTS, log_operational_event  # noqa: E402


SENSITIVE_DYNAMIC_NAMES = {
    'to',
    'email',
    'phone',
    'number',
    'from_number',
    'to_number',
    'message',
    'lead_name',
    'name',
    'token',
    'filename',
    'subject',
    'html',
    'reply_to',
    'cc',
    'valid',
    'user',
    'target',
    'detail',
    'e',
    'exc',
    'error',
    'exception',
}


def dynamic_log_nodes(call):
    nodes = []
    for position, argument in enumerate(call.args):
        if position == 0 and isinstance(argument, ast.Constant):
            continue
        if isinstance(argument, ast.JoinedStr):
            nodes.extend(
                value.value for value in argument.values if isinstance(value, ast.FormattedValue)
            )
        else:
            nodes.append(argument)
    nodes.extend(keyword.value for keyword in call.keywords)
    return nodes


class PrivacyLoggingTests(unittest.TestCase):
    def test_backend_privacy_sources_do_not_log_pii_or_exception_text(self):
        failures = []
        for source_path in PRIVACY_SOURCES:
            tree = ast.parse(source_path.read_text())
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call):
                    continue
                function = node.func
                if not (
                    isinstance(function, ast.Attribute)
                    and isinstance(function.value, ast.Name)
                    and function.value.id == 'logger'
                ):
                    continue
                if function.attr == 'exception':
                    failures.append((source_path.name, node.lineno, ['logger.exception'], ''))
                if any(
                    keyword.arg == 'exc_info'
                    and not (isinstance(keyword.value, ast.Constant) and keyword.value.value is False)
                    for keyword in node.keywords
                ):
                    failures.append((source_path.name, node.lineno, ['exc_info'], ''))
                for dynamic in dynamic_log_nodes(node):
                    identifiers = {
                        child.id for child in ast.walk(dynamic) if isinstance(child, ast.Name)
                    }
                    identifiers.update(
                        child.attr for child in ast.walk(dynamic) if isinstance(child, ast.Attribute)
                    )
                    identifiers.update(
                        child.value
                        for child in ast.walk(dynamic)
                        if isinstance(child, ast.Constant) and isinstance(child.value, str)
                    )
                    sensitive = identifiers & SENSITIVE_DYNAMIC_NAMES
                    if sensitive:
                        failures.append((
                            source_path.name,
                            node.lineno,
                            sorted(sensitive),
                            ast.unparse(dynamic),
                        ))
        self.assertEqual(failures, [])

    def test_operational_event_calls_are_allowlisted_literals(self):
        tree = ast.parse(SERVER.read_text())
        events = []
        for node in ast.walk(tree):
            if not (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id == 'log_operational_event'
            ):
                continue
            self.assertGreaterEqual(len(node.args), 3)
            self.assertIsInstance(node.args[2], ast.Constant)
            events.append(node.args[2].value)
        self.assertTrue(events)
        self.assertTrue(set(events).issubset(SAFE_OPERATIONAL_EVENTS))

    def test_log_capture_contains_only_the_reviewed_event_code(self):
        stream = io.StringIO()
        logger = logging.getLogger('privacy-log-test')
        logger.handlers = [logging.StreamHandler(stream)]
        logger.propagate = False
        logger.setLevel(logging.INFO)

        log_operational_event(logger, logging.INFO, 'twilio_inbound_received')
        output = stream.getvalue()
        self.assertIn('operational_event=twilio_inbound_received', output)
        self.assertNotIn('person@example.test', output)
        self.assertNotIn('+14085550100', output)
        self.assertNotIn('private inbound body', output)
        with self.assertRaises(ValueError):
            log_operational_event(logger, logging.INFO, 'person@example.test')

    def test_deploy_hook_failure_does_not_log_provider_secret_or_email(self):
        sentinel_email = 'private-person@example.test'
        sentinel_secret = 'deploy_secret_super_private_123'
        sentinel_detail = 'Private member story and pricing note'

        class FailingClient:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, traceback):
                return False

            async def post(self, url, json):
                raise RuntimeError(f'{sentinel_email} {sentinel_secret}')

        fake_httpx = types.SimpleNamespace(AsyncClient=FailingClient)
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        original_handlers = list(deploy_hook.logger.handlers)
        original_propagate = deploy_hook.logger.propagate
        original_level = deploy_hook.logger.level
        try:
            deploy_hook.logger.handlers = [handler]
            deploy_hook.logger.propagate = False
            deploy_hook.logger.setLevel(logging.INFO)
            with patch.dict(sys.modules, {'httpx': fake_httpx}):
                asyncio.run(deploy_hook._post(
                    f'https://hooks.example.test/{sentinel_secret}',
                    'site_content',
                    sentinel_detail,
                ))
        finally:
            deploy_hook.logger.handlers = original_handlers
            deploy_hook.logger.propagate = original_propagate
            deploy_hook.logger.setLevel(original_level)

        output = stream.getvalue()
        self.assertIn('hook request failed', output)
        self.assertNotIn(sentinel_email, output)
        self.assertNotIn(sentinel_secret, output)
        self.assertNotIn(sentinel_detail, output)

    def test_deploy_hook_response_logs_do_not_log_caller_detail(self):
        sentinel_detail = 'Confidential article title for a private member'

        class ResponseClient:
            status_code = 200

            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, traceback):
                return False

            async def post(self, url, json):
                return types.SimpleNamespace(status_code=self.status_code)

        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        original_handlers = list(deploy_hook.logger.handlers)
        original_propagate = deploy_hook.logger.propagate
        original_level = deploy_hook.logger.level
        try:
            deploy_hook.logger.handlers = [handler]
            deploy_hook.logger.propagate = False
            deploy_hook.logger.setLevel(logging.INFO)
            fake_httpx = types.SimpleNamespace(AsyncClient=ResponseClient)
            with patch.dict(sys.modules, {'httpx': fake_httpx}):
                for status_code in (200, 503):
                    ResponseClient.status_code = status_code
                    asyncio.run(deploy_hook._post(
                        'https://hooks.example.test/redacted',
                        'blog_post',
                        sentinel_detail,
                    ))
        finally:
            deploy_hook.logger.handlers = original_handlers
            deploy_hook.logger.propagate = original_propagate
            deploy_hook.logger.setLevel(original_level)

        output = stream.getvalue()
        self.assertIn('rebuild requested for surface=blog_post', output)
        self.assertIn('hook returned status=503 for surface=blog_post', output)
        self.assertNotIn(sentinel_detail, output)

    def test_startup_index_handler_does_not_log_exception_text(self):
        sentinel_email = 'duplicate-person@example.test'
        sentinel_secret = 'mongodb_secret_super_private_456'
        tree = ast.parse(SERVER.read_text())
        startup = next(
            node for node in tree.body
            if isinstance(node, ast.AsyncFunctionDef) and node.name == 'startup'
        )
        index_try = next(
            node for node in ast.walk(startup)
            if isinstance(node, ast.Try) and 'unique_lead_identity' in ast.unparse(node)
        )
        self.assertIsNone(index_try.handlers[0].name)

        probe_handler = copy.deepcopy(index_try.handlers[0])
        probe = ast.AsyncFunctionDef(
            name='probe',
            args=ast.arguments(
                posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]
            ),
            body=[ast.Try(
                body=[ast.Raise(
                    exc=ast.Call(
                        func=ast.Name(id='RuntimeError', ctx=ast.Load()),
                        args=[ast.Constant(value=f'{sentinel_email} {sentinel_secret}')],
                        keywords=[],
                    ),
                    cause=None,
                )],
                handlers=[probe_handler],
                orelse=[],
                finalbody=[],
            )],
            decorator_list=[],
            returns=None,
            type_comment=None,
        )
        module = ast.fix_missing_locations(ast.Module(body=[probe], type_ignores=[]))
        stream = io.StringIO()
        logger = logging.getLogger('startup-index-privacy-test')
        logger.handlers = [logging.StreamHandler(stream)]
        logger.propagate = False
        logger.setLevel(logging.INFO)
        namespace = {'logger': logger, 'RuntimeError': RuntimeError}
        exec(compile(module, str(SERVER), 'exec'), namespace)
        asyncio.run(namespace['probe']())

        output = stream.getvalue()
        self.assertIn('Could not enforce one lead per email and location', output)
        self.assertNotIn(sentinel_email, output)
        self.assertNotIn(sentinel_secret, output)


if __name__ == '__main__':
    unittest.main()
