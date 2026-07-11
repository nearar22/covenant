import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402

TX = sys.argv[1] if len(sys.argv) > 1 else "0xdb5d8a52f7fc267533b6525ecdd2851bf8abf3f6a0460c6e2311ff9944e1e1a4"

client, account = make_client()
for attempt in range(10):
    try:
        res = client.get_transaction(transaction_hash=TX)
        d = res if isinstance(res, dict) else res.__dict__
        print("KEYS:", list(d.keys()))
        for k in ("status", "status_name", "recipient", "tx_execution_result_name", "data"):
            print(k, "=", d.get(k) if isinstance(d, dict) else getattr(res, k, None))
        print(json.dumps(d, default=str)[:1500])
        break
    except Exception as e:
        print("attempt", attempt, "ERR", type(e).__name__, e)
        time.sleep(6)
