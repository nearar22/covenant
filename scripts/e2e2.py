"""Resume e2e on the fresh contract. Submit writes with backpressure retry
(same technique as deploy), then wait on the get_commission VIEW."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402
import deploy as D  # noqa: E402

from genlayer_py import create_client, create_account  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402

ADDR = "0xDAB382784a0Ec12BD6415cf968f0Cc4598f558cB"
WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
URL = "https://docs.genlayer.com/"
CID = "cmsn-1"


def fire(client, fn, args):
    """Submit, capturing the raw eth send so backpressure can be retried; once
    the node accepts the raw tx we stop retrying and let consensus run."""
    cap = {}
    orig = client.provider.make_request

    def wrapped(method, params=None):
        resp = orig(method=method, params=params)
        if method == "eth_sendRawTransaction" and resp.get("result"):
            cap["sent"] = resp["result"]
        return resp

    client.provider.make_request = wrapped
    try:
        for _ in range(40):
            try:
                client.write_contract(address=ADDR, function_name=fn, args=args)
                return True
            except Exception as e:
                if cap.get("sent"):
                    return True  # broadcast ok; SDK just failed post-submit wait
                msg = str(e)
                if "backpressure" in msg or "not currently accepting" in msg or "-32603" in msg:
                    time.sleep(12)
                    continue
                print("  submit err:", msg[:70])
                time.sleep(8)
    finally:
        client.provider.make_request = orig
    return cap.get("sent") is not None


def wait_status(client, account, want, timeout=2400):
    t0 = time.time()
    last = None
    while time.time() - t0 < timeout:
        try:
            rec = read_view(client, account, ADDR, "get_commission", [CID])
            st = rec.get("status")
            if st != last:
                print("  status:", st, flush=True)
                last = st
            if st in want:
                return rec
        except Exception:
            pass
        time.sleep(8)
    return None


def main():
    client, account = make_client()
    D._install_fee_bump(client)
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)

    rec = read_view(client, account, ADDR, "get_commission", [CID])
    print("start status:", rec.get("status"))

    if rec.get("status") == "OPEN":
        print("accepting...")
        fire(wclient, "accept_commission", [CID])
        rec = wait_status(client, account, {"ACCEPTED", "SETTLED"})

    if rec and rec.get("status") == "ACCEPTED":
        print("delivering URL:", URL)
        fire(wclient, "deliver", [CID, URL])
        rec = wait_status(client, account, {"SETTLED"})

    print("FINAL:", json.dumps(read_view(client, account, ADDR, "get_commission", [CID]), default=str))
    print("settlements:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
    print("stats:", json.dumps(read_view(client, account, ADDR, "get_stats"), default=str))


if __name__ == "__main__":
    main()
