"""Resolve the deliver eth tx to its gen txId, then poll gen status via raw RPC
until the URL-evidence settlement lands."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402
from web3.logs import DISCARD  # noqa: E402

ADDR = "0x4653286d1B0F07A31D6ee3dbCDe648e4fbD4FDa3"
DELIVER_ETH = "0x126d477b11d1b853225e99f07c8a7a4f38da1cb9384b0d88df31c61ab94b82b2"
STATUS = {"1": "PENDING", "2": "PROPOSING", "3": "COMMITTING", "4": "REVEALING",
          "5": "ACCEPTED", "6": "UNDETERMINED", "7": "FINALIZED", "8": "CANCELED",
          "14": "ACTIVATED"}


def rpc(client, method, params, tries=12):
    for _ in range(tries):
        try:
            return client.provider.make_request(method=method, params=params)["result"]
        except Exception:
            time.sleep(4)
    return None


def main():
    client, account = make_client()
    consensus = client.w3.eth.contract(abi=client.chain.consensus_main_contract["abi"])
    event = consensus.get_event_by_name("NewTransaction")
    receipt = rpc(client, "eth_getTransactionReceipt", [DELIVER_ETH])
    gen_id = None
    if receipt:
        try:
            evs = event.process_receipt(receipt, errors=DISCARD)
            gen_id = client.w3.to_hex(evs[0]["args"]["txId"])
        except Exception as e:
            print("event err", e)
    print("deliver gen txId:", gen_id)

    for i in range(180):
        if gen_id:
            res = rpc(client, "eth_getTransactionByHash", [gen_id], tries=3)
            st = STATUS.get(str(res.get("status")), str(res.get("status"))) if res else "rpc?"
            print(f"[{i}] deliver {st}", flush=True)
        try:
            rec = read_view(client, account, ADDR, "get_commission", ["cmsn-1"])
            if rec.get("status") == "SETTLED":
                print("SETTLED ruling=", rec.get("ruling"),
                      "evidence_kind=", rec.get("evidence_kind"),
                      "evidence_url=", rec.get("evidence_url"))
                print("settlement:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
                return
        except Exception:
            pass
        time.sleep(8)
    print("still not settled")


if __name__ == "__main__":
    main()
