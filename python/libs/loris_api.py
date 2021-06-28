import json
import requests
import urllib


class LorisAPI:
    url = 'https://localhost/api/v0.0.4-dev/'
    username = ''
    password = ''

    token = ''

    def __init__(self):
        # self.login()

    def login(self):
        resp = json.loads(requests.post(
            url = self.url + 'login',
            json = {
                'username': self.username, 
                'password': self.password
            },
            verify = False
        ).content.decode('ascii'))

        if resp.get('error'):
            raise RuntimeError(resp.get('error'))

        self.token = resp.get('token')
        print(self.token)

    def get_projects(self):
        resp = requests.get(
            url=self.url + 'projects',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        json_resp = json.loads(resp.content.decode('ascii'))
        return json_resp.get('Projects')

    def get_subprojects(self, project):
        project = self.get_project(project)
        return project.get('Subprojects')

    def get_visits(self, project):
        project = self.get_project(project)
        return project.get('Visits')

    def get_sites(self):
        resp = requests.get(
            url=self.url + 'sites',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        json_resp = json.loads(resp.content.decode('ascii'))
        sites = json_resp.get('Sites')
        return sites

    def get_project(self, project):
        resp = requests.get(
            url=self.url + 'projects/' + urllib.parse.quote(project),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        json_resp = json.loads(resp.content.decode('ascii'))
        return json_resp

    def save_instrument(self):
        resp = requests.put(
            url=self.url + '/candidates/661630/V1/instruments/pet_mri_scans',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "Meta": {
                    "Instrument": 'PET/MRI scans',
                    "Visit": 'V1',
                    "Candidate": 661630,
                    "DDE": False
                },
                "PET/MRI scans": {
                    "Date_taken": "2021-06-07",
                    "Examiner": "Rida",
                    "completion-date": "2021-06-07",
                }
            }),
            verify=False
        )

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        print(json_resp)

    def get_visit(self, candid, visit, site, subproject, project):
        resp = requests.get(
            url=self.url + '/candidates/' + str(candid) + '/' + urllib.parse.quote(visit),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "Meta": {
                    "CandID": candid,
                    "Visit": visit,
                    "Site": site,
                    "Battery": subproject,
                    "Project": project
                }
            }),
            verify=False
        )

        json_resp = json.loads(resp.content.decode('ascii'))
        return json_resp

    def start_next_stage(self, candid, visit, site, subproject, project, date):
        resp = requests.patch(
            url=self.url + '/candidates/' + str(candid) + '/' + urllib.parse.quote(visit),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "CandID": candid,
                "Visit": visit,
                "Site": site,
                "Battery": subproject,
                "Project": project,
                "NextStageDate": date
            }),
            verify=False
        )

        print(resp.status_code)
        print(resp.text)

    def create_candidate(self):
        resp = requests.post(
            url=self.url + '/candidates/',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            data=json.dumps({
                "Candidate": {
                    "Project": 'Pumpernickel',
                    "DoB": "1985-12-22",
                    "Sex": "Female",
                    "Site": 'Montreal',
                }
            }),
            verify=False
        )

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        print(json_resp)
