"""Deploy Covenant with the supported SDK flow and print its GenLayer txId."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402


def main():
    client, account = make_client()
    root = os.path.dirname(os.path.dirname(__file__))
    code_path = os.path.join(root, "contracts", "contract.py")
    with open(code_path, "r", encoding="utf-8") as source:
        code = source.read()
    print("deployer:", account.address)
    genlayer_tx_id = client.deploy_contract(code=code, args=[])
    if not genlayer_tx_id:
        raise RuntimeError("SDK returned no GenLayer transaction ID")
    print("GenLayer deploy txId:", genlayer_tx_id)
    with open(os.path.join(root, "deploy_tx.txt"), "w", encoding="utf-8") as output:
        output.write(str(genlayer_tx_id))
    print("poll with: python scripts/poll_deploy.py", genlayer_tx_id)


if __name__ == "__main__":
    main()
