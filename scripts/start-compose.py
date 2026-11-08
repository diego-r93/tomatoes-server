#!/usr/bin/env python3
"""Start existing Compose containers after their published host IPs are ready."""

import errno
import json
from pathlib import Path
import socket
import subprocess
import time


def published_addresses(config):
    return sorted({
        port["host_ip"]
        for service in config["services"].values()
        for port in service.get("ports", [])
        if port.get("host_ip") not in (None, "", "0.0.0.0", "::")
    })


def wait_for_addresses(addresses):
    for address in addresses:
        family = socket.AF_INET6 if ":" in address else socket.AF_INET
        announced = False
        while True:
            try:
                with socket.socket(family, socket.SOCK_STREAM) as probe:
                    probe.bind((address, 0))
                break
            except OSError as error:
                if error.errno != errno.EADDRNOTAVAIL:
                    raise
                if not announced:
                    print(f"Waiting for the configured host address {address}.", flush=True)
                    announced = True
                time.sleep(2)


def main():
    project = Path(__file__).resolve().parent.parent
    # Keep the resolved environment in memory. Never print the Compose config.
    raw_config = subprocess.check_output(
        ["docker", "compose", "config", "--format", "json"], cwd=project
    )
    addresses = published_addresses(json.loads(raw_config))
    wait_for_addresses(addresses)
    print("Configured host addresses are ready. Starting Compose containers.", flush=True)
    subprocess.run(["docker", "compose", "start"], cwd=project, check=True)


if __name__ == "__main__":
    main()
