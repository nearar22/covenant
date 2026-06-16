import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = json.load(open(os.path.join(root, "deployment.json")))["address"]
    client, account = make_client()
    print("client:", account.address, "bal:", int(client.get_balance(account.address)) / 10**18)
    title = "Summarize the GenLayer consensus model in plain language"
    brief = "Write a concise explainer of how GenLayer validators reach consensus on an AI judgment, for a developer new to the platform."
    criteria = "Must mention a leader proposing a result, validators independently re-running it, agreement within tolerance, and that the AI verdict is the on-chain settlement. Accurate, no fabrication."
    try:
        tx = client.write_contract(address=addr, function_name="post_commission", args=[title, brief, criteria, "12.5"])
        print("post tx:", tx)
    except Exception as e:
        print("post err:", repr(e)[:400])
        return
    time.sleep(8)
    print("stats:", json.dumps(read_view(client, account, addr, "get_stats"), default=str))


if __name__ == "__main__":
    main()
