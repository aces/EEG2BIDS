import json
from urllib.parse import quote

import requests


class LorisAPI:
    url = ''
    username = ''
    password = ''
    token = ''

    def _request(self, method, path, **kwargs):
        return requests.request(
            method, self.url + path,
            headers={'Authorization': f'Bearer {self.token}', 'LORIS-Overwrite': 'overwrite'},
            verify=False, **kwargs)

    def login(self):
        # A LORIS instance is optional; an unreachable or slow URL must not
        # hang the login flow, so the request has a timeout and any network
        # failure is turned into a visible error rather than an exception.
        try:
            resp = requests.post(
                url=self.url + 'login',
                json={
                    'username': self.username,
                    'password': self.password
                },
                verify=False,
                timeout=10
            )
        except requests.exceptions.RequestException:
            return {'error': 'Could not reach the LORIS server. Check the '
                             'LORIS URL and your network connection.'}

        # Never print the login response or token: this output is forwarded
        # into the development logs by the Electron main process.
        if resp.status_code == 405:
            print('User credentials error!')
            return {'error': 'User credentials error!'}
        try:
            resp_json = resp.json()
        except ValueError:
            return {'error': 'Unexpected response from the LORIS server.'}
        if resp_json.get('error'):
            return {'error': resp_json['error']}
        self.token = resp_json.get('token')
        return {}

    def get_projects(self):
        return self._request('GET', 'projects').json().get('Projects')

    def get_subprojects(self, project):
        return self.get_project(project).get('Subprojects')

    def get_visits(self, subproject):
        return self._request('GET', 'subprojects/' + quote(subproject)).json().get('Visits')

    def get_sites(self):
        return self._request('GET', 'sites').json().get('Sites')

    def get_project(self, project):
        return self._request('GET', 'projects/' + quote(project)).json()

    def start_next_stage(self, candid, visit, site, subproject, project, date):
        self._request(
            'PATCH', '/candidates/' + str(candid) + '/' + quote(visit),
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
            })
        )

    def create_candidate(self, project, dob, sex, site):
        return self._request(
            'POST', '/candidates/',
            data=json.dumps({
                "Candidate": {
                    "Project": project,
                    "DoB": dob,
                    "Sex": sex,
                    "Site": site,
                }
            })
        ).json()

    def create_visit(self, candid, visit, site, project, subproject):
        self._request(
            'PUT', '/candidates/' + candid + '/' + visit,
            data=json.dumps({
                "CandID": candid,
                "Visit": visit,
                "Site": site,
                "Battery": subproject,
                "Project": project
            })
        )

    def get_candidate(self, candid):
        json_resp = self._request('GET', '/candidates/' + candid).json()

        # validate candid
        if json_resp.get('error'):
            return {'error': 'DCCID is not valid.'}

        return json_resp.get('Meta')
