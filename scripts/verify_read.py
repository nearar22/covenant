import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = json.load(open(os.path.join(root, "deployment.json")))["address"]
    if len(sys.argv) > 1:
        addr = sys.argv[1]
    client, account = make_client()
    print("addr:", addr)
    stats = read_view(client, account, addr, "get_stats")
    print("get_stats:", json.dumps(stats, default=str))
    print("get_commissions:", json.dumps(read_view(client, account, addr, "get_commissions", [0]), default=str))
    print("get_agents:", json.dumps(read_view(client, account, addr, "get_agents", [0]), default=str))


if __name__ == "__main__":
    main()
