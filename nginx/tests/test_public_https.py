import importlib.util
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

spec = importlib.util.spec_from_file_location("public_https", Path(__file__).resolve().parents[1] / "public_https.py")
https = importlib.util.module_from_spec(spec)
spec.loader.exec_module(https)


class PublicHttpsTests(unittest.TestCase):
    def test_restricts_domain_to_one_literal_dns_name(self):
        self.assertEqual(https.domain_name(" App.Example.com "), "app.example.com")
        for value in ("", "192.168.1.30", "*.example.com", "app.example.com;include /tmp/x;", "a.example.com b.example.com", "../../key"):
            with self.assertRaises(ValueError):
                https.domain_name(value)

    def test_dns_only_command_has_no_secret_and_staging_is_isolated(self):
        env = {"PUBLIC_HTTPS_DOMAIN":"app.example.com", "ACME_EMAIL":"test@example.com", "CLOUDFLARE_DNS_API_TOKEN":"test-token-do-not-print"}
        domain, command = https.certbot_command(env, Path("/run/acme/cloudflare.ini"))
        self.assertEqual(domain, "app.example.com")
        self.assertNotIn(env["CLOUDFLARE_DNS_API_TOKEN"], command)
        self.assertIn("--dns-cloudflare", command)
        self.assertNotIn("--standalone", command)
        self.assertEqual(command[command.index("--config-dir")+1], "/etc/letsencrypt")
        _, staging = https.certbot_command({**env, "ACME_STAGING":"true"}, Path("/run/acme/cloudflare.ini"))
        self.assertEqual(staging[staging.index("--config-dir")+1], "/etc/letsencrypt/staging")
        self.assertIn("--staging", staging)

    def test_requires_contact_and_credentials(self):
        for env in ({}, {"PUBLIC_HTTPS_DOMAIN":"app.example.com"}, {"PUBLIC_HTTPS_DOMAIN":"app.example.com", "ACME_EMAIL":"test@example.com"}):
            with self.assertRaises(ValueError):
                https.certbot_command(env, Path("/run/acme/cloudflare.ini"))

    def certificate(self, source, hostname="app.example.com", expired=False, wrong_key=False):
        key = ec.generate_private_key(ec.SECP256R1())
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, hostname)])
        now = datetime.now(timezone.utc)
        certificate = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
                       .serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(days=2))
                       .not_valid_after(now+timedelta(days=-1 if expired else 30))
                       .add_extension(x509.SubjectAlternativeName([x509.DNSName(hostname)]), critical=False)
                       .sign(key, hashes.SHA256()))
        (source/"fullchain.pem").write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
        if wrong_key:
            key = ec.generate_private_key(ec.SECP256R1())
        (source/"privkey.pem").write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))

    def test_publishes_versioned_pair_atomically_and_reuses_unchanged_config(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)/"source";source.mkdir()
            target = Path(temporary)/"public"
            self.certificate(source)
            https.publish_certificate("app.example.com", source, target)
            conf = target/"server.conf"
            first_stat = conf.stat().st_mtime_ns
            config = conf.read_text()
            self.assertIn("server_name app.example.com;", config)
            self.assertIn("include /etc/nginx/portal-locations.conf;", config)
            self.assertIn("TLSv1.2 TLSv1.3", config)
            self.assertEqual(len(list((target/"versions").iterdir())), 1)
            private = next((target/"versions").glob("*/privkey.pem"))
            self.assertEqual(private.stat().st_mode & 0o777, 0o600)
            https.publish_certificate("app.example.com", source, target)
            self.assertEqual(conf.stat().st_mtime_ns, first_stat)
            self.certificate(source)
            https.publish_certificate("app.example.com", source, target)
            self.assertNotEqual(conf.read_text(), config)
            self.assertEqual(len(list((target/"versions").iterdir())), 2)

    def test_invalid_certificates_preserve_current_config(self):
        with tempfile.TemporaryDirectory() as temporary:
            source=Path(temporary)/"source";source.mkdir()
            target=Path(temporary)/"public";target.mkdir()
            (target/"server.conf").write_text("existing configuration")
            for parameters in ({"hostname":"other.example.com"},{"expired":True},{"wrong_key":True}):
                self.certificate(source, **parameters)
                with self.assertRaises(ValueError):
                    https.publish_certificate("app.example.com", source, target)
                self.assertEqual((target/"server.conf").read_text(), "existing configuration")


if __name__ == "__main__":
    unittest.main()
