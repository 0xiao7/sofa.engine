import pathlib
import unittest


DASHBOARD = pathlib.Path(__file__).parents[1].joinpath('dashboard.html').read_text(encoding='utf-8')


class ExamSelectionRecoveryContractTest(unittest.TestCase):
    def test_authenticated_dashboard_recovers_explicit_local_exam(self):
        self.assertIn("explicitLocalExam = localStorage.getItem('sofa_exam_key') || '';", DASHBOARD)
        self.assertIn("method: 'PATCH'", DASHBOARD)
        self.assertIn("savedExam.exam_key === explicitLocalExam", DASHBOARD)


if __name__ == '__main__':
    unittest.main()
