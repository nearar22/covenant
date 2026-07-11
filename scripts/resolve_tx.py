"""Resolve one eth tx hash to its gen txId and read status/recipient via SDK
get_transaction (triggered-tx decode neutralized)."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402
import genlayer_py.transactions.actions as txactions
txactions._decode_triggered_txs = lambda self, decoded: []
from web3.logs import DISCARD  # noqa: E402

ETH = sys.argv[1] if len(sys.argv) > 1 else open(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "deploy_tx.txt")).read().strip()


def main():
    client, account = make_client()
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")

    gen_id = None
    for _ in range(40):
        try:
            receipt = client.provider.make_request(method="eth_getTransactionReceipt", params=[ETH])["result"]
            if receipt and receipt.get("logs"):
                evs = event.process_receipt(receipt, errors=DISCARD)
                gen_id = client.w3.to_hex(evs[0]["args"]["txId"])
                break
        except Exception:
            pass
        time.sleep(6)
    print("gen txId:", gen_id)
    if not gen_id:
        return

    for i in range(120):
        try:
            d = client.get_transaction(transaction_hash=gen_id)
            d = d if isinstance(d, dict) else d.__dict__
            name = d.get("status_name")
            print(f"[{i}] {name} recipient={d.get('recipient')}", flush=True)
            if name in ("ACCEPTED", "FINALIZED") and d.get("recipient") \
                    and str(d.get("recipient")).lower() != "0x" + "0" * 40:
                root = os.path.dirname(os.path.dirname(__file__))
                with open(os.path.join(root, "deployment.json"), "w", encoding="utf-8") as f:
                    json.dump({"tx": gen_id, "address": str(d.get("recipient"))}, f, indent=2)
                print("wrote deployment.json ->", d.get("recipient"))
                return
            if name in ("UNDETERMINED", "CANCELED"):
                print("dead state:", name)
                return
        except Exception:
            pass
        time.sleep(8)


if __name__ == "__main__":
    main()
