"""Deliver the URL for cmsn-1, capturing the gen txId, retrying on backpressure,
then poll the commission VIEW until SETTLED. Also resolves the deliver tx status
so we can see ACCEPTED vs UNDETERMINED."""
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

ADDR = "0xDAB382784a0Ec12BD6415cf968f0Cc4598f558cB"
WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
URL = "https://docs.genlayer.com/"
CID = "cmsn-1"
STATUS = {"1": "PENDING", "2": "PROPOSING", "3": "COMMITTING", "4": "REVEALING",
          "5": "ACCEPTED", "6": "UNDETERMINED", "7": "FINALIZED", "8": "CANCELED", "14": "ACTIVATED"}


def main():
    client, account = make_client()
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)

    consensus = wclient.w3.eth.contract(abi=wclient.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")
    cap = {}
    orig = wclient.provider.make_request

    def wrapped(method, params=None):
        resp = orig(method=method, params=params)
        if method == "eth_getTransactionReceipt" and isinstance(resp.get("result"), dict):
            try:
                evs = event.process_receipt(resp["result"], errors=DISCARD)
                if evs:
                    cap["gen"] = wclient.w3.to_hex(evs[0]["args"]["txId"])
            except Exception:
                pass
        return resp

    wclient.provider.make_request = wrapped
    try:
        for _ in range(40):
            try:
                wclient.write_contract(address=ADDR, function_name="deliver", args=[CID, URL])
                break
            except Exception as e:
                if cap.get("gen"):
                    break
                if any(s in str(e) for s in ("backpressure", "not currently accepting", "-32603")):
                    time.sleep(12); continue
                time.sleep(6)
    finally:
        wclient.provider.make_request = orig

    gen = cap.get("gen")
    print("deliver gen txId:", gen, flush=True)

    t0 = time.time()
    last = None
    while time.time() - t0 < 2400:
        # tx status
        if gen:
            try:
                res = client.provider.make_request(method="eth_getTransactionByHash", params=[gen])["result"]
                st = STATUS.get(str(res.get("status")), str(res.get("status")))
                if st != last:
                    print("deliver tx:", st, flush=True)
                    last = st
            except Exception:
                pass
        # settlement view
        try:
            rec = read_view(client, account, ADDR, "get_commission", [CID])
            if rec.get("status") == "SETTLED":
                print("SETTLED! ruling=", rec.get("ruling"), "kind=", rec.get("evidence_kind"), "url=", rec.get("evidence_url"))
                print("settlement:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
                return
        except Exception:
            pass
        time.sleep(8)
    print("timed out; final:", json.dumps(read_view(client, account, ADDR, "get_commission", [CID]), default=str))


if __name__ == "__main__":
    main()
