import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402


def main():
    client, account = make_client()
    print("address:", account.address)
    try:
        bal = client.get_balance(account.address)
        print("balance_wei:", bal)
        print("balance_gen:", int(bal) / 10**18)
    except Exception as e:
        print("balance err:", repr(e)[:300])


if __name__ == "__main__":
    main()
