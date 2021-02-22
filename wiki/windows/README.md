# Windows Instructions

## Development

#### Development Requirements

 * Node.js >= 15.9.0
 * NPM >= 7.5.2
 * Python == 3.8.5

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
python -m pip install pyinstaller
.\build.ps1
# Visit the /dist for the "python-service" build.
```
