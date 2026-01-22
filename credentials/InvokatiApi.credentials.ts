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
			default: 'https://atom8ui.lndo.site',
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


	// 1. This ensures every API call from a workflow works
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
                'Host': 'atom8ui.lndo.site', // CRITICAL: Matches your wget test
            },
        },
    };

    // 2. This ensures the "Test Step" button in the Credential UI works
    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl}}', // In UI, set this to http://atom8ui_appserver_1
            url: '/api/auth/test', // Ensure this endpoint exists in your Drupal/Invokati setup
            method: 'GET',
            headers: {
                'Host': 'atom8ui.lndo.site', // CRITICAL: Matches your wget test
            },
        },
    };

}
