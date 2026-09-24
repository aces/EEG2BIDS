"""Socket.IO service smoke test.

Starts the backend's WSGI application on an ephemeral loopback port and connects
a real python-socketio client, confirming the service comes up and accepts a
local connection. Also checks the connect handler's loopback-only guard directly.

The client uses HTTP long-polling (websocket-client is not a dependency), which
is the transport the service documents as sufficient for this local, single-
client setup.
"""
import threading

import pytest
import socketio
from werkzeug.serving import make_server

from eeg2bids import server as srv


@pytest.fixture
def running_service():
    """Run the backend WSGI app on a loopback port; yield its base URL."""
    # make_server binds the listening socket immediately, so a client can
    # connect as soon as serve_forever() is running in the thread.
    httpd = make_server("127.0.0.1", 0, srv.app, threaded=True)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.port}"
    finally:
        httpd.shutdown()
        thread.join(timeout=5)


def test_service_accepts_local_client(running_service):
    client = socketio.Client()
    client.connect(running_service, wait_timeout=5)
    try:
        assert client.connected
        assert client.sid
    finally:
        client.disconnect()
    assert not client.connected


def test_inspection_response_identifies_the_selected_files(monkeypatch):
    emitted = []
    monkeypatch.setattr(srv.conversion, 'inspect_recording',
                        lambda files: {'files': files})
    monkeypatch.setattr(srv.sio, 'emit',
                        lambda event, payload: emitted.append((event, payload)))
    files = [{'path': '/example.edf', 'name': 'example.edf'}]

    srv.get_recording_data('client', {'files': files})

    assert emitted == [('recording_data', {
        'files': files, 'requested_files': ['/example.edf'],
    })]


def test_conversion_handler_does_not_log_request_data(monkeypatch, capsys):
    emitted = []
    monkeypatch.setattr(srv.conversion, 'convert_recording',
                        lambda request: {'output_time': 'output-test'})
    monkeypatch.setattr(srv.sio, 'emit',
                        lambda event, payload: emitted.append((event, payload)))

    srv.recording_to_bids('client', {'participantID': 'sensitive-ID'})

    assert emitted == [('bids', {'output_time': 'output-test'})]
    assert 'sensitive-ID' not in capsys.readouterr().out


def test_metadata_error_response_identifies_the_request(monkeypatch, tmp_path):
    emitted = []
    monkeypatch.setattr(srv.sio, 'emit',
                        lambda event, payload: emitted.append((event, payload)))
    missing_file = str(tmp_path / 'missing.json')

    srv.get_bids_metadata('client', {
        'file_path': missing_file, 'modality': 'eeg'})

    assert emitted == [('bids_metadata', {
        'error': 'Could not read the metadata file.',
        'source_file': missing_file,
        'modality': 'eeg',
    })]


def test_participant_lookup_response_identifies_the_requested_candidate(
        monkeypatch):
    emitted = []
    monkeypatch.setattr(srv.loris_api, 'get_candidate',
                        lambda candidate_id: {'PSCID': 'P1'})
    monkeypatch.setattr(srv.sio, 'emit',
                        lambda event, payload: emitted.append((event, payload)))

    srv.get_participant_data('client', {'candID': '42'})

    assert emitted == [('participant_data', {
        'candID': '42', 'candidate': {'PSCID': 'P1'},
    })]


def test_connect_handler_allows_only_loopback():
    # Accepted connections return None; a non-loopback peer is rejected (False).
    assert srv.connect("sid", {"REMOTE_ADDR": "127.0.0.1"}) is None
    assert srv.connect("sid", {"REMOTE_ADDR": "10.1.2.3"}) is False
