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
pyinstaller --paths=python python/pycat.py -F --hidden-import=eventlet.hubs.epolls --hidden-import=eventlet.hubs.kqueue --hidden-import=eventlet.hubs.selects --hidden-import=dns --hidden-import=dns.dnssec --hidden-import=dns.e164 --hidden-import=dns.hash --hidden-import=dns.namedict --hidden-import=dns.tsigkeyring --hidden-import=dns.update --hidden-import=dns.version  --hidden-import=dns.zone --hidden-import=engineio.async_drivers.eventlet
# Visit the /dist for the python build.
```
