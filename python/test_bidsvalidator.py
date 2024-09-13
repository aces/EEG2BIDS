import unittest
import subprocess
import os

class TestBIDSValidator(unittest.TestCase):
    def test_bids_validation(self):
        bids_directory = '/tmp/test_bids_output/output'  # Update path as per  test setup
        # Run the BIDS Validator
        result = subprocess.run(['bids-validator', bids_directory], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        output = result.stdout.decode('utf-8')
        errors = "Errors were found" in output
        self.assertFalse(errors, msg="BIDS Validator found errors:\n" + output)

if __name__ == '__main__':
    unittest.main()
