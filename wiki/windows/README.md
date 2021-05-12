["Click Here" to return to the project README.md](../../README.md)

# Windows Instructions

## Development

#### Development Requirements:

 * [Node.js](https://nodejs.org/en/download/current) == 14.16.1 LTS
 * NPM >= 7.10.0 (included with Node.js)
 * [Python](https://www.python.org/downloads/) == 3.8.5

#### Development Build guide:

Inside project root using your "Windows PowerShell" type:
```
npm install
npm run start
# In another "Windows PowerShell" inside project root type:
py -m venv .
Scripts\activate
python -m pip install -r .\requirements.txt
python -m python.pycat
```

**Note:** Both the "python-service" & the "electron-app" need to be running simultaneously for pyCat to successfully function in development!

[Recommended Intellij IDEA Ultimate Guide for development build](intellij/README.md)

## Production

#### Building production app guide:

Inside project root using your "Windows PowerShell" type the following,

1) python-service build:
```
# first follow the Development Build guide
# then paste the following commands:
python -m pip install pyinstaller
.\build.ps1
# Visit the /dist for the "python-service" build.
```

2) electron-app build:
```
npm install
npm run build-windows
# Visit the /dist for the "electron-app" platform builds.
```

**Note:** It's important that the "python-service" is built before the "electron-app" because the python-service is bundled inside the electron-app.
