![SET2BIDS Wizard](wiki/images/logo/EEG2bIDS_Wizard_(converter_tool).jpg)

SET2BIDS Wizard is a GUI interface for iEEG to BIDS format and used with LORIS (Longitudinal Online Research and Imaging System). Users can use their LORIS credentials with a LORIS URL and automatically retrieve LORIS data for the EEG to BIDS format. Becareful to remove your login credentials after using SET2BIDS on a shared computer!

## Installation

#### System Requirements

 * Linux, macOS, Windows
 * 1 GB of disk space

## Development

#### Development Requirements

 * [Node.js](https://nodejs.org/en/download/current) == 14.16.1 LTS
 * [NPM](https://www.npmjs.com) >= 7.10.0 (included with Node.js)
 * [Python](https://www.python.org/downloads/) == 3.8.5

#### Development Build guides

 * [macOS: build instructions](./wiki/macOS/README.md)

 * [Ubuntu 20.04.2: build instructions](./wiki/ubuntu/README.md)

 * [Windows 10: build instructions](./wiki/windows/README.md)

#### Development documentation

* [Introduction](wiki/dev_notes/README.md)
  
* [React Development](wiki/dev_notes/react/README.md)

## Dependencies

#### Python Dependencies Requirements

 * PyInstaller >= 4.2
 * eventlet ~= 0.31.0
 * mne ~= 0.23.0
 * mne-bids ~= 0.8
 * mne-features ~= 0.1
 * numpy ~= 1.19.5
 * python-socketio ~= 5.0.4
 * python-engineio ~= 4.0.0
 * bids-validator ~= 1.6.0
 * pybv ~= 0.4
 * requests ~= 2.25.0
