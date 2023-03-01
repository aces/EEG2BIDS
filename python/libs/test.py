from loris_api import LorisAPI
import json


# Create Loris API handler.
loris_api = LorisAPI()
loris_api.url = 'https://pilot.hbcd.msi.umn.edu/api/v0.0.4-dev/'
loris_api.username = 'laetitia.fesselier@mcin.ca'
loris_api.password = 'Joliette2051$'
loris_api.token = ''
resp1 = loris_api.login()

resp2 = loris_api.upload_pii('C:\\Users\\Lae\\Documents\\test_data\\TIDCC0066_998651_V02_EEG.tar.gz')
print(resp2)
print(resp2.status_code)
json_resp = json.loads(resp2.content.decode('ascii'))
print(json_resp)
