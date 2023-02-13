/* Copyright 2022 Google LLC
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
	https://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { google } from 'googleapis';
import db from './db';

// Server Credentials:
const OAUTH_SCOPE = ['openid', 'https://www.googleapis.com/auth/sdm.service'];

// Configuration Variables:
// let selectedAPI = 'https://smartdevicemanagement.googleapis.com/v1';
// let selectedEndpoint = 'https://nestservices.google.com/partnerconnections/';
// let selectedResourcePicker = 'https://nestservices.google.com/partnerconnections';

function getAuthedClient(clientId, clientSecret, redirectUrl, projectId, state = null) {
	return new Promise((resolve, _reject) => {
		const oAuth2Client = new google.auth.OAuth2(
			clientId,
			clientSecret,
			redirectUrl
		);

		oAuth2Client.on('tokens', tokens => {
			db.put('gauth', 'tokens', tokens);
		});

		const url = oAuth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: OAUTH_SCOPE,
			prompt: 'consent',
			include_granted_scopes: true,
			state
		});

		console.log(`[*] Google OAuth prompt required: open ${url}`);
		open(url);

		resolve(oAuth2Client);
	});
}

var gClient;

export const getClient = () => gClient;

export function express_GoogleOAuthRedirect(express_app) {
	express_app.get('/google_oauth', async (req,res) => {
		try {
			const code = req.query.code;
			const { tokens } = await gClient.getToken(code);
			gClient.setCredentials(tokens);
		} catch (err) {
			res.status(500).send();
		}
	});
}

const init = async () => {
	if (gClient) {
		console.log('[*] [gauth] gClient already initialized');
	}
	let clientId = process.env.GA_OAUTH_CID;
	if (!clientId) {
		console.error('[!] [gauth] missing required env variable "GA_OAUTH_CID"');
		process.exit(-1);
	}
	let clientSecret = process.env.GA_OAUTH_CS;
	if (!clientSecret) {
		console.error('[!] [gauth] missing required env variable "GA_OAUTH_CS"');
		process.exit(-1);
	}
	let redirectUrl = process.env.GA_REDIRECT_URL;
	if (!redirectUrl) {
		console.error(`[!] [gauth] missing required env variable "GA_REDIRECT_URL", setting to localhost:${process.env.PORT || 1437}`);
		redirectUrl = `http://localhost:${process.env.PORT || 1437}`;
	}
	let projectId = process.env.GA_SDM_PID;
	if (!projectId) {
		console.error('[!] [gauth] missing required env variable "GA_SDM_PID"');
		process.exit(-1);
	}

	gClient = await getAuthedClient(clientId, clientSecret, redirectUrl, projectId);
};

export default {
	init
};