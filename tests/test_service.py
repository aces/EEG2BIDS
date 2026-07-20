"""Socket.IO service smoke test.

Starts the backend's WSGI application on an ephemeral loopback port and connects
a real python-socketio client, confirming the service comes up and accepts a
local connection. Also checks the connect handler's loopback-only guard directly.

The client uses HTTP long-polling (websocket-client is not a dependency), which
is the transport the service documents as sufficient for this local, single-
client setup.
"""
import socket
import threading

import pytest
import socketio
from werkzeug.serving import make_server

from eeg2bids import server as srv


def _free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


@pytest.fixture
def running_service():
    """Run the backend WSGI app on a loopback port; yield its base URL."""
    port = _free_port()
    # make_server binds the listening socket immediately, so a client can
    # connect as soon as serve_forever() is running in the thread.
    httpd = make_server("127.0.0.1", port, srv.app, threaded=True)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
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


def test_connect_handler_allows_only_loopback():
    # Accepted connections return None; a non-loopback peer is rejected (False).
    assert srv.connect("sid", {"REMOTE_ADDR": "127.0.0.1"}) is None
    assert srv.connect("sid", {"REMOTE_ADDR": "10.1.2.3"}) is False
