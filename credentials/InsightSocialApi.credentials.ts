import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InsightSocialApi implements ICredentialType {
	name = 'insightSocialApi';

	displayName = 'InsightSocial API';

	icon: Icon = { light: 'file:insightsocial.svg', dark: 'file:insightsocial.dark.svg' };

	documentationUrl = 'https://www.insightsocial.app/docs/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your InsightSocial API key (starts with isk_). Create one at insightsocial.app/portal/api/keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.insightsocial.app',
			description: 'Leave as is unless InsightSocial support gives you another URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// GET /v1/credits is free and needs a valid key, so it is the cheapest honest test.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/credits',
			method: 'GET',
		},
	};
}
