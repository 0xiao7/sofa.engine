import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class SiteLaunchHygieneTests(unittest.TestCase):
    def test_homepage_uses_responsive_viewport_and_manifest(self):
        html = (ROOT / "index.html").read_text()

        self.assertIn(
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            html,
        )
        self.assertIn('<link rel="manifest" href="/site.webmanifest" />', html)

    def test_robots_points_to_sitemap(self):
        robots = (ROOT / "robots.txt").read_text()

        self.assertIn("User-agent: *", robots)
        self.assertIn("Allow: /", robots)
        self.assertIn("Sitemap: https://sofaengine.org/sitemap.xml", robots)

    def test_sitemap_includes_public_entry_points(self):
        sitemap = (ROOT / "sitemap.xml").read_text()

        for url in [
            "https://sofaengine.org/",
            "https://sofaengine.org/login",
            "https://sofaengine.org/dashboard.html",
            "https://sofaengine.org/share.html",
            "https://sofaengine.org/practice.html",
            "https://sofaengine.org/quiz.html",
            "https://sofaengine.org/fill.html",
        ]:
            with self.subTest(url=url):
                self.assertIn(f"<loc>{url}</loc>", sitemap)

    def test_manifest_has_required_identity_fields(self):
        manifest = json.loads((ROOT / "site.webmanifest").read_text())

        self.assertEqual("SoFa Engine", manifest["name"])
        self.assertEqual("SoFa", manifest["short_name"])
        self.assertEqual("/", manifest["start_url"])
        self.assertEqual("standalone", manifest["display"])
        self.assertIn("icons", manifest)


if __name__ == "__main__":
    unittest.main()
