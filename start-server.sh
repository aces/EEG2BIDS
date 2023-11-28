#!/bin/bash

python3.8 -m venv python
source python/bin/activate
pip3.8 install numpy
pip3.8 install -r requirements.txt
python3.8 -m python.set2bids

