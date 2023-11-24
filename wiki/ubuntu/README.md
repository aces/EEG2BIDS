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
npm run start-server
```

**Note:** Both the "python-service" & the "electron-app" need to be running simultaneously for SET2BIDS Wizard to successfully function in development!

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
pyinstaller set2bids-service.spec --clean
# Visit the /dist for the "python-service" build.
```
To generate the set2bids-service.spec file:
```
chmod +x build.sh
./build.sh
# Open set2bids-service.spec and add on the first line
import sys
sys.setrecursionlimit(sys.getrecursionlimit() * 5)
```

electron-app build:
```
npm install
npm run build-linux
# Visit the /dist for the "electron-app" platform builds.
```

**Note:** It's important that the "python-service" is built before the "electron-app" because the python-service is bundled inside the electron-app.
