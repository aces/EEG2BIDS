# Windows Instructions

## Development

#### Development Requirements

 * [Node.js](https://nodejs.org/en/download/current) >= 16.0.0
 * NPM >= 7.10.0
 * [Python](https://www.python.org/downloads/) == 3.8.5

#### Development Build guide

Inside project root using your terminal type:
```
npm install
npm run start
# In another terminal inside project root type:
py -m venv .
Scripts\activate
python -m pip install -r .\requirements.txt
python -m python.pycat
```

#### Building production app guide

Inside project root using your terminal type the following,

python-service build:
```
# first follow the Development Build guide
# then paste the following commands:
python -m pip install pyinstaller
.\build.ps1
# Visit the /dist for the "python-service" build.
```

electron-app build:
```
npm install
npm run build
# Visit the /dist for the "electron-app" platform builds.
```
