"""Run a state-aware URL-evidence integration flow on the deployed contract."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402
from genlayer_py import create_account, create_client  # noqa: E402
from genlayer_py.chains import testnet_bradbury  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(__file__))
EVIDENCE_URL = (
    "https://raw.githubusercontent.com/genlayerlabs/genlayer-docs/main/"
    "pages/understand-genlayer-protocol.mdx"
)
SUCCESS = {"FINISHED_WITH_RETURN", "FINISHED_WITHOUT_RETURN"}
DEAD = {"UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"}


def load_worker_key():
    key = os.environ.get("GENLAYER_WORKER_PRIVATE_KEY", "").strip()
    if not key:
        raise RuntimeError("GENLAYER_WORKER_PRIVATE_KEY is required")
    return key if key.startswith("0x") else "0x" + key


def wait_for_success(client, tx_id, label):
    last = None
    for _ in range(240):
        tx = client.get_transaction(transaction_hash=tx_id)
        data = tx if isinstance(tx, dict) else tx.__dict__
        status = str(data.get("status_name"))
        execution = str(data.get("tx_execution_result_name"))
        current = (status, execution)
        if current != last:
            print(f"{label}: {status} execution={execution}", flush=True)
            last = current
        if status in {"ACCEPTED", "FINALIZED"}:
            if execution not in SUCCESS:
                raise RuntimeError(f"{label} execution failed: {execution}")
            return
        if status in DEAD:
            raise RuntimeError(f"{label} consensus failed: {status} ({execution})")
        time.sleep(8)
    raise TimeoutError(f"{label} did not reach a terminal status")


def write_and_wait(client, address, method, args):
    tx_id = client.write_contract(address=address, function_name=method, args=args)
    if not tx_id:
        raise RuntimeError(f"{method} returned no GenLayer txId")
    print(f"{method} GenLayer txId={tx_id}")
    wait_for_success(client, tx_id, method)
    return tx_id
def main():
    with open(os.path.join(ROOT, "deployment.json"), encoding="utf-8") as source:
        address = json.load(source)["address"]
    client, account = make_client()
    worker = create_account(account_private_key=load_worker_key())
    writer = create_client(chain=testnet_bradbury, account=worker)
    before = read_view(client, account, address, "get_stats")
    expected_id = "cmsn-" + str(int(before["commissions"]) + 1)
    write_and_wait(
        client,
        address,
        "post_commission",
        [
            "Point to the official GenLayer protocol overview",
            "Provide a page that clearly introduces what GenLayer is.",
            "The page must describe GenLayer as a blockchain or network for intelligent "
            "contracts or AI and mention validators or consensus. Judge fetched content.",
            "5.0",
        ],
    )
    posted = read_view(client, account, address, "get_commission", [expected_id])
    if posted.get("status") != "OPEN":
        raise RuntimeError("post transaction succeeded but commission is not OPEN")
    write_and_wait(writer, address, "accept_commission", [expected_id])
    accepted = read_view(client, account, address, "get_commission", [expected_id])
    if accepted.get("status") != "ACCEPTED":
        raise RuntimeError("accept transaction succeeded but commission is not ACCEPTED")
    deliver_tx = write_and_wait(writer, address, "deliver", [expected_id, EVIDENCE_URL])
    settled = read_view(client, account, address, "get_commission", [expected_id])
    if (
        settled.get("status") != "SETTLED"
        or settled.get("evidence_url") != EVIDENCE_URL
        or settled.get("evidence_kind") != "url"
        or not settled.get("ruling")
    ):
        raise RuntimeError("delivery executed but URL settlement state is incomplete")
    print("E2E VERIFIED", expected_id, deliver_tx, json.dumps(settled, default=str))


if __name__ == "__main__":
    main()
