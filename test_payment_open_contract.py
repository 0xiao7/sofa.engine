import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class PaymentOpenContractTests(unittest.TestCase):
    def test_checkout_has_no_payment_closed_overlay(self):
        html = (ROOT / "checkout.html").read_text(encoding="utf-8")

        self.assertNotIn("payment-closed-banner", html)
        self.assertNotIn("payment-closed-overlay", html)
        self.assertNotIn("付費方案尚未開放", html)

    def test_member_toolbars_point_to_upgrade_cta(self):
        for filename in ("practice.html", "quiz.html", "fill.html"):
            with self.subTest(filename=filename):
                html = (ROOT / filename).read_text(encoding="utf-8")

                self.assertNotIn("付費方案準備中，尚未開放", html)
                self.assertNotIn("了解方案", html)
                self.assertIn("升級解鎖全部", html)


if __name__ == "__main__":
    unittest.main()
