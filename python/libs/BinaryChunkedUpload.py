import requests
import os

class BinaryChunkedUpload:
    def __init__(self, url, token, file, callback, chunk_size = 1000000):
        self.chunk_size = chunk_size
        self.url = url
        self.token = token
        self.file = file
        self.callback = callback

    def read_in_chunks(self, file_object):
        while True:
            data = file_object.read(self.chunk_size)
            if not data:
                break
            yield data

    def upload(self):
        content_name = str(self.file)
        content_path = os.path.abspath(self.file)
        content_size = os.stat(content_path).st_size
        print(content_name, content_path, content_size)

        file_object = open(content_path, "rb")
        index = 0
        offset = 0
        headers = {}

        for chunk in self.read_in_chunks(file_object, self.chunk_size):
            offset = index + len(chunk)
            headers['Content-Range'] = 'bytes %s-%s/%s' % (index, offset - 1, content_size)
            headers['Authorization'] = 'Bearer %s' % self.token
            index = offset
            try:
                r = requests.post(self.url, files={"file": chunk}, headers=headers, verify=False)
                self.callback()
                print(r.json())
                print("r: %s, Content-Range: %s" % (r, headers['Content-Range']))
            except Exception as e:
                print(e)