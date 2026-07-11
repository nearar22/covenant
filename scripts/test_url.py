"""End-to-end test of the URL-evidence path on the new contract:
  client posts a commission whose criteria describe a known public page,
  a worker accepts, then delivers a URL. The contract must fetch that page
  under consensus and the jury must judge the fetched content.

Uses fee bump + gen-txId capture to survive Bradbury congestion.
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

WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
STATUS = {"5": "ACCEPTED", "6": "UNDETERMINED", "7": "FINALIZED", "8": "CANCELED"}
TERMINAL = {"ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"}
ADDR = json.load(open(os.path.join(os.path.dirname(os.path.dirname(__file__)), "deployment.json")))["address"]


def submit(client, addr, fn, args):
    """Submit a write, capturing the gen txId and tolerating the SDK post-submit
    failure under congestion."""
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")
    captured = {}
    orig = client.provider.make_request

    def wrapped(method, params=None):
        resp = orig(method=method, params=params)
        if method == "eth_getTransactionReceipt" and isinstance(resp.get("result"), dict):
            try:
                evs = event.process_receipt(resp["result"], errors=DISCARD)
                if evs:
                    captured["tx"] = client.w3.to_hex(evs[0]["args"]["txId"])
            except Exception:
                pass
        return resp

    client.provider.make_request = wrapped
    try:
        for _ in range(40):
            try:
                client.write_contract(address=addr, function_name=fn, args=args)
                break
            except Exception as e:
                if captured.get("tx"):
                    break
                msg = str(e)
                if "backpressure" in msg or "not currently accepting" in msg or "-32603" in msg:
                    time.sleep(12)
                    continue
                # Some post-submit errors still leave us without a captured tx.
                time.sleep(6)
    finally:
        client.provider.make_request = orig
    return captured.get("tx")


def poll(client, tx, label, retries=120):
    last = None
    for _ in range(retries):
        try:
            res = client.provider.make_request(method="eth_getTransactionByHash", params=[tx])["result"]
            st = STATUS.get(str(res.get("status")), str(res.get("status")))
            if st != last:
                print(label, st, flush=True)
                last = st
            if st in TERMINAL:
                return st
        except Exception:
            pass
        time.sleep(6)
    print(label, "timeout")
    return None


def main():
    client, account = make_client()
    D._install_fee_bump(client)
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)
    print("contract", ADDR, "client", account.address, "worker", worker.address)

    # Commission whose acceptance criteria match a stable public page.
    title = "Point to the official GenLayer docs intro page"
    brief = "Provide a link to a page that clearly introduces what GenLayer is."
    criteria = ("The evidence page must be about GenLayer and must describe it as a blockchain or "
                "network for intelligent contracts / AI, mentioning validators or consensus. "
                "Judge the fetched page content, not the link text.")
    t1 = submit(client, ADDR, "post_commission", [title, brief, criteria, "5.0"])
    print("post tx", t1)
    poll(client, t1, "post")
    cid = "cmsn-1"
    print("commission:", json.dumps(read_view(client, account, ADDR, "get_commission", [cid]), default=str))

    t2 = submit(wclient, ADDR, "accept_commission", [cid])
    print("accept tx", t2)
    poll(wclient, t2, "accept")

    # Deliver a URL. The contract must fetch this page and judge its content.
    url = "https://docs.genlayer.com/"
    t3 = submit(wclient, ADDR, "deliver", [cid, url])
    print("deliver tx", t3)
    poll(wclient, t3, "deliver", retries=200)
    time.sleep(5)
    print("commission after:", json.dumps(read_view(client, account, ADDR, "get_commission", [cid]), default=str))
    print("settlements:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
    print("stats:", json.dumps(read_view(client, account, ADDR, "get_stats"), default=str))


if __name__ == "__main__":
    main()
