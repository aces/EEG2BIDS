source bin/activate
pyinstaller --paths=python python/eeg2bids.py -w -F \
--name eeg2bids-service \
--add-data 'python/libs/mne:mne' \
--add-data 'python/libs/mne_bids:mne_bids' \
--add-data 'python/libs/bids_validator:bids_validator' \
--hidden-import=eventlet.hubs.epolls \
--hidden-import=eventlet.hubs.kqueue \
--hidden-import=eventlet.hubs.selects \
--hidden-import=dns --hidden-import=dns.dnssec --hidden-import=dns.e164 \
--hidden-import=dns.hash --hidden-import=dns.namedict \
--hidden-import=dns.tsigkeyring --hidden-import=dns.update \
--hidden-import=dns.version  --hidden-import=dns.zone \
--hidden-import=engineio.async_drivers.eventlet \
--hidden-import=json \
--hidden-import=csv \
--clean
