"""A CSV import that wrote nothing must not answer that it imported everything.

The endpoint used to end like this:

    except Exception as bulk_err:
        imported = getattr(getattr(bulk_err, 'details', {}), 'get',
                           lambda *a: len(docs_to_insert))('nInserted', len(docs_to_insert))

The lambda was unreachable. `getattr(exc, 'details', {})` returns `{}` for any
exception that is not a pymongo BulkWriteError, an empty dict always has a
`.get` attribute, so the third argument to getattr was never used. What ran was
`{}.get('nInserted', len(docs_to_insert))`, and with the key absent that is the
full row count.

So a dropped connection, a write concern timeout or a server selection failure
in the middle of an import answered `imported: 2000` having written nothing. The
staff member closes the tab. The leads are gone and the response said it worked.

These tests drive the two failure shapes through the real endpoint with a
patched database, because the bug lived in the difference between them and
nothing else in the suite told them apart.
"""

import asyncio
import io
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

ENV = {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'scs_lead_import_test',
    'FRONTEND_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
    'JWT_SECRET': 'x' * 40,
    'UNSUBSCRIBE_SECRET': 'y' * 40,
}

CSV = b"name,email,phone\nA Person,a@example.com,4085550101\nB Person,b@example.com,4085550102\n"


def _load_server():
    for key, value in ENV.items():
        os.environ[key] = value
    for key in [k for k in os.environ if k.startswith('ALLOW_')]:
        del os.environ[key]
    for module in [m for m in list(sys.modules) if m in ('server', 'runtime_safety')]:
        del sys.modules[module]
    import server  # noqa: E402
    return server


server = _load_server()


class _EmptyCursor:
    """An async cursor over nothing, so the duplicate lookup finds no matches."""

    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


class _Leads:
    """Stands in for db.leads. Reads succeed and find nothing, the write fails."""

    def __init__(self, error):
        self._error = error

    def find(self, *args, **kwargs):
        return _EmptyCursor()

    async def find_one(self, *args, **kwargs):
        return None

    async def insert_many(self, docs, ordered=True):
        raise self._error


class _Db:
    def __init__(self, error):
        self.leads = _Leads(error)


STAFF = {'id': 'staff-1', 'name': 'Test Staff', 'email': 'staff@example.com', 'role': 'admin'}


def _run_import(error):
    """Calls the real endpoint function with a database that fails on write."""
    upload = mock.Mock()
    upload.filename = 'leads.csv'

    async def read():
        return CSV

    upload.read = read
    with mock.patch.object(server, 'db', _Db(error)):
        return asyncio.run(server.import_leads_csv(file=upload, user=STAFF))


class LeadImportReportingTests(unittest.TestCase):
    def test_a_total_write_failure_is_not_reported_as_a_successful_import(self):
        """The regression. A connection failure used to answer imported: 2."""
        from pymongo.errors import AutoReconnect
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as caught:
            _run_import(AutoReconnect('connection lost'))

        self.assertEqual(caught.exception.status_code, 503)
        detail = str(caught.exception.detail)
        self.assertIn('No leads were saved', detail)

    def test_the_failure_tells_the_staff_member_whether_to_retry(self):
        """A person who just lost an import needs to know if a retry duplicates."""
        from pymongo.errors import AutoReconnect
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as caught:
            _run_import(AutoReconnect('connection lost'))

        self.assertIn('again', str(caught.exception.detail).lower())

    def test_a_partial_write_reports_the_count_the_database_actually_reported(self):
        """BulkWriteError is the one case where a number is knowable. Use it."""
        from pymongo.errors import BulkWriteError

        error = BulkWriteError({
            'nInserted': 1,
            'writeErrors': [{'index': 1, 'errmsg': 'duplicate key'}],
        })
        result = _run_import(error)

        self.assertEqual(result['imported'], 1)
        self.assertTrue(
            any('duplicate key' in str(item) for item in result['errors']),
            f"the rejected row should be reported back, got {result['errors']}",
        )

    def test_a_partial_write_never_claims_more_than_the_database_confirmed(self):
        """nInserted is the ceiling. Reading past it is how the bug looked plausible."""
        from pymongo.errors import BulkWriteError

        result = _run_import(BulkWriteError({'nInserted': 0, 'writeErrors': []}))
        self.assertEqual(result['imported'], 0)


if __name__ == '__main__':
    unittest.main()
