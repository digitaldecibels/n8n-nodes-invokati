import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InvokatiApi implements ICredentialType {
	name = 'invokatiApi';
	displayName = 'Invokati API';
	documentationUrl = 'https://github.com/digitaldecibels/n8n-nodes-invokati';
	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://invokati.com',
			description: 'The base URL of your Invokati installation',
			placeholder: 'https://your-domain.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Invokati API key (found in your user profile)',
		},
	];


	authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}',
            url: '/api/auth/test',
            method: 'GET',
        },
    };

}
