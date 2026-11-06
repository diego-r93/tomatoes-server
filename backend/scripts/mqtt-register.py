#!/usr/bin/env python3
"""Register a board in the Mosquitto 2.0 password file and migration ACL."""
import argparse
import base64
import fcntl
import hashlib
import hmac
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'mosquitto/config'
BACKEND = 'tomatoes-backend'
HOST = re.compile(r'esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}')


def read_setting(name):
    for path in [ROOT / '.env', ROOT / 'backend/.env']:
        if path.is_file():
            values = re.findall(r'^\s*(?:export\s+)?' + name + r'\s*=([^\r\n]*)', path.read_text(), re.M)
            if values:
                return values[-1].strip().strip('"\x27')
    return ''


def derive(master, username):
    return hmac.new(master.encode('ascii'), ('mqtt|' + username).encode('ascii'), hashlib.sha256).hexdigest()


def password_hash(password):
    salt = os.urandom(12)
    iterations = 100000
    digest = hashlib.pbkdf2_hmac('sha512', password.encode('ascii'), salt, iterations)
    return '$'.join(['', '7', str(iterations), base64.b64encode(salt).decode(), base64.b64encode(digest).decode()])


def acl_for(legacy, users):
    blocks = [f'user {legacy}\ntopic readwrite #\ntopic read $SYS/#']
    if BACKEND in users:
        blocks.append(
            'user tomatoes-backend\ntopic read sensors/#\ntopic read devices/#\n'
            'topic read devices\ntopic write getdevices\ntopic write +/output'
        )
    for host in sorted(set(users) - {legacy, BACKEND}):
        if not HOST.fullmatch(host):
            raise ValueError('An existing broker user requires an explicit migration rule.')
        blocks.append(
            f'user {host}\ntopic write sensors/{host}/#\ntopic write devices/{host}\n'
            f'topic read {host}/output\ntopic read getdevices'
        )
    return '\n\n'.join(blocks) + '\n'


def atomic_write(path, content, mode, gid):
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.' + path.name + '.', delete=False) as target:
        temporary = Path(target.name)
        try:
            os.fchown(target.fileno(), 0, gid)
            os.fchmod(target.fileno(), mode)
            target.write(content.encode('utf-8'))
            target.flush()
            os.fsync(target.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('hostname', help='Exact ESP32 hostname')
    parser.add_argument('--with-backend', action='store_true', help='Also provision the dedicated backend identity')
    parser.add_argument('--expect-fingerprint', help='Abort before changing files if the board fingerprint differs')
    args = parser.parse_args()
    if os.geteuid() or not HOST.fullmatch(args.hostname):
        raise ValueError('Run as root with a valid ESP32 hostname.')
    master = read_setting('OTA_MASTER_KEY')
    legacy = read_setting('MQTT_USER_NAME')
    if not re.fullmatch(r'[a-f0-9]{64}', master) or not re.fullmatch(r'[A-Za-z0-9._-]+', legacy):
        raise ValueError('Invalid OTA master key or legacy MQTT username.')
    if legacy in {args.hostname, BACKEND}:
        raise ValueError('The legacy username conflicts with a dedicated identity.')
    password = derive(master, args.hostname)
    fp = hashlib.sha256(password.encode('ascii')).hexdigest()[:8]
    if args.expect_fingerprint and fp != args.expect_fingerprint:
        raise ValueError('Board fingerprint differs from the expected value.')
    compose = ['docker', 'compose']
    status = subprocess.check_output(
        compose + ['exec', '-T', 'mosquitto', 'cat', '/proc/1/status'], cwd=ROOT, text=True, stdin=subprocess.DEVNULL
    )
    gid = int(re.search(r'^Gid:\s+\d+\s+(\d+)', status, re.M)[1])
    with (CONFIG / '.provision.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        passwd = CONFIG / 'passwd'
        entries = dict(line.split(':', 1) for line in passwd.read_text().splitlines() if line and not line.startswith('#'))
        if legacy not in entries:
            raise ValueError('The existing shared MQTT user was not found.')
        entries[args.hostname] = password_hash(password)
        if args.with_backend:
            entries[BACKEND] = password_hash(derive(master, BACKEND))
        acl = acl_for(legacy, entries)
        atomic_write(CONFIG / 'acl', acl, 0o644, gid)
        atomic_write(passwd, ''.join(f'{user}:{value}\n' for user, value in entries.items()), 0o640, gid)
        subprocess.run(compose + ['kill', '-s', 'SIGHUP', 'mosquitto'], cwd=ROOT, check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(fp)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError, TypeError):
        raise SystemExit('MQTT provisioning failed. Check the broker, credentials and expected fingerprint.') from None
