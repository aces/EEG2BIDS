# pyCat - iEEG to BIDS Converter Wizard

pyCat is a GUI interface for iEEG to BIDS conversion for LORIS (Longitudinal Online Research and Imaging System).

## Installation

#### System Requirements

 * Linux, macOS, Windows

## Development

#### Development Requirements

 * Node.js >= 14.5.4
 * NPM >= 7.5.2
 * Python == 3.8
 * PyInstaller >= 4.2

#### Development Build guide

Inside project root using your terminal type:
```
npm install
npm run start
# In another terminal inside project root type:
pip install -r requirements.txt
python -m python.pycat
```

#### Building production app guide

Inside project root using your terminal type:
```
npm install
npm run build
# Visit the /dist for the platform builds.
```

```
python3.8 -m venv .
source bin/activate
pip install pyinstaller
pip install -r requirements.txt
# building on macOS or linux
chmod +x build.sh
./build.sh
# building on windows
./build.ps1
# Visit the /dist for the python build.
```
