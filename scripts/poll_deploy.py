"""Poll a GenLayer deploy txId and persist only an executed deployment."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402

SUCCESS = {"FINISHED_WITH_RETURN", "FINISHED_WITHOUT_RETURN"}
DEAD = {"UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"}


def main():
    if len(sys.argv) > 1:
        tx_id = sys.argv[1]
    else:
        root = os.path.dirname(os.path.dirname(__file__))
        with open(os.path.join(root, "deploy_tx.txt"), encoding="utf-8") as source:
            tx_id = source.read().strip()
    client, _ = make_client()
    zero = "0x" + "0" * 40
    for index in range(240):
        tx = client.get_transaction(transaction_hash=tx_id)
        data = tx if isinstance(tx, dict) else tx.__dict__
        status = str(data.get("status_name"))
        execution = str(data.get("tx_execution_result_name"))
        recipient = data.get("recipient")
        print(f"[{index}] {status} execution={execution} recipient={recipient}", flush=True)
        if status in {"ACCEPTED", "FINALIZED"}:
            if execution not in SUCCESS:
                raise RuntimeError(f"deploy execution failed: {execution}")
            if not recipient or str(recipient).lower() == zero:
                raise RuntimeError("deploy succeeded without a contract address")
            root = os.path.dirname(os.path.dirname(__file__))
            with open(os.path.join(root, "deployment.json"), "w", encoding="utf-8") as output:
                json.dump({"tx": tx_id, "address": str(recipient)}, output, indent=2)
                output.write("\n")
            print("wrote deployment.json ->", recipient)
            return
        if status in DEAD:
            raise RuntimeError(f"deploy consensus failed: {status} ({execution})")
        time.sleep(8)
    raise TimeoutError("timed out polling deploy transaction")


if __name__ == "__main__":
    main()
