"""Inspect the UNDETERMINED deliver tx: map eth->gen, then dump the leader
receipt execution result / stderr to find the real failure in the deliver path."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402
import genlayer_py.transactions.actions as txactions
txactions._decode_triggered_txs = lambda self, decoded: []
from web3.logs import DISCARD  # noqa: E402

ETH = sys.argv[1] if len(sys.argv) > 1 else "0x97afd08baf315bcf83065346806bfb9b89ab2fdefaa849c00554d8120a216702"


def rpc(client, method, params, tries=25):
    for _ in range(tries):
        try:
            r = client.provider.make_request(method=method, params=params)
            return r["result"]
        except Exception as e:
            time.sleep(4)
    return None


def main():
    client, account = make_client()
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")

    receipt = None
    for _ in range(25):
        receipt = rpc(client, "eth_getTransactionReceipt", [ETH], tries=1)
        if receipt and receipt.get("logs"):
            break
        time.sleep(4)
    if not receipt or not receipt.get("logs"):
        print("no receipt; abort")
        return
    evs = event.process_receipt(receipt, errors=DISCARD)
    gen_id = client.w3.to_hex(evs[0]["args"]["txId"])
    print("gen txId:", gen_id)

    d = None
    for _ in range(15):
        try:
            d = client.get_transaction(transaction_hash=gen_id)
            break
        except Exception as e:
            time.sleep(4)
    if not d:
        print("no gen tx")
        return
    d = d if isinstance(d, dict) else d.__dict__
    print("status:", d.get("status_name"), "exec:", d.get("tx_execution_result_name"))
    print("rounds:", d.get("num_of_rounds"))

    cons = d.get("consensus_data") or {}
    lr = cons.get("leader_receipt")
    if isinstance(lr, list):
        for i, one in enumerate(lr):
            print(f"--- leader receipt [{i}] ---")
            dump_lr(one)
    elif lr:
        dump_lr(lr)
    else:
        print("no leader receipt; full consensus_data:")
        print(json.dumps(cons, default=str)[:1500])


def dump_lr(lr):
    if not isinstance(lr, dict):
        print("lr:", str(lr)[:300]); return
    print("keys:", list(lr.keys()))
    for k in ("execution_result", "result_name", "mode", "vote"):
        if k in lr:
            print(k, "=", lr[k])
    for k in ("genvm_result", "result", "eq_outputs", "error", "stderr", "stdout", "calldata"):
        if k in lr:
            print(k, "=", str(lr[k])[:600])


if __name__ == "__main__":
    main()
