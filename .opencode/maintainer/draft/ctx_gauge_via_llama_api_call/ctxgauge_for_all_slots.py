#!/usr/bin/env python3
"""
Query llama-swap (ik_llama backend) for context usage.
Uses: GET /model/{model_id}/props and /model/{model_id}/slots
"""

from __future__ import annotations

import argparse
import sys

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Show llama-swap / ik_llama slot context usage"
    )
    parser.add_argument(
        "--base-url",
        default="http://192.168.178.20:8033",
        help="llama-swap base URL",
    )
    parser.add_argument(
        "--model",
        default="Qwen3.8-27B-IQ4KT-120K",
        help="Model ID as configured in llama-swap",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    model = args.model
    # curl -s "http://192.168.178.20:8033/props?model=Qwen3.8-27B-IQ4KT-120K"
    with httpx.Client(base_url=base, timeout=5.0) as client:
        # /model/{model}/props
        props_url = f"{base}/props?model={model}"
        resp = client.get(props_url)
        resp.raise_for_status()
        props = resp.json()
        #print(props)
        n_ctx = props.get("n_ctx")
        if n_ctx is None:
            print("n_ctx not found in /props", file=sys.stderr)
            print("Props keys:", list(props.keys()), file=sys.stderr)
            sys.exit(1)

        print(f"Context size (total): {n_ctx}")
        print()


        # slots_url = f"{base}/slots?model={model}"
        slots_url = f"{base}/_slots"
        resp = client.get(slots_url)
        resp.raise_for_status()
        print(resp)
        slots = resp.json()
        print(slots)

        # if not isinstance(slots, list):
        #     print("/slots did not return a list", file=sys.stderr)
        #     print("Slots JSON:", slots, file=sys.stderr)
        #     sys.exit(1)

        # for i, slot in enumerate(slots):
        #     if not slot:
        #         continue
        #     prompt_n = slot.get("prompt_n", 0) or 0
        #     cache_n = slot.get("cache_n", 0) or 0
        #     predicted_n = slot.get("predicted_n", 0) or 0

        #     fill = prompt_n + cache_n + predicted_n
        #     state = slot.get("state", "unknown")
        #     slot_id = slot.get("id", i)

        #     print(
        #         f"Slot {slot_id} (state={state}): "
        #         f"fill={fill} / total={n_ctx} "
        #         f"(prompt_n={prompt_n}, cache_n={cache_n}, predicted_n={predicted_n})"
        #     )


if __name__ == "__main__":
    main()
