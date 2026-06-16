"""Seed extra commissions and a second worker agent with varied outcomes so the
console shows a populated dossier rail, radar, and settlement stream."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402

from genlayer_py import create_client, create_account  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402
import genlayer_py.types.transactions as T  # noqa: E402
from genlayer_py.types.transactions import TransactionStatus  # noqa: E402
for code in ("9", "10", "11", "14", "15", "16"):
    T.TRANSACTION_STATUS_NUMBER_TO_NAME.setdefault(code, TransactionStatus.LEADER_TIMEOUT)

# A third deterministic test key for a second worker agent.
WORKER2_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
TERMINAL = {"ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"}


def poll(client, tx, label, retries=240):
    last = None
    for i in range(retries):
        try:
            full = client.get_transaction(transaction_hash=tx)
            if not isinstance(full, dict):
                full = dict(full)
            name = str(full.get("status_name"))
            if name != last:
                print(label, "status=", name)
                last = name
            if name in TERMINAL:
                print(label, "FINAL", name, full.get("tx_execution_result_name"))
                return name
        except Exception as e:
            print(label, "pollerr", repr(e)[:100])
        time.sleep(6)
    return None


def fund(client, account, target, gen):
    w3 = client.w3
    if int(client.get_balance(target)) >= gen * 10**18:
        return
    nonce = w3.eth.get_transaction_count(account.address)
    tx = {
        "from": account.address, "to": target, "value": gen * 10**18,
        "nonce": nonce, "gas": 21000, "gasPrice": int(w3.eth.gas_price), "chainId": 4221,
    }
    signed = account.sign_transaction(tx)
    txh = w3.eth.send_raw_transaction(signed.raw_transaction)
    w3.eth.wait_for_transaction_receipt(txh, timeout=180)
    print("funded", target, gen)


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = json.load(open(os.path.join(root, "deployment.json")))["address"]
    client, account = make_client()
    w2 = create_account(account_private_key=WORKER2_PK)
    c2 = create_client(chain=testnet_bradbury, account=w2)
    fund(client, account, w2.address, 8)
    print("worker2:", w2.address)

    # Commission 2: data pipeline spec, worker2 delivers a weak/partial answer.
    t2 = client.write_contract(
        address=addr, function_name="post_commission",
        args=[
            "Design a retry policy for a flaky payments webhook",
            "Specify a concrete retry-and-backoff policy for a webhook consumer that sometimes receives duplicate or out-of-order payment events.",
            "Must cover: exponential backoff with jitter, a max attempt ceiling, idempotency keys to dedupe, and a dead-letter path. Concrete numbers required.",
            "5.0",
        ],
    )
    poll(client, t2, "post2")
    cid2 = "cmsn-2"
    ta = c2.write_contract(address=addr, function_name="accept_commission", args=[cid2])
    poll(c2, ta, "accept2")
    weak = (
        "Just retry the webhook a few times until it works. Add some waiting between tries so "
        "you do not hammer the server. If it still fails, log it somewhere and move on."
    )
    td = c2.write_contract(address=addr, function_name="deliver", args=[cid2, weak])
    poll(c2, td, "deliver2")

    # Commission 3: open, left for the live UI to show an OPEN row.
    t3 = client.write_contract(
        address=addr, function_name="post_commission",
        args=[
            "Audit a smart contract access-control modifier",
            "Review a Solidity onlyOwner-style modifier and report whether it correctly restricts a privileged mint function.",
            "Must identify whether the modifier is applied to the function, whether ownership transfer is guarded, and give a clear verdict with reasoning.",
            "9.0",
        ],
    )
    poll(client, t3, "post3")

    time.sleep(5)
    print("stats:", json.dumps(read_view(client, account, addr, "get_stats"), default=str))
    print("agents:", json.dumps(read_view(client, account, addr, "get_agents", [0]), default=str))
    print("SEED DONE")


if __name__ == "__main__":
    main()
