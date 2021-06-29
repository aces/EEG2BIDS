import json
import requests
import urllib


class LorisAPI:
    url = ''
    username = ''
    password = ''
    token = ''

    def login(self):
        resp = requests.post(
            url=self.url + 'login',
            json={
                'username': self.username,
                'password': self.password
            },
            verify=False
        )

        print(resp)

        login_succeeded = {}
        if resp.status_code == 405:
            login_succeeded = {'error': 'User credentials error!'}
            print('User credentials error!')
        else:
            resp_json = json.loads(resp.content.decode('ascii'))
            print(resp_json)
            if resp_json.get('error'):
                login_succeeded = {'error': resp_json.get('error')}
            else:
                self.token = resp_json.get('token')
                print(self.token)
        return login_succeeded

    def get_projects(self):
        resp = requests.get(
            url=self.url + 'projects',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        json_resp = json.loads(resp.content.decode('ascii'))
        return json_resp.get('Projects')

    def get_all_subprojects(self):
        resp = requests.get(
            url=self.url + 'subprojects',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        return json_resp.get('Subprojects')

    def get_subprojects(self, project):
        project = self.get_project(project)
        return project.get('Subprojects')

    def get_visits(self, subproject):
        print('get_visits look here:')
        resp = requests.get(
            url=self.url + 'subprojects/' + urllib.parse.quote(subproject),
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        print(json_resp)
        return json_resp.get('Visits')

    def get_sites(self):
        resp = requests.get(
            url=self.url + 'sites',
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        print(resp)

        json_resp = json.loads(resp.content.decode('ascii'))
        print (json_resp)
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

    def create_candidate(self, project, dob, sex, site):
        resp = requests.post(
            url=self.url + '/candidates/',
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

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        print(json_resp)
        return json_resp

    def create_visit(self, candid, visit, site, project, subproject):
        resp = requests.put(
            url=self.url + '/candidates/' + candid + '/' + visit,
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

        print(resp)
        # json_resp = json.loads(resp.content.decode('ascii'))
        # print(json_resp)

    def get_candidate(self, candid):
        resp = requests.get(
            url=self.url + '/candidates/' + candid,
            headers={'Authorization': 'Bearer %s' % self.token, 'LORIS-Overwrite': 'overwrite'},
            verify=False
        )

        print(resp)
        json_resp = json.loads(resp.content.decode('ascii'))
        print(json_resp)

        # validate candid
        if json_resp.get('error'):
            return {'error': 'CandID is not valid.'}

        return json_resp.get('Meta')
