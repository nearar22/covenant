"""Poll the deploy tx via SDK get_transaction (gen status), tolerating transient
RPC errors. Writes deployment.json once the tx is ACCEPTED/FINALIZED."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402

TERMINAL = {"ACCEPTED", "FINALIZED"}
DEAD = {"UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"}

TX = sys.argv[1] if len(sys.argv) > 1 else "0xdb5d8a52f7fc267533b6525ecdd2851bf8abf3f6a0460c6e2311ff9944e1e1a4"


def main():
    client, account = make_client()
    zero = "0x" + "0" * 40
    for i in range(240):
        try:
            res = client.get_transaction(transaction_hash=TX)
            d = res if isinstance(res, dict) else res.__dict__
            name = d.get("status_name")
            recipient = d.get("recipient")
            exec_name = d.get("tx_execution_result_name")
            print(f"[{i}] {name} exec={exec_name} recipient={recipient}", flush=True)
            if name in TERMINAL and recipient and str(recipient).lower() != zero:
                root = os.path.dirname(os.path.dirname(__file__))
                with open(os.path.join(root, "deployment.json"), "w", encoding="utf-8") as f:
                    json.dump({"tx": TX, "address": str(recipient)}, f, indent=2)
                print("wrote deployment.json ->", recipient)
                return
            if name in DEAD:
                print("tx reached dead state:", name)
                return
        except Exception as e:
            print(f"[{i}] poll err:", type(e).__name__, str(e)[:80], flush=True)
        time.sleep(8)
    print("timed out polling")


if __name__ == "__main__":
    main()
