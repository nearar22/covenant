"""Read gen tx status/recipient via SDK get_transaction with a patched
_decode_triggered_txs (the flaky get_logs path is what crashes) and retries."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402

# Neutralize the triggered-tx decode that calls flaky eth_getLogs.
import genlayer_py.transactions.actions as txactions
txactions._decode_triggered_txs = lambda self, decoded: []

GEN_IDS = [
    "0xc81bdc95af900feed05a36ee8bfa2ea6c779eee18b35cd1059dd08f3bb7a40e9",
    "0x1b61f056e482b66bdd43ec785a3d269ebc7ea61cc593e6230f2eb48504b9b3a1",
    "0x520db3929becfae84f48aca42acbb9f9f18b076d09d49149c74c8194b76bb3c3",
]


def main():
    client, account = make_client()
    for gen_id in GEN_IDS:
        for _ in range(8):
            try:
                d = client.get_transaction(transaction_hash=gen_id)
                d = d if isinstance(d, dict) else d.__dict__
                print(gen_id[:10], d.get("status_name"), "recipient", d.get("recipient"))
                if d.get("status_name") in ("ACCEPTED", "FINALIZED") and d.get("recipient") \
                        and str(d.get("recipient")).lower() != "0x" + "0" * 40:
                    root = os.path.dirname(os.path.dirname(__file__))
                    with open(os.path.join(root, "deployment.json"), "w", encoding="utf-8") as f:
                        json.dump({"tx": gen_id, "address": str(d.get("recipient"))}, f, indent=2)
                    print("wrote deployment.json ->", d.get("recipient"))
                    return
                break
            except Exception as e:
                print("  retry", str(e)[:50], flush=True)
                time.sleep(4)


if __name__ == "__main__":
    main()
