import pathlib
import unittest


DASHBOARD = pathlib.Path(__file__).parents[1].joinpath('dashboard.html').read_text(encoding='utf-8')


class ExamSelectionRecoveryContractTest(unittest.TestCase):
    def test_authenticated_dashboard_does_not_rewrite_legacy_exam_on_read(self):
        self.assertNotIn("if(profile && !profile.exam_key)", DASHBOARD)
        self.assertNotIn("savedExam.exam_key", DASHBOARD)
        self.assertIn("profile.exam_key", DASHBOARD)


if __name__ == '__main__':
    unittest.main()
