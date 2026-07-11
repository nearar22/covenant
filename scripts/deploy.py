"""Deploy the Covenant contract to Bradbury. Submits the tx and returns the hash
immediately, then hands off to poll_deploy for the gen consensus result (the SDK
web3 wait crashes on Bradbury's long consensus times)."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402


PRIORITY_GWEI = int(os.environ.get("PRIORITY_GWEI", "60"))


def _install_fee_bump(client):
    """Bump the maxPriorityFeePerGas so the activator picks our tx up faster
    when the network is congested. The SDK hardcodes a 2 gwei priority tip."""
    import genlayer_py.contracts.actions as actions

    def prepare(self, sender, recipient, data, value=0):
        nonce = self.get_current_nonce(address=sender)
        latest_block = self.w3.eth.get_block("latest")
        base_fee = latest_block["baseFeePerGas"]
        priority_fee = self.w3.to_wei(PRIORITY_GWEI, "gwei")
        max_fee = base_fee * 2 + priority_fee
        tx = {
            "from": sender,
            "nonce": hex(nonce),
            "data": data,
            "to": recipient,
            "value": hex(value),
            "maxFeePerGas": hex(max_fee),
            "maxPriorityFeePerGas": hex(priority_fee),
            "chainId": self.chain.id,
        }
        tx["gas"] = self.provider.make_request("eth_estimateGas", params=[tx])["result"]
        return tx

    actions._prepare_transaction = prepare


def main():
    client, account = make_client()
    print("Deployer:", account.address)
    _install_fee_bump(client)
    print("priority fee bumped to", PRIORITY_GWEI, "gwei")

    root = os.path.dirname(os.path.dirname(__file__))
    code_path = os.path.join(root, "contracts", "contract.py")
    code = open(code_path, "r", encoding="utf-8").read()
    print("Deploying contract.py (", len(code), "bytes )...")

    # Intercept eth_sendRawTransaction so we capture the tx hash the moment the
    # node accepts it, then let the SDK's post-submit receipt handling fail
    # harmlessly (Bradbury consensus is slow; we poll separately).
    captured = {}
    orig_make_request = client.provider.make_request

    def wrapped_make_request(method, params=None):
        resp = orig_make_request(method=method, params=params)
        if method == "eth_sendRawTransaction":
            try:
                captured["tx"] = resp["result"]
            except Exception:
                pass
        return resp

    client.provider.make_request = wrapped_make_request

    tx_hash = None
    try:
        for attempt in range(40):
            try:
                client.deploy_contract(code=code, args=[])
                break
            except Exception as e:
                if captured.get("tx"):
                    # Node accepted it; the failure was only post-submit handling.
                    break
                msg = str(e)
                if "backpressure" in msg or "not currently accepting" in msg or "-32603" in msg:
                    print(f"[{attempt}] node busy, retrying in 15s...", flush=True)
                    time.sleep(15)
                    continue
                raise
    finally:
        client.provider.make_request = orig_make_request

    tx_hash = captured.get("tx")
    if not tx_hash:
        raise SystemExit("could not submit deploy tx after retries")

    tx_hash = tx_hash if isinstance(tx_hash, str) else ("0x" + bytes(tx_hash).hex())
    print("deploy tx:", tx_hash)

    with open(os.path.join(root, "deploy_tx.txt"), "w", encoding="utf-8") as f:
        f.write(tx_hash)
    print("wrote deploy_tx.txt; run: python scripts/poll_deploy.py", tx_hash)


if __name__ == "__main__":
    main()
