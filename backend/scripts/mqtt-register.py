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
import secrets
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'mosquitto/config'
BACKEND = 'tomatoes-backend'
TELEGRAF = 'tomatoes-telegraf'
EXPLORER = 'diego-explorer'
TOOL_FINGERPRINTS = {'tomatoes-monitor': 'a2c3bf1e', 'tomatoes-bench': 'fd9de830'}
TELEGRAF_ENV = ROOT / 'telegraf/.mqtt.env'
HOST = re.compile(r'esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}')


def read_setting(name):
    for path in [ROOT / '.env', ROOT / 'backend/.env']:
        if path.is_file():
            values = re.findall(r'^\s*(?:export\s+)?' + name + r'\s*=([^\r\n]*)', path.read_text(), re.M)
            if values:
                return values[-1].strip().strip('"\x27')
    return ''


def derive(master, username, prefix='mqtt|'):
    return hmac.new(master.encode('ascii'), (prefix + username).encode('ascii'), hashlib.sha256).hexdigest()


def password_hash(password):
    salt = os.urandom(12)
    iterations = 100000
    digest = hashlib.pbkdf2_hmac('sha512', password.encode('ascii'), salt, iterations)
    return '$'.join(['', '7', str(iterations), base64.b64encode(salt).decode(), base64.b64encode(digest).decode()])


def acl_for(legacy, users, prepare_explorer=False):
    blocks = []
    if legacy in users:
        blocks.append(f'user {legacy}\ntopic readwrite #\ntopic read $SYS/#')
    if BACKEND in users:
        blocks.append(
            'user tomatoes-backend\ntopic read sensors/#\ntopic read devices/+\n'
            'topic write getdevices\ntopic write +/output'
        )
    readers = 'topic read sensors/#\ntopic read devices/+'
    services = {
        'tomatoes-monitor': readers,
        'tomatoes-bench': readers + '\ntopic write esp32s3-07945C/output',
        TELEGRAF: 'topic read sensors/#',
        EXPLORER: 'topic read #\ntopic read $SYS/#',
    }
    for user, rules in services.items():
        if user in users or (user == EXPLORER and prepare_explorer):
            blocks.append(f'user {user}\n{rules}')
    for host in sorted(set(users) - {legacy, BACKEND} - services.keys()):
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


def phase_a_credentials(master):
    passwords = {user: derive(master, user, 'mqtt-tool|') for user in TOOL_FINGERPRINTS}
    for user, password in passwords.items():
        if hashlib.sha256(password.encode('ascii')).hexdigest()[:8] != TOOL_FINGERPRINTS[user]:
            raise ValueError('A tool fingerprint differs from the expected value.')
    if TELEGRAF_ENV.exists():
        content = TELEGRAF_ENV.read_text()
        match = re.fullmatch(r'MQTT_USER_NAME=tomatoes-telegraf\nMQTT_PASSWORD=([a-f0-9]{64})\n', content)
        if not match:
            raise ValueError('Unexpected Telegraf credential configuration.')
        passwords[TELEGRAF] = match[1]
    else:
        passwords[TELEGRAF] = secrets.token_hex(32)
        content = f'MQTT_USER_NAME={TELEGRAF}\nMQTT_PASSWORD={passwords[TELEGRAF]}\n'
        atomic_write(TELEGRAF_ENV, content, 0o600, 0)
    return passwords


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('hostname', nargs='?', help='Exact ESP32 hostname')
    parser.add_argument('--with-backend', action='store_true', help='Also provision the dedicated backend identity')
    parser.add_argument('--expect-fingerprint', help='Abort before changing files if the board fingerprint differs')
    parser.add_argument('--phase-a', action='store_true', help='Provision tool accounts and Telegraf')
    args = parser.parse_args()
    if os.geteuid() or not (args.phase_a and args.hostname is None or not args.phase_a and HOST.fullmatch(args.hostname or '')):
        raise ValueError('Run as root with a valid ESP32 hostname.')
    master = read_setting('OTA_MASTER_KEY')
    legacy = read_setting('MQTT_USER_NAME')
    if not re.fullmatch(r'[a-f0-9]{64}', master) or not re.fullmatch(r'[A-Za-z0-9._-]+', legacy):
        raise ValueError('Invalid OTA master key or legacy MQTT username.')
    if legacy in {args.hostname, BACKEND}:
        raise ValueError('The legacy username conflicts with a dedicated identity.')
    if not args.phase_a:
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
        if args.phase_a:
            credentials = phase_a_credentials(master)
            entries.update({user: password_hash(value) for user, value in credentials.items()})
        else:
            entries[args.hostname] = password_hash(password)
            if args.with_backend:
                entries[BACKEND] = password_hash(derive(master, BACKEND))
        acl = acl_for(legacy, entries, prepare_explorer=args.phase_a or EXPLORER in entries or
                      (CONFIG / 'acl').is_file() and f'user {EXPLORER}\n' in (CONFIG / 'acl').read_text())
        atomic_write(CONFIG / 'acl', acl, 0o644, gid)
        atomic_write(passwd, ''.join(f'{user}:{value}\n' for user, value in entries.items()), 0o640, gid)
        subprocess.run(compose + ['kill', '-s', 'SIGHUP', 'mosquitto'], cwd=ROOT, check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if args.phase_a:
        for user, fingerprint in TOOL_FINGERPRINTS.items():
            print(f'{user}: {fingerprint}')
    else:
        print(fp)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError, TypeError):
        raise SystemExit('MQTT provisioning failed. Check the broker, credentials and expected fingerprint.') from None
