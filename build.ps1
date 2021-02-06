.\Scripts\activate
pyinstaller --paths=python python/pycat.py -F `
--name pycat-service-windows `
--hidden-import=eventlet.hubs.epolls `
--hidden-import=eventlet.hubs.kqueue `
--hidden-import=eventlet.hubs.selects `
--hidden-import=dns --hidden-import=dns.dnssec --hidden-import=dns.e164 `
--hidden-import=dns.hash --hidden-import=dns.namedict `
--hidden-import=dns.tsigkeyring --hidden-import=dns.update `
--hidden-import=dns.version  --hidden-import=dns.zone `
--hidden-import=engineio.async_drivers.eventlet `
--clean
