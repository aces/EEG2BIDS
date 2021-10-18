#!/bin/bash

python3 -m venv python
source python/bin/activate
pip install -r requirements.txt
python -m python.eeg2bids
