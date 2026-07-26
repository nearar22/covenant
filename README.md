# COVENANT // Agent Reputation Console

An operations console where AI worker agents earn an evolving, multi-axis trust dossier by delivering commissions that an injection-resistant AI jury settles under GenLayer validator consensus. No funds ever move: the escrow is modeled as non-custodial commitment and criteria state, and the jury verdict is the on-chain settlement that updates reputation. Operators only pay network fees.

```
NETWORK   Bradbury testnet (chain 4221)
CONTRACT  https://explorer-bradbury.genlayer.com/address/0x831BEc77B7751D2A9889d0B12db58233c7489f7E
DEPLOY TX https://explorer-bradbury.genlayer.com/tx/0x843adbdd38b4f57ce5cca9eb3b74d727e706dcde3e87f2645c184beff0563ea1
```

This document is an operator runbook. Follow the numbered procedures to run the console, then read the worked commission walkthrough at the end to see one job move from posting to settled reputation.

---

## 0. Operating model (read once before the procedures)

The Intelligent Contract is the entire backend. There is no server and no database. State, business rules, and the AI judgment all live on-chain under validator consensus.

```
  CLIENT                WORKER AGENT             COVENANT CONTRACT              AI JURY (consensus)
  post_commission  -->  ledger row OPEN     -->  guards + stored criteria
                        accept_commission   -->  row ACCEPTED, dossier opened
                        deliver(text/url)   -->  deterministic guards     -->  leader proposes ruling
                                                 run_nondet_unsafe             + 4-axis scores
                                                 validators re-run + agree <-- ruling exact, scores within tol
                                                 deterministic backstops  -->  clamp every axis to ruling band
                                                 settle + fold dossier         (FAILED cannot post a high score)
  FRONTEND (static SPA, genlayer-js)  <----  paged views: get_agents / get_commissions / get_settlements
```

What the contract owns: commissions, the four-axis reputation dossiers, the settlement stream, the jury call, and the validator comparison rule. What the frontend owns: the console UI, wallet, slow polling, the leader-draft preview, and client-side derived ranking. No funds are ever custodied or transferred; `emit_transfer` is never used.

The four reputation axes are `reliability`, `quality`, `honesty`, and `timeliness`, each an integer 0 to 100. The composite is a fixed weighted blend (30 / 30 / 25 / 15). Each dossier keeps a running weighted aggregate per axis, a jobs count, fulfilled / partial / failed tallies, and a bounded history log.

---

## 1. How the console reads the world

The console lands straight in the operations surface, no wallet required. The left rail lists agent dossiers ranked by composite trust; the center plots the selected agent radar and the commission ledger; the right streams settlements as consensus seals them. All of it is read live from the contract through paged views, polled slowly and paused while a write is in flight. Ranking is derived client-side from the on-chain composite, so higher-reputation agents surface at the top of the rail. A wallet is needed only to write (post, accept, deliver).

## 2. How a commission is posted (client action)

A client posts a commission with a title (1 to 90 chars), a task brief (1 to 600), explicit acceptance criteria (1 to 600), and a reward intent in GEN. The reward is a non-custodial commitment; no tokens are escrowed or moved. Posting is a deterministic write and settles quickly, the new row appears OPEN in the ledger.

## 3. How a delivery is judged (worker agent action)

A worker agent accepts an OPEN commission (the contract refuses a client accepting their own), which opens a dossier and moves the row to IN PROGRESS. The agent then delivers the work as text, a URL, or a hash (1 to 900 chars). Signing that delivery is what triggers the AI jury under consensus: dispatch sealed, leader drafting, validators re-running, consensus sealing, one to five minutes. While validators deliberate, the leader's draft verdict and its four-axis radar preview in cyan, labeled as a draft. The console treats a write as successful only when the transaction reaches `ACCEPTED`/`FINALIZED` and the execution result is `FINISHED_WITH_RETURN`/`FINISHED_WITHOUT_RETURN`; the authoritative verdict is then read from the contract because deterministic backstops may correct the draft. `LEADER_TIMEOUT` and `VALIDATORS_TIMEOUT` are terminal states that record no settlement, so they are surfaced as failures the operator can retry, never as silent success.

### URL evidence (web fetch under consensus)

Most real deliverables are a link: a pull request, a deployed page, a published document. When the deliverable is a URL, the contract does not judge the bare link, and it does not force validators to agree on the raw page text. Each node (the leader and every validator) fetches the page itself with `gl.nondet.web.render(url, mode="text")` inside its own judgment, feeds what it read to the LLM jury, and returns a ruling and four-axis scores. Consensus is then reached on the high-level decision (the ruling must match exactly and each axis must agree within tolerance), never on the byte-for-byte page content.

This matters because modern pages, even documentation and repositories, contain shifting bytes (timestamps, counters, rotating tokens, reordered nodes). An earlier version wrapped the raw render in `gl.eq_principle.strict_eq`, which required every validator to produce character-identical text; a single differing byte would abort the write and split consensus, making URL deliverables fragile. Judging the decision instead of the raw text is the robust GenLayer pattern. The stored settlement still records the fetched `evidence_url` and an `evidence_kind` of `url`, and the console links straight to the evidence the jury read.

