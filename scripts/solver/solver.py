"""
solver.py — Mock offchain solver for ClearLoop.

Detects cycles in a bipartite debt graph and returns a JSON
solution compatible with NettingEngine.proposeCycle().

For the hackathon, this uses a static precomputed cycle
instead of running a full DFS cycle-detection algorithm.
"""

import json
import os
from typing import Dict, List, Tuple


STATIC_CYCLE = {
    "cycle": [
        {"from": "0xA", "to": "0xB", "amount": 100, "obligation_id": 1},
        {"from": "0xB", "to": "0xC", "amount": 50, "obligation_id": 2},
        {"from": "0xC", "to": "0xA", "amount": 30, "obligation_id": 3},
    ],
    "net_deltas": {
        "0xA": -70,
        "0xB": 50,
        "0xC": 20,
    },
    "total_netted": 100,
    "description": "Static cycle A->B->C->A for demo",
}


def solve(
    obligations: List[Dict],
) -> Dict:
    """Main solver entry point.

    In production, this would:
    1. Build a directed graph from obligations.
    2. Run Johnson's or Tarjan's algorithm to find elementary cycles.
    3. Select the cycle(s) that maximize netted volume.
    4. Return the signed-proposal payload.

    For the hackathon demo, returns STATIC_CYCLE.
    """
    return STATIC_CYCLE


def format_for_onchain(solution: Dict) -> Tuple[List[int], List[int]]:
    """Convert solver output to proposeCycle() arguments.

    Returns (obligation_ids, deltas) where deltas[i] is the
    net change for the creditor of obligation i.
    """
    ids = [edge["obligation_id"] for edge in solution["cycle"]]

    deltas = []
    for edge in solution["cycle"]:
        creditor = edge["from"]
        delta = solution["net_deltas"].get(creditor, 0)
        deltas.append(delta)

    return ids, deltas


if __name__ == "__main__":
    result = solve([])
    ids, deltas = format_for_onchain(result)
    print(json.dumps({
        "obligation_ids": ids,
        "deltas": deltas,
        "solution": result,
    }, indent=2))
