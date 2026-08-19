#!/usr/bin/env python3
import json
import os
from urllib.parse import urlparse

from pymongo import MongoClient


mongo_url = os.environ.get("SCS_LOCAL_MONGO_URL", "mongodb://127.0.0.1:27018")
parsed = urlparse(mongo_url)
if parsed.hostname != "127.0.0.1":
    raise SystemExit("SCS_LOCAL_MONGO_URL must use 127.0.0.1")

client = MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
try:
    result = client.admin.command("ping")
    hello = client.admin.command("hello")
    print(
        json.dumps(
            {
                "ok": result.get("ok"),
                "address": f"127.0.0.1:{parsed.port or 27017}",
                "isWritablePrimary": hello.get("isWritablePrimary"),
                "maxWireVersion": hello.get("maxWireVersion"),
            },
            sort_keys=True,
        )
    )
finally:
    client.close()
