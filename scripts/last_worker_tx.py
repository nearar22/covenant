"""Find the most recent deliver tx from the worker and inspect its consensus
result / leader receipt to see if the web render ran and why it did not settle."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402
import genlayer_py.transactions.actions as txactions
txactions._decode_triggered_txs = lambda self, decoded: []

WORKER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
STATUS = {"1": "PENDING", "2": "PROPOSING", "3": "COMMITTING", "4": "REVEALING",
          "5": "ACCEPTED", "6": "UNDETERMINED", "7": "FINALIZED", "8": "CANCELED", "14": "ACTIVATED"}


def rpc(client, method, params, tries=8):
    for _ in range(tries):
        try:
            return client.provider.make_request(method=method, params=params)["result"]
        except Exception:
            time.sleep(4)
    return None


def main():
    client, account = make_client()
    latest = int(client.w3.eth.block_number)
    # Scan recent blocks for a tx from the worker to our contract.
    found = None
    for b in range(latest, max(0, latest - 400), -1):
        blk = rpc(client, "eth_getBlockByNumber", [hex(b), True], tries=2)
        if not blk:
            continue
        for tx in blk.get("transactions", []):
            if isinstance(tx, dict) and (tx.get("from", "").lower() == WORKER.lower()):
                found = tx["hash"]
                print("found worker eth tx", found, "in block", b)
                break
        if found:
            break
    if not found:
        print("no recent worker tx found")
        return

    from web3.logs import DISCARD
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")
    receipt = rpc(client, "eth_getTransactionReceipt", [found])
    if not receipt or not receipt.get("logs"):
        print("no receipt/logs")
        return
    evs = event.process_receipt(receipt, errors=DISCARD)
    gen_id = client.w3.to_hex(evs[0]["args"]["txId"])
    print("gen txId:", gen_id)

    d = client.get_transaction(transaction_hash=gen_id)
    d = d if isinstance(d, dict) else d.__dict__
    print("status:", d.get("status_name"), "exec:", d.get("tx_execution_result_name"), "rounds:", d.get("num_of_rounds"))
    cons = d.get("consensus_data") or {}
    lr = cons.get("leader_receipt")
    if isinstance(lr, list):
        lr = lr[0] if lr else None
    if isinstance(lr, dict):
        print("leader keys:", list(lr.keys()))
        for k in ("execution_result", "result_name", "genvm_result", "result", "eq_outputs", "error", "stderr", "calldata"):
            if k in lr:
                print(k, "=", str(lr[k])[:500])
    else:
        print("consensus_data:", json.dumps(cons, default=str)[:1200])


if __name__ == "__main__":
    main()
