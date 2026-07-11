"""Full end-to-end test on the freshly deployed contract:
  1. client posts a commission whose criteria describe a public page
  2. worker accepts
  3. worker delivers a URL; the contract renders that page under an
     equivalence-principle block and the jury judges the fetched content
Prints the settlement so we can confirm evidence_kind == 'url' on-chain.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402
import deploy as D  # noqa: E402
from web3.logs import DISCARD  # noqa: E402

from genlayer_py import create_client, create_account  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402
import genlayer_py.transactions.actions as txactions  # noqa: E402
txactions._decode_triggered_txs = lambda self, decoded: []

ADDR = json.load(open(os.path.join(os.path.dirname(os.path.dirname(__file__)), "deployment.json")))["address"]
WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
URL = "https://docs.genlayer.com/"
STATUS = {"1": "PENDING", "2": "PROPOSING", "3": "COMMITTING", "4": "REVEALING",
          "5": "ACCEPTED", "6": "UNDETERMINED", "7": "FINALIZED", "8": "CANCELED", "14": "ACTIVATED"}


def submit(client, fn, args):
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")
    cap = {}
    orig = client.provider.make_request

    def wrapped(method, params=None):
        resp = orig(method=method, params=params)
        if method == "eth_getTransactionReceipt" and isinstance(resp.get("result"), dict):
            try:
                evs = event.process_receipt(resp["result"], errors=DISCARD)
                if evs:
                    cap["tx"] = client.w3.to_hex(evs[0]["args"]["txId"])
            except Exception:
                pass
        return resp

    client.provider.make_request = wrapped
    try:
        for _ in range(30):
            try:
                client.write_contract(address=ADDR, function_name=fn, args=args)
                break
            except Exception:
                if cap.get("tx"):
                    break
                time.sleep(10)
    finally:
        client.provider.make_request = orig
    return cap.get("tx")


def poll(client, tx, label, retries=160):
    last = None
    for _ in range(retries):
        try:
            res = client.provider.make_request(method="eth_getTransactionByHash", params=[tx])["result"]
            st = STATUS.get(str(res.get("status")), str(res.get("status")))
            if st != last:
                print(label, st, flush=True)
                last = st
            if st in ("ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"):
                return st
        except Exception:
            pass
        time.sleep(6)
    return None


def main():
    client, account = make_client()
    D._install_fee_bump(client)
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)
    print("contract", ADDR)

    title = "Point to the official GenLayer docs"
    brief = "Provide a link to a page that clearly introduces what GenLayer is."
    criteria = ("The fetched page must be about GenLayer and describe it as a blockchain or "
                "network for intelligent contracts / AI. Judge the fetched page content.")
    t1 = submit(client, "post_commission", [title, brief, criteria, "5.0"])
    print("post", t1); poll(client, t1, "post")
    cid = "cmsn-1"

    t2 = submit(wclient, "accept_commission", [cid])
    print("accept", t2); poll(wclient, t2, "accept")

    t3 = submit(wclient, "deliver", [cid, URL])
    print("deliver", t3); poll(wclient, t3, "deliver", retries=220)
    time.sleep(6)

    rec = read_view(client, account, ADDR, "get_commission", [cid])
    print("FINAL:", json.dumps(rec, default=str))
    print("settlements:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
    print("stats:", json.dumps(read_view(client, account, ADDR, "get_stats"), default=str))


if __name__ == "__main__":
    main()
