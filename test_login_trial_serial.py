import re
import unittest
from pathlib import Path


LOGIN_PATH = Path("login.html")


class LoginTrialSerialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = LOGIN_PATH.read_text()

    def test_login_mentions_trial_serial_format(self):
        self.assertIn("SOFA-T-XXXXXXXX", self.source)

    def test_login_parser_preserves_trial_serial_prefix(self):
        self.assertRegex(self.source, re.compile(r"normalizeSerial\s*\("))
        self.assertIn("SOFA-T-", self.source)
        self.assertNotIn("replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)", self.source)


if __name__ == "__main__":
    unittest.main()