This URL-evidence path was verified end to end on the deployed contract. Commission `cmsn-1` was delivered the official GenLayer protocol overview page as its evidence URL; every validator fetched and judged the page independently, the round reached `ACCEPTED` with execution result `FINISHED_WITH_RETURN`, and the commission settled `FULFILLED` with the fetched `evidence_url`/`evidence_kind` stored on-chain.

```
DELIVER TX  https://explorer-bradbury.genlayer.com/tx/0x445e966b814200a1f246c4ca6078ac3f528adbb066a4bf48fea2924ab5f2f574
EVIDENCE    https://raw.githubusercontent.com/genlayerlabs/genlayer-docs/main/pages/understand-genlayer-protocol.mdx
RESULT      status FINALIZED / execution FINISHED_WITH_RETURN / commission SETTLED / ruling FULFILLED
```

## 4. How a trust dossier is read

Selecting an agent plots the multi-axis trust radar, the composite trust figure and tier (PRIME / TRUSTED / PROVISIONAL / WATCH / UNRATED), per-axis gauges, the fulfilled / partial / failed tallies, and the verdict history, all folded from past settlements held on-chain.

---

## Consensus core

The settlement lives in `deliver`. The jury is the leader proposing a structured verdict and every validator independently re-running the same judgment; the ruling must match exactly and each of the four numeric axes must agree within a bounded tolerance. This is the only place state-changing AI judgment happens.

```python
def leader_fn():
    raw = gl.nondet.exec_prompt(prompt, response_format="json")
    return _normalize_verdict(raw)

def validator_fn(leaders_res: gl.vm.Result) -> bool:
    if not isinstance(leaders_res, gl.vm.Return):
        return _handle_leader_error(leaders_res, leader_fn)
    mine = leader_fn()                       # validator re-runs the same task
    theirs = leaders_res.calldata
    if not isinstance(theirs, dict):
        return False
    if mine["ruling"] != theirs.get("ruling"):
        return False                          # ruling must match exactly
    theirs_scores = theirs.get("scores")
    if not isinstance(theirs_scores, dict):
        return False
    for d in DIMS:                            # each axis within tolerance
        a = int(mine["scores"][d])
        b = int(theirs_scores.get(d, -1))
        if b < 0 or abs(a - b) > max(15, (15 * max(a, b)) // 100):
            return False
    return True

return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

Deterministic guards run before the jury (unknown commission, length caps, the commission must be ACCEPTED, only the accepting agent may deliver). Deterministic backstops run after consensus and enforce what a prompt alone cannot: every axis is clamped into the band its ruling requires, so a FAILED delivery can never post a high composite and a FULFILLED one can never read as a failure.

```python
ruling = verdict["ruling"]
dims = {}
for d in DIMS:
    dims[d] = _clamp_dim(ruling, int(verdict["scores"][d]))   # FULFILLED 67-100, PARTIAL 34-66, FAILED 0-33
verdict_composite = _composite(dims)
```

The full backend is `contracts/contract.py` in this repository, and the deployed address above is the authoritative source reviewers can verify against.

## Public methods

Writes: `post_commission(title, brief, criteria, reward_intent) -> commission_id`; `accept_commission(commission_id) -> dict` (deterministic, fast); `deliver(commission_id, deliverable) -> dict` (the one AI consensus write).

Views (all paged at 20, slow-polled at 95s in the UI): `get_commissions(start)`, `get_commission(id)`, `get_agents(start)`, `get_agent(address)`, `get_settlements(start)`, `get_stats()`. Confidential nothing is hidden here; every stored field is intended to be public and auditable.

## Stack and UX notes

Next.js 14 App Router with static export, `genlayer-js` 1.1.8, Tailwind, Framer Motion, and lucide-react icons. Art direction is a mission-control data terminal: deep slate, electric-lime primary with signal-cyan secondary, hairline grids, gauges and a hand-built SVG trust radar, monospace data columns, no glass and no soft gradients. The console lands straight in the operations surface with no marketing hero. Reads are retried with exponential backoff; transaction polling reads the GenLayer transaction with the SDK, requires a successful execution result before showing success, and treats `LEADER_TIMEOUT` / `VALIDATORS_TIMEOUT` as terminal failures; view polling pauses while a write is in flight. Every data panel is wrapped in an error boundary so a failed read degrades one panel, never the whole console.

## Worked commission walkthrough

This is the exact first job settled on the live deployment.

1. The client posts `cmsn-1`: "Summarize the GenLayer consensus model in plain language", with criteria requiring a leader proposing a result, validators re-running it, agreement within tolerance, and the AI verdict as the on-chain settlement. Reward intent 12.5 GEN, non-custodial. Status OPEN.
2. A separate worker agent accepts `cmsn-1`. The contract opens its dossier and moves the row to IN PROGRESS.
3. The agent delivers a concise, accurate explainer of leader proposal, independent validator re-runs, tolerance-bounded agreement, and the verdict as the authoritative state transition.
4. The jury convenes under consensus. The leader proposes FULFILLED with reliability, quality, honesty, and timeliness all high; validators re-run and agree on the ruling and every axis within tolerance.
5. Backstops clamp the axes into the FULFILLED band (67 to 100), the commission settles SETTLED, and the worker dossier folds in the verdict: jobs 1, fulfilled 1, composite 100, tier PRIME. The settlement streams into the right panel with the jury note. A second seeded job delivered a vague answer and settled FAILED, which the backstop clamped into the 0 to 33 band, dropping that agent to a WATCH tier; both outcomes are visible live on the console.

## License

MIT.
