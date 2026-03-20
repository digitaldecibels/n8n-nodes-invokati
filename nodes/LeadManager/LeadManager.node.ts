import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    IHttpRequestMethods,
} from 'n8n-workflow';

export class LeadManager implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Invokati Lead Manager',
        name: 'invokatiLeadManager',
        icon: { light: 'file:../../icons/invokati-light.svg', dark: 'file:../../icons/invokati-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Create, update, find, and delete leads in your Invokati CRM',
        defaults: {
            name: 'Invokati Lead Manager',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'invokatiApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Create Lead',
                        value: 'create',
                        description: 'Create a new lead',
                        action: 'Create a lead',
                    },
                    {
                        name: 'Update Lead',
                        value: 'update',
                        description: 'Update an existing lead by ID',
                        action: 'Update a lead',
                    },
                    {
                        name: 'Get Lead',
                        value: 'get',
                        description: 'Retrieve a lead by ID',
                        action: 'Get a lead',
                    },
                    {
                        name: 'Find by Email',
                        value: 'findByEmail',
                        description: 'Find a lead by email address',
                        action: 'Find lead by email',
                    },
                    {
                        name: 'Update Status',
                        value: 'updateStatus',
                        description: 'Change a lead\'s pipeline status',
                        action: 'Update lead status',
                    },
                    {
                        name: 'Delete Lead',
                        value: 'delete',
                        description: 'Permanently delete a lead',
                        action: 'Delete a lead',
                    },
                ],
                default: 'create',
            },

            // Lead ID — used by update, get, updateStatus, delete
            {
                displayName: 'Lead ID',
                name: 'leadId',
                type: 'string',
                default: '',
                required: true,
                description: 'The Invokati lead ID',
                displayOptions: {
                    show: {
                        operation: ['update', 'get', 'updateStatus', 'delete'],
                    },
                },
            },

            // Email — used by create, findByEmail
            {
                displayName: 'Email',
                name: 'email',
                type: 'string',
                placeholder: 'name@email.com',
                default: '',
                description: 'The lead\'s email address',
                displayOptions: {
                    show: {
                        operation: ['create', 'findByEmail'],
                    },
                },
            },

            // First Name — create only
            {
                displayName: 'First Name',
                name: 'firstName',
                type: 'string',
                default: '',
                required: true,
                description: 'Lead\'s first name',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Last Name — create only
            {
                displayName: 'Last Name',
                name: 'lastName',
                type: 'string',
                default: '',
                required: true,
                description: 'Lead\'s last name',
                displayOptions: {
                    show: {
                        operation: ['create'],
                    },
                },
            },

            // Status — updateStatus only (required)
            {
                displayName: 'Status',
                name: 'status',
                type: 'string',
                default: '',
                required: true,
                description: 'The pipeline status label or ID to assign to the lead',
                displayOptions: {
                    show: {
                        operation: ['updateStatus'],
                    },
                },
            },

            // Additional Fields — create and update
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['create', 'update'],
                    },
                },
                options: [
                    {
                        displayName: 'Company Name',
                        name: 'company_name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Phone',
                        name: 'phone',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Job Title',
                        name: 'job_title',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'LinkedIn URL',
                        name: 'linkedin_url',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Website',
                        name: 'website',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Industry',
                        name: 'industry',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Lead Score',
                        name: 'lead_score',
                        type: 'number',
                        default: 0,
                        description: 'Score from 0–100',
                    },
                    {
                        displayName: 'Lead Source',
                        name: 'lead_source',
                        type: 'string',
                        default: '',
                        description: 'e.g. website, referral, linkedin',
                    },
                    {
                        displayName: 'Status',
                        name: 'status',
                        type: 'string',
                        default: '',
                        description: 'Pipeline status label',
                    },
                    {
                        displayName: 'Pain Points',
                        name: 'pain_points',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Timeline',
                        name: 'timeline',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Location',
                        name: 'location',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'UTM Source',
                        name: 'utm_source',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'UTM Medium',
                        name: 'utm_medium',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'UTM Campaign',
                        name: 'utm_campaign',
                        type: 'string',
                        default: '',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        const credentials = await this.getCredentials('invokatiApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
        const apiKey = credentials.apiKey as string;

        const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };

        for (let i = 0; i < items.length; i++) {
            try {
                let response: any;

                if (operation === 'create') {
                    const firstName = this.getNodeParameter('firstName', i) as string;
                    const lastName = this.getNodeParameter('lastName', i) as string;
                    const email = this.getNodeParameter('email', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    const body: Record<string, any> = { first_name: firstName, last_name: lastName };
                    if (email) body.email = email;
                    Object.assign(body, additional);

                    response = await this.helpers.request({
                        method: 'POST' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads`,
                        headers,
                        body,
                        json: true,
                    });

                } else if (operation === 'update') {
                    const leadId = this.getNodeParameter('leadId', i) as string;
                    const additional = this.getNodeParameter('additionalFields', i) as Record<string, any>;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads/${leadId}`,
                        headers,
                        body: additional,
                        json: true,
                    });

                } else if (operation === 'get') {
                    const leadId = this.getNodeParameter('leadId', i) as string;

                    response = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads/${leadId}`,
                        headers,
                        json: true,
                    });

                } else if (operation === 'findByEmail') {
                    const email = this.getNodeParameter('email', i) as string;

                    const listResponse = await this.helpers.request({
                        method: 'GET' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads/list?email=${encodeURIComponent(email)}&limit=1`,
                        headers,
                        json: true,
                    });

                    response = listResponse?.leads?.[0] ?? { found: false };

                } else if (operation === 'updateStatus') {
                    const leadId = this.getNodeParameter('leadId', i) as string;
                    const status = this.getNodeParameter('status', i) as string;

                    response = await this.helpers.request({
                        method: 'PATCH' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads/${leadId}`,
                        headers,
                        body: { status },
                        json: true,
                    });

                } else if (operation === 'delete') {
                    const leadId = this.getNodeParameter('leadId', i) as string;

                    response = await this.helpers.request({
                        method: 'DELETE' as IHttpRequestMethods,
                        uri: `${baseUrl}/api/leads/${leadId}`,
                        headers,
                        json: true,
                    });
                }

                returnData.push({ json: response ?? {}, pairedItem: i });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message, operation, status: 'failed' }, pairedItem: i });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
