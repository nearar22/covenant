import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402
from genlayer_py import create_account  # noqa: E402

WORKER_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"


def main():
    client, account = make_client()
    worker = create_account(account_private_key=WORKER_PK)
    w3 = client.w3
    print("deployer:", account.address, "bal:", int(client.get_balance(account.address)) / 10**18)
    print("worker:", worker.address, "bal:", int(client.get_balance(worker.address)) / 10**18)

    amount = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    nonce = w3.eth.get_transaction_count(account.address)
    try:
        gas_price = w3.eth.gas_price
    except Exception:
        gas_price = w3.to_wei(5, "gwei")
    tx = {
        "from": account.address,
        "to": worker.address,
        "value": amount * 10**18,
        "nonce": nonce,
        "gas": 21000,
        "gasPrice": int(gas_price),
        "chainId": client.chain.id if hasattr(client.chain, "id") else 4221,
    }
    signed = account.sign_transaction(tx)
    txh = w3.eth.send_raw_transaction(signed.raw_transaction)
    print("fund tx:", w3.to_hex(txh))
    rcpt = w3.eth.wait_for_transaction_receipt(txh, timeout=180)
    print("status:", rcpt.status)
    time.sleep(4)
    print("worker bal after:", int(client.get_balance(worker.address)) / 10**18)


if __name__ == "__main__":
    main()
