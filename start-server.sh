#!/usr/bin/env bash

python3 -m venv python
source python/bin/activate
which pip
pip install -r requirements.txt
python -m python.eeg2bids
