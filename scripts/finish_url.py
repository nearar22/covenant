"""Resume the URL-evidence test: commission cmsn-1 already exists on the new
contract. Worker accepts, then delivers a URL; the contract fetches the page
under consensus and the jury judges the fetched content."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402
import deploy as D  # noqa: E402
from test_url import submit, poll, ADDR  # noqa: E402

from genlayer_py import create_client, create_account  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402

WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"


def main():
    client, account = make_client()
    D._install_fee_bump(client)
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    D._install_fee_bump(wclient)
    cid = "cmsn-1"
    rec = read_view(client, account, ADDR, "get_commission", [cid])
    print("commission status:", rec.get("status"))

    if rec.get("status") == "OPEN":
        t2 = submit(wclient, ADDR, "accept_commission", [cid])
        print("accept tx", t2)
        poll(wclient, t2, "accept")
        rec = read_view(client, account, ADDR, "get_commission", [cid])
        print("after accept:", rec.get("status"), rec.get("worker"))

    if rec.get("status") == "ACCEPTED":
        url = "https://docs.genlayer.com/"
        t3 = submit(wclient, ADDR, "deliver", [cid, url])
        print("deliver tx", t3)
        poll(wclient, t3, "deliver", retries=240)
        time.sleep(6)

    print("FINAL commission:", json.dumps(read_view(client, account, ADDR, "get_commission", [cid]), default=str))
    print("settlements:", json.dumps(read_view(client, account, ADDR, "get_settlements", [0]), default=str))
    print("stats:", json.dumps(read_view(client, account, ADDR, "get_stats"), default=str))


if __name__ == "__main__":
    main()
