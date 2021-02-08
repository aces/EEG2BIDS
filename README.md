# pyCat - iEEG to BIDS Converter Wizard

pyCat is a GUI interface for iEEG to BIDS conversion for LORIS (Longitudinal Online Research and Imaging System).

## Installation

#### System Requirements

 * Linux, macOS, Windows
 * 200 MB of disk space

## Development

#### Development Requirements

 * Node.js >= 14.5.4
 * NPM >= 7.5.2
 * Python == 3.8

#### Development Build guide

Inside project root using your terminal type:
```
npm install
npm run start
# In another terminal inside project root type:
python3.8 -m venv .
source bin/activate
pip install -r requirements.txt
python -m python.pycat
```

#### Building production app guide

Inside project root using your terminal type the following,

electron-app build:
```
npm install
npm run build
# Visit the /dist for the "electron-app" platform builds.
```

python-service build:
```
# first follow the Development Build guide
# then paste the following commands:
pip install pyinstaller
# building on macOS or linux
chmod +x build.sh
./build.sh
# building on windows
#
# Visit the /dist for the "python-service" build.
```
[Windows: python-service build instructions](./wiki/windows/README.md)

## Dependencies

#### Dependencies Requirements

 * PyInstaller >= 4.2
 * eventlet >= 0.30.0
 * mne >= 0.22.0
 * mne-bids >= 0.6
 * mne-features >= 0.1
 * numpy >= 1.19.5
 * python-socketio >= 5.0.4
 * python-engineio >= 4.0.0
