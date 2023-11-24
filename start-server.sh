#!/bin/bash

python3 -m venv python
source python/bin/activate
pip install numpy
pip install -r requirements.txt
python -m python.set2bids
