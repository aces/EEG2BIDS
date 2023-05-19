import json
import os
import traceback
import requests
import urllib
from requests_toolbelt import MultipartEncoder, MultipartEncoderMonitor
from python.libs.BinaryChunkedUpload import BinaryChunkedUpload
import time
import hashlib

class LorisAPI:
    url = ''
    token = ''

    upload_read = 0
    upload_total = -1
    upload_pii_read = 0
    upload_pii_total = -1

    def login(self, url, username, password):
        self.url = url.rstrip('/') + '/api/v0.0.4-dev'
        resp = requests.post(
            url=self.url + '/login',
            json={
                'username': username,
                'password': password
            },
            verify=False
        )
        print(f"login: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if json_resp.get('token'):
                self.token = json_resp.get('token')
                return True
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': 'User credentials error!'}



    def get_projects(self):
        resp = requests.get(
            url=self.url + '/projects',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_projects: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if json_resp.get('Projects'):
                return json_resp.get('Projects')
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': 'Cannot get projects!'}



    def get_all_subprojects(self):
        resp = requests.get(
            url=self.url + '/subprojects',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_all_subprojects: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if json_resp.get('Subprojects'):
                return json_resp.get('Subprojects')
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': 'Cannot get subprojects!'}



    def get_project(self, project):
        resp = requests.get(
            url=self.url + '/projects/' + urllib.parse.quote(project),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_project {project}: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Unable to find project {project}!"}



    def get_subprojects(self, project):
        print(f"get_subprojects {project}")
        try:
            project = self.get_project(project)
            print(project)
            if project.get('Subprojects'):
                return project.get('Subprojects')
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Unable to find subprojects for {project}!"}



    def get_visits(self, subproject):
        resp = requests.get(
            url=self.url + '/subprojects/' + urllib.parse.quote(subproject),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_visits for {subproject}: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if json_resp.get('Visits'):
                return json_resp.get('Visits')
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Unable to find visits for {subproject}!"}



    def get_sites(self):
        resp = requests.get(
            url=self.url + '/sites',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_sites: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if json_resp.get('Sites'):
                return json_resp.get('Sites')
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': 'Cannot get sites!'}



    def get_visit(self, candid, visit):
        resp = requests.get(
            url=self.url + '/candidates/' + str(candid) + '/' + urllib.parse.quote(visit),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_visit {candid} {visit}: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Cannot get visit {candid} {visit}!"}



    def start_next_stage(self, candid, visit, site, subproject, project, date):
        resp = requests.patch(
            url=self.url + '/candidates/' + candid + '/' + urllib.parse.quote(visit),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "CandID": candid,
                "Visit": visit,
                "Site": site,
                "Battery": subproject,
                "Project": project,
                "Stages": {
                    "Visit": {
                        "Date": date,
                        "Status": "In Progress",
                    }
                }
            }),
            verify=False
        )
        print(f"start_next_stage {candid} {visit}: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Cannot start visit {candid} {visit}!"}


    def create_candidate(self, project, dob, sex, site):
        resp = requests.post(
            url=self.url + '/candidates',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "Candidate": {
                    "Project": project,
                    "DoB": dob,
                    "Sex": sex,
                    "Site": site,
                }
            }),
            verify=False
        )
        print(f"create_candidate: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': 'Cannot create candidate!'}



    def create_visit(self, candid, visit, site, project, subproject):
        resp = requests.put(
            url=self.url + '/candidates/' + candid + '/' + urllib.parse.quote(visit),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "CandID": candid,
                "Visit": visit,
                "Site": site,
                "Battery": subproject,
                "Project": project
            }),
            verify=False
        )
        print(f"create_visit: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Cannot create visit {visit} for candidate {candid}!"}



    def get_candidate(self, candid):
        resp = requests.get(
            url=self.url + '/candidates/' + candid,
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )
        print(f"get_candidate {candid}: {resp.status_code}")
        try:
            json_resp = json.loads(resp.content.decode('ascii'))
            print(json_resp)
            if not json_resp.get('error'):
                return json_resp
        except Exception as e:
            print(str(e))
            print(traceback.format_exc())
        return {'error': f"Unable to find candidate {candid}!"}



    def upload_callback(self, monitor):
        # Update the upload progress
        self.upload_read = monitor.bytes_read
        self.upload_total = monitor.len
        


    def upload_pii_callback(self, monitor):
        # Update the upload progress
        self.upload_pii_read = monitor.bytes_read
        self.upload_pii_total = monitor.len



    def upload_eeg(self, filename, metaData, candID, pscid, visit):
        print('upload eeg has ran')
        self.upload_read = 0
        self.upload_total = -1

        #bcUpload = BinaryChunkedUpload(self.uploadURL, self.token, os.path.basename(filename), self.upload_callback)
        #bcUpload.upload()

        e = MultipartEncoder(
            fields={
                'checksum': hashlib.md5(open(filename,'rb').read()).hexdigest(),
                'metaData': json.dumps(metaData),
                'candID': candID,
                'pscid': pscid,
                'visit': visit,
                'eegFile': (os.path.basename(filename), open(filename, 'rb'), 'application/x-tar')
            }
        )
        m = MultipartEncoderMonitor(e, self.upload_callback)

        # get the start time
        st = time.time()

        resp = requests.post(
            self.url + '/electrophysiology_uploader/upload',
            data=m,
            headers={'Content-Type': m.content_type, 'Authorization': 'Bearer %s' % self.token},
            verify=False
        )

        # get the end time
        et = time.time()

        # get the execution time
        elapsed_time = et - st
        print('Execution time:', elapsed_time, 'seconds')

        print(resp.status_code)
        return resp



    def upload_pii(self, filename):
        print('upload pii has ran')
        self.upload_pii_read = 0
        self.upload_pii_total = -1
        e = MultipartEncoder(
            fields={'eegFile': (os.path.basename(filename), open(filename, 'rb'), 'application/x-tar')}
        )
        m = MultipartEncoderMonitor(e, self.upload_pii_callback)

        resp = requests.post('https://integration.hbcd.ahc.umn.edu/api/v1/eeg', data=m,
                          headers={'Content-Type': m.content_type, 'Authorization': 'Bearer %s' % self.token}, verify=False)

        print(resp.status_code)
        return resp