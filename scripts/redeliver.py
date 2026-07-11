"""Re-run deliver for cmsn-1 with a fee bump, capturing the gen txId reliably,
then poll the commission view until it settles. The URL-evidence path fetches
the page under consensus and the jury judges the fetched content."""
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

ADDR = "0x4653286d1B0F07A31D6ee3dbCDe648e4fbD4FDa3"
WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
URL = "https://docs.genlayer.com/"


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
        if method == "eth_sendRawTransaction":
            cap["eth"] = resp.get("result")
        return resp

    client.provider.make_request = wrapped
    try:
        for _ in range(50):
            try:
                client.write_contract(address=ADDR, function_name=fn, args=args)
                break
            except Exception:
                if cap.get("tx"):
                    break
                time.sleep(10)
    finally:
        client.provider.make_request = orig
    return cap.get("tx") or cap.get("eth")


def main():
    client, account = make_client()
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)

    rec = read_view(client, account, ADDR, "get_commission", ["cmsn-1"])
    print("status now:", rec.get("status"))
    if rec.get("status") != "ACCEPTED":
        print("not deliverable; abort")
        return

    tx = submit(wclient, "deliver", ["cmsn-1", URL])
    print("deliver tx:", tx)

    for i in range(200):
        try:
            rec = read_view(client, account, ADDR, "get_commission", ["cmsn-1"])
            st = rec.get("status")
            if i % 5 == 0:
                print(f"[{i}] {st}", flush=True)
            if st == "SETTLED":
                print("SETTLED ruling=", rec.get("ruling"),
                      "kind=", rec.get("evidence_kind"), "url=", rec.get("evidence_url"))
                print("settlement:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
                return
        except Exception:
            pass
        time.sleep(8)
    print("not settled in window")


if __name__ == "__main__":
    main()
