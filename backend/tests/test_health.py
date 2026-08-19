import asyncio
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from health import readiness_report  # noqa: E402


class FakeDatabase:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.commands = []

    async def command(self, command):
        self.commands.append(command)
        if self.error:
            raise self.error
        return self.response


class HealthTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_ready_report_is_minimal_and_read_only(self):
        database = FakeDatabase({'ok': 1, 'host': 'private-db.example.test'})
        report, ready = self.run_async(
            readiness_report(
                database,
                database_writes_enabled=True,
                deploy_hook_enabled=True,
            )
        )

        self.assertTrue(ready)
        self.assertEqual(database.commands, ['ping'])
        self.assertEqual(report, {
            'status': 'ready',
            'service': 'ready',
            'database': 'ready',
            'deploy_hook': True,
        })
        self.assertNotIn('private-db.example.test', repr(report))

    def test_database_failure_is_generic_and_not_ready(self):
        secret_text = 'mongodb://user:secret@private-db.example.test'
        report, ready = self.run_async(readiness_report(
            FakeDatabase(error=RuntimeError(secret_text)),
            database_writes_enabled=True,
            deploy_hook_enabled=False,
        ))

        self.assertFalse(ready)
        self.assertEqual(report['status'], 'not_ready')
        self.assertEqual(report['database'], 'not_ready')
        self.assertNotIn(secret_text, repr(report))

    def test_reachable_database_is_not_ready_when_writes_are_disabled(self):
        database = FakeDatabase({'ok': 1})
        report, ready = self.run_async(readiness_report(
            database,
            database_writes_enabled=False,
            deploy_hook_enabled=False,
        ))

        self.assertFalse(ready)
        self.assertEqual(report['status'], 'not_ready')
        self.assertEqual(report['database'], 'not_ready')


if __name__ == '__main__':
    unittest.main()
