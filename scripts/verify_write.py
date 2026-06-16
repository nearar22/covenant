"""Execute the real on-chain Covenant flow on Bradbury:
  client posts a commission, a separate funded worker accepts and delivers,
  and the AI jury settles it under consensus. Tolerant of non-terminal timeouts.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view, load_pk  # noqa: E402

from genlayer_py import create_client, create_account  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402
import genlayer_py.types.transactions as T  # noqa: E402
from genlayer_py.types.transactions import TransactionStatus  # noqa: E402
for code in ("9", "10", "11", "14", "15", "16"):
    T.TRANSACTION_STATUS_NUMBER_TO_NAME.setdefault(code, TransactionStatus.LEADER_TIMEOUT)

# A deterministic secondary worker key (test-only, not the funded deployer).
WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

OUT = os.path.join(os.path.dirname(__file__), "..", "write_out.txt")
TERMINAL = {"ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"}

lines = []


def log(m):
    lines.append(str(m))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(m)


def poll(client, tx, label, retries=240):
    last = None
    for i in range(retries):
        try:
            full = client.get_transaction(transaction_hash=tx)
            if not isinstance(full, dict):
                full = dict(full)
            name = str(full.get("status_name"))
            if name != last:
                log(label + " status=" + name)
                last = name
            if name in TERMINAL:
                log(label + " FINAL status=" + name + " exec=" + str(full.get("tx_execution_result_name")))
                return name
        except Exception as e:
            log(label + " poll err " + repr(e)[:140])
        time.sleep(6)
    log(label + " TIMED OUT")
    return None


def main():
    addr = sys.argv[1] if len(sys.argv) > 1 else json.load(open(os.path.join(os.path.dirname(os.path.dirname(__file__)), "deployment.json")))["address"]
    client, account = make_client()

    worker_account = create_account(account_private_key=WORKER_PK)
    worker_client = create_client(chain=testnet_bradbury, account=worker_account)
    log("addr=" + addr + " client=" + account.address + " worker=" + worker_account.address)

    # Fund the worker from the deployer so it can cover the AI-write fee reserve.
    try:
        wbal = int(client.get_balance(worker_account.address))
        log("worker balance: " + str(wbal / 10**18))
        if wbal < 6 * 10**18:
            ftx = client.send_transaction(to=worker_account.address, value=8 * 10**18)
            log("fund worker tx=" + str(ftx))
            try:
                client.wait_for_transaction_receipt(transaction_hash=ftx, status=TransactionStatus.ACCEPTED, interval=4000, retries=120)
            except Exception as e:
                log("fund wait err: " + repr(e)[:160])
            time.sleep(4)
            log("worker balance after: " + str(int(client.get_balance(worker_account.address)) / 10**18))
    except Exception as e:
        log("fund err: " + repr(e)[:240])

    # 1. client posts a commission
    title = "Summarize the GenLayer consensus model in plain language"
    brief = "Write a concise explainer of how GenLayer validators reach consensus on an AI judgment, for a developer new to the platform."
    criteria = "Must mention a leader proposing a result, validators independently re-running it, agreement within tolerance, and that the AI verdict is the on-chain settlement. Accurate, no fabrication."
    tx1 = client.write_contract(address=addr, function_name="post_commission", args=[title, brief, criteria, "12.5"])
    log("post_commission tx=" + str(tx1))
    poll(client, tx1, "post_commission")
    cid = "cmsn-1"
    try:
        log("commission: " + json.dumps(read_view(client, account, addr, "get_commission", [cid]), default=str))
    except Exception as e:
        log("read err: " + repr(e)[:200])

    # 2. worker accepts
    tx2 = worker_client.write_contract(address=addr, function_name="accept_commission", args=[cid])
    log("accept_commission tx=" + str(tx2))
    poll(worker_client, tx2, "accept_commission")

    # 3. worker delivers (real LLM jury consensus)
    deliverable = (
        "In GenLayer, one validator is chosen as the leader for a transaction and proposes a "
        "result, such as an AI judgment over submitted evidence. Every other validator then "
        "independently re-runs the same task and compares its outcome against the leader's, "
        "agreeing only when the decisive fields match exactly and any numeric scores fall within "
        "a defined tolerance. When a majority agrees, that AI verdict is committed as the "
        "authoritative on-chain settlement: it is the state transition itself, not a hint. This "
        "lets a contract settle subjective, evidence-based outcomes without trusting any single "
        "node or an off-chain server."
    )
    tx3 = worker_client.write_contract(address=addr, function_name="deliver", args=[cid, deliverable])
    log("deliver tx=" + str(tx3))
    poll(worker_client, tx3, "deliver")
    time.sleep(5)
    try:
        log("commission after deliver: " + json.dumps(read_view(client, account, addr, "get_commission", [cid]), default=str))
        log("agent dossier: " + json.dumps(read_view(client, account, addr, "get_agent", [worker_account.address]), default=str))
        log("stats: " + json.dumps(read_view(client, account, addr, "get_stats"), default=str))
        log("settlements: " + json.dumps(read_view(client, account, addr, "get_settlements", [0]), default=str))
    except Exception as e:
        log("read err2: " + repr(e)[:200])
    log("WRITE VERIFY DONE")


if __name__ == "__main__":
    main()
