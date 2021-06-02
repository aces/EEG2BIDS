["Click Here" to return to the project README.md](../../README.md)

# Ubuntu Instructions

## Development

#### Development Requirements:

 * [Node.js](https://nodejs.org/en/download/current) == 14.16.1 LTS
 * NPM >= 7.10.0 (included with Node.js)
 * [Python](https://www.python.org/downloads/) == 3.8.5

#### Development Build guide:

Inside project root using your terminal type:
```
npm install
npm run start
# In another terminal inside project root type:
sudo apt-get install python3-venv
python3 -m venv .
source bin/activate
pip install -r requirements.txt
python3 -m python.pycat
```

**Note:** Both the "python-service" & the "electron-app" need to be running simultaneously for EEG2BIDS Wizard to successfully function in development!

## Production

#### Building production app guide:

Inside project root using your terminal type the following,

python-service build:
```
# first follow the Development Build guide
# then paste the following commands:
pip install pyinstaller
sudo apt-get install python3-dev
sudo apt-get install binutils
chmod +x build.sh
./build.sh
# Visit the /dist for the "python-service" build.
```

electron-app build:
```
npm install
npm run build-linux
# Visit the /dist for the "electron-app" platform builds.
```

**Note:** It's important that the "python-service" is built before the "electron-app" because the python-service is bundled inside the electron-app.
