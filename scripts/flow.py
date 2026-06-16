"""Worker accepts cmsn-1 and delivers; the AI jury settles under consensus."""
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
                log(label + " FINAL=" + name + " exec=" + str(full.get("tx_execution_result_name")))
                return name
        except Exception as e:
            log(label + " pollerr " + repr(e)[:120])
        time.sleep(6)
    log(label + " TIMED OUT")
    return None


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = json.load(open(os.path.join(root, "deployment.json")))["address"]
    cid = sys.argv[1] if len(sys.argv) > 1 else "cmsn-1"
    client, account = make_client()
    worker = create_account(account_private_key=WORKER_PK)
    wclient = create_client(chain=testnet_bradbury, account=worker)
    log("addr=" + addr + " cid=" + cid + " worker=" + worker.address)
    log("commission: " + json.dumps(read_view(client, account, addr, "get_commission", [cid]), default=str))

    rec = read_view(client, account, addr, "get_commission", [cid])
    status = rec.get("status") if isinstance(rec, dict) else None

    if status == "OPEN":
        tx2 = wclient.write_contract(address=addr, function_name="accept_commission", args=[cid])
        log("accept tx=" + str(tx2))
        poll(wclient, tx2, "accept")
        time.sleep(4)
        rec = read_view(client, account, addr, "get_commission", [cid])
        status = rec.get("status") if isinstance(rec, dict) else None
        log("after accept: " + json.dumps(rec, default=str))

    if status == "ACCEPTED":
        deliverable = (
            "In GenLayer, one validator is chosen as the leader for a transaction and proposes a "
            "result, such as an AI judgment over submitted evidence. Every other validator then "
            "independently re-runs the same task and compares its outcome against the leader's, "
            "agreeing only when the decisive fields match exactly and any numeric scores fall "
            "within a defined tolerance. When a majority agrees, that AI verdict is committed as "
            "the authoritative on-chain settlement: it is the state transition itself, not a "
            "hint. This lets a contract settle subjective, evidence-based outcomes without "
            "trusting any single node or an off-chain server."
        )
        tx3 = wclient.write_contract(address=addr, function_name="deliver", args=[cid, deliverable])
        log("deliver tx=" + str(tx3))
        poll(wclient, tx3, "deliver")
        time.sleep(6)

    log("FINAL commission: " + json.dumps(read_view(client, account, addr, "get_commission", [cid]), default=str))
    log("agent: " + json.dumps(read_view(client, account, addr, "get_agent", [worker.address]), default=str))
    log("stats: " + json.dumps(read_view(client, account, addr, "get_stats"), default=str))
    log("settlements: " + json.dumps(read_view(client, account, addr, "get_settlements", [0]), default=str))
    log("WRITE VERIFY DONE")


if __name__ == "__main__":
    main()
