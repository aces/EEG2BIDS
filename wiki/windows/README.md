["Click Here" to return to the project README.md](../../README.md)

# Windows Instructions

## Development

#### Development Requirements:

 * [Node.js](https://nodejs.org/en/download/current) == 14.16.1 LTS
 * NPM >= 7.10.0 (included with Node.js)
 * [Python](https://www.python.org/downloads/) == 3.8.5
 * [MATLAB Runtime Compiler](https://www.mathworks.com/products/compiler/matlab-runtime.html) == Windows R2017b (9.3)

#### Development Build guide:

Inside project root using your "Windows PowerShell" type:
```
npm install
npm run start
# In another "Windows PowerShell" inside project root type:
py -m venv .
Scripts\activate
python -m pip install -r .\requirements.txt
python -m python.eeg2bids
```

**Note:** Both the "python-service" & the "electron-app" need to be running simultaneously for EEG2BIDS Wizard to successfully function in development!

[Recommended Intellij IDEA Ultimate Guide for development build](intellij/README.md)

## Production

#### Building production app guide:

Inside project root using your "Windows PowerShell" type the following,

1) python-service build:
```
# first follow the Development Build guide
# then paste the following commands:
python -m pip install pyinstaller
pyinstaller eeg2bids-service-windows.spec --clean
# Visit the /dist for the "python-service" build.
```
To generate the eeg2bids-service-windows.spec file:
```
chmod +x build.ps1
.\build.ps1
# Open eeg2bids-service.spec and add on the first line
import sys
sys.setrecursionlimit(sys.getrecursionlimit() * 5)
```

2) electron-app build:
```
npm install
npm run build-windows
# Visit the /dist for the "electron-app" platform builds.
```

**Note:** It's important that the "python-service" is built before the "electron-app" because the python-service is bundled inside the electron-app.
