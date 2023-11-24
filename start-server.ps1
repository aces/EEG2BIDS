#! /usr/bin/pwsh

py -m venv .
Scripts\activate
python -m pip install numpy
python -m pip install -r .\requirements.txt
python -m python.set2bids