# Ubuntu Instructions

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
sudo apt-get install python3-venv
python3 -m venv .
source bin/activate
pip install -r requirements.txt
python3 -m python.pycat
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
sudo apt-get install python3-dev
sudo apt-get install binutils
chmod +x build.sh
./build.sh
# Visit the /dist for the "python-service" build.
```
